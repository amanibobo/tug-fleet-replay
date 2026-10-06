"""Response helpers for the HTTP API (payload format 2.0)."""

from __future__ import annotations

import json
from typing import Any

JSON_HEADERS = {"content-type": "application/json", "cache-control": "no-store"}


def json_response(status: int, body: Any, headers: dict[str, str] | None = None) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {**JSON_HEADERS, **(headers or {})},
        "body": json.dumps(body, separators=(",", ":")),
    }


def error(status: int, message: str) -> dict[str, Any]:
    return json_response(status, {"error": message})


def redirect(location: str, cache_seconds: int = 60) -> dict[str, Any]:
    return {
        "statusCode": 302,
        "headers": {"location": location, "cache-control": f"public, max-age={cache_seconds}"},
        "body": "",
    }
