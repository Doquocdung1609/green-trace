import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { canonicalHash } from "../lib/hash.js";
import { serializeAsset } from "../lib/serializers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { assetInclude } from "./assets.js";
import { recalculateRisk } from "../services/riskProfileService.js";
import { recalculateReadinessProfiles } from "../services/readinessEngine.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import { ensureVerificationPolicy, syncVerificationPolicies } from "../services/verificationPolicyEngine.js";
import {
  careAgreementSchema,
  custodySchema,
  fulfillmentSchema,
  fulfillmentUpdateSchema,
  incidentSchema,
  measurementSchema,
  offerSchema,
  purchaseRequestSchema,
  reviewCaseSchema,
  reviewDecisionSchema,
  rightsSchema,
  transactionSchema,
  updateIncidentSchema,
} from "../validators/schemas.js";

export const productRouter = Router();

async function ownedAsset(assetId: string, user: NonNullable<Express.Request["user"]>) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Không tìm thấy tài sản", status: 404 as const };
  if (user.role === "operator" && asset.organizationId !== user.organizationId)
    return { error: "Không có quyền thao tác tài sản này", status: 403 as const };
  return { asset };
}

productRouter.get("/asset-templates", requireAuth, async (_req, res) => {
  const templates = await prisma.assetTemplate.findMany({
    where: { active: true },
    include: { verificationProfile: true },
    orderBy: { name: "asc" },
  });
  res.json({ templates: templates.map((item) => ({
    ...item,
    requiredIdentityFields: JSON.parse(item.requiredIdentityFieldsJson),
    optionalFields: JSON.parse(item.optionalFieldsJson),
    requiredEvidence: JSON.parse(item.requiredEvidenceJson),
    importantEvidence: JSON.parse(item.importantEvidenceJson),
    requiredIdentityFieldsJson: undefined,
    optionalFieldsJson: undefined,
    requiredEvidenceJson: undefined,
    importantEvidenceJson: undefined,
    lifecycleRulesJson: undefined,
    riskRulesJson: undefined,
    readinessRulesJson: undefined,
  })) });
});

productRouter.get("/verification-policies", requireAuth, async (_req, res) => {
  await syncVerificationPolicies();
  res.json({ policies: await prisma.verificationPolicy.findMany({ orderBy: { evidenceType: "asc" } }) });
});

productRouter.post("/assets/:id/measurements", requireAuth, requireRole("operator", "admin"), validate(measurementSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const measurement = await prisma.biologicalMeasurement.create({ data: { ...req.body, assetId: access.asset.id, reportedById: req.user!.id } });
  await recalculateTrust(access.asset.id);
  res.status(201).json({ measurement });
});

productRouter.post("/assets/:id/incidents", requireAuth, requireRole("operator", "admin"), validate(incidentSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const requiresVerification = ["MEDIUM", "HIGH", "CRITICAL"].includes(req.body.severity);
  const policy = await ensureVerificationPolicy("BIOLOGICAL_INCIDENT", JSON.stringify({ severity: req.body.severity }));
  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.assetIncident.create({ data: { ...req.body, evidenceIds: JSON.stringify(req.body.evidenceIds), assetId: access.asset.id, reportedById: req.user!.id, verificationStatus: requiresVerification ? "PENDING" : "NOT_REQUIRED" } });
    if (requiresVerification) {
      const contentHash = canonicalHash({ incidentId: created.id, assetId: access.asset.id, type: created.type, severity: created.severity, detectedAt: created.detectedAt, description: created.description });
      const evidence = await tx.evidence.create({ data: { assetId: access.asset.id, type: "BIOLOGICAL_INCIDENT", title: `Sự cố ${created.type} · ${created.severity}`, description: created.description, source: "Hệ thống sự cố GreenTrace", sourceType: "SYSTEM", observedAt: created.detectedAt, submittedBy: req.user!.id, storageUri: `private://incident-${contentHash}.json`, mimeType: "application/json", contentHash, visibility: "PRIVATE", verificationStatus: "PENDING", verificationPolicyKey: policy.record.key, metadataJson: JSON.stringify({ incidentId: created.id, severity: created.severity }) } });
      await tx.verificationRequest.create({ data: { assetId: access.asset.id, evidenceId: evidence.id, policyId: policy.record.id, requestedScope: policy.definition.requiredScope || "BIOLOGICAL_HEALTH", requesterId: req.user!.id, priority: ["HIGH", "CRITICAL"].includes(created.severity) ? "HIGH" : "NORMAL" } });
      return tx.assetIncident.update({
        where: { id: created.id },
        data: { evidenceIds: JSON.stringify([...req.body.evidenceIds, evidence.id]) },
      });
    }
    return created;
  });
  await recalculateTrust(access.asset.id);
  res.status(201).json({ incident: { ...incident, evidenceIds: JSON.parse(incident.evidenceIds) } });
});

productRouter.patch("/incidents/:id", requireAuth, requireRole("operator", "admin"), validate(updateIncidentSchema), async (req, res) => {
  const current = await prisma.assetIncident.findUnique({ where: { id: String(req.params.id) }, include: { asset: true } });
  if (!current) return res.status(404).json({ error: "Không tìm thấy sự cố" });
  if (req.user!.role === "operator" && current.asset.organizationId !== req.user!.organizationId) return res.status(403).json({ error: "Không có quyền cập nhật sự cố" });
  const incident = await prisma.assetIncident.update({ where: { id: current.id }, data: { ...req.body, resolvedAt: req.body.status === "RESOLVED" ? new Date() : null } });
  await recalculateTrust(current.assetId);
  res.json({ incident });
});

productRouter.get("/assets/:id/risk", requireAuth, async (req, res) => res.json({ riskProfile: await recalculateRisk(String(req.params.id)) }));
productRouter.get("/assets/:id/readiness", requireAuth, async (req, res) => res.json({ profiles: await recalculateReadinessProfiles(String(req.params.id)) }));

productRouter.post("/assets/:id/rights", requireAuth, requireRole("operator", "admin"), validate(rightsSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const record = await prisma.rightsRecord.create({ data: { ...req.body, assetId: access.asset.id } });
  await recalculateTrust(access.asset.id);
  res.status(201).json({ record });
});

productRouter.post("/assets/:id/custody", requireAuth, requireRole("operator", "admin"), validate(custodySchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  if (req.body.status === "ACTIVE") await prisma.custodyRecord.updateMany({ where: { assetId: access.asset.id, status: "ACTIVE" }, data: { status: "ENDED", endAt: new Date() } });
  const record = await prisma.custodyRecord.create({ data: { ...req.body, assetId: access.asset.id } });
  await recalculateTrust(access.asset.id);
  res.status(201).json({ record });
});

productRouter.post("/assets/:id/care-agreements", requireAuth, requireRole("operator", "admin"), validate(careAgreementSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const agreement = await prisma.careAgreement.create({ data: { ...req.body, assetId: access.asset.id } });
  res.status(201).json({ agreement });
});

productRouter.get("/offers", requireAuth, async (_req, res) => {
  const offers = await prisma.assetOffer.findMany({ where: { status: "AVAILABLE" }, include: { asset: { include: { organization: true, trustProfile: true, riskProfile: true, readinessProfiles: true } }, sellerOrganization: true }, orderBy: { createdAt: "desc" } });
  res.json({ offers: offers.map(({ asset, ...offer }) => ({ ...offer, asset: { ...asset, exactLatitude: undefined, exactLongitude: undefined, boundaryGeoJson: undefined } })) });
});

productRouter.post("/assets/:id/offers", requireAuth, requireRole("operator", "admin"), validate(offerSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const offer = await prisma.assetOffer.create({ data: { ...req.body, assetId: access.asset.id, sellerOrganizationId: access.asset.organizationId } });
  await prisma.asset.update({ where: { id: access.asset.id }, data: { transactionStage: "AVAILABLE" } });
  res.status(201).json({ offer });
});

productRouter.post("/offers/:id/purchase-request", requireAuth, requireRole("buyer"), validate(purchaseRequestSchema), async (req, res) => {
  const offer = await prisma.assetOffer.findUnique({ where: { id: String(req.params.id) } });
  if (!offer || offer.status !== "AVAILABLE") return res.status(409).json({ error: "Đề nghị bán không còn hiệu lực" });
  const existing = await prisma.assetTransaction.findFirst({
    where: { offerId: offer.id, buyerId: req.user!.id, status: "PURCHASE_REQUESTED" },
  });
  if (existing) return res.json({ transaction: existing, existing: true });
  const transaction = await prisma.assetTransaction.create({ data: { assetId: offer.assetId, offerId: offer.id, buyerId: req.user!.id, sellerOrganizationId: offer.sellerOrganizationId, price: offer.askingPrice, currency: offer.currency, custodyAfterSale: "UNDECIDED", status: "PURCHASE_REQUESTED", notes: req.body.notes } });
  await prisma.asset.update({ where: { id: offer.assetId }, data: { transactionStage: "PURCHASE_REQUESTED" } });
  res.status(201).json({ transaction });
});

productRouter.post("/assets/:id/transactions", requireAuth, requireRole("operator", "admin"), validate(transactionSchema), async (req, res) => {
  const access = await ownedAsset(String(req.params.id), req.user!);
  if ("error" in access) return res.status(access.status!).json({ error: access.error });
  const offer = await prisma.assetOffer.findFirst({ where: { id: req.body.offerId, assetId: access.asset.id, status: "AVAILABLE" } });
  if (!offer) return res.status(409).json({ error: "Đề nghị bán không hợp lệ" });
  const document = await prisma.evidence.findFirst({ where: { id: req.body.rightsDocumentEvidenceId, assetId: access.asset.id, type: { in: ["RIGHTS_DOCUMENT", "TRANSACTION_DOCUMENT"] } } });
  if (!document) return res.status(409).json({ error: "Cần tài liệu chuyển quyền thuộc đúng tài sản" });
  const transaction = await prisma.$transaction(async (tx) => {
    const pending = await tx.assetTransaction.findFirst({
      where: { offerId: offer.id, buyerId: req.body.buyerId, status: "PURCHASE_REQUESTED" },
    });
    const created = pending
      ? await tx.assetTransaction.update({
          where: { id: pending.id },
          data: { rightsDocumentEvidenceId: req.body.rightsDocumentEvidenceId, custodyAfterSale: req.body.custodyAfterSale, notes: req.body.notes, status: "COMPLETED", transactionAt: new Date() },
        })
      : await tx.assetTransaction.create({ data: { ...req.body, assetId: access.asset.id, sellerOrganizationId: access.asset.organizationId, price: offer.askingPrice, currency: offer.currency, status: "COMPLETED" } });
    await tx.assetOffer.update({ where: { id: offer.id }, data: { status: "SOLD" } });
    await tx.asset.update({ where: { id: access.asset.id }, data: { transactionStage: "SOLD" } });
    return created;
  });
  await recalculateTrust(access.asset.id);
  res.status(201).json({ transaction });
});

productRouter.get("/my-assets", requireAuth, requireRole("buyer"), async (req, res) => {
  const transactions = await prisma.assetTransaction.findMany({ where: { buyerId: req.user!.id }, include: { asset: { include: { organization: true, trustProfile: true, riskProfile: true, readinessProfiles: true, custodyRecords: true, careAgreements: true, lifecycleEvents: true, fulfillmentRequests: true } }, offer: true }, orderBy: { createdAt: "desc" } });
  res.json({ transactions: transactions.map(({ asset, ...transaction }) => ({ ...transaction, asset: { ...asset, exactLatitude: undefined, exactLongitude: undefined, boundaryGeoJson: undefined } })) });
});

productRouter.get("/my-assets/:id", requireAuth, requireRole("buyer"), async (req, res) => {
  const transaction = await prisma.assetTransaction.findFirst({
    where: { assetId: String(req.params.id), buyerId: req.user!.id },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });
  if (!transaction) return res.status(404).json({ error: "Tài sản không thuộc hồ sơ giao dịch của bạn" });
  const asset = await prisma.asset.findUnique({ where: { id: transaction.assetId }, include: assetInclude });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  res.json({ asset: serializeAsset(asset, "partner"), transaction });
});

productRouter.post("/assets/:id/fulfillment", requireAuth, requireRole("buyer"), validate(fulfillmentSchema), async (req, res) => {
  const purchased = await prisma.assetTransaction.findFirst({ where: { assetId: String(req.params.id), buyerId: req.user!.id, status: "COMPLETED" } });
  if (!purchased) return res.status(403).json({ error: "Chỉ người mua đã hoàn tất giao dịch mới được yêu cầu thực hiện" });
  const request = await prisma.fulfillmentRequest.create({ data: { ...req.body, assetId: purchased.assetId, requestedById: req.user!.id } });
  res.status(201).json({ request });
});

productRouter.patch("/fulfillment/:id", requireAuth, requireRole("operator", "admin"), validate(fulfillmentUpdateSchema), async (req, res) => {
  const current = await prisma.fulfillmentRequest.findUnique({ where: { id: String(req.params.id) }, include: { asset: true } });
  if (!current) return res.status(404).json({ error: "Không tìm thấy yêu cầu thực hiện" });
  if (req.user!.role === "operator" && current.asset.organizationId !== req.user!.organizationId)
    return res.status(403).json({ error: "Không có quyền xử lý yêu cầu này" });
  if (req.body.status === "SCHEDULED" && current.status !== "REQUESTED")
    return res.status(409).json({ error: "Chỉ yêu cầu mới được chuyển sang lịch đã xác nhận" });
  if (req.body.status === "COMPLETED" && current.status !== "SCHEDULED")
    return res.status(409).json({ error: "Cần xác nhận lịch trước khi hoàn tất yêu cầu" });
  if (req.body.status === "COMPLETED" && current.type === "HARVEST") {
    const verifiedHarvest = await prisma.evidence.findFirst({ where: { assetId: current.assetId, type: "HARVEST_RECORD", verificationStatus: "APPROVED" } });
    if (!verifiedHarvest) return res.status(409).json({ error: "Cần HARVEST_RECORD đã được xác minh trước khi hoàn tất thu hoạch" });
  }
  const fulfillment = await prisma.fulfillmentRequest.update({
    where: { id: current.id },
    data: {
      status: req.body.status,
      scheduledAt: req.body.scheduledAt ?? current.scheduledAt ?? (req.body.status === "SCHEDULED" ? new Date() : undefined),
      completedAt: req.body.status === "COMPLETED" ? new Date() : undefined,
      notes: req.body.notes ?? current.notes,
    },
  });
  await prisma.asset.update({
    where: { id: current.assetId },
    data: { transactionStage: req.body.status === "COMPLETED" ? "DELIVERED" : "DELIVERY_REQUESTED" },
  });
  res.json({ fulfillment });
});

productRouter.post("/review-cases", requireAuth, requireRole("operator", "buyer", "admin"), validate(reviewCaseSchema), async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.body.assetId } });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  if (req.user!.role === "operator" && asset.organizationId !== req.user!.organizationId)
    return res.status(403).json({ error: "Không có quyền yêu cầu rà soát tài sản này" });
  if (req.user!.role === "buyer") {
    const purchased = await prisma.assetTransaction.findFirst({
      where: { assetId: asset.id, buyerId: req.user!.id, status: "COMPLETED" },
      select: { id: true },
    });
    if (!purchased)
      return res.status(403).json({ error: "Chỉ người mua đã hoàn tất giao dịch mới được yêu cầu rà soát" });
  }
  const existing = await prisma.reviewCase.findFirst({
    where: { assetId: asset.id, requestedById: req.user!.id, purpose: req.body.purpose, status: "PENDING" },
  });
  if (existing) return res.json({ reviewCase: existing, existing: true });
  const readiness = await recalculateReadinessProfiles(req.body.assetId);
  const reviewCase = await prisma.reviewCase.create({ data: { ...req.body, requestedById: req.user!.id, summarySnapshot: JSON.stringify(readiness) } });
  res.status(201).json({ reviewCase });
});

productRouter.get("/review-cases", requireAuth, requireRole("reviewer", "admin"), async (_req, res) => {
  const safeUser = { id: true, fullName: true, email: true, role: true, organizationId: true } as const;
  const cases = await prisma.reviewCase.findMany({ include: { asset: { include: {
    organization: true,
    trustProfile: true,
    riskProfile: true,
    readinessProfiles: true,
    rightsRecords: true,
    custodyRecords: true,
    evidence: { where: { verificationStatus: "APPROVED" }, select: { id: true, title: true, type: true, observedAt: true, validUntil: true, verificationStatus: true } },
    incidents: { where: { status: { not: "RESOLVED" } }, orderBy: { detectedAt: "desc" } },
    lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 5 },
  } }, requestedBy: { select: safeUser }, reviewer: { select: safeUser } }, orderBy: { createdAt: "desc" } });
  res.json({ cases: cases.map((item) => ({
    ...item,
    asset: {
      ...item.asset,
      exactLatitude: undefined,
      exactLongitude: undefined,
      boundaryGeoJson: undefined,
      readinessProfiles: item.asset.readinessProfiles.map((profile) => ({
        ...profile,
        requirements: JSON.parse(profile.requirementsJson),
        missingItems: JSON.parse(profile.missingItemsJson),
        requirementsJson: undefined,
        missingItemsJson: undefined,
      })),
    },
    summary: JSON.parse(item.summarySnapshot),
    summarySnapshot: undefined,
  })) });
});

productRouter.patch("/review-cases/:id", requireAuth, requireRole("reviewer", "admin"), validate(reviewDecisionSchema), async (req, res) => {
  const reviewCase = await prisma.reviewCase.update({ where: { id: String(req.params.id) }, data: { status: "RESOLVED", reviewerId: req.user!.id, decision: req.body.decision, notes: req.body.notes, resolvedAt: new Date() } });
  res.json({ reviewCase });
});
