import Link from "next/link";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import DitherTug from "./DitherTug";
import Grain from "./Grain";
import styles from "./Paper.module.css";

/** An alternate landing: paper, four corners of small type, one dithered tug. */
export default function PaperLanding() {
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
        <DitherTug />
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
