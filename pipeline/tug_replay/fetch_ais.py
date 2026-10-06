"""Download NOAA MarineCadastre AIS daily files and keep only tugs inside San Pedro Bay.

Each daily zip is roughly 300 MB. The file is downloaded, the CSV inside is read in
chunks, rows are filtered to tug/towing vessel types inside the bounding box, the
result is written to parquet, and the zip is deleted. Disk use stays under 1 GB.
"""
from __future__ import annotations

import argparse
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

from .config import load_config

BASE_URL = "https://coast.noaa.gov/htdata/CMSP/AISDataHandler/{year}/AIS_{y}_{m:02d}_{d:02d}.zip"

KEEP_COLS = [
    "MMSI", "BaseDateTime", "LAT", "LON", "SOG", "COG", "Heading", "VesselName",
    "IMO", "CallSign", "VesselType", "Status", "Length", "Width", "Draft",
    "Cargo", "TransceiverClass",
]


def day_url(d: date) -> str:
    return BASE_URL.format(year=d.year, y=d.year, m=d.month, d=d.day)


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120, headers={"User-Agent": "tug-replay/0.1"}) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        done = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"\r  {dest.name}: {done / 1e6:7.1f} / {total / 1e6:.1f} MB", end="", file=sys.stderr)
    print(file=sys.stderr)
    return dest


def _finish(frames: list[pd.DataFrame]) -> pd.DataFrame:
    if not frames:
        return pd.DataFrame(columns=KEEP_COLS)
    df = pd.concat(frames, ignore_index=True)
    df["BaseDateTime"] = pd.to_datetime(df["BaseDateTime"], utc=True)
    return df.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)


def filter_zip(zip_path: Path, bbox: dict, types: list[int], ship_min_length_m: float = 100.0
               ) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (tug rows, large-ship rows) inside the box. Ships are kept so an assist can be
    confirmed by proximity to a real vessel, not just by the tug's speed."""
    tugs, ships = [], []
    with zipfile.ZipFile(zip_path) as zf:
        name = next(n for n in zf.namelist() if n.lower().endswith(".csv"))
        with zf.open(name) as fh:
            for chunk in pd.read_csv(fh, chunksize=500_000, low_memory=False):
                cols = [c for c in KEEP_COLS if c in chunk.columns]
                chunk = chunk[cols]
                inside = (chunk["LAT"].between(bbox["lat_min"], bbox["lat_max"])
                          & chunk["LON"].between(bbox["lon_min"], bbox["lon_max"]))
                m_tug = inside & chunk["VesselType"].isin(types)
                m_ship = inside & (chunk["Length"] >= ship_min_length_m) & ~m_tug
                if m_tug.any():
                    tugs.append(chunk[m_tug])
                if m_ship.any():
                    ships.append(chunk[m_ship])
    return _finish(tugs), _finish(ships)


def fetch_day(d: date, raw_dir: Path, out_dir: Path, bbox: dict, types: list[int], keep_zip: bool) -> Path:
    out = out_dir / f"tugs_{d.isoformat()}.parquet"
    out_ships = out_dir / f"ships_{d.isoformat()}.parquet"
    if out.exists() and out_ships.exists():
        print(f"skip {out.name} (exists)", file=sys.stderr)
        return out
    zip_path = raw_dir / f"AIS_{d.isoformat()}.zip"
    if not zip_path.exists():
        print(f"download {day_url(d)}", file=sys.stderr)
        download(day_url(d), zip_path)
    df, ships = filter_zip(zip_path, bbox, types)
    out_dir.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False)
    ships.to_parquet(out_ships, index=False)
    print(f"  {d}: {len(df):,} tug rows, {df['MMSI'].nunique()} vessels; {len(ships):,} ship rows, "
          f"{ships['MMSI'].nunique()} ships -> {out.name}", file=sys.stderr)
    if not keep_zip:
        zip_path.unlink()
    return out


def main(argv: list[str] | None = None) -> int:
    cfg = load_config()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", default=cfg["data"]["start_date"])
    p.add_argument("--days", type=int, default=cfg["data"]["days"])
    p.add_argument("--raw-dir", default="data/raw")
    p.add_argument("--out-dir", default="data/processed")
    p.add_argument("--keep-zip", action="store_true")
    a = p.parse_args(argv)
    start = date.fromisoformat(a.start)
    for i in range(a.days):
        fetch_day(start + timedelta(days=i), Path(a.raw_dir), Path(a.out_dir),
                  cfg["data"]["bbox"], cfg["data"]["vessel_types"], a.keep_zip)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
