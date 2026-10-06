import type { CSSProperties, ReactNode } from "react";
import styles from "./Tile.module.css";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: "none" | "sm" | "md";
  /** Title row: tile title and a note on the right. */
  title?: ReactNode;
  note?: ReactNode;
  /** White tile for nesting inside gray ones. */
  tone?: "gray" | "white";
  id?: string;
  "data-tour"?: string;
  "aria-label"?: string;
}

/** A soft gray rounded surface with no border. Separation comes from whitespace, never lines. */
export default function Tile({ children, className, style, padding = "md", title, note, tone = "gray", ...rest }: Props) {
  return (
    <section
      className={["tb-tile", styles.tile, styles[`pad_${padding}`], tone === "white" ? styles.white : "", className ?? ""].join(" ")}
      style={style}
      {...rest}
    >
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
