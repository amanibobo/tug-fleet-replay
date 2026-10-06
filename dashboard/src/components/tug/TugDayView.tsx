"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import FixtureBadge from "@/components/FixtureBadge";
import Footer from "@/components/Footer";
import Footnote from "@/components/Footnote";
import Panel from "@/components/Panel";
import Stat from "@/components/Stat";
import { fmtInt, fmtPct, prettyDate, shiftDate } from "@/lib/format";
import { useSummary } from "@/lib/useSummary";
import { useTugDay } from "@/lib/useTugDay";
import DayTimeline from "./DayTimeline";
import JobsList from "./JobsList";
import RerunInspector from "./RerunInspector";
import styles from "./TugDayView.module.css";

const TrackMap = dynamic(() => import("./TrackMap"), {
  ssr: false,
  loading: () => <div className={styles.mapSkeleton} aria-hidden />,
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function TugDayView({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const summary = useSummary();
  const dataset = summary.summary?.dataset;

  const requested = params.get("date");
  const date = requested && DATE_RE.test(requested) ? requested : dataset?.start ?? null;

  const { day, status, error } = useTugDay(id, date);
  const dayKey = `${id}/${date ?? ""}`;
  // The cursor is keyed to the tug-day so it resets when the day changes.
  const [cursorState, setCursorState] = useState<{ key: string; min: number | null }>({ key: dayKey, min: null });
  const cursor = cursorState.key === dayKey ? cursorState.min : null;
  const setCursor = useCallback((min: number | null) => setCursorState({ key: dayKey, min }), [dayKey]);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const setDate = useCallback(
    (d: string) => router.replace(`/tugs/${encodeURIComponent(id)}?date=${d}`, { scroll: false }),
    [router, id],
  );

  const canPrev = !!date && (!dataset || date > dataset.start);
  const canNext = !!date && (!dataset || date < dataset.end);

  const name = day?.name ?? summary.summary?.tugs.find((t) => t.tug_id === id)?.name ?? "Tug";
  const totals = day?.totals;

  const electric = totals?.electric_only;
  const title = useMemo(() => (date ? prettyDate(date) : ""), [date]);

  return (
    <main className={`page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Link href="/" className={styles.back}>
            Fleet
          </Link>
          <h1 className={`title ${styles.name}`}>{name}</h1>
          <div className={styles.meta}>
            <span className={`mono ${styles.mmsi}`}>MMSI {id}</span>
            {day?.fixture ? <FixtureBadge /> : null}
          </div>
        </div>

        <div className={styles.datePicker} role="group" aria-label="Pick a day">
          <button
            type="button"
            className="btn btnSecondary btnIcon"
            disabled={!canPrev}
            onClick={() => date && setDate(shiftDate(date, -1))}
            aria-label="Previous day"
          >
            <ChevronIcon dir="left" />
          </button>
          <span className={`${styles.dateLabel} num`}>
            <span>{title}</span>
            <span className={`mono ${styles.dateIso}`}>{date ?? ""} UTC</span>
          </span>
          <button
            type="button"
            className="btn btnSecondary btnIcon"
            disabled={!canNext}
            onClick={() => date && setDate(shiftDate(date, 1))}
            aria-label="Next day"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      </header>

      <section className={styles.totals} aria-label="Day totals">
        <div className={styles.statRow}>
          <Stat label="Energy" value={totals ? fmtInt(totals.energy_kwh) : "0"} unit="kWh" />
          <Stat label="Generator" value={totals ? fmtInt(totals.generator_kwh) : "0"} unit="kWh" />
          <Stat label="Charged" value={totals ? fmtInt(totals.charged_kwh) : "0"} unit="kWh" />
          <Stat label="Minimum charge" value={totals ? fmtPct(totals.min_soc) : "0%"} />
          <Stat label="Jobs" value={day ? fmtInt(day.jobs.length) : "0"} />
          <div className={styles.dayStatus}>
            <span className="label">Day</span>
            {totals ? (
              <span className={styles.chip} data-ok={electric || undefined}>
                <span className={styles.chipDot} aria-hidden />
                {electric ? "Electric only" : "Generator ran"}
              </span>
            ) : (
              <span className={styles.chip}>Loading</span>
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn"
              onClick={() => setInspectorOpen(true)}
              disabled={!day}
              title="Scrub the full-fidelity recording in Rerun"
            >
              Open in Rerun inspector
            </button>
          </div>
        </div>
        <Footnote />
      </section>

      <Panel padding="none" className={styles.timelinePanel}>
        <div className={styles.panelHead}>
          <h2 className="heading">Battery and activity</h2>
          <span className={styles.legend} aria-hidden>
            <LegendItem color="var(--act-transit)" label="Transit" />
            <LegendItem color="var(--act-assist)" label="Assist" />
            <LegendItem color="var(--act-idle)" label="Idle" />
            <LegendItem color="var(--act-charging)" label="Charging" />
            <LegendItem color="var(--bad)" label="Generator" />
          </span>
        </div>
        {status === "error" ? (
          <div className={styles.empty}>
            No data for this day{error ? <span className="muted"> ({error})</span> : null}.
          </div>
        ) : (
          <DayTimeline day={day} cursor={cursor} onCursor={setCursor} />
        )}
      </Panel>

      <div className={styles.lower}>
        <Panel padding="none" className={styles.jobsPanel}>
          <div className={styles.panelHead}>
            <h2 className="heading">Jobs</h2>
            <span className={styles.panelMeta}>
              {day ? `${day.jobs.length} ${day.jobs.length === 1 ? "job" : "jobs"}` : ""}
            </span>
          </div>
          <JobsList day={day} onPick={setCursor} />
        </Panel>

        <Panel padding="none" className={styles.mapPanel}>
          <div className={styles.panelHead}>
            <h2 className="heading">Track</h2>
            <span className={styles.panelMeta}>Colored by activity</span>
          </div>
          <div className={styles.mapBox}>
            <TrackMap day={day} cursor={cursor} />
          </div>
        </Panel>
      </div>

      <Footer className={styles.footer} />

      <RerunInspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        recordingUrl={day?.recording_url ?? null}
        title={`${name}, ${title}`}
      />
    </main>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span className={styles.swatch} style={{ background: color }} />
      {label}
    </span>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ transform: dir === "left" ? "scaleX(-1)" : undefined }}>
      <path d="M4 1.5L8.5 6 4 10.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
