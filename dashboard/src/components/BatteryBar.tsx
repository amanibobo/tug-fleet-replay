import { socColor } from "@/lib/format";
import styles from "./BatteryBar.module.css";

interface Props {
  /** 0..1 */
  soc: number;
  width?: number | string;
  height?: number;
  className?: string;
  title?: string;
}

/** 3px bar on a faint track; fill green, amber under 35%, red under 15%. */
export default function BatteryBar({ soc, width = "100%", height = 3, className, title }: Props) {
  const pct = Math.max(0, Math.min(1, soc)) * 100;
  return (
    <div
      className={`${styles.track} ${className ?? ""}`}
      style={{ width, height }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label="State of charge"
      title={title}
    >
      <div className={styles.fill} style={{ width: `${pct}%`, background: socColor(soc) }} />
    </div>
  );
}
