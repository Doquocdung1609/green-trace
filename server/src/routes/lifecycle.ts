import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateTransition } from "../services/lifecycleEngine.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import { lifecycleSchema } from "../validators/schemas.js";

export const lifecycleRouter = Router();
lifecycleRouter.get("/assets/:id/lifecycle", requireAuth, async (req, res) =>
  res.json({
    events: await prisma.lifecycleEvent.findMany({
      where: { assetId: String(req.params.id) },
      orderBy: { occurredAt: "asc" },
    }),
  }),
);
lifecycleRouter.post(
  "/assets/:id/lifecycle",
  requireAuth,
  requireRole("operator", "admin"),
  validate(lifecycleSchema),
  async (req, res) => {
    const asset = await prisma.asset.findUnique({
      where: { id: String(req.params.id) },
      include: { evidence: true, attestations: true },
    });
    if (!asset)
      return res.status(404).json({ error: "Không tìm thấy tài sản" });
    if (
      req.user!.role === "operator" &&
      asset.organizationId !== req.user!.organizationId
    )
      return res
        .status(403)
        .json({ error: "Không có quyền cập nhật vòng đời" });
    const approvedScopes = asset.attestations
      .filter(
        (a) =>
          a.decision === "APPROVED" &&
          !a.revokedAt &&
          (!a.expiresAt || a.expiresAt > new Date()),
      )
      .map((a) => a.scope);
    const check = validateTransition(asset.currentStage, req.body.stageTo, {
      approvedScopes,
      evidenceTypes: asset.evidence.map((e) => e.type),
    });
    if (!check.ok) {
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "LIFECYCLE_ANOMALY_BLOCKED",
          entityType: "Asset",
          entityId: asset.id,
          metadata: check.reason,
        },
      });
      return res.status(409).json({ error: check.reason });
    }
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.lifecycleEvent.create({
        data: {
          assetId: asset.id,
          stageFrom: asset.currentStage,
          stageTo: req.body.stageTo,
          eventType: req.body.eventType,
          evidenceIds: JSON.stringify(req.body.evidenceIds),
          approvedBy: req.user!.id,
        },
      });
      await tx.asset.update({
        where: { id: asset.id },
        data: { currentStage: req.body.stageTo },
      });
      return created;
    });
    await recalculateTrust(asset.id);
    res
      .status(201)
      .json({
        event: { ...event, evidenceIds: JSON.parse(event.evidenceIds) },
      });
  },
);
