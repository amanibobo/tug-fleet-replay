"use client";

import { useTheme } from "./useTheme";
import styles from "./ThemeSquare.module.css";

/** A 12px square filled with the other theme's page color. Click to switch. */
export default function ThemeSquare({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`${styles.square}${className ? ` ${className}` : ""}`}
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      data-theme-square
    />
  );
}
