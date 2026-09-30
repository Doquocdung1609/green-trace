import { z } from "zod";

export const roles = ["operator", "verifier", "reviewer", "buyer", "admin"] as const;
export const evidenceTypes = [
  "PHOTO", "PHOTO_CARE", "GEO_LOCATION", "FARM_LOG", "IOT_READING",
  "CARE_NOTE", "ENVIRONMENT_READING", "CERTIFICATE", "INSPECTION", "LAB_RESULT",
  "PROPAGATION_SOURCE", "AGE_DOCUMENT", "RIGHTS_DOCUMENT", "CUSTODY_DOCUMENT",
  "CARE_AGREEMENT", "BIOLOGICAL_MEASUREMENT", "BIOLOGICAL_INCIDENT", "HARVEST_RECORD",
  "TRANSACTION_DOCUMENT", "INCIDENT_RESOLUTION", "OTHER",
] as const;
export const scopes = [
  "EXISTENCE", "LOCATION", "AGE_OR_LIFECYCLE", "CERTIFICATE_VALIDITY",
  "LAB_RESULT", "IOT_SOURCE", "BIOLOGICAL_HEALTH", "RIGHTS", "CUSTODY",
  "SOURCE_ORIGIN", "OTHER",
] as const;
export const stages = [
  "REGISTERED", "PLANTED_VERIFIED", "GROWING", "INSPECTED", "MATURE",
  "HARVEST_READY", "HARVESTED", "ARCHIVED",
] as const;
export const assetLevels = ["SINGLE_ASSET", "LOT", "PLOT", "GROWING_AREA"] as const;
export const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
  fullName: z.string().min(2).max(100),
  phone: z.string().max(30).optional(),
  role: z.literal("buyer").optional().default("buyer"),
}).strict();

export const createAssetSchema = z.object({
  displayName: z.string().min(2).max(150),
  assetType: z.string().min(2).max(100),
  assetLevel: z.enum(assetLevels).default("LOT"),
  species: z.string().min(2).max(120),
  scientificName: z.string().max(160).optional(),
  cultivar: z.string().max(120).optional(),
  propagationSource: z.string().max(200).optional(),
  propagationBatchCode: z.string().max(100).optional(),
  formationMethod: z.string().max(160).optional(),
  plantedAt: z.coerce.date(),
  plantedAtConfidence: z.enum(["DOCUMENTED", "DECLARED", "ESTIMATED"]).default("DECLARED"),
  ageBasis: z.enum(["DOCUMENTED", "DECLARED", "ESTIMATED"]).default("DECLARED"),
  initialQuantity: z.number().positive().optional(),
  quantityUnit: z.string().max(40).optional(),
  areaHectares: z.number().positive().optional(),
  density: z.number().positive().optional(),
  organizationId: z.string().optional(),
  caretaker: z.string().max(160).optional(),
  managementBasis: z.string().max(240).optional(),
  description: z.string().min(10).max(4000),
  region: z.string().min(2).max(200),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  commune: z.string().max(100).optional(),
  exactLatitude: z.number().min(-90).max(90),
  exactLongitude: z.number().min(-180).max(180),
  elevationMeters: z.number().min(-500).max(9000).optional(),
  spatialType: z.enum(["POINT", "POLYGON"]).default("POINT"),
  boundaryGeoJson: z.string().max(100_000).optional(),
  growingAreaCode: z.string().max(100).optional(),
  geographicalIndication: z.string().max(200).optional(),
  templateId: z.string().optional(),
});
export const updateAssetSchema = createAssetSchema.partial();

export const requestVerificationSchema = z.object({
  requestedScope: z.enum(scopes).optional(),
  requestedVerifierId: z.string().optional(),
});
export const payloadSchema = z.object({ scope: z.enum(scopes), note: z.string().min(5).max(2000), verifierWallet: z.string().min(32).max(64) });
export const decisionSchema = payloadSchema.extend({ txSignature: z.string().min(32).max(128).optional(), payloadHash: z.string().length(64).optional() });
export const rejectSchema = z.object({ scope: z.enum(scopes), note: z.string().min(5).max(2000), verifierWallet: z.string().max(64).optional().default("") });
export const lifecycleSchema = z.object({ stageTo: z.enum(stages), eventType: z.string().min(2).max(100), evidenceIds: z.array(z.string()).max(50) });
export const walletSchema = z.object({ solanaWallet: z.string().min(32).max(64) });
export const adminRoleSchema = z.object({ role: z.enum(roles) });
export const revokePayloadSchema = z.object({ verifierWallet: z.string().min(32).max(64) });
export const revokeDecisionSchema = revokePayloadSchema.extend({ txSignature: z.string().min(32).max(128), payloadHash: z.string().length(64) });

export const measurementSchema = z.object({
  measurementType: z.enum(["WEIGHT_GRAMS", "HEIGHT_CM", "DIAMETER_MM", "AGE_MONTHS", "HEALTH_STATUS", "FLOWERING_STATUS", "ROOT_CONDITION"]),
  value: z.string().min(1).max(120),
  unit: z.string().min(1).max(40),
  observedAt: z.coerce.date(),
  sourceEvidenceId: z.string().optional(),
});
export const incidentSchema = z.object({
  type: z.enum(["DISEASE", "PEST", "DROUGHT", "FLOOD", "PHYSICAL_DAMAGE", "THEFT_OR_LOSS", "BIOLOGICAL_LOSS", "QUALITY_DEGRADATION", "OTHER"]),
  severity: z.enum(riskLevels),
  detectedAt: z.coerce.date(),
  description: z.string().min(5).max(3000),
  evidenceIds: z.array(z.string()).max(30).default([]),
});
export const updateIncidentSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "MITIGATING", "RESOLUTION_PENDING_VERIFICATION", "RESOLVED", "TOTAL_LOSS"]),
  resolutionNote: z.string().max(3000).optional(),
  resolutionEvidenceId: z.string().optional(),
});
export const rightsSchema = z.object({
  rightType: z.string().min(2).max(100),
  holder: z.string().min(2).max(200),
  holderOrganizationId: z.string().optional(),
  basisDocumentEvidenceId: z.string(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
}).strict();
export const custodySchema = z.object({
  physicalCustodian: z.string().min(2).max(200),
  custodianOrganizationId: z.string().optional(),
  location: z.string().min(2).max(240),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  careAgreementId: z.string().optional(),
  documentEvidenceId: z.string().optional(),
  status: z.enum(["ACTIVE", "ENDED", "DISPUTED"]).default("ACTIVE"),
});
export const careAgreementSchema = z.object({
  caretakerOrganizationId: z.string(),
  serviceTerms: z.string().min(5).max(4000),
  careFee: z.number().nonnegative().optional(),
  currency: z.string().max(10).default("VND"),
  careFrequency: z.string().min(2).max(160),
  responsibility: z.string().min(2).max(2000),
  riskAllocationSummary: z.string().min(2).max(2000),
  documentEvidenceId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
});
export const offerSchema = z.object({
  saleMode: z.literal("OUTRIGHT_PURCHASE").default("OUTRIGHT_PURCHASE"),
  askingPrice: z.number().positive(),
  currency: z.string().max(10).default("VND"),
  careAfterSaleAvailable: z.boolean().default(false),
  careTermsSummary: z.string().max(2000).optional(),
});
export const purchaseRequestSchema = z.object({ notes: z.string().max(2000).optional() });
export const transactionSchema = z.object({
  offerId: z.string(),
  buyerId: z.string(),
  rightsDocumentEvidenceId: z.string(),
  custodyAfterSale: z.enum(["BUYER", "SELLER_OR_HTX"]),
  notes: z.string().max(2000).optional(),
});
export const reserveOfferSchema = z.object({ buyerId: z.string() });
export const reviewCaseSchema = z.object({
  purpose: z.enum(["REAL_ASSET_TRANSFER", "FINANCIAL_REVIEW", "INSURANCE", "CREDIT", "RWA_PARTNER_REVIEW"]),
  assetId: z.string(),
});
export const reviewDecisionSchema = z.object({
  decision: z.enum(["NOT_READY", "NEEDS_SUPPLEMENT", "READY_FOR_REVIEW"]),
  notes: z.string().min(5).max(3000),
});
export const readinessQuerySchema = z.object({ purpose: z.enum(["REAL_ASSET_TRANSFER", "FINANCIAL_REVIEW"]) });
export const fulfillmentSchema = z.object({
  type: z.enum(["HARVEST", "DELIVERY", "PICKUP"]),
  notes: z.string().max(2000).optional(),
});
export const fulfillmentUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED"]),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});
