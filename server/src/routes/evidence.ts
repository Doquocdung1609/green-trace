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
import { resolveVerificationPolicy } from "../services/verificationPolicyEngine.js";
import {
  assertAssetAccess,
  AssetAccessError,
  canReadEvidence,
} from "../services/assetAccessService.js";
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

evidenceRouter.get("/assets/:id/evidence", requireAuth, async (req, res) => {
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (error instanceof AssetAccessError)
      return res.status(error.status).json({ error: error.message });
    throw error;
  }
  const asset = await prisma.asset.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, organizationId: true },
  });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  const records = await prisma.evidence.findMany({
    where: { assetId: String(req.params.id) },
    include: { attestations: true },
    orderBy: { submittedAt: "desc" },
  });
  const evidence = [];
  for (const item of records) {
    if (await canReadEvidence(req.user!, { ...item, asset })) evidence.push(item);
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
    let asset;
    try {
      asset = await assertAssetAccess(
        req.user!,
        String(req.params.id),
        "manage",
      );
    } catch (error) {
      if (error instanceof AssetAccessError)
        return res.status(error.status).json({ error: error.message });
      throw error;
    }
    const contentHash = sha256(await readFile(req.file.path));
    const storageUri = await storeEvidence(
      req.file,
      parsed.data.visibility,
      contentHash,
    );
    const { definition: policy, record: policyRecord } = await resolveVerificationPolicy(asset.templateId, parsed.data.type, parsed.data.metadataJson);
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
  if (!(await canReadEvidence(req.user!, evidence)))
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
    try {
      await assertAssetAccess(req.user!, evidence.assetId, "manage");
    } catch (error) {
      if (error instanceof AssetAccessError)
        return res.status(error.status).json({ error: error.message });
      throw error;
    }
    const { definition: policy, record: policyRecord } = await resolveVerificationPolicy(evidence.asset.templateId, evidence.type, evidence.metadataJson);
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
