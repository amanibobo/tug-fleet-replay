"use client";

import { useMemo } from "react";
import Slider from "@/components/Slider";
import Tile from "@/components/Tile";
import { DAY_MS, hhmmss, isoDate, prettyDate } from "@/lib/format";
import { SPEEDS, type FleetState } from "@/lib/useFleet";
import styles from "./ClockPanel.module.css";

type Props = Pick<FleetState, "clock" | "playing" | "speed" | "setPlaying" | "setSpeed" | "seek" | "range" | "controllable" | "status">;

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
    <Tile className={styles.panel} aria-label="Replay clock" data-tour="clock">
      <div className={styles.top}>
        <div className={styles.clock} aria-live="off">
          <span className={styles.date}>{clock != null ? prettyDate(clock) : "Waiting for data"}</span>
          <span className={styles.timeRow}>
            <span className={`mono ${styles.time}`}>{clock != null ? hhmmss(clock) : "--:--:--"}</span>
            <span className={styles.tz}>UTC</span>
          </span>
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className="btn btnIcon"
          onClick={() => setPlaying(!playing)}
          disabled={!controllable || status !== "ready"}
          aria-label={playing ? "Pause replay" : "Play replay"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="segmented" role="radiogroup" aria-label="Replay speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => setSpeed(s)} disabled={!controllable}>
              {s}x
            </button>
          ))}
        </div>
        {!controllable ? <span className={`chip chipGreen ${styles.live}`}>Live from server</span> : null}
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
    </Tile>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 10 12" aria-hidden>
      <path d="M0 0l10 6-10 6z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 10 12" aria-hidden>
      <rect x="0" y="0" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="6.5" y="0" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
