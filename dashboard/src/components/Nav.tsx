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

  if (landing) {
    return (
      <header className={`${styles.nav} ${styles.landing}`} data-landing>
        <nav className={styles.landingLinks} aria-label="Links">
          <a href={PORTFOLIO_URL} className={styles.landingLink} target="_blank" rel="noreferrer">
            portfolio
          </a>
          <a href={GITHUB_URL} className={styles.landingLink} target="_blank" rel="noreferrer">
            github
          </a>
        </nav>
        <Link href="/" className={styles.landingWordmark} aria-label="Tugboard home">
          tugboard
        </Link>
        <div className={styles.landingRight}>
          <Link href="/app" className={styles.landingCta}>
            open the console
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.wordmark} aria-label="Tugboard home">
        Tugboard
      </Link>

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
    </header>
  );
}
