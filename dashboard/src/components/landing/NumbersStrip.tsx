"use client";

import { fmtInt } from "@/lib/format";
import { useSummary } from "@/lib/useSummary";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";

const pct = (v: number) => `${Math.round(v)}%`;

/** Four stats from summary.json: electric share at the default battery, tug-days, tugs, detected docks. */
export default function NumbersStrip() {
  const { summary, pick, defaultKwh, status } = useSummary();
  const row = pick(defaultKwh);
  const ready = status === "ready" && summary && row;

  const items = [
    {
      value: ready ? row.electric_share * 100 : null,
      format: pct,
      label: `Electric tug-days at ${fmtInt(defaultKwh)} kWh`,
    },
    { value: ready ? summary.dataset.tug_days : null, format: fmtInt, label: "Tug-days replayed" },
    { value: ready ? summary.dataset.tugs : null, format: fmtInt, label: "Tugs tracked" },
    { value: ready ? (summary.docks?.length ?? 0) : null, format: fmtInt, label: "Detected docks" },
  ];

  return (
    <Reveal className={styles.numbers}>
      {items.map((it) => (
        <div key={it.label} className={`tb-tile ${styles.numberTile}`}>
          <div className={styles.numberBody}>
            <span className={`stat ${styles.numberValue}`}>
              {it.value != null ? <CountUp value={it.value} format={it.format} /> : <span className={styles.numberPlaceholder}>0</span>}
            </span>
            <span className={styles.numberLabel}>{it.label}</span>
          </div>
        </div>
      ))}
    </Reveal>
  );
}
