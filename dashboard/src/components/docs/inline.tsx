import type { ReactNode } from "react";

/**
 * Sets numbers and code identifiers in mono inside a paragraph, leaving the words alone.
 * A number qualifies when it carries a unit, a $ or %, a decimal or thousands separator, or a multiplier (120x).
 */
const UNIT =
  "(?:kWh|MWh|kW|hp|MB|GB|m\\b|knots?\\b|cents\\b|%|x\\b)";
const NUMBER = new RegExp(
  `\\$\\d[\\d,]*(?:\\.\\d+)?|\\d[\\d,]*(?:\\.\\d+)?\\s?${UNIT}|\\d{1,3}(?:,\\d{3})+|\\d+\\.\\d+`,
  "g",
);
const IDENTS = [
  "config.yaml",
  ".rrd",
  "aisstream.io",
  "TOU-8",
  "parquet",
  "JSON lines",
  "JSON",
  "MQTT",
  "WebSocket",
  "wasm",
  "DynamoDB",
  "IoT Core",
  "Lambda",
  "CloudFront",
  "CDK",
  "S3",
];
const IDENT = new RegExp(`(?<![\\w.])(?:${IDENTS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w])`, "g");

type Span = { start: number; end: number; text: string };

function matches(text: string, re: RegExp): Span[] {
  const out: Span[] = [];
  for (const m of text.matchAll(re)) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
}

export function formatInline(text: string, monoClass: string): ReactNode[] {
  const spans = [...matches(text, NUMBER), ...matches(text, IDENT)]
    .sort((a, b) => a.start - b.start)
    .filter((s, i, arr) => i === 0 || s.start >= arr[i - 1].end);
  const out: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start > cursor) out.push(text.slice(cursor, s.start));
    out.push(
      <span key={i} className={monoClass}>
        {s.text}
      </span>,
    );
    cursor = s.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
