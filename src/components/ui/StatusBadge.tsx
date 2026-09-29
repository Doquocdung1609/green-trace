import { Circle } from "lucide-react";
import type { LifecycleStage, ReadinessStatus, VerificationDecision } from "../../types/domain";
import { stageLabels } from "../../types/domain";

type StatusValue = ReadinessStatus | VerificationDecision | LifecycleStage | "CONFIRMED" | "PENDING_CHAIN" | "FAILED_CHAIN" | "ACTIVE" | "WARNING" | "DANGER" | "INFO" | "NOT_LISTED" | "AVAILABLE" | "RESERVED" | "PURCHASE_REQUESTED" | "SOLD" | "UNDER_CUSTODY" | "DELIVERY_REQUESTED" | "DELIVERED" | "SETTLED" | "CANCELLED" | "COMPLETED" | "REQUESTED" | "SCHEDULED" | "RESOLVED" | "OPEN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const labels: Partial<Record<StatusValue, string>> = {
  NOT_READY: "Chưa sẵn sàng",
  NEEDS_SUPPLEMENT: "Cần bổ sung",
  READY_FOR_REVIEW: "Sẵn sàng review",
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
  NOT_LISTED: "Chưa chào bán",
  AVAILABLE: "Đang chào bán",
  RESERVED: "Đã giữ chỗ",
  PURCHASE_REQUESTED: "Đã yêu cầu mua",
  SOLD: "Đã bán",
  UNDER_CUSTODY: "Đang lưu ký",
  DELIVERY_REQUESTED: "Đã yêu cầu bàn giao",
  DELIVERED: "Đã bàn giao",
  SETTLED: "Đã tất toán",
  CANCELLED: "Đã hủy",
  COMPLETED: "Đã hoàn tất",
  REQUESTED: "Đã gửi yêu cầu",
  SCHEDULED: "Đã xác nhận lịch",
  RESOLVED: "Đã xử lý",
  OPEN: "Đang mở",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

export function StatusBadge({ value, label }: { value: StatusValue | string; label?: string }) {
  const text = label ?? (value in stageLabels ? stageLabels[value as LifecycleStage] : labels[value as StatusValue]) ?? value;
  return <span className={`status-badge status-${value.toLowerCase()}`}><Circle size={7} fill="currentColor" aria-hidden="true" />{text}</span>;
}
