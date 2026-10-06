import asyncio
import json
from datetime import UTC, datetime

import pandas as pd
from tug_replay.replayer import Fleet, Replayer
from tug_replay.tracks import detect_docks, resample_tug


def _grid(minutes=10):
    return pd.date_range("2024-12-02T00:00", periods=minutes, freq="min", tz="UTC")


def test_resample_interpolates_short_gaps_and_holds_long_ones():
    grid = _grid(10)
    rows = pd.DataFrame({
        "BaseDateTime": [grid[0], grid[2], grid[9]],
        "LAT": [33.70, 33.72, 33.80], "LON": [-118.2, -118.2, -118.2],
        "SOG": [4.0, 4.0, 4.0], "COG": [0.0, 0.0, 0.0], "Heading": [0.0, 0.0, 511.0],
    })
    t = resample_tug(rows, grid, max_gap_min=3)
    assert len(t) == 10
    assert t["lat"].iloc[1] == 33.71                 # 2-minute gap interpolated
    assert t["has_fix"].iloc[1]
    assert not t["has_fix"].iloc[5]                  # 7-minute gap held
    assert t["lat"].iloc[5] == 33.72 and t["sog"].iloc[5] == 0.0
    assert t["heading"].iloc[9] == 0.0               # 511 (unknown) falls back to COG


def test_detect_docks_finds_idle_cluster():
    grid = _grid(1200)
    a = pd.DataFrame({"lat": 33.74, "lon": -118.27, "sog": 0.0, "has_fix": True}, index=grid)
    a.iloc[:100, a.columns.get_loc("sog")] = 6.0
    docks = detect_docks({"1": a}, min_minutes=600)
    assert len(docks) == 1
    assert abs(docks[0]["lat"] - 33.74) < 1e-3 and docks[0]["idle_minutes"] == 1100


def _fleet(n=5):
    tug = {"tug_id": "1", "name": "A", "lat": [33.7] * n, "lon": [-118.2] * n, "sog": [1.0] * n,
           "heading": [10] * n, "activity": ["assist"] * n, "soc": [0.9] * n,
           "generator_on": [False] * n, "power_kw": [1400] * n, "has_fix": [True] * n}
    return Fleet(datetime(2024, 12, 2, tzinfo=UTC), 60, n, 6000.0, 120, {"start": "2024-12-02"}, [tug])


def test_replayer_ticks_loop_and_clock():
    f = _fleet(3)
    rep = Replayer(f, start_index=2, loop=True)
    ticks = rep.ticks()
    clock, rows = next(ticks)
    assert clock.isoformat() == "2024-12-02T00:02:00+00:00"
    assert rows[0]["t"] == "2024-12-02T00:02:00Z" and rows[0]["activity"] == "assist"
    clock, _ = next(ticks)
    assert clock.minute == 0                           # wrapped around


def test_replayer_run_publishes_fixed_ticks():
    f = _fleet(4)

    class Collect:
        def __init__(self):
            self.n = 0
            self.closed = False

        async def publish(self, clock, rows):
            self.n += len(rows)

        async def close(self):
            self.closed = True

    pub = Collect()
    sent = asyncio.run(Replayer(f, speedup=1e6, loop=False).run(pub))
    assert sent == 4 and pub.n == 4 and pub.closed
    snap = f.snapshot(1)
    assert json.dumps(snap) and snap["clock"] == "2024-12-02T00:01:00Z" and len(snap["tugs"]) == 1
