/**
 * Small isometric scenes for the week's stat tiles: a map tile with one object on it.
 * Three-face shading (top light, left mid, right dark) like a toy model. Pure SVG, 44x44.
 */

type Tone = { top: string; left: string; right: string };

const RUST: Tone = { top: "#f2957c", left: "#d8634a", right: "#b24a36" };
const GREEN: Tone = { top: "#86dcb1", left: "#48b685", right: "#2f8d64" };
const BLUE: Tone = { top: "#a3c4fb", left: "#6b97ea", right: "#4a73c6" };
const VIOLET: Tone = { top: "#c4b0f7", left: "#9a7be6", right: "#7458c2" };

/** The ground: a light rhombus tile with two faint grid lines. */
function Tile() {
  return (
    <g>
      <polygon points="22,18 42,28 22,38 2,28" fill="var(--d-surface-2)" />
      <polygon points="22,18 42,28 22,38 2,28" fill="none" stroke="var(--d-line-2)" strokeWidth="0.75" />
      <line x1="12" y1="23" x2="32" y2="33" stroke="var(--d-line)" strokeWidth="0.75" />
      <line x1="32" y1="23" x2="12" y2="33" stroke="var(--d-line)" strokeWidth="0.75" />
    </g>
  );
}

/** An isometric box with its base center at (cx, cy), half-widths a (x) and b (y), height h. */
function Box({ cx, cy, a = 8, b = 4, h = 10, tone }: { cx: number; cy: number; a?: number; b?: number; h?: number; tone: Tone }) {
  const t = cy - h;
  return (
    <g>
      <polygon points={`${cx},${t - b} ${cx + a},${t} ${cx},${t + b} ${cx - a},${t}`} fill={tone.top} />
      <polygon points={`${cx - a},${t} ${cx},${t + b} ${cx},${cy + b} ${cx - a},${cy}`} fill={tone.left} />
      <polygon points={`${cx},${t + b} ${cx + a},${t} ${cx + a},${cy} ${cx},${cy + b}`} fill={tone.right} />
    </g>
  );
}

const svgProps = { width: 44, height: 44, viewBox: "0 0 44 44", "aria-hidden": true } as const;

/** Generator: a gen-set box with a stack and vent slats. */
export function GeneratorIcon() {
  return (
    <svg {...svgProps}>
      <Tile />
      <Box cx={21} cy={28} a={9} b={4.5} h={9} tone={RUST} />
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="0.9">
        <line x1="14" y1="24" x2="14" y2="30" />
        <line x1="16.5" y1="25.2" x2="16.5" y2="31.2" />
        <line x1="19" y1="26.5" x2="19" y2="32.5" />
      </g>
      <Box cx={26} cy={17} a={2} b={1} h={6} tone={{ top: "#4b4b50", left: "#2e2e33", right: "#1f1f24" }} />
    </svg>
  );
}

/** Charged: a tall battery block with a light cap and a small plug block beside it. */
export function BatteryIcon() {
  return (
    <svg {...svgProps}>
      <Tile />
      <Box cx={20} cy={29} a={7} b={3.5} h={14} tone={GREEN} />
      <Box cx={20} cy={13.5} a={2.5} b={1.25} h={1.6} tone={{ top: "#d8f6e7", left: "#a9e2c7", right: "#8ccfb0" }} />
      <Box cx={32} cy={30} a={3} b={1.5} h={4} tone={{ top: "#4b4b50", left: "#2e2e33", right: "#1f1f24" }} />
      <path d="M27 27 q3 -1 5 1" fill="none" stroke="#2e2e33" strokeWidth="1" />
    </svg>
  );
}

/** Cost at arrival: a pier with a tug tied up at its end. */
export function ArrivalIcon() {
  return (
    <svg {...svgProps}>
      <Tile />
      <Box cx={16} cy={26} a={11} b={3} h={2.5} tone={{ top: "#d9d6cd", left: "#b3b0a6", right: "#8f8c83" }} />
      <Box cx={31} cy={30} a={5} b={2.5} h={4} tone={BLUE} />
      <Box cx={31} cy={25.5} a={2} b={1} h={3} tone={{ top: "#e9f0ff", left: "#c3d4f7", right: "#a2b9e6" }} />
    </svg>
  );
}

/** Cost scheduled: two stacked blocks with a clock face on top. */
export function ScheduleIcon() {
  return (
    <svg {...svgProps}>
      <Tile />
      <Box cx={22} cy={29} a={9} b={4.5} h={6} tone={{ top: "#d9d6cd", left: "#b3b0a6", right: "#8f8c83" }} />
      <Box cx={22} cy={23} a={7} b={3.5} h={7} tone={VIOLET} />
      <ellipse cx="22" cy="16" rx="3.2" ry="1.6" fill="#ffffff" />
      <path d="M22 16 l0 -1 M22 16 l1.5 0.5" stroke="#5a44a6" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </svg>
  );
}
