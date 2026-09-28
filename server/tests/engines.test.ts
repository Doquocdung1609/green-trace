import { describe, expect, it } from "vitest";
import type {
  Asset,
  Attestation,
  Evidence,
  LifecycleEvent,
} from "@prisma/client";
import { calculateTrust } from "../src/services/trustEngine.js";
import { detectAnomalies } from "../src/services/anomalyEngine.js";
import { validateTransition } from "../src/services/lifecycleEngine.js";
import { calculateReadiness } from "../src/services/readinessEngine.js";

const asset = {
  id: "a",
  assetCode: "GT-NL-TEST",
  displayName: "Sâm test",
  assetType: "Dược liệu",
  species: "Panax vietnamensis",
  custodianId: "u",
  organizationId: "o",
  description: "Hồ sơ test đủ dài",
  region: "Nam Trà My",
  exactLatitude: 15,
  exactLongitude: 108,
  plantedAt: new Date("2021-01-01"),
  currentStage: "GROWING",
  passportStatus: "NOT_READY",
  photoUrl: null,
  metadataHash: "h",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Asset;
const evidence = (
  type: string,
  id: string,
  overrides: Partial<Evidence> = {},
) =>
  ({
    id,
    assetId: "a",
    type,
    title: type,
    description: null,
    source: "operator",
    observedAt: new Date(),
    submittedAt: new Date(),
    submittedBy: "u",
    storageUri: "private://x",
    mimeType: "text/plain",
    contentHash: `hash-${id}`,
    visibility: "PRIVATE",
    validFrom: null,
    validUntil: null,
    verificationStatus: "APPROVED",
    metadataJson: null,
    ...overrides,
  }) as Evidence;

describe("trust and anomaly engines", () => {
  it("explains score deductions and detects spatial, temporal, evidence and verification rules", () => {
    const items = [
      evidence("PHOTO", "1"),
      evidence("GEO_LOCATION", "2", {
        metadataJson: JSON.stringify({ latitude: 17, longitude: 110 }),
      }),
      evidence("FARM_LOG", "3", { observedAt: new Date("2020-01-01") }),
    ];
    const warnings = detectAnomalies(asset, items, [], []);
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining([
        "GPS_OUTSIDE_DECLARED_AREA",
        "EVIDENCE_BEFORE_PLANTED",
        "CERT_MISSING",
        "INDEPENDENT_VERIFICATION_MISSING",
      ]),
    );
    const profile = calculateTrust(asset, items, [], []);
    expect(profile.totalScore).toBeLessThan(70);
    expect(profile.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it("blocks an illegal lifecycle reversal and requires inspection evidence", () => {
    expect(
      validateTransition("HARVESTED", "GROWING", {
        approvedScopes: ["EXISTENCE"],
        evidenceTypes: ["INSPECTION"],
      }).ok,
    ).toBe(false);
    expect(
      validateTransition("GROWING", "INSPECTED", {
        approvedScopes: [],
        evidenceTypes: ["INSPECTION"],
      }).ok,
    ).toBe(false);
    expect(
      validateTransition("GROWING", "INSPECTED", {
        approvedScopes: ["EXISTENCE"],
        evidenceTypes: ["INSPECTION"],
      }).ok,
    ).toBe(true);
  });

  it("opens readiness only at the declared thresholds", () => {
    const items = [
      evidence("CERTIFICATE", "c", { validUntil: new Date("2027-12-01") }),
    ];
    expect(
      calculateReadiness(
        {
          identityScore: 20,
          evidenceScore: 16,
          verificationScore: 21,
          freshnessScore: 15,
          consistencyScore: 15,
          totalScore: 87,
          warningCount: 0,
          warnings: [],
        },
        items,
      ),
    ).toBe("READY_FOR_FINANCIAL_REVIEW");
    expect(
      calculateReadiness(
        {
          identityScore: 20,
          evidenceScore: 16,
          verificationScore: 21,
          freshnessScore: 15,
          consistencyScore: 10,
          totalScore: 82,
          warningCount: 1,
          warnings: [{ code: "GPS", severity: "HIGH", message: "x" }],
        },
        items,
      ),
    ).toBe("NEEDS_REVIEW");
  });

  it("detects expired attestations and lifecycle conflicts", () => {
    const attestation = {
      expiresAt: new Date("2020-01-01"),
      decision: "APPROVED",
      revokedAt: null,
    } as Attestation;
    const event = {
      stageFrom: "HARVESTED",
      stageTo: "GROWING",
    } as LifecycleEvent;
    const warnings = detectAnomalies(
      asset,
      [evidence("CERTIFICATE", "c")],
      [attestation],
      [event],
    );
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining([
        "ATTESTATION_EXPIRED",
        "ILLEGAL_LIFECYCLE_REVERSAL",
      ]),
    );
  });
});
