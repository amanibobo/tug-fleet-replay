"""IoT rule target: store the telemetry message and fan it out to every WebSocket client."""

from __future__ import annotations

import logging
import time
from typing import Any, Callable

from common import clients
from common.config import settings
from common.store import ConnectionStore, HistoryStore, LiveStore
from common.telemetry import InvalidTelemetry, normalize
from common.ws import Broadcaster

log = logging.getLogger()
log.setLevel(logging.INFO)

CONNECTIONS_CACHE_S = 5.0


class ConnectionCache:
    """Avoid a table scan per message: reuse the connection list for a few seconds per container."""

    def __init__(self, ttl_s: float) -> None:
        self.ttl_s = ttl_s
        self._ids: list[str] = []
        self._expires = 0.0

    def get(self, loader: Callable[[], list[str]]) -> list[str]:
        now = time.monotonic()
        if now >= self._expires:
            self._ids = loader()
            self._expires = now + self.ttl_s
        return list(self._ids)

    def evict(self, ids: list[str]) -> None:
        gone = set(ids)
        self._ids = [i for i in self._ids if i not in gone]

    def clear(self) -> None:
        self._ids, self._expires = [], 0.0


connection_cache = ConnectionCache(CONNECTIONS_CACHE_S)


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    try:
        message = normalize(event)
    except InvalidTelemetry as exc:
        # Return instead of raising: IoT invokes asynchronously and would retry a bad payload.
        log.warning("dropping telemetry: %s", exc)
        return {"ok": False, "error": str(exc)}

    cfg = settings()
    db = clients.dynamodb()
    LiveStore(db, cfg.live_table).put(message)
    HistoryStore(db, cfg.history_table).append(message, cfg.history_ttl_days)

    connections = ConnectionStore(db, cfg.connections_table)
    ids = connection_cache.get(connections.ids)
    result = Broadcaster(clients.ws_management(cfg.ws_endpoint), connections).broadcast(
        {"type": "telemetry", "data": message}, ids
    )
    if result.gone:
        connection_cache.evict(result.gone)
    return {"ok": True, "tug_id": message["tug_id"], "t": message["t"], "sent": result.sent, "gone": len(result.gone)}
