"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import FixtureBadge from "@/components/FixtureBadge";
import Footer from "@/components/Footer";
import Checklist from "@/components/onboarding/Checklist";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import Tour from "@/components/onboarding/Tour";
import { dateRange } from "@/lib/format";
import { useFleet } from "@/lib/useFleet";
import { useSummary } from "@/lib/useSummary";
import ClockPanel from "./ClockPanel";
import FleetList from "./FleetList";
import HeadlinePanel from "./HeadlinePanel";
import styles from "./FleetConsole.module.css";

const FleetMap = dynamic(() => import("./FleetMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} aria-hidden />,
});

export default function FleetConsole() {
  const fleet = useFleet();
  const summary = useSummary();
  const onboarding = useOnboarding();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) onboarding.complete("select");
    },
    [onboarding],
  );

  const firstId = useMemo(() => {
    if (fleet.tugs.length === 0) return null;
    return [...fleet.tugs].sort((a, b) => a.name.localeCompare(b.name))[0].tug_id;
  }, [fleet.tugs]);
  const selectFirst = useCallback(() => {
    if (firstId) setSelectedId(firstId);
  }, [firstId]);

  const setPlaying = useCallback(
    (p: boolean) => {
      fleet.setPlaying(p);
      onboarding.complete("play");
    },
    [fleet, onboarding],
  );

  return (
    <main className={styles.root}>
      <aside className={styles.rail} aria-label="Fleet console">
        <div className={styles.railHead}>
          <div className={styles.titleRow}>
            <h1 className={styles.h1}>Fleet replay</h1>
            {fleet.fixture ? <FixtureBadge /> : null}
          </div>
          <p className={styles.sub}>
            {fleet.dataset ? (
              <>
                Ports of Los Angeles and Long Beach, {dateRange(fleet.dataset.start, fleet.dataset.end)},{" "}
                {fleet.dataset.source ?? "NOAA AIS"}
              </>
            ) : fleet.status === "error" ? (
              "Fleet data unavailable."
            ) : (
              "Loading fleet"
            )}
          </p>
        </div>

        <ClockPanel
          clock={fleet.clock}
          playing={fleet.playing}
          speed={fleet.speed}
          setPlaying={setPlaying}
          setSpeed={fleet.setSpeed}
          seek={fleet.seek}
          range={fleet.range}
          controllable={fleet.controllable}
          status={fleet.status}
        />

        <HeadlinePanel summary={summary} onSlide={() => onboarding.complete("slider")} />

        <FleetList tugs={fleet.tugs} selectedId={selectedId} onSelect={onSelect} loading={fleet.status === "loading"} clock={fleet.clock} />

        <Footer className={styles.footer} dataset={fleet.dataset} />
      </aside>

      <div className={styles.mapWrap} data-tour="map">
        <FleetMap tugs={fleet.tugs} trails={fleet.trails} selectedId={selectedId} onSelect={onSelect} />
        {fleet.status === "error" ? (
          <div className={styles.mapError} role="alert">
            Could not load fleet data{fleet.error ? `: ${fleet.error}` : ""}.
          </div>
        ) : null}
      </div>

      <Checklist />
      <Tour ready={fleet.status === "ready" && fleet.tugs.length > 0} selectFirst={selectFirst} />
    </main>
  );
}
