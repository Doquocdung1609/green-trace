export type UserRole = "operator" | "verifier" | "reviewer" | "admin";

export type EvidenceType =
  | "PHOTO"
  | "GEO_LOCATION"
  | "IOT_READING"
  | "FARM_LOG"
  | "CERTIFICATE"
  | "INSPECTION"
  | "LAB_RESULT"
  | "OTHER";

export type VerificationScope =
  | "EXISTENCE"
  | "LOCATION"
  | "AGE_OR_LIFECYCLE"
  | "CERTIFICATE_VALIDITY"
  | "LAB_RESULT"
  | "IOT_SOURCE"
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
  | "TRANSFERRED"
  | "ARCHIVED";

export type Visibility = "PUBLIC" | "PARTNER" | "PRIVATE";
export type ReadinessStatus =
  | "NOT_READY"
  | "NEEDS_REVIEW"
  | "READY_FOR_FINANCIAL_REVIEW";
export type ChainStatus = "PENDING_CHAIN" | "CONFIRMED" | "FAILED_CHAIN";

export interface Organization {
  id: string;
  name: string;
  type: string;
  region: string;
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
  species: string;
  custodianId: string;
  organizationId: string;
  description: string;
  region: string;
  exactLatitude?: number;
  exactLongitude?: number;
  plantedAt: string;
  currentStage: LifecycleStage;
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
  passports?: DigitalPassport[];
  blockchainTransactions?: BlockchainTransaction[];
}

export const roleLabels: Record<UserRole, string> = {
  operator: "Người quản lý tài sản",
  verifier: "Người xác minh",
  reviewer: "Bên xem hồ sơ",
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
  TRANSFERRED: "Đã chuyển giao",
  ARCHIVED: "Đã lưu trữ",
};
