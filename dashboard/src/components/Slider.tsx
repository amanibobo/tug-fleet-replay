"use client";

import { useId, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import styles from "./Slider.module.css";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Visible label on the left of the row above the track. Omit it and pass `ariaLabel` for a bare slider. */
  label?: string;
  /** Right side of the label row, usually the value in mono. */
  trailing?: ReactNode;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/** 2px track, played part in fg, 12px fg thumb. */
export default function Slider({ value, min, max, step, onChange, label, trailing, ariaLabel, className, disabled }: Props) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`${styles.wrap} ${className ?? ""}`} data-disabled={disabled || undefined}>
      {label ? (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={`label ${styles.label}`}>
            {label}
          </label>
          {trailing != null ? <span className={`mono ${styles.trailing}`}>{trailing}</span> : null}
        </div>
      ) : null}
      <div className={styles.trackWrap} style={{ "--pct": `${pct}%` } as CSSProperties}>
        <div className={styles.track} aria-hidden />
        <div className={styles.fill} aria-hidden />
        <input
          id={id}
          type="range"
          className={styles.range}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
