# Data contract

All JSON produced by the Python pipeline and consumed by the dashboard, the Lambda ingest and the
mobile screen. Times are ISO 8601 UTC strings. Energy in kWh, power in kW, speed in knots.

## 1. Telemetry message (one per tug per tick)

Published by the replayer to MQTT topic `tugs/{tug_id}/telemetry` and relayed over WebSocket
as `{"type":"telemetry","data":<message>}`. Also the row shape in DynamoDB table `tug_live`.

```json
{
  "tug_id": "366999123",                 // AIS MMSI as string
  "name": "MILLENNIUM DAWN",
  "t": "2024-12-02T15:04:00Z",           // replay clock (original AIS time)
  "lat": 33.7412, "lon": -118.2701,
  "sog": 6.2, "cog": 184.0, "heading": 186,
  "activity": "transit",                 // transit | assist | idle | charging
  "power_kw": 420.5,                     // positive = draw, negative = charging
  "soc": 0.83,                           // 0..1 state of charge
  "generator_on": false,
  "generator_kw": 0,
  "battery_kwh": 6000,                   // capacity used for this sim
  "job_id": "366999123-2024-12-02-03"    // null when idle between jobs
}
```

## 2. Fleet snapshot `GET /fleet` and WebSocket `{"type":"snapshot","data":...}`

```json
{
  "clock": "2024-12-02T15:04:00Z",
  "speedup": 120,
  "tugs": [ <telemetry message>, ... ],
  "dataset": { "start": "2024-12-02", "end": "2024-12-08", "source": "NOAA AIS" }
}
```

## 3. Tug day `GET /tugs/{tug_id}/days/{YYYY-MM-DD}`

Static file path: `/data/tugdays/{tug_id}/{date}.json`.

```json
{
  "tug_id": "366999123", "name": "MILLENNIUM DAWN", "date": "2024-12-02",
  "battery_kwh": 6000,
  "samples": {                           // columnar, 1-minute resolution, aligned arrays
    "t": ["2024-12-02T00:00:00Z", ...],
    "lat": [...], "lon": [...], "sog": [...],
    "activity": ["idle", ...],
    "power_kw": [...], "soc": [...], "generator_on": [false, ...]
  },
  "segments": [                          // contiguous activity spans
    { "start": "...", "end": "...", "activity": "assist", "job_id": "...", "energy_kwh": 310.2 }
  ],
  "jobs": [
    { "job_id": "...", "start": "...", "end": "...", "energy_kwh": 512.0,
      "assist_min": 38, "transit_min": 22, "max_sog": 9.1 }
  ],
  "charging": [ { "start": "...", "end": "...", "kwh": 850.0, "dock": "Dock A",
                  "cost_arrival_usd": 190.5, "cost_scheduled_usd": 119.0,
                  "scheduled_windows": [ { "start": "...", "end": "...", "kw": 2000 } ] } ],
  "tariff": { "off_peak": 0.14, "mid_peak": 0.22, "on_peak": 0.45, "charger_kw": 2000,
              "bands": [ { "start": "...", "end": "...", "tier": "on_peak", "usd_per_kwh": 0.45 } ] },
  "generator": [ { "start": "...", "end": "...", "kwh": 120.0 } ],
  "totals": { "energy_kwh": 2410.0, "generator_kwh": 120.0, "charged_kwh": 850.0,
              "assist_min": 300, "transit_min": 210, "idle_min": 930, "min_soc": 0.12,
              "electric_only": false, "jobs": 3,
              "charge_cost_usd_arrival": 190.5, "charge_cost_usd_scheduled": 119.0 },
  "recording_url": "/recordings/366999123/2024-12-02.rrd"
}
```

## 4. Fleet summary `GET /summary?battery_kwh=6000`

Static: `/data/summary.json` holds a precomputed sweep so the slider needs no server.

```json
{
  "dataset": { "start": "2024-12-02", "end": "2024-12-08", "tug_days": 84, "tugs": 12 },
  "default_battery_kwh": 6000,
  "sweep": [
    { "battery_kwh": 1000, "electric_share": 0.21, "generator_kwh": 48000, "generator_hours": 80,
      "charged_kwh": 150000, "charge_cost_usd_arrival": 31000, "charge_cost_usd_scheduled": 24500 },
    ...
  ],
  "tugs": [ { "tug_id": "...", "name": "...", "days": 7, "energy_kwh_per_day": 2400 } ],
  "assumptions": [ { "key": "assist_power_kw", "value": 1400, "note": "weakest estimate" }, ... ]
}
```

`electric_share` = tug-days where the generator never ran / total tug-days. This is the headline.

## 5. Static fleet file `/data/fleet.json`

Compact 1-minute columnar track for all tugs for the whole week, so the dashboard can replay
with no backend (static mode). Shape: `{ "t0": "...", "step_s": 60, "battery_kwh": 6000,
"tugs": [ { "tug_id", "name", "lat": [...], "lon": [...], "sog": [...], "activity": [...],
"soc": [...], "generator_on": [...], "power_kw": [...] } ] }`. Nulls where the tug had no fix.

## 6. Rerun recording per tug-day

Entity paths, all on timeline `replay` (timestamp):
- `/tug/position` GeoPoints, `/tug/track` GeoLineStrings (full day, static)
- `/battery/soc` Scalars (0..1), `/power/draw_kw` Scalars, `/power/generator_kw` Scalars
- `/activity` TextLog with the label at each change
- `/labels/rule` and `/labels/hand` Scalars encoded 0=idle 1=assist 2=transit for validation

Blueprint: map left, three stacked time series right, text log bottom.

## Modes

Dashboard env `NEXT_PUBLIC_DATA_MODE`: `static` (default, reads `/data/*.json` from `public/`),
`ws` (connects to `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_API_URL`). The component tree is the same;
only the data hook differs.
