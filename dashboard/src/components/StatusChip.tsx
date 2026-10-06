import type { Status } from "@/lib/types";

const LABEL: Record<Status, string> = {
  electric: "Electric",
  generator: "Generator",
  charging: "Charging",
  idle: "Idle",
};

const CLASS: Record<Status, string> = {
  electric: "chipGreen",
  generator: "chipRed",
  charging: "chipBlue",
  idle: "",
};

interface Props {
  status: Status;
  className?: string;
}

/** Pill with a soft tint and the accent as text: Electric green, Charging blue, Idle gray, Generator red. */
export default function StatusChip({ status, className }: Props) {
  return <span className={`chip ${CLASS[status]} ${className ?? ""}`}>{LABEL[status]}</span>;
}
