"""Large-vessel context for the activity rules.

A tug that is slow *and* within a hull length of a ship is assisting. A slow tug on its own
is waiting. This module turns the `ships_*.parquet` files into a per-minute "nearest ship"
distance for each tug, which `activity.raw_labels` uses when available.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .geo import haversine_m


def load_ships(processed_dir: Path) -> pd.DataFrame:
    files = sorted(processed_dir.glob("ships_*.parquet"))
    if not files:
        return pd.DataFrame()
    df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
    return df.dropna(subset=["LAT", "LON"]).drop_duplicates(["MMSI", "BaseDateTime"])


def ship_grid(ships: pd.DataFrame, grid: pd.DatetimeIndex, max_gap_min: int = 20
              ) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str], np.ndarray]:
    """Resample every ship to the grid. Returns lat[n_min, n_ship], lon, length[n_ship], names, mmsi.
    Positions are NaN where a ship has no fix within max_gap_min."""
    ids = sorted(ships["MMSI"].unique())
    lat = np.full((len(grid), len(ids)), np.nan)
    lon = np.full((len(grid), len(ids)), np.nan)
    length = np.zeros(len(ids))
    names = []
    for j, mmsi in enumerate(ids):
        s = ships[ships["MMSI"] == mmsi].set_index("BaseDateTime").sort_index()
        names.append(str(s["VesselName"].mode().iat[0]) if s["VesselName"].notna().any() else str(mmsi))
        length[j] = float(np.nanmedian(s["Length"])) if s["Length"].notna().any() else 150.0
        m = s[["LAT", "LON"]].astype(float)
        m = m[~m.index.duplicated()].groupby(m.index.floor("min")).last().reindex(grid)
        has = m["LAT"].notna().to_numpy()
        idx = np.arange(len(grid))
        last = pd.Series(np.where(has, idx, np.nan)).ffill().to_numpy()
        nxt = pd.Series(np.where(has, idx, np.nan)).bfill().to_numpy()
        ok = has | ((nxt - last) <= max_gap_min)
        li = m["LAT"].interpolate(limit_area="inside").to_numpy()
        lo = m["LON"].interpolate(limit_area="inside").to_numpy()
        lat[ok, j] = li[ok]
        lon[ok, j] = lo[ok]
    return lat, lon, length, names, np.array(ids)


def nearest_ship(tug_lat: np.ndarray, tug_lon: np.ndarray, s_lat: np.ndarray, s_lon: np.ndarray,
                 s_len: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per minute: (distance to the nearest ship's hull in m, index of that ship or -1).

    The hull is approximated as a circle of radius length/2 around the reported position, so
    the distance is to the ship's side, not its antenna. Vectorized over ships per minute.
    """
    n = len(tug_lat)
    dist = np.full(n, np.inf)
    who = np.full(n, -1, dtype=int)
    if s_lat.shape[1] == 0:
        return dist, who
    for i in range(n):
        row_lat = s_lat[i]
        ok = ~np.isnan(row_lat)
        if not ok.any():
            continue
        d = haversine_m(tug_lat[i], tug_lon[i], row_lat[ok], s_lon[i][ok]) - s_len[ok] / 2.0
        k = int(np.argmin(d))
        dist[i] = max(0.0, float(d[k]))
        who[i] = int(np.flatnonzero(ok)[k])
    return dist, who
