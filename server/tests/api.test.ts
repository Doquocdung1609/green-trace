import bcrypt from "bcrypt";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const operator = request.agent(app);
const verifier = request.agent(app);
const reviewerA = request.agent(app);
const reviewerB = request.agent(app);
const buyerA = request.agent(app);
const buyerB = request.agent(app);
const foreignOperator = request.agent(app);
const admin = request.agent(app);

let templateId = "";
let operatorAssetId = "";
let operatorAssetCode = "";
let buyerAId = "";
let buyerBId = "";
let foreignUserId = "";
let foreignOrganizationId = "";
let signatureCounter = 1;
const createdAssetIds: string[] = [];
const createdUserIds: string[] = [];

const assetInput = (displayName: string, overrides: Record<string, unknown> = {}) => ({
  templateId,
  displayName,
  assetType: "Dược liệu lâu năm",
  assetLevel: "LOT",
  species: "Sâm Ngọc Linh",
  scientificName: "Panax vietnamensis",
  propagationSource: "Vườn giống regression",
  plantedAt: "2023-01-01",
  plantedAtConfidence: "DOCUMENTED",
  ageBasis: "DOCUMENTED",
  managementBasis: "Hợp đồng quản lý regression",
  description: "Hồ sơ regression đủ dài cho kiểm thử hardening GreenTrace.",
  region: "Nam Trà My, Quảng Nam",
  province: "Quảng Nam",
  district: "Nam Trà My",
  commune: "Trà Linh",
  exactLatitude: 15.01,
  exactLongitude: 108.01,
  elevationMeters: 1600,
  ...overrides,
});

async function createAsset(displayName: string, overrides: Record<string, unknown> = {}) {
  const response = await operator.post("/api/assets").send(assetInput(displayName, overrides));
  expect(response.status).toBe(201);
  createdAssetIds.push(response.body.asset.id);
  return response.body.asset as { id: string; assetCode: string };
}

async function uploadEvidence(
  assetId: string,
  type: string,
  options: { visibility?: string; metadataJson?: string; title?: string } = {},
) {
  let call = operator
    .post(`/api/assets/${assetId}/evidence`)
    .field("type", type)
    .field("title", options.title ?? `${type} regression`)
    .field("source", "Nguồn regression")
    .field("sourceType", "DOCUMENT")
    .field("observedAt", new Date().toISOString())
    .field("visibility", options.visibility ?? "PRIVATE");
  if (options.metadataJson) call = call.field("metadataJson", options.metadataJson);
  const response = await call.attach("file", Buffer.from(`${type}:${Date.now()}`), {
    filename: `${type.toLowerCase()}.txt`,
    contentType: "text/plain",
  });
  expect(response.status).toBe(201);
  return response.body.evidence as { id: string; verificationStatus: string };
}

async function approveEvidence(assetId: string, evidenceId: string) {
  const asset = await operator.get(`/api/assets/${assetId}`);
  const verificationRequest = asset.body.asset.verificationRequests.find(
    (item: { evidenceId: string; status: string }) =>
      item.evidenceId === evidenceId && item.status === "PENDING",
  );
  expect(verificationRequest).toBeTruthy();
  const note = "Đã kiểm tra độc lập đúng phạm vi regression.";
  const wallet = "11111111111111111111111111111111";
  const payload = await verifier
    .post(`/api/verification-requests/${verificationRequest.id}/payload`)
    .send({ scope: verificationRequest.requestedScope, note, verifierWallet: wallet });
  expect(payload.status).toBe(200);
  signatureCounter += 1;
  const approved = await verifier
    .post(`/api/verification-requests/${verificationRequest.id}/approve`)
    .send({
      scope: verificationRequest.requestedScope,
      note,
      verifierWallet: wallet,
      payloadHash: payload.body.payloadHash,
      txSignature: String(signatureCounter).repeat(64).slice(0, 64),
    });
  expect(approved.status).toBe(200);
  return approved.body.attestation;
}

describe.sequential("GreenTrace final hardening acceptance", () => {
  it("logs in provisioned roles and prepares a second organization", async () => {
    for (const [agent, email] of [
      [operator, "operator@greentrace.vn"],
      [verifier, "verifier@greentrace.vn"],
      [reviewerA, "reviewer@greentrace.vn"],
      [reviewerB, "reviewer2@greentrace.vn"],
      [buyerA, "buyer@greentrace.vn"],
      [admin, "admin@greentrace.vn"],
    ] as const) {
      const response = await agent
        .post("/api/auth/login")
        .send({ email, password: "GreenTrace123!" });
      expect(response.status).toBe(200);
      if (email === "buyer@greentrace.vn") buyerAId = response.body.user.id;
    }
    const policy = await admin.get("/api/admin/policy");
    templateId = policy.body.assetTemplates.find(
      (template: { key: string }) => template.key === "PANAX_VIETNAMENSIS_LOT_V1",
    ).id;
    const organization = await prisma.organization.create({
      data: {
        name: `Regression Org ${Date.now()}`,
        type: "COOPERATIVE",
        region: "Kon Tum",
      },
    });
    foreignOrganizationId = organization.id;
    const user = await prisma.user.create({
      data: {
        email: `foreign-${Date.now()}@example.test`,
        passwordHash: await bcrypt.hash("GreenTrace123!", 4),
        fullName: "Foreign Operator",
        role: "operator",
        organizationId: organization.id,
      },
    });
    foreignUserId = user.id;
    expect(
      (
        await foreignOperator
          .post("/api/auth/login")
          .send({ email: user.email, password: "GreenTrace123!" })
      ).status,
    ).toBe(200);
  });

  it("allows public buyer registration but blocks role and organization spoofing", async () => {
    const email = `buyer-regression-${Date.now()}@example.test`;
    const registered = await buyerB.post("/api/auth/register").send({
      email,
      password: "GreenTrace123!",
      fullName: "Regression Buyer",
      role: "buyer",
    });
    expect(registered.status).toBe(201);
    expect(registered.body.user.role).toBe("buyer");
    expect(registered.body.user.organizationId).toBeNull();
    buyerBId = registered.body.user.id;
    createdUserIds.push(buyerBId);

    for (const role of ["operator", "reviewer", "verifier", "admin"]) {
      const blocked = await request(app).post("/api/auth/register").send({
        email: `${role}-${Date.now()}@example.test`,
        password: "GreenTrace123!",
        fullName: "Spoof Attempt",
        role,
        organizationName: "DEMO DATA · HTX Dược liệu Ngọc Linh",
      });
      expect(blocked.status).toBe(400);
    }
    expect(
      await prisma.organization.count({
        where: { name: "DEMO DATA · HTX Dược liệu Ngọc Linh" },
      }),
    ).toBe(1);
  });

  it("enforces centralized asset access for every non-admin role", async () => {
    const created = await createAsset("Regression · centralized access");
    operatorAssetId = created.id;
    operatorAssetCode = created.assetCode;
    expect(operatorAssetCode).toMatch(/^GT-NL-\d{4}-[A-F0-9]{8}$/);

    expect((await foreignOperator.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
    expect((await buyerB.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
    expect((await verifier.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
    expect((await reviewerA.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
    expect((await admin.get(`/api/assets/${operatorAssetId}`)).status).toBe(200);

    const verifierList = await verifier.get("/api/assets");
    const buyerList = await buyerA.get("/api/assets");
    const reviewerList = await reviewerA.get("/api/assets");
    expect(verifierList.body.assets.length).toBeLessThan(7);
    expect(buyerList.body.assets.length).toBeLessThan(7);
    expect(reviewerList.body.assets).toHaveLength(0);
  });

  it("keeps operational evidence out of verification and scopes verifier access", async () => {
    const care = await uploadEvidence(operatorAssetId, "PHOTO_CARE");
    expect(care.verificationStatus).toBe("NOT_REQUIRED");
    const inspection = await uploadEvidence(operatorAssetId, "INSPECTION", {
      visibility: "PARTNER",
    });
    expect((await verifier.get(`/api/assets/${operatorAssetId}`)).status).toBe(200);
    expect((await verifier.get(`/api/evidence/${care.id}/file`)).status).toBe(403);
    expect((await verifier.get(`/api/evidence/${inspection.id}/file`)).status).toBe(200);
    await approveEvidence(operatorAssetId, inspection.id);
    expect((await verifier.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
  });

  it("prevents client-approved rights and derives rights from an active attestation", async () => {
    const rightsDocument = await uploadEvidence(operatorAssetId, "RIGHTS_DOCUMENT");
    const missingBasis = await operator.post(`/api/assets/${operatorAssetId}/rights`).send({
      rightType: "CONTRACTUAL_ASSET_RIGHT",
      holder: "Regression HTX",
      validFrom: "2023-01-01",
    });
    expect(missingBasis.status).toBe(400);
    const forged = await operator.post(`/api/assets/${operatorAssetId}/rights`).send({
      rightType: "CONTRACTUAL_ASSET_RIGHT",
      holder: "Regression HTX",
      basisDocumentEvidenceId: rightsDocument.id,
      validFrom: "2023-01-01",
      verifiedStatus: "APPROVED",
    });
    expect(forged.status).toBe(400);
    const created = await operator.post(`/api/assets/${operatorAssetId}/rights`).send({
      rightType: "CONTRACTUAL_ASSET_RIGHT",
      holder: "Regression HTX",
      basisDocumentEvidenceId: rightsDocument.id,
      validFrom: "2023-01-01",
    });
    expect(created.status).toBe(201);
    expect(created.body.record.verifiedStatus).toBe("PENDING");
    await approveEvidence(operatorAssetId, rightsDocument.id);
    const rights = await operator.get(`/api/assets/${operatorAssetId}/rights`);
    expect(rights.body.records[0].verifiedStatus).toBe("APPROVED");
  });

  it("requires verified resolution evidence before a HIGH incident lowers risk", async () => {
    const incidentResponse = await operator
      .post(`/api/assets/${operatorAssetId}/incidents`)
      .send({
        type: "DISEASE",
        severity: "HIGH",
        detectedAt: new Date().toISOString(),
        description: "Regression HIGH disease incident.",
        evidenceIds: [],
      });
    expect(incidentResponse.status).toBe(201);
    const incident = incidentResponse.body.incident;
    expect(
      (
        await operator.patch(`/api/incidents/${incident.id}`).send({
          status: "RESOLVED",
          resolutionNote: "Attempted self resolution",
        })
      ).status,
    ).toBe(409);
    const resolution = await uploadEvidence(operatorAssetId, "INCIDENT_RESOLUTION", {
      metadataJson: JSON.stringify({ incidentId: incident.id }),
    });
    expect(
      (
        await operator.patch(`/api/incidents/${incident.id}`).send({
          status: "UNDER_REVIEW",
          resolutionNote: "Incident entered independent review.",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await operator.patch(`/api/incidents/${incident.id}`).send({
          status: "MITIGATING",
          resolutionNote: "Mitigation is in progress.",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await operator.patch(`/api/incidents/${incident.id}`).send({
          status: "RESOLUTION_PENDING_VERIFICATION",
          resolutionNote: "Submitted remediation evidence",
          resolutionEvidenceId: resolution.id,
        })
      ).status,
    ).toBe(200);
    const before = await operator.get(`/api/assets/${operatorAssetId}/risk`);
    expect(before.body.riskProfile.biologicalRisk).toBe("HIGH");
    await approveEvidence(operatorAssetId, resolution.id);
    const after = await operator.get(`/api/assets/${operatorAssetId}/risk`);
    expect(after.body.riskProfile.biologicalRisk).toBe("LOW");
    const asset = await operator.get(`/api/assets/${operatorAssetId}`);
    expect(
      asset.body.asset.incidents.find((item: { id: string }) => item.id === incident.id).status,
    ).toBe("RESOLVED");
  });

  it("supports multiple purchase requests without changing the global stage and one active offer", async () => {
    const location = await uploadEvidence(operatorAssetId, "GEO_LOCATION", {
      metadataJson: JSON.stringify({ latitude: 15.01, longitude: 108.01 }),
    });
    await approveEvidence(operatorAssetId, location.id);
    expect(
      (
        await operator.post(`/api/assets/${operatorAssetId}/custody`).send({
          physicalCustodian: "Regression HTX Custody",
          location: "Nam Trà My",
          startAt: "2023-01-01",
          status: "ACTIVE",
        })
      ).status,
    ).toBe(201);
    const offer = await operator.post(`/api/assets/${operatorAssetId}/offers`).send({
      askingPrice: 123000000,
      currency: "VND",
      careAfterSaleAvailable: true,
    });
    expect(offer.status).toBe(201);
    expect(
      (
        await operator.post(`/api/assets/${operatorAssetId}/offers`).send({
          askingPrice: 125000000,
          currency: "VND",
          careAfterSaleAvailable: false,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await buyerA
          .post(`/api/offers/${offer.body.offer.id}/purchase-request`)
          .send({ notes: "Buyer A request" })
      ).status,
    ).toBe(201);
    expect(
      (
        await buyerB
          .post(`/api/offers/${offer.body.offer.id}/purchase-request`)
          .send({ notes: "Buyer B request" })
      ).status,
    ).toBe(201);
    const current = await operator.get(`/api/assets/${operatorAssetId}`);
    expect(current.body.asset.transactionStage).toBe("AVAILABLE");
    expect(
      (
        await operator
          .post(`/api/offers/${offer.body.offer.id}/reserve`)
          .send({ buyerId: "wrong-buyer" })
      ).status,
    ).toBe(409);
    expect(
      (
        await operator
          .post(`/api/offers/${offer.body.offer.id}/reserve`)
          .send({ buyerId: buyerAId })
      ).status,
    ).toBe(200);
  });

  it("gates sale atomically, transitions contractual rights, and preserves custody/biology", async () => {
    const asset = await operator.get(`/api/assets/${operatorAssetId}`);
    const offer = asset.body.asset.offers.find(
      (item: { status: string }) => item.status === "RESERVED",
    );
    const rightsDocument = asset.body.asset.evidence.find(
      (item: { type: string; verificationStatus: string }) =>
        item.type === "RIGHTS_DOCUMENT" && item.verificationStatus === "APPROVED",
    );
    const wrongBuyer = await operator.post(`/api/assets/${operatorAssetId}/transactions`).send({
      offerId: offer.id,
      buyerId: buyerBId,
      rightsDocumentEvidenceId: rightsDocument.id,
      custodyAfterSale: "SELLER_OR_HTX",
    });
    expect(wrongBuyer.status).toBe(409);
    const critical = await operator
      .post(`/api/assets/${operatorAssetId}/incidents`)
      .send({
        type: "PHYSICAL_DAMAGE",
        severity: "CRITICAL",
        detectedAt: new Date().toISOString(),
        description: "Regression critical blocker before sale.",
        evidenceIds: [],
      });
    const riskBlocked = await operator
      .post(`/api/assets/${operatorAssetId}/transactions`)
      .send({
        offerId: offer.id,
        buyerId: buyerAId,
        rightsDocumentEvidenceId: rightsDocument.id,
        custodyAfterSale: "SELLER_OR_HTX",
      });
    expect(riskBlocked.status).toBe(409);
    expect(riskBlocked.body.error).toContain("HIGH/CRITICAL");
    const criticalResolution = await uploadEvidence(
      operatorAssetId,
      "INCIDENT_RESOLUTION",
      { metadataJson: JSON.stringify({ incidentId: critical.body.incident.id }) },
    );
    await operator.patch(`/api/incidents/${critical.body.incident.id}`).send({
      status: "UNDER_REVIEW",
      resolutionNote: "Critical incident review started",
    });
    await operator.patch(`/api/incidents/${critical.body.incident.id}`).send({
      status: "MITIGATING",
      resolutionNote: "Critical incident mitigation started",
    });
    await operator.patch(`/api/incidents/${critical.body.incident.id}`).send({
      status: "RESOLUTION_PENDING_VERIFICATION",
      resolutionNote: "Critical remediation submitted",
      resolutionEvidenceId: criticalResolution.id,
    });
    await approveEvidence(operatorAssetId, criticalResolution.id);
    const completed = await operator.post(`/api/assets/${operatorAssetId}/transactions`).send({
      offerId: offer.id,
      buyerId: buyerAId,
      rightsDocumentEvidenceId: rightsDocument.id,
      custodyAfterSale: "SELLER_OR_HTX",
      notes: "Regression completed sale",
    });
    expect(completed.status).toBe(201);
    expect(
      (
        await operator.post(`/api/assets/${operatorAssetId}/transactions`).send({
          offerId: offer.id,
          buyerId: buyerAId,
          rightsDocumentEvidenceId: rightsDocument.id,
          custodyAfterSale: "SELLER_OR_HTX",
        })
      ).status,
    ).toBe(409);
    const after = await operator.get(`/api/assets/${operatorAssetId}`);
    expect(after.body.asset.currentStage).toBe("REGISTERED");
    expect(after.body.asset.transactionStage).toBe("SOLD");
    expect(after.body.asset.custodyRecords[0].physicalCustodian).toBe(
      "Regression HTX Custody",
    );
    expect(after.body.asset.rightsRecords).toHaveLength(2);
    expect(
      after.body.asset.rightsRecords.some(
        (record: { rightType: string; holder: string }) =>
          record.rightType === "CONTRACTUAL_ECONOMIC_RIGHT" &&
          record.holder.includes("DEMO DATA"),
      ),
    ).toBe(true);
    expect(
      after.body.asset.rightsRecords.some(
        (record: { validUntil?: string }) => Boolean(record.validUntil),
      ),
    ).toBe(true);
  });

  it("blocks transaction completion when readiness or critical risk is missing", async () => {
    const missing = await createAsset("Regression · not ready");
    const document = await uploadEvidence(missing.id, "RIGHTS_DOCUMENT");
    await approveEvidence(missing.id, document.id);
    await operator.post(`/api/assets/${missing.id}/rights`).send({
      rightType: "CONTRACTUAL_ASSET_RIGHT",
      holder: "Regression HTX",
      basisDocumentEvidenceId: document.id,
      validFrom: "2023-01-01",
    });
    const offer = await operator.post(`/api/assets/${missing.id}/offers`).send({
      askingPrice: 1000000,
      currency: "VND",
      careAfterSaleAvailable: false,
    });
    await buyerB
      .post(`/api/offers/${offer.body.offer.id}/purchase-request`)
      .send({});
    await operator
      .post(`/api/offers/${offer.body.offer.id}/reserve`)
      .send({ buyerId: buyerBId });
    const blocked = await operator.post(`/api/assets/${missing.id}/transactions`).send({
      offerId: offer.body.offer.id,
      buyerId: buyerBId,
      rightsDocumentEvidenceId: document.id,
      custodyAfterSale: "SELLER_OR_HTX",
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toContain("READY_FOR_REVIEW");
  });

  it("locks review cases to the first reviewer and rejects overwrite", async () => {
    const created = await operator.post("/api/review-cases").send({
      purpose: "REAL_ASSET_TRANSFER",
      assetId: operatorAssetId,
    });
    expect(created.status).toBe(201);
    const id = created.body.reviewCase.id;
    expect((await reviewerA.post(`/api/review-cases/${id}/claim`)).status).toBe(200);
    expect((await reviewerB.post(`/api/review-cases/${id}/claim`)).status).toBe(409);
    expect((await reviewerB.get(`/api/assets/${operatorAssetId}`)).status).toBe(403);
    expect(
      (
        await reviewerB.patch(`/api/review-cases/${id}`).send({
          decision: "READY_FOR_REVIEW",
          notes: "Reviewer B must not overwrite this claimed case.",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await reviewerA.patch(`/api/review-cases/${id}`).send({
          decision: "READY_FOR_REVIEW",
          notes: "Reviewer A completed the assigned dossier review.",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await reviewerA.patch(`/api/review-cases/${id}`).send({
          decision: "NOT_READY",
          notes: "Resolved cases must be immutable for reviewers.",
        })
      ).status,
    ).toBe(409);
  });

  it("redacts exact GPS, PII, private contracts, buyer and verifier identity publicly", async () => {
    const response = await request(app).get(
      "/api/public/passports/GT-NL-2026-DEMOF006",
    );
    expect(response.status).toBe(200);
    const asset = response.body.asset;
    const serialized = JSON.stringify(asset);
    expect(asset.exactLatitude).toBeUndefined();
    expect(asset.exactLongitude).toBeUndefined();
    expect(asset.custodian).toBeUndefined();
    expect(asset.careAgreements).toBeUndefined();
    expect(asset.offers).toBeUndefined();
    expect(asset.transactions).toBeUndefined();
    expect(serialized).not.toContain("0900000000");
    expect(serialized).not.toContain("buyer@greentrace.vn");
    expect(serialized).not.toContain("private://");
    expect(serialized).not.toContain("verifier@greentrace.vn");
    expect(serialized).not.toContain("DEMO DATA · Lê Quang Huy");
  });

  it("keeps the public passport available without authentication", async () => {
    expect(
      (await request(app).get(`/api/public/passports/${operatorAssetCode}`)).status,
    ).toBe(200);
    expect(
      (
        await request(app).get(
          "/api/public/passports/GT-NL-2026-DEMOA001",
        )
      ).status,
    ).toBe(200);
  });
});

afterAll(async () => {
  for (const assetId of createdAssetIds.reverse())
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
  for (const userId of createdUserIds)
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  if (foreignUserId)
    await prisma.user.delete({ where: { id: foreignUserId } }).catch(() => undefined);
  if (foreignOrganizationId)
    await prisma.organization
      .delete({ where: { id: foreignOrganizationId } })
      .catch(() => undefined);
  await prisma.$disconnect();
});
