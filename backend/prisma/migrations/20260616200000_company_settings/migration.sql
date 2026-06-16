-- Phase 8: Company Settings — expand tenants table + 5 new company models

-- ─── Expand tenants table ────────────────────────────────────────────────────

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "tradingName"         TEXT,
  ADD COLUMN IF NOT EXISTS "slogan"              TEXT,
  ADD COLUMN IF NOT EXISTS "industry"            TEXT,
  ADD COLUMN IF NOT EXISTS "dateEstablished"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "businessDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "website"             TEXT,
  ADD COLUMN IF NOT EXISTS "email2"              TEXT,
  ADD COLUMN IF NOT EXISTS "phone2"              TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp"            TEXT,
  ADD COLUMN IF NOT EXISTS "physicalAddress"     TEXT,
  ADD COLUMN IF NOT EXISTS "postalAddress"       TEXT,
  ADD COLUMN IF NOT EXISTS "district"            TEXT,
  ADD COLUMN IF NOT EXISTS "subdivision"         TEXT,
  ADD COLUMN IF NOT EXISTS "division"            TEXT,
  ADD COLUMN IF NOT EXISTS "region"              TEXT,
  ADD COLUMN IF NOT EXISTS "gpsCoordinates"      TEXT,
  ADD COLUMN IF NOT EXISTS "rccm"                TEXT,
  ADD COLUMN IF NOT EXISTS "niu"                 TEXT,
  ADD COLUMN IF NOT EXISTS "taxId"               TEXT,
  ADD COLUMN IF NOT EXISTS "cnps"                TEXT,
  ADD COLUMN IF NOT EXISTS "patent"              TEXT,
  ADD COLUMN IF NOT EXISTS "statisticalNumber"   TEXT,
  ADD COLUMN IF NOT EXISTS "shareCapital"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "legalForm"           TEXT,
  ADD COLUMN IF NOT EXISTS "vatEnabled"          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "vatNumber"           TEXT,
  ADD COLUMN IF NOT EXISTS "taxRegime"           TEXT,
  ADD COLUMN IF NOT EXISTS "taxOffice"           TEXT,
  ADD COLUMN IF NOT EXISTS "ohadaEnabled"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fiscalYearStart"     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "fiscalYearEnd"       INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "accountingMethod"    TEXT NOT NULL DEFAULT 'ACCRUAL',
  ADD COLUMN IF NOT EXISTS "language"            TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS "dateFormat"          TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS "timeFormat"          TEXT NOT NULL DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS "decimalPrecision"    INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "multiBranch"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "multiWarehouse"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "multiCurrency"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "receiptSize"         TEXT NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS "autoPrint"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxDiscountPct"      DOUBLE PRECISION NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "mandatoryCashOpen"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mandatoryCashClose"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "returnPolicyDays"    INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS "lowStockThreshold"      INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "criticalStockThreshold" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "defaultValuationMethod" TEXT NOT NULL DEFAULT 'FIFO';

-- ─── company_bank_accounts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_bank_accounts" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "bankName"      TEXT NOT NULL,
    "accountName"   TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban"          TEXT,
    "swift"         TEXT,
    "branch"        TEXT,
    "currency"      TEXT NOT NULL DEFAULT 'XAF',
    "isDefault"     BOOLEAN NOT NULL DEFAULT false,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_bank_accounts_tenantId_idx" ON "company_bank_accounts"("tenantId");

ALTER TABLE "company_bank_accounts"
  DROP CONSTRAINT IF EXISTS "company_bank_accounts_tenantId_fkey";
ALTER TABLE "company_bank_accounts"
  ADD CONSTRAINT "company_bank_accounts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── company_representatives ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_representatives" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "title"     TEXT,
    "phone"     TEXT,
    "email"     TEXT,
    "role"      TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_representatives_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_representatives_tenantId_idx" ON "company_representatives"("tenantId");

ALTER TABLE "company_representatives"
  DROP CONSTRAINT IF EXISTS "company_representatives_tenantId_fkey";
ALTER TABLE "company_representatives"
  ADD CONSTRAINT "company_representatives_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── company_documents ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_documents" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "fileUrl"   TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_documents_tenantId_idx" ON "company_documents"("tenantId");

ALTER TABLE "company_documents"
  DROP CONSTRAINT IF EXISTS "company_documents_tenantId_fkey";
ALTER TABLE "company_documents"
  ADD CONSTRAINT "company_documents_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── company_document_sequences ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_document_sequences" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "docType"    TEXT NOT NULL,
    "prefix"     TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padding"    INTEGER NOT NULL DEFAULT 5,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_document_sequences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_document_sequences_tenantId_docType_key" UNIQUE ("tenantId", "docType")
);

ALTER TABLE "company_document_sequences"
  DROP CONSTRAINT IF EXISTS "company_document_sequences_tenantId_fkey";
ALTER TABLE "company_document_sequences"
  ADD CONSTRAINT "company_document_sequences_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── company_social_media ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "company_social_media" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "platform"  TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_social_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_social_media_tenantId_platform_key" UNIQUE ("tenantId", "platform")
);

ALTER TABLE "company_social_media"
  DROP CONSTRAINT IF EXISTS "company_social_media_tenantId_fkey";
ALTER TABLE "company_social_media"
  ADD CONSTRAINT "company_social_media_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
