"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "./onboarding/OnboardingProvider";
import ThemeSquare from "./theme/ThemeSquare";
import styles from "./Nav.module.css";

export const GITHUB_URL = "https://github.com/amanibobo/tug-fleet-replay";
export const PORTFOLIO_URL = "https://amanibobo.vercel.app";
const FEEDBACK_URL = "mailto:amanibobo1@gmail.com?subject=Tugboard%20feedback";

export default function Nav() {
  const path = usePathname();
  const docs = path === "/docs" || path.startsWith("/docs/");
  const onboarding = useOnboarding();
  const done = Object.values(onboarding.state.steps).filter(Boolean).length;
  const total = Object.keys(onboarding.state.steps).length;
  if (path === "/") return null; // the paper landing draws its own corners

  if (docs) {
    return (
      <header className={`${styles.nav} ${styles.landing}`} data-landing>
        <nav className={styles.landingLinks} aria-label="Links">
          <a href={PORTFOLIO_URL} className={styles.landingLink} target="_blank" rel="noreferrer">
            portfolio
          </a>
          <a href={GITHUB_URL} className={styles.landingLink} target="_blank" rel="noreferrer">
            github
          </a>
          <Link href="/docs" className={styles.landingLink} data-active={docs || undefined} aria-current={docs ? "page" : undefined}>
            docs
          </Link>
          <ThemeSquare />
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

  const tugDay = path.startsWith("/app/tugs/");

  return (
    <header className={styles.nav}>
      <div className={styles.left}>
        <Link href="/" className={styles.wordmark} aria-label="Tugboard home">
          tugboard
        </Link>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <span className={styles.sep} aria-hidden>
            /
          </span>
          {tugDay ? (
            <>
              <Link href="/app" className={styles.crumbLink}>
                Fleet
              </Link>
              <span className={styles.sep} aria-hidden>
                /
              </span>
              <span className={styles.crumb} aria-current="page">
                Tug day
              </span>
            </>
          ) : (
            <span className={styles.crumb} aria-current="page">
              Fleet
            </span>
          )}
        </nav>
      </div>

      <nav className={styles.links} aria-label="Primary">
        <Link href="/docs" className={`${styles.textLink} ${styles.hideNarrow}`}>
          docs
        </Link>
        <a href={GITHUB_URL} className={`${styles.textLink} ${styles.hideNarrow}`} target="_blank" rel="noreferrer">
          github
        </a>
        <ThemeSquare className={styles.themeSquare} />
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
        <a href={FEEDBACK_URL} className={`${styles.feedback} ${styles.hideNarrow}`}>
          Feedback
        </a>
      </nav>
    </header>
  );
}
