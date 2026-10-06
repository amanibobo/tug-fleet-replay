"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "./onboarding/OnboardingProvider";
import styles from "./Nav.module.css";

export const GITHUB_URL = "https://github.com/amanibobo/tug-fleet-replay";
export const PORTFOLIO_URL = "https://amanibobo.vercel.app";
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
          <a href={PORTFOLIO_URL} className={styles.textLink} target="_blank" rel="noreferrer">
            Portfolio
          </a>
          <a href={GITHUB_URL} className={styles.textLink} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/app" className={`btn ${styles.cta}`}>
            Open the console
          </Link>
        </nav>
      ) : (
        <nav className={styles.links} aria-label="Primary">
          <Link href="/" className={`${styles.textLink} ${styles.hideNarrow}`}>
            Home
          </Link>
          <a href={GITHUB_URL} className={`${styles.textLink} ${styles.hideNarrow}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={FEEDBACK_URL} className={`${styles.textLink} ${styles.hideNarrow}`}>
            Feedback
          </a>
          <button
            type="button"
            className={styles.progress}
            onClick={() => onboarding.setOpen(!onboarding.open)}
            aria-label={`Getting started, ${done} of ${total} done`}
            aria-pressed={onboarding.open}
            data-done={done === total || undefined}
          >
            <span className={styles.progressBar} aria-hidden>
              <span className={styles.progressFill} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </span>
            <span>{done === total ? "All set" : `Get started ${done}/${total}`}</span>
          </button>
        </nav>
      )}
    </header>
  );
}
