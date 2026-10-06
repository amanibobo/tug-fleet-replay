import type { CSSProperties, ReactNode } from "react";
import styles from "./Panel.module.css";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: "none" | "sm" | "md";
  /** Title row: `.heading` left, a `.label` note right, hairline under. */
  title?: ReactNode;
  note?: ReactNode;
}

/** A flat paper-2 surface with a 1px hairline. */
export default function Panel({ children, className, style, padding = "md", title, note }: Props) {
  return (
    <section className={[styles.panel, styles[`pad_${padding}`], className ?? ""].join(" ")} style={style}>
      {title != null ? (
        <div className={styles.head}>
          <h2 className="heading">{title}</h2>
          {note != null ? <div className={`label ${styles.note}`}>{note}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
