"use client";

import Link from "next/link";
import { useState } from "react";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import DemoModal, { YouTubeMark } from "./DemoModal";
import DitherTug from "./DitherTug";
import Grain from "./Grain";
import styles from "./Paper.module.css";

/** An alternate landing: four corners of small type and one dithered tug. Clicking the tug plays the demo. */
export default function PaperLanding() {
  const [demo, setDemo] = useState(false);

  return (
    <main className={styles.page} data-paper>
      <Grain />
      <header className={styles.corners} aria-label="Page">
        <div className={styles.tl}>
          <span className={styles.k}>Tugboard</span>
          <span className={styles.v}>Fleet replay for hybrid-electric tugs</span>
        </div>
      </header>

      <section className={styles.stage} aria-label="A harbor tug, dithered">
        <div
          className={styles.hoverZone}
          onClick={() => setDemo(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDemo(true);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Play the demo video"
        >
          <DitherTug ink={[38, 32, 24]} mode="dash" />
        </div>
      </section>

      <footer className={styles.corners}>
        <div className={styles.bl}>
          <p className={styles.blurb}>
            Tugs at the Port of Los Angeles burn diesel all day. Tugboard takes one real week of their traffic, labels
            every minute, and runs it on a battery instead. At 6,000 kWh, 71% of 154 tug-days never start the
            generator. The rest is a slider.
          </p>
          <span className={styles.v}>Independent project. Tracks from NOAA AIS, Dec 2 to 8, 2024.</span>
        </div>
        <div className={styles.center}>
          <button type="button" className={styles.demoLink} onClick={() => setDemo(true)}>
            <YouTubeMark />
            <span>Demo video</span>
          </button>
          <ul className={styles.list} aria-label="What is inside">
            <li>Real tracks</li>
            <li>Labeled minutes</li>
            <li>Battery simulation</li>
          </ul>
        </div>
        <nav className={styles.br} aria-label="Links">
          <Link href="/app" className={styles.link}>
            Open the console
          </Link>
          <a href={GITHUB_URL} className={styles.link} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={PORTFOLIO_URL} className={styles.link} target="_blank" rel="noreferrer">
            Portfolio
          </a>
          <Link href="/docs" className={styles.link}>
            How I built it
          </Link>
        </nav>
      </footer>
      <DemoModal open={demo} onClose={() => setDemo(false)} />
    </main>
  );
}
