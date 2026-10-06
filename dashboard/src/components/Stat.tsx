import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface Props {
  label?: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
  /** Value size: 16px in the rail (default), 20px on the tug day page. */
  size?: "md" | "lg";
}

/** Label 11px fg-3 above, value 16px/500 below, unit 12px fg-3. */
export default function Stat({ label, value, unit, hint, className, size = "md" }: Props) {
  return (
    <div className={`${styles.stat} ${className ?? ""}`}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={`stat ${styles.value} ${size === "lg" ? styles.lg : ""}`}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
