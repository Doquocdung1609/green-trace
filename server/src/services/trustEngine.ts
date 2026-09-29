import type {
  Asset,
  Attestation,
  Evidence,
  LifecycleEvent,
} from "@prisma/client";
import { detectAnomalies, type Warning } from "./anomalyEngine.js";
import { isImportantEvidence } from "./verificationPolicyEngine.js";

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
): TrustResult {
  const clamp = (value: number, maximum: number) =>
    Math.max(0, Math.min(maximum, Math.round(value)));
  const identityFields = [
    asset.assetCode,
    asset.displayName,
    asset.assetType,
    asset.assetLevel,
    asset.species,
    asset.scientificName,
    asset.propagationSource,
    asset.plantedAtConfidence,
    asset.organizationId,
    asset.managementBasis,
    asset.region,
    asset.plantedAt,
    Number.isFinite(asset.elevationMeters),
    Number.isFinite(asset.exactLatitude) &&
      Number.isFinite(asset.exactLongitude),
  ];
  const identityScore = clamp(
    (identityFields.filter(Boolean).length / identityFields.length) * 20,
    20,
  );
  const requiredTypes = [
    "PHOTO",
    "GEO_LOCATION",
    "PROPAGATION_SOURCE",
    "CERTIFICATE",
    "INSPECTION",
  ];
  const present = new Set(evidence.map((e) => e.type));
  const evidenceScore = clamp(
    (requiredTypes.filter((t) => present.has(t)).length /
      requiredTypes.length) *
      20,
    20,
  );
  const important = evidence.filter((e) => isImportantEvidence(e.type));
  const approvedEvidence = new Set(
    attestations
      .filter(
        (a) =>
          a.decision === "APPROVED" &&
          !a.revokedAt &&
          (!a.expiresAt || a.expiresAt >= now),
      )
      .map((a) => a.evidenceId),
  );
  const approvedImportantCount = important.filter((item) => approvedEvidence.has(item.id)).length;
  const verificationScore = important.length
    ? clamp((approvedImportantCount / important.length) * 30, 30)
    : 0;
  const currentEvidence = evidence.filter(
    (e) =>
      (!e.validUntil || e.validUntil >= now) &&
      now.getTime() - e.observedAt.getTime() < 366 * 86400000,
  );
  const freshnessScore = evidence.length
    ? clamp((currentEvidence.length / evidence.length) * 15, 15)
    : 0;
  const warnings = detectAnomalies(asset, evidence, attestations, events, now);
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
