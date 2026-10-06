"""$disconnect: forget the connection."""

from __future__ import annotations

import logging
from typing import Any

from common import clients
from common.config import settings
from common.store import ConnectionStore

log = logging.getLogger()
log.setLevel(logging.INFO)


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    connection_id = event["requestContext"]["connectionId"]
    ConnectionStore(clients.dynamodb(), settings().connections_table).remove(connection_id)
    log.info("disconnected %s", connection_id)
    return {"statusCode": 200}
