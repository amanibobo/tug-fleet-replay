"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FixtureBadge from "@/components/FixtureBadge";
import Stat from "@/components/Stat";
import Tile from "@/components/Tile";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { fmtInt, fmtPct, prettyDate, shiftDate } from "@/lib/format";
import { useSummary } from "@/lib/useSummary";
import { useTugDay } from "@/lib/useTugDay";
import ChargingSchedule from "./ChargingSchedule";
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
  const onboarding = useOnboarding();

  // Arriving here is onboarding step 4, however the visitor got here.
  useEffect(() => {
    onboarding.complete("openDay");
  }, [onboarding]);

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
    (d: string) => router.replace(`/app/tugs/${encodeURIComponent(id)}?date=${d}`, { scroll: false }),
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
          <Link href="/app" className={`btn btnGhost btnSmall ${styles.back}`}>
            <ChevronIcon dir="left" />
            Fleet
          </Link>
          <h1 className="title">{name}</h1>
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

      <Tile className={styles.totals} aria-label="Day totals">
        <div className={styles.totalsHead}>
          <div className={styles.totalsTitle}>
            <span className="heading">Day totals</span>
            {totals ? (
              <span className={`chip ${electric ? "chipGreen" : "chipRed"}`}>{electric ? "Electric only" : "Generator ran"}</span>
            ) : (
              <span className="chip">Loading</span>
            )}
          </div>
          <button
            type="button"
            className={`btn ${styles.rerunBtn}`}
            onClick={() => setInspectorOpen(true)}
            disabled={!day}
            title="Scrub the full-fidelity recording in Rerun"
          >
            Open in Rerun inspector
          </button>
        </div>
        <div className={styles.statRow}>
          <Stat size="lg" className={styles.statCell} label="Energy" value={totals ? fmtInt(totals.energy_kwh) : "0"} unit="kWh" />
          <Stat size="lg" className={styles.statCell} label="Generator" value={totals ? fmtInt(totals.generator_kwh) : "0"} unit="kWh" />
          <Stat size="lg" className={styles.statCell} label="Charged" value={totals ? fmtInt(totals.charged_kwh) : "0"} unit="kWh" />
          <Stat size="lg" className={styles.statCell} label="Minimum charge" value={totals ? fmtPct(totals.min_soc) : "0%"} />
          <Stat size="lg" className={styles.statCell} label="Jobs" value={day ? fmtInt(day.jobs.length) : "0"} />
        </div>
      </Tile>

      <Tile
        padding="none"
        className={styles.timelinePanel}
        title="Battery and activity"
        note={
          <span className={styles.legend} aria-hidden>
            <LegendItem color="var(--d-act-transit)" label="Transit" />
            <LegendItem color="var(--d-act-assist)" label="Assist" />
            <LegendItem color="var(--d-act-idle)" label="Idle" />
            <LegendItem color="var(--d-act-charging)" label="Charging" />
            <LegendItem color="var(--d-red)" label="Generator" />
          </span>
        }
      >
        {status === "error" ? (
          <div className={styles.empty}>
            No data for this day{error ? <span className="muted"> ({error})</span> : null}.
          </div>
        ) : (
          <DayTimeline day={day} cursor={cursor} onCursor={setCursor} />
        )}
      </Tile>

      <ChargingSchedule day={day} />

      <div className={styles.lower}>
        <Tile
          padding="none"
          className={styles.jobsPanel}
          title="Jobs"
          note={day ? `${day.jobs.length} ${day.jobs.length === 1 ? "job" : "jobs"}` : ""}
        >
          <JobsList day={day} onPick={setCursor} />
        </Tile>

        <Tile padding="none" className={styles.mapPanel} title="Track" note="Colored by activity">
          <div className={styles.mapBox}>
            <TrackMap day={day} cursor={cursor} />
          </div>
        </Tile>
      </div>


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
      <path d="M4 1.5L8.5 6 4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
