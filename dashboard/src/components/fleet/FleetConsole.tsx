"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import FixtureBadge from "@/components/FixtureBadge";
import Footer from "@/components/Footer";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onSelect = useCallback((id: string | null) => setSelectedId(id), []);

  return (
    <main className={styles.root}>
      <div className={styles.mapWrap}>
        <FleetMap tugs={fleet.tugs} trails={fleet.trails} selectedId={selectedId} onSelect={onSelect} />
        {fleet.status === "error" ? (
          <div className={styles.mapError} role="alert">
            Could not load fleet data{fleet.error ? `: ${fleet.error}` : ""}.
          </div>
        ) : null}
      </div>

      <aside className={styles.rail} aria-label="Fleet console">
        <section className={styles.section}>
          <div className={styles.titleRow}>
            <h1 className="title">Tug fleet replay</h1>
            {fleet.fixture ? <FixtureBadge /> : null}
          </div>
          <p className={styles.sub}>
            {fleet.dataset ? (
              <>
                Port of Los Angeles and Long Beach, {dateRange(fleet.dataset.start, fleet.dataset.end)},{" "}
                {fleet.dataset.source ?? "NOAA AIS"}
              </>
            ) : fleet.status === "error" ? (
              "Fleet data unavailable."
            ) : (
              "Loading fleet"
            )}
          </p>
        </section>

        <ClockPanel
          clock={fleet.clock}
          playing={fleet.playing}
          speed={fleet.speed}
          setPlaying={fleet.setPlaying}
          setSpeed={fleet.setSpeed}
          seek={fleet.seek}
          range={fleet.range}
          controllable={fleet.controllable}
          status={fleet.status}
          className={styles.section}
        />

        <HeadlinePanel summary={summary} className={styles.section} />

        <FleetList
          tugs={fleet.tugs}
          selectedId={selectedId}
          onSelect={onSelect}
          loading={fleet.status === "loading"}
          clock={fleet.clock}
          className={styles.listSection}
        />

        <Footer className={styles.footer} dataset={fleet.dataset} />
      </aside>
    </main>
  );
}
