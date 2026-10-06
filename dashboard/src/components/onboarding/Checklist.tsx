"use client";

import { useState } from "react";
import { STEP_IDS, useOnboarding, type StepId } from "./OnboardingProvider";
import styles from "./Checklist.module.css";

const STEPS: Record<StepId, { title: string; line: string }> = {
  play: { title: "Play the replay", line: "Press play or pause in the transport row." },
  select: { title: "Select a tug", line: "Click a boat on the map or a row in the fleet." },
  slider: { title: "Move the battery slider", line: "Watch the headline change with pack size." },
  openDay: { title: "Open a tug day", line: "Open day shows one day in full detail." },
};

/** Floating panel, bottom-right of the console. Collapses to a pill on phones. */
export default function Checklist() {
  const { state, loaded, open, setOpen, requestTour, tourActive } = useOnboarding();
  const [expanded, setExpanded] = useState(false);
  if (!loaded || !open || tourActive) return null;

  const done = STEP_IDS.filter((id) => state.steps[id]).length;
  const total = STEP_IDS.length;
  const r = 12;
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
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r={r} fill="none" stroke="var(--d-line-2)" strokeWidth="2" />
              <circle
                cx="15"
                cy="15"
                r={r}
                fill="none"
                stroke="var(--d-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - done / total)}
                transform="rotate(-90 15 15)"
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
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7.5" fill="var(--d-fg)" />
                      <path d="M4.8 8.2l2.1 2.1 4.3-4.5" fill="none" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7.5" fill="none" stroke="var(--d-line-2)" strokeWidth="1" />
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
          <button type="button" className="btn" onClick={requestTour}>
            Take the tour
          </button>
          <button type="button" className={`btn btnGhost ${styles.collapse}`} onClick={() => setExpanded(false)}>
            Hide
          </button>
        </div>
      </section>
    </div>
  );
}
