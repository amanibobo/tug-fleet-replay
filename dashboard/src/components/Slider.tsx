"use client";

import { useId, type ChangeEvent, type CSSProperties } from "react";
import styles from "./Slider.module.css";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Visible label above the track. Omit it and pass `ariaLabel` for a bare slider. */
  label?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/** 1px track, filled part in ink, 12px square thumb. The filled part is a plain element behind the input. */
export default function Slider({ value, min, max, step, onChange, label, ariaLabel, className, disabled }: Props) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`${styles.wrap} ${className ?? ""}`} data-disabled={disabled || undefined}>
      {label ? (
        <label htmlFor={id} className={`label ${styles.label}`}>
          {label}
        </label>
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
