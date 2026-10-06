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

---

# Landing addendum (v6, "black and centered")

Applies to `/` and the landing variant of the nav. The console keeps the v4 light system.
Reference: a black single-column landing with a centered wordmark, one pill button, a two-line
headline, one video, one paragraph. Nothing else.

- Background #000000. Headline #ffffff, Geist 600, 56–76px, -0.045em, line-height 1.0, lowercase,
  two lines, centered, max-width 820px.
- Nav 72px, transparent: "portfolio" and "github" links left (#a0a0a0, hover white), wordmark
  "tugboard" centered (15px/500), white pill "open the console" right.
- Video frame centered, max-width 840px, 16:9, radius 16px, poster at 55% brightness, 56px white
  play button, the word "demo soon" over it at 44px/600 white 70%.
- Paragraph centered, max-width 660px, 18px/1.55, #c8c8c8, lowercase; one closing line; fine print
  #7a7a7a 13px with the independence sentence and the data dates.
- No footer, no borders, no diagrams, no mono labels, no icons. 120px of black at the bottom.
- Mobile: headline 40px, frame full width with 16px gutters, no horizontal scroll.

---

# v7: one dark system (console, landing, docs)

The landing's black page becomes the whole product's base. Reference feel: Linear and Vercel
dashboards for the console (flat, dense, hairlines, no tiles), isoquant.ai for schematic
line-art. Pro, modern, quiet. No decorative icons; functional icons as 1.5px strokes only.

## Tokens (`:root`, prefix `--d-`; the console migrates to these and the light tokens go away)

```css
--d-bg: #0a0a0a;            /* console page */
--d-bg-landing: #000000;    /* landing and docs page */
--d-rail: #0f0f10;          /* sidebar / rail */
--d-surface: #141415;       /* panels, popovers */
--d-surface-2: #1b1b1d;     /* hover rows, segmented track */
--d-line: rgba(255,255,255,0.08);
--d-line-2: rgba(255,255,255,0.16);
--d-fg: #f2f2f2;
--d-fg-2: #a3a3a8;
--d-fg-3: #6e6e75;
--d-green: #43ce95;  --d-blue: #78b1f5;  --d-amber: #efba53;  --d-red: #f07878;  --d-orange: #f59a55;
--d-act-transit: var(--d-blue); --d-act-assist: var(--d-orange); --d-act-idle: #5c5c63; --d-act-charging: var(--d-green);
--d-radius: 8px; --d-radius-sm: 4px; --d-radius-pill: 9999px;
--d-shadow: 0 12px 40px rgba(0,0,0,0.5);
--d-ease: cubic-bezier(.2,.8,.2,1); --d-t: 160ms;
```

Type: Geist 400/500/600, Geist Mono 400. Console body 13px (dense), labels 12px `--d-fg-3`,
headings 14px/600, headline number 56px/600 -0.03em. Sentence case. Tabular numbers.

## Console (`/app`)

Layout: a left **rail** 340px, `--d-rail`, 1px right hairline, full height under a 48px top bar;
the map fills the rest with no margin and no radius (edge to edge), dark basemap
`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` with its labels dimmed.
Top bar (replaces the nav on `/app`): 48px, `--d-bg`, bottom hairline; left: wordmark
"tugboard" 14px/500 and a breadcrumb "Fleet"; center: nothing; right: "docs", "github" as
13px `--d-fg-2` links, a "Get started 2/4" ghost pill with a 24px progress bar, and a 28px
"Feedback" ghost link.

Rail, top to bottom, sections separated by hairlines (no tiles, no gray cards):
1. **Transport row** (56px): play/pause as a 28px square button with `--d-surface` fill; the
   clock "Mon, Dec 2 · 01:13:53 UTC" in mono 13px; speed as a compact segmented control
   (60 / 120 / 300, 11px) on the right. Below it a 2px week scrubber spanning the rail width
   with day ticks as 11px labels; the played part is `--d-fg`.
2. **Headline block** (padding 20px): label "Electric share this week"; the number "71%" at
   56px with the percent in `--d-fg-3`; one line "of 154 tug-days ran without the generator";
   the battery slider (2px track, 12px thumb, played part `--d-fg`) with the label row
   "Battery" left and "6,000 kWh" right in mono; a 2x2 **stat grid** with hairline dividers:
   Generator hours, Charged kWh, Charging cost at arrival, Charging cost scheduled, each
   value 16px/500 with label 11px above; one footnote line.
3. **Fleet table**: header row "Fleet · 22 tugs" with a tiny filter segmented control
   (All / Working / Charging / Generator); rows 36px: name 13px, status as a 6px dot plus
   12px text, battery as a 48x3 bar plus percent in mono. Hover `--d-surface-2`; selected
   row `--d-surface` with a 2px left bar in the activity color. The selected tug's detail
   expands inline as a dense definition grid (Speed, Heading, Power, Generator, Position,
   Job) in mono values, with a "Open day" primary button (white fill, black text, 28px) and
   the MMSI.
4. Footer line 11px `--d-fg-3` with the independence sentence.

Map: markers keep the boat silhouette, activity colors, a 1px dark stroke instead of white;
selected gets a white ring; labels are `--d-surface` chips with a hairline. Trails as before.
Getting started checklist: `--d-surface`, hairline, `--d-shadow`, same behavior. Tour
popovers: `--d-surface`, hairline, white "Next" button.

Tug day (`/app/tugs/[id]`): same dark tokens; panels are hairline-bordered sections on
`--d-bg` (no fills), headings 14px/600, charts recolored: SOC line `--d-fg` over a 6% white
area, thresholds dashed `--d-line-2`, activity band colors as above, charging/generator spans
green/red, tariff bands as 4%/8% white tints. Rerun inspector: `--d-surface`, `theme="dark"`.

## Landing (`/`), additions below the fine print

Keep the black centered page exactly as it is above the fold. After the fine print, add a
section titled "how it works" (lowercase, 28px/600, centered) with a **2x2 grid of cells**
(1px `--d-line`, radius 4px, `#0b0b0b` fill, 28px padding) in the isoquant manner: each cell
has a mono index label (Geist Mono 12px, uppercase, 0.08em: "01 / TRACKS"), a schematic
line-art SVG 100% wide and 180px tall drawn in `--d-fg-2` 1px strokes inside a dotted frame
with 12px corner brackets, a title (20px/500), one line (`--d-fg-2`), and two bordered chips.
The four diagrams and copy:
- 01 / TRACKS. Harbor plan: three channel lines converging into a basin, a dock rectangle, a
  tug square advancing along the route in 12 discrete steps leaving a dotted trail. "Real
  tracks." "NOAA AIS positions for 22 harbor tugs, one week, resampled to one minute." Chips:
  San Pedro Bay, Dec 2–8 2024.
- 02 / LABELS. A 24x6 grid of 5px squares; most at 20%, runs lit in `--d-fg` for assist and
  `--d-blue` for transit; one row's run slides slowly. "Labeled minutes." "Transit, assist
  beside a real ship, idle, charging at a detected dock." Chips: Speed, Ship proximity.
- 03 / BATTERY. A stepped state-of-charge line with two dashed thresholds and a bracketed
  span where it dips under the lower one; a small square rides the line. "Battery
  simulation." "Power per activity, a generator that cuts in at 15%, shore charging at the
  dock." Chips: 6,000 kWh, config.yaml.
- 04 / REPLAY. Six small boxes on a rail (Replayer, IoT, Lambda, DB, Socket, Console) with a
  packet square hopping box to box, each lighting briefly. "Live replay." "Published like a
  real boat would, into AWS IoT Core or a local socket, into the console." Chips: MQTT, WebSocket.
One slow CSS loop per diagram (3–6 s), static under reduced motion. Below the grid a
centered secondary link "read how I built it" to `/docs`. Then 120px of black.

## Docs page (`/docs`, "How I built it")

Black page, two columns from 1024px: a sticky left table of contents (220px, 13px links,
active in `--d-fg`) and a 720px article column. Title "How I built Tugboard" 44px/600, a
one-line dek, then sections from `docs/BUILD_LOG.md` (the source of truth for the text; render
its sections in order, in the first person, do not change facts or numbers). Each section has
an **Excalidraw-style diagram**: hand-drawn look via `roughjs` (MIT) rendering into inline SVG
on the client, strokes in `--d-fg-2`, fills with rough hachure in the status colors at low
opacity, labels in the Excalifont face (fetch the woff2 from the `@excalidraw/excalidraw`
package on unpkg at build time into public/fonts; if unavailable, use Google's "Caveat");
static, no animation. Plus, where BUILD_LOG marks `[svg-anim: ...]`, a small animated inline
SVG of your own (CSS loop, reduced-motion static) illustrating that mechanism. Code and
numbers in mono. Pull quotes for the two or three decisions that mattered. A "what I would
do next" section at the end. The nav on `/docs` is the landing nav (black) with the "docs"
link active.

---

# v8: paper is the product (light and dark)

The paper landing (formerly `/paper`) becomes `/`. The console and docs adopt the same
paper-and-ink scheme, light by default, with a dark mode that is the current v7 dark system.
Everything keeps the v7 structure; only colors, the basemap and a few hard-coded hexes change.

## Theme mechanism

- `html[data-theme="light" | "dark"]`, default light. Persisted in `localStorage` key
  `tugboard.theme` (try/catch). An inline script in the root layout applies the saved theme
  before paint (no flash); `color-scheme` follows. A `useTheme()` hook exposes `{theme, toggle}`
  via a small external store (`useSyncExternalStore`), and a `ThemeSquare` control: a 12px
  square, 1px border in the current foreground at 35%, filled with the *other* theme's page
  color, `aria-label="Switch to dark mode"` / `"Switch to light mode"`. It sits: on the landing
  next to the wordmark; in the console top bar right of "github"; in the docs nav right of "docs".
- Keep the `--d-*` token names. Define dark values under `html[data-theme="dark"]` (the v7 set,
  unchanged) and light values under `:root` (default):

```css
--d-bg: #f5f4ef;          --d-bg-landing: #f3f1ea;    --d-rail: #faf9f6;
--d-surface: #ffffff;     --d-surface-2: #edece7;
--d-line: rgba(28,26,22,0.10);  --d-line-2: rgba(28,26,22,0.20);
--d-fg: #1c1a16;  --d-fg-2: #5f5c55;  --d-fg-3: #8f8c84;
--d-green: #1f8a5a;  --d-blue: #2f63c7;  --d-amber: #b07a12;  --d-red: #c2453a;  --d-orange: #d0661e;
--d-act-idle: #a9a69d;
--d-shadow: 0 12px 40px rgba(28,26,22,0.14);
```

- Map basemap follows the theme: CARTO Positron in light, dark-matter in dark; `dimLabels`
  uses `--d-fg-3` either way; markers keep a 1px stroke in the page color (`--d-bg`) and a ring
  in `--d-fg` when selected. Rerun inspector `theme` prop follows the theme. Tour overlay and
  popovers, checklist, modal, chips, charts, docs figures and animations: replace every
  hard-coded dark hex (#0a0a0a, #0e0e0e, #000, rgba(255,255,255,x), #f2f2f2 and friends) with
  the tokens so both themes work. Primary buttons are `--d-fg` fill with `--d-bg` text in both.
- Landing (`/`): the paper page as it is, but its colors come from the theme: light = paper
  with ink dashes (current), dark = `#0b0b0b` page with light dashes `[236,234,228]` and the
  dark grain colors `["#121212","#0e0e0e","#161616"]`. The modal follows the theme.
- Routes: `/` renders the paper landing; `/paper` redirects to `/` (permanent); the old black
  landing component tree (`components/landing/*`) is deleted. `/docs` nav: wordmark,
  "portfolio", "github", "docs", the theme square, and "open the console" as the primary pill;
  background `--d-bg-landing`, no border.
- Poster: retake `public/poster.png` from the light console.

## Acceptance

- Light by default; toggle flips every page without reload or flash; the choice survives reload.
- No hard-coded page or text colors left in `src/` outside the token block (grep `#0a0a0a`,
  `#0e0e0e`, `#f2f2f2`, `rgba(255, 255, 255` in component CSS returns nothing).
- Screenshots of `/`, `/app` (tug selected), `/app/tugs/368133450?date=2024-12-02` (with the
  inspector open), and `/docs` in both themes at 1440, plus `/` and `/app` at 390.
