import type { Asset, AssetIncident, CustodyRecord, Evidence } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { genericTemplateRules, rulesForTemplate, type AssetTemplateRules } from "./assetTemplateRules.js";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const rank: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
const maxRisk = (...levels: RiskLevel[]) => levels.reduce((highest, level) => rank[level] > rank[highest] ? level : highest, "LOW" as RiskLevel);

export interface RiskResult {
  overallRisk: RiskLevel;
  biologicalRisk: RiskLevel;
  diseaseRisk: RiskLevel;
  locationRisk: RiskLevel;
  freshnessRisk: RiskLevel;
  certificateRisk: RiskLevel;
  custodyRisk: RiskLevel;
  weatherRisk: RiskLevel;
  operationalRisk: RiskLevel;
  openIncidentCount: number;
  reasons: string[];
}

export function calculateRisk(
  asset: Asset,
  evidence: Evidence[],
  incidents: AssetIncident[],
  custodyRecords: CustodyRecord[],
  trustWarnings: Array<{ code: string; severity: string }> = [],
  now = new Date(),
  rules: AssetTemplateRules = genericTemplateRules,
): RiskResult {
  const openIncidents = incidents.filter((incident) => !["RESOLVED"].includes(incident.status));
  const incidentLevels = openIncidents.map((incident) => incident.severity as RiskLevel);
  const biologicalRisk = incidentLevels.length ? maxRisk(...incidentLevels) : "LOW";
  const diseaseLevels = openIncidents.filter((incident) => ["DISEASE", "PEST", "QUALITY_DEGRADATION"].includes(incident.type)).map((incident) => incident.severity as RiskLevel);
  const diseaseRisk = diseaseLevels.length ? maxRisk(...diseaseLevels) : "LOW";
  const locationRisk: RiskLevel = trustWarnings.some((warning) => warning.code === "GPS_OUTSIDE_DECLARED_AREA") ? "HIGH" : evidence.some((item) => item.type === "GEO_LOCATION" && item.verificationStatus === "APPROVED") ? "LOW" : "MEDIUM";
  const criticalAges = rules.importantEvidence.map((type) => {
    const latest = evidence
      .filter(
        (item) =>
          item.type === type &&
          ["APPROVED", "NOT_REQUIRED"].includes(item.verificationStatus),
      )
      .reduce((value, item) => Math.max(value, item.observedAt.getTime()), 0);
    return latest ? now.getTime() - latest : Number.POSITIVE_INFINITY;
  });
  const freshnessRisk: RiskLevel = criticalAges.some(
    (age) => age > rules.risk.criticalFreshnessDays * 86_400_000,
  )
    ? "HIGH"
    : criticalAges.some(
          (age) => age > (rules.risk.criticalFreshnessDays / 3) * 86_400_000,
        )
      ? "MEDIUM"
      : "LOW";
  const certificates = evidence.filter((item) => item.type === "CERTIFICATE");
  const certificateRisk: RiskLevel = !rules.risk.certificateRequired
    ? "LOW"
    : !certificates.length
      ? "HIGH"
      : certificates.some((item) => item.validUntil && item.validUntil < now)
        ? "HIGH"
        : certificates.some((item) => item.verificationStatus !== "APPROVED")
          ? "MEDIUM"
          : "LOW";
  const hasActiveCustody = custodyRecords.some((record) => record.status === "ACTIVE" && !record.endAt);
  const custodyRisk: RiskLevel =
    rules.risk.custodyRequiredAfterSale && asset.transactionStage === "SOLD" && !hasActiveCustody
      ? "HIGH"
      : hasActiveCustody
        ? "LOW"
        : "MEDIUM";
  const latestCareLog = evidence.filter((item) => ["PHOTO_CARE", "FARM_LOG", "CARE_NOTE", "IOT_READING", "ENVIRONMENT_READING"].includes(item.type)).reduce((latest, item) => Math.max(latest, item.observedAt.getTime()), 0);
  const operationalRisk: RiskLevel = latestCareLog === 0 ? "MEDIUM" : now.getTime() - latestCareLog > rules.risk.operationalFreshnessDays * 86_400_000 ? "HIGH" : "LOW";
  const weatherLevels = openIncidents
    .filter((incident) => ["DROUGHT", "FLOOD"].includes(incident.type))
    .map((incident) => incident.severity as RiskLevel);
  const weatherRisk: RiskLevel = weatherLevels.length ? maxRisk(...weatherLevels) : "LOW";
  const levels = [biologicalRisk, diseaseRisk, locationRisk, freshnessRisk, certificateRisk, custodyRisk, weatherRisk, operationalRisk];
  const reasons: string[] = [];
  if (openIncidents.length) reasons.push(`${openIncidents.length} sự cố sinh học đang mở.`);
  if (locationRisk !== "LOW") reasons.push("Vị trí chưa có xác minh hợp lệ hoặc có cảnh báo sai lệch.");
  if (certificateRisk !== "LOW") reasons.push("Chứng nhận còn thiếu, hết hạn hoặc chưa được xác minh.");
  if (custodyRisk !== "LOW") reasons.push("Kế hoạch lưu ký vật lý chưa đầy đủ.");
  if (operationalRisk !== "LOW") reasons.push("Nhật ký chăm sóc chưa đủ mới.");
  return {
    overallRisk: maxRisk(...levels),
    biologicalRisk,
    diseaseRisk,
    locationRisk,
    freshnessRisk,
    certificateRisk,
    custodyRisk,
    weatherRisk,
    operationalRisk,
    openIncidentCount: openIncidents.length,
    reasons,
  };
}

export async function recalculateRisk(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { evidence: true, incidents: true, custodyRecords: true, trustProfile: true, template: true, attestations: true },
  });
  if (!asset) throw new Error("Không tìm thấy tài sản");
  const warnings = asset.trustProfile ? JSON.parse(asset.trustProfile.warningsJson) as Array<{ code: string; severity: string }> : [];
  const calculationTime = new Date();
  const activeEvidenceIds = new Set(
    asset.attestations
      .filter(
        (item) =>
          item.decision === "APPROVED" &&
          item.chainStatus === "CONFIRMED" &&
          !item.revokedAt &&
          (!item.expiresAt || item.expiresAt >= calculationTime),
      )
      .map((item) => item.evidenceId),
  );
  const effectiveEvidence = asset.evidence.map((item) => ({
    ...item,
    verificationStatus:
      item.verificationStatus === "APPROVED" && !activeEvidenceIds.has(item.id)
        ? "PENDING"
        : item.verificationStatus,
  }));
  const result = calculateRisk(asset, effectiveEvidence, asset.incidents, asset.custodyRecords, warnings, calculationTime, rulesForTemplate(asset.template));
  const { reasons, ...fields } = result;
  const saved = await prisma.riskProfile.upsert({
    where: { assetId },
    create: { assetId, ...fields, reasonsJson: JSON.stringify(reasons) },
    update: { ...fields, reasonsJson: JSON.stringify(reasons), calculatedAt: new Date() },
  });
  return { ...saved, reasons };
}
