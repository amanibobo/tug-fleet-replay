import Link from "next/link";
import Tracks from "./diagrams/Tracks";
import Labels from "./diagrams/Labels";
import Battery from "./diagrams/Battery";
import Replay from "./diagrams/Replay";
import styles from "./HowItWorks.module.css";

type Cell = {
  index: string;
  title: string;
  line: string;
  chips: [string, string];
  Diagram: () => React.ReactElement;
};

const CELLS: Cell[] = [
  {
    index: "01 / Tracks",
    title: "Real tracks.",
    line: "NOAA AIS positions for 22 harbor tugs, one week, resampled to one minute.",
    chips: ["San Pedro Bay", "Dec 2–8 2024"],
    Diagram: Tracks,
  },
  {
    index: "02 / Labels",
    title: "Labeled minutes.",
    line: "Transit, assist beside a real ship, idle, charging at a detected dock.",
    chips: ["Speed", "Ship proximity"],
    Diagram: Labels,
  },
  {
    index: "03 / Battery",
    title: "Battery simulation.",
    line: "Power per activity, a generator that cuts in at 15%, shore charging at the dock.",
    chips: ["6,000 kWh", "config.yaml"],
    Diagram: Battery,
  },
  {
    index: "04 / Replay",
    title: "Live replay.",
    line: "Published like a real boat would, into AWS IoT Core or a local socket, into the console.",
    chips: ["MQTT", "WebSocket"],
    Diagram: Replay,
  },
];

/** The schematic "how it works" grid under the landing's fine print: four line-art diagrams, one slow loop each. */
export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works">
      <h2 id="how-it-works" className={styles.title}>
        how it works
      </h2>
      <div className={styles.grid}>
        {CELLS.map(({ index, title, line, chips, Diagram }) => (
          <article key={index} className={styles.cell}>
            <p className={styles.index}>{index}</p>
            <div className={styles.frame} aria-hidden>
              <span className={`${styles.bracket} ${styles.tl}`} />
              <span className={`${styles.bracket} ${styles.tr}`} />
              <span className={`${styles.bracket} ${styles.bl}`} />
              <span className={`${styles.bracket} ${styles.br}`} />
              <Diagram />
            </div>
            <h3 className={styles.cellTitle}>{title}</h3>
            <p className={styles.line}>{line}</p>
            <p className={styles.chips}>
              {chips.map((chip) => (
                <span key={chip} className={styles.chip}>
                  {chip}
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>
      <p className={styles.more}>
        <Link href="/docs" className={styles.moreLink}>
          read how I built it
        </Link>
      </p>
    </section>
  );
}
