"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import DitherTug from "./DitherTug";
import Grain from "./Grain";
import styles from "./Paper.module.css";

/** Set this to a public video path (for example "/demo.mp4") once the demo exists; the card autoplays it muted. */
const DEMO_VIDEO: string | null = null;

/** An alternate landing: four corners of small type and one dithered tug. Hovering the tug shows the demo. */
export default function PaperLanding() {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);

  const move = useCallback((e: React.MouseEvent) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    setPos({ x: e.clientX - box.left, y: e.clientY - box.top });
  }, []);

  return (
    <main className={styles.page} data-paper>
      <Grain />
      <header className={styles.corners} aria-label="Page">
        <div className={styles.tl}>
          <span className={styles.k}>Tugboard</span>
          <span className={styles.v}>Fleet replay for hybrid-electric tugs</span>
        </div>
        <div className={styles.tr}>
          <span className={styles.k}>Port of Los Angeles</span>
          <span className={styles.v}>22 tugs, one week, every minute</span>
        </div>
      </header>

      <section className={styles.stage} aria-label="A harbor tug, dithered">
        <div
          ref={stage}
          className={styles.hoverZone}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseMove={move}
          onClick={() => setHover((h) => !h)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          tabIndex={0}
          role="button"
          aria-label="Show the demo video"
          aria-expanded={hover}
        >
          <DitherTug ink={[38, 32, 24]} mode="dash" />
          <div
            className={styles.demoCard}
            data-open={hover || undefined}
            style={{ left: pos.x, top: pos.y }}
            aria-hidden={!hover}
          >
            {DEMO_VIDEO ? (
              <video className={styles.demoMedia} src={DEMO_VIDEO} poster="/poster.png" muted loop autoPlay playsInline />
            ) : (
              <Image src="/poster.png" alt="" width={1280} height={720} className={styles.demoMedia} unoptimized />
            )}
            <span className={styles.demoPlay} aria-hidden>
              <svg width="12" height="14" viewBox="0 0 10 12">
                <path d="M0 0l10 6-10 6z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.demoCaption}>{DEMO_VIDEO ? "Demo, 75 s" : "Demo video, coming soon"}</span>
          </div>
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
        <ul className={styles.list} aria-label="What is inside">
          <li>Real tracks</li>
          <li>Labeled minutes</li>
          <li>Battery simulation</li>
        </ul>
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
    </main>
  );
}
