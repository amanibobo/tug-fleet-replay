"""Battery and generator simulation over a 1-minute series.

State of charge is a fraction of usable capacity. The generator cuts in below
`cut_in_soc`, runs at fixed power, and cuts out above `cut_out_soc` (hysteresis). While the
activity is `charging`, a shore charger feeds the battery at `charger_power_kw`.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .activity import CHARGING


@dataclass(frozen=True)
class BatterySpec:
    capacity_kwh: float = 6000.0
    usable_fraction: float = 0.9
    start_soc: float = 1.0
    generator_cut_in_soc: float = 0.15
    generator_cut_out_soc: float = 0.35
    generator_power_kw: float = 600.0
    charger_power_kw: float = 2000.0

    @classmethod
    def from_config(cls, cfg: dict, capacity_kwh: float | None = None) -> BatterySpec:
        b = cfg["battery"]
        return cls(
            capacity_kwh=capacity_kwh if capacity_kwh is not None else b["capacity_kwh"],
            usable_fraction=b["usable_fraction"], start_soc=b["start_soc"],
            generator_cut_in_soc=b["generator_cut_in_soc"], generator_cut_out_soc=b["generator_cut_out_soc"],
            generator_power_kw=b["generator_power_kw"], charger_power_kw=b["charger_power_kw"],
        )

    @property
    def usable_kwh(self) -> float:
        return self.capacity_kwh * self.usable_fraction


@dataclass
class SimResult:
    soc: np.ndarray            # fraction of usable capacity, after each step
    generator_on: np.ndarray   # bool
    generator_kw: np.ndarray   # kW supplied by the generator
    charge_kw: np.ndarray      # kW taken from shore
    deficit_kwh: np.ndarray    # energy demanded that neither battery nor generator could supply

    @property
    def generator_kwh(self) -> float:
        return float(self.generator_kw.sum() / 60.0)

    @property
    def charged_kwh(self) -> float:
        return float(self.charge_kw.sum() / 60.0)


def simulate(power_kw: np.ndarray, codes: np.ndarray, spec: BatterySpec, step_s: int = 60,
             soc0: float | None = None) -> SimResult:
    """Step the battery through the series. power_kw is the positive draw per sample."""
    n = len(power_kw)
    dt_h = step_s / 3600.0
    cap = spec.usable_kwh
    soc = np.empty(n)
    gen_on = np.zeros(n, dtype=bool)
    gen_kw = np.zeros(n)
    chg_kw = np.zeros(n)
    deficit = np.zeros(n)
    s = spec.start_soc if soc0 is None else soc0
    g = False
    for i in range(n):
        draw = float(power_kw[i])
        if codes[i] == CHARGING:
            # charger covers the hotel load and fills the battery, never above 100%
            room_kw = (1.0 - s) * cap / dt_h
            chg = min(spec.charger_power_kw, draw + room_kw)
            chg_kw[i] = chg
            net = draw - chg
        else:
            net = draw
        if not g and s < spec.generator_cut_in_soc and codes[i] != CHARGING:
            g = True
        if g and (s >= spec.generator_cut_out_soc or codes[i] == CHARGING):
            g = False
        if g:
            gen_kw[i] = spec.generator_power_kw
            net -= spec.generator_power_kw
        gen_on[i] = g
        s_new = s - net * dt_h / cap
        if s_new < 0.0:
            deficit[i] = -s_new * cap
            s_new = 0.0
        s = min(1.0, s_new)
        soc[i] = s
    return SimResult(soc=soc, generator_on=gen_on, generator_kw=gen_kw, charge_kw=chg_kw, deficit_kwh=deficit)
