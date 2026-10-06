"""Turn raw AIS rows into a continuous 1-minute track per tug for the whole week.

Fleet selection (all thresholds in config.yaml, section `fleet`):
- length between min and max meters: drops pilot boats and misfiled ships
- 99th-percentile speed under a cap: drops fast patrol craft
- enough fixes on enough days: drops boats that only pass through
- moves some share of the time: drops boats parked for the week

Gaps shorter than `max_interp_gap_min` are linearly interpolated. Longer gaps keep the last
position with zero speed and `has_fix = False`; a class A transponder at a dock still reports
every few minutes, so a long silence almost always means the tug is tied up.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .geo import haversine_m


def load_days(processed_dir: Path) -> pd.DataFrame:
    files = sorted(processed_dir.glob("tugs_*.parquet"))
    if not files:
        raise FileNotFoundError(f"no tugs_*.parquet in {processed_dir}; run `tug fetch` first")
    df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
    df = df.dropna(subset=["LAT", "LON"]).drop_duplicates(["MMSI", "BaseDateTime"])
    return df.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)


def select_fleet(df: pd.DataFrame, fleet_cfg: dict, n_days: int) -> pd.DataFrame:
    """Return one row per selected tug with name and summary stats."""
    df = df.assign(day=df["BaseDateTime"].dt.floor("D"))
    per_day = df.groupby(["MMSI", "day"]).agg(n=("LAT", "size"), moving=("SOG", lambda s: (s > 0.5).mean()))
    ok_days = per_day[per_day["n"] >= fleet_cfg["min_points_per_day"]].groupby("MMSI").agg(
        days=("n", "size"), moving=("moving", "median"))
    meta = df.groupby("MMSI").agg(
        name=("VesselName", lambda s: s.mode().iat[0] if len(s.mode()) else "UNKNOWN"),
        length=("Length", "median"), sog_p99=("SOG", lambda s: s.quantile(0.99)),
        vessel_type=("VesselType", lambda s: int(s.mode().iat[0])), points=("LAT", "size"))
    f = meta.join(ok_days, how="inner")
    keep = (
        f["length"].between(fleet_cfg["min_length_m"], fleet_cfg["max_length_m"])
        & (f["sog_p99"] <= fleet_cfg["max_sog_p99"])
        & (f["days"] >= min(n_days, fleet_cfg["min_days_present"]))
        & (f["moving"] >= fleet_cfg["min_moving_share"])
    )
    out = f[keep].sort_values("points", ascending=False)
    if fleet_cfg.get("max_tugs"):
        out = out.head(fleet_cfg["max_tugs"])
    out.index = out.index.astype(str)
    out.index.name = "tug_id"
    return out


def resample_tug(rows: pd.DataFrame, grid: pd.DatetimeIndex, max_gap_min: int) -> pd.DataFrame:
    """1-minute track for one tug over the grid. Columns: lat, lon, sog, cog, heading, has_fix."""
    s = rows.set_index("BaseDateTime")[["LAT", "LON", "SOG", "COG", "Heading"]].astype(float)
    s = s[~s.index.duplicated()]
    # snap each fix to its minute, keep the last fix in that minute
    s = s.groupby(s.index.floor("min")).last()
    s = s.reindex(grid)
    has_fix = s["LAT"].notna().to_numpy()
    # time since last fix / until next fix, to decide what to interpolate
    idx = np.arange(len(grid))
    last_fix = pd.Series(np.where(has_fix, idx, np.nan)).ffill().to_numpy()
    next_fix = pd.Series(np.where(has_fix, idx, np.nan)).bfill().to_numpy()
    gap = next_fix - last_fix
    interp_ok = has_fix | ((gap <= max_gap_min) & ~np.isnan(gap))
    out = s.copy()
    for c in ["LAT", "LON", "SOG"]:
        out[c] = s[c].interpolate(method="linear", limit_area="inside")
    out["COG"] = s["COG"].ffill()
    out["Heading"] = s["Heading"].ffill()
    # long gaps: hold the last position, speed zero
    hold = ~interp_ok
    out.loc[hold, ["LAT", "LON"]] = s[["LAT", "LON"]].ffill().loc[hold].to_numpy()
    out.loc[hold, "SOG"] = 0.0
    # before the first fix / after the last: hold nearest
    out[["LAT", "LON", "COG", "Heading"]] = out[["LAT", "LON", "COG", "Heading"]].bfill().ffill()
    out["SOG"] = out["SOG"].fillna(0.0)
    out["Heading"] = out["Heading"].where(out["Heading"] < 360, np.nan).fillna(out["COG"])
    out = out.rename(columns={"LAT": "lat", "LON": "lon", "SOG": "sog", "COG": "cog", "Heading": "heading"})
    out["has_fix"] = interp_ok
    out.index.name = "t"
    return out


def build_tracks(df: pd.DataFrame, fleet: pd.DataFrame, start: pd.Timestamp, days: int,
                 max_gap_min: int) -> dict[str, pd.DataFrame]:
    grid = pd.date_range(start, start + pd.Timedelta(days=days), freq="min", inclusive="left", tz="UTC")
    tracks = {}
    for tug_id in fleet.index:
        rows = df[df["MMSI"] == int(tug_id)]
        tracks[tug_id] = resample_tug(rows, grid, max_gap_min)
    return tracks


def detect_docks(tracks: dict[str, pd.DataFrame], cell_m: float = 120.0, min_minutes: int = 600,
                 top: int = 8) -> list[dict]:
    """Cluster idle positions on a grid and return the busiest cells as dock candidates."""
    pts = []
    for tug_id, t in tracks.items():
        idle = t[(t["sog"] < 0.3) & t["has_fix"]]
        pts.append(idle[["lat", "lon"]].assign(tug=tug_id))
    p = pd.concat(pts)
    lat_step = cell_m / 111_320.0
    lon_step = cell_m / (111_320.0 * np.cos(np.radians(p["lat"].mean())))
    p["ci"] = (p["lat"] / lat_step).round().astype(int)
    p["cj"] = (p["lon"] / lon_step).round().astype(int)
    cells = p.groupby(["ci", "cj"]).agg(minutes=("lat", "size"), lat=("lat", "mean"), lon=("lon", "mean"),
                                        tugs=("tug", "nunique")).reset_index()
    cells = cells[cells["minutes"] >= min_minutes].sort_values("minutes", ascending=False)
    # merge cells within 300 m of a stronger one
    docks: list[dict] = []
    for _, c in cells.iterrows():
        if any(haversine_m(c["lat"], c["lon"], d["lat"], d["lon"]) < 300 for d in docks):
            continue
        docks.append({"lat": round(float(c["lat"]), 5), "lon": round(float(c["lon"]), 5),
                      "radius_m": 250, "idle_minutes": int(c["minutes"]), "tugs": int(c["tugs"])})
        if len(docks) >= top:
            break
    return docks
