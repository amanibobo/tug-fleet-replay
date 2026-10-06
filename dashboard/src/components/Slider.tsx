"use client";

import { useId, type ChangeEvent, type CSSProperties } from "react";
import styles from "./Slider.module.css";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export default function Slider({ value, min, max, step, onChange, label, className, disabled }: Props) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <label htmlFor={id} className={`label ${styles.label}`}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
