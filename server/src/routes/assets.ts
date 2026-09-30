import { Router } from "express";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { canonicalHash } from "../lib/hash.js";
import { serializeAsset } from "../lib/serializers.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createAssetSchema, updateAssetSchema } from "../validators/schemas.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import {
  assertAssetAccess,
  AssetAccessError,
  getAccessibleAssetIds,
} from "../services/assetAccessService.js";

export const assetsRouter = Router();
const include = {
  organization: true,
  custodian: { select: { id: true, fullName: true, email: true, role: true, organizationId: true } },
  evidence: {
    include: {
      attestations: {
        include: { verifier: { select: { id: true, fullName: true, organization: true } } },
      },
    },
  },
  verificationRequests: { include: { requester: { select: { id: true, fullName: true, email: true, organization: true } } } },
  attestations: { include: { verifier: { select: { id: true, fullName: true, organization: true } } } },
  lifecycleEvents: true,
  trustProfile: true,
  riskProfile: true,
  readinessProfiles: true,
  measurements: true,
  incidents: true,
  rightsRecords: true,
  custodyRecords: true,
  careAgreements: true,
  offers: true,
  transactions: { include: { buyer: { select: { id: true, fullName: true, email: true } }, offer: true } },
  reviewCases: true,
  fulfillmentRequests: true,
  valuations: true,
  passports: true,
  blockchainTransactions: true,
} as const;

assetsRouter.get("/assets", requireAuth, async (req, res) => {
  const accessibleIds = await getAccessibleAssetIds(req.user!);
  const where = accessibleIds === null ? {} : { id: { in: accessibleIds } };
  const assets = await prisma.asset.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
  });
  res.json({
    assets: assets.map((asset) => {
      const mode =
        req.user!.role === "operator" || req.user!.role === "admin"
          ? "owner"
          : req.user!.role === "reviewer"
            ? "partner"
            : req.user!.role === "buyer" &&
                asset.transactions.some((transaction) => transaction.buyerId === req.user!.id)
              ? "partner"
              : "public";
      return serializeAsset(asset, mode, req.user!.role === "buyer" ? req.user!.id : undefined);
    }),
  });
});

assetsRouter.post(
  "/assets",
  requireAuth,
  requireRole("operator", "admin"),
  validate(createAssetSchema),
  async (req, res) => {
    const organizationId =
      req.user!.role === "admin"
        ? req.body.organizationId || req.user!.organizationId
        : req.user!.organizationId;
    if (!organizationId)
      return res
        .status(400)
        .json({ error: "Người quản lý phải thuộc một tổ chức" });
    const template = req.body.templateId
      ? await prisma.assetTemplate.findUnique({
          where: { id: req.body.templateId },
          select: { prefix: true },
        })
      : null;
    const prefix = (template?.prefix || "GN")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 6);
    let asset;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const assetCode = `GT-${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
      const metadata = { ...req.body, assetCode, currentStage: "REGISTERED" };
      try {
        asset = await prisma.asset.create({
          data: {
            ...req.body,
            organizationId,
            custodianId: req.user!.id,
            assetCode,
            metadataHash: canonicalHash(metadata),
          },
        });
        break;
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
      }
    }
    if (!asset)
      return res.status(503).json({ error: "Không thể cấp mã tài sản duy nhất" });
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
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (error instanceof AssetAccessError)
      return res.status(error.status).json({ error: error.message });
    throw error;
  }
  const asset = await prisma.asset.findUnique({
    where: { id: String(req.params.id) },
    include,
  });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  const mode =
    req.user!.role === "admin" || req.user!.role === "operator"
      ? "owner"
      : req.user!.role === "reviewer"
        ? "partner"
        : req.user!.role === "buyer" &&
            asset.transactions.some((transaction) => transaction.buyerId === req.user!.id)
          ? "partner"
          : "public";
  res.json({
    asset: serializeAsset(
      asset,
      mode,
      req.user!.role === "buyer" ? req.user!.id : undefined,
    ),
  });
});

assetsRouter.patch(
  "/assets/:id",
  requireAuth,
  requireRole("operator", "admin"),
  validate(updateAssetSchema),
  async (req, res) => {
    let current;
    try {
      current = await assertAssetAccess(
        req.user!,
        String(req.params.id),
        "manage",
      );
    } catch (error) {
      if (error instanceof AssetAccessError)
        return res.status(error.status).json({ error: error.message });
      throw error;
    }
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
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (error instanceof AssetAccessError)
      return res.status(error.status).json({ error: error.message });
    throw error;
  }
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
  async (req, res) => {
    try {
      await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (error instanceof AssetAccessError)
        return res.status(error.status).json({ error: error.message });
      throw error;
    }
    res.json(await recalculateTrust(String(req.params.id)));
  },
);
assetsRouter.get("/assets/:id/blockchain", requireAuth, async (req, res) => {
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (error instanceof AssetAccessError)
      return res.status(error.status).json({ error: error.message });
    throw error;
  }
  res.json({
    transactions: await prisma.blockchainTransaction.findMany({
      where: { assetId: String(req.params.id) },
      orderBy: { createdAt: "desc" },
    }),
  });
});

export { include as assetInclude };
