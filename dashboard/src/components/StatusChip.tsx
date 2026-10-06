import { STATUS_COLOR } from "@/lib/format";
import type { Status } from "@/lib/types";

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

/** A 6px dot in the status color and 12px text: Electric green, Charging blue, Idle gray, Generator red. */
export default function StatusChip({ status, className }: Props) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, lineHeight: 1, color: "var(--d-fg-2)", whiteSpace: "nowrap" }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[status], flex: "none" }} />
      {LABEL[status]}
    </span>
  );
}
