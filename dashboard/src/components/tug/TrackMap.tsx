"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type Map as MlMap, type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { MAP_STYLE, dimLabels } from "@/components/fleet/FleetMap";
import { ACTIVITY_HEX } from "@/lib/format";
import type { Activity, TugDay } from "@/lib/types";
import styles from "./TrackMap.module.css";

interface Props {
  day: TugDay | null;
  /** Minutes from midnight UTC, or null. */
  cursor: number | null;
}

function buildTrack(day: TugDay): FeatureCollection<LineString> {
  const { lat, lon, activity } = day.samples;
  const features: Feature<LineString>[] = [];
  let coords: [number, number][] = [];
  let current: Activity | null = null;
  const flush = () => {
    if (current && coords.length > 1) {
      features.push({
        type: "Feature",
        properties: { color: ACTIVITY_HEX[current], activity: current },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  };
  for (let i = 0; i < activity.length; i++) {
    const la = lat[i];
    const lo = lon[i];
    if (la == null || lo == null) continue;
    if (activity[i] !== current) {
      flush();
      // Start the next segment where the last one ended so there are no gaps.
      const last = coords.length ? coords[coords.length - 1] : null;
      coords = last ? [last] : [];
      current = activity[i];
    }
    coords.push([lo, la]);
  }
  flush();
  return { type: "FeatureCollection", features };
}

function boundsOf(day: TugDay): LngLatBoundsLike | null {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (let i = 0; i < day.samples.lat.length; i++) {
    const la = day.samples.lat[i];
    const lo = day.samples.lon[i];
    if (la == null || lo == null) continue;
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la);
    minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo);
  }
  if (!Number.isFinite(minLat)) return null;
  return [[minLon, minLat], [maxLon, maxLat]];
}

export default function TrackMap({ day, cursor }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const loaded = useRef(false);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: [-118.235, 33.74],
      zoom: 11.6,
      attributionControl: { compact: true },
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.on("load", () => {
      dimLabels(map);
      map.addSource("track", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "track",
        type: "line",
        source: "track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.9 },
      });
      map.addSource("cursor", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cursor",
        type: "circle",
        source: "cursor",
        paint: { "circle-radius": 4.5, "circle-color": "#f2f2f2", "circle-stroke-color": "#0a0a0a", "circle-stroke-width": 2 },
      });
      loaded.current = true;
      pending.current?.();
      pending.current = null;
    });
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      loaded.current = false;
    };
  }, []);

  const track = useMemo(() => (day ? buildTrack(day) : null), [day]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !day || !track) return;
    const apply = () => {
      map.getSource<GeoJSONSource>("track")?.setData(track);
      const b = boundsOf(day);
      if (b) map.fitBounds(b, { padding: 36, duration: 700, maxZoom: 14 });
    };
    if (loaded.current) apply();
    else pending.current = apply;
  }, [day, track]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    const src = map.getSource<GeoJSONSource>("cursor");
    if (!src) return;
    if (!day || cursor == null) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const dayStart = Date.parse(`${day.date}T00:00:00Z`);
    // Nearest sample with a fix.
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < day.samples.t.length; i++) {
      if (day.samples.lat[i] == null || day.samples.lon[i] == null) continue;
      const d = Math.abs((Date.parse(day.samples.t[i]) - dayStart) / 60_000 - cursor);
      if (d < bestD) { bestD = d; best = i; }
      if (d > bestD) break;
    }
    if (best < 0) return;
    const f: Feature<Point> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [day.samples.lon[best] as number, day.samples.lat[best] as number] },
    };
    src.setData({ type: "FeatureCollection", features: [f] });
  }, [day, cursor]);

  return <div ref={container} className={styles.map} aria-label="Track for the day" />;
}
