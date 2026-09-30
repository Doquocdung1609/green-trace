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
  viewerId?: string,
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
      submittedBy: mode === "public" ? undefined : item.submittedBy,
      metadataJson: mode === "public" && item.type === "GEO_LOCATION" ? undefined : item.metadataJson,
      storageUri:
        item.visibility === "PRIVATE" && mode !== "owner"
          ? ""
          : item.storageUri,
      attestations:
        mode === "public"
          ? item.attestations
              .filter(
                (attestation) =>
                  attestation.decision === "APPROVED" &&
                  attestation.chainStatus === "CONFIRMED" &&
                  (!attestation.expiresAt || attestation.expiresAt >= new Date()) &&
                  !attestation.revokedAt,
              )
              .map((attestation) => ({
                id: attestation.id,
                evidenceId: attestation.evidenceId,
                scope: attestation.scope,
                decision: attestation.decision,
                payloadHash: attestation.payloadHash,
                txSignature: attestation.txSignature,
                chainStatus: attestation.chainStatus,
                verifiedAt: attestation.verifiedAt,
                expiresAt: attestation.expiresAt,
                revokedAt: attestation.revokedAt,
                verifierOrganization: attestation.verifier.organization?.name,
              }))
          : item.attestations,
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
    attestations:
      mode === "public"
        ? asset.attestations
            .filter(
              (item) =>
                item.decision === "APPROVED" &&
                item.chainStatus === "CONFIRMED" &&
                !item.revokedAt &&
                (!item.expiresAt || item.expiresAt >= new Date()),
            )
            .map((item) => ({
              id: item.id,
              evidenceId: item.evidenceId,
              scope: item.scope,
              decision: item.decision,
              payloadHash: item.payloadHash,
              txSignature: item.txSignature,
              chainStatus: item.chainStatus,
              verifiedAt: item.verifiedAt,
              expiresAt: item.expiresAt,
              verifierOrganization: item.verifier.organization?.name,
            }))
        : asset.attestations,
    careAgreements: asset.careAgreements.map((agreement) => ({
      ...agreement,
      careFee: agreement.careFee ? Number(agreement.careFee.toString()) : null,
    })),
    offers: asset.offers.map((offer) => ({
      ...offer,
      askingPrice: Number(offer.askingPrice.toString()),
    })),
    transactions: asset.transactions.map((transaction) => ({
      ...transaction,
      price: Number(transaction.price.toString()),
    })),
    valuations: asset.valuations.map((valuation) => ({
      ...valuation,
      referenceValue: Number(valuation.referenceValue.toString()),
    })),
    blockchainTransactions: asset.blockchainTransactions.filter(
      (tx) => tx.status === "CONFIRMED",
    ),
  };
  if (mode === "public")
    return {
      ...base,
      boundaryGeoJson: undefined,
      custodianId: undefined,
      organizationId: undefined,
      custodian: undefined,
      caretaker: undefined,
      managementBasis: undefined,
      province: undefined,
      district: undefined,
      commune: undefined,
      verificationRequests: undefined,
      measurements: asset.measurements.map((measurement) => ({
        id: measurement.id,
        measurementType: measurement.measurementType,
        value: measurement.value,
        unit: measurement.unit,
        observedAt: measurement.observedAt,
        verificationStatus: measurement.verificationStatus,
      })),
      lifecycleEvents: asset.lifecycleEvents.map((event) => ({
        id: event.id,
        stageFrom: event.stageFrom,
        stageTo: event.stageTo,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        txSignature: event.txSignature,
      })),
      incidents: asset.incidents.map((incident) => ({ id: incident.id, type: incident.type, severity: incident.severity, detectedAt: incident.detectedAt, verificationStatus: incident.verificationStatus, status: incident.status, resolvedAt: incident.resolvedAt })),
      rightsRecords: asset.rightsRecords.map((record) => ({ id: record.id, rightType: record.rightType, holder: record.holderOrganizationId ? "Tổ chức được ghi nhận" : "Đã ẩn", validFrom: record.validFrom, validUntil: record.validUntil, verifiedStatus: record.verifiedStatus })),
      custodyRecords: asset.custodyRecords.map((record) => ({ id: record.id, physicalCustodian: record.custodianOrganizationId ? "Tổ chức lưu ký" : "Đã ẩn", location: asset.region, startAt: record.startAt, endAt: record.endAt, status: record.status })),
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
    transactions: asset.transactions.filter((transaction) => !viewerId || transaction.buyerId === viewerId).map((transaction) => ({ id: transaction.id, assetId: transaction.assetId, offerId: transaction.offerId, sellerOrganizationId: transaction.sellerOrganizationId, price: Number(transaction.price.toString()), currency: transaction.currency, transactionAt: transaction.transactionAt, custodyAfterSale: transaction.custodyAfterSale, status: transaction.status, notes: transaction.notes, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt })),
    valuations: undefined,
  };
  return base;
}
