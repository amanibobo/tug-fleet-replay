import type { CSSProperties, ReactElement } from "react";
import styles from "./Anims.module.css";

/** One small animated SVG per `[svg-anim: ...]` marker, keyed by section slug. */

const W = 720;

function FilterRows() {
  const rows = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} 200`} aria-hidden>
      <text x={40} y={40} className={styles.label}>
        daily csv
      </text>
      <text x={372} y={40} className={styles.label} textAnchor="middle">
        box + vessel type
      </text>
      <text x={660} y={40} className={styles.label} textAnchor="end">
        parquet
      </text>
      <line x1={40} y1={100} x2={330} y2={100} className={`${styles.stroke} ${styles.faint}`} strokeDasharray="2 4" />
      <line x1={410} y1={100} x2={600} y2={100} className={`${styles.stroke} ${styles.faint}`} strokeDasharray="2 4" />
      {/* the filter: a slot */}
      <g className={styles.stroke}>
        <rect x={340} y={60} width={64} height={80} />
        <path d="M352 72 L392 72 L372 100 Z" className={styles.faint} />
        <line x1={372} y1={100} x2={372} y2={128} className={styles.faint} />
      </g>
      {/* the parquet block */}
      <g className={styles.stroke}>
        <rect x={610} y={70} width={70} height={60} />
        {[84, 98, 112].map((y) => (
          <line key={y} x1={620} y1={y} x2={670} y2={y} className={styles.faint} />
        ))}
      </g>
      <text x={372} y={178} className={styles.label} textAnchor="middle">
        most rows fall away
      </text>
      {rows.map((i) => (
        <rect
          key={i}
          className={`${styles.row} ${i % 4 === 1 ? styles.keep : styles.drop}`}
          style={{ "--delay": `${i * 0.75}s` } as CSSProperties}
          x={40}
          y={96}
          width={18}
          height={8}
        />
      ))}
    </svg>
  );
}

function MinuteGrid() {
  // irregular fixes along the top row, each with the distance to its minute tick
  const fixes = [52, 61, 70, 96, 130, 171, 212, 260, 305, 352, 398, 441, 503, 562, 644];
  const pitch = 44;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} 180`} aria-hidden>
      <text x={40} y={34} className={styles.label}>
        ais fixes, as received
      </text>
      <text x={40} y={150} className={styles.label}>
        one-minute grid
      </text>
      <line x1={40} y1={60} x2={680} y2={60} className={`${styles.stroke} ${styles.faint}`} />
      <line x1={40} y1={130} x2={680} y2={130} className={styles.stroke} />
      {Array.from({ length: 15 }, (_, i) => 44 + i * pitch).map((x) => (
        <line key={x} x1={x} y1={126} x2={x} y2={134} className={styles.stroke} />
      ))}
      {fixes.map((x, i) => {
        const tick = 44 + Math.round((x - 44) / pitch) * pitch;
        return (
          <circle
            key={i}
            className={styles.fix}
            style={{ "--dx": `${tick - x}px` } as CSSProperties}
            cx={x}
            cy={60}
            r={3}
          />
        );
      })}
      <text x={680} y={34} className={styles.label} textAnchor="end">
        2 s moving · 3 min tied up
      </text>
      <text x={680} y={150} className={styles.label} textAnchor="end">
        gaps under 30 min interpolated
      </text>
    </svg>
  );
}

function ShipProximity() {
  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} 240`} aria-hidden>
      {/* the ship and its 60 m circle */}
      <g className={styles.stroke}>
        <path d="M470 106 H610 L640 120 L610 134 H470 Z" />
        <rect x={485} y={113} width={18} height={14} className={styles.faint} />
        <circle cx={555} cy={120} r={100} className={styles.faint} strokeDasharray="3 5" />
      </g>
      <text x={555} y={90} className={styles.label} textAnchor="middle">
        ship, over 100 m
      </text>
      <text x={555} y={160} className={styles.label} textAnchor="middle">
        60 m from the hull
      </text>
      <line x1={40} y1={120} x2={450} y2={120} className={`${styles.stroke} ${styles.faint}`} strokeDasharray="2 4" />
      {/* the tug, heading right */}
      <g className={styles.approach}>
        <path
          d="M118 112 H140 Q150 112 152 120 Q150 128 140 128 H118 Q112 120 118 112 Z"
          className={styles.stroke}
          fill="var(--d-bg-landing)"
        />
        <g className={styles.whenFar}>
          <rect x={126} y={116} width={10} height={8} fill="var(--d-blue)" />
          <text x={135} y={148} className={styles.label} textAnchor="middle" fill="var(--d-blue)">
            transit
          </text>
        </g>
        <g className={styles.whenNear}>
          <rect x={126} y={116} width={10} height={8} fill="var(--d-orange)" />
          <text x={135} y={148} className={styles.label} textAnchor="middle" fill="var(--d-orange)">
            assist
          </text>
        </g>
      </g>
      <text x={40} y={40} className={styles.label}>
        slow, near a hull: assist · slow, alone: idle · fast: transit
      </text>
    </svg>
  );
}

function SocBar() {
  const x0 = 60;
  const w = 600;
  const y = 70;
  const h = 28;
  const at = (pct: number) => x0 + (w * pct) / 100;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} 180`} aria-hidden>
      <text x={x0} y={40} className={styles.label}>
        state of charge
      </text>
      <rect className={styles.soc} x={x0} y={y} width={w} height={h} opacity={0.85} />
      <rect x={x0} y={y} width={w} height={h} className={styles.stroke} />
      <rect x={x0 + w} y={y + 8} width={6} height={12} className={`${styles.stroke} ${styles.faint}`} />
      <g className={styles.stroke} strokeDasharray="3 4">
        <line x1={at(15)} y1={y - 12} x2={at(15)} y2={y + h + 12} />
        <line x1={at(35)} y1={y - 12} x2={at(35)} y2={y + h + 12} />
      </g>
      <text x={at(15)} y={y + h + 28} className={styles.label} textAnchor="middle">
        15% on
      </text>
      <text x={at(35)} y={y + h + 28} className={styles.label} textAnchor="middle">
        35% off
      </text>
      {/* the generator lights while it runs */}
      <g transform="translate(560 130)">
        <rect x={0} y={0} width={64} height={28} className={styles.stroke} />
        <rect x={44} y={-10} width={6} height={10} className={styles.stroke} />
        <rect x={2} y={2} width={60} height={24} fill="var(--d-red)" className={styles.gen} opacity={0} />
        <text x={32} y={18} className={styles.label} textAnchor="middle">
          600 kW
        </text>
        <text x={-12} y={18} className={styles.label} textAnchor="end">
          generator
        </text>
      </g>
      <text x={x0} y={150} className={styles.label}>
        hysteresis: starts below 15%, stops above 35%
      </text>
    </svg>
  );
}

function Packets() {
  const nodes = ["replayer", "iot core", "lambda", "websocket", "console"];
  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} 160`} aria-hidden>
      <line x1={60} y1={100} x2={620} y2={100} className={`${styles.stroke} ${styles.faint}`} />
      {nodes.map((n, i) => {
        const cx = 60 + i * 140;
        return (
          <g key={n}>
            <rect x={cx - 30} y={84} width={60} height={32} className={styles.stroke} fill="var(--d-bg-landing)" />
            <text x={cx} y={136} className={styles.label} textAnchor="middle">
              {n}
            </text>
          </g>
        );
      })}
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          className={styles.pkt}
          style={{ "--delay": `${i * 2}s` } as CSSProperties}
          x={-3}
          y={-3}
          width={6}
          height={6}
        />
      ))}
      <text x={60} y={44} className={styles.label}>
        one message per tug per replay minute · about 44 a second at 120x
      </text>
    </svg>
  );
}

export const ANIMS: Record<string, () => ReactElement> = {
  "getting-the-data-without-filling-my-disk": FilterRows,
  "one-minute-at-a-time": MinuteGrid,
  "labeling-what-a-tug-is-doing": ShipProximity,
  "the-energy-model-with-its-estimates-on-the-table": SocBar,
  "replaying-it-like-a-real-fleet": Packets,
};
