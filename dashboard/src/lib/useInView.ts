"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True while `ref` intersects the viewport (with a margin). Starts false; SSR-safe.
 * With `once`, it stays true after the first intersection (for reveals that should not replay).
 */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px", once = false): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (once) {
          if (hit) {
            setInView(true);
            io.disconnect();
          }
        } else setInView(hit);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

/** Tracks the prefers-reduced-motion media query. False during SSR. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
