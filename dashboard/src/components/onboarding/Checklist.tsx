"use client";

import { useState } from "react";
import { STEP_IDS, useOnboarding, type StepId } from "./OnboardingProvider";
import styles from "./Checklist.module.css";

const STEPS: Record<StepId, { title: string; line: string }> = {
  play: { title: "Play the replay", line: "Press play or pause in the clock tile." },
  select: { title: "Select a tug", line: "Click a boat on the map or a row in the fleet." },
  slider: { title: "Move the battery slider", line: "Watch the headline change with pack size." },
  openDay: { title: "Open a tug day", line: "Open day shows one day in full detail." },
};

/** Frigade-style floating card, bottom-right of the console. Collapses to a pill on phones. */
export default function Checklist() {
  const { state, loaded, open, setOpen, requestTour, tourActive } = useOnboarding();
  const [expanded, setExpanded] = useState(false);
  if (!loaded || !open || tourActive) return null;

  const done = STEP_IDS.filter((id) => state.steps[id]).length;
  const total = STEP_IDS.length;
  const r = 14;
  const c = 2 * Math.PI * r;

  return (
    <div className={styles.root} data-expanded={expanded || undefined}>
      <button type="button" className={styles.pill} onClick={() => setExpanded(true)} aria-expanded={expanded}>
        <span className={styles.pillDot} aria-hidden />
        Get started {done}/{total}
      </button>

      <section className={styles.card} aria-label="Getting started">
        <header className={styles.head}>
          <div className={styles.ring} aria-hidden>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r={r} fill="none" stroke="var(--tile-2)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r={r}
                fill="none"
                stroke="var(--green)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - done / total)}
                transform="rotate(-90 18 18)"
                className={styles.ringFill}
              />
            </svg>
          </div>
          <div className={styles.titles}>
            <h2 className="heading">Get started</h2>
            <span className={`label ${styles.progress}`}>
              {done} of {total}
            </span>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => {
              setExpanded(false);
              setOpen(false);
            }}
            aria-label="Dismiss checklist"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <ol className={styles.steps}>
          {STEP_IDS.map((id) => {
            const s = STEPS[id];
            const ok = state.steps[id];
            return (
              <li key={id} className={styles.step} data-done={ok || undefined}>
                <span className={styles.mark} aria-hidden>
                  {ok ? (
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <circle cx="9" cy="9" r="8.25" fill="var(--ink)" />
                      <path d="M5.5 9.3l2.3 2.3 4.7-4.9" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <circle cx="9" cy="9" r="8.25" fill="none" stroke="var(--tile-2)" strokeWidth="1.5" />
                    </svg>
                  )}
                </span>
                <div className={styles.stepText}>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={styles.stepLine}>{s.line}</span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={styles.actions}>
          <button type="button" className="btn btnSmall" onClick={requestTour}>
            Take the tour
          </button>
          <button type="button" className={`btn btnGhost btnSmall ${styles.collapse}`} onClick={() => setExpanded(false)}>
            Hide
          </button>
        </div>
      </section>
    </div>
  );
}
