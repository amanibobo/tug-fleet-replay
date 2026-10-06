"""Thin table wrappers over a DynamoDB client (real or fake)."""

from __future__ import annotations

import time
from typing import Any

from common.dynamo import from_item, scan_all, to_item


class LiveStore:
    """tug_live: one row per tug, the latest telemetry message (contract section 1)."""

    def __init__(self, client: Any, table: str) -> None:
        self.client, self.table = client, table

    def put(self, message: dict[str, Any]) -> None:
        self.client.put_item(TableName=self.table, Item=to_item(message))

    def all(self) -> list[dict[str, Any]]:
        return sorted(scan_all(self.client, self.table), key=lambda m: str(m.get("tug_id", "")))


class HistoryStore:
    """tug_history: pk tug_id, sk t. Rows expire via the expires_at TTL attribute."""

    def __init__(self, client: Any, table: str) -> None:
        self.client, self.table = client, table

    def append(self, message: dict[str, Any], ttl_days: int, now: float | None = None) -> None:
        row = dict(message)
        row["expires_at"] = int((now if now is not None else time.time()) + ttl_days * 86400)
        self.client.put_item(TableName=self.table, Item=to_item(row))


class ConnectionStore:
    """tug_connections: open WebSocket connection ids with a TTL."""

    def __init__(self, client: Any, table: str) -> None:
        self.client, self.table = client, table

    def add(self, connection_id: str, ttl_seconds: int, now: float | None = None) -> None:
        now = now if now is not None else time.time()
        item = {
            "connection_id": connection_id,
            "connected_at": int(now),
            "expires_at": int(now + ttl_seconds),
        }
        self.client.put_item(TableName=self.table, Item=to_item(item))

    def remove(self, connection_id: str) -> None:
        self.client.delete_item(TableName=self.table, Key=to_item({"connection_id": connection_id}))

    def ids(self) -> list[str]:
        rows = scan_all(self.client, self.table, ProjectionExpression="connection_id")
        return [str(r["connection_id"]) for r in rows]

    def get(self, connection_id: str) -> dict[str, Any] | None:
        resp = self.client.get_item(TableName=self.table, Key=to_item({"connection_id": connection_id}))
        item = resp.get("Item")
        return from_item(item) if item else None
