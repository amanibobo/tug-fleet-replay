"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MlMap, type Marker, type GeoJSONSource } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { tugMarkup } from "@/components/TugIcon";
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
  /** The boat model, aligned to the map so it turns with it. */
  boat: Marker;
  boatEl: HTMLDivElement;
  /** Battery pill and name label, aligned to the viewport so they stay readable. */
  tag: Marker;
  tagEl: HTMLDivElement;
  fill: HTMLDivElement;
  label: HTMLDivElement;
  angle: number;
  prev: LngLat;
}

function bearing(a: LngLat, b: LngLat): number {
  const toRad = Math.PI / 180;
  const [lon1, lat1] = [a[0] * toRad, a[1] * toRad];
  const [lon2, lat2] = [b[0] * toRad, b[1] * toRad];
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Heading, else course, else the bearing between consecutive fixes. */
function headingOf(tug: Telemetry, prev: LngLat, fallback: number): number {
  if (Number.isFinite(tug.heading)) return tug.heading;
  if (Number.isFinite(tug.cog)) return tug.cog;
  if (prev[0] !== tug.lon || prev[1] !== tug.lat) return bearing(prev, [tug.lon, tug.lat]);
  return fallback;
}

function buildMarker(tug: Telemetry, onSelect: (id: string) => void): MarkerEntry {
  const select = (e: Event) => {
    e.stopPropagation();
    onSelect(tug.tug_id);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(tug.tug_id);
    }
  };

  const boatEl = document.createElement("div");
  boatEl.className = styles.boat;
  boatEl.setAttribute("role", "button");
  boatEl.setAttribute("aria-label", tug.name);
  boatEl.tabIndex = 0;
  boatEl.innerHTML = `<span class="${styles.ring}"></span>${tugMarkup()}`;
  boatEl.addEventListener("click", select);
  boatEl.addEventListener("keydown", key);

  const tagEl = document.createElement("div");
  tagEl.className = styles.tag;
  const bar = document.createElement("div");
  bar.className = styles.bar;
  const fill = document.createElement("div");
  fill.className = styles.fill;
  bar.appendChild(fill);
  const label = document.createElement("div");
  label.className = styles.label;
  label.textContent = tug.name;
  tagEl.append(bar, label);
  tagEl.addEventListener("click", select);

  // Hovering the boat shows the label that lives on the tag marker.
  boatEl.addEventListener("mouseenter", () => tagEl.setAttribute("data-hover", "true"));
  boatEl.addEventListener("mouseleave", () => tagEl.removeAttribute("data-hover"));

  const boat = new maplibregl.Marker({ element: boatEl, anchor: "center", rotationAlignment: "map", pitchAlignment: "map" });
  const tag = new maplibregl.Marker({ element: tagEl, anchor: "center" });
  const pos: LngLat = [tug.lon, tug.lat];
  return { boat, boatEl, tag, tagEl, fill, label, angle: headingOf(tug, pos, 0), prev: pos };
}

/** Shortest-path unwrap so the model never spins the long way round. */
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
          "line-opacity": 0.8,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 14, 3],
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
      store.forEach((m) => {
        m.boat.remove();
        m.tag.remove();
      });
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
      const pos: LngLat = [tug.lon, tug.lat];
      if (!entry) {
        entry = buildMarker(tug, (id) => onSelectRef.current(id));
        entry.boat.setLngLat(pos).addTo(map);
        entry.tag.setLngLat(pos).addTo(map);
        markers.current.set(tug.tug_id, entry);
      }
      entry.boat.setLngLat(pos);
      entry.tag.setLngLat(pos);
      const activity = tug.generator_on ? "generator" : tug.activity;
      if (entry.boatEl.dataset.activity !== activity) entry.boatEl.dataset.activity = activity;
      const selected = tug.tug_id === selectedId;
      if ((entry.boatEl.dataset.selected === "true") !== selected) {
        entry.boatEl.dataset.selected = selected ? "true" : "false";
        entry.tagEl.dataset.selected = selected ? "true" : "false";
      }
      entry.angle = unwrap(entry.angle, headingOf(tug, entry.prev, entry.angle));
      entry.prev = pos;
      // The silhouette points east at rest, so north is a quarter turn back.
      entry.boat.setRotation(entry.angle - 90);
      entry.fill.style.width = `${Math.round(tug.soc * 100)}%`;
      entry.fill.dataset.level = tug.soc < 0.15 ? "bad" : tug.soc < 0.35 ? "warn" : "ok";
      if (entry.label.textContent !== tug.name) entry.label.textContent = tug.name;
    }
    for (const [id, entry] of markers.current) {
      if (!seen.has(id)) {
        entry.boat.remove();
        entry.tag.remove();
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
            properties: { color: tug.generator_on ? "#ef4444" : ACTIVITY_HEX[tug.activity], id: tug.tug_id },
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
