"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "@/lib/useInView";
import styles from "./Reveal.module.css";

interface Props {
  children: ReactNode;
  className?: string;
  /** Element to render; the children stagger-fade in when it scrolls into view. */
  as?: "div" | "ol" | "ul";
}

/** Stagger-fades its direct children in on scroll. Reduced motion shows them at once. */
export default function Reveal({ children, className, as = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, "-40px", true);
  const Tag = as;
  return (
    <Tag ref={ref as never} className={`${styles.reveal} ${className ?? ""}`} data-shown={inView || undefined}>
      {children}
    </Tag>
  );
}
