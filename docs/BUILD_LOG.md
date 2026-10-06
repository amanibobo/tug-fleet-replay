# How I built Tugboard

> First person, factual. This file is the source of truth for the `/docs` page. Each `##` is a
> section; `[diagram: ...]` marks an Excalidraw-style figure and `[svg-anim: ...]` marks a small
> animated SVG. Numbers are the real ones from the build.

## Why this project

Arc Boats signed a $160 million contract with Curtin Maritime for eight hybrid-electric tugs,
starting at the Ports of Los Angeles and Long Beach. I wanted to show I understood the tug
business and could build a real-time data product, so I picked one question a fleet manager
would actually ask: at a given battery size, what share of tug-days run without the generator?
Everything else in the project exists to answer that number honestly.

[diagram: the question. A tug, a battery, a generator with a question mark, an arrow to "71%".]

## Research first

Before writing code I looked for three facts. First, the battery: Marine Log's coverage of the
contract says the tugs are 4,000 hp boats with 6 megawatt-hour batteries and a small diesel
generator for demanding days. That gave me a cited default for the slider instead of a guess.
Second, the data: NOAA's MarineCadastre publishes every AIS position report in US waters as
daily files, but with about a one-year lag. On the day I checked, the 2025 folder was empty and
2024 was published from September onward, so I took the week of December 2 to 8, 2024, a full
Monday to Sunday with no holidays. Third, what AIS can and cannot tell me: it reports position,
speed and heading every few seconds, but not pushing force. That made "assist power" the
weakest estimate in the whole model, and I labeled it that way everywhere.

[diagram: three research threads (battery size, data source, what AIS reports) feeding a config file.]

## Getting the data without filling my disk

Each daily AIS file is about 300 MB zipped and a few GB unzipped, and my laptop had 6 GB free.
The fetcher downloads one day, streams the CSV out of the zip in 500,000-row chunks, keeps only
rows inside a box around San Pedro Bay (33.60 to 33.80 N, 118.32 to 118.05 W) whose vessel
type is a tug or towing vessel (codes 31, 32, 52, and MarineCadastre's 1023 and 1025), writes
them to parquet, and deletes the zip before fetching the next day. Seven days, about 2.1 GB
downloaded, 74 MB kept. I also kept every ship over 100 m in the box, which turned out to be
the most important decision in the labeling step.

[diagram: zip -> stream -> filter box + type -> parquet, with the zip going to a trash can.]
[svg-anim: rows flowing through a filter, most falling away, a few landing in a parquet block.]

## Picking the fleet

54 vessels passed the type filter that week, and not all of them were harbor tugs. Pilot boats
are coded as tugs and run at 25 knots; a 179 m vessel was misfiled; some boats sat at a dock all
week. The fleet rule: length 15 to 45 m, 99th-percentile speed under 14 knots, at least 200
fixes on at least five of the seven days, and moving at least 3% of the time. That left 22
tugs, real boats with real names: Jamie Ann, Barbara J Mulholland, Sarah Avrick, Master,
Hercules, the Delta boats, Millennium Maverick.

[diagram: a funnel from 54 vessels to 22 tugs with the four rules as gates.]

## One minute at a time

AIS fixes arrive irregularly, every two seconds when a boat is moving and every three minutes
when it is tied up. I resampled every tug to a continuous one-minute grid for the whole week.
Gaps under 30 minutes are interpolated; longer gaps hold the last position at zero speed,
because a class A transponder at a dock still reports every few minutes, so a long silence
almost always means the tug is tied up. The ships got the same treatment so I could ask, for
every tug-minute, how far the nearest hull was.

[svg-anim: irregular dots snapping onto a regular minute grid.]

## Finding the docks from the data

I did not know where the tug bases were, so I let the data say. Cluster every minute where a
tug sits below 0.3 knots on a 120 m grid, keep cells with at least ten hours of idle time,
merge cells within 300 m, and the eight busiest cells are the docks. Dock A alone, on
Terminal Island, collected 27,000 idle tug-minutes in the week. The docks matter because
charging only happens there.

[diagram: a map of the harbor with idle-minute heat cells and the eight docks labeled A to H.]

## Labeling what a tug is doing

The first rule set used speed alone: under 0.5 knots is idle, 0.5 to 4 knots is assist, above
4 is transit. It looked plausible and it was wrong in two ways. A tug drifting at two knots in
the channel waiting for a ship is not assisting, and a tug escorting a ship at six knots is not
in transit. Adding the ships fixed both. The rule became: slow and within 60 m of a ship's
hull is assist, up to 8 knots when the ship is moving; slow and alone is idle; fast is transit.
On the first day that reclassified 1,313 "assist" minutes to idle and 624 "transit" minutes to
assist. Labels are median-smoothed over five minutes, runs shorter than three minutes are
merged into their neighbours, and a still stretch of 20 minutes or more inside a dock radius
becomes charging. A tug maneuvering at 1.5 knots inside the dock radius does not count as
plugged in; that bug cost me an evening.

[diagram: a decision tree: at dock and still 20 min -> charging; near ship and slow -> assist; fast -> transit; else idle.]
[svg-anim: a tug and a ship; when the tug comes within the hull circle the label flips from transit to assist.]

## The energy model, with its estimates on the table

Transit power scales with the cube of speed: 900 kW at 8 knots, with a 60 kW floor and a
3,000 kW clamp. Assist is a flat 1,400 kW, the weakest number in the model. Idle is 45 kW of
hotel load. The battery is a 6,000 kWh pack with 90% usable, starting full on Monday and
simulated continuously through the week, because charging happens overnight and the state of
charge on Thursday depends on Wednesday. The generator is 600 kW with hysteresis: it starts
below 15% and stops above 35%. A 2,000 kW shore charger runs whenever the label is charging. If
the generator cannot keep up, the shortfall is recorded as a deficit rather than hidden; at
6,000 kWh it is 3.4 MWh across the whole week.

[diagram: the battery loop: draw per activity -> SOC -> generator hysteresis band -> charger at dock.]
[svg-anim: a state-of-charge bar draining, crossing 15%, the generator lighting, the bar recovering to 35%.]

## The headline, and the slider behind it

Run that simulation once per battery size from 1,000 to 8,000 kWh in 250 kWh steps, count the
tug-days where the generator never ran, and divide by 154. At 6,000 kWh the answer is 70.8%.
At 3,000 kWh it is 43.5%, at 8,000 kWh 83.8%. The sweep is precomputed into one JSON file, so
the slider on the console recalculates with no server and no page reload. Every tug-day also
gets its own file: samples at one-minute resolution, the activity segments, the jobs, the
charging stops and the generator windows.

[diagram: a curve of electric share against battery size with the 6,000 kWh point marked.]

## Charging on a schedule

Charging as soon as a tug ties up is simple and expensive, because many stops start in the
late afternoon on-peak window. I modeled a time-of-use tariff with the shape of Southern
California Edison's TOU-8 (14, 22 and 45 cents per kWh off, mid and on peak) and a scheduler
that moves each stop's energy to the cheapest minutes before the stop ends. Same energy, same
charger, different timing: $153,816 for the week at arrival against $127,208 scheduled, 17%
lower. The scheduler knows the stop's real end time, which a live system would have to
predict; the page says so.

[diagram: a 24 h strip with tariff bands and two rows of charging bars, arrival vs scheduled.]

## Rerun as the replay inspector

The hardest interface in the plan was a scrubbable timeline. Instead of building one I wrote
each tug-day as a Rerun recording: the track and position on a map, state of charge, power,
generator and charger series, the rule labels, and a text log of every activity change, all
on the original AIS clock. A blueprint lays out the views, paused at midnight at 600x. The
web viewer embeds in React and opens a recording from a URL, so every tug-day is a shareable
link. Two things to know: the SDK and the viewer must be the exact same version, and the
viewer is a 50 MB wasm download, so the console loads it only when the inspector opens.

[diagram: Python -> .rrd file -> S3 or public folder -> embedded web viewer, with a scrubber.]

## Replaying it like a real fleet

The replayer reads the exported week and publishes one telemetry message per tug per minute of
replay time, 120x faster than real time. It is the only component that knows the data is
historical. Downstream nothing changes: AWS IoT Core takes the MQTT messages, a rule invokes a
Lambda that writes the live row to DynamoDB, appends history, and pushes the message to every
WebSocket connection; an HTTP API serves the fleet snapshot, the tug-day files and the summary
from S3 behind CloudFront. All of it is one CDK stack, deployed in one command, with unit
tests for the template and the handlers. For development there is a local stand-in, a Python
WebSocket server plus a tiny JSON API, so the console works with no AWS at all.

[diagram: replayer -> IoT Core -> Lambda -> DynamoDB / S3 -> WebSocket API -> console, with the local stand-in as a dotted bypass.]
[svg-anim: packets hopping along the data path.]

I also did the cost math before claiming anything. At 120x with 22 tugs the replayer sends
about 44 messages a second, roughly $4 per million messages across IoT, Lambda and DynamoDB, so
the AWS replay is something to run for a demo, not 24/7. The static console needs no backend.

## The console

Next.js 16, TypeScript, MapLibre. The fleet view replays the week in the browser from one
compact JSON file (12 MB raw, under 1 MB compressed), interpolating positions between minutes
so the boats move smoothly. Each tug is a small silhouette rotated by heading and colored by
activity, with its battery under it. Clicking a tug opens its detail inline; "Open day" goes to
the tug-day page with a native timeline, the charging schedule and the Rerun inspector. A
getting-started checklist and a five-stop tour cover the first visit.

[diagram: the console layout: rail with clock, headline, fleet; map; detail; tug-day page.]

## Newer data than 2024

NOAA's lag bothered me, so I added a live recorder. aisstream.io relays live AIS over a
WebSocket for free with a key. The recorder subscribes to the San Pedro box, appends every
message to a JSON lines file per day, flushing on every line so a crash loses nothing, and a
finalizer turns those files into the same parquet schema the NOAA fetch produces. After three
days of recording, the whole pipeline runs on this month's traffic instead of last year's.

[diagram: aisstream websocket -> jsonl per day -> finalize -> same parquet -> same pipeline.]

## Design, and getting it wrong a few times

The first console was dark with uppercase tracked labels, badges on every number and glass
cards floating over the map. It looked like every other AI dashboard. I rewrote the design
rules, then rewrote them again: sentence case everywhere, mono type only for machine values,
one estimate footnote per panel instead of a badge per stat, accent color only where it means
something in the data, no decorative icons. The landing page went from a feature grid to a
single black page with one headline, one video and one paragraph, because that version says
what the project is in five seconds. The console went dark again, flatter and denser, once
the rules were in place to keep it from looking generic.

[diagram: four small thumbnails of the design versions with one-word captions.]

## What I would do next

Hand-check the 50 sampled segments against the rules and publish the agreement score. Train a
small classifier on the rule labels plus that sample and compare it to the rules in the Rerun
validation view. Record a full week of live traffic and rebuild on it. Record the 75-second
demo. Ship the React Native tug screen from the same JSON.
