import Image from "next/image";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import HowItWorks from "./HowItWorks";
import styles from "./Landing.module.css";

/** The landing: a black page, one headline, the demo frame, one paragraph, then the schematic "how it works" grid. */
export default function Landing() {
  return (
    <main className={styles.main} data-landing>
      <h1 className={styles.headline}>
        <span className={styles.line}>a tug fleet on batteries,</span>{" "}
        <span className={styles.line}>replayed from real traffic</span>
      </h1>

      <section className={styles.frame} aria-label="Demo video">
        <Image
          src="/poster.png"
          alt="The Tugboard console with a tug selected"
          width={1280}
          height={720}
          sizes="(max-width: 872px) 100vw, 840px"
          className={styles.poster}
          priority
          unoptimized
        />
        <span className={styles.word} aria-hidden>
          demo soon
        </span>
        <button type="button" className={styles.play} aria-label="Play the demo video (coming soon)">
          <svg width="20" height="22" viewBox="0 0 10 12" aria-hidden>
            <path d="M0 0l10 6-10 6z" fill="currentColor" />
          </svg>
        </button>
      </section>

      <section className={styles.copy}>
        <p className={styles.para}>
          the port of los angeles moves ships with tugs that burn diesel all day. tugboard takes one real week of that
          traffic, labels every minute of every tug, and runs it on a battery instead. at 6,000 kwh, the pack size
          announced for the first hybrid tugs in this harbor, 71% of 154 tug-days never start the generator. the rest
          is a slider.
        </p>
        <p className={styles.belief}>we think the harbor is ready to go electric.</p>
        <p className={styles.fine}>
          independent project, not affiliated with any operator or builder. tracks: noaa ais, dec 2 to 8, 2024. every
          powertrain number is a labeled estimate.
        </p>
        <p className={styles.mobileLinks}>
          <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
            portfolio
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            github
          </a>
        </p>
      </section>

      <HowItWorks />
    </main>
  );
}
