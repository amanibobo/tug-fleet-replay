import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
}

export default function Stat({ label, value, unit, hint, className }: Props) {
  return (
    <div className={`${styles.stat} ${className ?? ""}`}>
      <span className="label">{label}</span>
      <div className={`${styles.value} num`}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
