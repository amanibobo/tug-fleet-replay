"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MlMap, type Marker, type GeoJSONSource } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { ACTIVITY_HEX } from "@/lib/format";
import type { LngLat, Telemetry } from "@/lib/types";
import { prefersReducedMotion } from "@/lib/useAnimatedNumber";
import styles from "./FleetMap.module.css";

/** CARTO Positron, no key, not tinted. */
export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const CENTER: LngLat = [-118.232, 33.738];

interface Props {
  tugs: Telemetry[];
  trails: Record<string, LngLat[]>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface MarkerEntry {
  marker: Marker;
  el: HTMLDivElement;
  square: HTMLDivElement;
  fill: HTMLDivElement;
  label: HTMLDivElement;
  angle: number;
}

function buildMarker(tug: Telemetry, onSelect: (id: string) => void): MarkerEntry {
  const el = document.createElement("div");
  el.className = styles.marker;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", tug.name);
  el.tabIndex = 0;

  const square = document.createElement("div");
  square.className = styles.square;
  const bar = document.createElement("div");
  bar.className = styles.bar;
  const fill = document.createElement("div");
  fill.className = styles.fill;
  bar.appendChild(fill);
  const label = document.createElement("div");
  label.className = styles.label;
  label.textContent = tug.name;

  el.append(square, bar, label);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(tug.tug_id);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(tug.tug_id);
    }
  });

  const marker = new maplibregl.Marker({ element: el, anchor: "center" });
  return { marker, el, square, fill, label, angle: tug.heading };
}

/** Shortest-path unwrap so the marker never spins the long way round. */
function unwrap(prev: number, next: number): number {
  let d = ((next - prev) % 360 + 540) % 360 - 180;
  if (Math.abs(d) < 0.01) d = 0;
  return prev + d;
}

export default function FleetMap({ tugs, trails, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const markers = useRef(new Map<string, MarkerEntry>());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: CENTER,
      zoom: 12.4,
      minZoom: 9,
      maxZoom: 16,
      attributionControl: { compact: true },
      fadeDuration: 300,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("trails", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "trails",
        type: "line",
        source: "trails",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": 0.7,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 2.5],
        },
      });
      ready.current = true;
    });
    map.on("click", () => onSelectRef.current(null));

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    const store = markers.current;

    return () => {
      ro.disconnect();
      store.forEach((m) => m.marker.remove());
      store.clear();
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
  }, []);

  // Sync markers and trails every frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const tug of tugs) {
      seen.add(tug.tug_id);
      let entry = markers.current.get(tug.tug_id);
      if (!entry) {
        entry = buildMarker(tug, (id) => onSelectRef.current(id));
        entry.marker.setLngLat([tug.lon, tug.lat]).addTo(map);
        markers.current.set(tug.tug_id, entry);
      }
      entry.marker.setLngLat([tug.lon, tug.lat]);
      if (entry.el.dataset.activity !== tug.activity) entry.el.dataset.activity = tug.activity;
      const selected = tug.tug_id === selectedId;
      if ((entry.el.dataset.selected === "true") !== selected) {
        entry.el.dataset.selected = selected ? "true" : "false";
      }
      entry.angle = unwrap(entry.angle, tug.heading);
      // The square sits at 45deg so a heading of 0 reads as a diamond pointing north.
      entry.square.style.transform = `rotate(${entry.angle + 45}deg)`;
      entry.fill.style.width = `${Math.round(tug.soc * 100)}%`;
      entry.fill.dataset.level = tug.soc < 0.15 ? "bad" : tug.soc < 0.35 ? "warn" : "ok";
      if (entry.label.textContent !== tug.name) entry.label.textContent = tug.name;
    }
    for (const [id, entry] of markers.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    }

    if (ready.current) {
      const src = map.getSource<GeoJSONSource>("trails");
      if (src) {
        const features: Feature<LineString>[] = [];
        for (const tug of tugs) {
          const pts = trails[tug.tug_id];
          if (!pts || pts.length < 2) continue;
          features.push({
            type: "Feature",
            properties: { color: ACTIVITY_HEX[tug.activity], id: tug.tug_id },
            geometry: { type: "LineString", coordinates: pts },
          });
        }
        const fc: FeatureCollection<LineString> = { type: "FeatureCollection", features };
        src.setData(fc);
      }
    }
  }, [tugs, trails, selectedId]);

  // Ease to the selected tug.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const tug = tugs.find((t) => t.tug_id === selectedId);
    if (!tug) return;
    const target = { center: [tug.lon, tug.lat] as LngLat, zoom: Math.max(map.getZoom(), 13) };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.easeTo({ ...target, duration: 900, easing: (t) => 1 - Math.pow(1 - t, 3) });
    // Only when the selection changes, not on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={container} className={styles.map} aria-label="Map of San Pedro Bay" />;
}
