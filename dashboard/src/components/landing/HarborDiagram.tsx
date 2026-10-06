"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline, svg as animeSvg, type Timeline } from "animejs";
import { TUG_HOUSE, TUG_HULL } from "@/components/TugIcon";
import { useInView, useReducedMotion } from "@/lib/useInView";
import styles from "./HarborDiagram.module.css";

const W = 1120;
const H = 360;
/** Dock berth, where the tug starts, charges and ends. */
const DOCK = { x: 190, y: 196 };
/** Alongside the ship's near side. */
const SHIP_SIDE = { x: 720, y: 236 };
const ASSIST_DX = 80;
const ROUTE_OUT = `M${DOCK.x} ${DOCK.y} C 330 180, 470 160, 560 196 S 680 240, ${SHIP_SIDE.x} ${SHIP_SIDE.y}`;
const ROUTE_BACK = `M${SHIP_SIDE.x + ASSIST_DX} ${SHIP_SIDE.y} C 700 300, 520 318, 420 292 S 260 236, ${DOCK.x} ${DOCK.y}`;
const BATT_W = 120;

type Phase = { label: string; cls: string };
const PHASES: Record<"transit" | "assist" | "charging", Phase> = {
  transit: { label: "Transit", cls: "chipBlue" },
  assist: { label: "Assist", cls: "chipOrange" },
  charging: { label: "Charging", cls: "chipGreen" },
};

const CONTAINERS = ["var(--blue)", "var(--orange)", "var(--green)", "var(--purple)", "var(--amber)", "var(--teal)", "var(--blue)", "var(--red)"];

/**
 * One tug-day as a looping anime.js timeline (about 14 s): dock to ship (transit), hold alongside while
 * the ship slides (assist), back to the dock (transit), then charge. The battery drains and refills.
 * Reduced motion renders the final state; the loop pauses off-screen.
 */
export default function HarborDiagram() {
  const root = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(root, "0px");
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<keyof typeof PHASES>("charging");
  const [soc, setSoc] = useState(100);
  const tl = useRef<Timeline | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || reduced) return;
    const q = <T extends Element>(sel: string) => el.querySelector<T>(sel);
    const tug = q<SVGGElement>("[data-tug]");
    const ship = q<SVGGElement>("[data-ship]");
    const routeOut = q<SVGPathElement>("[data-route-out]");
    const routeBack = q<SVGPathElement>("[data-route-back]");
    const bolt = q<SVGGElement>("[data-bolt]");
    if (!tug || !ship || !routeOut || !routeBack || !bolt) return;

    const batt = { v: 100 };
    const out = animeSvg.createMotionPath(routeOut);
    const back = animeSvg.createMotionPath(routeBack);
    const [drawOut] = animeSvg.createDrawable(routeOut);
    const [drawBack] = animeSvg.createDrawable(routeBack);

    const timeline = createTimeline({ loop: true, defaults: { ease: "inOutSine" } });
    timeline
      // leave the dock
      .call(() => setPhase("transit"), 0)
      .set(drawBack, { draw: "0 0" }, 0)
      .set(ship, { translateX: 0 }, 0)
      .add(drawOut, { draw: ["0 0", "0 1"], duration: 4000, ease: "linear" }, 0)
      .add(tug, { translateX: out.translateX, translateY: out.translateY, rotate: out.rotate, duration: 4000, ease: "linear" }, 0)
      .add(batt, { v: 86, duration: 4000, ease: "linear", onUpdate: () => setSoc(Math.round(batt.v)) }, 0)
      // assist: hold alongside while the ship moves
      .call(() => setPhase("assist"), 4000)
      .add(ship, { translateX: ASSIST_DX, duration: 3600 }, 4100)
      .add(tug, { translateX: `+=${ASSIST_DX}`, duration: 3600 }, 4100)
      .add(drawOut, { draw: ["0 1", "1 1"], duration: 3600, ease: "linear" }, 4100)
      .add(batt, { v: 58, duration: 3800, ease: "linear", onUpdate: () => setSoc(Math.round(batt.v)) }, 4100)
      // back to the dock
      .call(() => setPhase("transit"), 8000)
      .add(drawBack, { draw: ["0 0", "0 1"], duration: 4000, ease: "linear" }, 8000)
      .add(tug, { translateX: back.translateX, translateY: back.translateY, rotate: back.rotate, duration: 4000, ease: "linear" }, 8000)
      .add(ship, { translateX: 0, duration: 4000 }, 8400)
      .add(batt, { v: 46, duration: 4000, ease: "linear", onUpdate: () => setSoc(Math.round(batt.v)) }, 8000)
      // charge at the dock
      .call(() => setPhase("charging"), 12000)
      .add(drawBack, { draw: ["0 1", "1 1"], duration: 1200, ease: "linear" }, 12000)
      .add(bolt, { opacity: [0, 1], scale: [0.6, 1], duration: 300, ease: "outBack" }, 12000)
      .add(batt, { v: 100, duration: 2200, ease: "linear", onUpdate: () => setSoc(Math.round(batt.v)) }, 12200)
      .add(bolt, { opacity: 0, duration: 300 }, 14300)
      .add(tug, { rotate: 0, duration: 400 }, 12400);
    tl.current = timeline;
    return () => {
      timeline.revert();
      tl.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (inView) t.play();
    else t.pause();
  }, [inView]);

  const p = PHASES[phase];

  return (
    <div ref={root} className={styles.wrap} data-paused={!inView || undefined}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="A tug leaves its dock, assists a ship, returns and charges">
        <defs>
          <clipPath id="harborClip">
            <rect width={W} height={H} rx="18" />
          </clipPath>
        </defs>
        <g clipPath="url(#harborClip)">
          <rect width={W} height={H} fill="var(--tile)" />
          {/* water lines, drifting slowly */}
          <g className={styles.waves} fill="none" stroke="var(--blue)" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round">
            {[70, 130, 290, 330].map((y, i) => (
              <path key={y} className={i % 2 ? styles.waveB : styles.waveA} d={wave(y)} />
            ))}
          </g>

          {/* dock */}
          <g>
            <rect x="40" y="160" width="140" height="72" rx="12" fill="#d4d4d8" />
            <rect x="40" y="160" width="140" height="10" rx="5" fill="#c4c4c9" />
            {[62, 100, 138].map((x) => (
              <circle key={x} cx={x} cy="238" r="4" fill="#a1a1aa" />
            ))}
            <rect x="52" y="176" width="22" height="22" rx="5" fill="var(--green)" />
            <path d="M58 182v10M63 178v14M68 184v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <rect x="80" y="178" width="60" height="20" rx="10" fill="var(--green-soft)" />
            <text x="110" y="192" textAnchor="middle" className={styles.chipText} fill="var(--green)">
              Dock
            </text>
          </g>

          {/* routes */}
          <path data-route-out d={ROUTE_OUT} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 7" />
          <path data-route-back d={ROUTE_BACK} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 7" />

          {/* container ship */}
          <g data-ship>
            <path d="M650 150h340l60 30-60 32H650a16 16 0 0 1-16-16v-30a16 16 0 0 1 16-16z" fill="#a1a1aa" />
            <path d="M650 196h400l-10 10H650z" fill="#8a8a93" />
            <rect x="672" y="122" width="300" height="30" rx="4" fill="#d4d4d8" />
            {CONTAINERS.map((c, i) => (
              <rect key={i} x={680 + i * 36} y="128" width="30" height="20" rx="3" fill={c} />
            ))}
            <rect x="986" y="118" width="26" height="34" rx="4" fill="#71717a" />
          </g>

          {/* tug: hull at the group origin so the motion path positions it */}
          <g data-tug transform={`translate(${DOCK.x} ${DOCK.y})`}>
            <g transform="translate(-24 -13) scale(2.2)">
              <path d={TUG_HULL} fill="var(--ink)" stroke="#fff" strokeWidth="0.9" />
              <path d={TUG_HOUSE} fill="#3f3f46" />
              <circle cx="8.2" cy="6" r="1.3" fill="var(--orange)" />
            </g>
          </g>

          {/* charging bolt over the dock */}
          <g data-bolt opacity="0" style={{ transformOrigin: "190px 150px", transformBox: "view-box" }}>
            <circle cx="190" cy="150" r="14" fill="var(--green)" />
            <path d="M191 141l-6 10h5l-1 8 6-10h-5z" fill="#fff" />
          </g>
        </g>

        {/* HUD: battery and the label chip */}
        <g transform="translate(24 24)">
          <rect width="236" height="64" rx="14" fill="#ffffff" />
          <text x="16" y="24" className={styles.hudLabel}>
            Battery
          </text>
          <rect x="16" y="36" width={BATT_W} height="8" rx="4" fill="var(--tile)" />
          <rect
            x="16"
            y="36"
            width={(BATT_W * soc) / 100}
            height="8"
            rx="4"
            fill={soc < 15 ? "var(--red)" : soc < 35 ? "var(--amber)" : "var(--green)"}
          />
          <text x="150" y="45" className={styles.hudValue}>
            {soc}%
          </text>
          <rect x="196" y="12" width="0" height="0" />
        </g>
        <foreignObject x="280" y="36" width="160" height="40">
          <span className={`chip ${p.cls} ${styles.phaseChip}`}>{p.label}</span>
        </foreignObject>
      </svg>
    </div>
  );
}

function wave(y: number): string {
  let d = `M-120 ${y}`;
  for (let x = -120; x < W + 240; x += 60) d += ` q 15 -8 30 0 t 30 0`;
  return d;
}
