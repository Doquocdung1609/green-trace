-- GreenTrace final hardening: review locking, incident resolution evidence,
-- template prefixes, offer reservation and exact decimal money columns.
ALTER TABLE "ReviewCase" ADD COLUMN "claimedAt" DATETIME;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AssetIncident" (
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
    "resolutionEvidenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetIncident_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetIncident_resolutionEvidenceId_fkey" FOREIGN KEY ("resolutionEvidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AssetIncident" ("assetId", "createdAt", "description", "detectedAt", "evidenceIds", "id", "reportedById", "resolutionNote", "resolvedAt", "severity", "status", "type", "updatedAt", "verificationStatus") SELECT "assetId", "createdAt", "description", "detectedAt", "evidenceIds", "id", "reportedById", "resolutionNote", "resolvedAt", "severity", "status", "type", "updatedAt", "verificationStatus" FROM "AssetIncident";
DROP TABLE "AssetIncident";
ALTER TABLE "new_AssetIncident" RENAME TO "AssetIncident";
CREATE INDEX "AssetIncident_assetId_status_severity_idx" ON "AssetIncident"("assetId", "status", "severity");

CREATE TABLE "new_AssetOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "saleMode" TEXT NOT NULL DEFAULT 'OUTRIGHT_PURCHASE',
    "askingPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "sellerOrganizationId" TEXT NOT NULL,
    "careAfterSaleAvailable" BOOLEAN NOT NULL DEFAULT false,
    "careTermsSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reservedBuyerId" TEXT,
    "reservedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetOffer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetOffer_sellerOrganizationId_fkey" FOREIGN KEY ("sellerOrganizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetOffer_reservedBuyerId_fkey" FOREIGN KEY ("reservedBuyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AssetOffer" ("askingPrice", "assetId", "careAfterSaleAvailable", "careTermsSummary", "createdAt", "currency", "id", "saleMode", "sellerOrganizationId", "status", "updatedAt") SELECT "askingPrice", "assetId", "careAfterSaleAvailable", "careTermsSummary", "createdAt", "currency", "id", "saleMode", "sellerOrganizationId", "status", "updatedAt" FROM "AssetOffer";
DROP TABLE "AssetOffer";
ALTER TABLE "new_AssetOffer" RENAME TO "AssetOffer";
CREATE INDEX "AssetOffer_status_createdAt_idx" ON "AssetOffer"("status", "createdAt");
CREATE UNIQUE INDEX "AssetOffer_one_active_per_asset" ON "AssetOffer"("assetId") WHERE "status" IN ('AVAILABLE', 'RESERVED');

CREATE TABLE "new_AssetTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "assetType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'GN',
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
INSERT INTO "new_AssetTemplate" ("active", "assetType", "createdAt", "id", "importantEvidenceJson", "key", "lifecycleRulesJson", "name", "optionalFieldsJson", "readinessRulesJson", "requiredEvidenceJson", "requiredIdentityFieldsJson", "riskRulesJson", "updatedAt", "version") SELECT "active", "assetType", "createdAt", "id", "importantEvidenceJson", "key", "lifecycleRulesJson", "name", "optionalFieldsJson", "readinessRulesJson", "requiredEvidenceJson", "requiredIdentityFieldsJson", "riskRulesJson", "updatedAt", "version" FROM "AssetTemplate";
DROP TABLE "AssetTemplate";
ALTER TABLE "new_AssetTemplate" RENAME TO "AssetTemplate";
CREATE UNIQUE INDEX "AssetTemplate_key_key" ON "AssetTemplate"("key");

CREATE TABLE "new_AssetTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "offerId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerOrganizationId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
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
INSERT INTO "new_AssetTransaction" ("assetId", "buyerId", "createdAt", "currency", "custodyAfterSale", "id", "notes", "offerId", "price", "rightsDocumentEvidenceId", "sellerOrganizationId", "status", "transactionAt", "updatedAt") SELECT "assetId", "buyerId", "createdAt", "currency", "custodyAfterSale", "id", "notes", "offerId", "price", "rightsDocumentEvidenceId", "sellerOrganizationId", "status", "transactionAt", "updatedAt" FROM "AssetTransaction";
DROP TABLE "AssetTransaction";
ALTER TABLE "new_AssetTransaction" RENAME TO "AssetTransaction";
CREATE INDEX "AssetTransaction_buyerId_status_idx" ON "AssetTransaction"("buyerId", "status");
CREATE INDEX "AssetTransaction_assetId_transactionAt_idx" ON "AssetTransaction"("assetId", "transactionAt");

CREATE TABLE "new_AssetValuation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "referenceValue" DECIMAL NOT NULL,
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
INSERT INTO "new_AssetValuation" ("assetId", "createdAt", "currency", "id", "referenceValue", "supportingEvidenceId", "valuationMethod", "valuationSource", "valuatorOrganizationId", "valuedAt", "verificationStatus") SELECT "assetId", "createdAt", "currency", "id", "referenceValue", "supportingEvidenceId", "valuationMethod", "valuationSource", "valuatorOrganizationId", "valuedAt", "verificationStatus" FROM "AssetValuation";
DROP TABLE "AssetValuation";
ALTER TABLE "new_AssetValuation" RENAME TO "AssetValuation";

CREATE TABLE "new_CareAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "caretakerOrganizationId" TEXT NOT NULL,
    "serviceTerms" TEXT NOT NULL,
    "careFee" DECIMAL,
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
INSERT INTO "new_CareAgreement" ("assetId", "careFee", "careFrequency", "caretakerOrganizationId", "createdAt", "currency", "documentEvidenceId", "endsAt", "id", "responsibility", "riskAllocationSummary", "serviceTerms", "startsAt", "status") SELECT "assetId", "careFee", "careFrequency", "caretakerOrganizationId", "createdAt", "currency", "documentEvidenceId", "endsAt", "id", "responsibility", "riskAllocationSummary", "serviceTerms", "startsAt", "status" FROM "CareAgreement";
DROP TABLE "CareAgreement";
ALTER TABLE "new_CareAgreement" RENAME TO "CareAgreement";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
