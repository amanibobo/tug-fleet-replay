"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import { useOnboarding } from "./OnboardingProvider";

interface Props {
  /** Fleet data is loaded and the rail sections are on screen. */
  ready: boolean;
  /** Selects the first tug so its "Open day" button exists for the last stop. */
  selectFirst: () => void;
}

const SEL = {
  clock: '[data-tour="clock"]',
  headline: '[data-tour="headline"]',
  fleet: '[data-tour="fleet"]',
  map: '[data-tour="map"]',
  openDay: '[data-tour="open-day"]',
} as const;

function waitFor(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const look = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - started > timeoutMs) return resolve(null);
      requestAnimationFrame(look);
    };
    look();
  });
}

/** Five stops on the console with driver.js. Auto-starts once on the first visit after the fleet loads. */
export default function Tour({ ready, selectFirst }: Props) {
  const { loaded, state, tourRequest, markTourSeen, setTourActive } = useOnboarding();
  const params = useSearchParams();
  const wantsTour = params.get("tour") === "1";
  const driverRef = useRef<Driver | null>(null);
  const autoStarted = useRef(false);
  const lastRequest = useRef(0);
  const selectFirstRef = useRef(selectFirst);
  useEffect(() => {
    selectFirstRef.current = selectFirst;
  }, [selectFirst]);

  useEffect(() => {
    const start = () => {
      driverRef.current?.destroy();
      const d = driver({
        animate: true,
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        popoverClass: "tb-popover",
        stagePadding: 6,
        stageRadius: 6,
        overlayColor: "#000000",
        overlayOpacity: 0.6,
        allowClose: true,
        smoothScroll: true,
        onDestroyed: () => setTourActive(false),
        steps: [
          {
            element: SEL.clock,
            popover: {
              title: "Clock and speed",
              description: "The replay runs the week at 60x to 300x. Play, pause, or scrub to any day.",
              side: "right",
              align: "start",
            },
          },
          {
            element: SEL.headline,
            popover: {
              title: "The headline",
              description:
                "The share of tug-days that never needed the generator. Move the battery slider to see how pack size changes it.",
              side: "right",
              align: "start",
            },
          },
          {
            element: SEL.fleet,
            popover: {
              title: "The fleet",
              description: "Every tug in the week with its status and charge. Click a row to expand its detail.",
              side: "right",
              align: "start",
            },
          },
          {
            element: SEL.map,
            popover: {
              title: "The map",
              description: "Boats turn with their heading and trail the last 30 minutes in their activity color.",
              side: "left",
              align: "start",
              onNextClick: () => {
                selectFirstRef.current();
                void waitFor(SEL.openDay, 1500).then(() => {
                  const el = document.querySelector(SEL.openDay);
                  el?.scrollIntoView({ block: "center" });
                  setTimeout(() => driverRef.current?.moveNext(), 350);
                });
              },
            },
          },
          {
            element: SEL.openDay,
            popover: {
              title: "Open a day",
              description: "One tug-day in full: battery curve, jobs, charging schedule and the Rerun recording.",
              side: "top",
              align: "start",
            },
          },
        ],
      });
      driverRef.current = d;
      setTourActive(true);
      markTourSeen();
      d.drive();
    };

    if (!loaded || !ready) return;

    if (tourRequest > lastRequest.current) {
      lastRequest.current = tourRequest;
      start();
      return;
    }
    if (!autoStarted.current && (wantsTour || !state.tourSeen)) {
      autoStarted.current = true;
      const id = setTimeout(start, 900);
      return () => clearTimeout(id);
    }
  }, [loaded, ready, tourRequest, wantsTour, state.tourSeen, markTourSeen, setTourActive]);

  useEffect(
    () => () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    },
    [],
  );

  return null;
}
