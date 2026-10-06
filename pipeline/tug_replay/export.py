"""Write the static JSON files described in docs/CONTRACT.md."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .activity import CHARGING, IDLE, NAMES, runs
from .pipeline import TugSeries, day_slices
from .tariff import arrival_cost, price_per_kwh, scheduled_cost, scheduled_profile, tier_bands


def _iso(ts: pd.Timestamp) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ")


def _r(x, nd):
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else round(float(v), nd) for v in x]


def telemetry_row(s: TugSeries, i: int, battery_kwh: float) -> dict:
    """Contract section 1, for sample i."""
    r = s.sim
    tr = s.track
    date = s.t[i].strftime("%Y-%m-%d")
    job = int(s.jobs[i])
    return {
        "tug_id": s.tug_id, "name": s.name, "t": _iso(s.t[i]),
        "lat": round(float(tr["lat"].iat[i]), 5), "lon": round(float(tr["lon"].iat[i]), 5),
        "sog": round(float(tr["sog"].iat[i]), 1), "cog": round(float(tr["cog"].iat[i]), 1),
        "heading": int(tr["heading"].iat[i]) if not np.isnan(tr["heading"].iat[i]) else None,
        "activity": NAMES[int(s.codes[i])],
        "power_kw": round(float(s.power_kw[i] - r.charge_kw[i]), 1),
        "soc": round(float(r.soc[i]), 3),
        "generator_on": bool(r.generator_on[i]), "generator_kw": round(float(r.generator_kw[i])),
        "battery_kwh": battery_kwh,
        "job_id": f"{s.tug_id}-{date}-{job:02d}" if job >= 0 else None,
        "has_fix": bool(tr["has_fix"].iat[i]),
    }


def tug_day(s: TugSeries, day: pd.Timestamp, sl: slice, battery_kwh: float, docks: list[dict],
            tariff: dict | None = None, charger_kw: float = 0.0) -> dict:
    r = s.sim
    tr = s.track.iloc[sl]
    t = s.t[sl]
    codes = s.codes[sl]
    jobs = s.jobs[sl]
    power = s.power_kw[sl]
    date = day.strftime("%Y-%m-%d")
    seg = []
    for a, b, c in runs(codes):
        jid = int(jobs[a:b].max())
        seg.append({"start": _iso(t[a]), "end": _iso(t[b - 1] + pd.Timedelta(minutes=1)),
                    "activity": NAMES[c], "job_id": f"{s.tug_id}-{date}-{jid:02d}" if jid >= 0 else None,
                    "energy_kwh": round(float(power[a:b].sum() / 60), 1)})
    job_rows = []
    for a, b, j in runs(jobs):
        if j < 0:
            continue
        c = codes[a:b]
        job_rows.append({"job_id": f"{s.tug_id}-{date}-{j:02d}", "start": _iso(t[a]),
                         "end": _iso(t[b - 1] + pd.Timedelta(minutes=1)),
                         "energy_kwh": round(float(power[a:b].sum() / 60), 1),
                         "assist_min": int((c == 1).sum()), "transit_min": int((c == 2).sum()),
                         "max_sog": round(float(tr["sog"].iloc[a:b].max()), 1)})
    charge_kw = r.charge_kw[sl]
    prices = price_per_kwh(t, tariff) if tariff else np.zeros(len(t))
    sched_kw = scheduled_profile(charge_kw, codes, prices, charger_kw) if tariff else np.zeros(len(t))
    charging = []
    for a, b, c in runs(codes):
        if c == CHARGING:
            kwh = float(charge_kw[a:b].sum() / 60)
            di = int(pd.Series(s.dock_idx[sl][a:b]).mode().iat[0])
            windows = [{"start": _iso(t[a + w0]), "end": _iso(t[a + w1 - 1] + pd.Timedelta(minutes=1)),
                        "kw": round(float(sched_kw[a:b][w0:w1].mean()))}
                       for w0, w1, on in runs((sched_kw[a:b] > 0).astype(int)) if on]
            charging.append({"start": _iso(t[a]), "end": _iso(t[b - 1] + pd.Timedelta(minutes=1)),
                             "kwh": round(kwh, 1), "dock": docks[di]["name"] if di >= 0 else None,
                             "cost_arrival_usd": round(float((charge_kw[a:b] * prices[a:b]).sum() / 60), 2),
                             "cost_scheduled_usd": round(float((sched_kw[a:b] * prices[a:b]).sum() / 60), 2),
                             "scheduled_windows": windows})
    gen = []
    for a, b, on in runs(r.generator_on[sl].astype(int)):
        if on:
            gen.append({"start": _iso(t[a]), "end": _iso(t[b - 1] + pd.Timedelta(minutes=1)),
                        "kwh": round(float(r.generator_kw[sl][a:b].sum() / 60), 1)})
    return {
        "tug_id": s.tug_id, "name": s.name, "date": date, "battery_kwh": battery_kwh,
        "samples": {
            "t": [_iso(x) for x in t], "lat": _r(tr["lat"], 5), "lon": _r(tr["lon"], 5),
            "sog": _r(tr["sog"], 1), "activity": [NAMES[int(c)] for c in codes],
            "power_kw": _r(power - r.charge_kw[sl], 0), "soc": _r(r.soc[sl], 3),
            "generator_on": [bool(x) for x in r.generator_on[sl]],
        },
        "segments": seg, "jobs": job_rows, "charging": charging, "generator": gen,
        "totals": {
            "energy_kwh": round(float(power.sum() / 60)), "generator_kwh": round(float(r.generator_kw[sl].sum() / 60)),
            "charged_kwh": round(float(r.charge_kw[sl].sum() / 60)),
            "assist_min": int((codes == 1).sum()), "transit_min": int((codes == 2).sum()),
            "idle_min": int(((codes == IDLE) | (codes == CHARGING)).sum()),
            "min_soc": round(float(r.soc[sl].min()), 3), "electric_only": bool(not r.generator_on[sl].any()),
            "jobs": len(job_rows),
            "charge_cost_usd_arrival": round(arrival_cost(charge_kw, prices), 2),
            "charge_cost_usd_scheduled": round(scheduled_cost(charge_kw, codes, prices, charger_kw), 2),
        },
        "tariff": ({"off_peak": tariff["off_peak"], "mid_peak": tariff["mid_peak"], "on_peak": tariff["on_peak"],
                    "charger_kw": charger_kw, "bands": tier_bands(t, tariff)} if tariff else None),
        "recording_url": f"/recordings/{s.tug_id}/{date}.rrd",
    }


def fleet_file(series: list[TugSeries], battery_kwh: float, meta: dict, speedup: int) -> dict:
    t0 = series[0].t[0]
    tugs = []
    for s in series:
        r = s.sim
        tugs.append({
            "tug_id": s.tug_id, "name": s.name,
            "lat": _r(s.track["lat"], 5), "lon": _r(s.track["lon"], 5), "sog": _r(s.track["sog"], 1),
            "heading": [None if np.isnan(h) else int(h) for h in s.track["heading"]],
            "activity": [NAMES[int(c)] for c in s.codes],
            "soc": _r(r.soc, 3), "generator_on": [bool(x) for x in r.generator_on],
            "power_kw": _r(s.power_kw - r.charge_kw, 0),
            "has_fix": [bool(x) for x in s.track["has_fix"]],
        })
    return {"t0": _iso(t0), "step_s": 60, "n": len(series[0].t), "battery_kwh": battery_kwh, "speedup": speedup,
            "dataset": meta, "tugs": tugs}


def write_site(cfg, series, docks, meta, sweep_rows, assumption_rows, out_dir: Path, log) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cap = float(cfg["battery"]["capacity_kwh"])
    # fleet.json
    (out_dir / "fleet.json").write_text(json.dumps(fleet_file(series, cap, meta, cfg["replay"]["speedup"]), separators=(",", ":")))
    # tug days
    per_tug = []
    for s in series:
        d = out_dir / "tugdays" / s.tug_id
        d.mkdir(parents=True, exist_ok=True)
        energy_days = []
        for day, sl in day_slices(s.t):
            td = tug_day(s, day, sl, cap, docks, cfg["tariff"], float(cfg["battery"]["charger_power_kw"]))
            (d / f"{td['date']}.json").write_text(json.dumps(td, separators=(",", ":")))
            energy_days.append(td["totals"]["energy_kwh"])
        per_tug.append({"tug_id": s.tug_id, "name": s.name, "days": len(energy_days),
                        "energy_kwh_per_day": round(float(np.mean(energy_days)))})
    summary = {
        "dataset": {**meta, "tug_days": sweep_rows[0]["tug_days"] if sweep_rows else 0},
        "default_battery_kwh": cap,
        "slider": {"min_kwh": cfg["battery"]["slider_min_kwh"], "max_kwh": cfg["battery"]["slider_max_kwh"],
                   "step_kwh": cfg["battery"]["slider_step_kwh"]},
        "sweep": sweep_rows, "tugs": per_tug, "docks": docks, "assumptions": assumption_rows,
        "generated_by": "tug_replay pipeline; parameters in config.yaml",
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=1))
    log(f"wrote {out_dir}/fleet.json, summary.json and {sum(p['days'] for p in per_tug)} tug-day files")
