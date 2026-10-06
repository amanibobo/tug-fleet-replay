import type { Theme } from "@/components/theme/theme";

/**
 * The paper page's canvas and shader colors per theme. These feed a WebGL shader and a 2D canvas,
 * which cannot read CSS variables; the page background itself is the `--d-bg-paper` token.
 */
export const PAPER: Record<Theme, { back: string; grain: [string, string, string]; ink: [number, number, number] }> = {
  light: { back: "#f3f1ea", grain: ["#ece9e0", "#f7f5ef", "#e9e6dd"], ink: [38, 32, 24] },
  dark: { back: "#0b0b0b", grain: ["#121212", "#0e0e0e", "#161616"], ink: [236, 234, 228] },
};
