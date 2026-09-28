import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { canonicalHash, sha256 } from "../src/lib/hash.js";
import { recalculateTrust } from "../src/services/trustProfileService.js";

const db = new PrismaClient();
const passwordHash = await bcrypt.hash("GreenTrace123!", 12);
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86400000);

await db.auditLog.deleteMany();
await db.blockchainTransaction.deleteMany();
await db.digitalPassport.deleteMany();
await db.trustProfile.deleteMany();
await db.lifecycleEvent.deleteMany();
await db.attestation.deleteMany();
await db.verificationRequest.deleteMany();
await db.evidence.deleteMany();
await db.asset.deleteMany();
await db.user.deleteMany();
await db.organization.deleteMany();
const org = await db.organization.create({
  data: {
    name: "Hợp tác xã Dược liệu Ngọc Linh",
    type: "COOPERATIVE",
    region: "Nam Trà My, Quảng Nam",
  },
});
const createUser = (email: string, fullName: string, role: string) =>
  db.user.create({
    data: {
      email,
      fullName,
      role,
      passwordHash,
      organizationId: org.id,
      phone: role === "operator" ? "0900000000" : undefined,
    },
  });
const [operator, operator2, verifier, verifier2, reviewer, admin] =
  await Promise.all([
    createUser("operator@greentrace.vn", "Nguyễn Văn An", "operator"),
    createUser("operator2@greentrace.vn", "Hồ Thị Mai", "operator"),
    createUser("verifier@greentrace.vn", "TS. Trần Minh", "verifier"),
    createUser("verifier2@greentrace.vn", "Kỹ sư Lê Hà", "verifier"),
    createUser("reviewer@greentrace.vn", "Phạm Thu Ngân", "reviewer"),
    createUser("admin@greentrace.vn", "Quản trị GreenTrace", "admin"),
  ]);
const specs = [
  ["GT-NL-2026-000128", "Sâm Ngọc Linh lô A12", "INSPECTED", "good"],
  ["GT-NL-2026-000129", "Sâm Ngọc Linh lô B03", "GROWING", "missing-cert"],
  ["GT-NL-2026-000130", "Sâm Ngọc Linh lô C07", "PLANTED_VERIFIED", "gps"],
  ["GT-NL-2026-000131", "Sâm Ngọc Linh lô D02", "HARVESTED", "lifecycle"],
  [
    "GT-NL-2026-000132",
    "Sâm Ngọc Linh lô E11",
    "INSPECTED",
    "expired-attestation",
  ],
  ["GT-NL-2026-000133", "Sâm Ngọc Linh lô F05", "REGISTERED", "basic"],
  ["GT-NL-2026-000134", "Sâm Ngọc Linh lô G08", "MATURE", "good"],
  ["GT-NL-2026-000135", "Sâm Ngọc Linh lô H04", "GROWING", "basic"],
] as const;

for (const [assetCode, displayName, currentStage, scenario] of specs) {
  const asset = await db.asset.create({
    data: {
      assetCode,
      displayName,
      assetType: "Dược liệu lâu năm",
      species: "Panax vietnamensis",
      custodianId: scenario === "basic" ? operator2.id : operator.id,
      organizationId: org.id,
      description:
        "Hồ sơ minh họa cho tài sản sâm Ngọc Linh; dữ liệu demo không phải kết luận xác thực sinh học hoặc quyền sở hữu.",
      region: "Nam Trà My, Quảng Nam",
      exactLatitude: 15.0139,
      exactLongitude: 108.0061,
      plantedAt: new Date("2021-03-15"),
      currentStage,
      photoUrl: "/sam-ngoc-linh.svg",
      metadataHash: canonicalHash({ assetCode, displayName }),
    },
  });
  await db.lifecycleEvent.create({
    data: {
      assetId: asset.id,
      stageFrom: "REGISTERED",
      stageTo: "REGISTERED",
      eventType: "ASSET_REGISTERED",
      evidenceIds: "[]",
      approvedBy: operator.id,
    },
  });
  if (scenario === "lifecycle")
    await db.lifecycleEvent.create({
      data: {
        assetId: asset.id,
        stageFrom: "HARVESTED",
        stageTo: "GROWING",
        eventType: "DEMO_LOGICAL_CONFLICT",
        evidenceIds: "[]",
        approvedBy: operator.id,
      },
    });
  const types =
    scenario === "basic"
      ? ["PHOTO", "FARM_LOG"]
      : scenario === "missing-cert"
        ? ["PHOTO", "GEO_LOCATION", "FARM_LOG", "INSPECTION"]
        : ["PHOTO", "GEO_LOCATION", "FARM_LOG", "CERTIFICATE", "INSPECTION"];
  for (const [index, type] of types.entries()) {
    const title = (
      {
        PHOTO: "Ảnh hiện trường",
        GEO_LOCATION: "Điểm GPS",
        FARM_LOG: "Nhật ký chăm sóc",
        CERTIFICATE: "Chứng nhận vùng trồng",
        INSPECTION: "Biên bản kiểm tra",
      } as Record<string, string>
    )[type] ?? type;
    const evidence = await db.evidence.create({
      data: {
        assetId: asset.id,
        type,
        title,
        description: "Dữ liệu minh họa có nguồn và thời điểm.",
        source:
          type === "INSPECTION" ? "Tổ xác minh kỹ thuật" : "Cán bộ hiện trường",
        observedAt: days(-30 - index),
        submittedBy: operator.id,
        storageUri:
          type === "PHOTO"
            ? "/sam-ngoc-linh.svg"
            : `private://${sha256(assetCode + type)}.pdf`,
        mimeType: type === "PHOTO" ? "image/svg+xml" : "application/pdf",
        contentHash: sha256(`${assetCode}:${type}`),
        visibility:
          type === "PHOTO"
            ? "PUBLIC"
            : type === "CERTIFICATE"
              ? "PARTNER"
              : "PRIVATE",
        validUntil:
          type === "CERTIFICATE"
            ? scenario === "good" && assetCode.endsWith("128")
              ? days(20)
              : days(300)
            : undefined,
        verificationStatus: [
          "good",
          "gps",
          "lifecycle",
          "expired-attestation",
        ].includes(scenario)
          ? "APPROVED"
          : "PENDING",
        metadataJson:
          type === "GEO_LOCATION"
            ? JSON.stringify({
                latitude: scenario === "gps" ? 16.2 : 15.014,
                longitude: scenario === "gps" ? 109.2 : 108.006,
              })
            : undefined,
      },
    });
    if (
      ["good", "gps", "lifecycle", "expired-attestation"].includes(scenario) &&
      ["PHOTO", "GEO_LOCATION", "CERTIFICATE", "INSPECTION"].includes(type)
    )
      await db.attestation.create({
        data: {
          evidenceId: evidence.id,
          assetId: asset.id,
          verifierId: index % 2 ? verifier.id : verifier2.id,
          verifierWallet: "DemoVerifierWallet11111111111111111111111111111",
          scope:
            type === "GEO_LOCATION"
              ? "LOCATION"
              : type === "CERTIFICATE"
                ? "CERTIFICATE_VALIDITY"
                : "EXISTENCE",
          decision: "APPROVED",
          note: "Đã đối chiếu trong phạm vi bằng chứng demo; không mở rộng sang kết luận sinh học hoặc pháp lý.",
          payloadHash: sha256(`attestation:${evidence.id}`),
          chainStatus: "PENDING_CHAIN",
          expiresAt: scenario === "expired-attestation" ? days(-2) : days(365),
        },
      });
  }
  await recalculateTrust(asset.id);
  const refreshed = await db.asset.findUniqueOrThrow({
    where: { id: asset.id },
    include: { trustProfile: true },
  });
  const passportHash = canonicalHash({
    assetCode,
    trust: refreshed.trustProfile?.totalScore,
    version: 1,
  });
  await db.digitalPassport.create({
    data: {
      assetId: asset.id,
      version: 1,
      passportHash,
      readinessStatus: refreshed.passportStatus,
    },
  });
}
await db.auditLog.create({
  data: {
    userId: admin.id,
    action: "DEMO_DATA_SEEDED",
    entityType: "System",
    metadata: JSON.stringify({ reviewerId: reviewer.id }),
  },
});
console.log("Seeded GreenTrace demo accounts and eight Sâm Ngọc Linh assets.");
await db.$disconnect();
