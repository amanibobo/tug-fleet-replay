"""Time-of-use electricity price and a simple charging schedule."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .activity import CHARGING, runs


def price_per_kwh(times: pd.DatetimeIndex, tariff: dict, tz: str = "America/Los_Angeles") -> np.ndarray:
    hours = times.tz_convert(tz).hour.to_numpy()
    p = np.full(len(times), tariff["off_peak"], dtype=float)
    p[np.isin(hours, tariff["mid_peak_hours"])] = tariff["mid_peak"]
    p[np.isin(hours, tariff["on_peak_hours"])] = tariff["on_peak"]
    return p


def arrival_cost(charge_kw: np.ndarray, prices: np.ndarray, step_s: int = 60) -> float:
    """Cost when the battery charges as soon as it is plugged in (what the sim does)."""
    return float((charge_kw * prices).sum() * step_s / 3600.0)


def scheduled_cost(charge_kw: np.ndarray, codes: np.ndarray, prices: np.ndarray,
                   charger_kw: float, step_s: int = 60) -> float:
    """Cost when the same energy per dock stop is moved to the cheapest minutes of that stop.

    Uses the stop's end (known in replay) as the deadline; a real scheduler would use the
    dispatch plan. Energy per stop and the charger's power limit are unchanged.
    """
    total = 0.0
    for s, e, c in runs(codes):
        if c != CHARGING:
            continue
        need_kwh = float(charge_kw[s:e].sum() * step_s / 3600.0)
        if need_kwh <= 0:
            continue
        window = prices[s:e]
        order = np.argsort(window, kind="stable")
        per_min = charger_kw * step_s / 3600.0
        remaining = need_kwh
        for k in order:
            take = min(per_min, remaining)
            total += take * window[k]
            remaining -= take
            if remaining <= 1e-9:
                break
    return total


def scheduled_profile(charge_kw: np.ndarray, codes: np.ndarray, prices: np.ndarray,
                      charger_kw: float, step_s: int = 60) -> np.ndarray:
    """Per-minute charger power after moving each stop's energy to its cheapest minutes.

    Same energy per stop and the same power limit as the arrival profile; only the timing
    changes. `scheduled_cost` is the cost of this profile.
    """
    out = np.zeros_like(charge_kw, dtype=float)
    per_min = charger_kw * step_s / 3600.0
    for s, e, c in runs(codes):
        if c != CHARGING:
            continue
        need_kwh = float(charge_kw[s:e].sum() * step_s / 3600.0)
        if need_kwh <= 0:
            continue
        order = np.argsort(prices[s:e], kind="stable")
        remaining = need_kwh
        for k in order:
            take = min(per_min, remaining)
            out[s + k] = take * 3600.0 / step_s
            remaining -= take
            if remaining <= 1e-9:
                break
    return out


def tier_bands(times: pd.DatetimeIndex, tariff: dict, tz: str = "America/Los_Angeles") -> list[dict]:
    """Contiguous tariff tiers over the index as [{start, end, tier, usd_per_kwh}]."""
    hours = times.tz_convert(tz).hour.to_numpy()
    tier = np.full(len(times), "off_peak", dtype=object)
    tier[np.isin(hours, tariff["mid_peak_hours"])] = "mid_peak"
    tier[np.isin(hours, tariff["on_peak_hours"])] = "on_peak"
    codes = pd.Series(tier).astype("category").cat.codes.to_numpy()
    bands = []
    for s, e, _ in runs(codes):
        bands.append({"start": times[s].strftime("%Y-%m-%dT%H:%M:%SZ"),
                      "end": (times[e - 1] + pd.Timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                      "tier": str(tier[s]), "usd_per_kwh": tariff[str(tier[s])]})
    return bands
