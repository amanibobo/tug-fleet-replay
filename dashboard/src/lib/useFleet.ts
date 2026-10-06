"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DATA_MODE, WS_URL, dataUrl, type DataMode } from "./env";
import { fetchJson, type LoadStatus } from "./fetchJson";
import { DAY_MS, clamp, isoDate } from "./format";
import type { DatasetInfo, FleetFile, FleetSnapshot, FleetTrack, LngLat, Telemetry, WsMessage } from "./types";

export const SPEEDS = [60, 120, 300] as const;
const TRAIL_MIN = 30;
/** fleet.json has no generator_kw column; config.yaml's generator_power_kw estimate stands in. */
const GENERATOR_KW_ESTIMATE = 600;

export interface FleetState {
  /** Replay clock, ms since epoch, or null before data arrives. */
  clock: number | null;
  tugs: Telemetry[];
  /** Last 30 minutes of positions per tug_id, oldest first, current position last. */
  trails: Record<string, LngLat[]>;
  playing: boolean;
  speed: number;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  /** Seek to an absolute ms timestamp. */
  seek: (ms: number) => void;
  dataset: DatasetInfo | null;
  /** Replay range in ms (start inclusive, end exclusive). */
  range: { start: number; end: number } | null;
  status: LoadStatus;
  error: string | null;
  fixture: boolean;
  mode: DataMode;
  /** False when a server drives the clock (ws mode). */
  controllable: boolean;
}

interface Frame {
  clock: number;
  tugs: Telemetry[];
  trails: Record<string, LngLat[]>;
}

const EMPTY_FRAME: Frame = { clock: 0, tugs: [], trails: {} };

// ---------------------------------------------------------------------------
// Static mode: client-side replay of /data/fleet.json
// ---------------------------------------------------------------------------

function bearing(a: LngLat, b: LngLat): number {
  const toRad = Math.PI / 180;
  const [lon1, lat1] = [a[0] * toRad, a[1] * toRad];
  const [lon2, lat2] = [b[0] * toRad, b[1] * toRad];
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function fixAt(track: FleetTrack, i: number): LngLat | null {
  const lat = track.lat[i];
  const lon = track.lon[i];
  if (lat == null || lon == null) return null;
  return [lon, lat];
}

/** Nearest non-null fix at or around index i, searching up to `reach` samples away. */
function nearestFix(track: FleetTrack, i: number, reach = 10): { fix: LngLat; index: number } | null {
  for (let d = 0; d <= reach; d++) {
    const a = fixAt(track, i + d);
    if (a) return { fix: a, index: i + d };
    const b = fixAt(track, i - d);
    if (b && i - d >= 0) return { fix: b, index: i - d };
  }
  return null;
}

function sampleTrack(
  track: FleetTrack,
  pos: number,
  file: FleetFile,
  clockMs: number,
  lastHeading: Map<string, number>,
): { tug: Telemetry; trail: LngLat[] } | null {
  const n = track.activity.length;
  const i0 = clamp(Math.floor(pos), 0, n - 1);
  const i1 = Math.min(i0 + 1, n - 1);
  const frac = clamp(pos - i0, 0, 1);

  const a = fixAt(track, i0);
  const b = fixAt(track, i1);
  let lngLat: LngLat;
  if (a && b) lngLat = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
  else {
    const near = nearestFix(track, i0);
    if (!near) return null;
    lngLat = near.fix;
  }

  const sog0 = track.sog[i0] ?? track.sog[i1] ?? 0;
  const sog1 = track.sog[i1] ?? sog0;
  const sog = sog0 + (sog1 - sog0) * frac;

  // Heading from the direction of travel; hold the last value when the tug is stopped.
  let heading = lastHeading.get(track.tug_id) ?? 0;
  if (sog > 0.4) {
    const next = nearestFix(track, i1, 3);
    const prev = fixAt(track, i0) ?? nearestFix(track, i0, 3)?.fix;
    if (next && prev && (next.fix[0] !== prev[0] || next.fix[1] !== prev[1])) {
      heading = bearing(prev, next.fix);
      lastHeading.set(track.tug_id, heading);
    }
  }

  const soc0 = track.soc[i0];
  const soc1 = track.soc[i1];
  const soc = soc0 + (soc1 - soc0) * frac;
  const generatorOn = track.generator_on[i0];

  const trail: LngLat[] = [];
  for (let i = Math.max(0, i0 - TRAIL_MIN); i <= i0; i++) {
    const f = fixAt(track, i);
    if (f) trail.push(f);
  }
  trail.push(lngLat);

  const tug: Telemetry = {
    tug_id: track.tug_id,
    name: track.name,
    t: new Date(clockMs).toISOString(),
    lat: lngLat[1],
    lon: lngLat[0],
    sog,
    cog: heading,
    heading: Math.round(heading),
    activity: track.activity[i0],
    power_kw: track.power_kw[i0],
    soc,
    generator_on: generatorOn,
    generator_kw: generatorOn ? GENERATOR_KW_ESTIMATE : 0,
    battery_kwh: file.battery_kwh,
    job_id: null,
  };
  return { tug, trail };
}

function useStaticFleet(): FleetState {
  const [file, setFile] = useState<FleetFile | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(120);
  const [frame, setFrame] = useState<Frame>(EMPTY_FRAME);

  const clockRef = useRef<number>(0);
  const lastHeading = useRef(new Map<string, number>());

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<FleetFile & { speedup?: number }>(dataUrl.fleet(), ctrl.signal)
      .then((f) => {
        setFile(f);
        if (typeof f.speedup === "number" && f.speedup > 0) setSpeed(f.speedup);
        clockRef.current = Date.parse(f.t0);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => ctrl.abort();
  }, []);

  const range = useMemo(() => {
    if (!file) return null;
    const start = Date.parse(file.t0);
    const n = file.tugs.reduce((m, t) => Math.max(m, t.activity.length), 0);
    return { start, end: start + n * file.step_s * 1000 };
  }, [file]);

  const dataset = useMemo<DatasetInfo | null>(() => {
    if (!range) return null;
    return { start: isoDate(range.start), end: isoDate(range.end - 1), source: "NOAA AIS" };
  }, [range]);

  const compute = useCallback(
    (clockMs: number): Frame => {
      if (!file || !range) return EMPTY_FRAME;
      const pos = (clockMs - range.start) / (file.step_s * 1000);
      const tugs: Telemetry[] = [];
      const trails: Record<string, LngLat[]> = {};
      for (const track of file.tugs) {
        const s = sampleTrack(track, pos, file, clockMs, lastHeading.current);
        if (!s) continue;
        tugs.push(s.tug);
        trails[track.tug_id] = s.trail;
      }
      return { clock: clockMs, tugs, trails };
    },
    [file, range],
  );

  // Replay loop.
  useEffect(() => {
    if (!file || !range) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        let c = clockRef.current + dt * speed * 1000;
        if (c >= range.end) c = range.start;
        clockRef.current = c;
      }
      setFrame(compute(clockRef.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [file, range, playing, speed, compute]);

  const seek = useCallback(
    (ms: number) => {
      if (!range) return;
      clockRef.current = clamp(ms, range.start, range.end - 1);
      setFrame(compute(clockRef.current));
    },
    [range, compute],
  );

  return {
    clock: frame.clock > 0 ? frame.clock : null,
    tugs: frame.tugs,
    trails: frame.trails,
    playing,
    speed,
    setPlaying,
    setSpeed,
    seek,
    dataset,
    range,
    status,
    error,
    fixture: file?.fixture === true,
    mode: "static",
    controllable: true,
  };
}

// ---------------------------------------------------------------------------
// WS mode: a server streams telemetry
// ---------------------------------------------------------------------------

function useWsFleet(): FleetState {
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null);
  const [tugs, setTugs] = useState<Telemetry[]>([]);
  const [clock, setClock] = useState<number | null>(null);
  const [trails, setTrails] = useState<Record<string, LngLat[]>>({});
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const trailTimes = useRef(new Map<string, number[]>());

  const applyTelemetry = useCallback((rows: Telemetry[], replace: boolean) => {
    setTugs((prev) => {
      const map = new Map(replace ? [] : prev.map((t) => [t.tug_id, t] as const));
      for (const r of rows) map.set(r.tug_id, r);
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
    setClock((prev) => {
      let c = replace ? 0 : (prev ?? 0);
      for (const r of rows) c = Math.max(c, Date.parse(r.t));
      return c || prev;
    });
    setTrails((prev) => {
      const next: Record<string, LngLat[]> = replace ? {} : { ...prev };
      for (const r of rows) {
        const ts = Date.parse(r.t);
        const pts = [...(next[r.tug_id] ?? []), [r.lon, r.lat] as LngLat];
        const times = [...(trailTimes.current.get(r.tug_id) ?? []), ts];
        const cutoff = ts - TRAIL_MIN * 60_000;
        let drop = 0;
        while (drop < times.length && times[drop] < cutoff) drop++;
        next[r.tug_id] = pts.slice(drop);
        trailTimes.current.set(r.tug_id, times.slice(drop));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<FleetSnapshot>(dataUrl.fleet(), ctrl.signal)
      .then((s) => {
        setSnapshot(s);
        applyTelemetry(s.tugs, true);
        setClock(Date.parse(s.clock));
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => ctrl.abort();
  }, [applyTelemetry]);

  useEffect(() => {
    if (!WS_URL) return;
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        retry = 0;
      };
      ws.onmessage = (ev: MessageEvent<string>) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(ev.data) as WsMessage;
        } catch {
          return;
        }
        if (msg.type === "snapshot") {
          setSnapshot(msg.data);
          applyTelemetry(msg.data.tugs, true);
          setClock(Date.parse(msg.data.clock));
          setStatus("ready");
        } else if (msg.type === "telemetry") {
          applyTelemetry([msg.data], false);
        }
      };
      ws.onclose = () => {
        if (closed) return;
        retry += 1;
        timer = setTimeout(connect, Math.min(10_000, 500 * 2 ** retry));
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [applyTelemetry]);

  const range = useMemo(() => {
    if (!snapshot) return null;
    const start = Date.parse(`${snapshot.dataset.start}T00:00:00Z`);
    const end = Date.parse(`${snapshot.dataset.end}T00:00:00Z`) + DAY_MS;
    return { start, end };
  }, [snapshot]);

  const noop = useCallback(() => undefined, []);

  return {
    clock,
    tugs,
    trails,
    playing: true,
    speed: snapshot?.speedup ?? 120,
    setPlaying: noop,
    setSpeed: noop,
    seek: noop,
    dataset: snapshot?.dataset ?? null,
    range,
    status,
    error,
    fixture: snapshot?.fixture === true,
    mode: "ws",
    controllable: false,
  };
}

/** Fleet replay state. The mode is fixed at build time, so the hook order never changes. */
export const useFleet: () => FleetState = DATA_MODE === "ws" ? useWsFleet : useStaticFleet;
