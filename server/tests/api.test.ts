import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

let createdAssetId = "";
let evidenceId = "";
let verificationId = "";
let attestationId = "";
const operator = request.agent(app);
const verifier = request.agent(app);
const reviewer = request.agent(app);
const admin = request.agent(app);
let adminId = "";

describe.sequential("GreenTrace API acceptance", () => {
  it("authenticates demo roles and enforces backend role guards", async () => {
    expect(
      (
        await operator
          .post("/api/auth/login")
          .send({ email: "operator@greentrace.vn", password: "GreenTrace123!" })
      ).status,
    ).toBe(200);
    const adminLogin = await admin
      .post("/api/auth/login")
      .send({ email: "admin@greentrace.vn", password: "GreenTrace123!" });
    expect(adminLogin.status).toBe(200);
    adminId = adminLogin.body.user.id;
    expect(
      (
        await verifier
          .post("/api/auth/login")
          .send({ email: "verifier@greentrace.vn", password: "GreenTrace123!" })
      ).status,
    ).toBe(200);
    expect(
      (
        await reviewer
          .post("/api/auth/login")
          .send({ email: "reviewer@greentrace.vn", password: "GreenTrace123!" })
      ).status,
    ).toBe(200);
    const forbidden = await reviewer
      .post("/api/assets")
      .send({ displayName: "x" });
    expect(forbidden.status).toBe(403);
  });

  it("exposes admin policy and protects the last active admin session", async () => {
    const policy = await admin.get("/api/admin/policy");
    expect(policy.status).toBe(200);
    expect(policy.body.evidenceTypes).toContain("CERTIFICATE");
    expect(policy.body.lifecycleTransitions.REGISTERED).toContain("PLANTED_VERIFIED");
    const users = await admin.get("/api/admin/users");
    expect(users.status).toBe(200);
    expect(users.body.users.length).toBeGreaterThanOrEqual(6);
    const demoteSelf = await admin
      .patch(`/api/admin/users/${adminId}/role`)
      .send({ role: "reviewer" });
    expect(demoteSelf.status).toBe(409);
  });

  it("creates an asset with REGISTERED state and an initial trust profile", async () => {
    const response = await operator
      .post("/api/assets")
      .send({
        displayName: "Sâm API test",
        assetType: "Dược liệu lâu năm",
        species: "Panax vietnamensis",
        description: "Hồ sơ được tạo trong kiểm thử tích hợp.",
        region: "Nam Trà My",
        exactLatitude: 15.01,
        exactLongitude: 108.01,
        plantedAt: "2023-01-01",
      });
    expect(response.status).toBe(201);
    createdAssetId = response.body.asset.id;
    expect(response.body.asset.currentStage).toBe("REGISTERED");
    const profile = await operator.get(
      `/api/assets/${createdAssetId}/trust-profile`,
    );
    expect(profile.status).toBe(200);
    expect(profile.body.totalScore).toBeLessThan(100);
  });

  it("uploads and hashes evidence metadata without auto-verifying it", async () => {
    const response = await operator
      .post(`/api/assets/${createdAssetId}/evidence`)
      .field("type", "INSPECTION")
      .field("title", "Biên bản kiểm tra API")
      .field("source", "Operator test")
      .field("observedAt", new Date().toISOString())
      .field("visibility", "PRIVATE")
      .attach("file", Buffer.from("inspection test"), {
        filename: "inspection.txt",
        contentType: "text/plain",
      });
    expect(response.status).toBe(201);
    evidenceId = response.body.evidence.id;
    expect(response.body.evidence.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.evidence.verificationStatus).toBe("PENDING");
  });

  it("creates a verification request and approves it with canonical payload checks", async () => {
    const queued = await operator
      .post(`/api/evidence/${evidenceId}/request-verification`)
      .send({ requestedScope: "EXISTENCE" });
    expect(queued.status).toBe(201);
    verificationId = queued.body.request.id;
    const verifierWallet = "11111111111111111111111111111111";
    const note = "Đã đối chiếu sự tồn tại trong phạm vi biên bản.";
    const payload = await verifier
      .post(`/api/verification-requests/${verificationId}/payload`)
      .send({ scope: "EXISTENCE", note, verifierWallet });
    expect(payload.status).toBe(200);
    const approved = await verifier
      .post(`/api/verification-requests/${verificationId}/approve`)
      .send({
        scope: "EXISTENCE",
        note,
        verifierWallet,
        payloadHash: payload.body.payloadHash,
        txSignature: "2".repeat(64),
      });
    expect(approved.status).toBe(200);
    expect(approved.body.attestation.decision).toBe("APPROVED");
    attestationId = approved.body.attestation.id;
  });

  it("revokes an attestation on-chain and supports a later rejection", async () => {
    const verifierWallet = "11111111111111111111111111111111";
    const payload = await verifier
      .post(`/api/attestations/${attestationId}/revoke/payload`)
      .send({ verifierWallet });
    expect(payload.status).toBe(200);
    const revoked = await verifier
      .post(`/api/attestations/${attestationId}/revoke`)
      .send({
        verifierWallet,
        payloadHash: payload.body.payloadHash,
        txSignature: "3".repeat(64),
      });
    expect(revoked.status).toBe(200);
    expect(revoked.body.chainStatus).toBe("CONFIRMED");

    const queued = await operator
      .post(`/api/evidence/${evidenceId}/request-verification`)
      .send({ requestedScope: "EXISTENCE" });
    expect(queued.status).toBe(201);
    const rejected = await verifier
      .post(`/api/verification-requests/${queued.body.request.id}/reject`)
      .send({
        scope: "EXISTENCE",
        note: "Bằng chứng chưa đủ độ rõ để duyệt lại.",
      });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("REJECTED");
  });

  it("rejects an illegal lifecycle transition", async () => {
    const response = await operator
      .post(`/api/assets/${createdAssetId}/lifecycle`)
      .send({
        stageTo: "HARVESTED",
        eventType: "TEST",
        evidenceIds: [evidenceId],
      });
    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Bất thường logic");
  });

  it("redacts exact GPS from the public passport response", async () => {
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: createdAssetId },
    });
    const response = await request(app).get(
      `/api/public/passports/${asset.assetCode}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.asset.exactLatitude).toBeUndefined();
  });
});

afterAll(async () => {
  if (createdAssetId)
    await prisma.asset
      .delete({ where: { id: createdAssetId } })
      .catch(() => undefined);
  await prisma.$disconnect();
});
