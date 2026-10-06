import { dateRange } from "@/lib/format";
import type { DatasetInfo } from "@/lib/types";
import styles from "./Footer.module.css";

interface Props {
  className?: string;
  /** Dataset dates from summary.json or fleet.json; the Dec 2024 recording is the fallback text. */
  dataset?: DatasetInfo | null;
}

export default function Footer({ className, dataset }: Props) {
  const dates = dataset ? dateRange(dataset.start, dataset.end, false) : "Dec 2–8 2024";
  const source = dataset?.source ?? "NOAA AIS";
  return (
    <p className={`footer ${styles.footer} ${className ?? ""}`}>
      Independent project, not affiliated with Arc. Tracks: {source}, {dates}.
    </p>
  );
}
