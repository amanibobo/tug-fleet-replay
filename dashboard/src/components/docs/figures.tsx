import type { FigureDef } from "./rough";

/**
 * One Excalidraw-style figure per `[diagram: ...]` marker in BUILD_LOG.md, keyed by the section slug.
 * Every number drawn here comes from the text of that section.
 */
export const FIGURES: Record<string, FigureDef> = {
  "why-this-project": {
    height: 240,
    caption: "The one question the project answers.",
    draw: (s) => {
      s.tug(90, 110, 1.5).text(90, 175, "a tug", { size: 13, tone: "muted" });
      s.text(165, 118, "+", { size: 26 });
      s.battery(200, 85, 110, 50, 0.7).text(255, 175, "6,000 kWh", { size: 13, tone: "muted" });
      s.text(345, 118, "+", { size: 26 });
      s.genset(385, 85, 80, 50, { fill: "red" }).text(425, 175, "generator?", { size: 13, tone: "muted" });
      s.text(425, 60, "?", { size: 30, tone: "red" });
      s.arrow(490, 110, 545, 110);
      s.box(560, 70, 130, 80, { fill: "green" });
      s.text(625, 120, "71%", { size: 34 });
      s.text(625, 175, "of tug-days, no generator", { size: 13, tone: "muted" });
      s.text(360, 222, "at a given battery size, what share of tug-days run without the generator?", { size: 14, tone: "muted" });
    },
  },

  "research-first": {
    height: 270,
    caption: "Three facts I looked up before writing any code, and where they went.",
    draw: (s) => {
      s.box(30, 28, 250, 58, { label: "battery size", size: 15 });
      s.mono(155, 100, "Marine Log · 4,000 hp · 6 MWh");
      s.box(30, 112, 250, 58, { label: "data source", size: 15 });
      s.mono(155, 184, "NOAA MarineCadastre · ~1 year lag");
      s.box(30, 196, 250, 58, { label: "what AIS reports", size: 15 });
      s.mono(155, 268, "position, speed, heading · not force");
      s.bend(285, 57, 360, 57, 440, 110);
      s.arrow(285, 141, 440, 141);
      s.bend(285, 225, 360, 225, 440, 172);
      s.file(450, 60, 240, 160, { label: "" });
      s.text(570, 90, "config.yaml", { size: 15 });
      s.mono(470, 125, "battery_kwh: 6000", { anchor: "start" });
      s.mono(470, 148, "week: 2024-12-02 .. 12-08", { anchor: "start" });
      s.mono(470, 171, "assist_kw: 1400   # weakest", { anchor: "start" });
      s.mono(470, 194, "generator_on: 0.15", { anchor: "start" });
    },
  },

  "getting-the-data-without-filling-my-disk": {
    height: 280,
    caption: "One day at a time: download, stream, filter, keep the parquet, delete the zip.",
    draw: (s) => {
      s.box(30, 70, 100, 70, { label: "zip", size: 16 });
      s.mono(80, 158, "~300 MB");
      s.arrow(135, 105, 180, 105);
      s.box(185, 70, 120, 70, { label: "stream\nchunks", size: 14 });
      s.mono(245, 158, "500,000 rows");
      s.arrow(310, 105, 355, 105);
      s.box(360, 55, 150, 100, { label: "filter", size: 16, fill: "blue" });
      s.mono(435, 172, "box · tug types · ships > 100 m");
      s.arrow(515, 105, 560, 105);
      s.file(570, 60, 110, 90, { label: "parquet", size: 14 });
      s.mono(625, 168, "74 MB kept");
      // the zip goes to the trash before the next day
      s.arrow(80, 145, 80, 200, { dashed: true, faint: true });
      s.box(60, 205, 40, 48, { faint: true });
      s.line(54, 205, 106, 205, { faint: true });
      s.line(72, 215, 72, 245, { faint: true });
      s.line(88, 215, 88, 245, { faint: true });
      s.text(80, 272, "delete", { size: 12, tone: "muted" });
      s.text(440, 240, "x 7 days  ·  2.1 GB down, 74 MB kept", { size: 14, tone: "muted" });
      s.bend(630, 160, 660, 230, 330, 238, { dashed: true, faint: true });
    },
  },

  "picking-the-fleet": {
    height: 320,
    caption: "The fleet rule as four gates: 54 vessels in, 22 harbor tugs out.",
    draw: (s) => {
      s.polygon(
        [
          [80, 40],
          [500, 40],
          [360, 280],
          [220, 280],
        ],
        { faint: true },
      );
      s.text(290, 28, "54 vessels that passed the type filter", { size: 14 });
      const gates: [number, string][] = [
        [90, "length 15 to 45 m"],
        [145, "99th-pct speed under 14 knots"],
        [200, "200+ fixes on 5 of 7 days"],
        [250, "moving at least 3% of the time"],
      ];
      gates.forEach(([y, label], i) => {
        const half = 210 - (y - 40) * (140 / 240);
        s.line(290 - half, y, 290 + half, y, { dashed: true });
        s.text(520, y + 4, label, { size: 13, anchor: "start" });
        s.mono(505, y + 4, `${i + 1}`, { anchor: "end" });
      });
      // what falls out
      s.text(150, 118, "pilot boats", { size: 12, tone: "muted", anchor: "end" });
      s.text(150, 132, "at 25 knots", { size: 11, tone: "muted", anchor: "end" });
      s.text(180, 176, "a 179 m vessel", { size: 12, tone: "muted", anchor: "end" });
      s.text(205, 228, "dock-bound all week", { size: 12, tone: "muted", anchor: "end" });
      s.box(230, 286, 120, 28, { fill: "green" });
      s.text(290, 305, "22 tugs", { size: 15 });
    },
  },

  "finding-the-docks-from-the-data": {
    height: 320,
    caption: "Idle minutes on a 120 m grid; the eight busiest clusters are the docks.",
    draw: (s) => {
      // coast: land to the north, basins notched into it, the breakwater along the south
      s.path(
        "M20 70 H120 V130 H170 V80 H250 V150 H300 V90 H380 V160 H430 V100 H520 V140 H600 V85 H700",
        { faint: true },
      );
      s.text(60, 50, "Los Angeles", { size: 12, tone: "muted" });
      s.text(330, 60, "Terminal Island", { size: 12, tone: "muted" });
      s.text(640, 60, "Long Beach", { size: 12, tone: "muted" });
      s.path("M20 290 H300 M340 290 H520 M560 290 H700", { faint: true });
      s.text(620, 308, "breakwater", { size: 12, tone: "muted" });
      // heat cells, denser where tugs sit
      const cells: [number, number, number][] = [
        [330, 165, 3], [345, 165, 3], [330, 180, 3], [345, 180, 2], [360, 180, 2], [315, 180, 1],
        [180, 140, 2], [195, 140, 1], [180, 155, 1],
        [440, 170, 2], [455, 170, 1],
        [560, 150, 2], [575, 150, 2], [560, 165, 1],
        [250, 200, 1], [265, 200, 1],
        [120, 200, 1],
        [500, 215, 1], [515, 215, 1],
        [620, 110, 1], [635, 110, 1],
        [430, 255, 1],
      ];
      cells.forEach(([x, y, w]) => s.box(x, y, 13, 13, { fill: w >= 3 ? "amber" : w === 2 ? "orange" : "idle", faint: w === 1 }));
      const docks: [number, number, string][] = [
        [345, 172, "A"], [187, 147, "B"], [567, 157, "C"], [447, 177, "D"],
        [257, 207, "E"], [507, 222, "F"], [627, 117, "G"], [127, 207, "H"],
      ];
      docks.forEach(([x, y, l]) => {
        s.circle(x, y, 34, { dashed: true });
        s.text(x + 24, y - 14, l, { size: 14 });
      });
      s.mono(345, 246, "27,000 idle tug-minutes in dock A");
      s.mono(60, 262, "grid 120 m · ≥ 10 h idle · merge within 300 m", { anchor: "start" });
    },
  },

  "labeling-what-a-tug-is-doing": {
    height: 330,
    caption: "The rule set, in the order it is applied each minute.",
    draw: (s) => {
      const diamond = (cx: number, cy: number, label: string) => {
        s.polygon(
          [
            [cx, cy - 48],
            [cx + 100, cy],
            [cx, cy + 48],
            [cx - 100, cy],
          ],
        );
        label.split("\n").forEach((l, i) => s.text(cx, cy - 4 + i * 16, l, { size: 13 }));
      };
      diamond(130, 120, "still 20 min+\ninside a dock radius?");
      diamond(360, 120, "fast?");
      diamond(590, 120, "within 60 m\nof a ship's hull?");
      s.arrow(230, 120, 258, 120, { label: "no" });
      s.arrow(460, 120, 488, 120, { label: "no" });
      // outcomes
      s.arrow(130, 168, 130, 222, { label: "yes" });
      s.box(70, 228, 120, 44, { fill: "green" });
      s.text(130, 256, "charging", { size: 15 });
      s.arrow(360, 168, 360, 222, { label: "yes" });
      s.box(300, 228, 120, 44, { fill: "blue" });
      s.text(360, 256, "transit", { size: 15 });
      s.arrow(590, 168, 590, 222, { label: "yes" });
      s.box(530, 228, 120, 44, { fill: "orange" });
      s.text(590, 256, "assist", { size: 15 });
      s.bend(590, 72, 590, 34, 640, 34);
      s.text(612, 26, "no", { size: 12, tone: "muted" });
      s.box(648, 16, 62, 36, { fill: "idle" });
      s.text(679, 40, "idle", { size: 14 });
      s.mono(360, 300, "then: 5-min median smoothing · merge runs under 3 min · assist up to 8 knots when the ship moves");
    },
  },

  "the-energy-model-with-its-estimates-on-the-table": {
    height: 300,
    caption: "The battery loop, simulated continuously through the week.",
    draw: (s) => {
      s.box(30, 100, 170, 100, { label: "draw per activity", size: 14 });
      s.mono(115, 170, "transit  v³  900 kW @ 8 kn", { size: 10 });
      s.mono(115, 184, "assist   1,400 kW  (est.)", { size: 10 });
      s.mono(115, 198, "idle     45 kW", { size: 10 });
      s.arrow(205, 150, 265, 150);
      s.battery(275, 120, 130, 60, 0.45);
      s.text(340, 110, "state of charge", { size: 13 });
      s.mono(340, 200, "6,000 kWh · 90% usable");
      s.bend(405, 135, 450, 70, 495, 70);
      s.genset(505, 40, 130, 60, { fill: "red" });
      s.text(570, 76, "generator", { size: 14 });
      s.mono(570, 118, "600 kW · on < 15% · off > 35%");
      s.bend(505, 90, 455, 120, 410, 135, { dashed: true });
      s.bend(405, 165, 450, 230, 495, 230);
      s.box(505, 200, 130, 60, { fill: "green" });
      s.text(570, 236, "shore charger", { size: 14 });
      s.mono(570, 278, "2,000 kW while the label is charging");
      s.bend(505, 210, 455, 180, 410, 165, { dashed: true });
      s.mono(570, 136, "shortfall is a deficit: 3.4 MWh / week", { size: 10 });
      s.text(115, 262, "Mon full  →  Sun", { size: 13, tone: "muted" });
      s.arrow(40, 275, 190, 275, { faint: true });
    },
  },

  "the-headline-and-the-slider-behind-it": {
    height: 300,
    caption: "Electric share against battery size, from the precomputed sweep.",
    draw: (s) => {
      const X = (kwh: number) => 80 + ((kwh - 1000) / 7000) * 600;
      const Y = (pct: number) => 250 - pct * 2.1;
      s.line(80, 40, 80, 250);
      s.line(80, 250, 690, 250);
      [25, 50, 75, 100].forEach((p) => {
        s.line(74, Y(p), 80, Y(p), { faint: true });
        s.mono(66, Y(p) + 4, `${p}%`, { anchor: "end" });
      });
      [1000, 3000, 6000, 8000].forEach((k) => {
        s.line(X(k), 250, X(k), 256, { faint: true });
        s.mono(X(k), 272, `${k.toLocaleString("en-US")}`);
      });
      s.mono(385, 292, "battery, kWh · 250 kWh steps");
      s.curve(
        [
          [X(3000), Y(43.5)],
          [X(6000), Y(70.8)],
          [X(8000), Y(83.8)],
        ],
        { fill: undefined },
      );
      s.circle(X(3000), Y(43.5), 12);
      s.mono(X(3000) + 14, Y(43.5) + 16, "43.5%", { anchor: "start" });
      s.circle(X(8000), Y(83.8), 12);
      s.mono(X(8000) - 4, Y(83.8) + 26, "83.8%", { anchor: "end" });
      s.circle(X(6000), Y(70.8), 20, { fill: "green" });
      s.line(X(6000), Y(70.8), X(6000), 250, { dashed: true, faint: true });
      s.line(80, Y(70.8), X(6000), Y(70.8), { dashed: true, faint: true });
      s.text(X(6000) - 16, Y(70.8) - 18, "70.8% of 154 tug-days", { size: 14, anchor: "end" });
      s.mono(X(6000) - 8, 240, "6,000", { size: 10, anchor: "end" });
      s.mono(110, 70, "the sweep is one JSON file · no server", { anchor: "start" });
    },
  },

  "charging-on-a-schedule": {
    height: 300,
    caption: "The same stop, charged on arrival and charged on the cheapest minutes before it ends (hours schematic).",
    draw: (s) => {
      const X = (h: number) => 110 + (h / 24) * 520;
      // tariff bands: off, mid, on, off
      const bands: [number, number, "idle" | "amber" | "red", string][] = [
        [0, 8, "idle", "off · 14¢"],
        [8, 16, "amber", "mid · 22¢"],
        [16, 21, "red", "on · 45¢"],
        [21, 24, "idle", "off"],
      ];
      bands.forEach(([a, b, tone, label]) => {
        s.box(X(a), 40, X(b) - X(a), 36, { fill: tone, faint: true });
        s.mono((X(a) + X(b)) / 2, 30, label);
      });
      [0, 6, 12, 18, 24].forEach((h) => s.mono(X(h), 92, `${String(h).padStart(2, "0")}:00`, { size: 10 }));
      s.line(110, 80, 630, 80, { faint: true });
      // the stop: tied up from late afternoon until the small hours
      s.poly(
        [
          [X(16.5), 124],
          [X(16.5), 118],
          [X(23.5), 118],
          [X(23.5), 124],
        ],
        { faint: true },
      );
      s.text((X(16.5) + X(23.5)) / 2, 142, "tied up at the dock", { size: 12, tone: "muted" });
      s.text(100, 178, "at arrival", { size: 13, anchor: "end" });
      s.box(X(16.5), 158, X(19.5) - X(16.5), 30, { fill: "red" });
      s.mono(640, 178, "$153,816", { anchor: "start" });
      s.text(100, 236, "scheduled", { size: 13, anchor: "end" });
      s.box(X(21), 216, X(23.5) - X(21), 30, { fill: "green" });
      s.box(X(16.5), 216, X(21) - X(16.5), 30, { dashed: true, faint: true });
      s.mono(640, 236, "$127,208", { anchor: "start" });
      s.arrow(X(18), 192, X(22), 213, { faint: true });
      s.text(360, 278, "same energy, same charger, different timing: 17% lower for the week", { size: 14, tone: "muted" });
      s.mono(360, 296, "TOU-8 shape · the scheduler knows the stop's real end time", { size: 10 });
    },
  },

  "rerun-as-the-replay-inspector": {
    height: 250,
    caption: "Every tug-day as a Rerun recording, opened from a URL in the embedded viewer.",
    draw: (s) => {
      s.box(30, 80, 110, 60, { label: "Python\nexporter", size: 13 });
      s.arrow(145, 110, 190, 110);
      s.file(200, 70, 70, 80);
      s.file(210, 80, 70, 80);
      s.file(220, 90, 70, 80, { label: ".rrd", size: 13 });
      s.mono(250, 190, "one per tug-day");
      s.arrow(300, 110, 345, 110);
      s.db(355, 70, 90, 80, { label: "S3 or\npublic/" });
      s.arrow(450, 110, 495, 110, { label: "url" });
      s.box(505, 40, 190, 150);
      s.text(600, 62, "web viewer", { size: 13 });
      s.box(515, 72, 85, 60, { faint: true });
      s.box(605, 72, 80, 60, { faint: true });
      s.poly(
        [
          [610, 115],
          [630, 95],
          [650, 105],
          [680, 85],
        ],
        { faint: true },
      );
      s.line(515, 160, 685, 160);
      s.box(560, 152, 8, 16, { fill: "fg" });
      s.mono(600, 182, "paused at 00:00 · 600x", { size: 10 });
      s.mono(700, 215, "50 MB wasm · loaded only when opened", { size: 10, anchor: "end" });
      s.mono(250, 215, "SDK version == viewer version", { size: 10 });
    },
  },

  "replaying-it-like-a-real-fleet": {
    height: 370,
    caption: "The replay path on AWS, one CDK stack, with the local stand-in as a dotted bypass.",
    draw: (s) => {
      s.box(20, 130, 110, 60, { label: "replayer", size: 14 });
      s.mono(75, 208, "120x · MQTT");
      s.arrow(135, 160, 170, 160);
      s.box(175, 130, 110, 60, { label: "IoT Core", size: 14 });
      s.arrow(290, 160, 325, 160, { label: "rule" });
      s.box(330, 130, 100, 60, { label: "Lambda", size: 14, fill: "amber" });
      s.bend(430, 145, 460, 52, 475, 52);
      s.db(480, 20, 90, 64, { label: "DynamoDB", size: 12 });
      s.mono(525, 106, "live row + history", { size: 10 });
      s.arrow(435, 160, 465, 160);
      s.box(470, 135, 110, 50, { label: "WebSocket\nAPI", size: 12 });
      s.arrow(585, 160, 635, 160);
      s.box(640, 120, 70, 80, { label: "console", size: 11, fill: "blue" });
      s.db(480, 215, 90, 60, { label: "S3", size: 12 });
      s.mono(525, 294, "tug-day files · summary", { size: 10 });
      s.bend(572, 245, 640, 245, 672, 202);
      s.mono(610, 268, "CloudFront", { size: 10 });
      // local stand-in
      s.box(175, 300, 300, 44, { dashed: true, faint: true });
      s.text(325, 327, "local: python websocket + tiny JSON api", { size: 12, tone: "muted" });
      s.bend(75, 195, 75, 322, 170, 322, { dashed: true, faint: true });
      s.bend(477, 322, 700, 322, 692, 204, { dashed: true, faint: true });
      s.mono(20, 366, "one stack · one deploy · tests for the template and the handlers", { size: 10, anchor: "start" });
    },
  },

  "the-console": {
    height: 300,
    caption: "The console: rail, map, inline detail, and the tug-day page it opens.",
    draw: (s) => {
      // fleet view
      s.box(30, 30, 430, 240);
      s.line(30, 58, 460, 58, { faint: true });
      s.text(60, 49, "tugboard", { size: 12, anchor: "start" });
      s.line(170, 58, 170, 270, { faint: true });
      s.mono(100, 80, "Mon 01:13 UTC", { size: 9 });
      s.text(100, 118, "71%", { size: 26 });
      s.mono(100, 134, "electric share", { size: 9 });
      [150, 166, 182, 198, 214].forEach((y, i) => {
        s.line(44, y, 156, y, { faint: true });
        s.box(46, y - 10, 5, 5, { fill: i === 1 ? "orange" : i === 3 ? "green" : "blue" });
      });
      s.box(40, 222, 122, 36, { dashed: true, faint: true });
      s.mono(100, 244, "detail · open day", { size: 9 });
      // map with tugs and trails
      s.path("M190 100 Q260 90 300 140 T420 150", { faint: true });
      s.path("M200 220 Q260 200 320 230 T430 200", { faint: true });
      s.tug(300, 140, 0.5, { fill: "blue" });
      s.tug(392, 232, 0.5, { fill: "orange" });
      s.tug(240, 90, 0.5, { fill: "green" });
      s.ship(380, 230, 90, { faint: true });
      // the tug-day page
      s.arrow(464, 240, 502, 240);
      s.text(483, 228, "open day", { size: 11, tone: "muted" });
      s.box(505, 30, 190, 240);
      s.text(600, 52, "tug-day", { size: 12 });
      s.line(515, 80, 685, 80);
      s.box(560, 72, 6, 16, { fill: "fg" });
      s.poly(
        [
          [515, 150],
          [560, 150],
          [560, 120],
          [600, 120],
          [600, 160],
          [650, 160],
          [650, 100],
          [685, 100],
        ],
        { faint: true },
      );
      s.mono(600, 178, "soc · power · generator", { size: 9 });
      s.box(515, 190, 170, 36, { fill: "green", faint: true });
      s.mono(600, 212, "charging schedule", { size: 9 });
      s.box(515, 234, 170, 28, { dashed: true });
      s.mono(600, 252, "rerun inspector", { size: 9 });
      s.mono(245, 290, "Next.js 16 · TypeScript · MapLibre · 12 MB JSON, < 1 MB compressed", { size: 10 });
    },
  },

  "newer-data-than-2024": {
    height: 240,
    caption: "Live AIS recorded into the same parquet schema, so nothing downstream changes.",
    draw: (s) => {
      s.box(20, 70, 120, 70, { label: "aisstream.io", size: 13 });
      s.mono(80, 158, "WebSocket · free key");
      s.arrow(145, 105, 190, 105);
      s.file(200, 60, 60, 70);
      s.file(208, 68, 60, 70);
      s.file(216, 76, 60, 70, { label: "jsonl", size: 12 });
      s.mono(246, 165, "one per day · flush per line");
      s.arrow(285, 105, 330, 105);
      s.box(335, 75, 110, 60, { label: "finalize", size: 14 });
      s.arrow(450, 105, 495, 105);
      s.file(505, 65, 80, 80, { label: "parquet", size: 12, fill: "green" });
      s.mono(545, 165, "same schema");
      s.arrow(590, 105, 635, 105);
      s.box(640, 75, 70, 60, { label: "same\npipeline", size: 12 });
      s.text(360, 215, "a crash loses nothing; after three days the whole pipeline runs on this month's traffic", { size: 13, tone: "muted" });
    },
  },

  "the-whole-system": {
    height: 560,
    caption: "Everything in one drawing: sources, the pipeline, the export files, and the static and live paths to the console.",
    draw: (s) => {
      // sources
      s.text(70, 28, "sources", { size: 13, tone: "muted" });
      s.file(20, 44, 100, 56, { label: "NOAA AIS", size: 11 });
      s.file(20, 118, 100, 56, { label: "live AIS", size: 11, fill: "green" });
      s.logo(24, 150, 16, "mqtt");
      s.mono(70, 196, "same schema", { size: 9 });
      s.arrow(125, 72, 160, 100);
      s.arrow(125, 146, 160, 118);
      // pipeline
      s.text(300, 28, "pipeline", { size: 13, tone: "muted" });
      s.logo(336, 14, 18, "python");
      s.box(165, 44, 270, 150, { dashed: true, faint: true });
      s.box(180, 60, 70, 38, { label: "fetch", size: 11 });
      s.arrow(252, 79, 272, 79);
      s.box(275, 60, 70, 38, { label: "resample", size: 10 });
      s.arrow(347, 79, 367, 79);
      s.box(370, 60, 54, 38, { label: "label", size: 11 });
      s.bend(397, 100, 397, 120, 372, 134);
      s.box(300, 118, 70, 38, { label: "simulate", size: 10, fill: "green" });
      s.arrow(298, 137, 278, 137);
      s.box(200, 118, 76, 38, { label: "export", size: 11 });
      s.mono(300, 182, "config.yaml holds every estimate", { size: 9 });
      // export files
      s.text(560, 28, "export", { size: 13, tone: "muted" });
      s.arrow(437, 120, 468, 100);
      s.file(475, 44, 84, 44, { label: "fleet.json", size: 10 });
      s.file(475, 96, 84, 44, { label: "tug-days", size: 10 });
      s.file(475, 148, 84, 44, { label: "summary\n+ sweep", size: 9 });
      s.file(600, 96, 100, 44, { label: ".rrd per\ntug-day", size: 9, fill: "amber" });
      s.arrow(437, 137, 468, 152);
      s.arrow(437, 128, 595, 118);
      // static path
      s.text(190, 250, "static path", { size: 13, tone: "muted" });
      s.logo(248, 236, 18, "nextjs");
      s.logo(272, 236, 18, "vercel");
      s.box(20, 266, 330, 110, { dashed: true, faint: true });
      s.box(36, 300, 92, 44, { label: "landing", size: 11 });
      s.box(140, 300, 92, 44, { label: "console", size: 11, fill: "blue" });
      s.logo(214, 282, 14, "maplibre");
      s.box(244, 300, 92, 44, { label: "docs", size: 11 });
      s.mono(185, 364, "Vercel · shipped with the site · no backend", { size: 9 });
      s.bend(517, 196, 517, 240, 186, 262, { dashed: true });
      // live path
      s.text(540, 250, "live path (AWS, one CDK stack)", { size: 13, tone: "muted" });
      s.logo(686, 232, 22, "aws");
      s.box(380, 266, 330, 180, { dashed: true, faint: true });
      s.box(392, 288, 70, 36, { label: "replayer", size: 10 });
      s.mono(427, 338, "MQTT · 120x", { size: 9 });
      s.arrow(464, 306, 486, 306);
      s.box(488, 288, 64, 36, { label: "IoT Core", size: 10 });
      s.arrow(554, 306, 576, 306);
      s.box(578, 288, 60, 36, { label: "Lambda", size: 10, fill: "amber" });
      s.logo(620, 270, 18, "lambda");
      s.db(600, 348, 60, 44, { label: "Dynamo", size: 9 });
      s.logo(652, 338, 18, "dynamodb");
      s.db(528, 348, 60, 44, { label: "S3", size: 10 });
      s.logo(506, 338, 18, "s3");
      s.bend(608, 326, 620, 340, 628, 346);
      s.bend(590, 326, 570, 340, 560, 346);
      s.arrow(640, 306, 660, 306);
      s.box(662, 280, 42, 52, { label: "WS\nAPI", size: 9 });
      s.logo(676, 254, 18, "apigateway");
      s.logo(392, 404, 18, "cloudfront");
      s.mono(418, 418, "CloudFront serves tug-days, summary, recordings", { size: 9, anchor: "start" });
      s.bend(560, 196, 560, 240, 420, 284, { dashed: true });
      // live back to the console
      s.bend(683, 334, 683, 470, 186, 470);
      s.arrow(186, 470, 186, 350);
      s.logo(392, 478, 18, "websocket");
      s.mono(418, 491, "snapshot + telemetry over the socket", { size: 9, anchor: "start" });
      // inspector
      s.bend(650, 142, 712, 200, 700, 516);
      s.mono(560, 536, "recordings open in the Rerun inspector", { size: 9 });
    },
  },
  "design-and-getting-it-wrong-a-few-times": {
    height: 230,
    caption: "Four versions of the design, in order.",
    draw: (s) => {
      const thumb = (x: number, caption: string, body: (x: number) => void) => {
        s.box(x, 30, 150, 110);
        body(x);
        s.text(x + 75, 170, caption, { size: 14 });
      };
      thumb(30, "loud", (x) => {
        s.box(x + 6, 36, 138, 98, { fill: "idle", faint: true });
        s.box(x + 14, 48, 50, 30, { fill: "blue" });
        s.box(x + 72, 48, 50, 30, { fill: "orange" });
        s.box(x + 14, 88, 50, 30, { fill: "red" });
        s.box(x + 72, 88, 50, 30, { fill: "green" });
        s.mono(x + 75, 130, "UPPERCASE LABELS", { size: 8 });
      });
      thumb(205, "quiet", (x) => {
        s.box(x + 10, 42, 60, 40, { faint: true });
        s.box(x + 80, 42, 60, 40, { faint: true });
        s.box(x + 10, 92, 130, 40, { faint: true });
        s.mono(x + 75, 116, "sentence case", { size: 8 });
      });
      thumb(380, "one page", (x) => {
        s.box(x + 6, 36, 138, 98, { fill: "fg", faint: true });
        s.line(x + 40, 60, x + 110, 60);
        s.box(x + 35, 72, 80, 44, { faint: true });
        s.line(x + 50, 126, x + 100, 126, { faint: true });
      });
      thumb(555, "dense", (x) => {
        s.box(x + 6, 36, 138, 98, { fill: "fg", faint: true });
        s.line(x + 52, 36, x + 52, 134, { faint: true });
        [58, 76, 94, 112].forEach((y) => s.line(x + 12, y, x + 46, y, { faint: true }));
        s.text(x + 30, 128, "71%", { size: 11 });
        s.tug(x + 100, 80, 0.4, { fill: "blue" });
      });
      s.arrow(185, 85, 200, 85, { faint: true });
      s.arrow(360, 85, 375, 85, { faint: true });
      s.arrow(535, 85, 550, 85, { faint: true });
      s.mono(360, 210, "dark, badges and glass  →  light, flat  →  one black page  →  dark, flat and dense", { size: 10 });
    },
  },
};
