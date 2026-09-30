import type {
  Asset,
  Attestation,
  Evidence,
  LifecycleEvent,
} from "@prisma/client";
import { detectAnomalies, type Warning } from "./anomalyEngine.js";
import { genericTemplateRules, type AssetTemplateRules } from "./assetTemplateRules.js";

export interface TrustResult {
  identityScore: number;
  evidenceScore: number;
  verificationScore: number;
  freshnessScore: number;
  consistencyScore: number;
  totalScore: number;
  warningCount: number;
  warnings: Warning[];
}

export function calculateTrust(
  asset: Asset,
  evidence: Evidence[],
  attestations: Attestation[],
  events: LifecycleEvent[],
  now = new Date(),
  rules: AssetTemplateRules = genericTemplateRules,
): TrustResult {
  const clamp = (value: number, maximum: number) =>
    Math.max(0, Math.min(maximum, Math.round(value)));
  const identityValue = (field: string) => {
    if (field === "location")
      return Boolean(
        asset.region &&
          Number.isFinite(asset.exactLatitude) &&
          Number.isFinite(asset.exactLongitude),
      );
    if (field === "managementEntity") return Boolean(asset.organizationId);
    return Boolean((asset as unknown as Record<string, unknown>)[field]);
  };
  const identityFields = rules.requiredIdentityFields.map(identityValue);
  const identityScore = clamp(
    (identityFields.filter(Boolean).length / identityFields.length) * 20,
    20,
  );
  const requiredTypes = rules.requiredEvidence;
  const present = new Set(evidence.map((e) => e.type));
  const evidenceScore = clamp(
    (requiredTypes.filter((t) => present.has(t)).length /
      requiredTypes.length) *
      20,
    20,
  );
  const important = evidence.filter((e) => rules.importantEvidence.includes(e.type));
  const approvedEvidence = new Set(
    attestations
      .filter(
        (a) =>
          a.decision === "APPROVED" &&
          a.chainStatus === "CONFIRMED" &&
          !a.revokedAt &&
          (!a.expiresAt || a.expiresAt >= now),
      )
      .map((a) => a.evidenceId),
  );
  const importantTypesPresent = [...new Set(important.map((item) => item.type))];
  const approvedImportantTypes = importantTypesPresent.filter((type) =>
    important.some((item) => item.type === type && approvedEvidence.has(item.id)),
  );
  const verificationScore = rules.importantEvidence.length
    ? clamp((approvedImportantTypes.length / rules.importantEvidence.length) * 30, 30)
    : 0;
  const currentImportantTypes = rules.importantEvidence.filter((type) =>
    important.some(
      (item) =>
        item.type === type &&
        (!item.validUntil || item.validUntil >= now) &&
        now.getTime() - item.observedAt.getTime() <=
          rules.risk.criticalFreshnessDays * 86400000 &&
        (item.verificationStatus === "NOT_REQUIRED" || approvedEvidence.has(item.id)),
    ),
  );
  const freshnessScore = rules.importantEvidence.length
    ? clamp((currentImportantTypes.length / rules.importantEvidence.length) * 15, 15)
    : 0;
  const warnings = detectAnomalies(asset, evidence, attestations, events, now, rules);
  const penalty = warnings.reduce(
    (sum, w) =>
      sum + (w.severity === "HIGH" ? 5 : w.severity === "MEDIUM" ? 3 : 1),
    0,
  );
  const consistencyScore = clamp(15 - penalty, 15);
  const totalScore = clamp(
    identityScore + evidenceScore + verificationScore + freshnessScore + consistencyScore,
    100,
  );
  return {
    identityScore,
    evidenceScore,
    verificationScore,
    freshnessScore,
    consistencyScore,
    totalScore,
    warningCount: warnings.length,
    warnings,
  };
}
