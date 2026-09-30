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
import { calculateRisk } from "../src/services/riskProfileService.js";
import { genericTemplateRules } from "../src/services/assetTemplateRules.js";

const asset = {
  id: "a",
  assetCode: "GT-NL-TEST",
  displayName: "Sâm test",
  assetType: "Dược liệu",
  assetLevel: "LOT",
  species: "Panax vietnamensis",
  scientificName: "Panax vietnamensis",
  cultivar: null,
  propagationSource: "Vườn giống",
  propagationBatchCode: null,
  formationMethod: null,
  plantedAtConfidence: "DOCUMENTED",
  ageBasis: "DOCUMENTED",
  initialQuantity: 100,
  quantityUnit: "cây",
  areaHectares: 1,
  density: 100,
  custodianId: "u",
  organizationId: "o",
  description: "Hồ sơ test đủ dài",
  region: "Nam Trà My",
  province: "Quảng Nam",
  district: "Nam Trà My",
  commune: null,
  caretaker: "HTX",
  managementBasis: "Hợp đồng",
  elevationMeters: 1500,
  spatialType: "POINT",
  boundaryGeoJson: null,
  growingAreaCode: null,
  geographicalIndication: null,
  templateId: null,
  exactLatitude: 15,
  exactLongitude: 108,
  plantedAt: new Date("2021-01-01"),
  currentStage: "GROWING",
  transactionStage: "NOT_LISTED",
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
    sourceType: "OPERATOR",
    systemValidationStatus: "PASSED",
    verificationPolicyKey: null,
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
    const warnings = detectAnomalies(asset, items, [], [], new Date(), {
      requiredEvidence: ["CERTIFICATE"],
      importantEvidence: ["GEO_LOCATION"],
    });
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining([
        "GPS_OUTSIDE_DECLARED_AREA",
        "EVIDENCE_BEFORE_PLANTED",
        "CERTIFICATE_MISSING",
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
    ).toBe("READY_FOR_REVIEW");
    expect(
      calculateReadiness(
        {
          identityScore: 20,
          evidenceScore: 16,
          verificationScore: 10,
          freshnessScore: 15,
          consistencyScore: 10,
          totalScore: 82,
          warningCount: 1,
          warnings: [{ code: "GPS", severity: "HIGH", message: "x" }],
        },
        items,
      ),
    ).toBe("NEEDS_SUPPLEMENT");
  });

  it("clamps trust to 100 and excludes operational evidence from verification coverage", () => {
    const geo = evidence("GEO_LOCATION", "geo");
    const approved = { evidenceId: geo.id, decision: "APPROVED", revokedAt: null, expiresAt: new Date("2030-01-01"), chainStatus: "CONFIRMED" } as Attestation;
    const rules = { ...genericTemplateRules, requiredEvidence: ["GEO_LOCATION"], importantEvidence: ["GEO_LOCATION"] };
    const baseline = calculateTrust(asset, [geo], [approved], [], new Date("2026-01-01"), rules);
    const withOperational = calculateTrust(asset, [geo, evidence("PHOTO_CARE", "care")], [approved], [], new Date("2026-01-01"), rules);
    expect(baseline.verificationScore).toBe(30);
    expect(withOperational.verificationScore).toBe(30);
    expect(withOperational.totalScore).toBeLessThanOrEqual(100);
  });

  it("raises risk for an open biological incident and never treats sale as a biological transition", () => {
    const incident = { severity: "HIGH", status: "OPEN", type: "DISEASE" } as import("@prisma/client").AssetIncident;
    const risk = calculateRisk(asset, [], [incident], [], []);
    expect(risk.biologicalRisk).toBe("HIGH");
    expect(risk.diseaseRisk).toBe("HIGH");
    expect(validateTransition("HARVESTED", "TRANSFERRED", { approvedScopes: [], evidenceTypes: [] }).ok).toBe(false);
  });

  it("calculates weather risk only from drought and flood severity", () => {
    const disease = { severity: "HIGH", status: "OPEN", type: "DISEASE" } as import("@prisma/client").AssetIncident;
    const drought = { severity: "LOW", status: "OPEN", type: "DROUGHT" } as import("@prisma/client").AssetIncident;
    const risk = calculateRisk(asset, [], [disease, drought], [], []);
    expect(risk.biologicalRisk).toBe("HIGH");
    expect(risk.weatherRisk).toBe("LOW");
  });

  it("does not let a fresh care photo mask stale critical evidence", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const certificate = evidence("CERTIFICATE", "cert", {
      observedAt: new Date("2025-07-01T00:00:00Z"),
    });
    const location = evidence("GEO_LOCATION", "geo-stale", {
      observedAt: new Date("2025-08-01T00:00:00Z"),
    });
    const care = evidence("PHOTO_CARE", "care-fresh", { observedAt: now });
    const attestations = [certificate, location].map(
      (item) =>
        ({
          evidenceId: item.id,
          decision: "APPROVED",
          revokedAt: null,
          expiresAt: new Date("2027-01-01"),
          chainStatus: "CONFIRMED",
        }) as Attestation,
    );
    const rules = {
      ...genericTemplateRules,
      requiredEvidence: ["CERTIFICATE", "GEO_LOCATION"],
      importantEvidence: ["CERTIFICATE", "GEO_LOCATION"],
    };
    const withoutCare = calculateTrust(asset, [certificate, location], attestations, [], now, rules);
    const withCare = calculateTrust(asset, [certificate, location, care], attestations, [], now, rules);
    expect(withCare.freshnessScore).toBe(withoutCare.freshnessScore);
    expect(withCare.freshnessScore).toBe(0);
  });

  it("does not count expired or revoked attestations", () => {
    const geo = evidence("GEO_LOCATION", "geo-active-test");
    const rules = { ...genericTemplateRules, requiredEvidence: ["GEO_LOCATION"], importantEvidence: ["GEO_LOCATION"] };
    const expired = { evidenceId: geo.id, decision: "APPROVED", revokedAt: null, expiresAt: new Date("2025-01-01"), chainStatus: "CONFIRMED" } as Attestation;
    const revoked = { evidenceId: geo.id, decision: "APPROVED", revokedAt: new Date("2025-01-01"), expiresAt: new Date("2030-01-01"), chainStatus: "CONFIRMED" } as Attestation;
    expect(calculateTrust(asset, [geo], [expired, revoked], [], new Date("2026-01-01"), rules).verificationScore).toBe(0);
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
