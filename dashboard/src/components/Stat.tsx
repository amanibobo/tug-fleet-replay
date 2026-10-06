import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface Props {
  label?: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
}

/** Label 13px ink-3 above, value 26px/600 below, unit 13px ink-3. */
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
