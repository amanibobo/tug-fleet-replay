"""$connect: register the connection, then ask ws_default to push a snapshot once the socket is open.

API Gateway only completes the handshake after this handler returns, so posting to the new
connection from here fails; the snapshot is sent by an asynchronous invocation instead.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from common import clients
from common.config import settings
from common.store import ConnectionStore

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    connection_id = event["requestContext"]["connectionId"]
    cfg = settings()
    ConnectionStore(clients.dynamodb(), cfg.connections_table).add(connection_id, cfg.connection_ttl_s)
    if cfg.snapshot_function:
        clients.lambda_().invoke(
            FunctionName=cfg.snapshot_function,
            InvocationType="Event",
            Payload=json.dumps({"snapshot_for": connection_id}).encode("utf-8"),
        )
    log.info("connected %s", connection_id)
    return {"statusCode": 200}
