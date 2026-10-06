"""Rule-based activity labels for 1-minute tug samples.

Labels: idle, assist, transit, charging. Rules use speed over ground and distance to a known
dock. Labels are smoothed with a median filter, short segments are merged into their
neighbours, and idle stretches at a dock that last long enough become `charging`.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

IDLE, ASSIST, TRANSIT, CHARGING = 0, 1, 2, 3
CODES = {"idle": IDLE, "assist": ASSIST, "transit": TRANSIT, "charging": CHARGING}
NAMES = {v: k for k, v in CODES.items()}


@dataclass(frozen=True)
class ActivityRules:
    idle_max_sog: float = 0.5
    assist_max_sog: float = 4.0
    transit_min_sog: float = 4.0
    smoothing_window: int = 5
    min_segment_s: int = 180
    job_gap_min: int = 45
    dock_charge_min_idle_min: int = 20
    step_s: int = 60
    assist_ship_distance_m: float = 60.0   # tug within this of a ship's hull while slow = assist
    assist_with_ship_max_sog: float = 8.0  # escorting a moving ship counts as assist up to this speed

    @classmethod
    def from_config(cls, cfg: dict) -> ActivityRules:
        a, b = cfg["activity"], cfg["battery"]
        return cls(
            idle_max_sog=a["idle_max_sog"], assist_max_sog=a["assist_max_sog"],
            transit_min_sog=a["transit_min_sog"], smoothing_window=a["smoothing_window"],
            min_segment_s=a["min_segment_s"], job_gap_min=a["job_gap_min"],
            dock_charge_min_idle_min=b["dock_charge_min_idle_min"],
            assist_ship_distance_m=a.get("assist_ship_distance_m", 60.0),
            assist_with_ship_max_sog=a.get("assist_with_ship_max_sog", 8.0),
        )


def raw_labels(sog: np.ndarray, at_dock: np.ndarray, rules: ActivityRules,
               ship_dist_m: np.ndarray | None = None) -> np.ndarray:
    """Per-sample label before smoothing. NaN speed (no fix) counts as idle.

    Without ship positions: slow and away from the dock is assist. With ship positions: slow
    next to a ship's hull is assist (up to a higher speed, since an escorted ship moves), slow
    with no ship nearby is idle (waiting on station), fast is transit.
    """
    sog = np.nan_to_num(np.asarray(sog, dtype=float), nan=0.0)
    out = np.full(sog.shape, IDLE, dtype=int)
    slow = (sog >= rules.idle_max_sog) & (sog < rules.assist_max_sog)
    if ship_dist_m is None:
        out[slow & ~at_dock] = ASSIST
        out[sog >= rules.transit_min_sog] = TRANSIT
        return out
    near = np.asarray(ship_dist_m) <= rules.assist_ship_distance_m
    out[sog >= rules.transit_min_sog] = TRANSIT
    out[near & ~at_dock & (sog >= rules.idle_max_sog) & (sog < rules.assist_with_ship_max_sog)] = ASSIST
    return out


def median_smooth(codes: np.ndarray, window: int) -> np.ndarray:
    if window <= 1 or len(codes) == 0:
        return codes.copy()
    s = pd.Series(codes)
    return s.rolling(window, center=True, min_periods=1).median().round().astype(int).to_numpy()


def runs(codes: np.ndarray) -> list[tuple[int, int, int]]:
    """Contiguous runs as (start, end_exclusive, code)."""
    if len(codes) == 0:
        return []
    change = np.flatnonzero(np.diff(codes)) + 1
    starts = np.concatenate([[0], change])
    ends = np.concatenate([change, [len(codes)]])
    return [(int(s), int(e), int(codes[s])) for s, e in zip(starts, ends)]


def merge_short_runs(codes: np.ndarray, min_len: int) -> np.ndarray:
    """Absorb runs shorter than min_len samples into the longer neighbour. Iterates to a fixed point."""
    codes = codes.copy()
    while True:
        rs = runs(codes)
        short = [i for i, (s, e, _) in enumerate(rs) if e - s < min_len]
        if not short or len(rs) == 1:
            return codes
        i = min(short, key=lambda k: rs[k][1] - rs[k][0])
        s, e, _ = rs[i]
        left = rs[i - 1] if i > 0 else None
        right = rs[i + 1] if i + 1 < len(rs) else None
        if left and right:
            donor = left if (left[1] - left[0]) >= (right[1] - right[0]) else right
        else:
            donor = left or right
        codes[s:e] = donor[2]


def mark_charging(codes: np.ndarray, at_dock: np.ndarray, min_len: int,
                  sog: np.ndarray | None = None, idle_max_sog: float = 0.5) -> np.ndarray:
    """Still stretches inside an idle run at a dock, lasting at least min_len samples, become charging.

    A tug creeping around at 1–2 kn inside the dock radius is not plugged in, so only the
    still sub-runs count."""
    codes = codes.copy()
    still = np.ones(len(codes), dtype=bool) if sog is None else (np.nan_to_num(np.asarray(sog, float), nan=0.0) < idle_max_sog)
    for s, e, c in runs(codes):
        if c != IDLE:
            continue
        ok = at_dock[s:e] & still[s:e]
        for a, b, v in runs(ok.astype(int)):
            if v and b - a >= min_len:
                codes[s + a:s + b] = CHARGING
    return codes


def label(sog: np.ndarray, at_dock: np.ndarray, rules: ActivityRules,
          ship_dist_m: np.ndarray | None = None) -> np.ndarray:
    """Full pipeline: rules -> median smooth -> merge short runs -> charging."""
    codes = raw_labels(sog, at_dock, rules, ship_dist_m)
    codes = median_smooth(codes, rules.smoothing_window)
    codes = merge_short_runs(codes, max(1, rules.min_segment_s // rules.step_s))
    codes = mark_charging(codes, at_dock, rules.dock_charge_min_idle_min, np.asarray(sog, dtype=float), rules.idle_max_sog)
    return codes


def assign_jobs(codes: np.ndarray, rules: ActivityRules) -> np.ndarray:
    """Job index per sample (-1 when not in a job).

    A job runs from leaving the dock to the next charging stop. Idle gaps away from the dock
    shorter than job_gap_min stay inside the job; longer ones split it.
    """
    n = len(codes)
    jobs = np.full(n, -1, dtype=int)
    job = -1
    in_job = False
    idle_run = 0
    for i in range(n):
        c = codes[i]
        if c == CHARGING:
            in_job = False
            idle_run = 0
            continue
        if c == IDLE:
            idle_run += 1
            if in_job and idle_run <= rules.job_gap_min:
                jobs[i] = job
            elif in_job:
                in_job = False
            continue
        idle_run = 0
        if not in_job:
            job += 1
            in_job = True
        jobs[i] = job
    # trim trailing idle from each job so a job ends with work, not waiting
    for s, e, j in runs(jobs):
        if j < 0:
            continue
        k = e
        while k > s and codes[k - 1] == IDLE:
            k -= 1
        jobs[k:e] = -1
    return jobs
