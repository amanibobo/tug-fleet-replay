import type { Activity, Status, Telemetry } from "./types";

export const DAY_MS = 86_400_000;

export function statusOf(t: Pick<Telemetry, "generator_on" | "activity">): Status {
  if (t.generator_on) return "generator";
  if (t.activity === "charging") return "charging";
  if (t.activity === "idle") return "idle";
  return "electric";
}

export const STATUS_COLOR: Record<Status, string> = {
  electric: "var(--d-green)",
  generator: "var(--d-red)",
  charging: "var(--d-blue)",
  idle: "var(--d-act-idle)",
};

export const ACTIVITY_COLOR: Record<Activity, string> = {
  transit: "var(--d-act-transit)",
  assist: "var(--d-act-assist)",
  idle: "var(--d-act-idle)",
  charging: "var(--d-act-charging)",
};

/** Hex versions of the --d-* tokens for MapLibre, which cannot read CSS variables. */
export const ACTIVITY_HEX: Record<Activity, string> = {
  transit: "#78b1f5",
  assist: "#f59a55",
  idle: "#5c5c63",
  charging: "#43ce95",
};

export const STATUS_HEX: Record<Status, string> = {
  electric: "#43ce95",
  generator: "#f07878",
  charging: "#78b1f5",
  idle: "#5c5c63",
};

/** Generator trail and span color, the --d-red token. */
export const GENERATOR_HEX = "#f07878";

export const ACTIVITY_LABEL: Record<Activity, string> = {
  transit: "Transit",
  assist: "Assist",
  idle: "Idle",
  charging: "Charging",
};

/** Battery fill: green when healthy, amber under 35%, red under 15%. */
export function socColor(soc: number): string {
  if (soc < 0.15) return "var(--d-red)";
  if (soc < 0.35) return "var(--d-amber)";
  return "var(--d-green)";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in UTC. */
export function isoDate(d: Date | number): string {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

/** HH:MM in UTC. Accepts a Date, ms, or ISO string. */
export function hhmm(d: Date | number | string): string {
  const x = new Date(d);
  return `${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}

/** HH:MM:SS in UTC. */
export function hhmmss(d: Date | number | string): string {
  const x = new Date(d);
  return `${hhmm(x)}:${pad(x.getUTCSeconds())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon, Dec 2" from a Date or YYYY-MM-DD string, in UTC. */
export function prettyDate(d: Date | number | string, withWeekday = true): string {
  const x = typeof d === "string" ? new Date(`${d}T00:00:00Z`) : new Date(d);
  const core = `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}`;
  return withWeekday ? `${WEEKDAYS[x.getUTCDay()]}, ${core}` : core;
}

/** "Dec 2–8, 2024", or "Dec 2–8 2024" without the comma. */
export function dateRange(start: string, end: string, comma = true): string {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const left = `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}`;
  const right = sameMonth ? `${b.getUTCDate()}` : `${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}`;
  return `${left}–${right}${comma ? "," : ""} ${b.getUTCFullYear()}`;
}

export function shiftDate(date: string, days: number): string {
  return isoDate(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS);
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtUsd(n: number): string {
  return `$${fmtInt(n)}`;
}

/** "1 h 32 min" from minutes. */
export function fmtDuration(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function fmtHours(h: number): string {
  return h >= 10 ? `${fmtInt(h)} h` : `${fmtNum(h, 1)} h`;
}

export function minutesBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 60_000;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
