"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "./onboarding/OnboardingProvider";
import styles from "./Nav.module.css";

export const GITHUB_URL = "https://github.com/amanibobo/tug-fleet-replay";
const FEEDBACK_URL = "mailto:amanibobo1@gmail.com?subject=Tugboard%20feedback";

export default function Nav() {
  const path = usePathname();
  const landing = path === "/";
  const onboarding = useOnboarding();
  const done = Object.values(onboarding.state.steps).filter(Boolean).length;
  const total = Object.keys(onboarding.state.steps).length;

  return (
    <header className={styles.nav} data-landing={landing || undefined}>
      <Link href="/" className={styles.wordmark} aria-label="Tugboard home">
        Tugboard
      </Link>

      {landing ? (
        <nav className={styles.links} aria-label="Primary">
          <a href="#how" className={`${styles.textLink} ${styles.hideNarrow}`}>
            How it works
          </a>
          <a href="#data" className={`${styles.textLink} ${styles.hideNarrow}`}>
            Data
          </a>
          <a href={GITHUB_URL} className={`${styles.textLink} ${styles.hideNarrow}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/app" className="btn">
            Open the console
          </Link>
        </nav>
      ) : (
        <nav className={styles.links} aria-label="Primary">
          <Link href="/" className={`${styles.textLink} ${styles.hideNarrow}`}>
            Landing
          </Link>
          <a href={GITHUB_URL} className={`btn btnSecondary ${styles.hideNarrow}`} target="_blank" rel="noreferrer" title="Source on GitHub">
            Docs
          </a>
          <a href={FEEDBACK_URL} className={`btn btnSecondary ${styles.hideNarrow}`}>
            Feedback
          </a>
          <button
            type="button"
            className={styles.avatar}
            onClick={() => onboarding.setOpen(!onboarding.open)}
            aria-label={`Getting started, ${done} of ${total} done`}
            aria-pressed={onboarding.open}
            title="Getting started"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {done < total ? <span className={styles.dot} aria-hidden /> : null}
          </button>
        </nav>
      )}
    </header>
  );
}
