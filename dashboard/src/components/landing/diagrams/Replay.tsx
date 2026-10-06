import styles from "./Diagrams.module.css";

const NODES = ["Replayer", "IoT", "Lambda", "DB", "Socket", "Console"];
const W = 44;
const H = 28;
const PITCH = 68;
const X0 = 30;
const Y = 76;

/** 04 / replay: six boxes on a rail, a packet hopping box to box and lighting the one it sits in. */
export default function Replay() {
  return (
    <svg className={styles.svg} viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g className={`${styles.stroke} ${styles.grid} ${styles.crisp}`}>
        {NODES.map((_, i) => {
          const cx = X0 + i * PITCH + W / 2;
          return <line key={i} x1={cx} y1={24} x2={cx} y2={156} />;
        })}
      </g>
      {/* rail */}
      <g className={`${styles.stroke} ${styles.faint} ${styles.crisp}`}>
        <line x1={16} y1={Y + H / 2} x2={424} y2={Y + H / 2} />
        <line x1={16} y1={Y + H / 2 + 36} x2={424} y2={Y + H / 2 + 36} strokeDasharray="2 4" />
      </g>
      {/* boxes */}
      <g className={`${styles.stroke} ${styles.crisp}`}>
        {NODES.map((_, i) => (
          <rect key={i} x={X0 + i * PITCH} y={Y} width={W} height={H} fill="#0b0b0b" />
        ))}
      </g>
      {/* ticks between boxes */}
      <g className={`${styles.stroke} ${styles.faint} ${styles.crisp}`}>
        {NODES.slice(1).map((_, i) => {
          const x = X0 + i * PITCH + W + (PITCH - W) / 2;
          return <line key={i} x1={x} y1={Y + H / 2 - 3} x2={x} y2={Y + H / 2 + 3} />;
        })}
      </g>
      {/* packet: a lit interior plus a bright core, hopping together */}
      <g className={`${styles.packet} ${styles.crisp}`}>
        <rect x={X0 + 4} y={Y + 4} width={W - 8} height={H - 8} fill="var(--d-fg)" opacity={0.14} />
        <rect x={X0 + W / 2 - 3} y={Y + H / 2 - 3} width={6} height={6} fill="var(--d-fg)" />
      </g>
      <g className={styles.label}>
        {NODES.map((name, i) => (
          <text key={name} x={X0 + i * PITCH + W / 2} y={Y + H + 18} textAnchor="middle">
            {name}
          </text>
        ))}
        <text x={16} y={Y + H / 2 + 50}>
          local stand-in
        </text>
        <text x={424} y={Y - 14} textAnchor="end">
          120x
        </text>
      </g>
    </svg>
  );
}
