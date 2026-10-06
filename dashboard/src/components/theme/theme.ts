/**
 * The theme store. `html[data-theme]` is the single source of truth: the inline script in the root
 * layout sets it from localStorage before paint, `setTheme` writes it, and `useTheme` reads it
 * through `useSyncExternalStore`. See docs/DESIGN.md "v8: Theme mechanism".
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "tugboard.theme";

/** Page colors per theme, for the browser chrome (`<meta name="theme-color">`). */
export const PAGE_COLOR: Record<Theme, string> = { light: "#f5f4ef", dark: "#0a0a0a" };

const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getServerTheme(): Theme {
  return "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", PAGE_COLOR[theme]);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // private mode or storage disabled: the choice lives for this page only
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab toggled: follow it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY && (e.newValue === "dark" || e.newValue === "light") && e.newValue !== getTheme()) {
      document.documentElement.dataset.theme = e.newValue;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The computed value of a `--d-*` token, for canvases and MapLibre, which cannot read CSS variables. */
export function token(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Runs in `<head>` before paint. Kept as a string so it needs no bundle and no hydration; the
 * default is light, and anything but "dark" in storage falls back to it.
 */
export const THEME_INIT_SCRIPT =
  `(function(){var t="light";try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")t="dark"}catch(e){}` +
  `document.documentElement.dataset.theme=t;` +
  `var m=document.querySelector('meta[name="theme-color"]');if(m&&t==="dark")m.setAttribute("content",${JSON.stringify(PAGE_COLOR.dark)})})()`;
