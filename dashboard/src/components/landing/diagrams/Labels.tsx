import styles from "./Diagrams.module.css";

const COLS = 24;
const ROWS = 6;
const SIZE = 8;
const PITCH = 13;
const X0 = (440 - (COLS - 1) * PITCH - SIZE) / 2;
const Y0 = (180 - (ROWS - 1) * PITCH - SIZE) / 2;

type Run = { row: number; from: number; to: number; kind: "assist" | "transit" };

/** Lit runs: assist in --d-fg, transit in --d-blue. Row 3 is the sliding run and is drawn separately. */
const RUNS: Run[] = [
  { row: 0, from: 3, to: 8, kind: "transit" },
  { row: 1, from: 10, to: 14, kind: "assist" },
  { row: 2, from: 0, to: 3, kind: "transit" },
  { row: 2, from: 16, to: 20, kind: "assist" },
  { row: 4, from: 12, to: 18, kind: "transit" },
  { row: 5, from: 5, to: 7, kind: "assist" },
  { row: 5, from: 19, to: 23, kind: "transit" },
];

const COLOR = { assist: "var(--d-fg)", transit: "var(--d-blue)" };

function cell(row: number, col: number, key: string, fill: string, opacity?: number) {
  return <rect key={key} x={X0 + col * PITCH} y={Y0 + row * PITCH} width={SIZE} height={SIZE} fill={fill} opacity={opacity} />;
}

/** 02 / labels: a 24x6 grid of minutes, runs lit by activity, one row's run sliding. */
export default function Labels() {
  const base: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) base.push(cell(r, c, `${r}-${c}`, "var(--d-fg-2)", 0.2));
  }
  const lit = RUNS.flatMap((run) => {
    const out: React.ReactElement[] = [];
    for (let c = run.from; c <= run.to; c++) out.push(cell(run.row, c, `${run.kind}-${run.row}-${c}`, COLOR[run.kind]));
    return out;
  });
  const legendY = Y0 + ROWS * PITCH + 14;
  return (
    <svg className={styles.svg} viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g className={`${styles.stroke} ${styles.grid} ${styles.crisp}`}>
        <line x1={X0 - 12} y1={Y0 - 2} x2={X0 + COLS * PITCH + 6} y2={Y0 - 2} />
        <line x1={X0 - 12} y1={Y0 + ROWS * PITCH} x2={X0 + COLS * PITCH + 6} y2={Y0 + ROWS * PITCH} />
      </g>
      <g className={styles.crisp}>{base}</g>
      <g className={styles.crisp}>{lit}</g>
      <g className={`${styles.run} ${styles.crisp}`}>
        {[0, 1, 2, 3, 4].map((c) => cell(3, c + 1, `slide-${c}`, COLOR.assist))}
      </g>
      <g className={styles.label}>
        <text x={X0 - 12} y={Y0 - 8}>
          00:00
        </text>
        <text x={X0 + COLS * PITCH + 6} y={Y0 - 8} textAnchor="end">
          24:00
        </text>
        <rect x={X0} y={legendY - 6} width={6} height={6} fill="var(--d-fg)" />
        <text x={X0 + 11} y={legendY}>
          assist
        </text>
        <rect x={X0 + 60} y={legendY - 6} width={6} height={6} fill="var(--d-blue)" />
        <text x={X0 + 71} y={legendY}>
          transit
        </text>
        <text x={X0 + COLS * PITCH + 6} y={legendY} textAnchor="end">
          6 tugs · 1 min
        </text>
      </g>
    </svg>
  );
}
