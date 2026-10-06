import styles from "./FixtureBadge.module.css";

/** Shown when a data file carries `"fixture": true`. */
export default function FixtureBadge({ className }: { className?: string }) {
  return (
    <span
      className={`${styles.badge} ${className ?? ""}`}
      title="Generated with scripts/make-fixture.mjs. The pipeline replaces these files with real AIS-derived data."
    >
      Sample data
    </span>
  );
}
