"""Command line entry point: `tug <command>`."""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from .config import ROOT, load_config

SITE = ROOT / "data/processed/site"


def cmd_fetch(a) -> int:
    from . import fetch_ais
    return fetch_ais.main(a.rest)


def cmd_build(a) -> int:
    from .pipeline import run
    r = run(processed_dir=Path(a.processed), out_dir=Path(a.out), recordings=not a.no_recordings)
    h = r["headline"]
    print(f"{h['electric_share']:.1%} of {h['tug_days']} tug-days electric-only at {h['battery_kwh']:.0f} kWh")
    return 0


def cmd_headline(a) -> int:
    """Recompute the headline number from the parquet files, without writing anything."""
    from .pipeline import build_series, sweep
    cfg = load_config()
    series, _, meta = build_series(cfg, ROOT / "data/processed", log=lambda *x: None)
    cap = a.battery_kwh or cfg["battery"]["capacity_kwh"]
    row = sweep(cfg, series, [float(cap)])[0]
    print(f"{row['electric_share']:.1%} of {row['tug_days']} tug-days ran without the generator at {cap:.0f} kWh "
          f"({meta['start']} to {meta['end']}, {meta['tugs']} tugs)")
    return 0


def cmd_serve(a) -> int:
    from .local_server import serve
    asyncio.run(serve(Path(a.site), a.ws_port, a.http_port, a.speedup, a.start))
    return 0


def cmd_replay(a) -> int:
    from .replayer import Fleet, IoTPublisher, PrintPublisher, Replayer, RerunPublisher
    fleet = Fleet.load(Path(a.site) / "fleet.json")
    rep = Replayer(fleet, speedup=a.speedup or fleet.speedup, start_index=a.start, loop=not a.once)
    if a.to == "print":
        pub = PrintPublisher()
    elif a.to == "rerun":
        pub = RerunPublisher()
    else:
        import os
        pub = IoTPublisher(endpoint=os.environ["TUG_IOT_ENDPOINT"], cert=os.environ["TUG_IOT_CERT"],
                           key=os.environ["TUG_IOT_KEY"], ca=os.environ["TUG_IOT_CA"],
                           client_id=os.environ.get("TUG_IOT_CLIENT_ID", "tug-replayer"))
    asyncio.run(rep.run(pub, max_ticks=a.ticks))
    return 0


def cmd_docks(a) -> int:
    import json

    from .pipeline import build_series
    cfg = load_config()
    cfg = dict(cfg, docks="auto")
    _series, docks, _ = build_series(cfg, ROOT / "data/processed", log=lambda *x: None)
    print(json.dumps(docks, indent=1))
    return 0


def cmd_sample(a) -> int:
    """Write a CSV of random activity segments for a hand check of the labels."""
    import csv
    import random

    import numpy as np
    import pandas as pd

    from .activity import NAMES, runs
    from .pipeline import build_series
    cfg = load_config()
    series, _, _ = build_series(cfg, ROOT / "data/processed", log=lambda *x: None)
    segs = []
    for s in series:
        for st, en, c in runs(s.codes):
            if en - st >= 5:
                tr = s.track.iloc[st:en]
                segs.append({"tug_id": s.tug_id, "name": s.name, "start": s.t[st].isoformat(), "minutes": en - st,
                             "rule_label": NAMES[c], "mean_sog": round(float(tr["sog"].mean()), 2),
                             "max_sog": round(float(tr["sog"].max()), 2), "lat": round(float(tr["lat"].mean()), 5),
                             "lon": round(float(tr["lon"].mean()), 5),
                             "nearest_ship": (pd.Series(s.ship_name[st:en]).replace("", pd.NA).mode().iat[0]
                                              if s.ship_name is not None and (s.ship_name[st:en] != "").any() else ""),
                             "ship_dist_m": (round(float(np.median(s.ship_dist_m[st:en])))
                                             if s.ship_dist_m is not None and np.isfinite(np.median(s.ship_dist_m[st:en])) else ""),
                             "hand_label": "", "note": ""})
    random.Random(a.seed).shuffle(segs)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(segs[0].keys()))
        w.writeheader()
        w.writerows(segs[: a.n])
    print(f"wrote {min(a.n, len(segs))} segments to {out}; fill hand_label and run `tug score`")
    return 0


def cmd_score(a) -> int:
    import csv
    with open(a.csv) as f:
        rows = [r for r in csv.DictReader(f) if r["hand_label"].strip()]
    if not rows:
        print("no hand labels yet")
        return 1
    agree = sum(r["hand_label"].strip() == r["rule_label"] for r in rows)
    print(f"{agree}/{len(rows)} agree = {agree / len(rows):.0%} (target 85%)")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="tug", description="Tug fleet replay pipeline")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("fetch", help="download and filter AIS days"); s.add_argument("rest", nargs="*"); s.set_defaults(f=cmd_fetch)
    s = sub.add_parser("build", help="label, simulate, export JSON and Rerun recordings")
    s.add_argument("--out", default=str(SITE)); s.add_argument("--no-recordings", action="store_true")
    s.add_argument("--processed", default=str(ROOT / "data/processed"), help="parquet dir (data/live/processed for a recording)")
    s.set_defaults(f=cmd_build)
    s = sub.add_parser("headline", help="print the headline number"); s.add_argument("--battery-kwh", type=float); s.set_defaults(f=cmd_headline)
    s = sub.add_parser("serve", help="local WebSocket + API stand-in for AWS")
    s.add_argument("--site", default=str(SITE)); s.add_argument("--ws-port", type=int, default=8765)
    s.add_argument("--http-port", type=int, default=8766); s.add_argument("--speedup", type=float); s.add_argument("--start", type=int, default=0)
    s.set_defaults(f=cmd_serve)
    s = sub.add_parser("replay", help="replay fleet.json to a publisher")
    s.add_argument("--to", choices=["print", "iot", "rerun"], default="print"); s.add_argument("--site", default=str(SITE))
    s.add_argument("--speedup", type=float); s.add_argument("--start", type=int, default=0); s.add_argument("--ticks", type=int)
    s.add_argument("--once", action="store_true"); s.set_defaults(f=cmd_replay)
    s = sub.add_parser("docks", help="detect dock candidates from idle clusters"); s.set_defaults(f=cmd_docks)
    s = sub.add_parser("record", help="record live AIS from aisstream.io into data/live/raw")
    s.add_argument("--raw-dir", default=str(ROOT / "data/live/raw")); s.add_argument("--seconds", type=float)
    s.set_defaults(f=lambda a: __import__("tug_replay.record_live", fromlist=["x"]).main_record(a))
    s = sub.add_parser("finalize", help="turn recorded AIS into tugs_/ships_ parquet files")
    s.add_argument("--raw-dir", default=str(ROOT / "data/live/raw")); s.add_argument("--out-dir", default=str(ROOT / "data/live/processed"))
    s.set_defaults(f=lambda a: __import__("tug_replay.record_live", fromlist=["x"]).main_finalize(a))
    s = sub.add_parser("sample", help="export segments for a hand check"); s.add_argument("--n", type=int, default=50)
    s.add_argument("--seed", type=int, default=7); s.add_argument("--out", default=str(ROOT / "data/labels/hand_sample.csv")); s.set_defaults(f=cmd_sample)
    s = sub.add_parser("score", help="score hand labels against the rules"); s.add_argument("--csv", default=str(ROOT / "data/labels/hand_sample.csv")); s.set_defaults(f=cmd_score)
    a = p.parse_args(argv)
    return a.f(a)


if __name__ == "__main__":
    raise SystemExit(main())
