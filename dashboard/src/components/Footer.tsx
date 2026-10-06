import styles from "./Footer.module.css";

export default function Footer({ className }: { className?: string }) {
  return (
    <p className={`footer ${styles.footer} ${className ?? ""}`}>
      Independent project, not affiliated with Arc. Tracks: NOAA AIS, Dec 2–8 2024.
    </p>
  );
}
