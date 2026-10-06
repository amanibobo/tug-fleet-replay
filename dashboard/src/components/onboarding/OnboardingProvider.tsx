"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type StepId = "play" | "select" | "slider" | "openDay";

export const STEP_IDS: readonly StepId[] = ["play", "select", "slider", "openDay"];

interface Persisted {
  steps: Record<StepId, boolean>;
  tourSeen: boolean;
  dismissed: boolean;
}

const KEY = "tugboard.onboarding";

const DEFAULT: Persisted = {
  steps: { play: false, select: false, slider: false, openDay: false },
  tourSeen: false,
  dismissed: false,
};

function load(): Persisted {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      steps: { ...DEFAULT.steps, ...(parsed.steps ?? {}) },
      tourSeen: parsed.tourSeen === true,
      dismissed: parsed.dismissed === true,
    };
  } catch {
    return DEFAULT;
  }
}

function save(state: Persisted) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage: progress lives for the session only.
  }
}

export interface OnboardingContextValue {
  state: Persisted;
  /** True once localStorage has been read, so the checklist never flashes the default state. */
  loaded: boolean;
  complete: (id: StepId) => void;
  /** Whether the checklist card is showing. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Increments each time someone asks for the tour; the console's Tour component listens. */
  tourRequest: number;
  requestTour: () => void;
  markTourSeen: () => void;
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
}

const Ctx = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [tourRequest, setTourRequest] = useState(0);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    // Hydrate from storage after mount; the server render has no access to it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (prev: Persisted) => Persisted) => {
    setState((prev) => {
      const next = fn(prev);
      if (next !== prev) save(next);
      return next;
    });
  }, []);

  const complete = useCallback(
    (id: StepId) => update((prev) => (prev.steps[id] ? prev : { ...prev, steps: { ...prev.steps, [id]: true } })),
    [update],
  );

  const setOpen = useCallback((open: boolean) => update((prev) => (prev.dismissed === !open ? prev : { ...prev, dismissed: !open })), [update]);

  const markTourSeen = useCallback(() => update((prev) => (prev.tourSeen ? prev : { ...prev, tourSeen: true })), [update]);

  const requestTour = useCallback(() => setTourRequest((n) => n + 1), []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      loaded,
      complete,
      open: !state.dismissed,
      setOpen,
      tourRequest,
      requestTour,
      markTourSeen,
      tourActive,
      setTourActive,
    }),
    [state, loaded, complete, setOpen, tourRequest, requestTour, markTourSeen, tourActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOnboarding needs OnboardingProvider");
  return v;
}
