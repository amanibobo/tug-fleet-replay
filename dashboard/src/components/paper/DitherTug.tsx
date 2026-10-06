"use client";

import { useEffect, useRef } from "react";
import styles from "./Paper.module.css";
export type DitherMode = "dash" | "dots";

const SRC = "/tug-side.svg";
const SRC_W = 1200;
const SRC_H = 520;

/**
 * Draws the tug as horizontal ink dashes whose density follows the image's darkness, the
 * way a plotter or a typewriter would shade it. The dash field is re-jittered a few times a
 * second so it breathes; under reduced motion it is drawn once.
 */
interface Props {
  ink: [number, number, number];
  mode: DitherMode;
}

export default function DitherTug({ ink, mode }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const style = useRef({ ink, mode });
  const redraw = useRef<() => void>(() => {});

  // theme changes redraw immediately instead of waiting for the next tick
  useEffect(() => {
    style.current = { ink, mode };
    redraw.current();
  }, [ink, mode]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let timer = 0;
    let lum: Float32Array | null = null;
    let rgb: Uint8ClampedArray | null = null;
    const TINT = 0; // pure ink; raise toward 1 to let the drawing's paint through // how far each dash leans from ink toward the source color
    let gw = 0;
    let gh = 0;
    let cw = 0;
    let ch = 0;
    let seed = 1;

    const rand = () => {
      // small deterministic PRNG so each frame is a fresh but stable field
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const sample = () => {
      // read the source at a coarse grid: one cell per 4 device px horizontally, 5 vertically
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      cw = Math.max(1, Math.round(box.width * dpr));
      ch = Math.max(1, Math.round((box.width * SRC_H) / SRC_W * dpr));
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.height = `${ch / dpr}px`;
      // grid in CSS pixels with a floor, so phones keep enough cells to read the hull
      const dots = style.current.mode === "dots";
      gw = dots ? Math.min(150, Math.max(90, Math.floor(box.width / 7))) : Math.min(560, Math.max(300, Math.floor(box.width / 2)));
      gh = Math.max(1, Math.round((gw * SRC_H) / SRC_W / (dots ? 1 : 1.7)));
      const off = document.createElement("canvas");
      off.width = gw;
      off.height = gh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, gw, gh);
      octx.drawImage(img, 0, 0, gw, gh);
      const px = octx.getImageData(0, 0, gw, gh).data;
      rgb = px;
      lum = new Float32Array(gw * gh);
      for (let i = 0; i < gw * gh; i++) {
        const r = px[i * 4];
        const g = px[i * 4 + 1];
        const b = px[i * 4 + 2];
        lum[i] = 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // darkness 0..1
      }
    };

    const draw = (t: number) => {
      if (!lum) return;
      seed = (t * 7919) % 2147483647 || 1;
      ctx.clearRect(0, 0, cw, ch);
      const [r, g, b] = style.current.ink;
      const cellW = cw / gw;
      const cellH = ch / gh;
      if (style.current.mode === "dots") {
        // cobalt: solid blocks where the source is dark, shrinking dots at the edges
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            const d = lum[y * gw + x] + (rand() - 0.5) * 0.08;
            if (d < 0.14) continue;
            const cx = x * cellW;
            const cy = y * cellH;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${d > 0.6 ? 1 : Math.min(1, 0.55 + d)})`;
            if (d > 0.74) {
              ctx.fillRect(cx, cy, cellW + 0.5, cellH + 0.5);
            } else {
              const rad = Math.max(0.6, cellW * 0.5 * Math.pow(d, 0.9));
              ctx.beginPath();
              ctx.arc(cx + cellW / 2, cy + cellH / 2, rad, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        return;
      }
      const rowH = Math.max(1, cellH * 0.42);
      for (let y = 0; y < gh; y++) {
        const yy = y * cellH + cellH * 0.3;
        let x = 0;
        while (x < gw) {
          const d = lum[y * gw + x];
          if (d < 0.1 || rand() > d * 0.72) {
            x += 1;
            continue;
          }
          // a dash: longer and darker where the source is darker
          const len = Math.max(1, Math.round(1 + d * 4 + rand() * 3 * d));
          let sum = 0;
          for (let k = 0; k < len && x + k < gw; k++) sum += lum[y * gw + x + k];
          const mean = sum / len;
          const alpha = Math.min(0.95, 0.3 + mean * 0.7);
          let cr = r;
          let cg = g;
          let cb = b;
          if (rgb) {
            const i = (y * gw + Math.min(gw - 1, x + (len >> 1))) * 4;
            cr = Math.round(r + (rgb[i] - r) * TINT);
            cg = Math.round(g + (rgb[i + 1] - g) * TINT);
            cb = Math.round(b + (rgb[i + 2] - b) * TINT);
          }
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha.toFixed(3)})`;
          const jitter = (rand() - 0.5) * cellW * 0.6;
          ctx.fillRect(x * cellW + jitter, yy, len * cellW - cellW * 0.45, rowH);
          x += len + 1 + Math.floor(rand() * 3);
        }
      }
    };
    redraw.current = () => {
      if (!lum) return;
      sample();
      draw(3);
    };

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      sample();
      draw(1);
      if (!reduce) {
        timer = window.setInterval(() => {
          raf = requestAnimationFrame((t) => draw(t));
        }, 140);
      }
    };
    img.src = SRC;

    const onResize = () => {
      sample();
      draw(2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className={styles.canvas} role="img" aria-label="A harbor tug drawn in ink dashes" />;
}
