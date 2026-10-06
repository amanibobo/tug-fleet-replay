#!/usr/bin/env node
// Generates sample data into public/data/ matching docs/CONTRACT.md.
// No dependencies. Deterministic (seeded). The real pipeline overwrites these files.
//
//   node scripts/make-fixture.mjs
//
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "public", "data");

// ---------- config (mirrors ../config.yaml; no yaml parser without deps) ----------
const CFG = {
  battery_kwh: 6000,
  usable_fraction: 0.9,
  start_soc: 1.0,
  slider_min_kwh: 1000,
  slider_max_kwh: 8000,
  slider_step_kwh: 250,
  generator_cut_in_soc: 0.15,
  generator_cut_out_soc: 0.35,
  generator_power_kw: 600,
  charger_power_kw: 2000,
  dock_charge_min_idle_min: 20,
  transit_power_kw_at_8kn: 900,
  transit_min_power_kw: 60,
  assist_power_kw: 1400,
  idle_power_kw: 45,
  max_power_kw: 3000,
  tariff: { off_peak: 0.14, mid_peak: 0.22, on_peak: 0.45, on_peak_hours: [16, 17, 18, 19, 20], mid_peak_hours: [8, 9, 10, 11, 12, 13, 14, 15, 21] },
};

const DAYS = ["2024-12-02", "2024-12-03"];
const STEP_S = 60;
const PER_DAY = 1440;

const DOCKS = [
  { name: "Berth 86, San Pedro", lat: 33.7405, lon: -118.2778 },
  { name: "Pier D, Long Beach", lat: 33.7562, lon: -118.2178 },
  { name: "Terminal Island", lat: 33.7486, lon: -118.2559 },
];

// Places where ships get escorted or pushed around San Pedro Bay.
const SITES = [
  { lat: 33.7300, lon: -118.2650 }, // LA main channel
  { lat: 33.7350, lon: -118.2050 }, // LB outer harbor
  { lat: 33.7180, lon: -118.2450 }, // Angels Gate approach
  { lat: 33.7450, lon: -118.2150 }, // LB channel
  { lat: 33.7220, lon: -118.2420 }, // Pier 400
  { lat: 33.7600, lon: -118.1950 }, // Pier J
];

const TUGS = [
  { tug_id: "366999123", name: "MILLENNIUM DAWN", dock: 0 },
  { tug_id: "367123450", name: "PACIFIC SENTINEL", dock: 0 },
  { tug_id: "368045110", name: "SAN PEDRO PILOT", dock: 2 },
  { tug_id: "367712980", name: "BREAKWATER", dock: 2 },
  { tug_id: "366771240", name: "LONG BEACH ESCORT", dock: 1 },
  { tug_id: "367555031", name: "QUEENS GATE", dock: 1 },
];

// ---------- seeded prng ----------
let seed = 20241202;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const between = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- geo helpers ----------
const M_PER_DEG_LAT = 111_320;
const mPerDegLon = (lat) => 111_320 * Math.cos((lat * Math.PI) / 180);
function distM(a, b) {
  const dy = (b.lat - a.lat) * M_PER_DEG_LAT;
  const dx = (b.lon - a.lon) * mPerDegLon(a.lat);
  return Math.hypot(dx, dy);
}
const KN_TO_M_PER_MIN = 1852 / 60;
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// ---------- per tug-day simulation ----------
function simulateDay(tug, dayIdx, soc0, opts) {
  const dock = DOCKS[tug.dock];
  const n = PER_DAY;
  const lat = new Array(n), lon = new Array(n), sog = new Array(n);
  const activity = new Array(n), power = new Array(n), soc = new Array(n), gen = new Array(n);
  const jobOf = new Array(n).fill(null);

  // Plan jobs for the day as minute ranges.
  const plan = [];
  let t = Math.floor(between(20, 120));
  const jobCount = opts.heavy ? 3 : Math.floor(between(2, 5));
  const lastStart = opts.heavy ? n - 420 : n - 120; // a heavy day ends early so the generator can recover
  let j = 0;
  while (j < jobCount && t < lastStart) {
    const site = pick(SITES);
    const out = Math.max(8, Math.round(distM(dock, site) / (between(6.5, 8.5) * KN_TO_M_PER_MIN)));
    const assist = Math.floor(opts.heavy ? between(55, 70) : between(30, 65));
    const back = Math.max(8, Math.round(distM(dock, site) / (between(6.5, 8.5) * KN_TO_M_PER_MIN)));
    if (t + out + assist + back > lastStart) break;
    plan.push({ start: t, out, assist, back, site, idx: j });
    t += out + assist + back + Math.floor(opts.heavy ? between(25, 40) : between(45, 200));
    j += 1;
  }

  // Fill activity + positions.
  let p = { lat: dock.lat, lon: dock.lon };
  for (let i = 0; i < n; i++) {
    activity[i] = "idle";
    lat[i] = dock.lat + between(-0.00004, 0.00004);
    lon[i] = dock.lon + between(-0.00004, 0.00004);
    sog[i] = round(between(0, 0.3), 1);
  }
  for (const job of plan) {
    const jobId = `${tug.tug_id}-${DAYS[dayIdx]}-${String(job.idx + 1).padStart(2, "0")}`;
    const bend = between(-0.004, 0.004);
    // transit out
    for (let k = 0; k < job.out; k++) {
      const i = job.start + k;
      const f = (k + 1) / job.out;
      const s = Math.sin(Math.PI * f);
      lat[i] = dock.lat + (job.site.lat - dock.lat) * f + bend * s;
      lon[i] = dock.lon + (job.site.lon - dock.lon) * f - bend * s * 0.6;
      activity[i] = "transit";
      jobOf[i] = jobId;
    }
    // assist: slow wander around the site
    p = { lat: job.site.lat, lon: job.site.lon };
    let hd = between(0, Math.PI * 2);
    for (let k = 0; k < job.assist; k++) {
      const i = job.start + job.out + k;
      hd += between(-0.5, 0.5);
      const stepM = between(1.0, 3.0) * KN_TO_M_PER_MIN;
      p = { lat: p.lat + (Math.cos(hd) * stepM) / M_PER_DEG_LAT, lon: p.lon + (Math.sin(hd) * stepM) / mPerDegLon(p.lat) };
      // keep near site
      if (distM(p, job.site) > 600) hd += Math.PI;
      lat[i] = p.lat; lon[i] = p.lon;
      activity[i] = "assist";
      jobOf[i] = jobId;
    }
    // transit back
    const from = { ...p };
    for (let k = 0; k < job.back; k++) {
      const i = job.start + job.out + job.assist + k;
      const f = (k + 1) / job.back;
      const s = Math.sin(Math.PI * f);
      lat[i] = from.lat + (dock.lat - from.lat) * f - bend * s;
      lon[i] = from.lon + (dock.lon - from.lon) * f + bend * s * 0.6;
      activity[i] = "transit";
      jobOf[i] = jobId;
    }
  }
  // speeds from positions
  for (let i = 0; i < n; i++) {
    if (activity[i] === "idle") continue;
    const prev = i > 0 ? { lat: lat[i - 1], lon: lon[i - 1] } : { lat: lat[i], lon: lon[i] };
    const d = distM(prev, { lat: lat[i], lon: lon[i] });
    sog[i] = round(Math.min(11, d / KN_TO_M_PER_MIN + between(-0.2, 0.2)), 1);
    if (sog[i] < 0) sog[i] = 0;
  }

  // Energy, charging and generator.
  let s = soc0;
  let genOn = false;
  let chargeOn = false;
  let idleRun = 0;
  for (let i = 0; i < n; i++) {
    let a = activity[i];
    let pw;
    if (a === "assist") pw = CFG.assist_power_kw + between(-150, 150);
    else if (a === "transit") pw = Math.max(CFG.transit_min_power_kw, CFG.transit_power_kw_at_8kn * (sog[i] / 8) ** 3);
    else pw = CFG.idle_power_kw;
    pw = Math.min(CFG.max_power_kw, pw);

    if (a === "idle") idleRun += 1; else idleRun = 0;
    const atDock = distM({ lat: lat[i], lon: lon[i] }, dock) < 350;
    const nextIdle = activity.slice(i, i + 5).every((x) => x === "idle");
    const canCharge = !opts.noCharge && a === "idle" && atDock && idleRun >= CFG.dock_charge_min_idle_min && nextIdle;
    if (canCharge && !chargeOn && s < 0.9) chargeOn = true;
    if (!canCharge || s >= 0.995) chargeOn = false;
    if (chargeOn) {
      a = "charging";
      pw = -CFG.charger_power_kw;
    }

    if (!genOn && s < CFG.generator_cut_in_soc) genOn = true;
    if (genOn && s >= CFG.generator_cut_out_soc) genOn = false;
    if (a === "charging") genOn = false;
    const g = genOn ? CFG.generator_power_kw : 0;

    activity[i] = a;
    power[i] = round(pw, 1);
    gen[i] = genOn;
    soc[i] = round(Math.min(1, Math.max(0.02, s)), 4);
    s += ((g - pw) * (STEP_S / 3600)) / CFG.battery_kwh;
    if (s > 1) s = 1;
  }

  return { lat, lon, sog, activity, power, soc, gen, jobOf, dock };
}

// ---------- derive tug-day document ----------
function iso(dayIdx, minute) {
  return new Date(Date.parse(`${DAYS[0]}T00:00:00Z`) + (dayIdx * PER_DAY + minute) * STEP_S * 1000).toISOString().replace(".000Z", "Z");
}
function spans(flags, dayIdx, kwhAt) {
  const out = [];
  let start = -1, kwh = 0;
  for (let i = 0; i <= flags.length; i++) {
    const on = i < flags.length && flags[i];
    if (on && start < 0) { start = i; kwh = 0; }
    if (on) kwh += kwhAt(i);
    if (!on && start >= 0) {
      out.push({ start: iso(dayIdx, start), end: iso(dayIdx, i), kwh: round(kwh, 1) });
      start = -1;
    }
  }
  return out;
}

function tugDayDoc(tug, dayIdx, sim, nullRange) {
  const n = PER_DAY;
  const t = Array.from({ length: n }, (_, i) => iso(dayIdx, i));
  const dt = STEP_S / 3600;
  const draw = (i) => (sim.power[i] > 0 ? sim.power[i] * dt : 0);

  // segments
  const segments = [];
  let segStart = 0;
  for (let i = 1; i <= n; i++) {
    const changed = i === n || sim.activity[i] !== sim.activity[segStart] || sim.jobOf[i] !== sim.jobOf[segStart];
    if (changed) {
      let e = 0;
      for (let k = segStart; k < i; k++) e += draw(k);
      segments.push({ start: t[segStart], end: iso(dayIdx, i), activity: sim.activity[segStart], job_id: sim.jobOf[segStart], energy_kwh: round(e, 1) });
      segStart = i;
    }
  }

  // jobs
  const jobsMap = new Map();
  for (let i = 0; i < n; i++) {
    const id = sim.jobOf[i];
    if (!id) continue;
    let jb = jobsMap.get(id);
    if (!jb) { jb = { job_id: id, startIdx: i, endIdx: i, energy_kwh: 0, assist_min: 0, transit_min: 0, max_sog: 0 }; jobsMap.set(id, jb); }
    jb.endIdx = i + 1;
    jb.energy_kwh += draw(i);
    if (sim.activity[i] === "assist") jb.assist_min += 1;
    if (sim.activity[i] === "transit") jb.transit_min += 1;
    if (sim.sog[i] != null) jb.max_sog = Math.max(jb.max_sog, sim.sog[i]);
  }
  const jobs = [...jobsMap.values()].map((jb) => ({
    job_id: jb.job_id, start: t[jb.startIdx], end: iso(dayIdx, jb.endIdx), energy_kwh: round(jb.energy_kwh, 1),
    assist_min: jb.assist_min, transit_min: jb.transit_min, max_sog: round(jb.max_sog, 1),
  }));

  const charging = spans(sim.activity.map((a) => a === "charging"), dayIdx, (i) => -sim.power[i] * dt).map((c) => ({ ...c, dock: sim.dock.name }));
  const generator = spans(sim.gen, dayIdx, () => CFG.generator_power_kw * dt);

  const totals = {
    energy_kwh: round(sim.power.reduce((acc, p) => acc + (p > 0 ? p * dt : 0), 0), 1),
    generator_kwh: round(generator.reduce((a, g) => a + g.kwh, 0), 1),
    charged_kwh: round(charging.reduce((a, c) => a + c.kwh, 0), 1),
    assist_min: sim.activity.filter((a) => a === "assist").length,
    transit_min: sim.activity.filter((a) => a === "transit").length,
    idle_min: sim.activity.filter((a) => a === "idle" || a === "charging").length,
    min_soc: round(Math.min(...sim.soc), 3),
    electric_only: generator.length === 0,
  };

  const withNulls = (arr) => arr.map((v, i) => (nullRange && i >= nullRange[0] && i < nullRange[1] ? null : v));

  return {
    fixture: true,
    tug_id: tug.tug_id,
    name: tug.name,
    date: DAYS[dayIdx],
    battery_kwh: CFG.battery_kwh,
    samples: {
      t,
      lat: withNulls(sim.lat.map((v) => round(v, 5))),
      lon: withNulls(sim.lon.map((v) => round(v, 5))),
      sog: withNulls(sim.sog),
      activity: sim.activity,
      power_kw: sim.power,
      soc: sim.soc,
      generator_on: sim.gen,
    },
    segments,
    jobs,
    charging,
    generator,
    totals,
    recording_url: `/recordings/${tug.tug_id}/${DAYS[dayIdx]}.rrd`,
  };
}

// ---------- run ----------
mkdirSync(OUT, { recursive: true });
const fleet = { fixture: true, t0: `${DAYS[0]}T00:00:00Z`, step_s: STEP_S, battery_kwh: CFG.battery_kwh, tugs: [] };
const perTug = [];
let tugDays = 0, electricDays = 0;

for (let ti = 0; ti < TUGS.length; ti++) {
  const tug = TUGS[ti];
  let socCarry = CFG.start_soc;
  const cols = { tug_id: tug.tug_id, name: tug.name, lat: [], lon: [], sog: [], activity: [], soc: [], generator_on: [], power_kw: [] };
  let energy = 0;
  for (let d = 0; d < DAYS.length; d++) {
    // One tug-day runs the generator: a heavy day with no shore charging.
    const heavy = ti === 0 && d === 0;
    const sim = simulateDay(tug, d, socCarry, { heavy, noCharge: heavy });
    socCarry = sim.soc[sim.soc.length - 1];
    const nullRange = ti === 3 && d === 1 ? [600, 618] : null; // a short AIS gap
    const doc = tugDayDoc(tug, d, sim, nullRange);
    mkdirSync(join(OUT, "tugdays", tug.tug_id), { recursive: true });
    writeFileSync(join(OUT, "tugdays", tug.tug_id, `${DAYS[d]}.json`), JSON.stringify(doc));
    cols.lat.push(...doc.samples.lat);
    cols.lon.push(...doc.samples.lon);
    cols.sog.push(...doc.samples.sog);
    cols.activity.push(...doc.samples.activity);
    cols.soc.push(...doc.samples.soc);
    cols.generator_on.push(...doc.samples.generator_on);
    cols.power_kw.push(...doc.samples.power_kw);
    energy += doc.totals.energy_kwh;
    tugDays += 1;
    if (doc.totals.electric_only) electricDays += 1;
  }
  fleet.tugs.push(cols);
  perTug.push({ tug_id: tug.tug_id, name: tug.name, days: DAYS.length, energy_kwh_per_day: round(energy / DAYS.length, 0) });
}
writeFileSync(join(OUT, "fleet.json"), JSON.stringify(fleet));

// Summary sweep. electric_share rises with capacity; pinned to the simulated share at the default size.
const sweep = [];
const avgChargedPerDay = 2300 * tugDays;
for (let kwh = CFG.slider_min_kwh; kwh <= CFG.slider_max_kwh; kwh += CFG.slider_step_kwh) {
  const logistic = 1 / (1 + Math.exp(-(kwh - 4300) / 850));
  let share = Math.round(logistic * tugDays) / tugDays;
  if (kwh === CFG.battery_kwh) share = electricDays / tugDays;
  const genHours = round((1 - share) * tugDays * between(3.5, 5.5) * (1 - logistic * 0.5) + (1 - logistic) * 10, 1);
  const genKwh = round(genHours * CFG.generator_power_kw, 0);
  const charged = round(avgChargedPerDay - genKwh * 0.9, 0);
  sweep.push({
    battery_kwh: kwh,
    electric_share: round(share, 3),
    generator_kwh: genKwh,
    generator_hours: genHours,
    charged_kwh: charged,
    charge_cost_usd_arrival: round(charged * 0.262, 0),
    charge_cost_usd_scheduled: round(charged * 0.168, 0),
  });
}
// enforce monotonic share
for (let i = 1; i < sweep.length; i++) {
  if (sweep[i].electric_share < sweep[i - 1].electric_share) sweep[i].electric_share = sweep[i - 1].electric_share;
  if (sweep[i].generator_hours > sweep[i - 1].generator_hours) sweep[i].generator_hours = sweep[i - 1].generator_hours;
  sweep[i].generator_kwh = round(sweep[i].generator_hours * CFG.generator_power_kw, 0);
}

const summary = {
  fixture: true,
  dataset: { start: DAYS[0], end: DAYS[DAYS.length - 1], tug_days: tugDays, tugs: TUGS.length, source: "NOAA AIS" },
  default_battery_kwh: CFG.battery_kwh,
  sweep,
  tugs: perTug,
  assumptions: [
    { key: "assist_power_kw", value: CFG.assist_power_kw, note: "weakest estimate: AIS has speed, not bollard pull" },
    { key: "transit_power_kw_at_8kn", value: CFG.transit_power_kw_at_8kn, note: "scaled by (sog/8)^3" },
    { key: "transit_min_power_kw", value: CFG.transit_min_power_kw, note: "hotel load floor when moving slowly" },
    { key: "idle_power_kw", value: CFG.idle_power_kw, note: "hotel load, HVAC, electronics" },
    { key: "max_power_kw", value: CFG.max_power_kw, note: "clamp" },
    { key: "battery_capacity_kwh", value: CFG.battery_kwh, note: "Arc/Curtin tugs: 6 MWh batteries (Marine Log, Sept 2025)" },
    { key: "usable_fraction", value: CFG.usable_fraction, note: "" },
    { key: "generator_cut_in_soc", value: CFG.generator_cut_in_soc, note: "generator starts below this state of charge" },
    { key: "generator_cut_out_soc", value: CFG.generator_cut_out_soc, note: "and stops once the battery recovers to this" },
    { key: "generator_power_kw", value: CFG.generator_power_kw, note: "a small diesel generator can top off the batteries (Marine Log)" },
    { key: "charger_power_kw", value: CFG.charger_power_kw, note: "shore charger while idle at the dock" },
    { key: "dock_charge_min_idle_min", value: CFG.dock_charge_min_idle_min, note: "idle this long near a known dock counts as a charging stop" },
    { key: "tariff_off_peak_usd_kwh", value: CFG.tariff.off_peak, note: "SCE TOU-8 style shape, rounded" },
    { key: "tariff_mid_peak_usd_kwh", value: CFG.tariff.mid_peak, note: "hours 8-15, 21" },
    { key: "tariff_on_peak_usd_kwh", value: CFG.tariff.on_peak, note: "hours 16-20" },
  ],
};
writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`wrote ${OUT}: fleet.json, summary.json, ${tugDays} tug-days (${electricDays} electric-only)`);
