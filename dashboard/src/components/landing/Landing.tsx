import Image from "next/image";
import Link from "next/link";
import DataPath from "./DataPath";
import DataSection from "./DataSection";
import HarborDiagram from "./HarborDiagram";
import LandingFooter from "./LandingFooter";
import NumbersStrip from "./NumbersStrip";
import ProductTiles from "./ProductTiles";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";

const STEPS = [
  {
    title: "Real tracks",
    line: "AIS positions from NOAA, one week, one minute apart.",
  },
  {
    title: "Labeled minutes",
    line: "Transit, assist next to a real ship, idle, charging at a detected dock.",
  },
  {
    title: "Battery simulation",
    line: "Power per activity, generator cut-in, shore charging, every number in config.yaml.",
  },
  {
    title: "Live replay",
    line: "Published like a real boat would, into AWS IoT or a local socket, into this console.",
  },
];

const START = [
  { title: "Open the console", line: "The week is already loaded. Press play.", href: "/app", cta: "Open the console" },
  { title: "Take the tour", line: "Five stops, one minute, on the live console.", href: "/app?tour=1", cta: "Take the tour" },
  { title: "Read the data notes", line: "What is measured, what is estimated, and why.", href: "#data", cta: "Read the notes" },
];

export default function Landing() {
  return (
    <>
      <main className={styles.main}>
        {/* 1. Hero */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className="chip chipBlue">Real Port of Los Angeles traffic</span>
            <h1 className="hero">See a tug fleet run on batteries, before it exists.</h1>
            <p className={styles.heroSub}>
              Tugboard replays a week of real harbor traffic as hybrid-electric telemetry and shows what battery size
              keeps the generator off.
            </p>
            <div className={styles.heroActions}>
              <Link href="/app" className="btn">
                Open the console
              </Link>
              <a href="#demo" className="btn btnGhost">
                Watch the demo
              </a>
            </div>
          </div>

          <div className={styles.demoWrap} id="demo">
            <svg className={styles.heroWaves} viewBox="0 0 640 40" preserveAspectRatio="none" aria-hidden>
              <path className={styles.heroWaveA} d={WAVE_A} fill="none" stroke="var(--blue)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
              <path className={styles.heroWaveB} d={WAVE_B} fill="none" stroke="var(--teal)" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className={styles.demo}>
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
                <svg width="20" height="22" viewBox="0 0 10 12" aria-hidden>
                  <path d="M0 0l10 6-10 6z" fill="currentColor" />
                </svg>
              </button>
              <span className={`chip ${styles.demoChip}`}>Demo video, 75 s, coming soon</span>
            </div>
          </div>
        </section>

        {/* 2. Numbers strip */}
        <NumbersStrip />

        {/* 3. How it works */}
        <section id="how" className={styles.section}>
          <h2 className="section">How it works</h2>
          <Reveal as="ol" className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={`tb-tile ${styles.step}`}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.stepTitle}>{s.title}</span>
                <span className={styles.stepLine}>{s.line}</span>
              </li>
            ))}
          </Reveal>
          <div className={styles.pathStrip}>
            <DataPath />
            <p className={styles.caption}>Each minute leaves the replayer as one telemetry message and arrives in the console the way a real fleet&apos;s would.</p>
          </div>
        </section>

        {/* 3b. One tug-day */}
        <section id="day" className={styles.section}>
          <h2 className="section">One tug-day, minute by minute</h2>
          <HarborDiagram />
          <p className={styles.caption}>Labels come from speed, distance to a real ship, and distance to a detected dock.</p>
        </section>

        {/* 4. Product tiles */}
        <section id="tools" className={styles.section}>
          <h2 className="section">Everything in the box</h2>
          <ProductTiles />
        </section>

        {/* 5. Get started */}
        <section id="start" className={styles.section}>
          <h2 className="section">Get started</h2>
          <Reveal className={styles.start}>
            {START.map((s) => (
              <div key={s.title} className={`tb-tile ${styles.startTile}`}>
                <span className={styles.toolTitle}>{s.title}</span>
                <span className={styles.toolLine}>{s.line}</span>
                {s.href.startsWith("#") ? (
                  <a href={s.href} className={`btn ${styles.startBtn}`}>
                    {s.cta}
                  </a>
                ) : (
                  <Link href={s.href} className={`btn ${styles.startBtn}`}>
                    {s.cta}
                  </Link>
                )}
              </div>
            ))}
          </Reveal>
        </section>

        {/* 6. Data and assumptions */}
        <DataSection />
      </main>

      {/* 7. Footer band */}
      <LandingFooter />
    </>
  );
}

const WAVE_A = "M0 20 q 40 -14 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0";
const WAVE_B = "M-40 26 q 40 -10 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0";
