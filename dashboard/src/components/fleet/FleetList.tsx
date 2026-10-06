"use client";

import { useEffect, useRef, useState } from "react";
import BatteryBar from "@/components/BatteryBar";
import FixtureBadge from "@/components/FixtureBadge";
import StatusChip from "@/components/StatusChip";
import { ACTIVITY_COLOR, fmtInt, fmtPct, statusOf } from "@/lib/format";
import type { Telemetry } from "@/lib/types";
import TugDetail from "./TugDetail";
import styles from "./FleetList.module.css";

type Filter = "all" | "working" | "charging" | "generator";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "working", label: "Working" },
  { id: "charging", label: "Charging" },
  { id: "generator", label: "Generator" },
];

function matches(t: Telemetry, f: Filter): boolean {
  switch (f) {
    case "all":
      return true;
    case "working":
      return !t.generator_on && (t.activity === "transit" || t.activity === "assist");
    case "charging":
      return t.activity === "charging";
    case "generator":
      return t.generator_on;
  }
}

interface Props {
  tugs: Telemetry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
  error?: boolean;
  clock: number | null;
  fixture?: boolean;
}

/** Dense fleet table: 36px rows, a filter segmented control, the selected tug's detail inline. */
export default function FleetList({ tugs, selectedId, onSelect, loading, error, clock, fixture }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = [...tugs].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((t) => matches(t, filter));
  const listRef = useRef<HTMLUListElement>(null);

  // Bring a tug picked on the map into view in the rail.
  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <section className={styles.panel} aria-label="Fleet" data-tour="fleet">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className="heading">Fleet</span>
          <span className={styles.count} title={`${fmtInt(tugs.length)} tugs`}> · {fmtInt(tugs.length)}</span>
          {fixture ? <FixtureBadge className={styles.badge} /> : null}
        </h2>
        <div className={`segmented ${styles.filter}`} role="radiogroup" aria-label="Filter the fleet">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.cols} aria-hidden>
        <span>Name</span>
        <span>Status</span>
        <span className={styles.colRight}>Battery</span>
      </div>

      <ul ref={listRef} className={styles.list} role="listbox" aria-label="Tugs">
        {loading && sorted.length === 0 ? (
          Array.from({ length: 8 }, (_, i) => <li key={i} className={styles.skeleton} aria-hidden />)
        ) : error && sorted.length === 0 ? (
          <li className={styles.empty}>Fleet data unavailable.</li>
        ) : shown.length === 0 ? (
          <li className={styles.empty}>No tugs match this filter right now.</li>
        ) : (
          shown.map((t) => {
            const selected = t.tug_id === selectedId;
            const accent = t.generator_on ? "var(--d-red)" : ACTIVITY_COLOR[t.activity];
            return (
              <li
                key={t.tug_id}
                data-id={t.tug_id}
                className={styles.item}
                data-selected={selected || undefined}
                style={selected ? { borderLeftColor: accent } : undefined}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={styles.row}
                  onClick={() => onSelect(selected ? null : t.tug_id)}
                >
                  <span className={styles.name}>{t.name}</span>
                  <StatusChip status={statusOf(t)} />
                  <span className={styles.batt}>
                    <BatteryBar soc={t.soc} width={48} height={3} />
                    <span className={`mono ${styles.soc}`}>{fmtPct(t.soc)}</span>
                  </span>
                </button>
                {selected ? <TugDetail tug={t} clock={clock} /> : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
