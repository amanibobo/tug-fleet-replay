"use client";

import { memo, useState } from "react";
import Slider from "@/components/Slider";
import { fmtHours, fmtInt, fmtUsd } from "@/lib/format";
import type { SummaryState } from "@/lib/useSummary";
import { useAnimatedNumber, useDebounced } from "@/lib/useAnimatedNumber";
import styles from "./HeadlinePanel.module.css";

interface Props {
  summary: SummaryState;
  /** Fired when the user moves the battery slider (onboarding step 3). */
  onSlide?: () => void;
}

/** Headline card: the share in a square tile with its sentence, the battery slider, and four stat tiles. */
function HeadlinePanel({ summary, onSlide }: Props) {
  const { bounds, defaultKwh, pick, status } = summary;
  const [picked, setKwh] = useState<number | null>(null);
  const kwh = picked ?? defaultKwh;

  const debounced = useDebounced(kwh, 50);
  const row = pick(debounced);
  const share = useAnimatedNumber(row ? row.electric_share * 100 : 0, 320);
  const tugDays = summary.summary?.dataset.tug_days;
  const ready = status === "ready" && !!row;

  const saving =
    row && row.charge_cost_usd_arrival > 0
      ? Math.round((1 - row.charge_cost_usd_scheduled / row.charge_cost_usd_arrival) * 100)
      : null;

  return (
    <section className={styles.panel} aria-label="Week summary" data-tour="headline">
      <div className={styles.lead}>
        <div className={styles.tile} aria-live="polite">
          {ready ? `${share.toFixed(0)}%` : "–"}
        </div>
        <div className={styles.leadText}>
          <span className={styles.leadTitle}>Electric tug-days this week</span>
          <span className={styles.leadSub}>
            {ready ? `${share.toFixed(0)}% of ${tugDays ? fmtInt(tugDays) : ""} ran without the generator` : "Loading the week"}
          </span>
        </div>
      </div>

      <div className={styles.rule} />

      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>Battery</span>
        <span className={styles.chip}>{fmtInt(kwh)} kWh</span>
      </div>
      <Slider
        label=""
        min={bounds?.min ?? 1000}
        max={bounds?.max ?? 8000}
        step={bounds?.step ?? 250}
        value={kwh}
        onChange={(v) => {
          setKwh(v);
          onSlide?.();
        }}
        disabled={!bounds}
        className={styles.slider}
        ariaLabel="Battery size in kWh"
      />

      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>This week</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Generator</span>
          <span className={styles.statValue}>
            <b>{row ? fmtHours(row.generator_hours) : "0 h"}</b>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Charged</span>
          <span className={styles.statValue}>
            <b>{row ? fmtInt(row.charged_kwh) : "0"}</b> kWh
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Cost at arrival</span>
          <span className={styles.statValue}>
            <b>{row ? fmtUsd(row.charge_cost_usd_arrival) : "$0"}</b>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Cost scheduled</span>
          <span className={styles.statValue}>
            <b>{row ? fmtUsd(row.charge_cost_usd_scheduled) : "$0"}</b>
          </span>
          {saving != null ? <span className={styles.statNote}>{saving}% less</span> : null}
        </div>
      </div>
    </section>
  );
}

export default memo(HeadlinePanel);
