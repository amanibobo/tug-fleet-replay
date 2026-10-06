import type { ReactElement } from "react";
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import styles from "./Docs.module.css";

/**
 * A tiny scene DSL over roughjs' generator. Everything is drawn with a fixed per-shape seed, so the
 * markup is identical on the server and in the browser and never changes between renders.
 */

export type Tone = "blue" | "green" | "amber" | "red" | "orange" | "idle" | "fg";

const TONE: Record<Tone, string> = {
  blue: "var(--d-blue)",
  green: "var(--d-green)",
  amber: "var(--d-amber)",
  red: "var(--d-red)",
  orange: "var(--d-orange)",
  idle: "var(--d-act-idle)",
  fg: "var(--d-fg)",
};

const STROKE = "var(--d-fg-2)";

export type ShapeOpts = {
  fill?: Tone;
  dashed?: boolean;
  faint?: boolean;
  label?: string;
  size?: number;
  sub?: string;
};

export class Scene {
  private gen = rough.generator();
  private n = 0;
  readonly nodes: ReactElement[] = [];

  constructor(private seed: number) {}

  private opts(o: ShapeOpts = {}): Options {
    this.n += 1;
    const base: Options = {
      seed: this.seed * 101 + this.n,
      roughness: 0.9,
      bowing: 0.8,
      stroke: STROKE,
      strokeWidth: 1.2,
      curveFitting: 0.95,
      fixedDecimalPlaceDigits: 2,
    };
    if (o.dashed) base.strokeLineDash = [5, 5];
    if (o.fill) {
      base.fill = TONE[o.fill];
      base.fillStyle = "hachure";
      base.hachureGap = 6;
      base.hachureAngle = -41;
      base.fillWeight = 0.8;
    }
    return base;
  }

  private push(drawable: ReturnType<typeof this.gen.rectangle>, o: ShapeOpts = {}) {
    const key = `s${this.n}`;
    const paths = this.gen.toPaths(drawable).map((p, i) => (
      <path
        key={`${key}-${i}`}
        d={p.d}
        fill={p.fill ?? "none"}
        stroke={p.stroke}
        strokeWidth={p.strokeWidth}
        className={p.stroke !== STROKE && p.stroke !== "none" ? styles.hatch : undefined}
      />
    ));
    this.nodes.push(
      <g key={key} opacity={o.faint ? 0.55 : undefined}>
        {paths}
      </g>,
    );
  }

  text(x: number, y: number, s: string, o: { size?: number; anchor?: "start" | "middle" | "end"; tone?: Tone | "muted" } = {}) {
    this.n += 1;
    this.nodes.push(
      <text
        key={`t${this.n}`}
        x={x}
        y={y}
        fontSize={o.size ?? 14}
        textAnchor={o.anchor ?? "middle"}
        className={styles.hand}
        fill={o.tone === "muted" ? "var(--d-fg-3)" : o.tone ? TONE[o.tone] : "var(--d-fg)"}
      >
        {s}
      </text>,
    );
    return this;
  }

  mono(x: number, y: number, s: string, o: { size?: number; anchor?: "start" | "middle" | "end" } = {}) {
    this.n += 1;
    this.nodes.push(
      <text key={`m${this.n}`} x={x} y={y} fontSize={o.size ?? 11} textAnchor={o.anchor ?? "middle"} className={styles.figMono}>
        {s}
      </text>,
    );
    return this;
  }

  box(x: number, y: number, w: number, h: number, o: ShapeOpts = {}) {
    this.push(this.gen.rectangle(x, y, w, h, this.opts(o)), o);
    if (o.label) {
      const lines = o.label.split("\n");
      const size = o.size ?? 14;
      const start = y + h / 2 - ((lines.length - 1) * size * 1.15) / 2 + size * 0.35;
      lines.forEach((line, i) => this.text(x + w / 2, start + i * size * 1.15, line, { size }));
    }
    if (o.sub) this.mono(x + w / 2, y + h + 14, o.sub);
    return this;
  }

  ellipse(cx: number, cy: number, w: number, h: number, o: ShapeOpts = {}) {
    this.push(this.gen.ellipse(cx, cy, w, h, this.opts(o)), o);
    if (o.label) this.text(cx, cy + (o.size ?? 14) * 0.35, o.label, { size: o.size });
    return this;
  }

  circle(cx: number, cy: number, d: number, o: ShapeOpts = {}) {
    this.push(this.gen.circle(cx, cy, d, this.opts(o)), o);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, o: ShapeOpts = {}) {
    this.push(this.gen.line(x1, y1, x2, y2, this.opts(o)), o);
    return this;
  }

  poly(points: [number, number][], o: ShapeOpts = {}) {
    this.push(this.gen.linearPath(points, this.opts(o)), o);
    return this;
  }

  polygon(points: [number, number][], o: ShapeOpts = {}) {
    this.push(this.gen.polygon(points, this.opts(o)), o);
    return this;
  }

  curve(points: [number, number][], o: ShapeOpts = {}) {
    this.push(this.gen.curve(points, this.opts(o)), o);
    return this;
  }

  path(d: string, o: ShapeOpts = {}) {
    this.push(this.gen.path(d, this.opts(o)), o);
    return this;
  }

  /** A straight arrow with a small open head. */
  arrow(x1: number, y1: number, x2: number, y2: number, o: ShapeOpts & { label?: string } = {}) {
    this.line(x1, y1, x2, y2, o);
    const a = Math.atan2(y2 - y1, x2 - x1);
    const L = 9;
    const spread = 0.45;
    this.poly(
      [
        [x2 - L * Math.cos(a - spread), y2 - L * Math.sin(a - spread)],
        [x2, y2],
        [x2 - L * Math.cos(a + spread), y2 - L * Math.sin(a + spread)],
      ],
      { faint: o.faint },
    );
    if (o.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      this.text(mx, my - 8, o.label, { size: 12, tone: "muted" });
    }
    return this;
  }

  /** A curved arrow through a control point. */
  bend(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, o: ShapeOpts = {}) {
    this.path(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, o);
    const a = Math.atan2(y2 - cy, x2 - cx);
    const L = 9;
    this.poly(
      [
        [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)],
        [x2, y2],
        [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)],
      ],
      { faint: o.faint },
    );
    return this;
  }

  /** A tug seen from above: a rounded hull with a wheelhouse, heading right. */
  tug(x: number, y: number, s = 1, o: ShapeOpts = {}) {
    const d = `M${x - 22 * s} ${y - 9 * s} H${x + 10 * s} Q${x + 24 * s} ${y - 8 * s} ${x + 26 * s} ${y} Q${x + 24 * s} ${y + 8 * s} ${x + 10 * s} ${y + 9 * s} H${x - 22 * s} Q${x - 26 * s} ${y} ${x - 22 * s} ${y - 9 * s} Z`;
    this.path(d, o);
    this.box(x - 10 * s, y - 5 * s, 14 * s, 10 * s, { faint: true });
    return this;
  }

  /** A ship seen from above: long hull, pointed bow heading right. */
  ship(x: number, y: number, len = 160, o: ShapeOpts = {}) {
    const h = len / 7;
    this.path(
      `M${x - len / 2} ${y - h / 2} H${x + len / 2 - h} L${x + len / 2} ${y} L${x + len / 2 - h} ${y + h / 2} H${x - len / 2} Z`,
      o,
    );
    this.box(x - len / 2 + 10, y - h / 4, h * 0.8, h / 2, { faint: true });
    return this;
  }

  /** A battery: outline, nub, and a hachure fill to `level` (0..1). */
  battery(x: number, y: number, w: number, h: number, level: number, tone: Tone = "green") {
    this.box(x, y, w, h);
    this.box(x + w, y + h * 0.3, 5, h * 0.4, { faint: true });
    if (level > 0) this.box(x + 3, y + 3, (w - 6) * level, h - 6, { fill: tone });
    return this;
  }

  /** A generator: a box with a small exhaust stack. */
  genset(x: number, y: number, w: number, h: number, o: ShapeOpts = {}) {
    this.box(x, y, w, h, o);
    this.box(x + w * 0.7, y - h * 0.35, w * 0.12, h * 0.35);
    return this;
  }

  /** A file/page glyph with a folded corner. */
  file(x: number, y: number, w: number, h: number, o: ShapeOpts = {}) {
    const f = Math.min(w, h) * 0.22;
    this.polygon(
      [
        [x, y],
        [x + w - f, y],
        [x + w, y + f],
        [x + w, y + h],
        [x, y + h],
      ],
      o,
    );
    this.poly(
      [
        [x + w - f, y],
        [x + w - f, y + f],
        [x + w, y + f],
      ],
      { faint: true },
    );
    if (o.label) this.text(x + w / 2, y + h / 2 + 5, o.label, { size: o.size ?? 12 });
    if (o.sub) this.mono(x + w / 2, y + h + 14, o.sub);
    return this;
  }

  /** A cylinder: database or store. */
  db(x: number, y: number, w: number, h: number, o: ShapeOpts = {}) {
    const ry = w / 6;
    this.ellipse(x + w / 2, y + ry, w, ry * 2, { ...o, label: undefined });
    this.line(x, y + ry, x, y + h - ry);
    this.line(x + w, y + ry, x + w, y + h - ry);
    this.path(`M${x} ${y + h - ry} Q${x + w / 2} ${y + h + ry} ${x + w} ${y + h - ry}`);
    if (o.label) this.text(x + w / 2, y + h / 2 + 8, o.label, { size: o.size ?? 13 });
    return this;
  }
}

export type FigureDef = {
  /** Height in viewBox units; width is always 720. */
  height: number;
  caption: string;
  draw: (s: Scene) => void;
};

export function Figure({ def, index }: { def: FigureDef; index: number }) {
  const scene = new Scene(index + 1);
  def.draw(scene);
  return (
    <figure className={styles.figure}>
      <div className={styles.figScroll}>
        <svg className={styles.figSvg} viewBox={`0 0 720 ${def.height}`} role="img" aria-label={def.caption}>
          {scene.nodes}
        </svg>
      </div>
      <figcaption className={styles.figCaption}>
        <span className={styles.figMono}>fig. {index + 1}</span> {def.caption}
      </figcaption>
    </figure>
  );
}
