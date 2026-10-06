"""Small geodesy helpers. Distances in meters."""
from __future__ import annotations

import numpy as np

EARTH_R = 6_371_000.0


def haversine_m(lat1, lon1, lat2, lon2):
    """Vectorized great-circle distance in meters."""
    lat1, lon1, lat2, lon2 = (np.radians(np.asarray(x, dtype=float)) for x in (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * EARTH_R * np.arcsin(np.sqrt(a))


def nearest_dock(lat, lon, docks: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    """Return (dock index or -1, distance m) for each point. A point is 'at' a dock when inside its radius."""
    lat = np.asarray(lat, dtype=float)
    lon = np.asarray(lon, dtype=float)
    idx = np.full(lat.shape, -1, dtype=int)
    best = np.full(lat.shape, np.inf)
    for i, d in enumerate(docks):
        dist = haversine_m(lat, lon, d["lat"], d["lon"])
        inside = (dist <= d["radius_m"]) & (dist < best)
        idx[inside] = i
        best = np.where(dist < best, dist, best)
    return idx, best
