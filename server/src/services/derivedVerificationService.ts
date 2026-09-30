import { prisma } from "../db/prisma.js";

export async function hasActiveApproval(evidenceId: string, now = new Date()) {
  return Boolean(
    await prisma.attestation.findFirst({
      where: {
        evidenceId,
        decision: "APPROVED",
        chainStatus: "CONFIRMED",
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: { id: true },
    }),
  );
}

export async function syncDerivedVerification(evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
  });
  if (!evidence) return;

  const activeApproval = await hasActiveApproval(evidence.id);
  const derivedStatus =
    evidence.verificationStatus === "REJECTED"
      ? "REJECTED"
      : activeApproval
        ? "APPROVED"
        : "PENDING";

  await prisma.rightsRecord.updateMany({
    where: { basisDocumentEvidenceId: evidence.id },
    data: { verifiedStatus: derivedStatus },
  });

  if (evidence.type !== "INCIDENT_RESOLUTION") return;
  let incidentId: string | undefined;
  try {
    incidentId = String(JSON.parse(evidence.metadataJson || "{}").incidentId || "") || undefined;
  } catch {
    return;
  }
  if (!incidentId) return;
  const incident = await prisma.assetIncident.findFirst({
    where: {
      id: incidentId,
      assetId: evidence.assetId,
      resolutionEvidenceId: evidence.id,
    },
  });
  if (!incident) return;
  if (activeApproval) {
    await prisma.assetIncident.update({
      where: { id: incident.id },
      data: {
        status: "RESOLVED",
        verificationStatus: "APPROVED",
        resolvedAt: new Date(),
      },
    });
  } else {
    await prisma.assetIncident.update({
      where: { id: incident.id },
      data: {
        status: "RESOLUTION_PENDING_VERIFICATION",
        verificationStatus: derivedStatus,
        resolvedAt: null,
      },
    });
  }
}
