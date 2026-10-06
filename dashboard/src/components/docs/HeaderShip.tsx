"use client";

import DitherTug from "@/components/paper/DitherTug";
import { useTheme } from "@/components/theme/useTheme";
import { PAPER } from "@/components/paper/palette";
import styles from "./Docs.module.css";

/** A container ship, the kind the tugs in this project assist, drawn in the same ink dashes as the landing. */
export default function HeaderShip() {
  const { theme } = useTheme();
  return (
    <div className={styles.headerShip}>
      <DitherTug
        ink={PAPER[theme].ink}
        mode="dash"
        src="/ship-side.svg"
        srcWidth={1200}
        srcHeight={420}
        className={styles.headerShipCanvas}
        label="A container ship drawn in ink dashes"
      />
    </div>
  );
}
