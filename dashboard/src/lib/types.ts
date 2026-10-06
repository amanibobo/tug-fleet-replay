// TypeScript shapes for everything in docs/CONTRACT.md.

export type Activity = "transit" | "assist" | "idle" | "charging";

export const ACTIVITIES: readonly Activity[] = ["transit", "assist", "idle", "charging"];

/** UI status derived from a telemetry row. */
export type Status = "electric" | "generator" | "charging" | "idle";

/** 1. Telemetry message (one per tug per tick). */
export interface Telemetry {
  tug_id: string;
  name: string;
  t: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  heading: number;
  activity: Activity;
  power_kw: number;
  soc: number;
  generator_on: boolean;
  generator_kw: number;
  battery_kwh: number;
  job_id: string | null;
}

export interface DatasetInfo {
  start: string;
  end: string;
  source?: string;
}

/** 2. Fleet snapshot (`GET /fleet`, WS `snapshot`). */
export interface FleetSnapshot {
  clock: string;
  speedup: number;
  tugs: Telemetry[];
  dataset: DatasetInfo;
  fixture?: boolean;
}

export type WsMessage =
  | { type: "snapshot"; data: FleetSnapshot }
  | { type: "telemetry"; data: Telemetry };

/** 3. Tug day. Columnar 1-minute samples. Position columns may hold nulls where the tug had no fix. */
export interface TugDaySamples {
  t: string[];
  lat: (number | null)[];
  lon: (number | null)[];
  sog: (number | null)[];
  activity: Activity[];
  power_kw: number[];
  soc: number[];
  generator_on: boolean[];
}

export interface Segment {
  start: string;
  end: string;
  activity: Activity;
  job_id: string | null;
  energy_kwh: number;
}

export interface Job {
  job_id: string;
  start: string;
  end: string;
  energy_kwh: number;
  assist_min: number;
  transit_min: number;
  max_sog: number;
}

export interface ScheduledWindow {
  start: string;
  end: string;
  kw: number;
}

export interface ChargingSpan {
  start: string;
  end: string;
  kwh: number;
  dock: string;
  cost_arrival_usd: number;
  cost_scheduled_usd: number;
  /** Where the scheduler puts the same energy inside this stop. */
  scheduled_windows: ScheduledWindow[];
}

export type TariffTier = "off_peak" | "mid_peak" | "on_peak";

export interface TariffBand {
  start: string;
  end: string;
  tier: TariffTier;
  usd_per_kwh: number;
}

export interface Tariff {
  off_peak: number;
  mid_peak: number;
  on_peak: number;
  charger_kw: number;
  /** Contiguous bands covering the day. */
  bands: TariffBand[];
}

export interface GeneratorSpan {
  start: string;
  end: string;
  kwh: number;
}

export interface DayTotals {
  energy_kwh: number;
  generator_kwh: number;
  charged_kwh: number;
  assist_min: number;
  transit_min: number;
  idle_min: number;
  min_soc: number;
  electric_only: boolean;
  jobs: number;
  charge_cost_usd_arrival: number;
  charge_cost_usd_scheduled: number;
}

export interface TugDay {
  tug_id: string;
  name: string;
  date: string;
  battery_kwh: number;
  samples: TugDaySamples;
  segments: Segment[];
  jobs: Job[];
  charging: ChargingSpan[];
  generator: GeneratorSpan[];
  totals: DayTotals;
  /** Null when the pipeline ran without a tariff; the Charging schedule panel is hidden then. */
  tariff: Tariff | null;
  recording_url: string;
  fixture?: boolean;
}

/** 4. Fleet summary with the battery sweep. */
export interface SweepRow {
  battery_kwh: number;
  electric_share: number;
  generator_kwh: number;
  generator_hours: number;
  charged_kwh: number;
  charge_cost_usd_arrival: number;
  charge_cost_usd_scheduled: number;
}

export interface SummaryTug {
  tug_id: string;
  name: string;
  days: number;
  energy_kwh_per_day: number;
}

export interface Assumption {
  key: string;
  value: number | string;
  note: string;
}

export interface SummaryDataset extends DatasetInfo {
  tug_days: number;
  tugs: number;
}

export interface Summary {
  dataset: SummaryDataset;
  default_battery_kwh: number;
  sweep: SweepRow[];
  tugs: SummaryTug[];
  assumptions: Assumption[];
  fixture?: boolean;
}

/** 5. Static fleet file: compact columnar week for every tug. */
export interface FleetTrack {
  tug_id: string;
  name: string;
  lat: (number | null)[];
  lon: (number | null)[];
  sog: (number | null)[];
  activity: Activity[];
  soc: number[];
  generator_on: boolean[];
  power_kw: number[];
}

export interface FleetFile {
  t0: string;
  step_s: number;
  battery_kwh: number;
  tugs: FleetTrack[];
  fixture?: boolean;
}

export type LngLat = [number, number];
