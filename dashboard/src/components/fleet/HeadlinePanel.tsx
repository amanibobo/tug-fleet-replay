"use client";

import { memo, useState } from "react";
import Footnote from "@/components/Footnote";
import Slider from "@/components/Slider";
import Stat from "@/components/Stat";
import { fmtHours, fmtInt, fmtUsd } from "@/lib/format";
import type { SummaryState } from "@/lib/useSummary";
import { useAnimatedNumber, useDebounced } from "@/lib/useAnimatedNumber";
import styles from "./HeadlinePanel.module.css";

interface Props {
  summary: SummaryState;
  className?: string;
}

function HeadlinePanel({ summary, className }: Props) {
  const { bounds, defaultKwh, pick, status } = summary;
  const [picked, setKwh] = useState<number | null>(null);
  const kwh = picked ?? defaultKwh;

  const debounced = useDebounced(kwh, 50);
  const row = pick(debounced);
  const share = useAnimatedNumber(row ? row.electric_share * 100 : 0, 320);
  const tugDays = summary.summary?.dataset.tug_days;

  const saving =
    row && row.charge_cost_usd_arrival > 0
      ? Math.round((1 - row.charge_cost_usd_scheduled / row.charge_cost_usd_arrival) * 100)
      : null;

  return (
    <section className={`${styles.panel} ${className ?? ""}`} aria-label="Week summary">
      <div className={`headline ${styles.headline}`} aria-live="polite">
        {status === "ready" && row ? (
          <>
            {share.toFixed(0)}
            <span className={styles.pct}>%</span>
          </>
        ) : (
          <span className={styles.placeholder}>0</span>
        )}
      </div>
      <p className={styles.caption}>of {tugDays ? fmtInt(tugDays) : ""} tug-days ran without the generator</p>

      <Slider
        label={`Battery ${fmtInt(kwh)} kWh`}
        min={bounds?.min ?? 1000}
        max={bounds?.max ?? 8000}
        step={bounds?.step ?? 250}
        value={kwh}
        onChange={setKwh}
        disabled={!bounds}
        className={styles.slider}
      />

      <div className={styles.stats}>
        <Stat label="Generator hours" value={row ? fmtHours(row.generator_hours) : "0"} />
        <Stat label="Charged" value={row ? fmtInt(row.charged_kwh) : "0"} unit="kWh" />
        <Stat
          className={styles.costStat}
          label="Charging cost"
          value={
            row ? (
              <span className={styles.cost}>
                <span>{fmtUsd(row.charge_cost_usd_arrival)}</span>
                <span className={styles.costNote}>at arrival</span>
                <span className={styles.vs}>vs</span>
                <span>{fmtUsd(row.charge_cost_usd_scheduled)}</span>
                <span className={styles.costNote}>scheduled</span>
              </span>
            ) : (
              "0"
            )
          }
          hint={saving != null ? `${saving}% lower when scheduled` : undefined}
        />
      </div>

      <Footnote className={styles.footnote} />
    </section>
  );
}

export default memo(HeadlinePanel);
