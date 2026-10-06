"""Record live AIS from aisstream.io into the same parquet files the NOAA fetch produces.

Why: NOAA publishes its archive about a year late. aisstream.io relays live AIS from shore
receivers over a WebSocket, free with an API key. Recording the San Pedro box for a few days
gives a current dataset, and the recorder is also the shape a real telemetry source takes.

Two steps so a crash never loses data:
  tug record   -> appends raw JSON lines to data/live/raw/YYYY-MM-DD.jsonl (position reports
                  and static data for every vessel inside the box)
  tug finalize -> turns each day's raw file into tugs_DATE.parquet and ships_DATE.parquet in
                  data/live/processed, using the static-data registry to classify vessels.
Then `tug build` with --processed data/live/processed runs the normal pipeline.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from .config import ROOT, load_config

STREAM_URL = "wss://stream.aisstream.io/v0/stream"
LIVE_DIR = ROOT / "data/live"


def api_key() -> str:
    key = os.environ.get("AISSTREAM_API_KEY")
    if not key:
        env = ROOT / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("AISSTREAM_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        raise SystemExit("set AISSTREAM_API_KEY in the environment or in .env (see .env.example)")
    return key


def subscription(key: str, bbox: dict) -> dict:
    return {
        "APIKey": key,
        "BoundingBoxes": [[[bbox["lat_min"], bbox["lon_min"]], [bbox["lat_max"], bbox["lon_max"]]]],
        "FilterMessageTypes": ["PositionReport", "ShipStaticData", "StandardClassBPositionReport",
                               "StaticDataReport"],
    }


async def record(raw_dir: Path, bbox: dict, seconds: float | None = None, log=print) -> int:
    """Append every message to a per-UTC-day JSON lines file. Reconnects on drop."""
    import websockets

    key = api_key()
    raw_dir.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    n = 0
    backoff = 1.0
    while True:
        try:
            async with websockets.connect(STREAM_URL, ping_interval=20, max_size=4 << 20) as ws:
                await ws.send(json.dumps(subscription(key, bbox)))
                backoff = 1.0
                fh = None
                day = None
                async for msg in ws:
                    d = datetime.now(UTC).strftime("%Y-%m-%d")
                    if d != day:
                        if fh:
                            fh.close()
                        fh = open(raw_dir / f"{d}.jsonl", "a")  # noqa: ASYNC230, SIM115 (handle outlives the loop body)
                        day = d
                    if isinstance(msg, bytes):
                        msg = msg.decode()
                    fh.write(msg.rstrip("\n") + "\n")
                    fh.flush()
                    n += 1
                    if n % 500 == 0:
                        log(f"{n} messages, {raw_dir / (day + '.jsonl')}")
                    if seconds and time.monotonic() - started > seconds:
                        fh.close()
                        return n
        except (TimeoutError, OSError) as e:
            log(f"stream dropped ({e}); reconnecting in {backoff:.0f}s")
        except Exception as e:  # noqa: BLE001  websockets raises its own hierarchy; keep recording
            log(f"stream error ({type(e).__name__}: {e}); reconnecting in {backoff:.0f}s")
        if seconds and time.monotonic() - started > seconds:
            return n
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 60)


def _row(meta: dict, body: dict) -> dict:
    """Map an aisstream position report to the NOAA column names."""
    hdg = body.get("TrueHeading")
    return {
        "MMSI": int(meta["MMSI"]), "BaseDateTime": meta["time_utc"],
        "LAT": float(meta["latitude"]), "LON": float(meta["longitude"]),
        "SOG": float(body.get("Sog", 0.0) or 0.0), "COG": float(body.get("Cog", 0.0) or 0.0),
        "Heading": float(hdg) if hdg is not None else 511.0,
        "VesselName": str(meta.get("ShipName", "")).strip(),
        "Status": float(body.get("NavigationalStatus", 15) or 15),
    }


def finalize(raw_dir: Path, out_dir: Path, types: list[int], ship_min_length_m: float = 100.0,
             log=print) -> list[Path]:
    """Raw JSON lines -> tugs_DATE.parquet and ships_DATE.parquet, same schema as fetch_ais."""
    out_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(raw_dir.glob("*.jsonl"))
    if not files:
        raise SystemExit(f"no raw files in {raw_dir}; run `tug record` first")
    # static registry across all days: type, length, name, callsign, imo
    registry: dict[int, dict] = {}
    for f in files:
        with open(f) as fh:
            for line in fh:
                try:
                    m = json.loads(line)
                except json.JSONDecodeError:
                    continue
                mt = m.get("MessageType")
                meta = m.get("MetaData", {})
                if mt == "ShipStaticData":
                    b = m["Message"]["ShipStaticData"]
                    dim = b.get("Dimension") or {}
                    registry[int(meta["MMSI"])] = {
                        "VesselType": float(b.get("Type", 0) or 0),
                        "Length": float((dim.get("A") or 0) + (dim.get("B") or 0)),
                        "Width": float((dim.get("C") or 0) + (dim.get("D") or 0)),
                        "VesselName": str(b.get("Name", "")).strip(), "CallSign": str(b.get("CallSign", "")).strip(),
                        "IMO": str(b.get("ImoNumber", "")), "Draft": float(b.get("MaximumStaticDraught", 0) or 0),
                        "TransceiverClass": "A",
                    }
                elif mt == "StaticDataReport":
                    b = m["Message"]["StaticDataReport"]
                    r = registry.setdefault(int(meta["MMSI"]), {"VesselType": 0.0, "Length": 0.0, "Width": 0.0,
                                                                 "VesselName": "", "CallSign": "", "IMO": "",
                                                                 "Draft": 0.0, "TransceiverClass": "B"})
                    rb = b.get("ReportB") or {}
                    dim = rb.get("Dimension") or {}
                    if rb.get("ShipType"):
                        r["VesselType"] = float(rb["ShipType"])
                    if dim:
                        r["Length"] = float((dim.get("A") or 0) + (dim.get("B") or 0))
                    ra = b.get("ReportA") or {}
                    if ra.get("Name"):
                        r["VesselName"] = str(ra["Name"]).strip()
    outs = []
    for f in files:
        rows = []
        with open(f) as fh:
            for line in fh:
                try:
                    m = json.loads(line)
                except json.JSONDecodeError:
                    continue
                mt = m.get("MessageType")
                if mt in ("PositionReport", "StandardClassBPositionReport"):
                    rows.append(_row(m["MetaData"], m["Message"][mt]))
        if not rows:
            continue
        df = pd.DataFrame(rows)
        reg = pd.DataFrame.from_dict(registry, orient="index")
        reg.index.name = "MMSI"
        df = df.merge(reg.drop(columns=["VesselName"]), left_on="MMSI", right_index=True, how="left")
        df["VesselName"] = df["VesselName"].where(df["VesselName"] != "", df["MMSI"].map(lambda k: registry.get(k, {}).get("VesselName", "")))
        # aisstream times look like "2026-10-06 05:09:52.125228436 +0000 UTC"
        ts = df["BaseDateTime"].str.replace(r" \+0000 UTC$", "", regex=True).str.slice(0, 26)
        df["BaseDateTime"] = pd.to_datetime(ts, utc=True, format="mixed")
        df["Cargo"] = pd.NA
        for c in ["VesselType", "Length", "Width", "Draft"]:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        df = df.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)
        date = f.stem
        tugs = df[df["VesselType"].isin(types)]
        ships = df[(df["Length"] >= ship_min_length_m) & ~df["VesselType"].isin(types)]
        tugs.to_parquet(out_dir / f"tugs_{date}.parquet", index=False)
        ships.to_parquet(out_dir / f"ships_{date}.parquet", index=False)
        log(f"  {date}: {len(tugs):,} tug rows, {tugs['MMSI'].nunique()} vessels; {len(ships):,} ship rows, "
            f"{ships['MMSI'].nunique()} ships ({len(registry)} vessels with static data)")
        outs.append(out_dir / f"tugs_{date}.parquet")
    return outs


def main_record(a) -> int:
    cfg = load_config()
    n = asyncio.run(record(Path(a.raw_dir), cfg["data"]["bbox"], a.seconds, log=lambda s: print(s, file=sys.stderr)))
    print(f"recorded {n} messages")
    return 0


def main_finalize(a) -> int:
    cfg = load_config()
    finalize(Path(a.raw_dir), Path(a.out_dir), cfg["data"]["vessel_types"],
             cfg["activity"].get("ship_min_length_m", 100), log=lambda s: print(s, file=sys.stderr))
    return 0
