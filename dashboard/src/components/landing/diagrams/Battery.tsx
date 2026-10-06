import styles from "./Diagrams.module.css";

/** The stepped state-of-charge line. Mirrors the offset-path in the CSS. */
const SOC =
  "M30 40 L70 40 L70 58 L100 58 L100 82 L130 82 L130 104 L160 104 L160 122 L190 122 L190 138 L220 138 L220 126 L240 126 L240 112 L260 112 L260 100 L290 100 L290 116 L320 116 L320 80 L350 80 L350 52 L380 52 L380 40 L410 40";

const TOP = 40; // 100%
const BOTTOM = 150; // 0%
const yAt = (pct: number) => TOP + (BOTTOM - TOP) * (1 - pct / 100);

/** 03 / battery: state of charge stepping down, two dashed thresholds, the generator span bracketed, a square riding the line. */
export default function Battery() {
  const y35 = yAt(35);
  const y15 = yAt(15);
  return (
    <svg className={styles.svg} viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g className={`${styles.stroke} ${styles.grid} ${styles.crisp}`}>
        {[100, 160, 220, 280, 340].map((x) => (
          <line key={x} x1={x} y1={TOP - 12} x2={x} y2={BOTTOM + 6} />
        ))}
      </g>
      {/* axes */}
      <g className={`${styles.stroke} ${styles.faint} ${styles.crisp}`}>
        <line x1={30} y1={TOP - 12} x2={30} y2={BOTTOM} />
        <line x1={30} y1={BOTTOM} x2={410} y2={BOTTOM} />
        <line x1={26} y1={TOP} x2={30} y2={TOP} />
      </g>
      {/* thresholds */}
      <g className={`${styles.stroke} ${styles.crisp}`} strokeDasharray="4 4" opacity={0.7}>
        <line x1={30} y1={y35} x2={410} y2={y35} />
        <line x1={30} y1={y15} x2={410} y2={y15} />
      </g>
      {/* charging at the dock */}
      <rect x={320} y={TOP - 12} width={60} height={BOTTOM - TOP + 12} fill="var(--d-green)" opacity={0.06} />
      {/* generator span bracket */}
      <g className={`${styles.stroke} ${styles.crisp}`}>
        <path d={`M190 ${BOTTOM + 10} v4 H260 v-4`} />
      </g>
      <path d={SOC} className={`${styles.stroke} ${styles.crisp}`} />
      <rect className={styles.rider} x={-3} y={-3} width={6} height={6} />
      <g className={styles.label}>
        <text x={22} y={TOP + 3} textAnchor="end">
          100
        </text>
        <text x={414} y={y35 + 3}>
          35%
        </text>
        <text x={414} y={y15 + 3}>
          15%
        </text>
        <text x={225} y={BOTTOM + 26} textAnchor="middle">
          generator
        </text>
        <text x={350} y={TOP - 18} textAnchor="middle">
          shore charge
        </text>
      </g>
    </svg>
  );
}
