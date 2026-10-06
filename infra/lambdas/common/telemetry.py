"""Validation of the telemetry message (contract section 1) as delivered by the IoT rule."""

from __future__ import annotations

from typing import Any

TOPIC_FIELD = "_topic_tug_id"  # injected by the IoT rule SQL: topic(2) AS _topic_tug_id
REQUIRED = ("t",)
NUMERIC = ("lat", "lon", "sog", "cog", "heading", "power_kw", "soc", "generator_kw", "battery_kwh")


class InvalidTelemetry(ValueError):
    pass


def normalize(event: Any) -> dict[str, Any]:
    """Return a clean telemetry dict or raise InvalidTelemetry.

    - tug_id falls back to the topic segment when absent; a mismatch is rejected.
    - the rule-injected topic field is stripped before storage.
    """
    if not isinstance(event, dict):
        raise InvalidTelemetry("payload is not a JSON object")
    msg = dict(event)
    topic_id = msg.pop(TOPIC_FIELD, None)
    tug_id = msg.get("tug_id", topic_id)
    if tug_id is None or str(tug_id).strip() == "":
        raise InvalidTelemetry("tug_id missing")
    tug_id = str(tug_id)
    if topic_id is not None and str(topic_id) != tug_id:
        raise InvalidTelemetry(f"tug_id {tug_id!r} does not match topic {topic_id!r}")
    msg["tug_id"] = tug_id
    for field in REQUIRED:
        if not isinstance(msg.get(field), str) or not msg[field]:
            raise InvalidTelemetry(f"{field} missing or not a string")
    for field in NUMERIC:
        value = msg.get(field)
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))):
            raise InvalidTelemetry(f"{field} must be a number")
    return msg
