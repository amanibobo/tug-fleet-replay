"use client";

import Link from "next/link";
import { GITHUB_URL } from "@/components/Nav";
import { useSummary } from "@/lib/useSummary";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";

interface Tool {
  title: string;
  line: string;
  href: string;
  cta: string;
  external?: boolean;
  isNew?: boolean;
}

/** Six tool tiles. Tug-day links point at the first tug on the first day once the summary loads. */
export default function ProductTiles() {
  const { summary } = useSummary();
  const first = summary?.tugs[0];
  const dayHref = first ? `/app/tugs/${encodeURIComponent(first.tug_id)}?date=${summary?.dataset.start ?? ""}` : "/app";

  const tools: Tool[] = [
    { title: "Fleet replay", line: "The whole week on a map, every tug at once, at 60x to 300x.", href: "/app", cta: "Open the console" },
    { title: "Tug days", line: "One tug, one day: battery curve, activity band, jobs and track.", href: dayHref, cta: "Open a tug day" },
    { title: "Charging planner", line: "Arrival charging against a scheduled plan on the tariff bands.", href: dayHref, cta: "See the schedule" },
    { title: "Rerun inspector", line: "The full-fidelity recording of a day, scrubbable in the browser.", href: dayHref, cta: "Open a recording", isNew: true },
    { title: "Live recorder", line: "Publish the replay like a real boat, into AWS IoT or a socket.", href: GITHUB_URL, cta: "Read the code", external: true },
    { title: "Data and assumptions", line: "Every parameter behind the numbers, with its source or caveat.", href: "#data", cta: "Read the notes" },
  ];

  return (
    <Reveal className={styles.tools}>
      {tools.map((t) => {
        const inner = (
          <>
            <div className={styles.toolTop}>
              <span className={styles.toolTitle}>{t.title}</span>
              {t.isNew ? <span className="chip chipInk">New</span> : null}
            </div>
            <span className={styles.toolLine}>{t.line}</span>
            <span className={styles.toolCta}>{t.cta}</span>
          </>
        );
        return t.external ? (
          <a key={t.title} href={t.href} className={`tb-tile ${styles.tool}`} target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          <Link key={t.title} href={t.href} className={`tb-tile ${styles.tool}`}>
            {inner}
          </Link>
        );
      })}
    </Reveal>
  );
}
