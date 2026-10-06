"""$default route and the post-connect snapshot push.

Client messages (JSON): {"action":"snapshot"} -> snapshot, {"action":"ping"} -> pong.
Internal event from ws_connect: {"snapshot_for": "<connection_id>"}.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from common import clients
from common.config import Settings, settings
from common.snapshot import build_snapshot
from common.store import ConnectionStore, LiveStore
from common.ws import Broadcaster

log = logging.getLogger()
log.setLevel(logging.INFO)

SNAPSHOT_RETRIES = 4
RETRY_BACKOFF_S = 0.25


def _snapshot_message(live: LiveStore, cfg: Settings) -> dict[str, Any]:
    return {"type": "snapshot", "data": build_snapshot(live.all(), cfg)}


def send_snapshot(broadcaster: Broadcaster, live: LiveStore, cfg: Settings, connection_id: str, *, retries: int = 1) -> bool:
    """Send a snapshot; retry briefly when the handshake has not completed yet (410 Gone)."""
    payload = _snapshot_message(live, cfg)
    for attempt in range(retries):
        if broadcaster.send(connection_id, payload, delete_on_gone=False):
            return True
        if attempt + 1 < retries:
            time.sleep(RETRY_BACKOFF_S * (attempt + 1))
    log.info("snapshot not delivered to %s", connection_id)
    return False


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    cfg = settings()
    db = clients.dynamodb()
    connections = ConnectionStore(db, cfg.connections_table)
    live = LiveStore(db, cfg.live_table)
    broadcaster = Broadcaster(clients.ws_management(cfg.ws_endpoint), connections)

    if "snapshot_for" in event:
        delivered = send_snapshot(broadcaster, live, cfg, str(event["snapshot_for"]), retries=SNAPSHOT_RETRIES)
        return {"statusCode": 200, "delivered": delivered}

    connection_id = event["requestContext"]["connectionId"]
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        body = {}
    action = body.get("action") or body.get("type") if isinstance(body, dict) else None

    if action == "snapshot":
        send_snapshot(broadcaster, live, cfg, connection_id)
    elif action == "ping":
        broadcaster.send(connection_id, {"type": "pong", "t": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    else:
        broadcaster.send(connection_id, {"type": "error", "message": "unknown action; send {\"action\":\"snapshot\"} or {\"action\":\"ping\"}"})
    return {"statusCode": 200}
