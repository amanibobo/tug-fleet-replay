"""Local stand-in for the AWS backend: a WebSocket broadcaster plus a tiny JSON API.

Run `tug serve`, then start the dashboard with NEXT_PUBLIC_DATA_MODE=ws,
NEXT_PUBLIC_WS_URL=ws://localhost:8765 and NEXT_PUBLIC_API_URL=http://localhost:8766.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import websockets

from .replayer import Fleet, Replayer


class WsPublisher:
    def __init__(self, fleet: Fleet) -> None:
        self.fleet = fleet
        self.clients: set = set()
        self.latest: dict | None = fleet.snapshot(0)

    async def handler(self, ws) -> None:
        self.clients.add(ws)
        try:
            if self.latest:
                await ws.send(json.dumps({"type": "snapshot", "data": self.latest}))
            async for _ in ws:
                pass
        finally:
            self.clients.discard(ws)

    async def publish(self, clock: datetime, rows: list[dict]) -> None:
        idx = int((clock - self.fleet.t0).total_seconds() // self.fleet.step_s)
        self.latest = self.fleet.snapshot(idx)
        if not self.clients:
            return
        msgs = [json.dumps({"type": "telemetry", "data": r}) for r in rows]
        dead = []
        for ws in list(self.clients):
            try:
                for m in msgs:
                    await ws.send(m)
            except (websockets.ConnectionClosed, OSError):
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)

    async def close(self) -> None:
        for ws in list(self.clients):
            await ws.close()


class ApiHandler(SimpleHTTPRequestHandler):
    publisher: WsPublisher
    site_dir: Path

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Range")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, status=200) -> None:
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = self.path.split("?")[0].rstrip("/")
        if path == "/fleet":
            return self._json(self.publisher.latest or {"clock": None, "tugs": []})
        if path == "/summary":
            return self._json(json.loads((self.site_dir / "summary.json").read_text()))
        parts = path.strip("/").split("/")
        if len(parts) == 4 and parts[0] == "tugs" and parts[2] == "days":
            f = self.site_dir / "tugdays" / parts[1] / f"{parts[3]}.json"
            if f.exists():
                return self._json(json.loads(f.read_text()))
            return self._json({"error": "not found"}, 404)
        return super().do_GET()

    def log_message(self, *a) -> None:
        return None


async def serve(site_dir: Path, ws_port: int = 8765, http_port: int = 8766, speedup: float | None = None,
                start_index: int = 0) -> None:
    fleet = Fleet.load(site_dir / "fleet.json")
    pub = WsPublisher(fleet)
    pub.latest = fleet.snapshot(start_index % fleet.n)
    ApiHandler.publisher = pub
    ApiHandler.site_dir = site_dir
    httpd = ThreadingHTTPServer(("0.0.0.0", http_port), lambda *a, **k: ApiHandler(*a, directory=str(site_dir), **k))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    rep = Replayer(fleet, speedup=speedup or fleet.speedup, start_index=start_index)
    print(f"ws://localhost:{ws_port}  http://localhost:{http_port}  {len(fleet.tugs)} tugs  {rep.speedup:.0f}x", flush=True)
    async with websockets.serve(pub.handler, "0.0.0.0", ws_port):
        await rep.run(pub)
