# Design system (v2)

Independent project. No Arc logos, no claim of affiliation. The look borrows the *feel* of
arcboats.com: near-black canvas, light-weight large type with tight tracking, one warm accent
used sparingly, generous whitespace, slow expressive easing. It should read like an operations
console built by a small careful team, not like a template.

## Rules that override everything below

1. **No uppercase text anywhere.** Labels, chips, nav, table headers, axis ticks and the wordmark
   are sentence case. No positive letter-spacing. The old `.eyebrow` role is retired.
2. **Mono type only for machine values**: the running clock digits, MMSI, coordinates, config
   keys. Every other number is the sans face with `font-variant-numeric: tabular-nums`.
3. **Orange is data, not decoration.** It marks the `assist` activity and the selected tug. It
   never colors a percent sign, an arrow, a delta, a dot in the wordmark or a button.
4. **One "estimate" note per panel**, as a single muted sentence at the bottom
   ("Estimates. Parameters in config.yaml."), not a badge per number.
5. **No glyph arrows or symbols in copy** (→, •, ✓). Use words or a proper icon component.
6. **Solid surfaces, not floating glass.** Panels sit in a rail with a solid background and a
   1px line. No `backdrop-filter`, no gradients except the map's water tint and the slider track.

## Tokens (CSS variables on :root)

```css
:root {
  --bg: #050607;            /* page */
  --bg-raised: #0b0e11;     /* rail, panels */
  --bg-hover: #11151a;
  --line: rgba(255,255,255,0.08);
  --line-strong: rgba(255,255,255,0.16);

  --ink: #ffffff;
  --ink-2: #a3a9b3;         /* secondary text */
  --ink-3: #6b7280;         /* labels, footnotes */

  --accent: #ff6123;        /* assist, selection */
  --accent-soft: rgba(255,97,35,0.18);
  --ok: #34d399;            /* battery healthy, electric, charging */
  --warn: #fbbf24;          /* battery under 35% */
  --bad: #f87171;           /* generator running, battery under 15% */
  --info: #3391ff;          /* transit */
  --sea: #0e2933;           /* map water tint */

  --act-transit: #3391ff;
  --act-assist: #ff6123;
  --act-idle: #6b7280;
  --act-charging: #34d399;

  --font-sans: "Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --r-sm: 6px;
  --r-md: 10px;
  --r-pill: 9999px;

  --ease-out: cubic-bezier(.19,1,.22,1);
  --ease: cubic-bezier(.4,0,.2,1);
  --t-fast: 160ms;
  --t: 320ms;

  --rail-w: 380px;
  --nav-h: 52px;
  --gutter: 16px;
}
```

Dark only. `color-scheme: dark`.

## Type roles

| Role | Class | Size | Weight | Tracking | Color |
| --- | --- | --- | --- | --- | --- |
| Headline number | `.headline` | 64–88px | 300 | -2px | ink |
| Page title | `.title` | 28px | 400 | -0.5px | ink |
| Section heading | `.heading` | 15px | 500 | -0.1px | ink |
| Body | default | 14px | 400 | 0 | ink / ink-2 |
| Label | `.label` | 12px | 400 | 0 | ink-3 |
| Footnote | `.footnote` | 12px | 400 | 0 | ink-3, line-height 1.5 |
| Machine value | `.mono` | 13px mono | 400 | 0 | inherit |

Wordmark: "Tug replay", 14px, weight 500, ink. No dot, no icon.

## Components

- **Nav**: 52px, transparent over the page background, wordmark left, links right. Active link
  is white, inactive `--ink-2`. No pill backgrounds in the nav.
- **Buttons**: pill, 34px tall, 13px text, weight 500, 14px side padding. Primary: white fill,
  black text. Secondary: transparent, 1px `--line-strong`. Icon-only buttons are 34px circles.
  Hover: background shifts one step, no translate.
- **Segmented control** (speed 60x / 120x / 300x): one pill container with 1px line; selected
  segment white fill, black text.
- **Status chip**: 12px sentence case with a 6px dot. Values: Electric, Generator, Charging, Idle.
- **Battery bar**: 4px tall pill, track `rgba(255,255,255,.1)`, fill `--ok`, `--warn` under 35%,
  `--bad` under 15%. The percent sits to the right in sans tabular nums, `--ink-2`.
- **Slider**: 2px track, filled part white, 14px white thumb, 2px `--accent` ring on focus only.
- **Stat**: label above (`.label`), value 24px weight 400 below, unit in `--ink-2` 13px after a space.
- **Panel section**: 16px padding, separated by 1px `--line`, no card radius inside the rail.
- **Map**: MapLibre dark style, water tinted `--sea`. Markers: 9px circle in the activity color
  with a 1.5px white stroke and a heading tick; the selected tug is 13px with a 2px `--accent`
  ring. Battery bar under the marker: 22x3px. Name label on hover and selection.
- **Day timeline**: SVG. Battery area in `--ok`; activity band 10px tall; charging and generator
  spans as thin bars under the band; legend in sentence case; hover crosshair with a small
  solid tooltip; no hatching.
- **Rerun inspector**: slide-over from the right, 60vw (100vw on mobile), solid `--bg-raised`,
  loads the viewer only when opened; "Loading inspector (about 25 MB)" skeleton.

## Layout

**Fleet page (desktop ≥ 1024px)**: a solid left rail `--rail-w` wide, full height under the nav,
scrolling independently; the map fills the rest. Rail order, top to bottom:
1. Title block: "Tug fleet replay", one line "Port of Los Angeles and Long Beach, Dec 2–8 2024, NOAA AIS".
2. Clock: date on one line, HH:MM:SS in mono 28px with "UTC" after it in `--ink-3`; play/pause
   icon button and the speed segmented control on one row; the week scrubber under it with
   sentence-case day ticks.
3. Headline: "71%" large; one line "of 154 tug-days ran without the generator"; the battery
   slider with "Battery 6,000 kWh" as its label; a three-stat row (Generator hours, Charged kWh,
   Charging cost at arrival vs scheduled, the latter as two numbers separated by "vs" and a
   muted "17% lower when scheduled"); one footnote "Estimates. Parameters in config.yaml."
4. Fleet list: heading "Fleet" with "22 tugs" in `--ink-2`; rows: name, status chip, battery bar
   with percent. Selected row has `--bg-hover`. When a tug is selected, a detail block appears
   directly under its row (inline expansion), with: status chip and activity, battery bar with
   "5,932 of 6,000 kWh", a two-column grid of Speed, Heading, Power, Generator, Position, Job
   (labels sentence case, values sans), and an "Open day" primary button. A close control
   collapses it.
Footer line in the rail bottom: "Independent project, not affiliated with Arc. Tracks: NOAA AIS."

**Fleet page (mobile < 1024px)**: map 44vh at the top, then the rail content in the same order
in normal flow with 16px gutters; the headline block comes before the fleet list.

**Tug day page**: max-width 1120px, centered. Header: "Fleet" text link back; name as `.title`;
"MMSI 368012340" mono under it; on the right, previous/next icon buttons around the date.
Totals row: Energy, Generator, Charged, Minimum charge, Jobs as `Stat`s plus a status chip
"Electric only" or "Generator ran". One primary button "Open in Rerun inspector". Below: the
timeline panel, then a two-column row of Jobs and Track. One footnote under the totals.

**About page**: max-width 720px text column; section headings as `.heading`; the architecture
diagram as a simple vertical list of stages with one-line descriptions, not boxes with arrows;
the assumptions table with sentence-case headers (Parameter, Value, Note).

## Voice

Short, plain sentences. No exclamation marks. Sentence case everywhere. Footer on every page:
"Independent project, not affiliated with Arc. Tracks: NOAA AIS, Dec 2–8 2024."
