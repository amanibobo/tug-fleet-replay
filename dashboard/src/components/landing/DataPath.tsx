"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline, svg as animeSvg, type Timeline } from "animejs";
import { useInView, useReducedMotion } from "@/lib/useInView";
import styles from "./DataPath.module.css";

const NODES = [
  { name: "Replayer", color: "var(--blue)" },
  { name: "IoT Core", color: "var(--orange)" },
  { name: "Lambda", color: "var(--amber)" },
  { name: "DynamoDB", color: "var(--purple)" },
  { name: "WebSocket", color: "var(--teal)" },
  { name: "Console", color: "var(--green)" },
] as const;

const NODE_W = 150;
const NODE_H = 44;

interface Layout {
  w: number;
  h: number;
  pos: { x: number; y: number }[];
}

function layout(narrow: boolean): Layout {
  if (!narrow) {
    const gap = (1120 - 6 * NODE_W) / 5;
    return { w: 1120, h: 92, pos: NODES.map((_, i) => ({ x: i * (NODE_W + gap), y: 24 })) };
  }
  const gap = (560 - 3 * NODE_W) / 2;
  return {
    w: 560,
    h: 200,
    pos: NODES.map((_, i) => ({ x: (i % 3) * (NODE_W + gap), y: i < 3 ? 24 : 132 })),
  };
}

/** Connector from node i to node i+1, with a bend when the row wraps. */
function connector(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const ax = a.x + NODE_W;
  const ay = a.y + NODE_H / 2;
  const by = b.y + NODE_H / 2;
  if (a.y === b.y) return `M${ax} ${ay} L${b.x} ${by}`;
  // wrap: go right, drop between rows, come back left, drop to the next row's first node
  const midY = (a.y + NODE_H + b.y) / 2;
  return `M${ax} ${ay} h16 q12 0 12 12 V${midY - 12} q0 12 -12 12 H${b.x + NODE_W / 2 + 12} q-12 0 -12 12 V${by - 12} q0 12 -12 12 h-12`;
}

/** Six nodes with packets travelling along the connectors in a staggered loop; a node pulses when one arrives. */
export default function DataPath() {
  const root = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(root, "0px");
  const reduced = useReducedMotion();
  const [narrow, setNarrow] = useState(false);
  const tl = useRef<Timeline | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lay = layout(narrow);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || reduced) return;
    const dots = Array.from(el.querySelectorAll<SVGCircleElement>("[data-dot]"));
    const links = Array.from(el.querySelectorAll<SVGPathElement>("[data-link]"));
    const nodes = Array.from(el.querySelectorAll<SVGGElement>("[data-node]"));
    if (dots.length !== links.length) return;

    const STEP = 650;
    const TRAVEL = 900;
    const timeline = createTimeline({ loop: true, loopDelay: 600, defaults: { ease: "inOutSine" } });
    dots.forEach((dot, i) => {
      const mp = animeSvg.createMotionPath(links[i]);
      const at = i * STEP;
      timeline
        .set(dot, { opacity: 0 }, 0)
        .add(dot, { opacity: 1, duration: 150 }, at)
        .add(dot, { translateX: mp.translateX, translateY: mp.translateY, duration: TRAVEL, ease: "inOutQuad" }, at)
        .add(dot, { opacity: 0, duration: 150 }, at + TRAVEL - 100)
        .call(() => {
          const n = nodes[i + 1];
          if (!n) return;
          n.classList.add(styles.pulse);
          setTimeout(() => n.classList.remove(styles.pulse), 400);
        }, at + TRAVEL - 60);
    });
    tl.current = timeline;
    return () => {
      timeline.revert();
      tl.current = null;
    };
  }, [reduced, narrow]);

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (inView) t.play();
    else t.pause();
  }, [inView]);

  return (
    <div ref={root} className={styles.wrap}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${lay.w} ${lay.h}`}
        className={styles.svg}
        role="img"
        aria-label="Telemetry flows from the replayer through IoT Core, Lambda, DynamoDB and the WebSocket API to the console"
      >
        {lay.pos.slice(0, -1).map((p, i) => (
          <path key={i} data-link d={connector(p, lay.pos[i + 1])} fill="none" stroke="var(--tile-2)" strokeWidth="2" />
        ))}
        {lay.pos.map((p, i) => (
          <g key={NODES[i].name} data-node className={styles.node} style={{ transformOrigin: `${p.x + NODE_W / 2}px ${p.y + NODE_H / 2}px`, transformBox: "view-box" }}>
            <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx="14" fill="var(--tile)" />
            <circle cx={p.x + 22} cy={p.y + NODE_H / 2} r="6" fill={NODES[i].color} />
            <text x={p.x + 38} y={p.y + NODE_H / 2 + 5} className={styles.nodeText}>
              {NODES[i].name}
            </text>
          </g>
        ))}
        {lay.pos.slice(0, -1).map((_, i) => (
          <circle key={i} data-dot r="5" fill={NODES[i].color} opacity={reduced ? 0 : 0} />
        ))}
      </svg>
    </div>
  );
}
