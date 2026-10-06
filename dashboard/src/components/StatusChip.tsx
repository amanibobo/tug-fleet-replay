import { STATUS_COLOR } from "@/lib/format";
import type { Status } from "@/lib/types";
import styles from "./StatusChip.module.css";

const LABEL: Record<Status, string> = {
  electric: "Electric",
  generator: "Generator",
  charging: "Charging",
  idle: "Idle",
};

interface Props {
  status: Status;
  className?: string;
}

export default function StatusChip({ status, className }: Props) {
  return (
    <span className={`${styles.chip} ${className ?? ""}`} data-status={status}>
      <span className={styles.dot} style={{ background: STATUS_COLOR[status] }} aria-hidden />
      {LABEL[status]}
    </span>
  );
}
