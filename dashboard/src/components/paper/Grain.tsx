"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/useTheme";
import { PAPER } from "./palette";
import styles from "./Paper.module.css";

const GrainGradient = dynamic(() => import("@paper-design/shaders-react").then((m) => m.GrainGradient), {
  ssr: false,
});

/** A slow, barely-there grain field behind the page, from Paper's shader library. Colors follow the theme. */
export default function Grain() {
  const { theme } = useTheme();
  const colors = PAPER[theme];
  return (
    <div className={styles.grain} aria-hidden>
      <GrainGradient
        style={{ width: "100%", height: "100%" }}
        colorBack={colors.back}
        colors={colors.grain}
        softness={0.85}
        intensity={0.18}
        noise={0.55}
        speed={0.25}
        shape="wave"
        scale={1.4}
      />
    </div>
  );
}
