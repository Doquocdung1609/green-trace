import { Router } from "express";
import { env } from "../config.js";
import { canonicalHash } from "../lib/hash.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { verifySolanaTransaction } from "../services/solanaService.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import {
  decisionSchema,
  payloadSchema,
  rejectSchema,
  revokeDecisionSchema,
  revokePayloadSchema,
} from "../validators/schemas.js";

export const verificationRouter = Router();
const requestInclude = {
  asset: true,
  evidence: { include: { attestations: true } },
  requester: { include: { organization: true } },
  requestedVerifier: true,
} as const;

verificationRouter.get(
  "/verification-requests",
  requireAuth,
  requireRole("verifier", "admin"),
  async (req, res) => {
    const where =
      req.user!.role === "verifier"
        ? {
            OR: [
              { requestedVerifierId: null },
              { requestedVerifierId: req.user!.id },
            ],
          }
        : {};
    res.json({
      requests: await prisma.verificationRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: "desc" },
      }),
    });
  },
);
verificationRouter.get(
  "/verification-requests/:id",
  requireAuth,
  requireRole("verifier", "admin"),
  async (req, res) => {
    const request = await prisma.verificationRequest.findUnique({
      where: { id: String(req.params.id) },
      include: requestInclude,
    });
    if (!request)
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    if (
      request.requestedVerifierId &&
      request.requestedVerifierId !== req.user!.id &&
      req.user!.role !== "admin"
    )
      return res
        .status(403)
        .json({ error: "Yêu cầu được chỉ định cho người xác minh khác" });
    res.json({ request });
  },
);
verificationRouter.post(
  "/verification-requests/:id/payload",
  requireAuth,
  requireRole("verifier", "admin"),
  validate(payloadSchema),
  async (req, res) => {
    const request = await prisma.verificationRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { evidence: true },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    if (request.evidence.submittedBy === req.user!.id)
      return res
        .status(409)
        .json({ error: "Không được tự xác minh bằng chứng do chính mình gửi" });
    const payload = {
      version: 1,
      requestId: request.id,
      assetId: request.assetId,
      evidenceId: request.evidenceId,
      evidenceHash: request.evidence.contentHash,
      verifierId: req.user!.id,
      verifierWallet: req.body.verifierWallet,
      scope: req.body.scope,
      decision: "APPROVED",
      note: req.body.note,
    };
    res.json({ payload, payloadHash: canonicalHash(payload) });
  },
);
verificationRouter.get(
  "/attestations/mine",
  requireAuth,
  requireRole("verifier"),
  async (req, res) => {
    const attestations = await prisma.attestation.findMany({
      where: { verifierId: req.user!.id },
      include: {
        asset: { select: { assetCode: true, displayName: true } },
        evidence: { select: { title: true, contentHash: true } },
      },
      orderBy: { verifiedAt: "desc" },
    });
    res.json({ attestations });
  },
);
verificationRouter.post(
  "/attestations/:id/revoke/payload",
  requireAuth,
  requireRole("verifier"),
  validate(revokePayloadSchema),
  async (req, res) => {
    const attestation = await prisma.attestation.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!attestation || attestation.verifierId !== req.user!.id)
      return res.status(404).json({ error: "Không tìm thấy attestation của bạn" });
    if (attestation.revokedAt)
      return res.status(409).json({ error: "Attestation đã được thu hồi" });
    if (attestation.verifierWallet !== req.body.verifierWallet)
      return res.status(409).json({ error: "Ví kết nối không khớp ví đã ký" });
    const payload = {
      version: 1,
      action: "REVOKE_ATTESTATION",
      attestationId: attestation.id,
      assetId: attestation.assetId,
      verifierId: req.user!.id,
      verifierWallet: req.body.verifierWallet,
    };
    res.json({ payload, payloadHash: canonicalHash(payload) });
  },
);
verificationRouter.post(
  "/attestations/:id/revoke",
  requireAuth,
  requireRole("verifier"),
  validate(revokeDecisionSchema),
  async (req, res) => {
    const attestation = await prisma.attestation.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!attestation || attestation.verifierId !== req.user!.id)
      return res.status(404).json({ error: "Không tìm thấy attestation của bạn" });
    if (attestation.revokedAt)
      return res.status(409).json({ error: "Attestation đã được thu hồi" });
    const payload = {
      version: 1,
      action: "REVOKE_ATTESTATION",
      attestationId: attestation.id,
      assetId: attestation.assetId,
      verifierId: req.user!.id,
      verifierWallet: req.body.verifierWallet,
    };
    if (canonicalHash(payload) !== req.body.payloadHash)
      return res.status(400).json({ error: "Payload thu hồi đã thay đổi sau khi ký" });
    if (
      !(await verifySolanaTransaction(
        req.body.txSignature,
        req.body.verifierWallet,
        "ATTESTATION_REVOCATION",
        req.body.payloadHash,
      ))
    )
      return res.status(422).json({ error: "Giao dịch thu hồi chưa được xác nhận", chainStatus: "FAILED_CHAIN" });
    const revokedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.attestation.update({
        where: { id: attestation.id },
        data: { revokedAt },
      });
      const active = await tx.attestation.count({
        where: {
          evidenceId: attestation.evidenceId,
          decision: "APPROVED",
          revokedAt: null,
          id: { not: attestation.id },
        },
      });
      if (!active)
        await tx.evidence.update({
          where: { id: attestation.evidenceId },
          data: { verificationStatus: "PENDING" },
        });
      await tx.blockchainTransaction.create({
        data: {
          assetId: attestation.assetId,
          type: "ATTESTATION_REVOCATION",
          signature: req.body.txSignature,
          cluster: env.SOLANA_CLUSTER,
          signer: req.body.verifierWallet,
          status: "CONFIRMED",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "ATTESTATION_REVOKED",
          entityType: "Attestation",
          entityId: attestation.id,
          metadata: JSON.stringify({ txSignature: req.body.txSignature }),
        },
      });
    });
    await recalculateTrust(attestation.assetId);
    res.json({ revokedAt, chainStatus: "CONFIRMED" });
  },
);
verificationRouter.post(
  "/verification-requests/:id/approve",
  requireAuth,
  requireRole("verifier", "admin"),
  validate(decisionSchema),
  async (req, res) => {
    const request = await prisma.verificationRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { evidence: true },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    if (request.evidence.submittedBy === req.user!.id)
      return res
        .status(409)
        .json({ error: "Không được tự xác minh bằng chứng do chính mình gửi" });
    if (!req.body.txSignature || !req.body.payloadHash)
      return res
        .status(400)
        .json({ error: "Phê duyệt bắt buộc có chữ ký Solana và hash payload" });
    const payload = {
      version: 1,
      requestId: request.id,
      assetId: request.assetId,
      evidenceId: request.evidenceId,
      evidenceHash: request.evidence.contentHash,
      verifierId: req.user!.id,
      verifierWallet: req.body.verifierWallet,
      scope: req.body.scope,
      decision: "APPROVED",
      note: req.body.note,
    };
    if (canonicalHash(payload) !== req.body.payloadHash)
      return res
        .status(400)
        .json({ error: "Payload xác minh đã thay đổi sau khi ký" });
    const confirmed = await verifySolanaTransaction(
      req.body.txSignature,
      req.body.verifierWallet,
      "ATTESTATION",
      req.body.payloadHash,
    );
    if (!confirmed)
      return res
        .status(422)
        .json({
          error: "Giao dịch Solana chưa được xác nhận",
          chainStatus: "FAILED_CHAIN",
        });
    const result = await prisma.$transaction(async (tx) => {
      const attestation = await tx.attestation.create({
        data: {
          assetId: request.assetId,
          evidenceId: request.evidenceId,
          verifierId: req.user!.id,
          verifierWallet: req.body.verifierWallet,
          scope: req.body.scope,
          decision: "APPROVED",
          note: req.body.note,
          payloadHash: req.body.payloadHash,
          txSignature: req.body.txSignature,
          chainStatus: "CONFIRMED",
          expiresAt: new Date(Date.now() + 365 * 86400000),
        },
      });
      await tx.verificationRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      await tx.evidence.update({
        where: { id: request.evidenceId },
        data: { verificationStatus: "APPROVED" },
      });
      await tx.blockchainTransaction.create({
        data: {
          assetId: request.assetId,
          type: "ATTESTATION",
          signature: req.body.txSignature,
          cluster: env.SOLANA_CLUSTER,
          signer: req.body.verifierWallet,
          status: "CONFIRMED",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "EVIDENCE_APPROVED",
          entityType: "Attestation",
          entityId: attestation.id,
        },
      });
      return attestation;
    });
    await recalculateTrust(request.assetId);
    res.json({ attestation: result });
  },
);
verificationRouter.post(
  "/verification-requests/:id/reject",
  requireAuth,
  requireRole("verifier", "admin"),
  validate(rejectSchema),
  async (req, res) => {
    const request = await prisma.verificationRequest.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", resolvedAt: new Date() },
      }),
      prisma.evidence.update({
        where: { id: request.evidenceId },
        data: { verificationStatus: "REJECTED" },
      }),
      prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "EVIDENCE_REJECTED",
          entityType: "Evidence",
          entityId: request.evidenceId,
          metadata: JSON.stringify({
            scope: req.body.scope,
            note: req.body.note,
          }),
        },
      }),
    ]);
    await recalculateTrust(request.assetId);
    res.json({ status: "REJECTED" });
  },
);
