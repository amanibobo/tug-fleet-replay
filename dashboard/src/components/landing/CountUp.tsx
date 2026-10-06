"use client";

import { useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import { useInView, useReducedMotion } from "@/lib/useInView";

interface Props {
  value: number;
  /** Formats the tweened value for display. */
  format: (v: number) => string;
  className?: string;
}

/** Counts from 0 to `value` with anime.js when it first enters view. */
export default function CountUp({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, "0px", true);
  const reduced = useReducedMotion();
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || played.current) return;
    played.current = true;
    if (reduced) {
      el.textContent = format(value);
      return;
    }
    const state = { v: 0 };
    const anim = animate(state, {
      v: value,
      duration: 1200,
      ease: "outCubic",
      modifier: utils.round(value >= 100 ? 0 : 1),
      onUpdate: () => {
        el.textContent = format(state.v);
      },
    });
    return () => {
      anim.pause();
    };
  }, [inView, reduced, value, format]);

  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : 0)}
    </span>
  );
}
