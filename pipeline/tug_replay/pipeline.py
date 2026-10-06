"""Orchestration: AIS parquet -> labeled, simulated tug-days -> JSON + Rerun recordings."""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from . import activity as act
from .activity import ActivityRules
from .battery import BatterySpec, SimResult, simulate
from .config import ROOT, load_config
from .energy import EnergyModel
from .geo import nearest_dock
from .ships import load_ships, nearest_ship, ship_grid
from .tariff import arrival_cost, price_per_kwh, scheduled_cost
from .tracks import build_tracks, detect_docks, load_days, select_fleet


@dataclass
class TugSeries:
    tug_id: str
    name: str
    track: pd.DataFrame          # 1-minute grid: lat, lon, sog, cog, heading, has_fix
    codes: np.ndarray            # activity codes
    jobs: np.ndarray             # job index per sample, -1 outside jobs
    power_kw: np.ndarray
    dock_idx: np.ndarray         # dock index per sample or -1
    sim: SimResult | None = None
    ship_dist_m: np.ndarray | None = None   # distance to the nearest ship hull, inf when none
    ship_name: np.ndarray | None = None     # name of that ship, "" when none

    @property
    def t(self) -> pd.DatetimeIndex:
        return self.track.index


def resolve_docks(cfg: dict, tracks: dict[str, pd.DataFrame]) -> list[dict]:
    docks = cfg.get("docks")
    if docks == "auto" or not docks:
        docks = detect_docks(tracks)
        for i, d in enumerate(docks):
            d["name"] = f"Dock {chr(65 + i)}"
    return docks


def build_series(cfg: dict, processed_dir: Path, log=print) -> tuple[list[TugSeries], list[dict], dict]:
    df = load_days(processed_dir)
    days = sorted(df["BaseDateTime"].dt.floor("D").unique())
    n_days = len(days)
    start = pd.Timestamp(days[0]).tz_convert("UTC")
    fleet = select_fleet(df, cfg["fleet"], n_days)
    log(f"{n_days} days, {len(fleet)} tugs selected from {df['MMSI'].nunique()} vessels")
    tracks = build_tracks(df, fleet, start, n_days, cfg["fleet"]["max_interp_gap_min"])
    docks = resolve_docks(cfg, tracks)
    rules = ActivityRules.from_config(cfg)
    energy = EnergyModel.from_config(cfg)
    ships = load_ships(processed_dir)
    grid = next(iter(tracks.values())).index
    if len(ships):
        ships = ships[ships["Length"] >= cfg["activity"].get("ship_min_length_m", 100)]
        s_lat, s_lon, s_len, s_names, _ = ship_grid(ships, grid)
        log(f"{len(s_names)} ships of {cfg['activity'].get('ship_min_length_m', 100)} m or more in the box")
    else:
        s_lat = s_lon = None
        log("no ships_*.parquet found; assist falls back to the speed-only rule")
    series = []
    for tug_id, tr in tracks.items():
        dock_idx, _ = nearest_dock(tr["lat"].to_numpy(), tr["lon"].to_numpy(), docks)
        at_dock = dock_idx >= 0
        ship_dist = ship_name = None
        if s_lat is not None:
            ship_dist, who = nearest_ship(tr["lat"].to_numpy(), tr["lon"].to_numpy(), s_lat, s_lon, s_len)
            ship_name = np.array([s_names[k] if k >= 0 else "" for k in who])
        codes = act.label(tr["sog"].to_numpy(), at_dock, rules, ship_dist)
        jobs = act.assign_jobs(codes, rules)
        power = energy.power_kw(codes, tr["sog"].to_numpy())
        series.append(TugSeries(tug_id, str(fleet.loc[tug_id, "name"]).title(), tr, codes, jobs, power, dock_idx,
                                ship_dist_m=ship_dist, ship_name=ship_name))
    meta = {"start": start.date().isoformat(), "end": (start + pd.Timedelta(days=n_days - 1)).date().isoformat(),
            "days": n_days, "source": "NOAA MarineCadastre AIS", "tugs": len(series)}
    return series, docks, meta


def simulate_fleet(series: list[TugSeries], spec: BatterySpec) -> list[SimResult]:
    return [simulate(s.power_kw, s.codes, spec) for s in series]


def day_slices(index: pd.DatetimeIndex) -> list[tuple[pd.Timestamp, slice]]:
    days = index.floor("D")
    out = []
    for d in days.unique():
        pos = np.flatnonzero(days == d)
        out.append((d, slice(int(pos[0]), int(pos[-1]) + 1)))
    return out


def sweep(cfg: dict, series: list[TugSeries], capacities: list[float]) -> list[dict]:
    """Fleet-level results for each battery size. The headline is electric_share."""
    tariff = cfg["tariff"]
    rows = []
    for cap in capacities:
        spec = BatterySpec.from_config(cfg, cap)
        tug_days = 0
        electric_days = 0
        gen_kwh = gen_min = chg_kwh = cost_arr = cost_sched = deficit = 0.0
        for s in series:
            r = simulate(s.power_kw, s.codes, spec)
            prices = price_per_kwh(s.t, tariff)
            for _, sl in day_slices(s.t):
                tug_days += 1
                electric_days += int(not r.generator_on[sl].any())
            gen_kwh += r.generator_kwh
            gen_min += int(r.generator_on.sum())
            chg_kwh += r.charged_kwh
            deficit += float(r.deficit_kwh.sum())
            cost_arr += arrival_cost(r.charge_kw, prices)
            cost_sched += scheduled_cost(r.charge_kw, s.codes, prices, spec.charger_power_kw)
        rows.append({
            "battery_kwh": cap,
            "electric_share": round(electric_days / tug_days, 4) if tug_days else 0.0,
            "electric_days": electric_days, "tug_days": tug_days,
            "generator_kwh": round(gen_kwh), "generator_hours": round(gen_min / 60, 1),
            "charged_kwh": round(chg_kwh), "deficit_kwh": round(deficit),
            "charge_cost_usd_arrival": round(cost_arr), "charge_cost_usd_scheduled": round(cost_sched),
        })
    return rows


def capacities_from_config(cfg: dict) -> list[float]:
    b = cfg["battery"]
    caps = list(np.arange(b["slider_min_kwh"], b["slider_max_kwh"] + 1, b["slider_step_kwh"], dtype=float))
    if b["capacity_kwh"] not in caps:
        caps = sorted(caps + [float(b["capacity_kwh"])])
    return caps


def assumptions(cfg: dict) -> list[dict]:
    e, b, a = cfg["energy"], cfg["battery"], cfg["activity"]
    return [
        {"key": "battery_kwh", "value": b["capacity_kwh"], "unit": "kWh", "note": "Arc/Curtin tugs carry 6 MWh batteries (Marine Log, Sept 2025). Cited, not estimated."},
        {"key": "usable_fraction", "value": b["usable_fraction"], "unit": "", "note": "Share of the pack the sim allows to cycle."},
        {"key": "assist_power_kw", "value": e["assist_power_kw"], "unit": "kW", "note": "Weakest estimate. AIS reports speed, not pushing force."},
        {"key": "transit_power_kw_at_8kn", "value": e["transit_power_kw_at_8kn"], "unit": "kW", "note": "Scaled by the cube of speed."},
        {"key": "idle_power_kw", "value": e["idle_power_kw"], "unit": "kW", "note": "Hotel load while waiting."},
        {"key": "generator_power_kw", "value": b["generator_power_kw"], "unit": "kW", "note": f"Cuts in below {b['generator_cut_in_soc']:.0%} charge, out above {b['generator_cut_out_soc']:.0%}."},
        {"key": "charger_power_kw", "value": b["charger_power_kw"], "unit": "kW", "note": f"Shore power while idle at a known dock for {b['dock_charge_min_idle_min']} min or more."},
        {"key": "assist_speed_band_kn", "value": f"{a['idle_max_sog']}–{a['assist_max_sog']}", "unit": "kn", "note": "Slow and away from the dock counts as assist."},
        {"key": "tariff", "value": f"{cfg['tariff']['off_peak']}/{cfg['tariff']['mid_peak']}/{cfg['tariff']['on_peak']}", "unit": "$/kWh", "note": "Off/mid/on-peak shape modeled on SCE TOU-8. Confirm before quoting."},
    ]


def run(processed_dir: Path | None = None, out_dir: Path | None = None, recordings: bool = True,
        log=lambda *a: print(*a, file=sys.stderr)) -> dict:
    from . import export
    cfg = load_config()
    processed_dir = processed_dir or ROOT / "data/processed"
    out_dir = out_dir or ROOT / "data/processed/site"
    series, docks, meta = build_series(cfg, processed_dir, log)
    spec = BatterySpec.from_config(cfg)
    sims = simulate_fleet(series, spec)
    for s, r in zip(series, sims):
        s.sim = r
    caps = capacities_from_config(cfg)
    log(f"sweeping {len(caps)} battery sizes")
    rows = sweep(cfg, series, caps)
    head = next(r for r in rows if r["battery_kwh"] == spec.capacity_kwh)
    log(f"headline: {head['electric_share']:.1%} of {head['tug_days']} tug-days electric-only at {spec.capacity_kwh:.0f} kWh")
    export.write_site(cfg, series, docks, meta, rows, assumptions(cfg), out_dir, log)
    if recordings:
        from . import rerun_log
        n = rerun_log.write_all(cfg, series, docks, out_dir / "recordings", log)
        log(f"wrote {n} Rerun recordings")
    return {"headline": head, "meta": meta, "out_dir": str(out_dir)}
