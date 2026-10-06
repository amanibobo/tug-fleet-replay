import numpy as np
import pandas as pd
from tug_replay.ships import nearest_ship, ship_grid


def test_ship_grid_and_nearest_ship():
    grid = pd.date_range("2024-12-02T00:00", periods=5, freq="min", tz="UTC")
    ships = pd.DataFrame({
        "MMSI": [1, 1, 2], "BaseDateTime": [grid[0], grid[4], grid[2]],
        "LAT": [33.70, 33.70, 33.75], "LON": [-118.20, -118.20, -118.20],
        "VesselName": ["EVER BIG", "EVER BIG", "MAERSK X"], "Length": [300.0, 300.0, 200.0],
    })
    lat, lon, length, names, _ids = ship_grid(ships, grid)
    assert lat.shape == (5, 2) and names == ["EVER BIG", "MAERSK X"]
    assert not np.isnan(lat[2, 0]) and np.isnan(lat[0, 1])     # ship 1 interpolated, ship 2 only at minute 2
    tug_lat = np.full(5, 33.701); tug_lon = np.full(5, -118.20)   # ~110 m north of ship 1's center
    d, who = nearest_ship(tug_lat, tug_lon, lat, lon, length)
    assert who[0] == 0 and abs(d[0] - (111 - 150)) < 5 or d[0] == 0.0   # inside the hull circle -> 0
    assert d[0] == 0.0
