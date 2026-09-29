import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config.js";
import { prisma } from "../db/prisma.js";
import { sha256 } from "../lib/hash.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  allowedMimeTypes,
  openPrivateEvidence,
  storeEvidence,
} from "../services/storageService.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import { ensureVerificationPolicy } from "../services/verificationPolicyEngine.js";
import {
  evidenceTypes,
  requestVerificationSchema,
} from "../validators/schemas.js";

const tmp = path.resolve("storage/tmp");
mkdirSync(tmp, { recursive: true });
const upload = multer({
  dest: tmp,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    allowedMimeTypes.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Định dạng tệp không được hỗ trợ")),
});
const metadataSchema = z.object({
  type: z.enum(evidenceTypes),
  title: z.string().min(2).max(160),
  description: z.string().max(3000).optional().default(""),
  source: z.string().min(2).max(160),
  sourceType: z.enum(["OPERATOR", "DEVICE", "THIRD_PARTY", "DOCUMENT", "SYSTEM"]).default("OPERATOR"),
  observedAt: z.coerce.date(),
  visibility: z.enum(["PUBLIC", "PARTNER", "PRIVATE"]),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  metadataJson: z.string().max(5000).optional(),
});

export const evidenceRouter = Router();

async function evidenceAccess(
  evidence: { id: string; assetId: string; visibility: string; asset: { organizationId: string } },
  user: NonNullable<Express.Request["user"]>,
) {
  if (user.role === "admin") return true;
  if (user.role === "operator")
    return evidence.asset.organizationId === user.organizationId;
  if (evidence.visibility === "PUBLIC") return true;
  if (user.role === "reviewer") {
    if (evidence.visibility === "PARTNER") return true;
    return Boolean(await prisma.reviewCase.findFirst({
      where: { assetId: evidence.assetId },
      select: { id: true },
    }));
  }
  if (user.role === "buyer") {
    if (evidence.visibility === "PRIVATE")
      return Boolean(await prisma.assetTransaction.findFirst({
        where: {
          assetId: evidence.assetId,
          buyerId: user.id,
          status: "COMPLETED",
          rightsDocumentEvidenceId: evidence.id,
        },
        select: { id: true },
      }));
    return Boolean(await prisma.assetTransaction.findFirst({
      where: { assetId: evidence.assetId, buyerId: user.id, status: "COMPLETED" },
      select: { id: true },
    }));
  }
  if (user.role === "verifier") {
    if (evidence.visibility === "PARTNER") return true;
    const organization = user.organizationId
      ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
      : null;
    const request = await prisma.verificationRequest.findFirst({
      where: {
        evidenceId: evidence.id,
        OR: [{ requestedVerifierId: null }, { requestedVerifierId: user.id }],
        AND: [{ OR: [
          { requiredVerifierCategory: null },
          { requiredVerifierCategory: organization?.verifierCategory || "__none__" },
        ] }],
      },
      include: { policy: true },
    });
    if (!request) return false;
    return !(
      request.policy?.independentOrganizationRequired &&
      user.organizationId === evidence.asset.organizationId
    );
  }
  return false;
}

evidenceRouter.get("/assets/:id/evidence", requireAuth, async (req, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, organizationId: true },
  });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  if (req.user!.role === "operator" && asset.organizationId !== req.user!.organizationId)
    return res.status(403).json({ error: "Không có quyền xem bằng chứng" });
  const records = await prisma.evidence.findMany({
    where: { assetId: String(req.params.id) },
    include: { attestations: true },
    orderBy: { submittedAt: "desc" },
  });
  const evidence = [];
  for (const item of records) {
    if (await evidenceAccess({ ...item, asset }, req.user!)) evidence.push(item);
  }
  res.json({ evidence });
});
evidenceRouter.post(
  "/assets/:id/evidence",
  requireAuth,
  requireRole("operator", "admin"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Vui lòng chọn tệp bằng chứng" });
    const parsed = metadataSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          error: "Metadata bằng chứng không hợp lệ",
          details: parsed.error.flatten(),
        });
    const asset = await prisma.asset.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!asset)
      return res.status(404).json({ error: "Không tìm thấy tài sản" });
    if (
      req.user!.role === "operator" &&
      asset.organizationId !== req.user!.organizationId
    )
      return res.status(403).json({ error: "Không có quyền thêm bằng chứng" });
    const contentHash = sha256(await readFile(req.file.path));
    const storageUri = await storeEvidence(
      req.file,
      parsed.data.visibility,
      contentHash,
    );
    const { definition: policy, record: policyRecord } = await ensureVerificationPolicy(parsed.data.type, parsed.data.metadataJson);
    const evidence = await prisma.$transaction(async (tx) => {
      const created = await tx.evidence.create({
        data: {
          assetId: asset.id,
          submittedBy: req.user!.id,
          ...parsed.data,
          storageUri,
          mimeType: req.file!.mimetype,
          contentHash,
          verificationPolicyKey: policy.key,
          verificationStatus: policy.verificationRequired ? "PENDING" : "NOT_REQUIRED",
        },
      });
      if (policy.verificationRequired) {
        await tx.verificationRequest.create({
          data: {
            assetId: asset.id,
            evidenceId: created.id,
            policyId: policyRecord.id,
            requesterId: req.user!.id,
            requestedScope: policy.requiredScope || "OTHER",
            requiredVerifierCategory: policy.requiredVerifierCategory,
            priority: ["RIGHTS_DOCUMENT", "CUSTODY_DOCUMENT", "TRANSACTION_DOCUMENT", "BIOLOGICAL_INCIDENT"].includes(created.type) ? "HIGH" : "NORMAL",
          },
        });
      }
      return created;
    });
    if (parsed.data.type === "PHOTO" && parsed.data.visibility === "PUBLIC")
      await prisma.asset.update({
        where: { id: asset.id },
        data: { photoUrl: storageUri },
      });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "EVIDENCE_SUBMITTED",
        entityType: "Evidence",
        entityId: evidence.id,
        metadata: JSON.stringify({ type: evidence.type, contentHash }),
      },
    });
    await recalculateTrust(asset.id);
    res.status(201).json({ evidence, verificationPolicy: policy });
  },
);

evidenceRouter.get("/evidence/:id/file", requireAuth, async (req, res) => {
  const evidence = await prisma.evidence.findUnique({
    where: { id: String(req.params.id) },
    include: { asset: true },
  });
  if (!evidence)
    return res.status(404).json({ error: "Không tìm thấy bằng chứng" });
  if (!(await evidenceAccess(evidence, req.user!)))
    return res.status(403).json({ error: "Không có quyền xem tệp" });
  if (evidence.sourceType === "SYSTEM" && evidence.mimeType === "application/json")
    return res.type("application/json").send(evidence.metadataJson || "{}");
  if (!evidence.storageUri.startsWith("private://"))
    return res.redirect(evidence.storageUri);
  res.type(evidence.mimeType);
  openPrivateEvidence(evidence.storageUri).pipe(res);
});
evidenceRouter.post(
  "/evidence/:id/request-verification",
  requireAuth,
  requireRole("operator", "admin"),
  validate(requestVerificationSchema),
  async (req, res) => {
    const evidence = await prisma.evidence.findUnique({
      where: { id: String(req.params.id) },
      include: { asset: true },
    });
    if (!evidence)
      return res.status(404).json({ error: "Không tìm thấy bằng chứng" });
    if (
      req.user!.role === "operator" &&
      evidence.asset.organizationId !== req.user!.organizationId
    )
      return res.status(403).json({ error: "Không có quyền yêu cầu xác minh" });
    const { definition: policy, record: policyRecord } = await ensureVerificationPolicy(evidence.type, evidence.metadataJson);
    if (!policy.verificationRequired)
      return res.status(409).json({ error: "Loại bằng chứng này được hệ thống kiểm tra và không cần verifier." });
    const existing = await prisma.verificationRequest.findFirst({
      where: { evidenceId: evidence.id, status: "PENDING" },
    });
    if (existing) return res.json({ request: existing, automated: true });
    const request = await prisma.verificationRequest.create({
      data: {
        assetId: evidence.assetId,
        evidenceId: evidence.id,
        requesterId: req.user!.id,
        policyId: policyRecord.id,
        requestedScope: policy.requiredScope || "OTHER",
        requiredVerifierCategory: policy.requiredVerifierCategory,
        requestedVerifierId: req.body.requestedVerifierId,
      },
    });
    res.status(201).json({ request });
  },
);
