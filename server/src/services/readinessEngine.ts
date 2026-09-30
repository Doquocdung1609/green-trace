import type { Asset, AssetIncident, Attestation, CustodyRecord, Evidence, RightsRecord, RiskProfile } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import type { TrustResult } from "./trustEngine.js";
import { genericTemplateRules, rulesForTemplate, type AssetTemplateRules } from "./assetTemplateRules.js";

export type ReadinessPurpose = "REAL_ASSET_TRANSFER" | "FINANCIAL_REVIEW";
export type ReadinessStatus = "NOT_READY" | "NEEDS_SUPPLEMENT" | "READY_FOR_REVIEW";

interface ReadinessContext {
  asset: Asset;
  trust: Pick<TrustResult, "identityScore" | "evidenceScore" | "verificationScore" | "freshnessScore" | "totalScore">;
  evidence: Evidence[];
  riskProfile: RiskProfile | null;
  rightsRecords: RightsRecord[];
  custodyRecords: CustodyRecord[];
  incidents: AssetIncident[];
  attestations: Attestation[];
}

export interface ReadinessResult {
  purpose: ReadinessPurpose;
  status: ReadinessStatus;
  requirements: Array<{ key: string; label: string; met: boolean }>;
  missingItems: string[];
}

function finish(purpose: ReadinessPurpose, requirements: ReadinessResult["requirements"]): ReadinessResult {
  const missingItems = requirements.filter((item) => !item.met).map((item) => item.label);
  const foundationalReady = requirements.slice(0, 2).every((item) => item.met);
  return {
    purpose,
    status: missingItems.length === 0 ? "READY_FOR_REVIEW" : foundationalReady ? "NEEDS_SUPPLEMENT" : "NOT_READY",
    requirements,
    missingItems,
  };
}

export function calculatePurposeReadiness(
  purpose: ReadinessPurpose,
  context: ReadinessContext,
  templateRules: AssetTemplateRules = genericTemplateRules,
): ReadinessResult {
  const now = new Date();
  const activeApprovedEvidence = new Set(
    context.attestations
      .filter(
        (item) =>
          item.decision === "APPROVED" &&
          item.chainStatus === "CONFIRMED" &&
          !item.revokedAt &&
          (!item.expiresAt || item.expiresAt >= now),
      )
      .map((item) => item.evidenceId),
  );
  const rules =
    templateRules.readiness[purpose] ?? genericTemplateRules.readiness[purpose]!;
  const blockedIncident = context.incidents.some(
    (incident) =>
      incident.status !== "RESOLVED" &&
      (rules.blockedIncidentSeverities ?? ["CRITICAL"]).includes(incident.severity),
  );
  if (purpose === "REAL_ASSET_TRANSFER") {
    return finish(purpose, [
      { key: "identity", label: "Định danh tài sản đạt ngưỡng template", met: context.trust.identityScore >= rules.minIdentityScore },
      { key: "location", label: "Bằng chứng vị trí đã được xác minh", met: !rules.requireVerifiedLocation || context.evidence.some((item) => item.type === "GEO_LOCATION" && item.verificationStatus === "APPROVED" && activeApprovedEvidence.has(item.id)) },
      { key: "rights", label: "Hồ sơ quyền theo tài liệu còn hiệu lực và đã xác minh", met: !rules.requireVerifiedRights || context.rightsRecords.some((item) => item.verifiedStatus === "APPROVED" && Boolean(item.basisDocumentEvidenceId) && activeApprovedEvidence.has(item.basisDocumentEvidenceId!) && (!item.validUntil || item.validUntil >= now)) },
      { key: "custody", label: "Có kế hoạch lưu ký đang hiệu lực", met: !rules.requireActiveCustody || context.custodyRecords.some((item) => item.status === "ACTIVE" && !item.endAt) },
      { key: "incidents", label: "Không có sự cố bị template chặn", met: !blockedIncident },
    ]);
  }
  const riskRank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  const maximumRisk = rules.maximumRisk ?? "MEDIUM";
  const acceptableRisk = !context.riskProfile || riskRank[context.riskProfile.overallRisk as keyof typeof riskRank] <= riskRank[maximumRisk];
  return finish(purpose, [
    { key: "identity", label: "Định danh tài sản đạt ngưỡng template", met: context.trust.identityScore >= rules.minIdentityScore },
    { key: "trust", label: "Điểm tin cậy hồ sơ đạt ngưỡng template", met: context.trust.totalScore >= (rules.minTrustScore ?? 70) },
    { key: "verification", label: "Coverage xác minh quan trọng đạt ngưỡng template", met: context.trust.verificationScore >= (rules.minVerificationScore ?? 21) },
    { key: "certificate", label: "Chứng nhận còn hiệu lực và đã xác minh", met: !rules.requireVerifiedCertificate || context.evidence.some((item) => item.type === "CERTIFICATE" && item.verificationStatus === "APPROVED" && activeApprovedEvidence.has(item.id) && (!item.validUntil || item.validUntil >= now)) },
    { key: "freshness", label: "Bằng chứng trọng yếu còn đủ mới", met: context.trust.freshnessScore >= (rules.minFreshnessScore ?? 9) },
    { key: "risk", label: "Hồ sơ rủi ro không ở mức HIGH hoặc CRITICAL", met: acceptableRisk },
  ]);
}

// Backwards-compatible helper retained for callers that only have trust + evidence.
export function calculateReadiness(profile: TrustResult, evidence: Evidence[]) {
  const validCertificate = evidence.some((item) => item.type === "CERTIFICATE" && item.verificationStatus === "APPROVED" && (!item.validUntil || item.validUntil >= new Date()));
  return profile.identityScore >= 18 && profile.totalScore >= 70 && profile.verificationScore >= 21 && profile.freshnessScore >= 9 && validCertificate
    ? "READY_FOR_REVIEW"
    : profile.identityScore >= 14 && profile.evidenceScore >= 8
      ? "NEEDS_SUPPLEMENT"
      : "NOT_READY";
}

export async function recalculateReadinessProfiles(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      evidence: true,
      trustProfile: true,
      riskProfile: true,
      rightsRecords: true,
      custodyRecords: true,
      incidents: true,
      attestations: true,
      template: true,
    },
  });
  if (!asset || !asset.trustProfile) throw new Error("Chưa có hồ sơ tin cậy để tính readiness");
  const context: ReadinessContext = {
    asset,
    trust: asset.trustProfile,
    evidence: asset.evidence,
    riskProfile: asset.riskProfile,
    rightsRecords: asset.rightsRecords,
    custodyRecords: asset.custodyRecords,
    incidents: asset.incidents,
    attestations: asset.attestations,
  };
  const templateRules = rulesForTemplate(asset.template);
  const results = (["REAL_ASSET_TRANSFER", "FINANCIAL_REVIEW"] as const).map((purpose) => calculatePurposeReadiness(purpose, context, templateRules));
  await prisma.$transaction([
    ...results.map((result) => prisma.readinessProfile.upsert({
      where: { assetId_purpose: { assetId, purpose: result.purpose } },
      create: { assetId, purpose: result.purpose, status: result.status, requirementsJson: JSON.stringify(result.requirements), missingItemsJson: JSON.stringify(result.missingItems) },
      update: { status: result.status, requirementsJson: JSON.stringify(result.requirements), missingItemsJson: JSON.stringify(result.missingItems), calculatedAt: new Date() },
    })),
    prisma.asset.update({ where: { id: assetId }, data: { passportStatus: results.find((item) => item.purpose === "FINANCIAL_REVIEW")!.status } }),
  ]);
  return results;
}
