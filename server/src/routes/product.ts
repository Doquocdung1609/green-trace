import type { Response } from "express";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { canonicalHash } from "../lib/hash.js";
import { serializeAsset } from "../lib/serializers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  assertAssetAccess,
  AssetAccessError,
} from "../services/assetAccessService.js";
import {
  hasActiveApproval,
  syncDerivedVerification,
} from "../services/derivedVerificationService.js";
import { recalculateReadinessProfiles } from "../services/readinessEngine.js";
import { recalculateRisk } from "../services/riskProfileService.js";
import { recalculateTrust } from "../services/trustProfileService.js";
import {
  resolveVerificationPolicy,
  syncVerificationPolicies,
} from "../services/verificationPolicyEngine.js";
import {
  careAgreementSchema,
  custodySchema,
  fulfillmentSchema,
  fulfillmentUpdateSchema,
  incidentSchema,
  measurementSchema,
  offerSchema,
  purchaseRequestSchema,
  reserveOfferSchema,
  reviewCaseSchema,
  reviewDecisionSchema,
  rightsSchema,
  transactionSchema,
  updateIncidentSchema,
} from "../validators/schemas.js";
import { assetInclude } from "./assets.js";

export const productRouter = Router();

function accessError(res: Response, error: unknown) {
  if (!(error instanceof AssetAccessError)) return false;
  res.status(error.status).json({ error: error.message });
  return true;
}

const money = <T extends { toString(): string }>(value: T) => Number(value.toString());
const serializeOffer = <T extends { askingPrice: { toString(): string } }>(offer: T) => ({
  ...offer,
  askingPrice: money(offer.askingPrice),
});
const serializeTransaction = <T extends { price: { toString(): string } }>(transaction: T) => ({
  ...transaction,
  price: money(transaction.price),
});

productRouter.get("/asset-templates", requireAuth, async (_req, res) => {
  const templates = await prisma.assetTemplate.findMany({
    where: { active: true },
    include: { verificationProfile: true },
    orderBy: { name: "asc" },
  });
  res.json({
    templates: templates.map((item) => ({
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
    })),
  });
});

productRouter.get("/verification-policies", requireAuth, async (_req, res) => {
  await syncVerificationPolicies();
  res.json({
    policies: await prisma.verificationPolicy.findMany({
      orderBy: { evidenceType: "asc" },
    }),
  });
});

productRouter.post(
  "/assets/:id/measurements",
  requireAuth,
  requireRole("operator", "admin"),
  validate(measurementSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const measurement = await prisma.biologicalMeasurement.create({
      data: { ...req.body, assetId: asset.id, reportedById: req.user!.id },
    });
    await recalculateTrust(asset.id);
    res.status(201).json({ measurement });
  },
);

productRouter.post(
  "/assets/:id/incidents",
  requireAuth,
  requireRole("operator", "admin"),
  validate(incidentSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const requiresVerification = ["MEDIUM", "HIGH", "CRITICAL"].includes(
      req.body.severity,
    );
    const policy = await resolveVerificationPolicy(
      asset.templateId,
      "BIOLOGICAL_INCIDENT",
      JSON.stringify({ severity: req.body.severity }),
    );
    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.assetIncident.create({
        data: {
          ...req.body,
          evidenceIds: JSON.stringify(req.body.evidenceIds),
          assetId: asset.id,
          reportedById: req.user!.id,
          verificationStatus: requiresVerification ? "PENDING" : "NOT_REQUIRED",
        },
      });
      if (!requiresVerification) return created;
      const contentHash = canonicalHash({
        incidentId: created.id,
        assetId: asset.id,
        type: created.type,
        severity: created.severity,
        detectedAt: created.detectedAt,
        description: created.description,
      });
      const evidence = await tx.evidence.create({
        data: {
          assetId: asset.id,
          type: "BIOLOGICAL_INCIDENT",
          title: `Sự cố ${created.type} · ${created.severity}`,
          description: created.description,
          source: "Hệ thống sự cố GreenTrace",
          sourceType: "SYSTEM",
          observedAt: created.detectedAt,
          submittedBy: req.user!.id,
          storageUri: `private://incident-${contentHash}.json`,
          mimeType: "application/json",
          contentHash,
          visibility: "PRIVATE",
          verificationStatus: "PENDING",
          verificationPolicyKey: policy.record.key,
          metadataJson: JSON.stringify({
            incidentId: created.id,
            severity: created.severity,
          }),
        },
      });
      await tx.verificationRequest.create({
        data: {
          assetId: asset.id,
          evidenceId: evidence.id,
          policyId: policy.record.id,
          requestedScope: policy.definition.requiredScope || "BIOLOGICAL_HEALTH",
          requesterId: req.user!.id,
          priority: ["HIGH", "CRITICAL"].includes(created.severity)
            ? "HIGH"
            : "NORMAL",
        },
      });
      return tx.assetIncident.update({
        where: { id: created.id },
        data: {
          evidenceIds: JSON.stringify([...req.body.evidenceIds, evidence.id]),
        },
      });
    });
    await recalculateTrust(asset.id);
    res.status(201).json({
      incident: { ...incident, evidenceIds: JSON.parse(incident.evidenceIds) },
    });
  },
);

productRouter.patch(
  "/incidents/:id",
  requireAuth,
  requireRole("operator", "admin"),
  validate(updateIncidentSchema),
  async (req, res) => {
    const current = await prisma.assetIncident.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!current) return res.status(404).json({ error: "Không tìm thấy sự cố" });
    try {
      await assertAssetAccess(req.user!, current.assetId, "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const requiresResolutionVerification = ["MEDIUM", "HIGH", "CRITICAL"].includes(
      current.severity,
    );
    if (requiresResolutionVerification) {
      const nextStatus: Record<string, string> = {
        OPEN: "UNDER_REVIEW",
        UNDER_REVIEW: "MITIGATING",
        MITIGATING: "RESOLUTION_PENDING_VERIFICATION",
      };
      if (nextStatus[current.status] !== req.body.status) {
        return res.status(409).json({
          error: `Chuyển trạng thái không hợp lệ: ${current.status} phải chuyển sang ${nextStatus[current.status] ?? "chờ verifier xử lý"}`,
        });
      }
    }
    if (requiresResolutionVerification && req.body.status === "RESOLVED") {
      return res.status(409).json({
        error:
          "Sự cố MEDIUM/HIGH/CRITICAL chỉ được đóng sau khi bằng chứng khắc phục được verifier xác nhận",
      });
    }
    if (
      requiresResolutionVerification &&
      req.body.status === "RESOLUTION_PENDING_VERIFICATION"
    ) {
      if (!req.body.resolutionEvidenceId)
        return res.status(409).json({ error: "Cần bằng chứng khắc phục" });
      const evidence = await prisma.evidence.findFirst({
        where: {
          id: req.body.resolutionEvidenceId,
          assetId: current.assetId,
          type: "INCIDENT_RESOLUTION",
        },
      });
      let incidentId = "";
      try {
        incidentId = String(JSON.parse(evidence?.metadataJson || "{}").incidentId || "");
      } catch {
        incidentId = "";
      }
      if (!evidence || incidentId !== current.id)
        return res.status(409).json({
          error: "Bằng chứng khắc phục phải thuộc đúng sự cố và đúng tài sản",
        });
    }
    const incident = await prisma.assetIncident.update({
      where: { id: current.id },
      data: {
        status: req.body.status,
        resolutionNote: req.body.resolutionNote,
        resolutionEvidenceId: req.body.resolutionEvidenceId,
        resolvedAt:
          !requiresResolutionVerification && req.body.status === "RESOLVED"
            ? new Date()
            : null,
      },
    });
    if (incident.resolutionEvidenceId)
      await syncDerivedVerification(incident.resolutionEvidenceId);
    await recalculateTrust(current.assetId);
    res.json({
      incident: await prisma.assetIncident.findUnique({ where: { id: current.id } }),
    });
  },
);

for (const [path, handler] of [
  ["/assets/:id/risk", recalculateRisk],
  ["/assets/:id/readiness", recalculateReadinessProfiles],
] as const) {
  productRouter.get(path, requireAuth, async (req, res) => {
    try {
      await assertAssetAccess(req.user!, String(req.params.id));
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const result = await handler(String(req.params.id));
    res.json(path.endsWith("risk") ? { riskProfile: result } : { profiles: result });
  });
}

productRouter.post(
  "/assets/:id/rights",
  requireAuth,
  requireRole("operator", "admin"),
  validate(rightsSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const basis = await prisma.evidence.findFirst({
      where: {
        id: req.body.basisDocumentEvidenceId,
        assetId: asset.id,
        type: { in: ["RIGHTS_DOCUMENT", "TRANSACTION_DOCUMENT"] },
        visibility: { in: ["PARTNER", "PRIVATE"] },
      },
    });
    if (!basis)
      return res.status(409).json({
        error: "Hồ sơ quyền cần tài liệu basis phù hợp thuộc đúng tài sản",
      });
    const record = await prisma.rightsRecord.create({
      data: { ...req.body, assetId: asset.id, verifiedStatus: "PENDING" },
    });
    await syncDerivedVerification(basis.id);
    await recalculateTrust(asset.id);
    res.status(201).json({
      record: await prisma.rightsRecord.findUnique({ where: { id: record.id } }),
    });
  },
);

productRouter.get("/assets/:id/rights", requireAuth, async (req, res) => {
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (accessError(res, error)) return;
    throw error;
  }
  const records = await prisma.rightsRecord.findMany({
    where: { assetId: String(req.params.id) },
    orderBy: { validFrom: "desc" },
  });
  const full = ["operator", "admin"].includes(req.user!.role);
  res.json({
    records: full
      ? records
      : records.map((record) => ({
          id: record.id,
          rightType: record.rightType,
          holder: record.holderOrganizationId ? "Tổ chức được ghi nhận" : "Đã ẩn",
          validFrom: record.validFrom,
          validUntil: record.validUntil,
          verifiedStatus: record.verifiedStatus,
        })),
  });
});

productRouter.post(
  "/assets/:id/custody",
  requireAuth,
  requireRole("operator", "admin"),
  validate(custodySchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    if (req.body.status === "ACTIVE")
      await prisma.custodyRecord.updateMany({
        where: { assetId: asset.id, status: "ACTIVE" },
        data: { status: "ENDED", endAt: new Date() },
      });
    const record = await prisma.custodyRecord.create({
      data: { ...req.body, assetId: asset.id },
    });
    await recalculateTrust(asset.id);
    res.status(201).json({ record });
  },
);

productRouter.get("/assets/:id/custody", requireAuth, async (req, res) => {
  let asset;
  try {
    asset = await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (accessError(res, error)) return;
    throw error;
  }
  const records = await prisma.custodyRecord.findMany({
    where: { assetId: String(req.params.id) },
    orderBy: { startAt: "desc" },
  });
  const canSeePrivateCustody = ["operator", "admin"].includes(req.user!.role);
  res.json({
    records: canSeePrivateCustody
      ? records
      : records.map((record) => ({
          id: record.id,
          assetId: record.assetId,
          physicalCustodian: record.custodianOrganizationId
            ? "Tổ chức lưu ký"
            : "Đã ẩn",
          location: asset.region,
          startAt: record.startAt,
          endAt: record.endAt,
          status: record.status,
          createdAt: record.createdAt,
        })),
  });
});

productRouter.post(
  "/assets/:id/care-agreements",
  requireAuth,
  requireRole("operator", "admin"),
  validate(careAgreementSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const agreement = await prisma.careAgreement.create({
      data: { ...req.body, assetId: asset.id },
    });
    res.status(201).json({ ...agreement, careFee: agreement.careFee ? money(agreement.careFee) : null });
  },
);

productRouter.get("/offers", requireAuth, requireRole("buyer", "admin"), async (req, res) => {
  const offers = await prisma.assetOffer.findMany({
    where: {
      status: "AVAILABLE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      asset: {
        include: {
          organization: true,
          trustProfile: true,
          riskProfile: true,
          readinessProfiles: true,
        },
      },
      sellerOrganization: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    offers: offers.map(({ asset, ...offer }) => ({
      ...serializeOffer(offer),
      asset: {
        ...asset,
        exactLatitude: undefined,
        exactLongitude: undefined,
        boundaryGeoJson: undefined,
      },
    })),
  });
});

productRouter.post(
  "/assets/:id/offers",
  requireAuth,
  requireRole("operator", "admin"),
  validate(offerSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const offer = await prisma.$transaction(async (tx) => {
      const active = await tx.assetOffer.findFirst({
        where: { assetId: asset.id, status: { in: ["AVAILABLE", "RESERVED"] } },
      });
      if (active) throw new Error("ACTIVE_OFFER_EXISTS");
      const created = await tx.assetOffer.create({
        data: {
          ...req.body,
          assetId: asset.id,
          sellerOrganizationId: asset.organizationId,
        },
      });
      await tx.asset.update({
        where: { id: asset.id },
        data: { transactionStage: "AVAILABLE" },
      });
      return created;
    }).catch((error: unknown) => {
      if (
        (error instanceof Error && error.message === "ACTIVE_OFFER_EXISTS") ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      )
        return null;
      throw error;
    });
    if (!offer)
      return res.status(409).json({ error: "Tài sản đã có đề nghị bán đang hoạt động" });
    res.status(201).json({ offer: serializeOffer(offer) });
  },
);

productRouter.post(
  "/offers/:id/purchase-request",
  requireAuth,
  requireRole("buyer"),
  validate(purchaseRequestSchema),
  async (req, res) => {
    const offer = await prisma.assetOffer.findFirst({
      where: {
        id: String(req.params.id),
        status: "AVAILABLE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!offer)
      return res.status(409).json({ error: "Đề nghị bán không còn hiệu lực" });
    const existing = await prisma.assetTransaction.findFirst({
      where: {
        offerId: offer.id,
        buyerId: req.user!.id,
        status: { in: ["PURCHASE_REQUESTED", "RESERVED", "COMPLETED"] },
      },
    });
    if (existing)
      return res.json({ transaction: serializeTransaction(existing), existing: true });
    const transaction = await prisma.assetTransaction.create({
      data: {
        assetId: offer.assetId,
        offerId: offer.id,
        buyerId: req.user!.id,
        sellerOrganizationId: offer.sellerOrganizationId,
        price: offer.askingPrice,
        currency: offer.currency,
        custodyAfterSale: "UNDECIDED",
        status: "PURCHASE_REQUESTED",
        notes: req.body.notes,
      },
    });
    res.status(201).json({ transaction: serializeTransaction(transaction) });
  },
);

productRouter.post(
  "/offers/:id/reserve",
  requireAuth,
  requireRole("operator", "admin"),
  validate(reserveOfferSchema),
  async (req, res) => {
    const offer = await prisma.assetOffer.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!offer) return res.status(404).json({ error: "Không tìm thấy đề nghị bán" });
    try {
      await assertAssetAccess(req.user!, offer.assetId, "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    const reserved = await prisma.$transaction(async (tx) => {
      const request = await tx.assetTransaction.findFirst({
        where: {
          offerId: offer.id,
          buyerId: req.body.buyerId,
          status: "PURCHASE_REQUESTED",
        },
      });
      if (!request) return null;
      const changed = await tx.assetOffer.updateMany({
        where: {
          id: offer.id,
          status: "AVAILABLE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: {
          status: "RESERVED",
          reservedBuyerId: req.body.buyerId,
          reservedAt: new Date(),
        },
      });
      if (changed.count !== 1) return null;
      const transaction = await tx.assetTransaction.update({
        where: { id: request.id },
        data: { status: "RESERVED" },
      });
      await tx.asset.update({
        where: { id: offer.assetId },
        data: { transactionStage: "RESERVED" },
      });
      return transaction;
    });
    if (!reserved)
      return res.status(409).json({
        error: "Không thể giữ chỗ: buyer không có purchase request hợp lệ hoặc offer đã đổi trạng thái",
      });
    res.json({ transaction: serializeTransaction(reserved) });
  },
);

productRouter.post(
  "/assets/:id/transactions",
  requireAuth,
  requireRole("operator", "admin"),
  validate(transactionSchema),
  async (req, res) => {
    let asset;
    try {
      asset = await assertAssetAccess(req.user!, String(req.params.id), "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    await recalculateTrust(asset.id);
    const document = await prisma.evidence.findFirst({
      where: {
        id: req.body.rightsDocumentEvidenceId,
        assetId: asset.id,
        type: { in: ["RIGHTS_DOCUMENT", "TRANSACTION_DOCUMENT"] },
        verificationStatus: "APPROVED",
      },
    });
    if (!document || !(await hasActiveApproval(document.id)))
      return res.status(409).json({
        error: "Tài liệu chuyển quyền phải được verifier xác nhận và attestation còn hiệu lực",
      });
    const outcome = await prisma.$transaction(async (tx) => {
      const currentDocument = await tx.evidence.findFirst({
        where: {
          id: document.id,
          assetId: asset.id,
          type: { in: ["RIGHTS_DOCUMENT", "TRANSACTION_DOCUMENT"] },
          verificationStatus: "APPROVED",
          attestations: {
            some: {
              decision: "APPROVED",
              chainStatus: "CONFIRMED",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
          },
        },
      });
      if (!currentDocument) return { error: "RIGHTS_DOCUMENT" } as const;
      const offer = await tx.assetOffer.findFirst({
        where: {
          id: req.body.offerId,
          assetId: asset.id,
          status: "RESERVED",
          reservedBuyerId: req.body.buyerId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!offer) return { error: "OFFER" } as const;
      const purchase = await tx.assetTransaction.findFirst({
        where: {
          offerId: offer.id,
          buyerId: req.body.buyerId,
          status: "RESERVED",
        },
      });
      if (!purchase) return { error: "BUYER" } as const;
      const blockingIncident = await tx.assetIncident.findFirst({
        where: {
          assetId: asset.id,
          status: { not: "RESOLVED" },
          severity: { in: ["HIGH", "CRITICAL"] },
        },
      });
      if (blockingIncident) return { error: "RISK" } as const;
      const readiness = await tx.readinessProfile.findUnique({
        where: {
          assetId_purpose: {
            assetId: asset.id,
            purpose: "REAL_ASSET_TRANSFER",
          },
        },
      });
      if (readiness?.status !== "READY_FOR_REVIEW")
        return { error: "READINESS" } as const;
      const [verifiedLocation, activeCustody] = await Promise.all([
        tx.evidence.findFirst({
          where: {
            assetId: asset.id,
            type: "GEO_LOCATION",
            verificationStatus: "APPROVED",
            attestations: {
              some: {
                decision: "APPROVED",
                chainStatus: "CONFIRMED",
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
              },
            },
          },
          select: { id: true },
        }),
        tx.custodyRecord.findFirst({
          where: { assetId: asset.id, status: "ACTIVE", endAt: null },
          select: { id: true },
        }),
      ]);
      if (!verifiedLocation || !activeCustody)
        return { error: "READINESS" } as const;
      const activeRights = await tx.rightsRecord.findFirst({
        where: {
          assetId: asset.id,
          verifiedStatus: "APPROVED",
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
      });
      if (!activeRights?.basisDocumentEvidenceId)
        return { error: "RIGHTS" } as const;
      const activeRightsAttestation = await tx.attestation.findFirst({
        where: {
          evidenceId: activeRights.basisDocumentEvidenceId,
          decision: "APPROVED",
          chainStatus: "CONFIRMED",
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        select: { id: true },
      });
      if (!activeRightsAttestation) return { error: "RIGHTS" } as const;
      const changed = await tx.assetTransaction.updateMany({
        where: { id: purchase.id, status: "RESERVED" },
        data: {
          rightsDocumentEvidenceId: document.id,
          custodyAfterSale: req.body.custodyAfterSale,
          notes: req.body.notes,
          status: "COMPLETED",
          transactionAt: new Date(),
        },
      });
      if (changed.count !== 1) throw new Error("TRANSACTION_CONFLICT");
      const transaction = await tx.assetTransaction.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { buyer: true },
      });
      const offerChanged = await tx.assetOffer.updateMany({
        where: {
          id: offer.id,
          status: "RESERVED",
          reservedBuyerId: req.body.buyerId,
        },
        data: { status: "SOLD" },
      });
      if (offerChanged.count !== 1) throw new Error("TRANSACTION_CONFLICT");
      await tx.rightsRecord.updateMany({
        where: {
          assetId: asset.id,
          verifiedStatus: "APPROVED",
          OR: [{ validUntil: null }, { validUntil: { gt: transaction.transactionAt } }],
        },
        data: { validUntil: transaction.transactionAt },
      });
      await tx.rightsRecord.create({
        data: {
          assetId: asset.id,
          rightType: "CONTRACTUAL_ECONOMIC_RIGHT",
          holder: transaction.buyer.fullName,
          holderOrganizationId: transaction.buyer.organizationId,
          basisDocumentEvidenceId: document.id,
          validFrom: transaction.transactionAt,
          verifiedStatus: "APPROVED",
        },
      });
      await tx.asset.update({
        where: { id: asset.id },
        data: { transactionStage: "SOLD" },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "ASSET_SALE_COMPLETED",
          entityType: "AssetTransaction",
          entityId: transaction.id,
          metadata: JSON.stringify({ buyerId: req.body.buyerId, offerId: offer.id }),
        },
      });
      return { transaction } as const;
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "TRANSACTION_CONFLICT")
        return { error: "CONFLICT" } as const;
      throw error;
    });
    if ("error" in outcome) {
      const messages = {
        OFFER: "Offer phải được reserve đúng buyer trước khi hoàn tất",
        BUYER: "Buyer không khớp purchase request đã được chấp nhận",
        READINESS: "REAL_ASSET_TRANSFER chưa READY_FOR_REVIEW",
        RISK: "Sự cố HIGH/CRITICAL đang mở chặn giao dịch",
        RIGHTS: "Hồ sơ quyền hiện hành chưa được xác minh",
        RIGHTS_DOCUMENT: "Tài liệu chuyển quyền không còn attestation hợp lệ",
        CONFLICT: "Giao dịch đã được xử lý bởi yêu cầu khác",
      };
      const code = outcome.error as keyof typeof messages;
      return res.status(409).json({ error: messages[code] ?? "Giao dịch không hợp lệ" });
    }
    await recalculateTrust(asset.id);
    res.status(201).json({ transaction: serializeTransaction(outcome.transaction) });
  },
);

productRouter.get("/assets/:id/transactions", requireAuth, async (req, res) => {
  if (req.user!.role === "verifier")
    return res.status(403).json({ error: "Verifier không có quyền xem giao dịch" });
  try {
    await assertAssetAccess(req.user!, String(req.params.id));
  } catch (error) {
    if (accessError(res, error)) return;
    throw error;
  }
  const transactions = await prisma.assetTransaction.findMany({
    where: {
      assetId: String(req.params.id),
      ...(req.user!.role === "buyer" ? { buyerId: req.user!.id } : {}),
    },
    include: { buyer: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const canSeeBuyerIdentity = ["operator", "admin", "buyer"].includes(
    req.user!.role,
  );
  res.json({
    transactions: transactions.map((transaction) => {
      const serialized = serializeTransaction(transaction);
      if (canSeeBuyerIdentity) return serialized;
      const redacted: Partial<typeof serialized> = { ...serialized };
      delete redacted.buyer;
      delete redacted.buyerId;
      return redacted;
    }),
  });
});

productRouter.get("/my-assets", requireAuth, requireRole("buyer"), async (req, res) => {
  const transactions = await prisma.assetTransaction.findMany({
    where: { buyerId: req.user!.id },
    include: {
      asset: {
        include: {
          organization: true,
          trustProfile: true,
          riskProfile: true,
          readinessProfiles: true,
          custodyRecords: true,
          careAgreements: true,
          lifecycleEvents: true,
          fulfillmentRequests: true,
        },
      },
      offer: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    transactions: transactions.map(({ asset, offer, ...transaction }) => ({
      ...serializeTransaction(transaction),
      offer: offer ? serializeOffer(offer) : null,
      asset: {
        ...asset,
        exactLatitude: undefined,
        exactLongitude: undefined,
        boundaryGeoJson: undefined,
        careAgreements: asset.careAgreements.map((agreement) => ({
          ...agreement,
          careFee: agreement.careFee ? money(agreement.careFee) : null,
        })),
      },
    })),
  });
});

productRouter.get("/my-assets/:id", requireAuth, requireRole("buyer"), async (req, res) => {
  const transaction = await prisma.assetTransaction.findFirst({
    where: { assetId: String(req.params.id), buyerId: req.user!.id },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });
  if (!transaction)
    return res.status(404).json({ error: "Tài sản không thuộc hồ sơ giao dịch của bạn" });
  const asset = await prisma.asset.findUnique({
    where: { id: transaction.assetId },
    include: assetInclude,
  });
  if (!asset) return res.status(404).json({ error: "Không tìm thấy tài sản" });
  res.json({
    asset: serializeAsset(asset, "partner", req.user!.id),
    transaction: serializeTransaction(transaction),
  });
});

productRouter.post(
  "/assets/:id/fulfillment",
  requireAuth,
  requireRole("buyer"),
  validate(fulfillmentSchema),
  async (req, res) => {
    const purchased = await prisma.assetTransaction.findFirst({
      where: {
        assetId: String(req.params.id),
        buyerId: req.user!.id,
        status: "COMPLETED",
      },
    });
    if (!purchased)
      return res.status(403).json({
        error: "Chỉ người mua đã hoàn tất giao dịch mới được yêu cầu thực hiện",
      });
    const request = await prisma.fulfillmentRequest.create({
      data: { ...req.body, assetId: purchased.assetId, requestedById: req.user!.id },
    });
    res.status(201).json({ request });
  },
);

productRouter.patch(
  "/fulfillment/:id",
  requireAuth,
  requireRole("operator", "admin"),
  validate(fulfillmentUpdateSchema),
  async (req, res) => {
    const current = await prisma.fulfillmentRequest.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!current)
      return res.status(404).json({ error: "Không tìm thấy yêu cầu thực hiện" });
    try {
      await assertAssetAccess(req.user!, current.assetId, "manage");
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    if (req.body.status === "SCHEDULED" && current.status !== "REQUESTED")
      return res.status(409).json({
        error: "Chỉ yêu cầu mới được chuyển sang lịch đã xác nhận",
      });
    if (req.body.status === "COMPLETED" && current.status !== "SCHEDULED")
      return res.status(409).json({ error: "Cần xác nhận lịch trước khi hoàn tất yêu cầu" });
    if (req.body.status === "COMPLETED" && current.type === "HARVEST") {
      const verifiedHarvest = await prisma.evidence.findFirst({
        where: {
          assetId: current.assetId,
          type: "HARVEST_RECORD",
          verificationStatus: "APPROVED",
        },
      });
      if (!verifiedHarvest || !(await hasActiveApproval(verifiedHarvest.id)))
        return res.status(409).json({
          error: "Cần HARVEST_RECORD đã được xác minh trước khi hoàn tất thu hoạch",
        });
    }
    const fulfillment = await prisma.fulfillmentRequest.update({
      where: { id: current.id },
      data: {
        status: req.body.status,
        scheduledAt:
          req.body.scheduledAt ??
          current.scheduledAt ??
          (req.body.status === "SCHEDULED" ? new Date() : undefined),
        completedAt: req.body.status === "COMPLETED" ? new Date() : undefined,
        notes: req.body.notes ?? current.notes,
      },
    });
    await prisma.asset.update({
      where: { id: current.assetId },
      data: {
        transactionStage:
          req.body.status === "COMPLETED" ? "DELIVERED" : "DELIVERY_REQUESTED",
      },
    });
    res.json({ fulfillment });
  },
);

productRouter.post(
  "/review-cases",
  requireAuth,
  requireRole("operator", "buyer", "admin"),
  validate(reviewCaseSchema),
  async (req, res) => {
    try {
      await assertAssetAccess(req.user!, req.body.assetId);
    } catch (error) {
      if (accessError(res, error)) return;
      throw error;
    }
    if (req.user!.role === "buyer") {
      const purchased = await prisma.assetTransaction.findFirst({
        where: {
          assetId: req.body.assetId,
          buyerId: req.user!.id,
          status: "COMPLETED",
        },
      });
      if (!purchased)
        return res.status(403).json({
          error: "Chỉ người mua đã hoàn tất giao dịch mới được yêu cầu rà soát",
        });
    }
    const existing = await prisma.reviewCase.findFirst({
      where: {
        assetId: req.body.assetId,
        requestedById: req.user!.id,
        purpose: req.body.purpose,
        status: { in: ["PENDING", "CLAIMED"] },
      },
    });
    if (existing) return res.json({ reviewCase: existing, existing: true });
    const readiness = await recalculateReadinessProfiles(req.body.assetId);
    const reviewCase = await prisma.reviewCase.create({
      data: {
        ...req.body,
        requestedById: req.user!.id,
        summarySnapshot: JSON.stringify(readiness),
      },
    });
    res.status(201).json({ reviewCase });
  },
);

productRouter.get(
  "/review-cases",
  requireAuth,
  requireRole("reviewer", "admin"),
  async (req, res) => {
    const safeUser = {
      id: true,
      fullName: true,
      email: true,
      role: true,
      organizationId: true,
    } as const;
    const cases = await prisma.reviewCase.findMany({
      where:
        req.user!.role === "admin"
          ? {}
          : {
              OR: [
                { status: "PENDING", reviewerId: null },
                { reviewerId: req.user!.id },
              ],
            },
      include: {
        asset: {
          include: {
            organization: true,
            trustProfile: true,
            riskProfile: true,
            readinessProfiles: true,
            rightsRecords: true,
            custodyRecords: true,
            evidence: {
              where: { verificationStatus: "APPROVED", visibility: "PARTNER" },
              select: {
                id: true,
                title: true,
                type: true,
                observedAt: true,
                validUntil: true,
                verificationStatus: true,
              },
            },
            incidents: {
              where: { status: { not: "RESOLVED" } },
              orderBy: { detectedAt: "desc" },
            },
            lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 5 },
          },
        },
        requestedBy: { select: safeUser },
        reviewer: { select: safeUser },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      cases: cases.map((item) => {
        const assigned = req.user!.role === "admin" || item.reviewerId === req.user!.id;
        const readinessProfiles = item.asset.readinessProfiles.map((profile) => ({
          ...profile,
          requirements: JSON.parse(profile.requirementsJson),
          missingItems: JSON.parse(profile.missingItemsJson),
          requirementsJson: undefined,
          missingItemsJson: undefined,
        }));
        return {
          ...item,
          asset: assigned
            ? {
                ...item.asset,
                exactLatitude: undefined,
                exactLongitude: undefined,
                boundaryGeoJson: undefined,
                readinessProfiles,
              }
            : {
                id: item.asset.id,
                assetCode: item.asset.assetCode,
                displayName: item.asset.displayName,
                organization: item.asset.organization,
                currentStage: item.asset.currentStage,
                readinessProfiles: [],
              },
          summary: JSON.parse(item.summarySnapshot),
          summarySnapshot: undefined,
        };
      }),
    });
  },
);

productRouter.post(
  "/review-cases/:id/claim",
  requireAuth,
  requireRole("reviewer"),
  async (req, res) => {
    const claimed = await prisma.reviewCase.updateMany({
      where: {
        id: String(req.params.id),
        status: "PENDING",
        reviewerId: null,
      },
      data: { status: "CLAIMED", reviewerId: req.user!.id, claimedAt: new Date() },
    });
    if (claimed.count !== 1)
      return res.status(409).json({ error: "Case đã được reviewer khác claim hoặc không còn chờ" });
    const reviewCase = await prisma.reviewCase.findUnique({
      where: { id: String(req.params.id) },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "REVIEW_CASE_CLAIMED",
        entityType: "ReviewCase",
        entityId: reviewCase!.id,
      },
    });
    res.json({ reviewCase });
  },
);

productRouter.patch(
  "/review-cases/:id",
  requireAuth,
  requireRole("reviewer", "admin"),
  validate(reviewDecisionSchema),
  async (req, res) => {
    const id = String(req.params.id);
    const where =
      req.user!.role === "admin"
        ? { id, status: { in: ["PENDING", "CLAIMED"] } }
        : { id, status: "CLAIMED", reviewerId: req.user!.id };
    const changed = await prisma.reviewCase.updateMany({
      where,
      data: {
        status: "RESOLVED",
        ...(req.user!.role === "admin" ? { reviewerId: req.user!.id } : {}),
        decision: req.body.decision,
        notes: req.body.notes,
        resolvedAt: new Date(),
      },
    });
    if (changed.count !== 1)
      return res.status(409).json({
        error: "Case chưa được bạn claim, đã resolved hoặc thuộc reviewer khác",
      });
    const reviewCase = await prisma.reviewCase.findUnique({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action:
          req.user!.role === "admin" ? "REVIEW_CASE_ADMIN_OVERRIDE" : "REVIEW_CASE_RESOLVED",
        entityType: "ReviewCase",
        entityId: id,
      },
    });
    res.json({ reviewCase });
  },
);

productRouter.post(
  "/review-cases/:id/reopen",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const id = String(req.params.id);
    const changed = await prisma.reviewCase.updateMany({
      where: { id, status: "RESOLVED" },
      data: {
        status: "PENDING",
        reviewerId: null,
        claimedAt: null,
        decision: null,
        notes: null,
        resolvedAt: null,
      },
    });
    if (changed.count !== 1)
      return res.status(409).json({ error: "Chỉ case đã resolved mới được reopen" });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "REVIEW_CASE_ADMIN_REOPENED",
        entityType: "ReviewCase",
        entityId: id,
      },
    });
    res.json({ reviewCase: await prisma.reviewCase.findUnique({ where: { id } }) });
  },
);
