import type { CSSProperties, ReactNode } from "react";
import styles from "./Tile.module.css";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: "none" | "sm" | "md";
  /** Title row: section title and a note on the right. */
  title?: ReactNode;
  note?: ReactNode;
  id?: string;
  "data-tour"?: string;
  "aria-label"?: string;
}

/** A hairline-bordered section on the page background. No fill; separation comes from lines, not tiles. */
export default function Tile({ children, className, style, padding = "md", title, note, ...rest }: Props) {
  return (
    <section className={["tb-tile", styles.tile, styles[`pad_${padding}`], className ?? ""].join(" ")} style={style} {...rest}>
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
