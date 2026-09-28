import type { Prisma } from "@prisma/client";

type AssetRecord = Prisma.AssetGetPayload<{
  include: {
    organization: true;
    custodian: true;
    evidence: {
      include: {
        attestations: {
          include: { verifier: { include: { organization: true } } };
        };
      };
    };
    verificationRequests: { include: { requester: true } };
    attestations: {
      include: { verifier: { include: { organization: true } } };
    };
    lifecycleEvents: true;
    trustProfile: true;
    passports: true;
    blockchainTransactions: true;
  };
}>;

export function serializeTrust(profile: AssetRecord["trustProfile"]) {
  if (!profile) return null;
  return {
    ...profile,
    warnings: JSON.parse(profile.warningsJson) as unknown[],
    warningsJson: undefined,
  };
}

export function serializeAsset(
  asset: AssetRecord,
  mode: "owner" | "partner" | "public",
) {
  const evidence = asset.evidence
    .filter(
      (item) =>
        mode === "owner" ||
        item.visibility === "PUBLIC" ||
        (mode === "partner" && item.visibility === "PARTNER"),
    )
    .map((item) => ({
      ...item,
      storageUri:
        item.visibility === "PRIVATE" && mode !== "owner"
          ? ""
          : item.storageUri,
    }));
  const base = {
    ...asset,
    exactLatitude: mode === "owner" ? asset.exactLatitude : undefined,
    exactLongitude: mode === "owner" ? asset.exactLongitude : undefined,
    evidence,
    trustProfile: serializeTrust(asset.trustProfile),
    passports: [...asset.passports].sort((a, b) => b.version - a.version),
    attestations: asset.attestations.filter(
      (a) => mode !== "public" || a.decision === "APPROVED",
    ),
    blockchainTransactions: asset.blockchainTransactions.filter(
      (tx) => tx.status === "CONFIRMED",
    ),
  };
  if (mode === "public")
    return {
      ...base,
      custodian: { id: asset.custodian.id, fullName: asset.custodian.fullName },
      verificationRequests: undefined,
    };
  return base;
}
