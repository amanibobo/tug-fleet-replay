"use client";

import FixtureBadge from "@/components/FixtureBadge";
import Footer from "@/components/Footer";
import Footnote from "@/components/Footnote";
import { useSummary } from "@/lib/useSummary";
import Architecture from "./Architecture";
import styles from "./AboutContent.module.css";

/** Lets long config keys wrap at underscores on narrow screens. */
function breakable(key: string) {
  const parts = key.split("_");
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 ? "_" : null}
      {i > 0 ? <wbr /> : null}
      {part}
    </span>
  ));
}

export default function AboutContent() {
  const { summary, status } = useSummary();

  return (
    <>
      <section className={styles.hero}>
        <h1 className={`title ${styles.h1}`}>
          Real tug traffic, replayed as if every tug were a hybrid-electric boat streaming telemetry.
        </h1>
        <p className={styles.lede}>
          The Port of Los Angeles and Port of Long Beach publish nothing about tug powertrains, but every tug
          broadcasts its position over AIS. This project takes one week of those tracks (NOAA, Dec 2–8 2024),
          labels what each tug was doing minute by minute, and simulates a battery with a small generator behind
          it. The headline number is the share of tug-days that never needed the generator, as a function of
          battery size.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className="heading">How it works</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Tracks.</strong> Daily NOAA MarineCadastre AIS files are filtered to towing vessels inside
            San Pedro Bay and resampled to one-minute positions.
          </li>
          <li>
            <strong>Activity.</strong> Speed over ground is turned into idle, assist or transit with simple
            thresholds, median-smoothed, then grouped into jobs. Stops near known tug bases count as charging
            stops.
          </li>
          <li>
            <strong>Energy.</strong> Each activity gets a power estimate. The battery drains, charges at the dock,
            and a generator cuts in below a state-of-charge floor. All of it is tunable in{" "}
            <code className={styles.code}>config.yaml</code>.
          </li>
          <li>
            <strong>Replay.</strong> The week is replayed at 120x as a stream of telemetry messages, the same
            way a connected fleet would publish them. This dashboard is the console on the receiving end.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className="heading">Architecture</h2>
        <Architecture />
        <p className={styles.note}>
          In static mode the dashboard reads precomputed JSON from <code className={styles.code}>public/data</code>{" "}
          and replays it in the browser. In ws mode it subscribes to the WebSocket API and the same components render
          the live stream.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className="heading">Assumptions</h2>
          {summary?.fixture ? <FixtureBadge /> : null}
        </div>
        <p className={styles.body}>
          Every number below is an estimate unless its note cites a source. Arc has not published a power curve
          for its tugs; the assist figure is the weakest input and the slider on the fleet page exists so the
          headline can be read against it.
        </p>
        <Footnote />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Parameter</th>
                <th className={styles.numCol}>Value</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {status === "ready" && summary ? (
                summary.assumptions.map((a) => (
                  <tr key={a.key}>
                    <td className={`mono ${styles.keyCell}`}>{breakable(a.key)}</td>
                    <td className={`num ${styles.numCol}`}>
                      {typeof a.value === "number" ? a.value.toLocaleString("en-US") : a.value}
                    </td>
                    <td className={styles.noteCell}>{a.note}</td>
                  </tr>
                ))
              ) : status === "error" ? (
                <tr>
                  <td colSpan={3} className={styles.noteCell}>
                    Summary file unavailable.
                  </td>
                </tr>
              ) : (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className={styles.skeletonRow} aria-hidden>
                    <td colSpan={3} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {summary ? (
          <p className={styles.note}>
            Dataset: {summary.dataset.tugs} tugs, {summary.dataset.tug_days} tug-days, {summary.dataset.start} to{" "}
            {summary.dataset.end}. Default battery {summary.default_battery_kwh.toLocaleString("en-US")} kWh.
          </p>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className="heading">Independence</h2>
        <p className={styles.body}>
          This is an independent project. It is not affiliated with, endorsed by, or built with data from Arc
          Boats or any port authority. Vessel names and identifiers come from public AIS broadcasts. The
          powertrain, battery and tariff figures are public estimates, not measurements of any real vessel.
        </p>
      </section>

      <Footer dataset={summary?.dataset ?? null} />
    </>
  );
}
