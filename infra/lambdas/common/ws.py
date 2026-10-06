"""Sending messages to API Gateway WebSocket connections."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Iterable

from common.store import ConnectionStore

log = logging.getLogger(__name__)


@dataclass
class BroadcastResult:
    sent: int = 0
    gone: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)


class Broadcaster:
    """Posts JSON payloads; connections that answer 410 Gone are removed from the table."""

    def __init__(self, client: Any, connections: ConnectionStore) -> None:
        self.client = client
        self.connections = connections

    def send(self, connection_id: str, payload: dict[str, Any], *, delete_on_gone: bool = True) -> bool:
        """Return True when delivered, False when the connection is gone."""
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        try:
            self.client.post_to_connection(ConnectionId=connection_id, Data=data)
            return True
        except self.client.exceptions.GoneException:
            if delete_on_gone:
                log.info("connection %s gone; removing", connection_id)
                self.connections.remove(connection_id)
            return False

    def broadcast(self, payload: dict[str, Any], connection_ids: Iterable[str]) -> BroadcastResult:
        result = BroadcastResult()
        for cid in connection_ids:
            try:
                if self.send(cid, payload):
                    result.sent += 1
                else:
                    result.gone.append(cid)
            except Exception:  # noqa: BLE001 - one bad socket must not stop the fan-out
                log.exception("post_to_connection failed for %s", cid)
                result.failed.append(cid)
        return result
