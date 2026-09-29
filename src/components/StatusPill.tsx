import type { LifecycleStage, ReadinessStatus, VerificationDecision } from "../types/domain";
import { StatusBadge } from "./ui/StatusBadge";

export function StatusPill({
  value,
}: {
  value: ReadinessStatus | VerificationDecision | LifecycleStage;
}) {
  return <StatusBadge value={value} />;
}
