"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ACTIVITY_COLOR, clamp, fmtInt, fmtPct, hhmm } from "@/lib/format";
import type { Activity, TugDay } from "@/lib/types";
import styles from "./DayTimeline.module.css";

/** SOC thresholds, mirroring battery.generator_cut_out_soc / cut_in_soc in config.yaml. */
const WARN_SOC = 0.35;
const BAD_SOC = 0.15;

const PAD_L = 66;
const PAD_R = 14;
const CURVE_TOP = 16;
const CURVE_H = 150;
const BAND_GAP = 12;
const BAND_H = 10;
const SPAN_H = 4;
const AXIS_H = 26;
const SPAN_GAP = 12;
const HEIGHT = CURVE_TOP + CURVE_H + BAND_GAP + BAND_H + 10 + SPAN_H + SPAN_GAP + SPAN_H + 8 + AXIS_H;

const MIN_PER_DAY = 1440;

const ACTIVITY_LABEL: Record<Activity, string> = {
  transit: "Transit",
  assist: "Assist",
  idle: "Idle",
  charging: "Charging",
};

interface Props {
  day: TugDay | null;
  /** Cursor position in minutes from midnight UTC, or null. */
  cursor: number | null;
  onCursor: (min: number | null) => void;
}

function minuteOf(iso: string, dayStart: number): number {
  return (Date.parse(iso) - dayStart) / 60_000;
}

export default function DayTimeline({ day, cursor, onCursor }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const dayStart = day ? Date.parse(`${day.date}T00:00:00Z`) : 0;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const x = useCallback((min: number) => PAD_L + (clamp(min, 0, MIN_PER_DAY) / MIN_PER_DAY) * plotW, [plotW]);
  const y = useCallback((soc: number) => CURVE_TOP + (1 - clamp(soc, 0, 1)) * CURVE_H, []);

  // Sample minutes, so the curve is correct even if the pipeline skips minutes.
  const minutes = useMemo(() => (day ? day.samples.t.map((t) => minuteOf(t, dayStart)) : []), [day, dayStart]);

  const curvePath = useMemo(() => {
    if (!day || plotW <= 0 || minutes.length === 0) return { line: "", area: "" };
    const pts: string[] = [];
    for (let i = 0; i < minutes.length; i++) {
      pts.push(`${x(minutes[i]).toFixed(1)},${y(day.samples.soc[i]).toFixed(1)}`);
    }
    const line = `M${pts.join("L")}`;
    const base = (CURVE_TOP + CURVE_H).toFixed(1);
    const area = `${line}L${x(minutes[minutes.length - 1]).toFixed(1)},${base}L${x(minutes[0]).toFixed(1)},${base}Z`;
    return { line, area };
  }, [day, minutes, plotW, x, y]);

  const indexAt = useCallback(
    (min: number): number => {
      if (minutes.length === 0) return -1;
      // Binary search for the nearest sample.
      let lo = 0;
      let hi = minutes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (minutes[mid] < min) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(minutes[lo - 1] - min) < Math.abs(minutes[lo] - min)) return lo - 1;
      return lo;
    },
    [minutes],
  );

  const minuteFromEvent = useCallback(
    (clientX: number): number | null => {
      const el = wrap.current;
      if (!el || plotW <= 0) return null;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left - PAD_L;
      if (px < -4 || px > plotW + 4) return null;
      return clamp((px / plotW) * MIN_PER_DAY, 0, MIN_PER_DAY - 1);
    },
    [plotW],
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => setHover(minuteFromEvent(e.clientX));
  const onTouch = (e: TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    if (t) setHover(minuteFromEvent(t.clientX));
  };
  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const m = minuteFromEvent(e.clientX);
    if (m == null) return;
    onCursor(cursor != null && Math.abs(cursor - m) < 2 ? null : m);
  };

  const probe = hover ?? cursor;
  const probeIdx = day && probe != null ? indexAt(probe) : -1;
  const probeSample =
    day && probeIdx >= 0
      ? {
          min: minutes[probeIdx],
          t: day.samples.t[probeIdx],
          soc: day.samples.soc[probeIdx],
          power: day.samples.power_kw[probeIdx],
          activity: day.samples.activity[probeIdx],
          generator: day.samples.generator_on[probeIdx],
        }
      : null;

  const bandY = CURVE_TOP + CURVE_H + BAND_GAP;
  const chargeY = bandY + BAND_H + 10;
  const genY = chargeY + SPAN_H + SPAN_GAP;
  const axisY = genY + SPAN_H + 8;

  const hourStep = plotW < 520 ? 6 : 3;
  const hours = Array.from({ length: 24 / hourStep + 1 }, (_, i) => i * hourStep);
  const tipLeft = probeSample ? x(probeSample.min) : 0;
  const tipOnRight = tipLeft < width * 0.6;

  return (
    <div ref={wrap} className={styles.wrap}>
      <svg
        className={styles.svg}
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`}
        role="img"
        aria-label="Battery state of charge and activity over the day"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={() => setHover(null)}
        onClick={onClick}
      >
        <defs>
          <clipPath id="clipPlot">
            <rect x={PAD_L} y={0} width={Math.max(plotW, 0)} height={HEIGHT} />
          </clipPath>
        </defs>

        {/* grid */}
        {[1, 0.75, 0.5, 0.25, 0].map((s) => (
          <g key={s}>
            <line x1={PAD_L} x2={PAD_L + plotW} y1={y(s)} y2={y(s)} className={styles.grid} />
            <text x={PAD_L - 8} y={y(s) + 3.5} className={styles.yLabel} textAnchor="end">
              {Math.round(s * 100)}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={PAD_L + plotW} y1={y(WARN_SOC)} y2={y(WARN_SOC)} className={styles.thresh} />
        <line x1={PAD_L} x2={PAD_L + plotW} y1={y(BAD_SOC)} y2={y(BAD_SOC)} className={styles.thresh} />

        {/* SOC curve: ink line over a 6% ink area */}
        {day && curvePath.line ? (
          <g clipPath="url(#clipPlot)">
            <path d={curvePath.area} className={styles.area} />
            <path d={curvePath.line} className={styles.line} />
          </g>
        ) : null}

        {/* activity band */}
        <rect x={PAD_L} y={bandY} width={plotW} height={BAND_H} className={styles.bandTrack} />
        {day
          ? day.segments.map((s, i) => {
              const a = minuteOf(s.start, dayStart);
              const b = minuteOf(s.end, dayStart);
              const w = Math.max(0.5, x(b) - x(a));
              return (
                <rect
                  key={`${s.start}-${i}`}
                  x={x(a)}
                  y={bandY}
                  width={w}
                  height={BAND_H}
                  fill={ACTIVITY_COLOR[s.activity]}
                  opacity={s.activity === "idle" ? 0.55 : 1}
                />
              );
            })
          : null}

        {/* charging + generator spans */}
        {day
          ? day.charging.map((c, i) => {
              const a = minuteOf(c.start, dayStart);
              const b = minuteOf(c.end, dayStart);
              return <rect key={`c${i}`} x={x(a)} y={chargeY} width={Math.max(1, x(b) - x(a))} height={SPAN_H} fill="var(--green)" />;
            })
          : null}
        {day
          ? day.generator.map((g, i) => {
              const a = minuteOf(g.start, dayStart);
              const b = minuteOf(g.end, dayStart);
              return <rect key={`g${i}`} x={x(a)} y={genY} width={Math.max(1, x(b) - x(a))} height={SPAN_H} fill="var(--red)" />;
            })
          : null}
        <text x={PAD_L - 8} y={chargeY + SPAN_H / 2 + 4} className={styles.yLabel} textAnchor="end">
          Charging
        </text>
        <text x={PAD_L - 8} y={genY + SPAN_H / 2 + 4} className={styles.yLabel} textAnchor="end">
          Generator
        </text>

        {/* axis */}
        {hours.map((h) => (
          <g key={h}>
            <line x1={x(h * 60)} x2={x(h * 60)} y1={axisY} y2={axisY + 5} className={styles.grid} />
            <text
              x={x(h * 60)}
              y={axisY + 18}
              className={styles.xLabel}
              textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
            >
              {String(h % 24).padStart(2, "0")}:00
            </text>
          </g>
        ))}

        {/* cursor */}
        {day && cursor != null ? (
          <line x1={x(cursor)} x2={x(cursor)} y1={CURVE_TOP - 6} y2={axisY} className={styles.cursor} />
        ) : null}

        {/* hover crosshair */}
        {probeSample ? (
          <g className={styles.probe}>
            <line x1={x(probeSample.min)} x2={x(probeSample.min)} y1={CURVE_TOP - 6} y2={axisY} className={styles.crosshair} />
            <circle cx={x(probeSample.min)} cy={y(probeSample.soc)} r={4} className={styles.probeDot} />
          </g>
        ) : null}

        {!day ? <rect x={PAD_L} y={CURVE_TOP} width={plotW} height={CURVE_H} className={styles.skeleton} /> : null}
      </svg>

      {probeSample ? (
        <div
          className={styles.tip}
          style={{
            left: tipLeft,
            transform: tipOnRight ? "translate(12px, 0)" : "translate(calc(-100% - 12px), 0)",
          }}
          role="status"
        >
          <div className={styles.tipTime}>
            <span className="mono">{hhmm(probeSample.t)}</span> UTC
          </div>
          <div className={styles.tipRow}>
            <span className="label">Charge</span>
            <span className={`num ${styles.tipVal}`}>{fmtPct(probeSample.soc)}</span>
          </div>
          <div className={styles.tipRow}>
            <span className="label">Power</span>
            <span className={`num ${styles.tipVal}`}>
              {probeSample.power < 0 ? "−" : ""}
              {fmtInt(Math.abs(probeSample.power))} kW
            </span>
          </div>
          <div className={styles.tipRow}>
            <span className="label">Activity</span>
            <span className={styles.tipVal} style={{ color: ACTIVITY_COLOR[probeSample.activity] }}>
              {ACTIVITY_LABEL[probeSample.activity]}
            </span>
          </div>
          {probeSample.generator ? (
            <div className={styles.tipRow}>
              <span className="label">Generator</span>
              <span className={styles.tipGen}>Running</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
