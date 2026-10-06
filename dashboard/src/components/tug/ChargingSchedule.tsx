"use client";

import { useEffect, useRef, useState } from "react";
import Tile from "@/components/Tile";
import Stat from "@/components/Stat";
import { clamp, fmtInt, fmtUsd } from "@/lib/format";
import type { Tariff, TariffTier, TugDay } from "@/lib/types";
import styles from "./ChargingSchedule.module.css";

const PAD_L = 80;
const PAD_R = 8;
const PRICE_H = 18;
const ROW_H = 28;
const ROW_GAP = 10;
const AXIS_GAP = 8;
const AXIS_H = 24;
const HEIGHT = PRICE_H + ROW_H + ROW_GAP + ROW_H + AXIS_GAP + AXIS_H;
const MIN_PER_DAY = 1440;

/** Band tint per tariff tier: off-peak none, mid-peak 4% fg, on-peak 8% fg. */
const TIER_FILL: Record<TariffTier, string | null> = {
  off_peak: null,
  mid_peak: "color-mix(in srgb, var(--d-fg) 4%, transparent)",
  on_peak: "color-mix(in srgb, var(--d-fg) 8%, transparent)",
};

interface Bar {
  /** Minutes from midnight UTC. */
  a: number;
  b: number;
  /** Charger power as a share of `tariff.charger_kw`, 0..1. */
  level: number;
}

function minuteOf(iso: string, dayStart: number): number {
  return clamp((Date.parse(iso) - dayStart) / 60_000, 0, MIN_PER_DAY);
}

/** Charging at full charger power from each stop's start until its energy is delivered. */
function arrivalBars(day: TugDay, tariff: Tariff, dayStart: number): Bar[] {
  const bars: Bar[] = [];
  for (const stop of day.charging) {
    const a = minuteOf(stop.start, dayStart);
    const len = minuteOf(stop.end, dayStart) - a;
    const minutes = tariff.charger_kw > 0 ? Math.min(len, (stop.kwh / tariff.charger_kw) * 60) : len;
    if (minutes > 0) bars.push({ a, b: a + minutes, level: 1 });
  }
  return bars;
}

function scheduledBars(day: TugDay, tariff: Tariff, dayStart: number): Bar[] {
  const bars: Bar[] = [];
  for (const stop of day.charging) {
    for (const w of stop.scheduled_windows) {
      const a = minuteOf(w.start, dayStart);
      const b = minuteOf(w.end, dayStart);
      if (b > a) bars.push({ a, b, level: tariff.charger_kw > 0 ? clamp(w.kw / tariff.charger_kw, 0, 1) : 1 });
    }
  }
  return bars;
}

interface Props {
  day: TugDay | null;
}

/** 24h strip of tariff bands with the arrival and scheduled charging profiles. Hidden without a tariff. */
export default function ChargingSchedule({ day }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [day]);

  const tariff = day?.tariff;
  if (!day || !tariff) return null;

  const dayStart = Date.parse(`${day.date}T00:00:00Z`);
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const x = (min: number) => PAD_L + (clamp(min, 0, MIN_PER_DAY) / MIN_PER_DAY) * plotW;

  const arrival = arrivalBars(day, tariff, dayStart);
  const scheduled = scheduledBars(day, tariff, dayStart);
  const rows: { label: string; top: number; bars: Bar[] }[] = [
    { label: "At arrival", top: PRICE_H, bars: arrival },
    { label: "Scheduled", top: PRICE_H + ROW_H + ROW_GAP, bars: scheduled },
  ];
  const stripTop = PRICE_H;
  const stripBottom = PRICE_H + ROW_H + ROW_GAP + ROW_H;
  const axisY = stripBottom + AXIS_GAP;

  const hourStep = plotW < 520 ? 6 : 3;
  const hours = Array.from({ length: 24 / hourStep + 1 }, (_, i) => i * hourStep);

  // Print each tier's price once, at the left edge of its widest band so neighbours do not collide.
  const bands = tariff.bands
    .map((b) => ({ ...b, a: minuteOf(b.start, dayStart), z: minuteOf(b.end, dayStart) }))
    .filter((b) => b.z > b.a);
  const pricedBand = new Map<TariffTier, number>();
  bands.forEach((b, i) => {
    const cur = pricedBand.get(b.tier);
    if (cur == null || b.z - b.a > bands[cur].z - bands[cur].a) pricedBand.set(b.tier, i);
  });

  const costArrival = day.totals.charge_cost_usd_arrival;
  const costScheduled = day.totals.charge_cost_usd_scheduled;
  const saving = costArrival > 0 ? Math.round((1 - costScheduled / costArrival) * 100) : null;

  return (
    <Tile
      title="Charging schedule"
      note={`$/kWh by hour. Charger ${fmtInt(tariff.charger_kw)} kW`}
      className={styles.panel}
    >
      <div className={styles.body}>
        <div ref={wrap} className={styles.strip}>
          <svg
            className={styles.svg}
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`}
            role="img"
            aria-label="Charging power over the day at arrival and when scheduled, over the tariff tiers"
          >
            {/* tariff bands */}
            {bands.map((b, i) => {
              const showPrice = pricedBand.get(b.tier) === i;
              return (
                <g key={`${b.start}-${i}`}>
                  {TIER_FILL[b.tier] ? (
                    <rect
                      x={x(b.a)}
                      y={stripTop}
                      width={Math.max(0, x(b.z) - x(b.a))}
                      height={stripBottom - stripTop}
                      rx={3}
                      fill={TIER_FILL[b.tier] ?? undefined}
                    />
                  ) : null}
                  {showPrice ? (
                    <text x={x(b.a) + 2} y={PRICE_H - 6} className={styles.price}>
                      {`$${b.usd_per_kwh.toFixed(2)}`}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* rows */}
            {rows.map((row) => (
              <g key={row.label}>
                <text x={PAD_L - 10} y={row.top + ROW_H / 2 + 4} className={styles.rowLabel} textAnchor="end">
                  {row.label}
                </text>
                <line x1={PAD_L} x2={PAD_L + plotW} y1={row.top + ROW_H} y2={row.top + ROW_H} className={styles.baseline} />
                {row.bars.map((bar, i) => {
                  const h = Math.max(3, bar.level * ROW_H);
                  const w = Math.max(3, x(bar.b) - x(bar.a));
                  return (
                    <rect
                      key={i}
                      x={x(bar.a)}
                      y={row.top + ROW_H - h}
                      width={w}
                      height={h}
                      rx={Math.min(3, w / 2)}
                      className={styles.bar}
                    />
                  );
                })}
              </g>
            ))}

            {/* axis */}
            {hours.map((h) => (
              <g key={h}>
                <line x1={x(h * 60)} x2={x(h * 60)} y1={axisY} y2={axisY + 5} className={styles.tick} />
                <text
                  x={x(h * 60)}
                  y={axisY + 18}
                  className={styles.axisLabel}
                  textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
                >
                  {String(h % 24).padStart(2, "0")}:00
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className={styles.readout}>
          <Stat size="lg" label="At arrival" value={fmtUsd(costArrival)} />
          <Stat size="lg" label="Scheduled" value={fmtUsd(costScheduled)} hint={saving != null ? `${saving}% lower` : undefined} />
        </div>
      </div>

    </Tile>
  );
}
