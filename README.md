# Tug fleet replay

Real Port of Los Angeles tug traffic, replayed as if each tug were a hybrid-electric boat streaming live telemetry. The headline output is one number: the share of tug-days that run without the generator at a given battery size.

**Headline: 70.8% of 154 tug-days ran electric-only at 6,000 kWh** (22 harbor tugs, Dec 2–8 2024, 8 detected docks). Drag the slider on the dashboard to see how that moves with battery size.

> Independent project. Not affiliated with Arc Boats, Curtin Maritime or any tug operator. Vessel names come from public AIS broadcasts. Every powertrain number is a labeled estimate; see [Assumptions](#assumptions).

## What it does

1. **Fetch**: downloads a week of NOAA MarineCadastre AIS daily files (about 2 GB), keeps tugs and large ships inside San Pedro Bay, deletes the zips as it goes.
2. **Label**: builds a continuous 1-minute track per tug and labels each minute `transit`, `assist`, `idle` or `charging` by rule. An assist is a slow tug within 60 m of a real ship's hull; a slow tug on its own is waiting.
3. **Simulate**: estimates power per activity, steps a battery with a generator that cuts in at 15% and out at 35%, and charges from shore while the tug sits at a detected dock.
4. **Sweep**: repeats the simulation for every battery size from 1,000 to 8,000 kWh and prices charging on a time-of-use tariff, charge-on-arrival vs scheduled.
5. **Export**: writes `fleet.json`, one JSON per tug-day, `summary.json`, and one Rerun recording per tug-day.
6. **Replay**: publishes each tug's telemetry on a sped-up clock to AWS IoT Core (or a local WebSocket stand-in, or a live Rerun viewer). Replayed data enters through the same path a real boat's would, so swapping in a live source changes one component.
7. **Dashboard**: Next.js + MapLibre fleet view with battery bars on every tug, a tug-day page with a native timeline, a battery-size slider that moves the headline, and an embedded Rerun inspector for scrubbing any tug-day.

## Architecture

```
NOAA AIS ──▶ fetch_ais ──▶ parquet ──▶ pipeline (label, simulate, sweep) ──▶ fleet.json, tugdays/*.json, summary.json, *.rrd
                                                                                      │
                     replayer ──MQTT──▶ AWS IoT Core ──rule──▶ Lambda ingest ──▶ DynamoDB tug_live + tug_history
                        │                                              └──▶ API Gateway WebSocket ──▶ dashboard
                        └── local: `tug serve` (WebSocket + JSON API)        S3 + CloudFront ──▶ tug-day JSON, Rerun recordings
```

The dashboard has two data modes with one component tree: `static` reads the exported JSON from `public/` (what the live link uses, no backend), `ws` connects to the WebSocket and API (AWS or `tug serve`). The exported data (`dashboard/public/data`, about 30 MB of JSON that compresses to under 2 MB, and `dashboard/public/recordings`, 154 Rerun files totalling 39 MB) is committed so the static site deploys from the repo alone.

## Reproduce the headline number

```bash
make fetch      # ~30 min on a 2 MB/s connection; needs about 1 GB of free disk at any one time
make headline   # prints: XX% of N tug-days ran without the generator at 6000 kWh
make test       # rules, energy model, battery sim, replayer
make build      # writes data/processed/site/ (JSON + Rerun recordings)
make sync-dashboard && make dashboard
```

Requires [uv](https://docs.astral.sh/uv/) and Node 22. `make build` with `--no-recordings` skips the Rerun files.

## Run the live pipeline locally

```bash
make serve                       # WebSocket on :8765, JSON API on :8766, replaying fleet.json at 120x
cd dashboard && NEXT_PUBLIC_DATA_MODE=ws NEXT_PUBLIC_WS_URL=ws://localhost:8765 NEXT_PUBLIC_API_URL=http://localhost:8766 npm run dev
make replay-rerun                # or: watch the harbor move in a native Rerun viewer
```

## Deploy the dashboard (Vercel)

The dashboard is linked to the Vercel project `tug-fleet-replay` (settings live in `dashboard/.vercel`, gitignored). From `dashboard/`:

```bash
npx vercel deploy --prod --yes
```

Vercel builds the Next.js app and serves the committed data and recordings from `public/`. No environment variables are needed in static mode. The repo-root `.vercelignore` keeps the Python side out of the upload; deploy from `dashboard/`, not the repo root.

## Deploy to AWS

See [infra/README.md](infra/README.md). `cd infra && npm run deploy` creates IoT Core, Lambda, DynamoDB, S3 + CloudFront, and the WebSocket and HTTP APIs with CDK; `scripts/iot_provision.sh` mints the replayer's device certificate; `.venv/bin/tug replay --to iot` streams.

Cost note: at 120x the replayer publishes one message per tug every 0.5 s, about 44 messages per second for 22 tugs. That is roughly $4 per million messages across IoT Core, Lambda and DynamoDB, so run the AWS replay on demand for demos rather than 24/7; the static dashboard needs no backend at all. The idle stack costs well under $1 per month.

## Rerun

Each tug-day is also a [Rerun](https://rerun.io) recording: the track on a map, position colored by activity, state of charge, power draw, generator and charger power, and the rule label as time series, all on the original AIS clock. The dashboard embeds the Rerun web viewer (`@rerun-io/web-viewer-react`, loaded only when the inspector opens because it is a ~25 MB download). Recordings are plain files, so every tug-day has a shareable link.

For validation, `tug sample` writes 50 random segments with speed, position and the nearest ship to `data/labels/hand_sample.csv`; fill `hand_label` and `tug score` reports agreement with the rules. Target from the PRD: 85%.

## Assumptions

All in [config.yaml](config.yaml); the dashboard's About page lists the same table.

| Parameter | Value | Status |
| --- | --- | --- |
| Battery capacity | 6,000 kWh | Cited: Arc/Curtin tugs carry "6 megawatt-hour batteries" ([Marine Log](https://www.marinelog.com/inland-coastal/arc-curtin-maritime-sign-160m-deal-for-8-hybrid-tugs/), Sept 2025) |
| Usable fraction | 90% | Estimate |
| Assist power | 1,400 kW | **Weakest estimate.** AIS gives speed, not bollard pull. |
| Transit power | 900 kW at 8 kn, cubic in speed, 60 kW floor | Estimate |
| Idle (hotel) load | 45 kW | Estimate |
| Generator | 600 kW, in below 15% SOC, out above 35% | Estimate; Marine Log describes "a small diesel generator" |
| Shore charger | 2,000 kW while idle 20+ min at a dock | Estimate |
| Docks | Auto-detected idle clusters (Dock A, B, ...) | Derived from the tracks |
| Tariff | $0.14 / $0.22 / $0.45 per kWh off/mid/on-peak | Shape modeled on SCE TOU-8; confirm before quoting |
| Fleet | Length 15–45 m, 99th-pct speed ≤ 14 kn, present 5 of 7 days, moves ≥ 3% of the time | Rule; drops pilot boats, barges and misfiled ships |
| Data gaps | ≤ 30 min interpolated; longer gaps hold position at zero speed | AIS class A at a dock still reports every few minutes |

The scheduled-charging cost uses the stop's real end time as the deadline, which a live scheduler would not know exactly.

## Newer data: record live AIS

NOAA publishes its archive about a year late. `tug record` streams live AIS for the San Pedro box from [aisstream.io](https://aisstream.io) (free API key in `.env`, see `.env.example`) into `data/live/raw/` as JSON lines, one file per UTC day, flushed on every message. `tug finalize` turns those into the same `tugs_*.parquet` and `ships_*.parquet` files the NOAA fetch produces, and `tug build --processed data/live/processed` runs the normal pipeline on them. Record at least three full days before building; the fleet filter needs tugs present on most days.

## Data

NOAA MarineCadastre AIS daily files for 2024-12-02 to 2024-12-08 ([index](https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2024/)). 2024 was the newest full year published at build time; December was chosen over the holidays, and this week has no missing days. Vessel type codes 31, 32 (towing), 52 (tug) and MarineCadastre's 1023/1025 (tug tow) were confirmed against the 2024 files on day 1. Bounding box: 33.60–33.80 N, 118.32–118.05 W.

## Layout

```
config.yaml            every estimate, one file
pipeline/tug_replay/   fetch_ais, tracks, ships, activity, energy, battery, tariff, pipeline, export, rerun_log, replayer, local_server, cli
pipeline/tests/        pytest
dashboard/             Next.js 16, TypeScript, MapLibre, Rerun web viewer
infra/                 AWS CDK (TypeScript) + Python Lambdas
docs/                  CONTRACT.md (JSON shapes), DESIGN.md (tokens), DEMO.md (video script)
```

## Status against the PRD

| Feature | Status |
| --- | --- |
| Replayer publishes each tug's position on a sped-up clock | Done: `tug replay`, `tug serve`, IoT publisher |
| Activity labels by rule | Done; hand-check tooling in place (`tug sample`, `tug score`), labels not yet scored |
| Energy model and battery simulation | Done, unit tested |
| Live map with battery bars | Done |
| Tug detail page with a day timeline | Done, plus Rerun inspector |
| Battery-size slider and fleet summary | Done (precomputed sweep, no reload) |
| Charging schedule vs time-of-use prices | Done in the summary |
| React Native screen | Not started |
| Learned activity classifier | Not started |
