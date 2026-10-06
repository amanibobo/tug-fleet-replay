"""Conversion between plain JSON-able dicts and DynamoDB attribute-value maps."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Mapping

from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

_serializer = TypeSerializer()
_deserializer = TypeDeserializer()


def _decimalize(value: Any) -> Any:
    """DynamoDB rejects float; convert via str to avoid binary float noise."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _decimalize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_decimalize(v) for v in value]
    return value


def _plain(value: Any) -> Any:
    """Decimal -> int or float so the result is json.dumps-able."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {k: _plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_plain(v) for v in value]
    return value


def to_item(obj: Mapping[str, Any]) -> dict[str, Any]:
    return {k: _serializer.serialize(_decimalize(v)) for k, v in obj.items()}


def from_item(item: Mapping[str, Any]) -> dict[str, Any]:
    return {k: _plain(_deserializer.deserialize(v)) for k, v in item.items()}


def scan_all(client: Any, table: str, **kwargs: Any) -> list[dict[str, Any]]:
    """Full table scan following pagination; tables here are tiny (fleet size, open sockets)."""
    items: list[dict[str, Any]] = []
    start_key: dict[str, Any] | None = None
    while True:
        params = dict(TableName=table, **kwargs)
        if start_key:
            params["ExclusiveStartKey"] = start_key
        page = client.scan(**params)
        items.extend(from_item(i) for i in page.get("Items", []))
        start_key = page.get("LastEvaluatedKey")
        if not start_key:
            return items
