import { Router } from "express";
import { env } from "../config.js";
import { canonicalHash } from "../lib/hash.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { verifySolanaTransaction } from "../services/solanaService.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import { syncDerivedVerification } from "../services/derivedVerificationService.js";
import {
  assertAssetAccess,
  AssetAccessError,
  getAccessibleAssetIds,
} from "../services/assetAccessService.js";
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
  evidence: { include: { attestations: true, submittedByUser: { select: { id: true, fullName: true, organizationId: true } } } },
  requester: { select: { id: true, fullName: true, email: true, organization: true } },
  requestedVerifier: { select: { id: true, fullName: true } },
  policy: true,
} as const;

async function checkEligibility(
  request: {
    requestedScope: string;
    requestedVerifierId: string | null;
    requiredVerifierCategory: string | null;
    evidence: { submittedBy: string; submittedByUser: { organizationId: string | null } };
    policy: { requiredScope: string | null; independentOrganizationRequired: boolean; requiredVerifierCategory: string | null } | null;
  },
  user: { id: string; organizationId: string | null; role?: string },
  scope: string,
) {
  if (
    user.role !== "admin" &&
    request.requestedVerifierId &&
    request.requestedVerifierId !== user.id
  )
    return "Yêu cầu được chỉ định cho người xác minh khác";
  if (request.evidence.submittedBy === user.id)
    return "Không được tự xác minh bằng chứng do chính mình gửi";
  const expectedScope = request.policy?.requiredScope || request.requestedScope;
  if (expectedScope && scope !== expectedScope)
    return `Policy yêu cầu phạm vi ${expectedScope}.`;
  if (
    request.policy?.independentOrganizationRequired &&
    (!user.organizationId ||
      user.organizationId === request.evidence.submittedByUser.organizationId)
  )
    return "Policy yêu cầu người xác minh thuộc tổ chức độc lập.";
  const requiredCategory = request.policy?.requiredVerifierCategory || request.requiredVerifierCategory;
  if (requiredCategory) {
    const organization = user.organizationId
      ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
      : null;
    if (organization?.verifierCategory !== requiredCategory)
      return `Policy yêu cầu verifier category ${requiredCategory}.`;
  }
  return null;
}

verificationRouter.get(
  "/verification-requests",
  requireAuth,
  requireRole("verifier", "admin"),
  async (req, res) => {
    const organization = req.user!.organizationId
      ? await prisma.organization.findUnique({ where: { id: req.user!.organizationId } })
      : null;
    const where = req.user!.role === "verifier" ? {
      AND: [
        { OR: [{ requestedVerifierId: null }, { requestedVerifierId: req.user!.id }] },
        { OR: [{ requiredVerifierCategory: null }, { requiredVerifierCategory: organization?.verifierCategory || "__none__" }] },
      ],
    } : {};
    const accessibleIds = await getAccessibleAssetIds(req.user!);
    res.json({
      requests: await prisma.verificationRequest.findMany({
        where: {
          ...where,
          ...(accessibleIds === null ? {} : { assetId: { in: accessibleIds } }),
        },
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
    try {
      await assertAssetAccess(req.user!, request.assetId);
    } catch (error) {
      if (error instanceof AssetAccessError)
        return res.status(error.status).json({ error: error.message });
      throw error;
    }
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
      include: { evidence: { include: { submittedByUser: { select: { id: true, organizationId: true } } } }, policy: true },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    const eligibilityError = await checkEligibility(request, req.user!, req.body.scope);
    if (eligibilityError) return res.status(409).json({ error: eligibilityError });
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
    await syncDerivedVerification(attestation.evidenceId);
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
      include: { evidence: { include: { submittedByUser: { select: { id: true, organizationId: true } } } }, policy: true },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    const eligibilityError = await checkEligibility(request, req.user!, req.body.scope);
    if (eligibilityError) return res.status(409).json({ error: eligibilityError });
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
          expiresAt: request.policy?.expiresAfterDays
            ? new Date(Date.now() + request.policy.expiresAfterDays * 86400000)
            : undefined,
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
    await syncDerivedVerification(request.evidenceId);
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
      include: { evidence: { include: { submittedByUser: { select: { id: true, organizationId: true } } } }, policy: true },
    });
    if (!request || request.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Yêu cầu không còn ở trạng thái chờ" });
    const eligibilityError = await checkEligibility(request, req.user!, req.body.scope);
    if (eligibilityError) return res.status(409).json({ error: eligibilityError });
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
    await syncDerivedVerification(request.evidenceId);
    await recalculateTrust(request.assetId);
    res.json({ status: "REJECTED" });
  },
);
