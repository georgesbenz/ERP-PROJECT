-- CreateEnum
CREATE TYPE "adjustment_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "transfer_status" AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "stock_state" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'DAMAGED', 'EXPIRED', 'INSPECTION', 'ON_HOLD', 'SCRAPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "movement_type" ADD VALUE 'PURCHASE_RECEIPT';
ALTER TYPE "movement_type" ADD VALUE 'PURCHASE_PARTIAL_RECEIPT';
ALTER TYPE "movement_type" ADD VALUE 'PURCHASE_RETURN_SUPPLIER';
ALTER TYPE "movement_type" ADD VALUE 'SALE_DELIVERY';
ALTER TYPE "movement_type" ADD VALUE 'SALE_PARTIAL_DELIVERY';
ALTER TYPE "movement_type" ADD VALUE 'CUSTOMER_RETURN_RESALABLE';
ALTER TYPE "movement_type" ADD VALUE 'CUSTOMER_RETURN_DAMAGED';
ALTER TYPE "movement_type" ADD VALUE 'POS_SALE';
ALTER TYPE "movement_type" ADD VALUE 'ADJUSTMENT_IN';
ALTER TYPE "movement_type" ADD VALUE 'ADJUSTMENT_OUT';
ALTER TYPE "movement_type" ADD VALUE 'DAMAGE_WRITE_OFF';
ALTER TYPE "movement_type" ADD VALUE 'EXPIRY_WRITE_OFF';
ALTER TYPE "movement_type" ADD VALUE 'STATE_CHANGE';
ALTER TYPE "movement_type" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "movement_type" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "movement_type" ADD VALUE 'OPENING_STOCK';
ALTER TYPE "movement_type" ADD VALUE 'CYCLE_COUNT_IN';
ALTER TYPE "movement_type" ADD VALUE 'CYCLE_COUNT_OUT';
ALTER TYPE "movement_type" ADD VALUE 'PRODUCTION_IN';
ALTER TYPE "movement_type" ADD VALUE 'PRODUCTION_OUT';
ALTER TYPE "movement_type" ADD VALUE 'RESERVATION';
ALTER TYPE "movement_type" ADD VALUE 'RESERVATION_RELEASE';
ALTER TYPE "movement_type" ADD VALUE 'BACKORDER_FULFILL';

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "damagedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "expiredQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "inTransitQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "inspectionQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
ADD COLUMN     "onHoldQty" DECIMAL(15,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "fromState" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "referenceType" TEXT,
ADD COLUMN     "serialId" TEXT,
ADD COLUMN     "toState" TEXT,
ADD COLUMN     "warehouseToId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "alertQty" DECIMAL(15,4),
ADD COLUMN     "hasExpiry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reorderPoint" DECIMAL(15,4),
ADD COLUMN     "safetyStock" DECIMAL(15,4),
ADD COLUMN     "trackBatches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackSerials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valuationMethod" TEXT NOT NULL DEFAULT 'WEIGHTED_AVG';

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "adjustment_status" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_lines" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQty" DECIMAL(15,4) NOT NULL,
    "physicalQty" DECIMAL(15,4) NOT NULL,
    "variance" DECIMAL(15,4) NOT NULL,
    "unitCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "stock_adjustment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" "transfer_status" NOT NULL DEFAULT 'DRAFT',
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_lines" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" DECIMAL(15,4) NOT NULL,
    "sentQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "receivedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "saleId" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "quantity" DECIMAL(15,4) NOT NULL,
    "costPrice" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "serial" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseRef" TEXT,
    "saleRef" TEXT,
    "batchId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,
    "minQty" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "maxQty" DECIMAL(15,4),

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backorders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "orderedQty" DECIMAL(15,4) NOT NULL,
    "deliveredQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "pendingQty" DECIMAL(15,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_counts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count_lines" (
    "id" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQty" DECIMAL(15,4) NOT NULL,
    "countedQty" DECIMAL(15,4),
    "variance" DECIMAL(15,4),
    "notes" TEXT,

    CONSTRAINT "cycle_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_tenantId_idx" ON "stock_adjustments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_tenantId_reference_key" ON "stock_adjustments"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "stock_adjustment_lines_adjustmentId_idx" ON "stock_adjustment_lines"("adjustmentId");

-- CreateIndex
CREATE INDEX "warehouse_transfers_tenantId_idx" ON "warehouse_transfers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_transfers_tenantId_reference_key" ON "warehouse_transfers"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "transfer_lines_transferId_idx" ON "transfer_lines"("transferId");

-- CreateIndex
CREATE INDEX "stock_reservations_tenantId_idx" ON "stock_reservations"("tenantId");

-- CreateIndex
CREATE INDEX "stock_reservations_tenantId_productId_warehouseId_idx" ON "stock_reservations"("tenantId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_batches_tenantId_idx" ON "stock_batches"("tenantId");

-- CreateIndex
CREATE INDEX "stock_batches_tenantId_productId_idx" ON "stock_batches"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_tenantId_productId_batchNumber_key" ON "stock_batches"("tenantId", "productId", "batchNumber");

-- CreateIndex
CREATE INDEX "serial_numbers_tenantId_idx" ON "serial_numbers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_tenantId_productId_serial_key" ON "serial_numbers"("tenantId", "productId", "serial");

-- CreateIndex
CREATE INDEX "price_lists_tenantId_idx" ON "price_lists"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_tenantId_code_key" ON "price_lists"("tenantId", "code");

-- CreateIndex
CREATE INDEX "price_list_items_priceListId_idx" ON "price_list_items"("priceListId");

-- CreateIndex
CREATE INDEX "price_list_items_productId_idx" ON "price_list_items"("productId");

-- CreateIndex
CREATE INDEX "backorders_tenantId_idx" ON "backorders"("tenantId");

-- CreateIndex
CREATE INDEX "backorders_tenantId_saleId_idx" ON "backorders"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "cycle_counts_tenantId_idx" ON "cycle_counts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_counts_tenantId_reference_key" ON "cycle_counts"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "cycle_count_lines_cycleCountId_idx" ON "cycle_count_lines"("cycleCountId");

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_lines" ADD CONSTRAINT "transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "warehouse_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_lines" ADD CONSTRAINT "transfer_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "cycle_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
