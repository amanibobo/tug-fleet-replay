# Design system (v4, "soft product")

Reference: the ElevenLabs web app (white canvas, soft gray rounded tiles with no borders, vivid
colored glyphs on the tiles, pill buttons, friendly sans). This is a product, not a project:
confident copy, a name, a landing page, onboarding. Light mode only.

Product name: **Tugboard**. Tagline: "Fleet replay for hybrid-electric tugs." The wordmark is
the word "Tugboard" in 600 weight next to a 20px rounded-square logo mark (ink square with a
white tug silhouette or simply a white rounded "T"). Independence line stays in the footer.

## Rules

1. Sentence case everywhere. No uppercase labels. No tracked letter-spacing.
2. **Tiles, not boxes.** Surfaces are `--tile` gray with radius 16–20px and **no border**. No
   1px outlines around panels. Separation comes from whitespace and tile color, never lines.
   Thin dividers (`--divider`) appear only between list rows inside a tile.
3. **Color lives in glyphs, chips and data.** Every tile gets one colorful glyph (a 40px
   rounded square or circle in a saturated color with a white icon). Text stays ink. Buttons are
   black or white. Charts and markers use the data palette.
4. Shadows: only on floating elements (popovers, the checklist card, the tour highlight), and
   soft: `0 8px 30px rgba(0,0,0,.08)`.
5. Motion: 200ms ease on hover (tile lifts 1px and darkens one step), 400ms for panels. Respect
   reduced motion.
6. One estimate footnote per data panel, as before.

## Tokens

```css
:root {
  --bg: #ffffff;
  --tile: #f4f4f5;          /* zinc-100 */
  --tile-2: #e9e9ec;        /* hover */
  --divider: #ececef;
  --ink: #0a0a0b;
  --ink-2: #52525b;
  --ink-3: #8a8a93;

  /* accents: vivid, used on glyphs, chips, markers, series */
  --blue: #3b82f6;    --blue-soft: #e8f0fe;
  --orange: #f97316;  --orange-soft: #fff1e6;
  --green: #22c55e;   --green-soft: #e7f8ee;
  --red: #ef4444;     --red-soft: #fdecec;
  --purple: #8b5cf6;  --purple-soft: #f1ebfe;
  --amber: #f59e0b;   --amber-soft: #fff6e0;
  --teal: #14b8a6;    --teal-soft: #e3f7f4;
  --navy: #0b1220;    /* landing footer band */

  --act-transit: var(--blue);
  --act-assist: var(--orange);
  --act-idle: #a1a1aa;
  --act-charging: var(--green);
  --status-generator: var(--red);

  --font-sans: var(--font-inter), "Inter", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  --font-mono: var(--font-mono-family), ui-monospace, "SF Mono", Menlo, monospace;

  --r-tile: 18px;
  --r-card: 14px;
  --r-ctrl: 10px;
  --r-pill: 9999px;
  --shadow-float: 0 8px 30px rgba(0,0,0,.08);
  --ease: cubic-bezier(.2,.8,.2,1);
  --t: 200ms;

  --rail-w: 400px;
  --nav-h: 56px;
  --gutter: 20px;
  color-scheme: light;
}
```

## Type

Inter via `next/font/google` (400, 500, 600, 700) and JetBrains Mono (400) for machine values.

| Role | Size | Weight | Tracking |
| --- | --- | --- | --- |
| Hero headline (landing) | 56–72px | 600 | -0.03em |
| Headline number (console) | 64–80px | 600 | -0.03em |
| Page title | 28px | 600 | -0.02em |
| Section title | 22px | 600 | -0.01em |
| Tile title | 15px | 600 | 0 |
| Body | 15px | 400 | 0 |
| Secondary | 14px | 400, ink-2 | 0 |
| Label | 13px | 500, ink-3 | 0 |
| Mono | 13px | 400 | 0 |

## Components

- **Top nav** (both landing and console): 56px, white, no border; left: logo mark + "Tugboard";
  right: pill buttons. Landing: "How it works", "Data", "GitHub" as text links, then a black pill
  "Open the console". Console: "Landing" text link, "Docs" (GitHub) white pill with border
  `--divider`, "Feedback" white pill (mailto placeholder), and a 32px circular avatar-style
  button that opens the Getting started checklist.
- **Buttons**: pill. Primary: ink fill, white text, 36px, 14px/500. Secondary: white fill,
  1px `--divider`, ink text. Ghost: text only ink-2 → ink on hover. Icon buttons 36px circles.
- **Tile**: `--tile`, radius 18px, padding 20px, no border. Hover (if clickable) `--tile-2` and
  translateY(-1px).
- **Glyph**: 40px rounded square (radius 12px) filled with an accent, white 20px icon inside
  (inline SVG; simple strokes). Each tool has its own color: Fleet replay blue, Tug days
  purple, Charging planner green, Rerun inspector orange, Live recorder teal, Data amber.
- **Chip**: pill, 12px/500, tinted background `--x-soft` with text in the accent: Electric
  green, Charging blue, Idle gray (`--tile-2` with ink-2 text), Generator red. Also "New" chip
  black with white text, like the reference.
- **Stat**: label 13px ink-3 above, value 26px/600 below, unit 13px ink-3.
- **Battery bar**: 6px, pill, track white (on tiles) or `--tile` (on white); fill green → amber
  under 35% → red under 15%.
- **Slider**: 4px pill track `--tile-2`, filled part ink, 18px white thumb with
  `--shadow-float`.
- **Segmented control**: pill container `--tile`, selected segment white with `--shadow-float`
  (like a toggle), 13px/500.
- **List rows** inside tiles: 44px, divider lines between rows, hover white.
- **Map**: CARTO Positron. Markers: 10px circles in the activity color with 2px white stroke
  and a tiny heading tick; selected gets a 3px white ring plus 1px ink ring; label is a white
  pill with the soft shadow. Trails 30 min in activity color at 0.8.
- **Day timeline and Charging schedule**: same data as today; restyle: tile background, ink
  line for battery over a 10% blue area; activity band 12px with rounded ends per segment;
  charging/generator spans as 6px pills in green/red; tariff bands in `--amber-soft` (on-peak),
  `--tile` (mid), none (off).
- **Rerun inspector**: slide-over 60vw, white, radius 18px on the left corners, `--shadow-float`,
  `theme="light"`.
- **Getting started checklist** (Frigade-like, own code, no SaaS): a floating card bottom-right
  of the console (320px, white, radius 18px, shadow). Title "Get started", a progress ring
  (e.g. 2 of 4), and four steps, each with a glyph, title and one line: 1 Play the replay,
  2 Select a tug, 3 Move the battery slider, 4 Open a tug day. Steps tick automatically when the
  user does the action (wire to the existing state: playing toggled, selection set, slider
  changed, navigation to /app/tugs/[id]). Progress persists in `localStorage` (key
  `tugboard.onboarding`, try/catch). "Take the tour" button starts the tour. Dismissable with
  an x; reopens from the nav avatar button. On phones it collapses to a pill "Get started 2/4".
- **Product tour**: use `driver.js` (`npm i driver.js`, MIT, tiny). Five stops on the console:
  the clock and speed control, the headline and slider, the fleet list, the map, the detail
  "Open day" button (select the first tug for that stop). Popover styled to match: white,
  radius 14px, ink title, ink-2 text, black pill "Next". Starts automatically on the first visit
  (same localStorage key), after the fleet data has loaded.

## Routes

- `/` **Landing page** (new; `/about` is removed and its assumptions table moves here).
  Sections, top to bottom, max-width 1120px, 20px gutters:
  1. **Hero**: left column: chip "Real Port of Los Angeles traffic", headline "See a tug fleet
     run on batteries, before it exists.", sub "Tugboard replays a week of real harbor
     traffic as hybrid-electric telemetry and shows what battery size keeps the generator off."
     Buttons: black pill "Open the console", ghost "Watch the demo". Right column: the **demo
     video placeholder**: a 16:9 tile radius 18px, poster image `public/poster.png` (take a
     1280x720 screenshot of `/app` with a tug selected and save it there), a centered white
     56px circular play button with the shadow, and a small chip bottom-left "Demo video, 75 s,
     coming soon". Clicking does nothing yet but animates the button (scale 0.96).
  2. **Numbers strip**: four stats from `/data/summary.json`: electric share at the default
     battery, tug-days, tugs, detected docks. Each in a tile with a glyph.
  3. **How it works**: section title + four step tiles in a row (2x2 on phones), numbered
     glyphs in different accents: 1 Real tracks (AIS positions from NOAA, one week, one minute
     apart), 2 Labeled minutes (transit, assist next to a real ship, idle, charging at a
     detected dock), 3 Battery simulation (power per activity, generator cut-in, shore charging,
     every number in config.yaml), 4 Live replay (published like a real boat would, into AWS
     IoT or a local socket, into this console).
  4. **Product tiles**: six tool tiles like the reference's row: Fleet replay, Tug days,
     Charging planner, Rerun inspector, Live recorder, Data and assumptions. Each a glyph,
     title, one line, and a link (console routes, or an anchor to the assumptions section for
     the last one, GitHub for the recorder).
  5. **Get started**: three tiles mirroring the checklist (Open the console, Take the tour,
     Read the data notes), with a black pill button each.
  6. **Data and assumptions** (`id="data"`): short paragraph, the assumptions table from
     `summary.json` as list rows inside a tile (Parameter, Value, Note), the independence
     sentence.
  7. **Footer band**: full-bleed `--navy` band, 100% width, min-height 340px. Inside: the
     **ASCII tug animation** (see below) centered, then a row with the wordmark in white,
     links (Console, GitHub, Data), and "Independent project, not affiliated with Arc. Tracks:
     NOAA AIS, Dec 2–8 2024." in `rgba(255,255,255,.55)`.
- `/app` **Fleet console** (the current `/` moved). Rail becomes a white column with tiles
  stacked inside it with 12px gaps: Clock tile, Headline tile, Fleet tile (list rows with
  dividers; inline detail opens as a nested white card). Map fills the rest with 12px white
  margin and radius 18px (the map itself is a rounded tile).
- `/app/tugs/[id]` **Tug day** (moved from `/tugs/[id]`; keep the old path redirecting). Tiles
  for totals, Battery and activity, Charging schedule, Jobs, Track.

## ASCII tug animation (landing footer)

A client component rendering a `<pre>` in JetBrains Mono 12px (10px on phones), line-height
1.15, color `rgba(255,255,255,.85)` for the hull and superstructure, `--blue` at 70% for the
water, `rgba(255,255,255,.5)` for smoke. Width 72 columns, 11 rows. Animate with
`requestAnimationFrame` at 6 frames per second; pause when the `prefers-reduced-motion`
query matches (render a static frame) and when off-screen (IntersectionObserver).

Frame construction each tick `k`:
- Water: a 72-column string built by repeating `"~  ~~   ~ "` and rotating it left by `k`
  characters; render two water rows, the second rotated by `k + 3`.
- Bob: shift the whole boat up one row on frames where `floor(k / 4) % 2 === 1`.
- Smoke: three puff glyphs `(`, `)`, `o` rising from the stack; their row and column offset
  depend on `k % 6`, and the top puff fades (use `·`).
- Boat (static art, keep proportions; the tug tows a barge on the right):

```
                 .
                ( )
                 |
        _________|___________
       |  [ ]  [ ]  [ ]      |
   ____|_____________________|____                 ___________________
  |  TUGBOARD   o   o   o   o   o  |---------------|  []  []  []  []  |
  \________________________________/               \___________________/
~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~
  ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~   ~ ~  ~~
```

Keep the characters ASCII except `·`. Overflow hidden; on narrow screens scale with
`transform: scale()` from a measured container width rather than wrapping.

## Voice

Product voice: short, confident, plain. "Open the console", "Watch the demo", "Take the tour".
No exclamation marks. The independence line is factual and stays in the footer of every page.
