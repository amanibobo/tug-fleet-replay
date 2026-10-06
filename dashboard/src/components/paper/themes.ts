export type DitherMode = "dash" | "dots";

export interface PaperTheme {
  id: "paper" | "ink" | "cobalt";
  label: string;
  bg: string;
  fg: string;
  muted: string;
  /** dither ink as r, g, b */
  ink: [number, number, number];
  mode: DitherMode;
  grain: { back: string; colors: string[]; intensity: number };
  /** swatch shown on the theme button: the next theme's background */
  swatch: string;
}

export const THEMES: PaperTheme[] = [
  {
    id: "paper",
    label: "Paper",
    bg: "#f3f1ea",
    fg: "#1c1a16",
    muted: "#6f6a60",
    ink: [38, 32, 24],
    mode: "dash",
    grain: { back: "#f3f1ea", colors: ["#ece9e0", "#f7f5ef", "#e9e6dd"], intensity: 0.18 },
    swatch: "#0b0b0b",
  },
  {
    id: "ink",
    label: "Ink",
    bg: "#0b0b0b",
    fg: "#f2f2f2",
    muted: "#8a8a8a",
    ink: [236, 234, 228],
    mode: "dash",
    grain: { back: "#0b0b0b", colors: ["#121212", "#0e0e0e", "#161616"], intensity: 0.22 },
    swatch: "#1f3fe0",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    bg: "#1f3fe0",
    fg: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    ink: [255, 255, 255],
    mode: "dots",
    grain: { back: "#1f3fe0", colors: ["#1b39cc", "#2446ea", "#1d3dd8"], intensity: 0.16 },
    swatch: "#f3f1ea",
  },
];

export const THEME_KEY = "tugboard.paperTheme";

/* A tiny external store so the saved theme is read without a setState-in-effect. */
const listeners = new Set<() => void>();

function read(): PaperTheme["id"] {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v && THEMES.some((t) => t.id === v)) return v as PaperTheme["id"];
  } catch {
    /* storage unavailable */
  }
  return THEMES[0].id;
}

export const themeStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  },
  get: read,
  getServer: (): PaperTheme["id"] => THEMES[0].id,
  set(id: PaperTheme["id"]) {
    try {
      window.localStorage.setItem(THEME_KEY, id);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((cb) => cb());
  },
};
