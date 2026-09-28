import { z } from "zod";

export const roles = ["operator", "verifier", "reviewer", "admin"] as const;
export const evidenceTypes = [
  "PHOTO",
  "GEO_LOCATION",
  "IOT_READING",
  "FARM_LOG",
  "CERTIFICATE",
  "INSPECTION",
  "LAB_RESULT",
  "OTHER",
] as const;
export const scopes = [
  "EXISTENCE",
  "LOCATION",
  "AGE_OR_LIFECYCLE",
  "CERTIFICATE_VALIDITY",
  "LAB_RESULT",
  "IOT_SOURCE",
  "OTHER",
] as const;
export const stages = [
  "REGISTERED",
  "PLANTED_VERIFIED",
  "GROWING",
  "INSPECTED",
  "MATURE",
  "HARVEST_READY",
  "HARVESTED",
  "TRANSFERRED",
  "ARCHIVED",
] as const;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
  fullName: z.string().min(2).max(100),
  phone: z.string().max(30).optional(),
  role: z.enum(["operator", "reviewer"]),
  organizationName: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
});
export const createAssetSchema = z.object({
  displayName: z.string().min(2).max(150),
  assetType: z.string().min(2).max(100),
  species: z.string().min(2).max(120),
  organizationId: z.string().optional(),
  description: z.string().min(10).max(4000),
  region: z.string().min(2).max(160),
  exactLatitude: z.number().min(-90).max(90),
  exactLongitude: z.number().min(-180).max(180),
  plantedAt: z.coerce.date(),
});
export const updateAssetSchema = createAssetSchema.partial();
export const requestVerificationSchema = z.object({
  requestedScope: z.enum(scopes),
  requestedVerifierId: z.string().optional(),
});
export const payloadSchema = z.object({
  scope: z.enum(scopes),
  note: z.string().min(5).max(2000),
  verifierWallet: z.string().min(32).max(64),
});
export const decisionSchema = payloadSchema.extend({
  txSignature: z.string().min(32).max(128).optional(),
  payloadHash: z.string().length(64).optional(),
});
export const rejectSchema = z.object({
  scope: z.enum(scopes),
  note: z.string().min(5).max(2000),
  verifierWallet: z.string().max(64).optional().default(""),
});
export const lifecycleSchema = z.object({
  stageTo: z.enum(stages),
  eventType: z.string().min(2).max(100),
  evidenceIds: z.array(z.string()).max(50),
});
export const walletSchema = z.object({
  solanaWallet: z.string().min(32).max(64),
});
export const adminRoleSchema = z.object({
  role: z.enum(roles),
});
export const revokePayloadSchema = z.object({
  verifierWallet: z.string().min(32).max(64),
});
export const revokeDecisionSchema = revokePayloadSchema.extend({
  txSignature: z.string().min(32).max(128),
  payloadHash: z.string().length(64),
});
