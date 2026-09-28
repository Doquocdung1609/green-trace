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
  observedAt: z.coerce.date(),
  visibility: z.enum(["PUBLIC", "PARTNER", "PRIVATE"]),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  metadataJson: z.string().max(5000).optional(),
});

export const evidenceRouter = Router();

evidenceRouter.get("/assets/:id/evidence", requireAuth, async (req, res) => {
  const evidence = await prisma.evidence.findMany({
    where: { assetId: String(req.params.id) },
    include: { attestations: true },
    orderBy: { submittedAt: "desc" },
  });
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
    const evidence = await prisma.evidence.create({
      data: {
        assetId: asset.id,
        submittedBy: req.user!.id,
        ...parsed.data,
        storageUri,
        mimeType: req.file.mimetype,
        contentHash,
      },
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
    res.status(201).json({ evidence });
  },
);

evidenceRouter.get("/evidence/:id/file", requireAuth, async (req, res) => {
  const evidence = await prisma.evidence.findUnique({
    where: { id: String(req.params.id) },
    include: { asset: true },
  });
  if (!evidence)
    return res.status(404).json({ error: "Không tìm thấy bằng chứng" });
  if (!evidence.storageUri.startsWith("private://"))
    return res.redirect(evidence.storageUri);
  if (
    req.user!.role === "operator" &&
    evidence.asset.organizationId !== req.user!.organizationId
  )
    return res.status(403).json({ error: "Không có quyền xem tệp" });
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
    const request = await prisma.verificationRequest.create({
      data: {
        assetId: evidence.assetId,
        evidenceId: evidence.id,
        requesterId: req.user!.id,
        requestedScope: req.body.requestedScope,
        requestedVerifierId: req.body.requestedVerifierId,
      },
    });
    res.status(201).json({ request });
  },
);
