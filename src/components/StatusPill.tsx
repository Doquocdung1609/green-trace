import { StatusBadge } from "./ui/StatusBadge";

export function StatusPill({
  value,
}: {
  value: string;
}) {
  return <StatusBadge value={value} />;
}
