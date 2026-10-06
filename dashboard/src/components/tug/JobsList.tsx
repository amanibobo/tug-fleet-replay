"use client";

import { fmtDuration, fmtInt, fmtNum, hhmm, minutesBetween } from "@/lib/format";
import type { TugDay } from "@/lib/types";
import styles from "./JobsList.module.css";

interface Props {
  day: TugDay | null;
  /** Called with the job's start minute so the timeline cursor can follow. */
  onPick: (min: number) => void;
}

export default function JobsList({ day, onPick }: Props) {
  if (!day) {
    return (
      <ul className={styles.list} aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className={styles.skeleton} aria-hidden />
        ))}
      </ul>
    );
  }
  if (day.jobs.length === 0) return <div className={styles.empty}>No jobs this day.</div>;

  const dayStart = Date.parse(`${day.date}T00:00:00Z`);
  return (
    <ul className={styles.list}>
      {day.jobs.map((j, i) => {
        const dur = minutesBetween(j.start, j.end);
        return (
          <li key={j.job_id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => onPick((Date.parse(j.start) - dayStart) / 60_000)}
              title={j.job_id}
            >
              <span className={`num ${styles.idx}`}>{i + 1}</span>
              <span className={styles.main}>
                <span className={`num ${styles.time}`}>
                  {hhmm(j.start)} to {hhmm(j.end)}
                </span>
                <span className={styles.sub}>
                  {fmtDuration(dur)}, assist {j.assist_min} min, transit {j.transit_min} min, up to {fmtNum(j.max_sog, 1)} kn
                </span>
              </span>
              <span className={`${styles.energy} num`}>
                {fmtInt(j.energy_kwh)}
                <span className={styles.unit}>kWh</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
