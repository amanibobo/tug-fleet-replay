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
