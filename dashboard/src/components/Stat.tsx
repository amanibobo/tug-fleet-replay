import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface Props {
  label?: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
}

/** Label above, value below; the unit sits after the value in 12px ink-3. */
export default function Stat({ label, value, unit, hint, className }: Props) {
  return (
    <div className={`${styles.stat} ${className ?? ""}`}>
      {label ? <span className="label">{label}</span> : null}
      <div className={`stat ${styles.value}`}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
