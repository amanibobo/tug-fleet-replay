from __future__ import annotations

import pytest

from helpers import add_connections, telemetry
from ingest import handler as ingest


@pytest.fixture(autouse=True)
def _reset_cache() -> None:
    ingest.connection_cache.clear()


def test_stores_live_and_history_then_broadcasts(env, dynamo, ws):
    add_connections(dynamo, "c1", "c2", "c3")
    msg = telemetry()

    out = ingest.handler({**msg, "_topic_tug_id": "366999123"})

    assert out == {"ok": True, "tug_id": "366999123", "t": msg["t"], "sent": 3, "gone": 0}
    # live row equals the message exactly (floats round-trip through Decimal, topic field stripped)
    assert dynamo.rows("tug_live") == [msg]
    # history row has the sort key t and a TTL
    (hist,) = dynamo.rows("tug_history")
    assert hist["t"] == msg["t"] and hist["tug_id"] == msg["tug_id"]
    assert isinstance(hist["expires_at"], int) and hist["expires_at"] > 1_700_000_000
    # every connection received the wrapped telemetry
    assert sorted(cid for cid, _ in ws.posts) == ["c1", "c2", "c3"]
    assert ws.posts[0][1] == {"type": "telemetry", "data": msg}


def test_second_message_replaces_live_row_and_appends_history(env, dynamo, ws):
    ingest.handler(telemetry(t="2024-12-02T15:04:00Z"))
    ingest.handler(telemetry(t="2024-12-02T15:06:00Z", soc=0.82))

    live = dynamo.rows("tug_live")
    assert len(live) == 1 and live[0]["t"] == "2024-12-02T15:06:00Z" and live[0]["soc"] == 0.82
    assert sorted(r["t"] for r in dynamo.rows("tug_history")) == ["2024-12-02T15:04:00Z", "2024-12-02T15:06:00Z"]


def test_gone_connection_is_deleted_and_not_retried(env, dynamo, ws):
    add_connections(dynamo, "alive", "stale")
    ws.gone.add("stale")

    out = ingest.handler(telemetry())

    assert out["sent"] == 1 and out["gone"] == 1
    assert [r["connection_id"] for r in dynamo.rows("tug_connections")] == ["alive"]
    assert "delete:tug_connections" in dynamo.calls

    # the cached connection list dropped the stale id: no second attempt, no new scan
    scans_before = dynamo.calls.count("scan:tug_connections")
    ws.posts.clear()
    ingest.handler(telemetry(t="2024-12-02T15:05:00Z"))
    assert [cid for cid, _ in ws.posts] == ["alive"]
    assert dynamo.calls.count("scan:tug_connections") == scans_before


def test_connection_list_is_cached_between_messages(env, dynamo, ws):
    add_connections(dynamo, "c1", "c2", "c3")  # three rows with page_size=2 -> paginated scan
    ingest.handler(telemetry())
    first = dynamo.calls.count("scan:tug_connections")
    assert first == 2  # two pages
    ingest.handler(telemetry(t="2024-12-02T15:05:00Z"))
    assert dynamo.calls.count("scan:tug_connections") == first
    assert len(ws.posts) == 6


def test_tug_id_falls_back_to_topic(env, dynamo, ws):
    msg = telemetry()
    del msg["tug_id"]
    out = ingest.handler({**msg, "_topic_tug_id": "366999123"})
    assert out["ok"] is True and out["tug_id"] == "366999123"
    assert dynamo.rows("tug_live")[0]["tug_id"] == "366999123"
    assert "_topic_tug_id" not in dynamo.rows("tug_live")[0]


@pytest.mark.parametrize(
    "event, reason",
    [
        ({**telemetry(), "_topic_tug_id": "111111111"}, "does not match topic"),
        ({k: v for k, v in telemetry().items() if k != "tug_id"}, "tug_id missing"),
        ({**telemetry(), "t": 1733151840}, "t missing or not a string"),
        ({**telemetry(), "lat": "33.7"}, "lat must be a number"),
        ("not json object", "not a JSON object"),
    ],
)
def test_invalid_messages_are_dropped_without_writes(env, dynamo, ws, event, reason):
    add_connections(dynamo, "c1")
    out = ingest.handler(event)
    assert out["ok"] is False and reason in out["error"]
    assert dynamo.rows("tug_live") == [] and dynamo.rows("tug_history") == []
    assert ws.posts == []


def test_no_connections_still_stores(env, dynamo, ws):
    out = ingest.handler(telemetry())
    assert out["sent"] == 0 and len(dynamo.rows("tug_live")) == 1
