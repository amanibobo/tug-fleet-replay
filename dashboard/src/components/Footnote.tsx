import type { ReactNode } from "react";

/** One muted sentence per panel for everything that is simulated, per docs/DESIGN.md. */
export default function Footnote({ children, className }: { children?: ReactNode; className?: string }) {
  return <p className={`footnote ${className ?? ""}`}>{children ?? "Estimates. Parameters in config.yaml."}</p>;
}
