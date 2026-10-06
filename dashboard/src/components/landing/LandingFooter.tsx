import Link from "next/link";
import { GITHUB_URL } from "@/components/Nav";
import AsciiTug from "./AsciiTug";
import styles from "./LandingFooter.module.css";

/** Full-bleed navy band with the ASCII tug, the wordmark, links and the independence line. */
export default function LandingFooter() {
  return (
    <footer className={styles.band}>
      <div className={styles.inner}>
        <AsciiTug />
        <div className={styles.row}>
          <Link href="/" className={styles.wordmark}>
            Tugboard
          </Link>
          <nav className={styles.links} aria-label="Footer">
            <Link href="/app">Console</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="#data">Data</a>
          </nav>
          <p className={styles.legal}>Independent project, not affiliated with Arc. Tracks: NOAA AIS, Dec 2–8 2024.</p>
        </div>
      </div>
    </footer>
  );
}
