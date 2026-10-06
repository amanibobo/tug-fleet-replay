# Design system (v3, "paper instrument")

Independent project. No Arc logos, no claim of affiliation. The console reads like a printed
engineering sheet: warm paper, dark ink, one typeface family with a matching mono, muted
status colors, hairline rules. It is the opposite of the dark neon dashboard. Light mode only.

## Rules that override everything below

1. **No uppercase text anywhere.** Sentence case for labels, chips, nav, table headers, ticks,
   wordmark. No positive letter-spacing.
2. **One family.** IBM Plex Sans for text, IBM Plex Mono for machine values (clock digits,
   MMSI, coordinates, config keys, timestamps in tables). Nothing else.
3. **Ink does the work.** Hierarchy comes from size, weight and ink shade, not color. Status
   colors appear only on data: chips, bars, markers, chart series.
4. **No decoration.** No gradients, shadows, blur, glows, rings, or rounded cards floating over
   things. Surfaces are flat with 1px hairlines. Radius is 4px on controls and 0 on panels.
5. **One estimate footnote per panel**, muted, at the bottom: "Estimates. Parameters in config.yaml."
6. **No glyph arrows or symbols in copy.** Words, or the shared inline chevron icon.

## Tokens (CSS variables on :root)

```css
:root {
  --paper: #f3f1ec;          /* page */
  --paper-2: #faf9f6;        /* rail, panels */
  --paper-3: #ebe8e1;        /* hover rows, tracks */
  --line: rgba(21,23,26,0.12);
  --line-strong: rgba(21,23,26,0.28);

  --ink: #15171a;
  --ink-2: #4d5157;          /* secondary text */
  --ink-3: #7a7f87;          /* labels, footnotes, ticks */

  /* status, all muted */
  --green: #1f6f4a;          /* electric, charging, battery fill when healthy */
  --amber: #9a6b12;          /* battery under 35% */
  --rust: #b5471b;           /* assist */
  --red: #8f2d2d;            /* generator running, battery under 15% */
  --slate: #2f5d8a;          /* transit */
  --gray: #9a9ea6;           /* idle */

  --act-transit: var(--slate);
  --act-assist: var(--rust);
  --act-idle: var(--gray);
  --act-charging: var(--green);

  --font-sans: var(--font-plex-sans), "IBM Plex Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  --font-mono: var(--font-plex-mono), "IBM Plex Mono", ui-monospace, Menlo, monospace;

  --r: 4px;
  --ease: cubic-bezier(.4,0,.2,1);
  --t-fast: 120ms;
  --t: 240ms;

  --rail-w: 400px;
  --nav-h: 48px;
  --gutter: 16px;
  color-scheme: light;
}
```

Selection highlight: `--paper-3`. Focus ring: 2px `--ink` outline with 2px offset.

## Type

Load IBM Plex Sans (300, 400, 500, 600) and IBM Plex Mono (400, 500) with `next/font/google`.

| Role | Class | Size | Weight | Tracking | Color |
| --- | --- | --- | --- | --- | --- |
| Headline number | `.headline` | 72–96px | 300 | -2px | ink |
| Page title | `.title` | 26px | 500 | -0.3px | ink |
| Section heading | `.heading` | 14px | 600 | 0 | ink |
| Body | default | 14px | 400 | 0 | ink / ink-2 |
| Label | `.label` | 12px | 400 | 0 | ink-3 |
| Footnote | `.footnote` | 12px | 400 | 0 | ink-3, line-height 1.5 |
| Machine value | `.mono` | 13px mono | 400 | 0 | inherit |
| Stat value | `.stat` | 22px | 400 | -0.2px | ink; unit 12px ink-3 |

All numbers `font-variant-numeric: tabular-nums`. Body `line-height: 1.5`. Antialiasing default
(do not force grayscale on light backgrounds).

## Components

- **Nav**: 48px, `--paper` background, 1px bottom hairline. Wordmark "Tug replay" (14px, 600).
  Links right, 14px, active ink, inactive ink-3. No pills.
- **Buttons**: 32px tall, 13px, weight 500, 12px side padding, radius `--r`. Primary: ink fill,
  paper text. Secondary: paper-2 fill, 1px `--line-strong`. Hover: fill darkens one step.
  Icon buttons 32px square.
- **Segmented control**: 1px `--line-strong` container, radius `--r`; selected segment ink fill
  with paper text.
- **Status chip**: 12px, 6px dot in the status color, text ink-2. Values: Electric, Generator,
  Charging, Idle.
- **Battery bar**: 4px tall, square ends, track `--paper-3`; fill `--green`, `--amber` under 35%,
  `--red` under 15%; percent to the right, 12px ink-2, tabular.
- **Slider**: 1px track `--line-strong`, filled part ink, 12px square ink thumb (no circle),
  focus outline per tokens.
- **Stat**: label above, value below.
- **Panel**: `--paper-2`, 1px `--line`, radius 0, 16px padding; title row with `.heading` left
  and a `.label` note right; hairline under the title row.
- **Table**: hairline rows, 12px ink-3 headers, 36px row height, numbers right-aligned.
- **Map**: MapLibre with the CARTO Positron style (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`,
  no key). Do not tint it. Markers: 8px square rotated by heading (a small arrow-like diamond)
  filled with the activity color, 1px paper stroke; selected tug gets a 1.5px ink outline and
  a label in a paper-2 box with a hairline. Battery bar under the marker 20x3. Trails 30 min in
  the activity color at 70%.
- **Day timeline** (SVG): battery as an ink line (1.5px) over a 6% ink area; 15% and 35%
  thresholds as dashed `--line-strong`; activity band 10px in activity colors; charging and
  generator spans as 4px bars below in green and red; axis ticks 12px ink-3; hover crosshair
  1px ink with a paper-2 tooltip box.
- **Charging schedule** (new panel on the tug day page, SVG): a 24h strip. Background bands
  show the tariff tiers as three ink tints (off-peak none, mid-peak 5%, on-peak 10%) with the
  $/kWh printed once per tier at the left. Row 1 "At arrival": charger power as green bars
  (height = kW/charger_kw). Row 2 "Scheduled": the same for the scheduled profile. Right-side
  readout: two stat values "$1,420 at arrival" and "$1,180 scheduled", and a footnote
  "Scheduled charging moves the same energy to the cheapest minutes of each stop. The stop's
  end time is used as the deadline." Data comes from `tugday.tariff.bands`, `tugday.charging[].scheduled_windows`
  and `tugday.totals.charge_cost_usd_*` (see docs/CONTRACT.md).
- **Rerun inspector**: slide-over 60vw (100vw on phones), `--paper-2`, hairline on the left;
  pass `theme="light"` to the viewer. Skeleton text "Loading inspector (about 25 MB)".

## Layout

Same structure as v2: fleet page is a left rail (`--rail-w`, `--paper-2`, hairline right,
scrolls independently) with title block, clock and controls, headline block with slider and
weekly stats, fleet list with inline detail, footer; the map fills the rest. Phones: map 44vh,
then the rail content in flow, headline before the list. Tug day page: 1120px column; header,
totals, timeline panel, then Charging schedule panel full width, then Jobs and Track side by
side. About: 720px text column, vertical architecture list, assumptions table.

## Voice

Short plain sentences, sentence case, no exclamation marks. Footer on every page:
"Independent project, not affiliated with Arc. Tracks: NOAA AIS, Dec 2–8 2024." (The dataset
dates come from summary.json so a newer recording updates them.)
