"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "@/lib/useInView";
import styles from "./AsciiTug.module.css";

const COLS = 72;
const ROWS = 11;
const FPS = 6;
const WATER = "~  ~~   ~ ";

/** The tug tows a barge on the right. Rows below the stack; the smoke rows are built per frame. */
const BOAT: readonly string[] = [
  "                 |",
  "        _________|___________",
  "       |  [ ]  [ ]  [ ]      |",
  "   ____|_____________________|____                 ___________________",
  "  |  TUGBOARD   o   o   o   o   o  |---------------|  []  []  []  []  |",
  "  \\________________________________/               \\___________________/",
];
const STACK_COL = 17;
const SMOKE_ROWS = 2;

type Seg = { text: string; cls: "hull" | "water" | "smoke" | "gap" };
type Row = Seg[];

function pad(s: string): string {
  return s.length >= COLS ? s.slice(0, COLS) : s + " ".repeat(COLS - s.length);
}

function rotate(s: string, k: number): string {
  const n = s.length;
  const r = ((k % n) + n) % n;
  return s.slice(r) + s.slice(0, r);
}

function water(k: number): string {
  return rotate(pad(WATER.repeat(Math.ceil(COLS / WATER.length) + 1).slice(0, COLS)), k);
}

/** Three puffs rise from the stack; the oldest fades to a middle dot. */
function smokeRows(k: number): Row[] {
  const phase = k % 6;
  const grid: string[][] = Array.from({ length: SMOKE_ROWS }, () => Array<string>(COLS).fill(" "));
  const puffs: { glyph: string; dx: number }[] = [
    { glyph: "(", dx: -1 },
    { glyph: ")", dx: 1 },
    { glyph: "o", dx: 0 },
  ];
  puffs.forEach((p, i) => {
    const age = (phase + i * 2) % 6; // 0..5, older puffs sit higher
    const row = SMOKE_ROWS - 1 - Math.floor(age / 3); // 1 then 0
    const col = STACK_COL + p.dx + (age % 2 === 0 ? 0 : i - 1);
    const glyph = age >= 5 ? "·" : age >= 3 && row === 0 ? (i === 2 ? "o" : "·") : p.glyph;
    if (col >= 0 && col < COLS) grid[row][col] = glyph;
  });
  return grid.map((chars) => [{ text: chars.join(""), cls: "smoke" }]);
}

function frame(k: number): Row[] {
  const bob = Math.floor(k / 4) % 2 === 1;
  const rows: Row[] = [];
  // Rows 0..7 hold the boat (smoke + hull); when bobbing, the boat moves up one row and a gap opens over the water.
  if (!bob) rows.push([{ text: pad(""), cls: "gap" }]);
  rows.push(...smokeRows(k));
  for (const line of BOAT) rows.push([{ text: pad(line), cls: "hull" }]);
  if (bob) rows.push([{ text: pad(""), cls: "gap" }]);
  rows.push([{ text: water(k), cls: "water" }]);
  rows.push([{ text: water(k + 3), cls: "water" }]);
  return rows.slice(0, ROWS);
}

/**
 * The landing footer animation: a 72x11 ASCII tug towing a barge over rotating water,
 * at 6 frames per second via requestAnimationFrame. Static under reduced motion; paused off-screen.
 */
export default function AsciiTug() {
  const wrap = useRef<HTMLDivElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const inView = useInView(wrap, "80px");
  const reduced = useReducedMotion();
  const [k, setK] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (reduced || !inView) return;
    let raf = 0;
    let last = performance.now();
    const step = 1000 / FPS;
    const tick = (now: number) => {
      if (now - last >= step) {
        last = now - ((now - last) % step);
        setK((v) => (v + 1) % 240);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView]);

  // Scale from the measured container width rather than wrapping.
  useEffect(() => {
    const el = wrap.current;
    const p = pre.current;
    if (!el || !p) return;
    const measure = () => {
      const natural = p.scrollWidth;
      const avail = el.clientWidth;
      setScale(natural > 0 && avail < natural ? avail / natural : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = frame(reduced ? 0 : k);
  const lines: ReactNode[] = rows.map((row, i) => (
    <span key={i} className={styles.row}>
      {row.map((seg, j) => (
        <span key={j} className={styles[seg.cls]}>
          {seg.text}
        </span>
      ))}
      {"\n"}
    </span>
  ));

  return (
    <div ref={wrap} className={styles.wrap} aria-hidden>
      <pre ref={pre} className={styles.pre} style={{ transform: `scale(${scale})` }}>
        {lines}
      </pre>
    </div>
  );
}
