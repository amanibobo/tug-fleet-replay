"use client";

import Link from "next/link";
import BatteryBar from "@/components/BatteryBar";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { ACTIVITY_LABEL, fmtInt, fmtNum, isoDate } from "@/lib/format";
import type { Telemetry } from "@/lib/types";
import styles from "./TugDetail.module.css";

interface Props {
  tug: Telemetry;
  clock: number | null;
}

/** Inline expansion under the selected fleet row: a dense definition grid, Open day, the MMSI. */
export default function TugDetail({ tug, clock }: Props) {
  const date = isoDate(clock ?? Date.parse(tug.t));
  const onboarding = useOnboarding();
  return (
    <div className={styles.detail}>
      <div className={styles.battery}>
        <span className={styles.barWrap}>
          <BatteryBar soc={tug.soc} height={3} />
        </span>
        <span className={`mono ${styles.socText}`}>
          {ACTIVITY_LABEL[tug.activity]} · {fmtInt(tug.soc * tug.battery_kwh)} of {fmtInt(tug.battery_kwh)} kWh
        </span>
      </div>

      <dl className={styles.grid}>
        <Row label="Speed" value={`${fmtNum(tug.sog, 1)} kn`} />
        <Row label="Heading" value={`${String(Math.round(tug.heading)).padStart(3, "0")}°`} />
        <Row label="Power" value={`${tug.power_kw >= 0 ? "" : "−"}${fmtInt(Math.abs(tug.power_kw))} kW`} />
        <Row label="Generator" value={tug.generator_on ? `${fmtInt(tug.generator_kw)} kW` : "Off"} />
        <Row label="Position" value={`${tug.lat.toFixed(4)}, ${tug.lon.toFixed(4)}`} />
        <Row label="Job" value={tug.job_id ?? "None"} />
      </dl>

      <div className={styles.actions}>
        <Link
          href={`/app/tugs/${encodeURIComponent(tug.tug_id)}?date=${date}`}
          className="btn"
          data-tour="open-day"
          onClick={() => onboarding.complete("openDay")}
        >
          Open day
        </Link>
        <span className={`mono ${styles.mmsi}`}>MMSI {tug.tug_id}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.cell}>
      <dt className={styles.key}>{label}</dt>
      <dd className={`mono ${styles.val}`}>{value}</dd>
    </div>
  );
}
