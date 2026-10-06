"use client";

import Link from "next/link";
import BatteryBar from "@/components/BatteryBar";
import StatusChip from "@/components/StatusChip";
import { fmtInt, fmtNum, isoDate, statusOf } from "@/lib/format";
import type { Telemetry } from "@/lib/types";
import styles from "./TugDetail.module.css";

interface Props {
  tug: Telemetry;
  clock: number | null;
  onClose: () => void;
}

const ACTIVITY_LABEL: Record<Telemetry["activity"], string> = {
  transit: "Transit",
  assist: "Assist",
  idle: "Idle",
  charging: "Charging",
};

/** Inline expansion under the selected fleet row. */
export default function TugDetail({ tug, clock, onClose }: Props) {
  const date = isoDate(clock ?? Date.parse(tug.t));
  return (
    <div className={styles.detail}>
      <div className={styles.statusRow}>
        <span className={styles.status}>
          <StatusChip status={statusOf(tug)} />
          <span className={styles.activity}>{ACTIVITY_LABEL[tug.activity]}</span>
        </span>
        <button type="button" className="btn btnSecondary btnIcon" onClick={onClose} aria-label="Close detail">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      <div className={styles.battery}>
        <BatteryBar soc={tug.soc} />
        <span className={`num ${styles.socText}`}>
          {fmtInt(tug.soc * tug.battery_kwh)} of {fmtInt(tug.battery_kwh)} kWh
        </span>
      </div>

      <dl className={styles.grid}>
        <Row label="Speed" value={`${fmtNum(tug.sog, 1)} kn`} />
        <Row label="Heading" value={`${String(Math.round(tug.heading)).padStart(3, "0")}°`} />
        <Row label="Power" value={`${tug.power_kw >= 0 ? "" : "−"}${fmtInt(Math.abs(tug.power_kw))} kW`} />
        <Row label="Generator" value={tug.generator_on ? `${fmtInt(tug.generator_kw)} kW` : "Off"} />
        <Row label="Position" value={`${tug.lat.toFixed(4)}, ${tug.lon.toFixed(4)}`} mono />
        <Row label="Job" value={tug.job_id ?? "None"} />
      </dl>

      <div className={styles.actions}>
        <Link href={`/tugs/${encodeURIComponent(tug.tug_id)}?date=${date}`} className="btn">
          Open day
        </Link>
        <span className={`mono ${styles.mmsi}`}>MMSI {tug.tug_id}</span>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.cell}>
      <dt className="label">{label}</dt>
      <dd className={`${mono ? "mono" : "num"} ${styles.val}`}>{value}</dd>
    </div>
  );
}
