import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ── DTOs (inline) ─────────────────────────────────────────────────────────────

export interface CreateAdjustmentDto {
  warehouseId: string;
  reason: string;
  notes?: string;
  lines: {
    productId: string;
    systemQty: number;
    physicalQty: number;
    unitCost?: number;
    reason?: string;
    notes?: string;
  }[];
}

export interface CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  lines: {
    productId: string;
    requestedQty: number;
    unitCost?: number;
    notes?: string;
  }[];
}

export interface ReceiveLineDto {
  lineId: string;
  receivedQty: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRef(prefix: string): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ms = now.getTime().toString().slice(-6);
  return `${prefix}-${ymd}-${ms}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // ── Stock Overview ──────────────────────────────────────────────────────────

  async getStockLevels(
    tenantId: string,
    warehouseId?: string,
    search?: string,
    lowStockOnly?: boolean,
  ) {
    const where: Prisma.InventoryWhereInput = { tenantId };
    if (warehouseId) where.warehouseId = warehouseId;
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
        deletedAt: null,
      };
    } else {
      where.product = { deletedAt: null };
    }

    const items = await this.prisma.inventory.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, minStock: true, costPrice: true, reorderPoint: true, safetyStock: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
    });

    const result = items.map((inv) => {
      const qty = Number(inv.quantity);
      const minStock = Number(inv.product.minStock ?? 0);
      const reorderPoint = inv.product.reorderPoint ? Number(inv.product.reorderPoint) : null;
      return {
        ...inv,
        available: qty,
        reserved: Number(inv.reservedQty),
        damaged: Number(inv.damagedQty),
        expired: Number(inv.expiredQty),
        inTransit: Number(inv.inTransitQty),
        inspection: Number(inv.inspectionQty),
        onHold: Number(inv.onHoldQty),
        physical: qty + Number(inv.reservedQty) + Number(inv.damagedQty),
        isLowStock: qty <= minStock && qty > 0,
        isOutOfStock: qty <= 0,
        isReorderNeeded: reorderPoint !== null && qty <= reorderPoint,
        stockValue: qty * Number(inv.product.costPrice),
      };
    });

    if (lowStockOnly) {
      return result.filter((r) => r.isLowStock || r.isOutOfStock);
    }
    return result;
  }

  async getProductStock(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const inventories = await this.prisma.inventory.findMany({
      where: { tenantId, productId },
      include: { warehouse: true },
    });

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { tenantId, productId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { warehouse: true },
    });

    const totalQty = inventories.reduce((s, i) => s + Number(i.quantity), 0);
    const totalReserved = inventories.reduce((s, i) => s + Number(i.reservedQty), 0);
    const totalDamaged = inventories.reduce((s, i) => s + Number(i.damagedQty), 0);

    return {
      product,
      warehouses: inventories.map((inv) => ({
        ...inv,
        available: Number(inv.quantity),
        reserved: Number(inv.reservedQty),
        damaged: Number(inv.damagedQty),
        inTransit: Number(inv.inTransitQty),
      })),
      totals: {
        available: totalQty,
        reserved: totalReserved,
        damaged: totalDamaged,
        physical: totalQty + totalReserved + totalDamaged,
        value: totalQty * Number(product.costPrice),
      },
      recentMovements: movements,
    };
  }

  async getStockSummary(tenantId: string) {
    const [inventories, lowStockCount, outOfStockCount, recentMovements] =
      await Promise.all([
        this.prisma.inventory.findMany({
          where: { tenantId },
          include: { product: { select: { costPrice: true, minStock: true } } },
        }),
        this.prisma.inventory.count({
          where: {
            tenantId,
            quantity: { gt: 0 },
            product: {
              deletedAt: null,
              minStock: { gt: 0 },
            },
          },
        }),
        this.prisma.inventory.count({
          where: { tenantId, quantity: { lte: 0 } },
        }),
        this.prisma.inventoryMovement.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } },
          },
        }),
      ]);

    const totalValue = inventories.reduce(
      (s, inv) => s + Number(inv.quantity) * Number(inv.product.costPrice),
      0,
    );
    const totalProducts = new Set(inventories.map((i) => i.productId)).size;

    // low stock = qty <= minStock but > 0
    const actualLowStock = inventories.filter((inv) => {
      const qty = Number(inv.quantity);
      const min = Number(inv.product.minStock ?? 0);
      return qty > 0 && qty <= min;
    }).length;

    return {
      totalProducts,
      totalStockValue: totalValue,
      lowStockCount: actualLowStock,
      outOfStockCount,
      recentMovements,
    };
  }

  // ── Movements ───────────────────────────────────────────────────────────────

  async getMovements(
    tenantId: string,
    filters: {
      warehouseId?: string;
      productId?: string;
      type?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = { tenantId };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.productId) where.productId = filters.productId;
    if (filters.type) where.type = filters.type as any;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59Z') } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true, code: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ── Adjustments ─────────────────────────────────────────────────────────────

  async createAdjustment(
    tenantId: string,
    userId: string,
    dto: CreateAdjustmentDto,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const reference = genRef('ADJ');

    return this.prisma.stockAdjustment.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        reference,
        reason: dto.reason,
        notes: dto.notes,
        totalLines: dto.lines.length,
        createdBy: userId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            systemQty: line.systemQty,
            physicalQty: line.physicalQty,
            variance: line.physicalQty - line.systemQty,
            unitCost: line.unitCost ?? 0,
            reason: line.reason,
            notes: line.notes,
          })),
        },
      },
      include: { lines: { include: { product: true } }, warehouse: true },
    });
  }

  async getAdjustments(tenantId: string, status?: string, page = 1) {
    const limit = 20;
    const where: Prisma.StockAdjustmentWhereInput = { tenantId };
    if (status) where.status = status as any;

    const [items, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        include: {
          warehouse: { select: { name: true, code: true } },
          lines: { include: { product: { select: { name: true, sku: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async approveAdjustment(
    tenantId: string,
    id: string,
    userId: string,
    approved: boolean,
    comments?: string,
  ) {
    const adj = await this.prisma.stockAdjustment.findFirst({
      where: { id, tenantId },
    });
    if (!adj) throw new NotFoundException('Adjustment not found');
    if (adj.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Adjustment is not pending approval');
    }

    return this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes: comments ? `${adj.notes ?? ''}\nApproval note: ${comments}` : adj.notes,
      },
    });
  }

  async applyAdjustment(tenantId: string, id: string, userId: string) {
    const adj = await this.prisma.stockAdjustment.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!adj) throw new NotFoundException('Adjustment not found');
    if (adj.status !== 'APPROVED' && adj.status !== 'DRAFT') {
      throw new BadRequestException('Adjustment must be APPROVED or DRAFT to apply');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of adj.lines) {
        const variance = Number(line.variance);
        if (variance === 0) continue;

        const movementType = variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
        const qty = Math.abs(variance);

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: adj.warehouseId,
            type: movementType as any,
            quantity: qty,
            unitCost: line.unitCost,
            reference: adj.reference,
            notes: `Adjustment: ${adj.reason}`,
            createdBy: userId,
            referenceType: 'STOCK_ADJUSTMENT',
            reason: adj.reason,
          },
        });

        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: adj.warehouseId,
            },
          },
          update: { quantity: { increment: variance } },
          create: {
            tenantId,
            productId: line.productId,
            warehouseId: adj.warehouseId,
            quantity: variance > 0 ? variance : 0,
          },
        });
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: { status: 'APPLIED', appliedAt: new Date() },
        include: { lines: true, warehouse: true },
      });
    });
  }

  async submitAdjustmentForApproval(tenantId: string, id: string) {
    const adj = await this.prisma.stockAdjustment.findFirst({
      where: { id, tenantId },
    });
    if (!adj) throw new NotFoundException('Adjustment not found');
    if (adj.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT adjustments can be submitted for approval');
    }
    return this.prisma.stockAdjustment.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  // ── Warehouse Transfers ──────────────────────────────────────────────────────

  async createTransfer(
    tenantId: string,
    userId: string,
    dto: CreateTransferDto,
  ) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('From and To warehouses must be different');
    }

    const [from, to] = await Promise.all([
      this.prisma.warehouse.findFirst({ where: { id: dto.fromWarehouseId, tenantId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.toWarehouseId, tenantId } }),
    ]);
    if (!from) throw new NotFoundException('Source warehouse not found');
    if (!to) throw new NotFoundException('Destination warehouse not found');

    const reference = genRef('TRF');

    return this.prisma.warehouseTransfer.create({
      data: {
        tenantId,
        reference,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        notes: dto.notes,
        createdBy: userId,
        lines: {
          create: dto.lines.map((line, idx) => ({
            productId: line.productId,
            requestedQty: line.requestedQty,
            unitCost: line.unitCost ?? 0,
            notes: line.notes,
            sortOrder: idx,
          })),
        },
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: { include: { product: true } },
      },
    });
  }

  async getTransfers(tenantId: string, status?: string, page = 1) {
    const limit = 20;
    const where: Prisma.WarehouseTransferWhereInput = { tenantId };
    if (status) where.status = status as any;

    const [items, total] = await Promise.all([
      this.prisma.warehouseTransfer.findMany({
        where,
        include: {
          fromWarehouse: { select: { name: true, code: true } },
          toWarehouse: { select: { name: true, code: true } },
          lines: { include: { product: { select: { name: true, sku: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouseTransfer.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async sendTransfer(tenantId: string, id: string, userId: string) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING') {
      throw new BadRequestException('Transfer must be DRAFT or PENDING to send');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const qty = Number(line.requestedQty);

        // Create TRANSFER_OUT movement at source
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: transfer.fromWarehouseId,
            type: 'TRANSFER_OUT',
            quantity: qty,
            unitCost: line.unitCost,
            reference: transfer.reference,
            notes: `Transfer to warehouse`,
            createdBy: userId,
            referenceType: 'WAREHOUSE_TRANSFER',
            warehouseToId: transfer.toWarehouseId,
          },
        });

        // Reduce qty at source, increase inTransit
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: transfer.fromWarehouseId,
            },
          },
          update: {
            quantity: { decrement: qty },
            inTransitQty: { increment: qty },
          },
          create: {
            tenantId,
            productId: line.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: 0,
            inTransitQty: qty,
          },
        });

        // Update line sentQty
        await tx.transferLine.update({
          where: { id: line.id },
          data: { sentQty: qty },
        });
      }

      return tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT', sentDate: new Date() },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          lines: { include: { product: true } },
        },
      });
    });
  }

  async receiveTransfer(
    tenantId: string,
    id: string,
    userId: string,
    lines: ReceiveLineDto[],
  ) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException('Transfer must be IN_TRANSIT to receive');
    }

    return this.prisma.$transaction(async (tx) => {
      let allReceived = true;

      for (const recv of lines) {
        const line = transfer.lines.find((l) => l.id === recv.lineId);
        if (!line) continue;

        const qty = Number(recv.receivedQty);
        if (qty <= 0) continue;

        // Create TRANSFER_IN movement at destination
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: transfer.toWarehouseId,
            type: 'TRANSFER_IN',
            quantity: qty,
            unitCost: line.unitCost,
            reference: transfer.reference,
            notes: `Transfer from warehouse`,
            createdBy: userId,
            referenceType: 'WAREHOUSE_TRANSFER',
          },
        });

        // Increase qty at destination
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: transfer.toWarehouseId,
            },
          },
          update: { quantity: { increment: qty } },
          create: {
            tenantId,
            productId: line.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: qty,
          },
        });

        // Reduce inTransit at source
        await tx.inventory.updateMany({
          where: { productId: line.productId, warehouseId: transfer.fromWarehouseId },
          data: { inTransitQty: { decrement: qty } },
        });

        // Update line receivedQty
        const newReceived = Number(line.receivedQty) + qty;
        await tx.transferLine.update({
          where: { id: line.id },
          data: { receivedQty: newReceived },
        });

        if (newReceived < Number(line.sentQty)) allReceived = false;
      }

      const newStatus = allReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED';

      return tx.warehouseTransfer.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { receivedDate: new Date() } : {}),
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          lines: { include: { product: true } },
        },
      });
    });
  }

  async cancelTransfer(tenantId: string, id: string, userId: string) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException('Cannot cancel a completed or already cancelled transfer');
    }

    return this.prisma.$transaction(async (tx) => {
      // If already in transit, restore inventory
      if (transfer.status === 'IN_TRANSIT' || transfer.status === 'PARTIALLY_RECEIVED') {
        for (const line of transfer.lines) {
          const inTransitQty = Number(line.sentQty) - Number(line.receivedQty);
          if (inTransitQty > 0) {
            await tx.inventory.updateMany({
              where: { productId: line.productId, warehouseId: transfer.fromWarehouseId },
              data: {
                quantity: { increment: inTransitQty },
                inTransitQty: { decrement: inTransitQty },
              },
            });
          }
        }
      }

      return tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────

  async getLowStockAlerts(tenantId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        product: { deletedAt: null, isService: false },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            minStock: true,
            reorderPoint: true,
            safetyStock: true,
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    return inventories
      .map((inv) => {
        const qty = Number(inv.quantity);
        const minStock = Number(inv.product.minStock ?? 0);
        const reorderPoint = inv.product.reorderPoint ? Number(inv.product.reorderPoint) : null;

        let status: string;
        if (qty <= 0) status = 'OUT_OF_STOCK';
        else if (qty <= minStock) status = 'LOW_STOCK';
        else if (reorderPoint !== null && qty <= reorderPoint) status = 'REORDER_NEEDED';
        else return null;

        return {
          ...inv,
          available: qty,
          minStock,
          reorderPoint,
          status,
        };
      })
      .filter(Boolean);
  }

  async getExpiryAlerts(tenantId: string, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return this.prisma.stockBatch.findMany({
      where: {
        tenantId,
        expiryDate: { lte: cutoff },
        quantity: { gt: 0 },
        state: 'AVAILABLE',
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ── Batches & Serials ───────────────────────────────────────────────────────

  async getBatches(tenantId: string, productId?: string, warehouseId?: string) {
    const where: Prisma.StockBatchWhereInput = { tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;

    return this.prisma.stockBatch.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getSerials(tenantId: string, productId?: string, state?: string) {
    const where: Prisma.SerialNumberWhereInput = { tenantId };
    if (productId) where.productId = productId;
    if (state) where.state = state;

    return this.prisma.serialNumber.findMany({
      where,
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
