-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "verifierCategory" TEXT;

-- CreateTable
CREATE TABLE "AssetTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "assetType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiredIdentityFieldsJson" TEXT NOT NULL,
    "optionalFieldsJson" TEXT NOT NULL,
    "requiredEvidenceJson" TEXT NOT NULL,
    "importantEvidenceJson" TEXT NOT NULL,
    "lifecycleRulesJson" TEXT NOT NULL,
    "riskRulesJson" TEXT NOT NULL,
    "readinessRulesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "policyKeysJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationProfile_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssetTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "verificationRequired" BOOLEAN NOT NULL,
    "requiredScope" TEXT,
    "requiredVerifierCategory" TEXT,
    "independentOrganizationRequired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAfterDays" INTEGER,
    "affectsReadiness" BOOLEAN NOT NULL DEFAULT false,
    "affectsLifecycle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Required before SQLite rebuilds Evidence with a foreign key to the policy key.
CREATE UNIQUE INDEX "VerificationPolicy_key_key" ON "VerificationPolicy"("key");
CREATE UNIQUE INDEX "VerificationPolicy_evidenceType_key" ON "VerificationPolicy"("evidenceType");

-- CreateTable
CREATE TABLE "BiologicalMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "sourceEvidenceId" TEXT,
    "reportedById" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BiologicalMeasurement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BiologicalMeasurement_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BiologicalMeasurement_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL,
    "reportedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceIds" TEXT NOT NULL DEFAULT '[]',
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetIncident_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "overallRisk" TEXT NOT NULL,
    "biologicalRisk" TEXT NOT NULL,
    "diseaseRisk" TEXT NOT NULL,
    "locationRisk" TEXT NOT NULL,
    "freshnessRisk" TEXT NOT NULL,
    "certificateRisk" TEXT NOT NULL,
    "custodyRisk" TEXT NOT NULL,
    "weatherRisk" TEXT NOT NULL,
    "operationalRisk" TEXT NOT NULL,
    "openIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "reasonsJson" TEXT NOT NULL DEFAULT '[]',
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RightsRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "rightType" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "holderOrganizationId" TEXT,
    "basisDocumentEvidenceId" TEXT,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "verifiedStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RightsRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RightsRecord_holderOrganizationId_fkey" FOREIGN KEY ("holderOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RightsRecord_basisDocumentEvidenceId_fkey" FOREIGN KEY ("basisDocumentEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "caretakerOrganizationId" TEXT NOT NULL,
    "serviceTerms" TEXT NOT NULL,
    "careFee" REAL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "careFrequency" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,
    "riskAllocationSummary" TEXT NOT NULL,
    "documentEvidenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareAgreement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareAgreement_caretakerOrganizationId_fkey" FOREIGN KEY ("caretakerOrganizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CareAgreement_documentEvidenceId_fkey" FOREIGN KEY ("documentEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustodyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "physicalCustodian" TEXT NOT NULL,
    "custodianOrganizationId" TEXT,
    "location" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "careAgreementId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "documentEvidenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustodyRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyRecord_custodianOrganizationId_fkey" FOREIGN KEY ("custodianOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyRecord_careAgreementId_fkey" FOREIGN KEY ("careAgreementId") REFERENCES "CareAgreement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyRecord_documentEvidenceId_fkey" FOREIGN KEY ("documentEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "saleMode" TEXT NOT NULL DEFAULT 'OUTRIGHT_PURCHASE',
    "askingPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "sellerOrganizationId" TEXT NOT NULL,
    "careAfterSaleAvailable" BOOLEAN NOT NULL DEFAULT false,
    "careTermsSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetOffer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetOffer_sellerOrganizationId_fkey" FOREIGN KEY ("sellerOrganizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "offerId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerOrganizationId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "transactionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rightsDocumentEvidenceId" TEXT,
    "custodyAfterSale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PURCHASE_REQUESTED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetTransaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AssetOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssetTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetTransaction_sellerOrganizationId_fkey" FOREIGN KEY ("sellerOrganizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetTransaction_rightsDocumentEvidenceId_fkey" FOREIGN KEY ("rightsDocumentEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purpose" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "summarySnapshot" TEXT NOT NULL,
    "decision" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "ReviewCase_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewCase_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewCase_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requirementsJson" TEXT NOT NULL,
    "missingItemsJson" TEXT NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FulfillmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "FulfillmentRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FulfillmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetValuation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "referenceValue" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "valuationSource" TEXT NOT NULL,
    "valuationMethod" TEXT NOT NULL,
    "valuedAt" DATETIME NOT NULL,
    "valuatorOrganizationId" TEXT,
    "supportingEvidenceId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetValuation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetValuation_valuatorOrganizationId_fkey" FOREIGN KEY ("valuatorOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssetValuation_supportingEvidenceId_fkey" FOREIGN KEY ("supportingEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "assetLevel" TEXT NOT NULL DEFAULT 'LOT',
    "species" TEXT NOT NULL,
    "scientificName" TEXT,
    "cultivar" TEXT,
    "propagationSource" TEXT,
    "propagationBatchCode" TEXT,
    "formationMethod" TEXT,
    "plantedAt" DATETIME NOT NULL,
    "plantedAtConfidence" TEXT NOT NULL DEFAULT 'DECLARED',
    "ageBasis" TEXT NOT NULL DEFAULT 'DECLARED',
    "initialQuantity" REAL,
    "quantityUnit" TEXT,
    "areaHectares" REAL,
    "density" REAL,
    "custodianId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caretaker" TEXT,
    "managementBasis" TEXT,
    "description" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "commune" TEXT,
    "exactLatitude" REAL NOT NULL,
    "exactLongitude" REAL NOT NULL,
    "elevationMeters" REAL,
    "spatialType" TEXT NOT NULL DEFAULT 'POINT',
    "boundaryGeoJson" TEXT,
    "growingAreaCode" TEXT,
    "geographicalIndication" TEXT,
    "templateId" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'REGISTERED',
    "transactionStage" TEXT NOT NULL DEFAULT 'NOT_LISTED',
    "passportStatus" TEXT NOT NULL DEFAULT 'NOT_READY',
    "photoUrl" TEXT,
    "metadataHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssetTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("assetCode", "assetType", "createdAt", "currentStage", "custodianId", "description", "displayName", "exactLatitude", "exactLongitude", "id", "metadataHash", "organizationId", "passportStatus", "photoUrl", "plantedAt", "region", "species", "updatedAt") SELECT "assetCode", "assetType", "createdAt", "currentStage", "custodianId", "description", "displayName", "exactLatitude", "exactLongitude", "id", "metadataHash", "organizationId", "passportStatus", "photoUrl", "plantedAt", "region", "species", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");
CREATE TABLE "new_Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'DECLARED',
    "observedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    "storageUri" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "systemValidationStatus" TEXT NOT NULL DEFAULT 'PASSED',
    "verificationPolicyKey" TEXT,
    "metadataJson" TEXT,
    CONSTRAINT "Evidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evidence_verificationPolicyKey_fkey" FOREIGN KEY ("verificationPolicyKey") REFERENCES "VerificationPolicy" ("key") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evidence" ("assetId", "contentHash", "description", "id", "metadataJson", "mimeType", "observedAt", "source", "storageUri", "submittedAt", "submittedBy", "title", "type", "validFrom", "validUntil", "verificationStatus", "visibility") SELECT "assetId", "contentHash", "description", "id", "metadataJson", "mimeType", "observedAt", "source", "storageUri", "submittedAt", "submittedBy", "title", "type", "validFrom", "validUntil", "verificationStatus", "visibility" FROM "Evidence";
DROP TABLE "Evidence";
ALTER TABLE "new_Evidence" RENAME TO "Evidence";
CREATE INDEX "Evidence_assetId_contentHash_idx" ON "Evidence"("assetId", "contentHash");
CREATE INDEX "Evidence_type_verificationStatus_idx" ON "Evidence"("type", "verificationStatus");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "permissionsJson" TEXT NOT NULL DEFAULT '[]',
    "organizationId" TEXT,
    "solanaWallet" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "fullName", "id", "organizationId", "passwordHash", "phone", "role", "solanaWallet", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "organizationId", "passwordHash", "phone", "role", "solanaWallet", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_VerificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "policyId" TEXT,
    "requestedScope" TEXT NOT NULL,
    "requiredVerifierCategory" TEXT,
    "requestedVerifierId" TEXT,
    "requesterId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "VerificationRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationRequest_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VerificationRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "VerificationPolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VerificationRequest_requestedVerifierId_fkey" FOREIGN KEY ("requestedVerifierId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VerificationRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VerificationRequest" ("assetId", "createdAt", "evidenceId", "id", "requestedScope", "requestedVerifierId", "requesterId", "resolvedAt", "status") SELECT "assetId", "createdAt", "evidenceId", "id", "requestedScope", "requestedVerifierId", "requesterId", "resolvedAt", "status" FROM "VerificationRequest";
DROP TABLE "VerificationRequest";
ALTER TABLE "new_VerificationRequest" RENAME TO "VerificationRequest";
CREATE INDEX "VerificationRequest_status_requestedVerifierId_idx" ON "VerificationRequest"("status", "requestedVerifierId");
CREATE INDEX "VerificationRequest_requiredVerifierCategory_status_idx" ON "VerificationRequest"("requiredVerifierCategory", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AssetTemplate_key_key" ON "AssetTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationProfile_templateId_key" ON "VerificationProfile"("templateId");

-- CreateIndex
CREATE INDEX "BiologicalMeasurement_assetId_measurementType_observedAt_idx" ON "BiologicalMeasurement"("assetId", "measurementType", "observedAt");

-- CreateIndex
CREATE INDEX "AssetIncident_assetId_status_severity_idx" ON "AssetIncident"("assetId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_assetId_key" ON "RiskProfile"("assetId");

-- CreateIndex
CREATE INDEX "RightsRecord_assetId_verifiedStatus_idx" ON "RightsRecord"("assetId", "verifiedStatus");

-- CreateIndex
CREATE INDEX "CustodyRecord_assetId_status_idx" ON "CustodyRecord"("assetId", "status");

-- CreateIndex
CREATE INDEX "AssetOffer_status_createdAt_idx" ON "AssetOffer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AssetTransaction_buyerId_status_idx" ON "AssetTransaction"("buyerId", "status");

-- CreateIndex
CREATE INDEX "AssetTransaction_assetId_transactionAt_idx" ON "AssetTransaction"("assetId", "transactionAt");

-- CreateIndex
CREATE INDEX "ReviewCase_status_purpose_idx" ON "ReviewCase"("status", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessProfile_assetId_purpose_key" ON "ReadinessProfile"("assetId", "purpose");

-- CreateIndex
CREATE INDEX "FulfillmentRequest_assetId_status_idx" ON "FulfillmentRequest"("assetId", "status");
