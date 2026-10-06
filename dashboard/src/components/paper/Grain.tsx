"use client";

import dynamic from "next/dynamic";
import styles from "./Paper.module.css";

const GrainGradient = dynamic(() => import("@paper-design/shaders-react").then((m) => m.GrainGradient), {
  ssr: false,
});

interface Props {
  back: string;
  colors: string[];
  intensity: number;
}

/** A slow, barely-there grain field behind the page, from Paper's shader library. */
export default function Grain({ back, colors, intensity }: Props) {
  return (
    <div className={styles.grain} aria-hidden>
      <GrainGradient
        style={{ width: "100%", height: "100%" }}
        colorBack={back}
        colors={colors}
        softness={0.85}
        intensity={intensity}
        noise={0.55}
        speed={0.25}
        shape="wave"
        scale={1.4}
      />
    </div>
  );
}
