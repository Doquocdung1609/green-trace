import { prisma } from "../db/prisma.js";

export interface VerificationPolicyDefinition {
  key: string;
  evidenceType: string;
  verificationRequired: boolean;
  requiredScope?: string;
  requiredVerifierCategory?: string;
  independentOrganizationRequired: boolean;
  expiresAfterDays?: number;
  affectsReadiness: boolean;
  affectsLifecycle: boolean;
}

const policy = (
  evidenceType: string,
  options: Partial<Omit<VerificationPolicyDefinition, "key" | "evidenceType">> = {},
): VerificationPolicyDefinition => ({
  key: `EVIDENCE_${evidenceType}_V1`,
  evidenceType,
  verificationRequired: false,
  independentOrganizationRequired: false,
  affectsReadiness: false,
  affectsLifecycle: false,
  ...options,
});

export const verificationPolicyDefinitions: VerificationPolicyDefinition[] = [
  policy("PHOTO"),
  policy("PHOTO_CARE"),
  policy("FARM_LOG"),
  policy("IOT_READING"),
  policy("CARE_NOTE"),
  policy("ENVIRONMENT_READING"),
  policy("GEO_LOCATION", { verificationRequired: true, requiredScope: "LOCATION", independentOrganizationRequired: true, expiresAfterDays: 365, affectsReadiness: true, affectsLifecycle: true }),
  policy("INSPECTION", { verificationRequired: true, requiredScope: "EXISTENCE", independentOrganizationRequired: true, expiresAfterDays: 365, affectsReadiness: true, affectsLifecycle: true }),
  policy("CERTIFICATE", { verificationRequired: true, requiredScope: "CERTIFICATE_VALIDITY", independentOrganizationRequired: true, expiresAfterDays: 365, affectsReadiness: true }),
  policy("LAB_RESULT", { verificationRequired: true, requiredScope: "LAB_RESULT", requiredVerifierCategory: "LAB", independentOrganizationRequired: true, expiresAfterDays: 365, affectsReadiness: true }),
  policy("PROPAGATION_SOURCE", { verificationRequired: true, requiredScope: "SOURCE_ORIGIN", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("AGE_DOCUMENT", { verificationRequired: true, requiredScope: "AGE_OR_LIFECYCLE", independentOrganizationRequired: true, affectsReadiness: true, affectsLifecycle: true }),
  policy("RIGHTS_DOCUMENT", { verificationRequired: true, requiredScope: "RIGHTS", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("CUSTODY_DOCUMENT", { verificationRequired: true, requiredScope: "CUSTODY", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("CARE_AGREEMENT", { verificationRequired: true, requiredScope: "CUSTODY", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("BIOLOGICAL_MEASUREMENT"),
  policy("BIOLOGICAL_INCIDENT", { verificationRequired: true, requiredScope: "BIOLOGICAL_HEALTH", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("INCIDENT_RESOLUTION", { verificationRequired: true, requiredScope: "BIOLOGICAL_HEALTH", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("HARVEST_RECORD", { verificationRequired: true, requiredScope: "AGE_OR_LIFECYCLE", independentOrganizationRequired: true, affectsReadiness: true, affectsLifecycle: true }),
  policy("TRANSACTION_DOCUMENT", { verificationRequired: true, requiredScope: "RIGHTS", independentOrganizationRequired: true, affectsReadiness: true }),
  policy("OTHER"),
];

export function policyForEvidence(type: string, metadataJson?: string | null) {
  const base = verificationPolicyDefinitions.find((item) => item.evidenceType === type) ?? policy(type);
  if (type !== "BIOLOGICAL_INCIDENT") return base;
  let severity = "LOW";
  try {
    severity = String(JSON.parse(metadataJson || "{}").severity || "LOW").toUpperCase();
  } catch {
    // Invalid metadata is handled by the evidence validator; keep the safe default.
  }
  return ["MEDIUM", "HIGH", "CRITICAL"].includes(severity)
    ? base
    : { ...base, verificationRequired: false };
}

export function isImportantEvidence(type: string) {
  const item = verificationPolicyDefinitions.find((candidate) => candidate.evidenceType === type);
  return Boolean(item?.verificationRequired && item.affectsReadiness);
}

export async function syncVerificationPolicies() {
  await Promise.all(
    verificationPolicyDefinitions.map((item) =>
      prisma.verificationPolicy.upsert({
        where: { key: item.key },
        create: item,
        update: item,
      }),
    ),
  );
}

export async function ensureVerificationPolicy(type: string, metadataJson?: string | null) {
  const item = policyForEvidence(type, metadataJson);
  const persisted = verificationPolicyDefinitions.find((candidate) => candidate.evidenceType === type) ?? item;
  const saved = await prisma.verificationPolicy.upsert({
    where: { key: item.key },
    create: persisted,
    update: persisted,
  });
  return { definition: item, record: saved };
}

export async function resolveVerificationPolicy(
  assetTemplateId: string | null | undefined,
  type: string,
  metadataJson?: string | null,
) {
  if (assetTemplateId) {
    // The template lookup deliberately lives behind this abstraction so a future
    // (templateId, evidenceType, version) schema can replace the global fallback
    // without changing upload and incident flows.
    await prisma.assetTemplate.findUnique({
      where: { id: assetTemplateId },
      select: { id: true, version: true },
    });
  }
  return ensureVerificationPolicy(type, metadataJson);
}
