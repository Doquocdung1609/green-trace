export type UserRole = "operator" | "verifier" | "reviewer" | "buyer" | "admin";

export type EvidenceType =
  | "PHOTO"
  | "PHOTO_CARE"
  | "GEO_LOCATION"
  | "IOT_READING"
  | "FARM_LOG"
  | "CERTIFICATE"
  | "INSPECTION"
  | "LAB_RESULT"
  | "CARE_NOTE"
  | "ENVIRONMENT_READING"
  | "PROPAGATION_SOURCE"
  | "AGE_DOCUMENT"
  | "RIGHTS_DOCUMENT"
  | "CUSTODY_DOCUMENT"
  | "CARE_AGREEMENT"
  | "BIOLOGICAL_MEASUREMENT"
  | "BIOLOGICAL_INCIDENT"
  | "HARVEST_RECORD"
  | "TRANSACTION_DOCUMENT"
  | "INCIDENT_RESOLUTION"
  | "OTHER";

export type VerificationScope =
  | "EXISTENCE"
  | "LOCATION"
  | "AGE_OR_LIFECYCLE"
  | "CERTIFICATE_VALIDITY"
  | "LAB_RESULT"
  | "IOT_SOURCE"
  | "BIOLOGICAL_HEALTH"
  | "RIGHTS"
  | "CUSTODY"
  | "SOURCE_ORIGIN"
  | "OTHER";

export type VerificationDecision =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export type LifecycleStage =
  | "REGISTERED"
  | "PLANTED_VERIFIED"
  | "GROWING"
  | "INSPECTED"
  | "MATURE"
  | "HARVEST_READY"
  | "HARVESTED"
  | "ARCHIVED";

export type Visibility = "PUBLIC" | "PARTNER" | "PRIVATE";
export type ReadinessStatus =
  | "NOT_READY"
  | "NEEDS_SUPPLEMENT"
  | "READY_FOR_REVIEW";
export type ChainStatus = "PENDING_CHAIN" | "CONFIRMED" | "FAILED_CHAIN";

export interface Organization {
  id: string;
  name: string;
  type: string;
  region: string;
  verifierCategory?: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  organizationId?: string | null;
  solanaWallet?: string | null;
  organization?: Organization | null;
}

export interface Evidence {
  id: string;
  assetId: string;
  type: EvidenceType;
  title: string;
  description?: string | null;
  source: string;
  sourceType: string;
  observedAt: string;
  submittedAt: string;
  submittedBy: string;
  storageUri: string;
  mimeType: string;
  contentHash: string;
  visibility: Visibility;
  validFrom?: string | null;
  validUntil?: string | null;
  verificationStatus: VerificationDecision;
  attestations?: Attestation[];
}

export interface Attestation {
  id: string;
  evidenceId: string;
  assetId: string;
  verifierId: string;
  verifierWallet: string;
  verifier?: Pick<User, "fullName" | "organization">;
  scope: VerificationScope;
  decision: VerificationDecision;
  note: string;
  payloadHash: string;
  txSignature?: string | null;
  chainStatus: ChainStatus;
  verifiedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

export interface VerificationRequest {
  id: string;
  assetId: string;
  evidenceId: string;
  requestedScope: VerificationScope;
  requestedVerifierId?: string | null;
  requiredVerifierCategory?: string | null;
  priority?: string;
  status: VerificationDecision;
  createdAt: string;
  resolvedAt?: string | null;
  asset?: Asset;
  evidence?: Evidence;
  requester?: Pick<User, "fullName" | "organization">;
}

export interface LifecycleEvent {
  id: string;
  assetId: string;
  stageFrom: LifecycleStage;
  stageTo: LifecycleStage;
  eventType: string;
  evidenceIds: string[];
  approvedBy: string;
  txSignature?: string | null;
  occurredAt: string;
}

export interface TrustWarning {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
}

export interface TrustProfile {
  identityScore: number;
  evidenceScore: number;
  verificationScore: number;
  freshnessScore: number;
  consistencyScore: number;
  totalScore: number;
  warningCount: number;
  warnings: TrustWarning[];
  calculatedAt: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export interface RiskProfile {
  overallRisk: RiskLevel;
  biologicalRisk: RiskLevel;
  diseaseRisk: RiskLevel;
  locationRisk: RiskLevel;
  freshnessRisk: RiskLevel;
  certificateRisk: RiskLevel;
  custodyRisk: RiskLevel;
  weatherRisk: RiskLevel;
  operationalRisk: RiskLevel;
  openIncidentCount: number;
  reasons: string[];
}
export interface ReadinessProfile {
  purpose: "REAL_ASSET_TRANSFER" | "FINANCIAL_REVIEW";
  status: ReadinessStatus;
  requirements: { key: string; label: string; met: boolean }[];
  missingItems: string[];
}
export interface BiologicalMeasurement { id: string; measurementType: string; value: string; unit: string; observedAt: string; verificationStatus: string }
export interface AssetIncident { id: string; type: string; severity: RiskLevel; detectedAt: string; description?: string; status: string; verificationStatus: string; resolutionEvidenceId?: string | null }
export interface RightsRecord { id: string; rightType: string; holder: string; basisDocumentEvidenceId?: string | null; validFrom: string; validUntil?: string | null; verifiedStatus: string }
export interface CustodyRecord { id: string; physicalCustodian: string; location: string; startAt: string; endAt?: string | null; status: string }
export interface CareAgreement { id: string; serviceTerms: string; careFrequency: string; responsibility: string; riskAllocationSummary: string; status: string; startsAt: string }
export interface AssetOffer { id: string; assetId: string; askingPrice: number; currency: string; status: string; reservedBuyerId?: string | null; reservedAt?: string | null; expiresAt?: string | null; careAfterSaleAvailable: boolean; careTermsSummary?: string | null; asset?: Asset }
export interface AssetTransaction { id: string; assetId?: string; offerId?: string | null; buyerId?: string; status: string; price: number; currency: string; custodyAfterSale: string; transactionAt: string; asset: Asset; offer?: AssetOffer | null; buyer?: { id: string; fullName: string; email: string } }
export interface FulfillmentRequest { id: string; assetId: string; type: string; status: string; requestedAt: string; scheduledAt?: string | null; completedAt?: string | null; notes?: string | null }
export interface AssetValuation { id: string; referenceValue: number; currency: string; valuationSource: string; valuationMethod: string; valuedAt: string; verificationStatus: string }

export interface DigitalPassport {
  id: string;
  assetId: string;
  version: number;
  passportHash: string;
  readinessStatus: ReadinessStatus;
  generatedAt: string;
}

export interface BlockchainTransaction {
  id: string;
  assetId: string;
  type: string;
  signature: string;
  cluster: string;
  signer: string;
  status: ChainStatus;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  displayName: string;
  assetType: string;
  assetLevel: "SINGLE_ASSET" | "LOT" | "PLOT" | "GROWING_AREA";
  species: string;
  scientificName?: string | null;
  cultivar?: string | null;
  propagationSource?: string | null;
  propagationBatchCode?: string | null;
  formationMethod?: string | null;
  plantedAtConfidence: string;
  ageBasis: string;
  initialQuantity?: number | null;
  quantityUnit?: string | null;
  areaHectares?: number | null;
  density?: number | null;
  custodianId: string;
  organizationId: string;
  description: string;
  region: string;
  province?: string | null;
  district?: string | null;
  commune?: string | null;
  exactLatitude?: number;
  exactLongitude?: number;
  plantedAt: string;
  currentStage: LifecycleStage;
  transactionStage: string;
  passportStatus: ReadinessStatus;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  custodian?: Pick<User, "id" | "fullName">;
  evidence?: Evidence[];
  verificationRequests?: VerificationRequest[];
  attestations?: Attestation[];
  lifecycleEvents?: LifecycleEvent[];
  trustProfile?: TrustProfile | null;
  riskProfile?: RiskProfile | null;
  readinessProfiles?: ReadinessProfile[];
  measurements?: BiologicalMeasurement[];
  incidents?: AssetIncident[];
  rightsRecords?: RightsRecord[];
  custodyRecords?: CustodyRecord[];
  careAgreements?: CareAgreement[];
  offers?: AssetOffer[];
  transactions?: AssetTransaction[];
  fulfillmentRequests?: FulfillmentRequest[];
  valuations?: AssetValuation[];
  passports?: DigitalPassport[];
  blockchainTransactions?: BlockchainTransaction[];
}

export const roleLabels: Record<UserRole, string> = {
  operator: "Người quản lý tài sản",
  verifier: "Người xác minh",
  reviewer: "Người duyệt hồ sơ / Đối tác thẩm định",
  buyer: "Người mua tài sản",
  admin: "Quản trị viên",
};

export const stageLabels: Record<LifecycleStage, string> = {
  REGISTERED: "Đã đăng ký",
  PLANTED_VERIFIED: "Đã xác minh gieo trồng",
  GROWING: "Đang sinh trưởng",
  INSPECTED: "Đã kiểm tra",
  MATURE: "Trưởng thành",
  HARVEST_READY: "Sẵn sàng thu hoạch",
  HARVESTED: "Đã thu hoạch",
  ARCHIVED: "Đã lưu trữ",
};
