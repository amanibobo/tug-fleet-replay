"""Power draw per activity. Every number is an estimate from config.yaml."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .activity import ASSIST, CHARGING, IDLE, TRANSIT


@dataclass(frozen=True)
class EnergyModel:
    transit_power_kw_at_8kn: float = 900.0
    transit_min_power_kw: float = 60.0
    assist_power_kw: float = 1400.0
    idle_power_kw: float = 45.0
    max_power_kw: float = 3000.0

    @classmethod
    def from_config(cls, cfg: dict) -> EnergyModel:
        return cls(**{k: cfg["energy"][k] for k in cls.__dataclass_fields__})

    def transit_power(self, sog_kn) -> np.ndarray:
        """Propulsion power scales with the cube of speed, with a hotel floor and a clamp."""
        sog = np.nan_to_num(np.asarray(sog_kn, dtype=float), nan=0.0)
        p = self.transit_power_kw_at_8kn * (sog / 8.0) ** 3
        return np.clip(p, self.transit_min_power_kw, self.max_power_kw)

    def power_kw(self, codes: np.ndarray, sog_kn) -> np.ndarray:
        """Positive draw in kW for each sample."""
        codes = np.asarray(codes)
        out = np.full(codes.shape, self.idle_power_kw, dtype=float)
        out[codes == TRANSIT] = self.transit_power(sog_kn)[codes == TRANSIT]
        out[codes == ASSIST] = self.assist_power_kw
        out[(codes == IDLE) | (codes == CHARGING)] = self.idle_power_kw
        return np.clip(out, 0, self.max_power_kw)
