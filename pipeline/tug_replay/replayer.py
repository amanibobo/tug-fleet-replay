"""Replay fleet.json on a sped-up clock and hand each tick to a publisher.

The replayer is the only component that knows the data is historical. Everything downstream
(IoT Core, Lambda, the dashboard) sees the same message shape a live boat would send, so a
real telemetry source replaces this file and nothing else.
"""
from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Protocol


def _parse(ts: str) -> datetime:
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass
class Fleet:
    t0: datetime
    step_s: int
    n: int
    battery_kwh: float
    speedup: int
    dataset: dict
    tugs: list[dict]

    @classmethod
    def load(cls, path: Path) -> Fleet:
        d = json.loads(Path(path).read_text())
        return cls(_parse(d["t0"]), d["step_s"], d["n"], d["battery_kwh"], d.get("speedup", 120), d["dataset"], d["tugs"])

    def clock_at(self, i: int) -> datetime:
        return self.t0 + timedelta(seconds=i * self.step_s)

    def telemetry(self, tug: dict, i: int) -> dict:
        """Contract section 1 for sample i of one tug."""
        jid = None
        return {
            "tug_id": tug["tug_id"], "name": tug["name"], "t": _iso(self.clock_at(i)),
            "lat": tug["lat"][i], "lon": tug["lon"][i], "sog": tug["sog"][i],
            "cog": None, "heading": tug["heading"][i],
            "activity": tug["activity"][i], "power_kw": tug["power_kw"][i], "soc": tug["soc"][i],
            "generator_on": tug["generator_on"][i], "generator_kw": 0, "battery_kwh": self.battery_kwh,
            "job_id": jid, "has_fix": tug["has_fix"][i],
        }

    def snapshot(self, i: int) -> dict:
        return {"clock": _iso(self.clock_at(i)), "speedup": self.speedup, "index": i, "n": self.n,
                "tugs": [self.telemetry(t, i) for t in self.tugs], "dataset": self.dataset}


class Publisher(Protocol):
    async def publish(self, clock: datetime, rows: list[dict]) -> None: ...
    async def close(self) -> None: ...


@dataclass
class Replayer:
    fleet: Fleet
    speedup: float = 120.0
    start_index: int = 0
    loop: bool = True
    index: int = field(init=False)

    def __post_init__(self) -> None:
        self.index = self.start_index % self.fleet.n

    def ticks(self) -> Iterator[tuple[datetime, list[dict]]]:
        """Yield (clock, rows) per sample, forever when loop is set."""
        while True:
            while self.index < self.fleet.n:
                i = self.index
                yield self.fleet.clock_at(i), [self.fleet.telemetry(t, i) for t in self.fleet.tugs]
                self.index += 1
            if not self.loop:
                return
            self.index = 0

    async def run(self, publisher: Publisher, max_ticks: int | None = None) -> int:
        """Publish one sample every step_s / speedup seconds of wall time."""
        period = self.fleet.step_s / self.speedup
        sent = 0
        next_at = time.monotonic()
        for clock, rows in self.ticks():
            await publisher.publish(clock, rows)
            sent += 1
            if max_ticks is not None and sent >= max_ticks:
                break
            next_at += period
            delay = next_at - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            else:
                next_at = time.monotonic()
        await publisher.close()
        return sent


class PrintPublisher:
    async def publish(self, clock: datetime, rows: list[dict]) -> None:
        moving = sum(1 for r in rows if r["sog"] and r["sog"] > 0.5)
        gens = sum(1 for r in rows if r["generator_on"])
        print(f"{_iso(clock)}  {len(rows)} tugs  {moving} moving  {gens} on generator", flush=True)

    async def close(self) -> None:
        return None


class IoTPublisher:
    """Publishes each row to AWS IoT Core on tugs/{tug_id}/telemetry over MQTT with a device cert."""

    def __init__(self, endpoint: str, cert: str, key: str, ca: str, client_id: str = "tug-replayer") -> None:
        from awscrt import mqtt
        from awsiot import mqtt_connection_builder

        self.mqtt = mqtt
        self.conn = mqtt_connection_builder.mtls_from_path(
            endpoint=endpoint, cert_filepath=cert, pri_key_filepath=key, ca_filepath=ca,
            client_id=client_id, clean_session=False, keep_alive_secs=30)
        self.conn.connect().result()

    async def publish(self, clock: datetime, rows: list[dict]) -> None:
        for r in rows:
            self.conn.publish(topic=f"tugs/{r['tug_id']}/telemetry", payload=json.dumps(r),
                              qos=self.mqtt.QoS.AT_LEAST_ONCE)

    async def close(self) -> None:
        self.conn.disconnect().result()


class RerunPublisher:
    """Streams the live fleet to a Rerun viewer while developing (`rerun` must be installed)."""

    def __init__(self, spawn: bool = True) -> None:
        import rerun as rr
        import rerun.blueprint as rrb

        self.rr = rr
        rr.init("tug-replay-live", spawn=spawn, default_blueprint=rrb.Blueprint(
            rrb.MapView(origin="/fleet", zoom=12.5, background=rrb.MapProvider.OpenStreetMap),
            rrb.TimePanel(state="collapsed")))
        self.colors = {"idle": (107, 114, 128), "assist": (255, 97, 35), "transit": (51, 145, 255), "charging": (52, 211, 153)}

    async def publish(self, clock: datetime, rows: list[dict]) -> None:
        rr = self.rr
        rr.set_time("replay", timestamp=clock)
        pts = [(r["lat"], r["lon"]) for r in rows]
        cols = [self.colors[r["activity"]] for r in rows]
        rr.log("/fleet/tugs", rr.GeoPoints(lat_lon=pts, colors=cols, radii=rr.Radius.ui_points(6)))
        for r in rows:
            rr.log(f"/soc/{r['tug_id']}", rr.Scalars(r["soc"]))

    async def close(self) -> None:
        return None
