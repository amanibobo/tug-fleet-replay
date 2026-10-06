"""Runtime settings read from Lambda environment variables (set by the CDK stack)."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    live_table: str
    connections_table: str
    history_table: str
    ws_endpoint: str
    speedup: int
    dataset_start: str
    dataset_end: str
    dataset_source: str
    history_ttl_days: int
    connection_ttl_s: int
    history_bucket: str
    cdn_domain: str
    snapshot_function: str

    @property
    def dataset(self) -> dict[str, str]:
        return {"start": self.dataset_start, "end": self.dataset_end, "source": self.dataset_source}


def settings() -> Settings:
    """Read settings on every call so tests can swap environment variables freely."""
    env = os.environ
    return Settings(
        live_table=env.get("LIVE_TABLE", "tug_live"),
        connections_table=env.get("CONNECTIONS_TABLE", "tug_connections"),
        history_table=env.get("HISTORY_TABLE", "tug_history"),
        ws_endpoint=env.get("WS_ENDPOINT", ""),
        speedup=int(env.get("REPLAY_SPEEDUP", "120")),
        dataset_start=env.get("DATASET_START", "2024-12-02"),
        dataset_end=env.get("DATASET_END", "2024-12-08"),
        dataset_source=env.get("DATASET_SOURCE", "NOAA AIS"),
        history_ttl_days=int(env.get("HISTORY_TTL_DAYS", "14")),
        # API Gateway closes WebSocket connections after 2 hours; expire the row a little later.
        connection_ttl_s=int(env.get("CONNECTION_TTL_S", str(3 * 3600))),
        history_bucket=env.get("HISTORY_BUCKET", ""),
        cdn_domain=env.get("CDN_DOMAIN", ""),
        snapshot_function=env.get("SNAPSHOT_FUNCTION", ""),
    )
