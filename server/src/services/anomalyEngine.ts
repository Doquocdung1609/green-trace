import type {
  Asset,
  Attestation,
  Evidence,
  LifecycleEvent,
} from "@prisma/client";
import { isImportantEvidence } from "./verificationPolicyEngine.js";

export interface Warning {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function detectAnomalies(
  asset: Asset,
  evidence: Evidence[],
  attestations: Attestation[],
  events: LifecycleEvent[],
  now = new Date(),
): Warning[] {
  const warnings: Warning[] = [];
  for (const item of evidence) {
    if (item.observedAt < asset.plantedAt)
      warnings.push({
        code: "EVIDENCE_BEFORE_PLANTED",
        severity: "HIGH",
        message: `Bằng chứng “${item.title}” có thời điểm trước ngày trồng.`,
      });
    if (item.validUntil && item.validUntil < now)
      warnings.push({
        code: "CERT_EXPIRED",
        severity: "HIGH",
        message: `Bằng chứng “${item.title}” đã hết hiệu lực.`,
      });
    else if (
      item.validUntil &&
      item.validUntil.getTime() - now.getTime() < 30 * 86400000
    )
      warnings.push({
        code: "CERT_EXPIRING",
        severity: "MEDIUM",
        message: `Bằng chứng “${item.title}” sẽ hết hiệu lực trong 30 ngày.`,
      });
    if (item.type === "GEO_LOCATION" && item.metadataJson) {
      try {
        const geo = JSON.parse(item.metadataJson) as {
          latitude?: number;
          longitude?: number;
        };
        if (
          typeof geo.latitude === "number" &&
          typeof geo.longitude === "number" &&
          distanceKm(
            asset.exactLatitude,
            asset.exactLongitude,
            geo.latitude,
            geo.longitude,
          ) > 10
        )
          warnings.push({
            code: "GPS_OUTSIDE_DECLARED_AREA",
            severity: "HIGH",
            message: "Bằng chứng GPS nằm cách vị trí khai báo trên 10 km.",
          });
      } catch {
        warnings.push({
          code: "INVALID_GEO_METADATA",
          severity: "MEDIUM",
          message: "Không thể đọc metadata vị trí của một bằng chứng.",
        });
      }
    }
  }
  const hashes = new Map<string, number>();
  evidence.forEach((e) =>
    hashes.set(e.contentHash, (hashes.get(e.contentHash) ?? 0) + 1),
  );
  if ([...hashes.values()].some((n) => n > 1))
    warnings.push({
      code: "DUPLICATE_EVIDENCE_HASH",
      severity: "MEDIUM",
      message: "Có nội dung bằng chứng trùng hash trong cùng hồ sơ.",
    });
  if (!evidence.some((e) => e.type === "CERTIFICATE"))
    warnings.push({
      code: "CERT_MISSING",
      severity: "HIGH",
      message: "Hồ sơ chưa có chứng nhận bắt buộc.",
    });
  const importantEvidenceIds = new Set(
    evidence.filter((item) => isImportantEvidence(item.type)).map((item) => item.id),
  );
  const activeVerifiedIds = new Set(
    attestations
      .filter(
        (item) =>
          item.decision === "APPROVED" &&
          !item.revokedAt &&
          (!item.expiresAt || item.expiresAt >= now),
      )
      .map((item) => item.evidenceId),
  );
  if (
    importantEvidenceIds.size > 0 &&
    [...importantEvidenceIds].some((id) => !activeVerifiedIds.has(id))
  )
    warnings.push({
      code: "INDEPENDENT_VERIFICATION_MISSING",
      severity: "HIGH",
      message: "Bằng chứng quan trọng chưa có người xác minh độc lập.",
    });
  if (attestations.some((a) => a.expiresAt && a.expiresAt < now))
    warnings.push({
      code: "ATTESTATION_EXPIRED",
      severity: "MEDIUM",
      message: "Có attestation đã hết hiệu lực.",
    });
  if (
    events.some((e) => e.stageFrom === "HARVESTED" && e.stageTo === "GROWING")
  )
    warnings.push({
      code: "ILLEGAL_LIFECYCLE_REVERSAL",
      severity: "HIGH",
      message:
        "Phát hiện chuyển trạng thái bất hợp lý từ đã thu hoạch về đang sinh trưởng.",
    });
  if (
    events.some((e) => e.stageFrom === "ARCHIVED" && e.stageTo !== "ARCHIVED")
  )
    warnings.push({
      code: "ARCHIVED_REACTIVATED",
      severity: "HIGH",
      message: "Tài sản đã lưu trữ không được kích hoạt lại.",
    });
  return [...new Map(warnings.map((w) => [w.code, w])).values()];
}
