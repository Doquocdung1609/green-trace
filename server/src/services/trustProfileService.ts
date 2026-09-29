import { prisma } from "../db/prisma.js";
import { recalculateReadinessProfiles } from "./readinessEngine.js";
import { recalculateRisk } from "./riskProfileService.js";
import { calculateTrust } from "./trustEngine.js";

export async function recalculateTrust(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { evidence: true, attestations: true, lifecycleEvents: true },
  });
  if (!asset) throw new Error("Không tìm thấy tài sản");
  const profile = calculateTrust(
    asset,
    asset.evidence,
    asset.attestations,
    asset.lifecycleEvents,
  );
  const { warnings, ...scores } = profile;
  const saved = await prisma.trustProfile.upsert({
    where: { assetId },
    create: {
      assetId,
      ...scores,
      warningsJson: JSON.stringify(warnings),
    },
    update: {
      ...scores,
      warningsJson: JSON.stringify(warnings),
      calculatedAt: new Date(),
    },
  });
  const risk = await recalculateRisk(assetId);
  const readinessProfiles = await recalculateReadinessProfiles(assetId);
  return { ...saved, warnings, risk, readinessProfiles };
}
