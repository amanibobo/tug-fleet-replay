"""HTTP API: GET /fleet, GET /tugs/{tug_id}/days/{date}, GET /summary[?battery_kwh=N]."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from botocore.exceptions import ClientError

from common import clients
from common.config import Settings, settings
from common.http import error, json_response, redirect
from common.snapshot import build_snapshot
from common.store import LiveStore

log = logging.getLogger()
log.setLevel(logging.INFO)

TUG_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SUMMARY_KEY = "summary.json"
SUMMARY_CACHE_S = 60.0

_summary_cache: dict[str, Any] = {"expires": 0.0, "data": None}


def _fleet(cfg: Settings) -> dict[str, Any]:
    tugs = LiveStore(clients.dynamodb(), cfg.live_table).all()
    return json_response(200, build_snapshot(tugs, cfg))


def _tug_day(cfg: Settings, params: dict[str, str]) -> dict[str, Any]:
    tug_id, date = params.get("tug_id", ""), params.get("date", "")
    if not TUG_ID_RE.match(tug_id):
        return error(400, "invalid tug_id")
    if not DATE_RE.match(date):
        return error(400, "date must be YYYY-MM-DD")
    key = f"tugdays/{tug_id}/{date}.json"
    try:
        clients.s3().head_object(Bucket=cfg.history_bucket, Key=key)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return error(404, f"no tug day for {tug_id} on {date}")
        raise
    return redirect(f"https://{cfg.cdn_domain}/{key}")


def _load_summary(cfg: Settings) -> dict[str, Any]:
    now = time.monotonic()
    if _summary_cache["data"] is None or now >= _summary_cache["expires"]:
        obj = clients.s3().get_object(Bucket=cfg.history_bucket, Key=SUMMARY_KEY)
        _summary_cache["data"] = json.loads(obj["Body"].read())
        _summary_cache["expires"] = now + SUMMARY_CACHE_S
    return _summary_cache["data"]


def _summary(cfg: Settings, query: dict[str, str]) -> dict[str, Any]:
    try:
        summary = _load_summary(cfg)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return error(404, "summary.json has not been published yet")
        raise
    raw = query.get("battery_kwh")
    if raw is None:
        return json_response(200, summary, {"cache-control": "public, max-age=60"})
    try:
        requested = float(raw)
    except ValueError:
        return error(400, "battery_kwh must be a number")
    sweep = summary.get("sweep") or []
    if not sweep:
        return error(404, "summary has no sweep rows")
    row = min(sweep, key=lambda r: abs(float(r["battery_kwh"]) - requested))
    body = {
        "dataset": summary.get("dataset"),
        "default_battery_kwh": summary.get("default_battery_kwh"),
        "requested_battery_kwh": requested,
        "battery_kwh": row["battery_kwh"],
        "row": row,
        "assumptions": summary.get("assumptions", []),
    }
    return json_response(200, body, {"cache-control": "public, max-age=60"})


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    cfg = settings()
    route = event.get("routeKey") or f"{event.get('requestContext', {}).get('http', {}).get('method', 'GET')} {event.get('rawPath', '')}"
    params = event.get("pathParameters") or {}
    query = event.get("queryStringParameters") or {}
    try:
        if route == "GET /fleet":
            return _fleet(cfg)
        if route == "GET /tugs/{tug_id}/days/{date}":
            return _tug_day(cfg, params)
        if route == "GET /summary":
            return _summary(cfg, query)
        return error(404, f"no route {route}")
    except ClientError:
        log.exception("AWS call failed")
        return error(502, "upstream error")
