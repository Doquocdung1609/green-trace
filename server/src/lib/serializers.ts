import type { Prisma } from "@prisma/client";

type AssetRecord = Prisma.AssetGetPayload<{
  include: {
    organization: true;
    custodian: { select: { id: true; fullName: true; email: true; role: true; organizationId: true } };
    evidence: {
      include: {
        attestations: {
          include: { verifier: { select: { id: true; fullName: true; organization: true } } };
        };
      };
    };
    verificationRequests: { include: { requester: { select: { id: true; fullName: true; email: true; organization: true } } } };
    attestations: {
      include: { verifier: { select: { id: true; fullName: true; organization: true } } };
    };
    lifecycleEvents: true;
    trustProfile: true;
    riskProfile: true;
    readinessProfiles: true;
    measurements: true;
    incidents: true;
    rightsRecords: true;
    custodyRecords: true;
    careAgreements: true;
    offers: true;
    transactions: { include: { buyer: { select: { id: true; fullName: true; email: true } }; offer: true } };
    reviewCases: true;
    fulfillmentRequests: true;
    valuations: true;
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
      metadataJson: mode === "public" && item.type === "GEO_LOCATION" ? undefined : item.metadataJson,
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
    riskProfile: asset.riskProfile ? {
      ...asset.riskProfile,
      reasons: JSON.parse(asset.riskProfile.reasonsJson) as string[],
      reasonsJson: undefined,
    } : null,
    readinessProfiles: asset.readinessProfiles.map((profile) => ({
      ...profile,
      requirements: JSON.parse(profile.requirementsJson),
      missingItems: JSON.parse(profile.missingItemsJson),
      requirementsJson: undefined,
      missingItemsJson: undefined,
    })),
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
      boundaryGeoJson: undefined,
      custodian: { id: asset.custodian.id, fullName: asset.custodian.fullName },
      verificationRequests: undefined,
      incidents: asset.incidents.map((incident) => ({ id: incident.id, type: incident.type, severity: incident.severity, detectedAt: incident.detectedAt, verificationStatus: incident.verificationStatus, status: incident.status, resolvedAt: incident.resolvedAt })),
      rightsRecords: asset.rightsRecords.map((record) => ({ id: record.id, rightType: record.rightType, holder: record.holder, validFrom: record.validFrom, validUntil: record.validUntil, verifiedStatus: record.verifiedStatus })),
      custodyRecords: asset.custodyRecords.map((record) => ({ id: record.id, physicalCustodian: record.physicalCustodian, location: record.location, startAt: record.startAt, endAt: record.endAt, status: record.status })),
      careAgreements: undefined,
      offers: undefined,
      transactions: undefined,
      reviewCases: undefined,
      fulfillmentRequests: undefined,
      valuations: undefined,
    };
  if (mode === "partner") return {
    ...base,
    boundaryGeoJson: undefined,
    careAgreements: asset.careAgreements.map((agreement) => ({ id: agreement.id, assetId: agreement.assetId, caretakerOrganizationId: agreement.caretakerOrganizationId, serviceTerms: agreement.serviceTerms, currency: agreement.currency, careFrequency: agreement.careFrequency, responsibility: agreement.responsibility, riskAllocationSummary: agreement.riskAllocationSummary, status: agreement.status, startsAt: agreement.startsAt, endsAt: agreement.endsAt })),
    offers: asset.offers.map((offer) => ({ id: offer.id, assetId: offer.assetId, saleMode: offer.saleMode, sellerOrganizationId: offer.sellerOrganizationId, careAfterSaleAvailable: offer.careAfterSaleAvailable, careTermsSummary: offer.careTermsSummary, status: offer.status, createdAt: offer.createdAt, updatedAt: offer.updatedAt })),
    transactions: asset.transactions.map((transaction) => ({ id: transaction.id, assetId: transaction.assetId, offerId: transaction.offerId, buyerId: transaction.buyerId, sellerOrganizationId: transaction.sellerOrganizationId, currency: transaction.currency, transactionAt: transaction.transactionAt, custodyAfterSale: transaction.custodyAfterSale, status: transaction.status, notes: transaction.notes, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt })),
    valuations: undefined,
  };
  return base;
}
