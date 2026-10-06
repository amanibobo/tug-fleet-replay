from __future__ import annotations

import json

from helpers import add_connections, telemetry
from common.config import settings
from common.snapshot import build_snapshot
from common.store import LiveStore
from ws_connect import handler as ws_connect
from ws_default import handler as ws_default
from ws_disconnect import handler as ws_disconnect


def _ws_event(connection_id: str, body: str | None = None) -> dict:
    event = {"requestContext": {"connectionId": connection_id, "routeKey": "$default"}}
    if body is not None:
        event["body"] = body
    return event


def test_build_snapshot_shape(env):
    cfg = settings()
    tugs = [telemetry("b", t="2024-12-02T15:04:00Z"), telemetry("a", t="2024-12-02T15:06:00Z")]
    snap = build_snapshot(tugs, cfg)
    assert snap["clock"] == "2024-12-02T15:06:00Z"  # latest replay clock across the fleet
    assert snap["speedup"] == 120
    assert [t["tug_id"] for t in snap["tugs"]] == ["a", "b"]
    assert snap["dataset"] == {"start": "2024-12-02", "end": "2024-12-08", "source": "NOAA AIS"}
    assert build_snapshot([], cfg)["clock"] is None


def test_connect_registers_connection_and_requests_snapshot(env, dynamo, lambda_client):
    out = ws_connect.handler(_ws_event("abc="))
    assert out == {"statusCode": 200}
    (row,) = dynamo.rows("tug_connections")
    assert row["connection_id"] == "abc="
    assert row["expires_at"] - row["connected_at"] == 3 * 3600
    (inv,) = lambda_client.invocations
    assert inv["FunctionName"] == "ws-default-fn" and inv["InvocationType"] == "Event"
    assert json.loads(inv["Payload"]) == {"snapshot_for": "abc="}


def test_connect_without_snapshot_function_does_not_invoke(env, dynamo, lambda_client, monkeypatch):
    monkeypatch.setenv("SNAPSHOT_FUNCTION", "")
    ws_connect.handler(_ws_event("abc="))
    assert lambda_client.invocations == []
    assert len(dynamo.rows("tug_connections")) == 1


def test_disconnect_removes_connection(env, dynamo):
    add_connections(dynamo, "a", "b")
    assert ws_disconnect.handler(_ws_event("a")) == {"statusCode": 200}
    assert [r["connection_id"] for r in dynamo.rows("tug_connections")] == ["b"]


def test_snapshot_push_after_connect(env, dynamo, ws):
    live = LiveStore(dynamo, "tug_live")
    for msg in (telemetry("2", t="2024-12-02T15:04:00Z"), telemetry("1", t="2024-12-02T15:02:00Z"), telemetry("3", t="2024-12-02T15:03:00Z")):
        live.put(msg)

    out = ws_default.handler({"snapshot_for": "new-conn"})

    assert out == {"statusCode": 200, "delivered": True}
    (msg,) = ws.messages_for("new-conn")
    assert msg["type"] == "snapshot"
    assert msg["data"]["clock"] == "2024-12-02T15:04:00Z"
    assert [t["tug_id"] for t in msg["data"]["tugs"]] == ["1", "2", "3"]  # paginated scan (page_size=2) + sort
    assert msg["data"]["tugs"][1] == telemetry("2", t="2024-12-02T15:04:00Z")
    assert msg["data"]["speedup"] == 120 and msg["data"]["dataset"]["source"] == "NOAA AIS"


def test_snapshot_push_retries_while_handshake_completes(env, dynamo, ws, monkeypatch):
    """410 on the first attempts (socket not open yet) must not delete the connection."""
    add_connections(dynamo, "new-conn")
    ws.gone.add("new-conn")
    sleeps: list[float] = []
    attempts = {"n": 0}

    def flaky_post(ConnectionId: str, Data: bytes):
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise ws.exceptions.GoneException(ConnectionId)
        ws.posts.append((ConnectionId, json.loads(Data)))
        return {}

    monkeypatch.setattr(ws, "post_to_connection", flaky_post)
    monkeypatch.setattr(ws_default.time, "sleep", sleeps.append)

    out = ws_default.handler({"snapshot_for": "new-conn"})

    assert out["delivered"] is True and attempts["n"] == 3
    assert sleeps == [0.25, 0.5]
    assert len(dynamo.rows("tug_connections")) == 1  # not deleted
    assert ws.messages_for("new-conn")[0]["type"] == "snapshot"


def test_snapshot_push_gives_up_quietly(env, dynamo, ws, monkeypatch):
    ws.gone.add("dead")
    monkeypatch.setattr(ws_default.time, "sleep", lambda s: None)
    out = ws_default.handler({"snapshot_for": "dead"})
    assert out == {"statusCode": 200, "delivered": False}


def test_default_route_snapshot_request(env, dynamo, ws):
    LiveStore(dynamo, "tug_live").put(telemetry())
    ws_default.handler(_ws_event("c1", json.dumps({"action": "snapshot"})))
    (msg,) = ws.messages_for("c1")
    assert msg["type"] == "snapshot" and len(msg["data"]["tugs"]) == 1


def test_default_route_ping_and_unknown(env, dynamo, ws):
    ws_default.handler(_ws_event("c1", json.dumps({"action": "ping"})))
    ws_default.handler(_ws_event("c1", "not json"))
    ws_default.handler(_ws_event("c1"))
    types = [m["type"] for m in ws.messages_for("c1")]
    assert types == ["pong", "error", "error"]
