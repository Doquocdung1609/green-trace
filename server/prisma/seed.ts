import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { canonicalHash, sha256 } from "../src/lib/hash.js";
import { recalculateTrust } from "../src/services/trustProfileService.js";
import { syncVerificationPolicies } from "../src/services/verificationPolicyEngine.js";

const db = new PrismaClient();
const passwordHash = await bcrypt.hash("GreenTrace123!", 12);
const now = new Date();
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

const [operatorOrg, fieldVerifierOrg, labOrg, reviewerOrg, buyerOrg] = await Promise.all([
  db.organization.create({ data: { name: "HTX Dược liệu Ngọc Linh", type: "COOPERATIVE", region: "Nam Trà My, Quảng Nam" } }),
  db.organization.create({ data: { name: "Trung tâm Giám định Hiện trường Miền Trung", type: "VERIFIER", region: "Đà Nẵng", verifierCategory: "FIELD_INSPECTION" } }),
  db.organization.create({ data: { name: "Phòng thí nghiệm Sinh học Xanh", type: "LAB", region: "Quảng Nam", verifierCategory: "LAB" } }),
  db.organization.create({ data: { name: "Hội đồng Rà soát Tài sản", type: "REVIEWER", region: "Hà Nội", verifierCategory: "LEGAL_REVIEW" } }),
  db.organization.create({ data: { name: "Công ty Dược Việt An", type: "BUYER", region: "TP. Hồ Chí Minh" } }),
]);

const createUser = (email: string, fullName: string, role: string, organizationId?: string) => db.user.create({ data: { email, fullName, role, passwordHash, organizationId, phone: role === "operator" ? "0900000000" : undefined, permissionsJson: JSON.stringify(role === "admin" ? ["*"] : []) } });
const [operator, operator2, fieldVerifier, labVerifier, reviewer, buyer, admin] = await Promise.all([
  createUser("operator@greentrace.vn", "Nguyễn Văn An", "operator", operatorOrg.id),
  createUser("operator2@greentrace.vn", "Hồ Thị Mai", "operator", operatorOrg.id),
  createUser("verifier@greentrace.vn", "TS. Trần Minh", "verifier", fieldVerifierOrg.id),
  createUser("lab@greentrace.vn", "Kỹ sư Lê Hà", "verifier", labOrg.id),
  createUser("reviewer@greentrace.vn", "Phạm Thu Ngân", "reviewer", reviewerOrg.id),
  createUser("buyer@greentrace.vn", "Lê Quang Huy", "buyer", buyerOrg.id),
  createUser("admin@greentrace.vn", "Quản trị GreenTrace", "admin"),
]);

await syncVerificationPolicies();
const policies = new Map((await db.verificationPolicy.findMany()).map((policy) => [policy.evidenceType, policy]));
const template = await db.assetTemplate.create({ data: {
  key: "PANAX_VIETNAMENSIS_LOT_V1", name: "Lô Sâm Ngọc Linh", assetType: "Dược liệu lâu năm",
  requiredIdentityFieldsJson: JSON.stringify(["species", "cultivar", "propagationSource", "plantedAt", "region"]), optionalFieldsJson: JSON.stringify(["scientificName", "elevationMeters", "growingAreaCode", "geographicalIndication"]),
  requiredEvidenceJson: JSON.stringify(["PHOTO", "GEO_LOCATION", "PROPAGATION_SOURCE"]), importantEvidenceJson: JSON.stringify(["GEO_LOCATION", "CERTIFICATE", "INSPECTION", "LAB_RESULT", "RIGHTS_DOCUMENT"]),
  lifecycleRulesJson: JSON.stringify({ model: "BIOLOGICAL_ONLY" }), riskRulesJson: JSON.stringify({ incidentDriven: true, freshnessDays: 90 }), readinessRulesJson: JSON.stringify(["REAL_ASSET_TRANSFER", "FINANCIAL_REVIEW"]),
  verificationProfile: { create: { name: "Xác minh lô sâm 2+1", description: "Tự kiểm tra vận hành; verifier độc lập cho dữ liệu trọng yếu.", policyKeysJson: JSON.stringify([...policies.values()].map((policy) => policy.key)) } },
} });

const scenarios = [
  ["GT-NL-2026-000128", "Lô A12 · hồ sơ đầy đủ", "INSPECTED", "READY"],
  ["GT-NL-2026-000129", "Lô B03 · thiếu chứng nhận", "GROWING", "MISSING_CERT"],
  ["GT-NL-2026-000130", "Lô C07 · cảnh báo vị trí", "PLANTED_VERIFIED", "GPS_RISK"],
  ["GT-NL-2026-000131", "Lô D02 · sự cố sâu bệnh", "GROWING", "INCIDENT"],
  ["GT-NL-2026-000132", "Lô E11 · xác minh hết hạn", "INSPECTED", "EXPIRED"],
  ["GT-NL-2026-000133", "Lô F05 · mới đăng ký", "REGISTERED", "BASIC"],
  ["GT-NL-2026-000134", "Lô G08 · đang chào bán", "MATURE", "OFFER"],
  ["GT-NL-2026-000135", "Lô H04 · đã bán, vẫn sinh trưởng", "GROWING", "SOLD"],
  ["GT-NL-2026-000136", "Lô K09 · cần bổ sung quyền", "HARVEST_READY", "RIGHTS_PENDING"],
] as const;

for (const [assetCode, displayName, currentStage, scenario] of scenarios) {
  const asset = await db.asset.create({ data: {
    assetCode, displayName, assetType: "Dược liệu lâu năm", assetLevel: "LOT", species: "Sâm Ngọc Linh", scientificName: "Panax vietnamensis", cultivar: "Sâm Ngọc Linh bản địa", propagationSource: "Vườn giống HTX Ngọc Linh", propagationBatchCode: `PB-${assetCode.slice(-3)}`, formationMethod: "Nhân giống hữu tính", plantedAt: new Date("2021-03-15"), plantedAtConfidence: "DOCUMENTED", ageBasis: "DOCUMENTED",
    initialQuantity: 1200, quantityUnit: "cây", areaHectares: 0.8, density: 1500, custodianId: scenario === "BASIC" ? operator2.id : operator.id, organizationId: operatorOrg.id, caretaker: "Tổ chăm sóc dược liệu số 2", managementBasis: "Hợp đồng giao khoán nội bộ HTX", description: "Hồ sơ demo tài sản sinh học thật; dữ liệu minh họa không phải kết luận đầu tư hoặc quyền sở hữu pháp lý.",
    region: "Nam Trà My, Quảng Nam", province: "Quảng Nam", district: "Nam Trà My", commune: "Trà Linh", exactLatitude: 15.0139, exactLongitude: 108.0061, elevationMeters: 1650, spatialType: "POINT", growingAreaCode: `NL-${assetCode.slice(-3)}`, geographicalIndication: "Ngọc Linh", templateId: template.id, currentStage, transactionStage: scenario === "SOLD" ? "SOLD" : scenario === "OFFER" ? "AVAILABLE" : "NOT_LISTED", photoUrl: "/sam-ngoc-linh.svg", metadataHash: canonicalHash({ assetCode, displayName }),
  } });
  await db.lifecycleEvent.create({ data: { assetId: asset.id, stageFrom: "REGISTERED", stageTo: "REGISTERED", eventType: "ASSET_REGISTERED", evidenceIds: "[]", approvedBy: operator.id } });
  const biologicalStages = ["REGISTERED", "PLANTED_VERIFIED", "GROWING", "INSPECTED", "MATURE", "HARVEST_READY", "HARVESTED"];
  const stageIndex = biologicalStages.indexOf(currentStage);
  for (let index = 1; index <= stageIndex; index += 1) await db.lifecycleEvent.create({ data: {
    assetId: asset.id,
    stageFrom: biologicalStages[index - 1],
    stageTo: biologicalStages[index],
    eventType: "SEEDED_BIOLOGICAL_TRANSITION",
    evidenceIds: "[]",
    approvedBy: operator.id,
    occurredAt: days(-(stageIndex - index + 1) * 30),
  } });
  const types = scenario === "BASIC" ? ["PHOTO", "PHOTO_CARE"] : scenario === "MISSING_CERT" ? ["PHOTO", "PHOTO_CARE", "GEO_LOCATION", "INSPECTION"] : ["PHOTO", "PHOTO_CARE", "GEO_LOCATION", "CERTIFICATE", "INSPECTION", "PROPAGATION_SOURCE"];
  const evidenceByType = new Map<string, string>();
  for (const [index, type] of types.entries()) {
    const policy = policies.get(type)!;
    const approved = policy.verificationRequired && !["BASIC", "MISSING_CERT", "RIGHTS_PENDING"].includes(scenario);
    const evidence = await db.evidence.create({ data: {
      assetId: asset.id, type, title: `${type} · ${displayName}`, description: "Bằng chứng demo có nguồn, thời điểm và hash nội dung.", source: type === "INSPECTION" ? fieldVerifierOrg.name : "Cán bộ hiện trường", sourceType: type === "PHOTO_CARE" ? "OPERATOR" : type === "INSPECTION" ? "THIRD_PARTY" : "DOCUMENT", observedAt: days(-20 - index), submittedBy: operator.id,
      storageUri: type === "PHOTO" ? "/sam-ngoc-linh.svg" : `private://${sha256(assetCode + type)}.pdf`, mimeType: type === "PHOTO" ? "image/svg+xml" : "application/pdf", contentHash: sha256(`${assetCode}:${type}`), visibility: type === "PHOTO" ? "PUBLIC" : type === "CERTIFICATE" ? "PARTNER" : "PRIVATE", validUntil: type === "CERTIFICATE" ? days(300) : undefined, verificationPolicyKey: policy.key, verificationStatus: !policy.verificationRequired ? "NOT_REQUIRED" : approved ? "APPROVED" : "PENDING", metadataJson: type === "GEO_LOCATION" ? JSON.stringify({ latitude: scenario === "GPS_RISK" ? 16.2 : 15.014, longitude: scenario === "GPS_RISK" ? 109.2 : 108.006 }) : undefined,
    } });
    evidenceByType.set(type, evidence.id);
    if (policy.verificationRequired && approved) await db.attestation.create({ data: { evidenceId: evidence.id, assetId: asset.id, verifierId: type === "LAB_RESULT" ? labVerifier.id : fieldVerifier.id, verifierWallet: "DemoVerifierWallet11111111111111111111111111111", scope: policy.requiredScope ?? "OTHER", decision: "APPROVED", note: "Đã đối chiếu đúng phạm vi policy; không suy rộng thành cam kết giá trị.", payloadHash: sha256(`attestation:${evidence.id}`), chainStatus: "PENDING_CHAIN", expiresAt: scenario === "EXPIRED" ? days(-2) : days(policy.expiresAfterDays ?? 365) } });
    if (policy.verificationRequired && !approved) await db.verificationRequest.create({ data: { assetId: asset.id, evidenceId: evidence.id, policyId: policy.id, requestedScope: policy.requiredScope ?? "OTHER", requiredVerifierCategory: policy.requiredVerifierCategory, requesterId: operator.id, status: "PENDING" } });
  }
  await db.biologicalMeasurement.createMany({ data: [
    { assetId: asset.id, measurementType: "HEIGHT_CM", value: String(35 + Number(assetCode.slice(-1))), unit: "cm", observedAt: days(-10), reportedById: operator.id },
    { assetId: asset.id, measurementType: "HEALTH_STATUS", value: scenario === "INCIDENT" ? "Cần xử lý sâu bệnh" : "Ổn định", unit: "trạng thái", observedAt: days(-5), reportedById: operator.id },
  ] });
  if (scenario === "INCIDENT") {
    const incident = await db.assetIncident.create({ data: { assetId: asset.id, type: "PEST", severity: "HIGH", detectedAt: days(-4), reportedById: operator.id, description: "Phát hiện dấu hiệu sâu ăn lá tại khu vực phía bắc lô.", evidenceIds: JSON.stringify([evidenceByType.get("PHOTO_CARE")]), verificationStatus: "PENDING" } });
    const incidentPolicy = policies.get("BIOLOGICAL_INCIDENT")!;
    const contentHash = sha256(`incident:${incident.id}`);
    const incidentEvidence = await db.evidence.create({ data: { assetId: asset.id, type: "BIOLOGICAL_INCIDENT", title: "Sự cố sâu bệnh mức HIGH", description: incident.description, source: "Hệ thống sự cố GreenTrace", sourceType: "SYSTEM", observedAt: incident.detectedAt, submittedBy: operator.id, storageUri: `private://incident-${contentHash}.json`, mimeType: "application/json", contentHash, visibility: "PRIVATE", verificationStatus: "PENDING", verificationPolicyKey: incidentPolicy.key, metadataJson: JSON.stringify({ incidentId: incident.id, severity: incident.severity }) } });
    await db.verificationRequest.create({ data: { assetId: asset.id, evidenceId: incidentEvidence.id, policyId: incidentPolicy.id, requestedScope: "BIOLOGICAL_HEALTH", requesterId: operator.id, priority: "HIGH" } });
  }
  if (scenario === "READY") await db.assetIncident.create({ data: {
    assetId: asset.id,
    type: "PEST",
    severity: "MEDIUM",
    detectedAt: days(-45),
    reportedById: operator.id,
    description: "Sự cố sâu bệnh đã xử lý, lưu lại để minh họa lịch sử rủi ro.",
    evidenceIds: "[]",
    verificationStatus: "APPROVED",
    status: "RESOLVED",
    resolvedAt: days(-30),
    resolutionNote: "Đã xử lý sinh học và theo dõi ổn định trong hai tuần.",
  } });
  const rights = await db.rightsRecord.create({ data: { assetId: asset.id, rightType: "QUYỀN SỞ HỮU TÀI SẢN SINH HỌC", holder: operatorOrg.name, holderOrganizationId: operatorOrg.id, validFrom: new Date("2021-03-15"), verifiedStatus: scenario === "RIGHTS_PENDING" ? "PENDING" : "APPROVED" } });
  const care = await db.careAgreement.create({ data: { assetId: asset.id, caretakerOrganizationId: operatorOrg.id, serviceTerms: "Chăm sóc theo quy trình nội bộ HTX và ghi nhật ký định kỳ.", careFee: 1_200_000, currency: "VND", careFrequency: "Hàng tuần", responsibility: "HTX duy trì điều kiện sinh trưởng và báo cáo sự cố.", riskAllocationSummary: "Rủi ro sinh học được ghi nhận, không cam kết lợi nhuận.", startsAt: new Date("2021-03-15") } });
  await db.custodyRecord.create({ data: { assetId: asset.id, physicalCustodian: operatorOrg.name, custodianOrganizationId: operatorOrg.id, location: "Trà Linh, Nam Trà My", startAt: new Date("2021-03-15"), careAgreementId: care.id, status: "ACTIVE" } });
  if (["OFFER", "SOLD"].includes(scenario)) {
    const offer = await db.assetOffer.create({ data: { assetId: asset.id, askingPrice: scenario === "SOLD" ? 180_000_000 : 210_000_000, sellerOrganizationId: operatorOrg.id, careAfterSaleAvailable: true, careTermsSummary: "Có thể tiếp tục lưu ký và chăm sóc tại HTX.", status: scenario === "SOLD" ? "SOLD" : "AVAILABLE" } });
    if (scenario === "SOLD") await db.assetTransaction.create({ data: { assetId: asset.id, offerId: offer.id, buyerId: buyer.id, sellerOrganizationId: operatorOrg.id, price: offer.askingPrice, currency: "VND", rightsDocumentEvidenceId: evidenceByType.get("CERTIFICATE"), custodyAfterSale: "SELLER_OR_HTX", status: "COMPLETED", notes: "Giao dịch demo; bán quyền không tự động thay đổi trạng thái sinh học hoặc nơi lưu ký." } });
  }
  await recalculateTrust(asset.id);
  const refreshed = await db.asset.findUniqueOrThrow({ where: { id: asset.id }, include: { trustProfile: true, readinessProfiles: true } });
  await db.digitalPassport.create({ data: { assetId: asset.id, version: 1, passportHash: canonicalHash({ assetCode, trust: refreshed.trustProfile?.totalScore, rights: rights.verifiedStatus }), readinessStatus: refreshed.readinessProfiles.find((item) => item.purpose === "FINANCIAL_REVIEW")?.status ?? "NOT_READY" } });
}

const reviewAsset = await db.asset.findUniqueOrThrow({ where: { assetCode: "GT-NL-2026-000128" }, include: { readinessProfiles: true } });
await db.reviewCase.create({ data: { purpose: "REAL_ASSET_TRANSFER", assetId: reviewAsset.id, requestedById: operator.id, reviewerId: reviewer.id, status: "PENDING", summarySnapshot: JSON.stringify(reviewAsset.readinessProfiles) } });
await db.auditLog.create({ data: { userId: admin.id, action: "DEMO_DATA_SEEDED", entityType: "System", metadata: JSON.stringify({ assets: scenarios.length, buyer: buyer.email }) } });
console.log("Seeded GreenTrace 3.0: five organizations, seven accounts and nine biological assets.");
await db.$disconnect();
