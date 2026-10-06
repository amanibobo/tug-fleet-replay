import styles from "./Diagrams.module.css";

/** The route the tug follows: along the south channel, into the basin, to the dock. Mirrors the offset-path in the CSS. */
const ROUTE: [number, number][] = [
  [20, 140],
  [150, 140],
  [230, 94],
  [290, 90],
  [372, 90],
];

/** Points at equal arc length along the route: where the tug stops at each of its 12 steps. */
function steps(points: [number, number][], n: number): [number, number][] {
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / (n - 1);
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) {
      d -= seg[i];
      i++;
    }
    const t = seg[i] ? d / seg[i] : 0;
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return out;
}

const TRAIL = steps(ROUTE, 12);

/** 01 / tracks: harbor plan, three channels converging into a basin, a dock, a tug advancing in 12 steps. */
export default function Tracks() {
  return (
    <svg className={styles.svg} viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g className={`${styles.stroke} ${styles.grid} ${styles.crisp}`}>
        {[75, 130, 185, 240, 295, 350].map((x) => (
          <line key={x} x1={x} y1={16} x2={x} y2={164} />
        ))}
      </g>
      {/* channels */}
      <g className={`${styles.stroke} ${styles.faint}`}>
        <path d="M20 40 H150 L230 86" />
        <path d="M20 90 H232" />
        <path d="M20 140 H150 L230 94" />
        <path d="M20 32 H110" />
        <path d="M20 148 H110" />
      </g>
      {/* basin and dock */}
      <g className={styles.stroke}>
        <path d="M232 56 H330 L352 78 V102 L330 124 H232" />
        <path d="M352 90 H372" className={styles.faint} />
        <rect x={372} y={70} width={44} height={40} className={styles.crisp} />
        <path d="M380 70 V110 M388 70 V110 M396 70 V110 M404 70 V110" className={`${styles.faint} ${styles.crisp}`} />
      </g>
      {/* breakwater */}
      <path d="M20 166 H200 M250 166 H420" className={`${styles.stroke} ${styles.faint} ${styles.crisp}`} />
      {/* the trail: one dot per step */}
      <g fill="currentColor" opacity={0.7}>
        {TRAIL.map(([x, y], i) => (
          <rect key={i} x={x - 1} y={y - 1} width={2} height={2} />
        ))}
      </g>
      <rect className={styles.tug} x={-4} y={-4} width={8} height={8} />
      <text x={20} y={22} className={styles.label}>
        San Pedro Bay
      </text>
      <text x={416} y={126} className={styles.label} textAnchor="end">
        dock A
      </text>
    </svg>
  );
}
