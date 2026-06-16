-- AlterTable
ALTER TABLE "products" ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "packaging" TEXT,
ADD COLUMN     "priceCategory" TEXT;

-- CreateTable
CREATE TABLE "product_families" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_families_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_families_tenantId_idx" ON "product_families"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_families_tenantId_code_key" ON "product_families"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "product_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
