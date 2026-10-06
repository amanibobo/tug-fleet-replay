export type DataMode = "static" | "ws";

export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "ws" ? "ws" : "static";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
/** Base for static files (tug-day JSON, Rerun recordings) in ws mode: the CloudFront domain. */
export const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL ?? "").replace(/\/$/, "");

/** Absolute URL for a recording path such as "/recordings/{id}/{date}.rrd". */
export function recordingUrl(path: string, origin: string): string {
  if (/^https?:/.test(path)) return path;
  if (DATA_MODE === "ws" && CDN_URL) return `${CDN_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  return new URL(path, origin).toString();
}

/** Resolve a data resource for the current mode. */
export const dataUrl = {
  fleet: () => (DATA_MODE === "ws" ? `${API_URL}/fleet` : "/data/fleet.json"),
  summary: () => (DATA_MODE === "ws" ? `${API_URL}/summary` : "/data/summary.json"),
  tugDay: (id: string, date: string) =>
    DATA_MODE === "ws"
      ? `${API_URL}/tugs/${encodeURIComponent(id)}/days/${date}`
      : `/data/tugdays/${encodeURIComponent(id)}/${date}.json`,
};
