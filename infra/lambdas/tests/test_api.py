from __future__ import annotations

import json

import pytest

from api import handler as api
from common.store import LiveStore
from helpers import telemetry

SUMMARY = {
    "dataset": {"start": "2024-12-02", "end": "2024-12-08", "tug_days": 84, "tugs": 12},
    "default_battery_kwh": 6000,
    "sweep": [
        {"battery_kwh": 1000, "electric_share": 0.21},
        {"battery_kwh": 4000, "electric_share": 0.55},
        {"battery_kwh": 6000, "electric_share": 0.80},
        {"battery_kwh": 8000, "electric_share": 0.93},
    ],
    "tugs": [{"tug_id": "366999123", "name": "MILLENNIUM DAWN", "days": 7, "energy_kwh_per_day": 2400}],
    "assumptions": [{"key": "assist_power_kw", "value": 1400, "note": "weakest estimate"}],
}


@pytest.fixture(autouse=True)
def _reset_summary_cache():
    api._summary_cache.update({"expires": 0.0, "data": None})


def _event(route: str, path_params: dict | None = None, query: dict | None = None) -> dict:
    return {
        "routeKey": route,
        "rawPath": route.split(" ", 1)[1],
        "requestContext": {"http": {"method": "GET"}},
        "pathParameters": path_params or {},
        "queryStringParameters": query or {},
    }


def _body(resp: dict) -> dict:
    return json.loads(resp["body"])


def test_fleet_returns_snapshot(env, dynamo):
    live = LiveStore(dynamo, "tug_live")
    live.put(telemetry("2", t="2024-12-02T15:04:00Z"))
    live.put(telemetry("1", t="2024-12-02T15:02:00Z"))
    resp = api.handler(_event("GET /fleet"))
    assert resp["statusCode"] == 200
    assert resp["headers"]["content-type"] == "application/json"
    body = _body(resp)
    assert body["clock"] == "2024-12-02T15:04:00Z"
    assert [t["tug_id"] for t in body["tugs"]] == ["1", "2"]
    assert body["speedup"] == 120 and body["dataset"]["start"] == "2024-12-02"


def test_tug_day_redirects_to_cdn(env, s3):
    s3.objects["tugdays/366999123/2024-12-02.json"] = b"{}"
    resp = api.handler(_event("GET /tugs/{tug_id}/days/{date}", {"tug_id": "366999123", "date": "2024-12-02"}))
    assert resp["statusCode"] == 302
    assert resp["headers"]["location"] == "https://d123.cloudfront.net/tugdays/366999123/2024-12-02.json"


def test_tug_day_404_when_missing(env, s3):
    resp = api.handler(_event("GET /tugs/{tug_id}/days/{date}", {"tug_id": "366999123", "date": "2024-12-09"}))
    assert resp["statusCode"] == 404
    assert "2024-12-09" in _body(resp)["error"]


@pytest.mark.parametrize(
    "params",
    [{"tug_id": "../etc", "date": "2024-12-02"}, {"tug_id": "366999123", "date": "12/02/2024"}, {"tug_id": "", "date": "2024-12-02"}],
)
def test_tug_day_rejects_bad_params_before_touching_s3(env, s3, params):
    resp = api.handler(_event("GET /tugs/{tug_id}/days/{date}", params))
    assert resp["statusCode"] == 400
    assert s3.calls == []


def test_summary_full(env, s3):
    s3.objects["summary.json"] = json.dumps(SUMMARY).encode()
    resp = api.handler(_event("GET /summary"))
    assert resp["statusCode"] == 200
    assert _body(resp) == SUMMARY


def test_summary_nearest_row(env, s3):
    s3.objects["summary.json"] = json.dumps(SUMMARY).encode()
    resp = api.handler(_event("GET /summary", query={"battery_kwh": "5200"}))
    body = _body(resp)
    assert resp["statusCode"] == 200
    assert body["row"] == {"battery_kwh": 6000, "electric_share": 0.80}
    assert body["battery_kwh"] == 6000 and body["requested_battery_kwh"] == 5200
    assert body["dataset"] == SUMMARY["dataset"]
    assert body["default_battery_kwh"] == 6000
    assert body["assumptions"] == SUMMARY["assumptions"]
    assert "sweep" not in body and "tugs" not in body


def test_summary_is_cached_between_requests(env, s3):
    s3.objects["summary.json"] = json.dumps(SUMMARY).encode()
    api.handler(_event("GET /summary", query={"battery_kwh": "1000"}))
    api.handler(_event("GET /summary", query={"battery_kwh": "8000"}))
    assert s3.calls == ["get:summary.json"]


def test_summary_bad_query_and_missing_file(env, s3):
    resp = api.handler(_event("GET /summary", query={"battery_kwh": "big"}))
    assert resp["statusCode"] == 404  # file missing takes precedence: nothing published yet
    s3.objects["summary.json"] = json.dumps(SUMMARY).encode()
    resp = api.handler(_event("GET /summary", query={"battery_kwh": "big"}))
    assert resp["statusCode"] == 400


def test_unknown_route(env):
    resp = api.handler(_event("GET /nope"))
    assert resp["statusCode"] == 404
