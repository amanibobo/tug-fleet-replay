import Image from "next/image";
import Link from "next/link";
import { GITHUB_URL, PORTFOLIO_URL } from "@/components/Nav";
import styles from "./Landing.module.css";

export default function Landing() {
  return (
    <main className={styles.main}>
      <section className={styles.intro}>
        <h1 className={styles.title}>Tugboard</h1>
        <p className={styles.tagline}>Fleet replay for hybrid-electric tugs.</p>
        <div className={styles.actions}>
          <Link href="/app" className="btn">
            Open the console
          </Link>
          <a href={PORTFOLIO_URL} className={styles.link} target="_blank" rel="noreferrer">
            Portfolio
          </a>
          <a href={GITHUB_URL} className={styles.link} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </section>

      <section className={styles.demo} aria-label="Demo video">
        <Image
          src="/poster.png"
          alt="The Tugboard console with a tug selected"
          width={1280}
          height={720}
          className={styles.poster}
          priority
          unoptimized
        />
        <button type="button" className={styles.play} aria-label="Play the demo video (coming soon)">
          <svg width="18" height="20" viewBox="0 0 10 12" aria-hidden>
            <path d="M0 0l10 6-10 6z" fill="currentColor" />
          </svg>
        </button>
        <span className={styles.demoNote}>Demo video coming soon</span>
      </section>

      <section className={styles.about}>
        <p>
          Tugboard takes one week of real Port of Los Angeles tug traffic, recorded by NOAA from AIS broadcasts, and
          replays it as if every tug were a hybrid-electric boat streaming telemetry. Each minute is labeled transit,
          assist, idle or charging, a battery and generator are simulated on top, and the week streams into a fleet
          console the same way a connected fleet would publish it.
        </p>
        <p>
          The headline number is the share of tug-days that never start the generator at a given battery size. At
          6,000 kWh, the pack size announced for the first hybrid-electric tugs in this harbor, 71% of 154 tug-days ran
          on the battery alone. Drag the slider in the console to see how that moves.
        </p>
        <p className={styles.fine}>
          Independent project, not affiliated with any tug operator or boat builder. Tracks: NOAA AIS, Dec 2 to 8, 2024.
          Every powertrain number is a labeled estimate.
        </p>
      </section>
    </main>
  );
}
