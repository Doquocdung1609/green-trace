import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { canonicalHash, sha256 } from "../src/lib/hash.js";
import { recalculateTrust } from "../src/services/trustProfileService.js";
import { syncVerificationPolicies } from "../src/services/verificationPolicyEngine.js";

const db = new PrismaClient();
const passwordHash = await bcrypt.hash("GreenTrace123!", 12);
const now = new Date("2026-09-30T02:00:00.000Z");
const days = (count: number) => new Date(now.getTime() + count * 86_400_000);

await db.auditLog.deleteMany();
await db.blockchainTransaction.deleteMany();
await db.digitalPassport.deleteMany();
await db.fulfillmentRequest.deleteMany();
await db.reviewCase.deleteMany();
await db.assetTransaction.deleteMany();
await db.assetOffer.deleteMany();
await db.custodyRecord.deleteMany();
await db.careAgreement.deleteMany();
await db.rightsRecord.deleteMany();
await db.assetValuation.deleteMany();
await db.readinessProfile.deleteMany();
await db.riskProfile.deleteMany();
await db.trustProfile.deleteMany();
await db.biologicalMeasurement.deleteMany();
await db.assetIncident.deleteMany();
await db.lifecycleEvent.deleteMany();
await db.attestation.deleteMany();
await db.verificationRequest.deleteMany();
await db.evidence.deleteMany();
await db.asset.deleteMany();
await db.verificationProfile.deleteMany();
await db.assetTemplate.deleteMany();
await db.verificationPolicy.deleteMany();
await db.user.deleteMany();
await db.organization.deleteMany();

const [operatorOrg, fieldVerifierOrg, labOrg, reviewerOrg, buyerOrg] =
  await Promise.all([
    db.organization.create({
      data: {
        name: "DEMO DATA · HTX Dược liệu Ngọc Linh",
        type: "COOPERATIVE",
        region: "Nam Trà My, Quảng Nam",
      },
    }),
    db.organization.create({
      data: {
        name: "DEMO DATA · Trung tâm Giám định Hiện trường",
        type: "VERIFIER",
        region: "Đà Nẵng",
        verifierCategory: "FIELD_INSPECTION",
      },
    }),
    db.organization.create({
      data: {
        name: "DEMO DATA · Phòng thí nghiệm Sinh học Xanh",
        type: "LAB",
        region: "Quảng Nam",
        verifierCategory: "LAB",
      },
    }),
    db.organization.create({
      data: {
        name: "DEMO DATA · Hội đồng Rà soát Tài sản",
        type: "REVIEWER",
        region: "Hà Nội",
      },
    }),
    db.organization.create({
      data: {
        name: "DEMO DATA · Công ty Dược Việt An",
        type: "BUYER",
        region: "TP. Hồ Chí Minh",
      },
    }),
  ]);

const createUser = (
  email: string,
  fullName: string,
  role: string,
  organizationId?: string,
) =>
  db.user.create({
    data: {
      email,
      fullName: `DEMO DATA · ${fullName}`,
      role,
      passwordHash,
      organizationId,
      phone: role === "operator" ? "0900000000" : undefined,
      permissionsJson: JSON.stringify(role === "admin" ? ["*"] : []),
    },
  });

const [
  operator,
  operator2,
  fieldVerifier,
  labVerifier,
  reviewer,
  reviewer2,
  buyer,
  admin,
] = await Promise.all([
  createUser("operator@greentrace.vn", "Nguyễn Văn An", "operator", operatorOrg.id),
  createUser("operator2@greentrace.vn", "Hồ Thị Mai", "operator", operatorOrg.id),
  createUser("verifier@greentrace.vn", "TS. Trần Minh", "verifier", fieldVerifierOrg.id),
  createUser("lab@greentrace.vn", "Kỹ sư Lê Hà", "verifier", labOrg.id),
  createUser("reviewer@greentrace.vn", "Phạm Thu Ngân", "reviewer", reviewerOrg.id),
  createUser("reviewer2@greentrace.vn", "Vũ Đức Long", "reviewer", reviewerOrg.id),
  createUser("buyer@greentrace.vn", "Lê Quang Huy", "buyer", buyerOrg.id),
  createUser("admin@greentrace.vn", "Quản trị GreenTrace", "admin"),
]);
void reviewer2;
void labVerifier;

await syncVerificationPolicies();
const policies = new Map(
  (await db.verificationPolicy.findMany()).map((policy) => [
    policy.evidenceType,
    policy,
  ]),
);

const readinessRules = {
  REAL_ASSET_TRANSFER: {
    minIdentityScore: 16,
    requireVerifiedLocation: true,
    requireVerifiedRights: true,
    requireActiveCustody: true,
    blockedIncidentSeverities: ["HIGH", "CRITICAL"],
  },
  FINANCIAL_REVIEW: {
    minIdentityScore: 18,
    minTrustScore: 70,
    minVerificationScore: 21,
    minFreshnessScore: 9,
    requireVerifiedCertificate: true,
    maximumRisk: "MEDIUM",
  },
};
const template = await db.assetTemplate.create({
  data: {
    key: "PANAX_VIETNAMENSIS_LOT_V1",
    name: "DEMO DATA · Sâm Ngọc Linh v1",
    assetType: "Dược liệu lâu năm",
    prefix: "NL",
    requiredIdentityFieldsJson: JSON.stringify([
      "species",
      "scientificName",
      "propagationSource",
      "plantedAt",
      "ageBasis",
      "location",
      "elevationMeters",
      "managementEntity",
    ]),
    optionalFieldsJson: JSON.stringify([
      "cultivar",
      "growingAreaCode",
      "geographicalIndication",
    ]),
    requiredEvidenceJson: JSON.stringify([
      "PHOTO",
      "GEO_LOCATION",
      "PROPAGATION_SOURCE",
      "AGE_DOCUMENT",
      "CERTIFICATE",
      "INSPECTION",
    ]),
    importantEvidenceJson: JSON.stringify([
      "PHOTO",
      "GEO_LOCATION",
      "PROPAGATION_SOURCE",
      "AGE_DOCUMENT",
      "CERTIFICATE",
      "INSPECTION",
      "RIGHTS_DOCUMENT",
    ]),
    lifecycleRulesJson: JSON.stringify({ model: "BIOLOGICAL_ONLY" }),
    riskRulesJson: JSON.stringify({
      criticalFreshnessDays: 365,
      operationalFreshnessDays: 90,
      certificateRequired: true,
      locationVerificationRequired: true,
      custodyRequiredAfterSale: true,
      signals: [
        "STALE_CERTIFICATE",
        "STALE_LOCATION",
        "OPEN_DISEASE_OR_PEST",
        "GEO_INCONSISTENCY",
        "CUSTODY_GAP",
      ],
    }),
    readinessRulesJson: JSON.stringify(readinessRules),
    verificationProfile: {
      create: {
        name: "DEMO DATA · Xác minh lô sâm 2+1",
        description:
          "Dữ liệu vận hành tự kiểm tra; bằng chứng trọng yếu cần verifier độc lập.",
        policyKeysJson: JSON.stringify(
          [...policies.values()].map((policy) => policy.key),
        ),
      },
    },
  },
});

await db.assetTemplate.create({
  data: {
    key: "GENERIC_BIOLOGICAL_ASSET_V1",
    name: "DEMO DATA · Tài sản sinh học generic v1",
    assetType: "Tài sản sinh học",
    prefix: "GN",
    requiredIdentityFieldsJson: JSON.stringify([
      "species",
      "plantedAt",
      "location",
      "managementEntity",
    ]),
    optionalFieldsJson: "[]",
    requiredEvidenceJson: JSON.stringify(["PHOTO", "GEO_LOCATION"]),
    importantEvidenceJson: JSON.stringify(["GEO_LOCATION", "INSPECTION"]),
    lifecycleRulesJson: JSON.stringify({ model: "BIOLOGICAL_ONLY" }),
    riskRulesJson: JSON.stringify({
      criticalFreshnessDays: 365,
      operationalFreshnessDays: 90,
      certificateRequired: false,
    }),
    readinessRulesJson: JSON.stringify(readinessRules),
  },
});

type Scenario =
  | "GOOD"
  | "STALE_CERTIFICATE"
  | "HIGH_DISEASE"
  | "RESOLVED_INCIDENT"
  | "AVAILABLE_FOR_SALE"
  | "SOLD_STILL_GROWING"
  | "HARVEST_READY";

const scenarios: Array<{
  code: string;
  name: string;
  stage: string;
  scenario: Scenario;
}> = [
  { code: "GT-NL-2026-DEMOA001", name: "DEMO DATA · Asset A · hồ sơ tốt", stage: "INSPECTED", scenario: "GOOD" },
  { code: "GT-NL-2026-DEMOB002", name: "DEMO DATA · Asset B · chứng nhận cũ", stage: "GROWING", scenario: "STALE_CERTIFICATE" },
  { code: "GT-NL-2026-DEMOC003", name: "DEMO DATA · Asset C · HIGH disease", stage: "GROWING", scenario: "HIGH_DISEASE" },
  { code: "GT-NL-2026-DEMOD004", name: "DEMO DATA · Asset D · sự cố đã xác minh khắc phục", stage: "GROWING", scenario: "RESOLVED_INCIDENT" },
  { code: "GT-NL-2026-DEMOE005", name: "DEMO DATA · Asset E · đang chào bán", stage: "MATURE", scenario: "AVAILABLE_FOR_SALE" },
  { code: "GT-NL-2026-DEMOF006", name: "DEMO DATA · Asset F · đã bán, vẫn sinh trưởng", stage: "GROWING", scenario: "SOLD_STILL_GROWING" },
  { code: "GT-NL-2026-DEMOG007", name: "DEMO DATA · Asset G · sẵn sàng thu hoạch", stage: "HARVEST_READY", scenario: "HARVEST_READY" },
];

const createAttestation = async (
  evidence: { id: string; assetId: string; type: string },
  expiresAt = days(330),
) => {
  const policy = policies.get(evidence.type)!;
  return db.attestation.create({
    data: {
      evidenceId: evidence.id,
      assetId: evidence.assetId,
      verifierId: fieldVerifier.id,
      verifierWallet: "DemoVerifierWallet11111111111111111111111111111",
      scope: policy.requiredScope ?? "OTHER",
      decision: "APPROVED",
      note: "DEMO DATA · Đã đối chiếu đúng phạm vi policy; không kết luận giá trị hay quyền sở hữu pháp lý.",
      payloadHash: sha256(`DEMO:${evidence.id}`),
      txSignature: `DEMO${sha256(evidence.id).slice(0, 60)}`,
      chainStatus: "CONFIRMED",
      expiresAt,
    },
  });
};

for (const item of scenarios) {
  const asset = await db.asset.create({
    data: {
      assetCode: item.code,
      displayName: item.name,
      assetType: "Dược liệu lâu năm",
      assetLevel: "LOT",
      species: "Sâm Ngọc Linh",
      scientificName: "Panax vietnamensis",
      cultivar: "Sâm Ngọc Linh bản địa",
      propagationSource: "DEMO DATA · Vườn giống HTX Ngọc Linh",
      propagationBatchCode: `DEMO-${item.code.slice(-4)}`,
      formationMethod: "Nhân giống hữu tính",
      plantedAt: new Date("2021-03-15T00:00:00.000Z"),
      plantedAtConfidence: "DOCUMENTED",
      ageBasis: "DOCUMENTED",
      initialQuantity: 1200,
      quantityUnit: "cây",
      areaHectares: 0.8,
      density: 1500,
      custodianId: operator.id,
      organizationId: operatorOrg.id,
      caretaker: "DEMO DATA · Tổ chăm sóc số 2",
      managementBasis: "DEMO DATA · Hợp đồng giao khoán nội bộ",
      description:
        "DEMO DATA · Hồ sơ minh họa; không phải kết luận đầu tư, định giá hoặc chứng nhận quyền sở hữu pháp lý.",
      region: "Nam Trà My, Quảng Nam",
      province: "Quảng Nam",
      district: "Nam Trà My",
      commune: "Trà Linh",
      exactLatitude: 15.0139,
      exactLongitude: 108.0061,
      elevationMeters: 1650,
      spatialType: "POINT",
      growingAreaCode: `DEMO-${item.code.slice(-4)}`,
      geographicalIndication: "Ngọc Linh",
      templateId: template.id,
      currentStage: item.stage,
      transactionStage:
        item.scenario === "SOLD_STILL_GROWING"
          ? "SOLD"
          : item.scenario === "AVAILABLE_FOR_SALE"
            ? "AVAILABLE"
            : "NOT_LISTED",
      photoUrl: "/sam-ngoc-linh.svg",
      metadataHash: canonicalHash({ code: item.code, marker: "DEMO DATA" }),
    },
  });
  await db.lifecycleEvent.create({
    data: {
      assetId: asset.id,
      stageFrom: "REGISTERED",
      stageTo: item.stage,
      eventType: "DEMO_DATA_BIOLOGICAL_TRANSITION",
      evidenceIds: "[]",
      approvedBy: operator.id,
      occurredAt: days(-40),
    },
  });

  const evidenceByType = new Map<string, string>();
  for (const [index, type] of [
    "PHOTO",
    "PHOTO_CARE",
    "GEO_LOCATION",
    "PROPAGATION_SOURCE",
    "AGE_DOCUMENT",
    "CERTIFICATE",
    "INSPECTION",
    "RIGHTS_DOCUMENT",
  ].entries()) {
    const policy = policies.get(type)!;
    const stale = item.scenario === "STALE_CERTIFICATE" && type === "CERTIFICATE";
    const observedAt = stale ? days(-430) : days(-14 - index);
    const evidence = await db.evidence.create({
      data: {
        assetId: asset.id,
        type,
        title: `DEMO DATA · ${type} · ${item.name}`,
        description: "DEMO DATA · Bằng chứng minh họa có nguồn, thời điểm và hash nội dung.",
        source: "DEMO DATA · Cán bộ hiện trường",
        sourceType: type === "PHOTO_CARE" ? "OPERATOR" : "DOCUMENT",
        observedAt,
        submittedBy: operator.id,
        storageUri:
          type === "PHOTO"
            ? "/sam-ngoc-linh.svg"
            : `private://${sha256(`${item.code}:${type}`)}.pdf`,
        mimeType: type === "PHOTO" ? "image/svg+xml" : "application/pdf",
        contentHash: sha256(`DEMO:${item.code}:${type}`),
        visibility:
          type === "PHOTO"
            ? "PUBLIC"
            : ["CERTIFICATE", "INSPECTION"].includes(type)
              ? "PARTNER"
              : "PRIVATE",
        validUntil:
          type === "CERTIFICATE" ? (stale ? days(-65) : days(300)) : undefined,
        verificationPolicyKey: policy.key,
        verificationStatus: policy.verificationRequired ? "APPROVED" : "NOT_REQUIRED",
        metadataJson:
          type === "GEO_LOCATION"
            ? JSON.stringify({ latitude: 15.0139, longitude: 108.0061 })
            : undefined,
      },
    });
    evidenceByType.set(type, evidence.id);
    if (policy.verificationRequired)
      await createAttestation(evidence, stale ? days(-65) : days(330));
  }

  await db.biologicalMeasurement.create({
    data: {
      assetId: asset.id,
      measurementType: "HEALTH_STATUS",
      value: item.scenario === "HIGH_DISEASE" ? "Đang xử lý" : "Ổn định",
      unit: "trạng thái",
      observedAt: days(-5),
      reportedById: operator.id,
    },
  });

  if (item.scenario === "HIGH_DISEASE") {
    const incident = await db.assetIncident.create({
      data: {
        assetId: asset.id,
        type: "DISEASE",
        severity: "HIGH",
        detectedAt: days(-4),
        reportedById: operator.id,
        description: "DEMO DATA · Bệnh lá mức HIGH đang mở.",
        evidenceIds: JSON.stringify([evidenceByType.get("PHOTO_CARE")]),
        verificationStatus: "PENDING",
      },
    });
    const policy = policies.get("BIOLOGICAL_INCIDENT")!;
    const evidence = await db.evidence.create({
      data: {
        assetId: asset.id,
        type: "BIOLOGICAL_INCIDENT",
        title: "DEMO DATA · Sự cố bệnh HIGH",
        description: incident.description,
        source: "DEMO DATA · Hệ thống sự cố",
        sourceType: "SYSTEM",
        observedAt: incident.detectedAt,
        submittedBy: operator.id,
        storageUri: `private://demo-incident-${incident.id}.json`,
        mimeType: "application/json",
        contentHash: sha256(`DEMO:incident:${incident.id}`),
        visibility: "PRIVATE",
        verificationStatus: "PENDING",
        verificationPolicyKey: policy.key,
        metadataJson: JSON.stringify({ incidentId: incident.id, severity: "HIGH" }),
      },
    });
    await db.verificationRequest.create({
      data: {
        assetId: asset.id,
        evidenceId: evidence.id,
        policyId: policy.id,
        requestedScope: "BIOLOGICAL_HEALTH",
        requesterId: operator.id,
        priority: "HIGH",
      },
    });
  }

  if (item.scenario === "RESOLVED_INCIDENT") {
    const incident = await db.assetIncident.create({
      data: {
        assetId: asset.id,
        type: "PEST",
        severity: "HIGH",
        detectedAt: days(-35),
        reportedById: operator.id,
        description: "DEMO DATA · Sự cố sâu bệnh đã qua quy trình khắc phục.",
        status: "RESOLUTION_PENDING_VERIFICATION",
        verificationStatus: "PENDING",
      },
    });
    const policy = policies.get("INCIDENT_RESOLUTION")!;
    const resolution = await db.evidence.create({
      data: {
        assetId: asset.id,
        type: "INCIDENT_RESOLUTION",
        title: "DEMO DATA · Bằng chứng khắc phục sự cố",
        description: "DEMO DATA · Theo dõi ổn định sau xử lý sinh học.",
        source: "DEMO DATA · Cán bộ hiện trường",
        sourceType: "DOCUMENT",
        observedAt: days(-20),
        submittedBy: operator.id,
        storageUri: `private://demo-resolution-${incident.id}.pdf`,
        mimeType: "application/pdf",
        contentHash: sha256(`DEMO:resolution:${incident.id}`),
        visibility: "PRIVATE",
        verificationStatus: "APPROVED",
        verificationPolicyKey: policy.key,
        metadataJson: JSON.stringify({ incidentId: incident.id }),
      },
    });
    await createAttestation(resolution);
    await db.assetIncident.update({
      where: { id: incident.id },
      data: {
        status: "RESOLVED",
        verificationStatus: "APPROVED",
        resolutionEvidenceId: resolution.id,
        resolvedAt: days(-18),
        resolutionNote: "DEMO DATA · Verifier đã xác nhận bằng chứng khắc phục.",
      },
    });
  }

  const rightsDocumentId = evidenceByType.get("RIGHTS_DOCUMENT")!;
  const rights = await db.rightsRecord.create({
    data: {
      assetId: asset.id,
      rightType: "CONTRACTUAL_ASSET_RIGHT",
      holder: operatorOrg.name,
      holderOrganizationId: operatorOrg.id,
      basisDocumentEvidenceId: rightsDocumentId,
      validFrom: new Date("2021-03-15T00:00:00.000Z"),
      verifiedStatus: "APPROVED",
    },
  });
  const care = await db.careAgreement.create({
    data: {
      assetId: asset.id,
      caretakerOrganizationId: operatorOrg.id,
      serviceTerms: "DEMO DATA · Chăm sóc theo quy trình và ghi nhật ký định kỳ.",
      careFee: "1200000",
      currency: "VND",
      careFrequency: "Hàng tuần",
      responsibility: "DEMO DATA · HTX duy trì điều kiện sinh trưởng.",
      riskAllocationSummary: "DEMO DATA · Ghi nhận rủi ro, không cam kết lợi nhuận.",
      startsAt: new Date("2021-03-15T00:00:00.000Z"),
    },
  });
  await db.custodyRecord.create({
    data: {
      assetId: asset.id,
      physicalCustodian: operatorOrg.name,
      custodianOrganizationId: operatorOrg.id,
      location: "DEMO DATA · Trà Linh, Nam Trà My",
      startAt: new Date("2021-03-15T00:00:00.000Z"),
      careAgreementId: care.id,
      status: "ACTIVE",
    },
  });

  if (item.scenario === "AVAILABLE_FOR_SALE") {
    await db.assetOffer.create({
      data: {
        assetId: asset.id,
        askingPrice: "210000000",
        sellerOrganizationId: operatorOrg.id,
        careAfterSaleAvailable: true,
        careTermsSummary: "DEMO DATA · Có thể tiếp tục lưu ký và chăm sóc tại HTX.",
        status: "AVAILABLE",
      },
    });
  }

  if (item.scenario === "SOLD_STILL_GROWING") {
    const offer = await db.assetOffer.create({
      data: {
        assetId: asset.id,
        askingPrice: "180000000",
        sellerOrganizationId: operatorOrg.id,
        status: "SOLD",
        reservedBuyerId: buyer.id,
        reservedAt: days(-20),
      },
    });
    const transactionAt = days(-15);
    const transaction = await db.assetTransaction.create({
      data: {
        assetId: asset.id,
        offerId: offer.id,
        buyerId: buyer.id,
        sellerOrganizationId: operatorOrg.id,
        price: offer.askingPrice,
        currency: "VND",
        rightsDocumentEvidenceId: rightsDocumentId,
        custodyAfterSale: "SELLER_OR_HTX",
        status: "COMPLETED",
        transactionAt,
        notes: "DEMO DATA · Chuyển quyền theo hợp đồng; custody và vòng đời sinh học giữ nguyên.",
      },
    });
    await db.rightsRecord.update({
      where: { id: rights.id },
      data: { validUntil: transactionAt },
    });
    await db.rightsRecord.create({
      data: {
        assetId: asset.id,
        rightType: "CONTRACTUAL_ECONOMIC_RIGHT",
        holder: buyer.fullName,
        holderOrganizationId: buyer.organizationId,
        basisDocumentEvidenceId: rightsDocumentId,
        validFrom: transaction.transactionAt,
        verifiedStatus: "APPROVED",
      },
    });
  }

  if (item.scenario === "HARVEST_READY") {
    const policy = policies.get("HARVEST_RECORD")!;
    const harvest = await db.evidence.create({
      data: {
        assetId: asset.id,
        type: "HARVEST_RECORD",
        title: "DEMO DATA · Hồ sơ sẵn sàng thu hoạch",
        source: "DEMO DATA · Cán bộ hiện trường",
        sourceType: "DOCUMENT",
        observedAt: days(-3),
        submittedBy: operator.id,
        storageUri: `private://demo-harvest-${asset.id}.pdf`,
        mimeType: "application/pdf",
        contentHash: sha256(`DEMO:harvest:${asset.id}`),
        visibility: "PARTNER",
        verificationStatus: "APPROVED",
        verificationPolicyKey: policy.key,
      },
    });
    await createAttestation(harvest);
  }

  const profile = await recalculateTrust(asset.id);
  await db.digitalPassport.create({
    data: {
      assetId: asset.id,
      version: 1,
      passportHash: canonicalHash({
        marker: "DEMO DATA",
        assetCode: item.code,
        trust: profile.totalScore,
      }),
      readinessStatus:
        profile.readinessProfiles.find(
          (readiness) => readiness.purpose === "FINANCIAL_REVIEW",
        )?.status ?? "NOT_READY",
    },
  });
}

const reviewAsset = await db.asset.findUniqueOrThrow({
  where: { assetCode: "GT-NL-2026-DEMOA001" },
  include: { readinessProfiles: true },
});
await db.reviewCase.create({
  data: {
    purpose: "REAL_ASSET_TRANSFER",
    assetId: reviewAsset.id,
    requestedById: operator.id,
    status: "PENDING",
    summarySnapshot: JSON.stringify(reviewAsset.readinessProfiles),
  },
});
await db.auditLog.create({
  data: {
    userId: admin.id,
    action: "DEMO_DATA_SEEDED",
    entityType: "System",
    metadata: JSON.stringify({
      marker: "DEMO DATA",
      assets: scenarios.length,
      reviewers: [reviewer.email, reviewer2.email],
      buyer: buyer.email,
      secondaryOperator: operator2.email,
    }),
  },
});
console.log("Seeded deterministic DEMO DATA: seven final hardening scenarios.");
await db.$disconnect();
