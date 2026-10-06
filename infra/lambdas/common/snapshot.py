"""Fleet snapshot (contract section 2), shared by GET /fleet and the WebSocket snapshot push."""

from __future__ import annotations

from typing import Any

from common.config import Settings


def build_snapshot(tugs: list[dict[str, Any]], settings: Settings) -> dict[str, Any]:
    tugs = sorted(tugs, key=lambda m: str(m.get("tug_id", "")))
    clocks = [str(m["t"]) for m in tugs if m.get("t")]
    return {
        "clock": max(clocks) if clocks else None,
        "speedup": settings.speedup,
        "tugs": tugs,
        "dataset": settings.dataset,
    }
