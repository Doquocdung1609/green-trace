import type { AssetTemplate } from "@prisma/client";

export interface RiskRules {
  criticalFreshnessDays: number;
  operationalFreshnessDays: number;
  certificateRequired: boolean;
  locationVerificationRequired: boolean;
  custodyRequiredAfterSale: boolean;
}

export interface PurposeReadinessRules {
  minIdentityScore: number;
  minTrustScore?: number;
  minVerificationScore?: number;
  minFreshnessScore?: number;
  requireVerifiedLocation?: boolean;
  requireVerifiedRights?: boolean;
  requireActiveCustody?: boolean;
  requireVerifiedCertificate?: boolean;
  maximumRisk?: "LOW" | "MEDIUM" | "HIGH";
  blockedIncidentSeverities?: string[];
}

export interface AssetTemplateRules {
  requiredIdentityFields: string[];
  requiredEvidence: string[];
  importantEvidence: string[];
  risk: RiskRules;
  readiness: Record<string, PurposeReadinessRules>;
}

const fallback: AssetTemplateRules = {
  requiredIdentityFields: [
    "species",
    "plantedAt",
    "ageBasis",
    "region",
    "organizationId",
  ],
  requiredEvidence: ["PHOTO", "GEO_LOCATION", "PROPAGATION_SOURCE"],
  importantEvidence: [
    "GEO_LOCATION",
    "PROPAGATION_SOURCE",
    "CERTIFICATE",
    "INSPECTION",
    "RIGHTS_DOCUMENT",
  ],
  risk: {
    criticalFreshnessDays: 365,
    operationalFreshnessDays: 90,
    certificateRequired: true,
    locationVerificationRequired: true,
    custodyRequiredAfterSale: true,
  },
  readiness: {
    REAL_ASSET_TRANSFER: {
      minIdentityScore: 16,
      requireVerifiedLocation: true,
      requireVerifiedRights: true,
      requireActiveCustody: true,
      blockedIncidentSeverities: ["CRITICAL"],
    },
    FINANCIAL_REVIEW: {
      minIdentityScore: 18,
      minTrustScore: 70,
      minVerificationScore: 21,
      minFreshnessScore: 9,
      requireVerifiedCertificate: true,
      maximumRisk: "MEDIUM",
    },
  },
};

function json<T>(value: string, defaultValue: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function rulesForTemplate(template?: AssetTemplate | null): AssetTemplateRules {
  if (!template) return fallback;
  const risk = json<Partial<RiskRules>>(template.riskRulesJson, {});
  const readiness = json<Record<string, PurposeReadinessRules> | string[]>(
    template.readinessRulesJson,
    {},
  );
  return {
    requiredIdentityFields: json(
      template.requiredIdentityFieldsJson,
      fallback.requiredIdentityFields,
    ),
    requiredEvidence: json(template.requiredEvidenceJson, fallback.requiredEvidence),
    importantEvidence: json(
      template.importantEvidenceJson,
      fallback.importantEvidence,
    ),
    risk: { ...fallback.risk, ...risk },
    readiness: Array.isArray(readiness)
      ? fallback.readiness
      : { ...fallback.readiness, ...readiness },
  };
}

export const genericTemplateRules = fallback;
