import type { Asset, AssetIncident, CustodyRecord, Evidence } from "@prisma/client";
import { prisma } from "../db/prisma.js";

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
): RiskResult {
  const openIncidents = incidents.filter((incident) => !["RESOLVED"].includes(incident.status));
  const incidentLevels = openIncidents.map((incident) => incident.severity as RiskLevel);
  const biologicalRisk = incidentLevels.length ? maxRisk(...incidentLevels) : "LOW";
  const diseaseLevels = openIncidents.filter((incident) => ["DISEASE", "PEST", "QUALITY_DEGRADATION"].includes(incident.type)).map((incident) => incident.severity as RiskLevel);
  const diseaseRisk = diseaseLevels.length ? maxRisk(...diseaseLevels) : "LOW";
  const locationRisk: RiskLevel = trustWarnings.some((warning) => warning.code === "GPS_OUTSIDE_DECLARED_AREA") ? "HIGH" : evidence.some((item) => item.type === "GEO_LOCATION" && item.verificationStatus === "APPROVED") ? "LOW" : "MEDIUM";
  const latestEvidenceAt = evidence.reduce((latest, item) => Math.max(latest, item.observedAt.getTime()), 0);
  const freshnessRisk: RiskLevel = latestEvidenceAt === 0 || now.getTime() - latestEvidenceAt > 365 * 86_400_000 ? "HIGH" : now.getTime() - latestEvidenceAt > 120 * 86_400_000 ? "MEDIUM" : "LOW";
  const certificates = evidence.filter((item) => item.type === "CERTIFICATE");
  const certificateRisk: RiskLevel = !certificates.length ? "HIGH" : certificates.some((item) => item.validUntil && item.validUntil < now) ? "HIGH" : certificates.some((item) => item.verificationStatus !== "APPROVED") ? "MEDIUM" : "LOW";
  const hasActiveCustody = custodyRecords.some((record) => record.status === "ACTIVE" && !record.endAt);
  const custodyRisk: RiskLevel = asset.transactionStage === "SOLD" && !hasActiveCustody ? "HIGH" : hasActiveCustody ? "LOW" : "MEDIUM";
  const latestCareLog = evidence.filter((item) => ["PHOTO_CARE", "FARM_LOG", "CARE_NOTE", "IOT_READING", "ENVIRONMENT_READING"].includes(item.type)).reduce((latest, item) => Math.max(latest, item.observedAt.getTime()), 0);
  const operationalRisk: RiskLevel = latestCareLog === 0 ? "MEDIUM" : now.getTime() - latestCareLog > 90 * 86_400_000 ? "HIGH" : "LOW";
  const weatherRisk: RiskLevel = openIncidents.some((incident) => ["DROUGHT", "FLOOD"].includes(incident.type)) ? biologicalRisk : "LOW";
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
    include: { evidence: true, incidents: true, custodyRecords: true, trustProfile: true },
  });
  if (!asset) throw new Error("Không tìm thấy tài sản");
  const warnings = asset.trustProfile ? JSON.parse(asset.trustProfile.warningsJson) as Array<{ code: string; severity: string }> : [];
  const result = calculateRisk(asset, asset.evidence, asset.incidents, asset.custodyRecords, warnings);
  const { reasons, ...fields } = result;
  const saved = await prisma.riskProfile.upsert({
    where: { assetId },
    create: { assetId, ...fields, reasonsJson: JSON.stringify(reasons) },
    update: { ...fields, reasonsJson: JSON.stringify(reasons), calculatedAt: new Date() },
  });
  return { ...saved, reasons };
}
