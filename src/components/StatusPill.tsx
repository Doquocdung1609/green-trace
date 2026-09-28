import type {
  LifecycleStage,
  ReadinessStatus,
  VerificationDecision,
} from "../types/domain";
import { stageLabels } from "../types/domain";

const labels: Record<ReadinessStatus | VerificationDecision, string> = {
  NOT_READY: "Chưa sẵn sàng",
  NEEDS_REVIEW: "Cần xem xét",
  READY_FOR_FINANCIAL_REVIEW: "Sẵn sàng để đối tác tài chính xem xét",
  PENDING: "Chờ xác minh",
  APPROVED: "Đã xác minh",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hiệu lực",
};

export function StatusPill({
  value,
}: {
  value: ReadinessStatus | VerificationDecision | LifecycleStage;
}) {
  const text =
    value in stageLabels
      ? stageLabels[value as LifecycleStage]
      : labels[value as ReadinessStatus];
  return (
    <span className={`status-pill status-${value.toLowerCase()}`}>{text}</span>
  );
}
