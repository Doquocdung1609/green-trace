import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const operator = request.agent(app);
const verifier = request.agent(app);
const sameOrgVerifier = request.agent(app);
const reviewer = request.agent(app);
const buyer = request.agent(app);
const admin = request.agent(app);
let assetId = "";
let assetCode = "";
let materialEvidenceId = "";
let materialRequestId = "";
let operator2Id = "";
let buyerId = "";

describe.sequential("GreenTrace 3.0 product acceptance", () => {
  it("authenticates all product roles and exposes policy/template configuration", async () => {
    for (const [agent, email] of [[operator, "operator@greentrace.vn"], [verifier, "verifier@greentrace.vn"], [reviewer, "reviewer@greentrace.vn"], [buyer, "buyer@greentrace.vn"], [admin, "admin@greentrace.vn"]] as const) {
      const response = await agent.post("/api/auth/login").send({ email, password: "GreenTrace123!" });
      expect(response.status).toBe(200);
      if (email.startsWith("buyer")) buyerId = response.body.user.id;
    }
    const policy = await admin.get("/api/admin/policy");
    expect(policy.status).toBe(200);
    expect(policy.body.verificationPolicies.length).toBeGreaterThan(10);
    expect(policy.body.assetTemplates[0].name).toContain("Sâm Ngọc Linh");
  });

  it("creates a structured biological asset", async () => {
    const response = await operator.post("/api/assets").send({
      displayName: "Lô kiểm thử 3.0", assetType: "Dược liệu lâu năm", assetLevel: "LOT", species: "Sâm Ngọc Linh", scientificName: "Panax vietnamensis", propagationSource: "Vườn giống kiểm thử", plantedAt: "2023-01-01", plantedAtConfidence: "DOCUMENTED", ageBasis: "DOCUMENTED", initialQuantity: 50, quantityUnit: "cây", description: "Hồ sơ được tạo trong kiểm thử tích hợp GreenTrace 3.0.", region: "Nam Trà My, Quảng Nam", exactLatitude: 15.01, exactLongitude: 108.01,
    });
    expect(response.status).toBe(201);
    assetId = response.body.asset.id;
    assetCode = response.body.asset.assetCode;
    expect(response.body.asset.currentStage).toBe("REGISTERED");
  });

  it("does not create a verifier request for operational evidence", async () => {
    const uploaded = await operator.post(`/api/assets/${assetId}/evidence`).field("type", "PHOTO_CARE").field("title", "Ảnh chăm sóc thường kỳ").field("source", "Tổ chăm sóc").field("sourceType", "OPERATOR").field("observedAt", new Date().toISOString()).field("visibility", "PRIVATE").attach("file", Buffer.from("care photo"), { filename: "care.txt", contentType: "text/plain" });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.evidence.verificationStatus).toBe("NOT_REQUIRED");
    const asset = await operator.get(`/api/assets/${assetId}`);
    expect(asset.body.asset.verificationRequests.some((item: { evidenceId: string }) => item.evidenceId === uploaded.body.evidence.id)).toBe(false);
  });

  it("automatically creates a material request and blocks same-organization verification", async () => {
    const uploaded = await operator.post(`/api/assets/${assetId}/evidence`).field("type", "INSPECTION").field("title", "Biên bản kiểm tra độc lập").field("source", "Hiện trường").field("sourceType", "THIRD_PARTY").field("observedAt", new Date().toISOString()).field("visibility", "PARTNER").attach("file", Buffer.from("inspection"), { filename: "inspection.txt", contentType: "text/plain" });
    expect(uploaded.status).toBe(201);
    materialEvidenceId = uploaded.body.evidence.id;
    const asset = await operator.get(`/api/assets/${assetId}`);
    const autoRequest = asset.body.asset.verificationRequests.find((item: { evidenceId: string }) => item.evidenceId === materialEvidenceId);
    expect(autoRequest.requestedScope).toBe("EXISTENCE");
    materialRequestId = autoRequest.id;
    const users = await admin.get("/api/admin/users");
    operator2Id = users.body.users.find((item: { email: string }) => item.email === "operator2@greentrace.vn").id;
    expect((await admin.patch(`/api/admin/users/${operator2Id}/role`).send({ role: "verifier" })).status).toBe(200);
    expect((await sameOrgVerifier.post("/api/auth/login").send({ email: "operator2@greentrace.vn", password: "GreenTrace123!" })).status).toBe(200);
    const blocked = await sameOrgVerifier.post(`/api/verification-requests/${materialRequestId}/payload`).send({ scope: "EXISTENCE", note: "Không được tự xác minh cùng tổ chức.", verifierWallet: "11111111111111111111111111111111" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toContain("tổ chức độc lập");
  });

  it("allows a verifier from another organization to approve within policy scope", async () => {
    const verifierWallet = "11111111111111111111111111111111";
    const note = "Đã đối chiếu sự tồn tại trong phạm vi biên bản.";
    const payload = await verifier.post(`/api/verification-requests/${materialRequestId}/payload`).send({ scope: "EXISTENCE", note, verifierWallet });
    expect(payload.status).toBe(200);
    const approved = await verifier.post(`/api/verification-requests/${materialRequestId}/approve`).send({ scope: "EXISTENCE", note, verifierWallet, payloadHash: payload.body.payloadHash, txSignature: "2".repeat(64) });
    expect(approved.status).toBe(200);
    expect(approved.body.attestation.decision).toBe("APPROVED");
  });

  it("raises biological risk from a material incident while keeping trust separate", async () => {
    const before = await operator.get(`/api/assets/${assetId}`);
    const incident = await operator.post(`/api/assets/${assetId}/incidents`).send({ type: "DISEASE", severity: "HIGH", detectedAt: new Date().toISOString(), description: "Phát hiện bệnh lá cần xử lý và xác minh.", evidenceIds: [] });
    expect(incident.status).toBe(201);
    expect(incident.body.incident.evidenceIds).toHaveLength(1);
    const incidentEvidence = incident.body.incident.evidenceIds[0];
    const incidentFile = await verifier.get(`/api/evidence/${incidentEvidence}/file`);
    expect(incidentFile.status).toBe(200);
    expect(incidentFile.body.severity).toBe("HIGH");
    const risk = await operator.get(`/api/assets/${assetId}/risk`);
    expect(["HIGH", "CRITICAL"]).toContain(risk.body.riskProfile.overallRisk);
    const after = await operator.get(`/api/assets/${assetId}`);
    expect(after.body.asset.trustProfile.totalScore).toBeLessThanOrEqual(before.body.asset.trustProfile.totalScore);
    expect(after.body.asset.trustProfile.overallRisk).toBeUndefined();
    expect(after.body.asset.riskProfile.totalScore).toBeUndefined();
    expect((await operator.patch(`/api/incidents/${incident.body.incident.id}`).send({ status: "RESOLVED", resolutionNote: "Đã xử lý trong kiểm thử." })).status).toBe(200);
    const resolvedRisk = await operator.get(`/api/assets/${assetId}/risk`);
    expect(resolvedRisk.body.riskProfile.biologicalRisk).toBe("LOW");
    expect(resolvedRisk.body.riskProfile.openIncidentCount).toBe(0);
  });

  it("records rights and custody independently", async () => {
    expect((await operator.post(`/api/assets/${assetId}/rights`).send({ rightType: "QUYỀN SỞ HỮU", holder: "HTX kiểm thử", validFrom: "2023-01-01", verifiedStatus: "APPROVED" })).status).toBe(201);
    expect((await operator.post(`/api/assets/${assetId}/custody`).send({ physicalCustodian: "Kho sinh học HTX", location: "Nam Trà My", startAt: "2023-01-01", status: "ACTIVE" })).status).toBe(201);
    const current = await operator.get(`/api/assets/${assetId}`);
    expect(current.body.asset.rightsRecords[0].holder).toBe("HTX kiểm thử");
    expect(current.body.asset.custodyRecords[0].physicalCustodian).toBe("Kho sinh học HTX");
  });

  it("supports outright purchase without changing biological lifecycle or custody", async () => {
    const offer = await operator.post(`/api/assets/${assetId}/offers`).send({ saleMode: "OUTRIGHT_PURCHASE", askingPrice: 123000000, currency: "VND", careAfterSaleAvailable: true, careTermsSummary: "Tiếp tục chăm sóc tại HTX." });
    expect(offer.status).toBe(201);
    expect((await buyer.post(`/api/offers/${offer.body.offer.id}/purchase-request`).send({ notes: "Đề nghị mua kiểm thử" })).status).toBe(201);
    const rightsDocument = await operator.post(`/api/assets/${assetId}/evidence`).field("type", "RIGHTS_DOCUMENT").field("title", "Tài liệu chuyển quyền").field("source", "Bộ phận pháp lý").field("sourceType", "DOCUMENT").field("observedAt", new Date().toISOString()).field("visibility", "PRIVATE").attach("file", Buffer.from("rights"), { filename: "rights.txt", contentType: "text/plain" });
    const completed = await operator.post(`/api/assets/${assetId}/transactions`).send({ offerId: offer.body.offer.id, buyerId, rightsDocumentEvidenceId: rightsDocument.body.evidence.id, custodyAfterSale: "SELLER_OR_HTX", notes: "Hoàn tất giao dịch kiểm thử" });
    expect(completed.status).toBe(201);
    const current = await operator.get(`/api/assets/${assetId}`);
    expect(current.body.asset.currentStage).toBe("REGISTERED");
    expect(current.body.asset.transactionStage).toBe("SOLD");
    expect(current.body.asset.custodyRecords[0].physicalCustodian).toBe("Kho sinh học HTX");
    const mine = await buyer.get("/api/my-assets");
    expect(mine.body.transactions.some((item: { assetId: string; status: string }) => item.assetId === assetId && item.status === "COMPLETED")).toBe(true);
    const buyerDetail = await buyer.get(`/api/my-assets/${assetId}`);
    expect(buyerDetail.status).toBe(200);
    expect(buyerDetail.body.transaction.price).toBe(123000000);
    expect(buyerDetail.body.asset.exactLatitude).toBeUndefined();
    expect(buyerDetail.body.asset.exactLongitude).toBeUndefined();
    const partnerView = await buyer.get(`/api/assets/${assetId}`);
    expect(partnerView.body.asset.exactLatitude).toBeUndefined();
    expect(partnerView.body.asset.exactLongitude).toBeUndefined();
    expect(partnerView.body.asset.evidence.some((item: { visibility: string }) => item.visibility === "PRIVATE")).toBe(false);
    const buyerEvidence = await buyer.get(`/api/assets/${assetId}/evidence`);
    expect(buyerEvidence.body.evidence.some((item: { id: string }) => item.id === rightsDocument.body.evidence.id)).toBe(true);
    expect((await buyer.get(`/api/evidence/${rightsDocument.body.evidence.id}/file`)).status).toBe(200);
    const fulfillment = await buyer.post(`/api/assets/${assetId}/fulfillment`).send({ type: "HARVEST", notes: "Yêu cầu thu hoạch kiểm thử" });
    expect(fulfillment.status).toBe(201);
    expect((await operator.patch(`/api/fulfillment/${fulfillment.body.request.id}`).send({ status: "SCHEDULED" })).status).toBe(200);
    const blockedCompletion = await operator.patch(`/api/fulfillment/${fulfillment.body.request.id}`).send({ status: "COMPLETED" });
    expect(blockedCompletion.status).toBe(409);
    expect(blockedCompletion.body.error).toContain("HARVEST_RECORD");
    const afterSchedule = await operator.get(`/api/assets/${assetId}`);
    expect(afterSchedule.body.asset.currentStage).toBe("REGISTERED");
    expect(afterSchedule.body.asset.transactionStage).toBe("DELIVERY_REQUESTED");
  });

  it("creates purpose-specific review cases", async () => {
    const created = await operator.post("/api/review-cases").send({ purpose: "REAL_ASSET_TRANSFER", assetId });
    expect(created.status).toBe(201);
    const cases = await reviewer.get("/api/review-cases");
    const item = cases.body.cases.find((candidate: { id: string }) => candidate.id === created.body.reviewCase.id);
    expect(item.summary.length).toBe(2);
    expect(item.asset.exactLatitude).toBeUndefined();
    expect(item.asset.exactLongitude).toBeUndefined();
    expect(item.requestedBy.passwordHash).toBeUndefined();
    expect(item.asset.evidence.every((evidence: { storageUri?: string }) => evidence.storageUri === undefined)).toBe(true);
    expect((await reviewer.patch(`/api/review-cases/${item.id}`).send({ decision: "NEEDS_SUPPLEMENT", notes: "Cần bổ sung xác minh tài liệu quyền trước khi review." })).status).toBe(200);
  });

  it("redacts exact GPS, geo metadata, private documents and commercial terms publicly", async () => {
    await operator.post(`/api/assets/${assetId}/evidence`).field("type", "GEO_LOCATION").field("title", "Vị trí công khai kiểm thử").field("source", "Thiết bị GPS").field("sourceType", "DEVICE").field("observedAt", new Date().toISOString()).field("visibility", "PUBLIC").field("metadataJson", JSON.stringify({ latitude: 15.01, longitude: 108.01 })).attach("file", Buffer.from("gps"), { filename: "gps.txt", contentType: "text/plain" });
    const response = await request(app).get(`/api/public/passports/${assetCode}`);
    expect(response.status).toBe(200);
    expect(response.body.asset.exactLatitude).toBeUndefined();
    expect(response.body.asset.exactLongitude).toBeUndefined();
    expect(response.body.asset.evidence.find((item: { type: string }) => item.type === "GEO_LOCATION").metadataJson).toBeUndefined();
    expect(response.body.asset.careAgreements).toBeUndefined();
    expect(response.body.asset.offers).toBeUndefined();
    expect(response.body.asset.transactions).toBeUndefined();
  });
});

afterAll(async () => {
  if (operator2Id) await prisma.user.update({ where: { id: operator2Id }, data: { role: "operator" } }).catch(() => undefined);
  if (assetId) await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
  await prisma.$disconnect();
});
