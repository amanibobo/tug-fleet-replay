"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getServerTheme, getTheme, setTheme, subscribe, type Theme } from "./theme";

/** The current theme and a toggle. Server renders light; the client snapshot follows `html[data-theme]`. */
export function useTheme(): { theme: Theme; toggle: () => void; set: (t: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const toggle = useCallback(() => setTheme(getTheme() === "dark" ? "light" : "dark"), []);
  return { theme, toggle, set: setTheme };
}
