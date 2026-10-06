"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dataUrl } from "./env";
import { fetchJson, type LoadStatus } from "./fetchJson";
import type { Summary, SweepRow } from "./types";

export interface SliderBounds {
  min: number;
  max: number;
  step: number;
}

export interface SummaryState {
  summary: Summary | null;
  status: LoadStatus;
  error: string | null;
  /** Nearest sweep row for a battery size. */
  pick: (batteryKwh: number) => SweepRow | null;
  bounds: SliderBounds | null;
  defaultKwh: number;
}

export function useSummary(): SummaryState {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<Summary>(dataUrl.summary(), ctrl.signal)
      .then((s) => {
        setSummary({ ...s, sweep: [...s.sweep].sort((a, b) => a.battery_kwh - b.battery_kwh) });
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => ctrl.abort();
  }, []);

  const pick = useCallback(
    (kwh: number): SweepRow | null => {
      const sweep = summary?.sweep;
      if (!sweep || sweep.length === 0) return null;
      let best = sweep[0];
      for (const row of sweep) {
        if (Math.abs(row.battery_kwh - kwh) < Math.abs(best.battery_kwh - kwh)) best = row;
      }
      return best;
    },
    [summary],
  );

  const bounds = useMemo<SliderBounds | null>(() => {
    const sweep = summary?.sweep;
    if (!sweep || sweep.length === 0) return null;
    const min = sweep[0].battery_kwh;
    const max = sweep[sweep.length - 1].battery_kwh;
    let step = sweep.length > 1 ? sweep[1].battery_kwh - min : 250;
    for (let i = 1; i < sweep.length; i++) step = Math.min(step, sweep[i].battery_kwh - sweep[i - 1].battery_kwh);
    return { min, max, step: step > 0 ? step : 250 };
  }, [summary]);

  return { summary, status, error, pick, bounds, defaultKwh: summary?.default_battery_kwh ?? 6000 };
}
