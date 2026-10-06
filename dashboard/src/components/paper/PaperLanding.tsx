"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import DitherTug from "./DitherTug";
import Grain from "./Grain";
import styles from "./Paper.module.css";
import { THEMES, themeStore } from "./themes";

/** An alternate landing: four corners of small type, one dithered tug, three color skins. */
export default function PaperLanding() {
  const id = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServer);
  const index = Math.max(0, THEMES.findIndex((t) => t.id === id));
  const theme = THEMES[index];
  const next = THEMES[(index + 1) % THEMES.length];
  const cycle = () => themeStore.set(next.id);

  return (
    <main
      className={styles.page}
      data-paper
      data-theme={theme.id}
      style={{ "--p-bg": theme.bg, "--p-fg": theme.fg, "--p-muted": theme.muted } as React.CSSProperties}
    >
      <Grain back={theme.grain.back} colors={theme.grain.colors} intensity={theme.grain.intensity} />
      <header className={styles.corners} aria-label="Page">
        <div className={styles.tl}>
          <span className={styles.brand}>
            <span className={styles.k}>Tugboard</span>
            <button
              type="button"
              className={styles.swatch}
              style={{ background: theme.swatch }}
              onClick={cycle}
              aria-label={`Switch colors to ${next.label}`}
              title={`Colors: ${theme.label}. Click for ${next.label}.`}
            />
          </span>
          <span className={styles.v}>Fleet replay for hybrid-electric tugs</span>
        </div>
        <div className={styles.tr}>
          <span className={styles.k}>Port of Los Angeles</span>
          <span className={styles.v}>22 tugs, one week, every minute</span>
        </div>
      </header>

      <section className={styles.stage} aria-label="A harbor tug, dithered">
        <DitherTug ink={theme.ink} mode={theme.mode} />
      </section>

      <footer className={styles.corners}>
        <div className={styles.bl}>
          <span className={styles.k}>Independent project</span>
          <span className={styles.v}>Tracks from NOAA AIS, Dec 2 to 8, 2024</span>
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
