import { Router } from "express";
import { canonicalHash } from "../lib/hash.js";
import { serializeAsset } from "../lib/serializers.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createAssetSchema, updateAssetSchema } from "../validators/schemas.js";
import { recalculateTrust } from "../services/trustProfileService.js";

export const assetsRouter = Router();
const include = {
  organization: true,
  custodian: true,
  evidence: {
    include: {
      attestations: {
        include: { verifier: { include: { organization: true } } },
      },
    },
  },
  verificationRequests: { include: { requester: true } },
  attestations: { include: { verifier: { include: { organization: true } } } },
  lifecycleEvents: true,
  trustProfile: true,
  passports: true,
  blockchainTransactions: true,
} as const;

assetsRouter.get("/assets", requireAuth, async (req, res) => {
  const where =
    req.user!.role === "operator"
      ? { organizationId: req.user!.organizationId ?? "__none__" }
      : {};
  const assets = await prisma.asset.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
  });
  const mode =
    req.user!.role === "operator" || req.user!.role === "admin"
      ? "owner"
      : "partner";
  res.json({ assets: assets.map((asset) => serializeAsset(asset, mode)) });
});

assetsRouter.post(
  "/assets",
  requireAuth,
  requireRole("operator", "admin"),
  validate(createAssetSchema),
  async (req, res) => {
    const organizationId = req.body.organizationId || req.user!.organizationId;
    if (!organizationId)
      return res
        .status(400)
        .json({ error: "Người quản lý phải thuộc một tổ chức" });
    const sequence = await prisma.asset.count({
      where: {
        createdAt: { gte: new Date(`${new Date().getFullYear()}-01-01`) },
      },
    });
    const assetCode = `GT-NL-${new Date().getFullYear()}-${String(sequence + 128).padStart(6, "0")}`;
    const metadata = { ...req.body, assetCode, currentStage: "REGISTERED" };
    const asset = await prisma.asset.create({
      data: {
        ...req.body,
        organizationId,
        custodianId: req.user!.id,
        assetCode,
        metadataHash: canonicalHash(metadata),
      },
    });
    await prisma.lifecycleEvent.create({
      data: {
        assetId: asset.id,
        stageFrom: "REGISTERED",
        stageTo: "REGISTERED",
        eventType: "ASSET_REGISTERED",
        evidenceIds: "[]",
        approvedBy: req.user!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "ASSET_CREATED",
        entityType: "Asset",
        entityId: asset.id,
      },
    });
    await recalculateTrust(asset.id);
    res.status(201).json({ asset });
  },
);

assetsRouter.get("/assets/:id", requireAuth, async (req, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: String(req.params.id) },
    include,
  });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  if (
    req.user!.role === "operator" &&
    asset.organizationId !== req.user!.organizationId
  )
    return res.status(403).json({ error: "Không có quyền xem tài sản này" });
  res.json({
    asset: serializeAsset(
      asset,
      req.user!.role === "reviewer" || req.user!.role === "verifier"
        ? "partner"
        : "owner",
    ),
  });
});

assetsRouter.patch(
  "/assets/:id",
  requireAuth,
  requireRole("operator", "admin"),
  validate(updateAssetSchema),
  async (req, res) => {
    const current = await prisma.asset.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!current)
      return res.status(404).json({ error: "Không tìm thấy tài sản" });
    if (
      req.user!.role === "operator" &&
      current.organizationId !== req.user!.organizationId
    )
      return res.status(403).json({ error: "Không có quyền sửa tài sản" });
    const asset = await prisma.asset.update({
      where: { id: current.id },
      data: {
        ...req.body,
        metadataHash: canonicalHash({ ...current, ...req.body }),
      },
    });
    await recalculateTrust(asset.id);
    res.json({ asset });
  },
);

assetsRouter.get("/assets/:id/trust-profile", requireAuth, async (req, res) => {
  const profile = await prisma.trustProfile.findUnique({
    where: { assetId: String(req.params.id) },
  });
  if (!profile) return res.status(404).json({ error: "Chưa có điểm tin cậy" });
  res.json({ ...profile, warnings: JSON.parse(profile.warningsJson) });
});
assetsRouter.post(
  "/assets/:id/recalculate-trust",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res) => res.json(await recalculateTrust(String(req.params.id))),
);
assetsRouter.get("/assets/:id/blockchain", requireAuth, async (req, res) =>
  res.json({
    transactions: await prisma.blockchainTransaction.findMany({
      where: { assetId: String(req.params.id) },
      orderBy: { createdAt: "desc" },
    }),
  }),
);

export { include as assetInclude };
