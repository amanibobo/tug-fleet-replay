"use client";

import FixtureBadge from "@/components/FixtureBadge";
import Footnote from "@/components/Footnote";
import { useSummary } from "@/lib/useSummary";
import styles from "./Landing.module.css";

/** Lets long config keys wrap at underscores on narrow screens. */
function breakable(key: string) {
  const parts = key.split("_");
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 ? "_" : null}
      {i > 0 ? <wbr /> : null}
      {part}
    </span>
  ));
}

/** The assumptions table from summary.json as list rows inside a tile. */
export default function DataSection() {
  const { summary, status } = useSummary();
  return (
    <section id="data" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className="section">Data and assumptions</h2>
        {summary?.fixture ? <FixtureBadge /> : null}
      </div>
      <p className={styles.sectionLede}>
        The tracks are real: one week of NOAA AIS positions for towing vessels in San Pedro Bay, one minute apart. The
        powertrain is not. Every number below is an estimate unless its note cites a source, and the battery slider on
        the console exists so the headline can be read against the weakest one.
      </p>

      <div className={`tb-tile ${styles.dataTile}`}>
        <div className={styles.dataHead}>
          <h3 className="heading">Parameters in config.yaml</h3>
          <Footnote />
        </div>
        <ul className={styles.dataRows}>
          <li className={`${styles.dataRow} ${styles.dataRowHead}`} aria-hidden>
            <span className="label">Parameter</span>
            <span className={`label ${styles.dataValue}`}>Value</span>
            <span className="label">Note</span>
          </li>
          {status === "ready" && summary ? (
            summary.assumptions.map((a) => (
              <li key={a.key} className={styles.dataRow}>
                <span className={`mono ${styles.dataKey}`}>{breakable(a.key)}</span>
                <span className={`num ${styles.dataValue}`}>{typeof a.value === "number" ? a.value.toLocaleString("en-US") : a.value}</span>
                <span className={styles.dataNote}>{a.note}</span>
              </li>
            ))
          ) : status === "error" ? (
            <li className={styles.dataRow}>
              <span className={styles.dataNote}>Summary file unavailable.</span>
            </li>
          ) : (
            Array.from({ length: 6 }, (_, i) => <li key={i} className={`${styles.dataRow} ${styles.dataSkeleton}`} aria-hidden />)
          )}
        </ul>
      </div>

      {summary ? (
        <p className={styles.sectionNote}>
          Dataset: {summary.dataset.tugs} tugs, {summary.dataset.tug_days} tug-days, {summary.dataset.start} to {summary.dataset.end}.
          Default battery {summary.default_battery_kwh.toLocaleString("en-US")} kWh.
        </p>
      ) : null}
      <p className={styles.sectionNote}>
        Independent project, not affiliated with, endorsed by, or built with data from Arc Boats or any port authority.
        Vessel names and identifiers come from public AIS broadcasts. Powertrain, battery and tariff figures are public
        estimates, not measurements of any real vessel.
      </p>
    </section>
  );
}
