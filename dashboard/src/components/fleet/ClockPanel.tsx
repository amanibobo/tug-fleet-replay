"use client";

import { useMemo } from "react";
import Slider from "@/components/Slider";
import { DAY_MS, hhmmss, isoDate, prettyDate } from "@/lib/format";
import { SPEEDS, type FleetState } from "@/lib/useFleet";
import styles from "./ClockPanel.module.css";

type Props = Pick<FleetState, "clock" | "playing" | "speed" | "setPlaying" | "setSpeed" | "seek" | "range" | "controllable" | "status">;

/** Transport row (play, clock, speed) over a 2px week scrubber with day ticks. */
export default function ClockPanel({ clock, playing, speed, setPlaying, setSpeed, seek, range, controllable, status }: Props) {
  const days = useMemo(() => {
    if (!range) return [];
    const out: { ms: number; label: string }[] = [];
    for (let ms = range.start; ms < range.end; ms += DAY_MS) {
      out.push({ ms, label: prettyDate(ms, false) });
    }
    return out;
  }, [range]);

  return (
    <section className={styles.panel} aria-label="Replay clock" data-tour="clock">
      <div className={styles.row}>
        <button
          type="button"
          className={styles.play}
          onClick={() => setPlaying(!playing)}
          disabled={!controllable || status !== "ready"}
          aria-label={playing ? "Pause replay" : "Play replay"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <span className={`mono ${styles.clock}`} aria-live="off">
          {clock != null ? (
            <>
              {prettyDate(clock)}
              <span className={styles.dot}> · </span>
              {hhmmss(clock)}
              <span className={styles.tz}> UTC</span>
            </>
          ) : status === "error" ? (
            "No data"
          ) : (
            "Waiting for data"
          )}
        </span>

        {controllable ? (
          <div className={`segmented ${styles.speed}`} role="radiogroup" aria-label="Replay speed">
            {SPEEDS.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => setSpeed(s)} aria-label={`${s}x`}>
                {s}
              </button>
            ))}
          </div>
        ) : (
          <span className={`chip chipGreen ${styles.speed}`}>Live</span>
        )}
      </div>

      <div className={styles.scrub}>
        <Slider
          ariaLabel="Scrub the week"
          min={range?.start ?? 0}
          max={range ? range.end - 1 : 1}
          step={60_000}
          value={clock ?? 0}
          disabled={!controllable || !range}
          onChange={seek}
        />
        <div className={styles.ticks} aria-hidden>
          {days.map((d) => (
            <button
              key={d.ms}
              type="button"
              className={styles.tick}
              data-active={clock != null && isoDate(clock) === isoDate(d.ms) ? "true" : undefined}
              onClick={() => seek(d.ms)}
              disabled={!controllable}
              tabIndex={-1}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
      <path d="M1 1l8 5-8 5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
      <rect x="1" y="1" width="2.5" height="10" fill="currentColor" />
      <rect x="6.5" y="1" width="2.5" height="10" fill="currentColor" />
    </svg>
  );
}
