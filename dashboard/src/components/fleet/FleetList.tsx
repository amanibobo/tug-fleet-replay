"use client";

import { useEffect, useRef } from "react";
import BatteryBar from "@/components/BatteryBar";
import StatusChip from "@/components/StatusChip";
import Tile from "@/components/Tile";
import { fmtInt, fmtPct, statusOf } from "@/lib/format";
import type { Telemetry } from "@/lib/types";
import TugDetail from "./TugDetail";
import styles from "./FleetList.module.css";

interface Props {
  tugs: Telemetry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
  clock: number | null;
}

export default function FleetList({ tugs, selectedId, onSelect, loading, clock }: Props) {
  const sorted = [...tugs].sort((a, b) => a.name.localeCompare(b.name));
  const listRef = useRef<HTMLUListElement>(null);

  // Bring a tug picked on the map into view in the rail.
  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <Tile
      padding="none"
      className={styles.panel}
      aria-label="Fleet"
      data-tour="fleet"
      title="Fleet"
      note={<span className="chip">{fmtInt(tugs.length)} tugs</span>}
    >
      <ul ref={listRef} className={styles.list} role="listbox" aria-label="Tugs">
        {loading && sorted.length === 0
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className={styles.skeleton} aria-hidden />)
          : sorted.map((t) => {
              const selected = t.tug_id === selectedId;
              return (
                <li key={t.tug_id} data-id={t.tug_id} className={styles.item} data-selected={selected || undefined}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={styles.row}
                    onClick={() => onSelect(selected ? null : t.tug_id)}
                  >
                    <span className={styles.name}>{t.name}</span>
                    <StatusChip status={statusOf(t)} className={styles.chip} />
                    <span className={styles.batt}>
                      <BatteryBar soc={t.soc} width={48} track={selected ? "tile" : "white"} />
                      <span className={`num ${styles.soc}`}>{fmtPct(t.soc)}</span>
                    </span>
                  </button>
                  {selected ? <TugDetail tug={t} clock={clock} onClose={() => onSelect(null)} /> : null}
                </li>
              );
            })}
      </ul>
    </Tile>
  );
}
