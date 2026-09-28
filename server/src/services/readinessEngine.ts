import type { Evidence } from "@prisma/client";
import type { TrustResult } from "./trustEngine.js";

export function calculateReadiness(profile: TrustResult, evidence: Evidence[]) {
  const identityPercent = (profile.identityScore / 20) * 100;
  const evidencePercent = (profile.evidenceScore / 20) * 100;
  const verificationPercent = (profile.verificationScore / 30) * 100;
  const validCertificate = evidence.some(
    (e) =>
      e.type === "CERTIFICATE" && (!e.validUntil || e.validUntil >= new Date()),
  );
  const highWarning = profile.warnings.some((w) => w.severity === "HIGH");
  if (
    identityPercent >= 90 &&
    evidencePercent >= 80 &&
    verificationPercent >= 70 &&
    !highWarning &&
    validCertificate
  )
    return "READY_FOR_FINANCIAL_REVIEW";
  if (identityPercent >= 70 && evidencePercent >= 40) return "NEEDS_REVIEW";
  return "NOT_READY";
}
