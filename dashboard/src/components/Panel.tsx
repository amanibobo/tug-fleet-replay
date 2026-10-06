import type { CSSProperties, ReactNode } from "react";
import styles from "./Panel.module.css";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: "none" | "sm" | "md";
}

/** A solid raised surface with a 1px line. */
export default function Panel({ children, className, style, padding = "md" }: Props) {
  return (
    <section className={[styles.panel, styles[`pad_${padding}`], className ?? ""].join(" ")} style={style}>
      {children}
    </section>
  );
}
