import { Router } from "express";
import { z } from "zod";
import { env } from "../config.js";
import { canonicalHash } from "../lib/hash.js";
import { serializeAsset } from "../lib/serializers.js";
import { prisma } from "../db/prisma.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { verifySolanaTransaction } from "../services/solanaService.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import { assetInclude } from "./assets.js";

export const passportRouter = Router();
const chainSchema = z.object({
  passportHash: z.string().length(64),
  txSignature: z.string().min(32).max(128),
  signer: z.string().min(32).max(64),
});

async function passportSnapshot(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      evidence: true,
      attestations: true,
      lifecycleEvents: true,
      trustProfile: true,
      passports: true,
    },
  });
  if (!asset) throw new Error("Không tìm thấy tài sản");
  const profile = await recalculateTrust(asset.id);
  return {
    version:
      asset.passports.reduce((max, p) => Math.max(max, p.version), 0) + 1,
    asset: {
      assetCode: asset.assetCode,
      displayName: asset.displayName,
      assetType: asset.assetType,
      species: asset.species,
      organizationId: asset.organizationId,
      region: asset.region,
      plantedAt: asset.plantedAt,
      currentStage: asset.currentStage,
    },
    evidence: asset.evidence.map((e) => ({
      id: e.id,
      type: e.type,
      contentHash: e.contentHash,
      verificationStatus: e.verificationStatus,
      observedAt: e.observedAt,
      validUntil: e.validUntil,
    })),
    attestations: asset.attestations
      .filter((a) => a.decision === "APPROVED" && !a.revokedAt)
      .map((a) => ({
        evidenceId: a.evidenceId,
        verifierWallet: a.verifierWallet,
        scope: a.scope,
        payloadHash: a.payloadHash,
        txSignature: a.txSignature,
      })),
    lifecycle: asset.lifecycleEvents.map((e) => ({
      stageFrom: e.stageFrom,
      stageTo: e.stageTo,
      occurredAt: e.occurredAt,
    })),
    trust: { totalScore: profile.totalScore, warnings: profile.warnings },
    readinessStatus: profile.readiness,
  };
}

passportRouter.get(
  "/public/passports/:assetCode",
  optionalAuth,
  async (req, res) => {
    const asset = await prisma.asset.findUnique({
      where: { assetCode: String(req.params.assetCode) },
      include: assetInclude,
    });
    if (!asset)
      return res.status(404).json({ error: "Không tìm thấy hộ chiếu" });
    res.json({ asset: serializeAsset(asset, "public") });
  },
);
passportRouter.get("/assets/:id/passport", requireAuth, async (req, res) => {
  const passport = await prisma.digitalPassport.findFirst({
    where: { assetId: String(req.params.id) },
    orderBy: { version: "desc" },
  });
  if (!passport)
    return res.status(404).json({ error: "Chưa có phiên bản hộ chiếu" });
  res.json({ passport });
});
passportRouter.post(
  "/assets/:id/passport/payload",
  requireAuth,
  requireRole("operator", "admin"),
  async (req, res) => {
    const snapshot = await passportSnapshot(String(req.params.id));
    res.json({ snapshot, passportHash: canonicalHash(snapshot) });
  },
);
passportRouter.post(
  "/assets/:id/passport/generate",
  requireAuth,
  requireRole("operator", "admin"),
  validate(chainSchema),
  async (req, res) => {
    const snapshot = await passportSnapshot(String(req.params.id));
    if (canonicalHash(snapshot) !== req.body.passportHash)
      return res
        .status(400)
        .json({
          error: "Nội dung hộ chiếu đã thay đổi, hãy ký lại phiên bản mới",
        });
    if (!(await verifySolanaTransaction(
      req.body.txSignature,
      req.body.signer,
      "PASSPORT_ROOT",
      req.body.passportHash,
    )))
      return res
        .status(422)
        .json({
          error: "Giao dịch Solana chưa được xác nhận",
          chainStatus: "FAILED_CHAIN",
        });
    const passport = await prisma.$transaction(async (tx) => {
      const created = await tx.digitalPassport.create({
        data: {
          assetId: String(req.params.id),
          version: snapshot.version,
          passportHash: req.body.passportHash,
          readinessStatus: snapshot.readinessStatus,
        },
      });
      await tx.blockchainTransaction.create({
        data: {
          assetId: String(req.params.id),
          type: "PASSPORT_ROOT",
          signature: req.body.txSignature,
          cluster: env.SOLANA_CLUSTER,
          signer: req.body.signer,
          status: "CONFIRMED",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "PASSPORT_GENERATED",
          entityType: "DigitalPassport",
          entityId: created.id,
        },
      });
      return created;
    });
    res.status(201).json({ passport });
  },
);
