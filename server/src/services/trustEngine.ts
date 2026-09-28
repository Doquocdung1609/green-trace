import type {
  Asset,
  Attestation,
  Evidence,
  LifecycleEvent,
} from "@prisma/client";
import { detectAnomalies, type Warning } from "./anomalyEngine.js";

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
  const identityFields = [
    asset.assetCode,
    asset.displayName,
    asset.assetType,
    asset.species,
    asset.custodianId,
    asset.organizationId,
    asset.region,
    asset.plantedAt,
    asset.description,
    Number.isFinite(asset.exactLatitude) &&
      Number.isFinite(asset.exactLongitude),
  ];
  const identityScore = Math.round(
    (identityFields.filter(Boolean).length / identityFields.length) * 20,
  );
  const requiredTypes = [
    "PHOTO",
    "GEO_LOCATION",
    "FARM_LOG",
    "CERTIFICATE",
    "INSPECTION",
  ];
  const present = new Set(evidence.map((e) => e.type));
  const evidenceScore = Math.round(
    (requiredTypes.filter((t) => present.has(t)).length /
      requiredTypes.length) *
      20,
  );
  const important = evidence.filter((e) =>
    [
      "PHOTO",
      "GEO_LOCATION",
      "CERTIFICATE",
      "INSPECTION",
      "LAB_RESULT",
    ].includes(e.type),
  );
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
  const verificationScore = important.length
    ? Math.round((approvedEvidence.size / important.length) * 30)
    : 0;
  const currentEvidence = evidence.filter(
    (e) =>
      (!e.validUntil || e.validUntil >= now) &&
      now.getTime() - e.observedAt.getTime() < 366 * 86400000,
  );
  const freshnessScore = evidence.length
    ? Math.round((currentEvidence.length / evidence.length) * 15)
    : 0;
  const warnings = detectAnomalies(asset, evidence, attestations, events, now);
  const penalty = warnings.reduce(
    (sum, w) =>
      sum + (w.severity === "HIGH" ? 5 : w.severity === "MEDIUM" ? 3 : 1),
    0,
  );
  const consistencyScore = Math.max(0, 15 - penalty);
  return {
    identityScore,
    evidenceScore,
    verificationScore,
    freshnessScore,
    consistencyScore,
    totalScore:
      identityScore +
      evidenceScore +
      verificationScore +
      freshnessScore +
      consistencyScore,
    warningCount: warnings.length,
    warnings,
  };
}
