import { Circle } from "lucide-react";
import type { LifecycleStage, ReadinessStatus, VerificationDecision } from "../../types/domain";
import { stageLabels } from "../../types/domain";

type StatusValue = ReadinessStatus | VerificationDecision | LifecycleStage | "CONFIRMED" | "PENDING_CHAIN" | "FAILED_CHAIN" | "ACTIVE" | "WARNING" | "DANGER" | "INFO";

const labels: Partial<Record<StatusValue, string>> = {
  NOT_READY: "Chưa sẵn sàng",
  NEEDS_REVIEW: "Cần xem xét",
  READY_FOR_FINANCIAL_REVIEW: "Sẵn sàng xem xét tài chính",
  PENDING: "Chờ xác minh",
  APPROVED: "Đã xác minh",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hiệu lực",
  CONFIRMED: "Đã ghi nhận",
  PENDING_CHAIN: "Đang ghi on-chain",
  FAILED_CHAIN: "Ghi on-chain thất bại",
  ACTIVE: "Đang hiệu lực",
  WARNING: "Cần chú ý",
  DANGER: "Rủi ro cao",
  INFO: "Đang xử lý",
};

export function StatusBadge({ value, label }: { value: StatusValue; label?: string }) {
  const text = label ?? (value in stageLabels ? stageLabels[value as LifecycleStage] : labels[value]) ?? value;
  return <span className={`status-badge status-${value.toLowerCase()}`}><Circle size={7} fill="currentColor" aria-hidden="true" />{text}</span>;
}
