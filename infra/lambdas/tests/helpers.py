"""Fake boto3 clients (no moto, no network) and message builders shared by the tests."""

from __future__ import annotations

import io
import json
from typing import Any

from botocore.exceptions import ClientError

from common.dynamo import from_item, to_item


class FakeDynamoDB:
    """Subset of the DynamoDB client API, storing raw attribute-value maps per table."""

    def __init__(self, key_schema: dict[str, tuple[str, ...]], page_size: int = 100) -> None:
        self.key_schema = key_schema
        self.tables: dict[str, list[dict[str, Any]]] = {t: [] for t in key_schema}
        self.page_size = page_size
        self.calls: list[str] = []

    def _key_of(self, table: str, item: dict[str, Any]) -> tuple:
        return tuple(json.dumps(item[k], sort_keys=True) for k in self.key_schema[table])

    def put_item(self, TableName: str, Item: dict[str, Any], **_: Any) -> dict[str, Any]:
        self.calls.append(f"put:{TableName}")
        key = self._key_of(TableName, Item)
        rows = self.tables[TableName]
        self.tables[TableName] = [r for r in rows if self._key_of(TableName, r) != key] + [Item]
        return {}

    def delete_item(self, TableName: str, Key: dict[str, Any], **_: Any) -> dict[str, Any]:
        self.calls.append(f"delete:{TableName}")
        key = self._key_of(TableName, Key)
        self.tables[TableName] = [r for r in self.tables[TableName] if self._key_of(TableName, r) != key]
        return {}

    def get_item(self, TableName: str, Key: dict[str, Any], **_: Any) -> dict[str, Any]:
        key = self._key_of(TableName, Key)
        for r in self.tables[TableName]:
            if self._key_of(TableName, r) == key:
                return {"Item": r}
        return {}

    def scan(self, TableName: str, ExclusiveStartKey: dict[str, Any] | None = None, ProjectionExpression: str | None = None, **_: Any) -> dict[str, Any]:
        self.calls.append(f"scan:{TableName}")
        rows = self.tables[TableName]
        start = 0
        if ExclusiveStartKey is not None:
            start = ExclusiveStartKey["_index"] + 1
        page = rows[start : start + self.page_size]
        if ProjectionExpression:
            wanted = [p.strip() for p in ProjectionExpression.split(",")]
            page = [{k: v for k, v in r.items() if k in wanted} for r in page]
        out: dict[str, Any] = {"Items": page, "Count": len(page)}
        if start + self.page_size < len(rows):
            out["LastEvaluatedKey"] = {"_index": start + self.page_size - 1}
        return out

    # helpers for assertions
    def rows(self, table: str) -> list[dict[str, Any]]:
        return [from_item(r) for r in self.tables[table]]


class _GoneException(Exception):
    pass


class _Exceptions:
    GoneException = _GoneException


class FakeWsManagement:
    """apigatewaymanagementapi: records posts; raises GoneException for configured ids."""

    exceptions = _Exceptions

    def __init__(self, gone: set[str] | None = None) -> None:
        self.gone = set(gone or ())
        self.posts: list[tuple[str, dict[str, Any]]] = []

    def post_to_connection(self, ConnectionId: str, Data: bytes) -> dict[str, Any]:
        if ConnectionId in self.gone:
            raise _GoneException(ConnectionId)
        self.posts.append((ConnectionId, json.loads(Data)))
        return {}

    def messages_for(self, connection_id: str) -> list[dict[str, Any]]:
        return [m for cid, m in self.posts if cid == connection_id]


class FakeLambda:
    def __init__(self) -> None:
        self.invocations: list[dict[str, Any]] = []

    def invoke(self, **kwargs: Any) -> dict[str, Any]:
        self.invocations.append(kwargs)
        return {"StatusCode": 202}


class FakeS3:
    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects = dict(objects or {})
        self.calls: list[str] = []

    def _missing(self, op: str, key: str) -> ClientError:
        return ClientError({"Error": {"Code": "404" if op == "HeadObject" else "NoSuchKey", "Message": key}}, op)

    def head_object(self, Bucket: str, Key: str) -> dict[str, Any]:
        self.calls.append(f"head:{Key}")
        if Key not in self.objects:
            raise self._missing("HeadObject", Key)
        return {"ContentLength": len(self.objects[Key])}

    def get_object(self, Bucket: str, Key: str) -> dict[str, Any]:
        self.calls.append(f"get:{Key}")
        if Key not in self.objects:
            raise self._missing("GetObject", Key)
        return {"Body": io.BytesIO(self.objects[Key])}



def telemetry(tug_id: str = "366999123", t: str = "2024-12-02T15:04:00Z", **overrides: Any) -> dict[str, Any]:
    msg: dict[str, Any] = {
        "tug_id": tug_id,
        "name": "MILLENNIUM DAWN",
        "t": t,
        "lat": 33.7412,
        "lon": -118.2701,
        "sog": 6.2,
        "cog": 184.0,
        "heading": 186,
        "activity": "transit",
        "power_kw": 420.5,
        "soc": 0.83,
        "generator_on": False,
        "generator_kw": 0,
        "battery_kwh": 6000,
        "job_id": f"{tug_id}-2024-12-02-03",
    }
    msg.update(overrides)
    return msg


def add_connections(dynamo: FakeDynamoDB, *ids: str) -> None:
    for cid in ids:
        dynamo.put_item(TableName="tug_connections", Item=to_item({"connection_id": cid, "expires_at": 9999999999}))
