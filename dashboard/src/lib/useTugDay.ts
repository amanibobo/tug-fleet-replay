"use client";

import { useEffect, useState } from "react";
import { dataUrl } from "./env";
import { fetchJson, type LoadStatus } from "./fetchJson";
import type { TugDay } from "./types";

export interface TugDayState {
  day: TugDay | null;
  status: LoadStatus;
  error: string | null;
}

/** Loads one tug day (contract section 3) for `id` on `date` (YYYY-MM-DD). */
export function useTugDay(id: string | null, date: string | null): TugDayState {
  const key = id && date ? `${id}/${date}` : null;
  const [result, setResult] = useState<(TugDayState & { key: string }) | null>(null);

  useEffect(() => {
    if (!id || !date || !key) return;
    const ctrl = new AbortController();
    fetchJson<TugDay>(dataUrl.tugDay(id, date), ctrl.signal)
      .then((day) => setResult({ key, day, status: "ready", error: null }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setResult({ key, day: null, status: "error", error: e instanceof Error ? e.message : String(e) });
      });
    return () => ctrl.abort();
  }, [id, date, key]);

  // A result for another tug-day means this one is still loading; keep the old day for a soft transition.
  if (!result || result.key !== key) {
    return { day: result?.day ?? null, status: "loading", error: null };
  }
  return { day: result.day, status: result.status, error: result.error };
}
