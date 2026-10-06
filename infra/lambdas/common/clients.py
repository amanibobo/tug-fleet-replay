"""boto3 client factories. Handlers call these (never boto3 directly) so tests can swap in fakes."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import boto3


@lru_cache(maxsize=1)
def dynamodb() -> Any:
    return boto3.client("dynamodb")


@lru_cache(maxsize=1)
def s3() -> Any:
    return boto3.client("s3")


@lru_cache(maxsize=1)
def lambda_() -> Any:
    return boto3.client("lambda")


@lru_cache(maxsize=4)
def ws_management(endpoint: str) -> Any:
    """Client for the API Gateway WebSocket management API (post_to_connection)."""
    return boto3.client("apigatewaymanagementapi", endpoint_url=endpoint)
