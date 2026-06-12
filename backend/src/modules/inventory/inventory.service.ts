import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';
import { MovementsFilterDto } from './dto/movements-filter.dto';
import { PartialType } from '@nestjs/swagger';

class UpdateProductDto extends PartialType(CreateProductDto) {}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Products ─────────────────────────────────────────────────────────────

  async listProducts(tenantId: string, dto: PaginationDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(dto.search
        ? {
            OR: [
              { name: { contains: dto.search, mode: 'insensitive' as const } },
              { sku: { contains: dto.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, tax: true },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: products, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getProduct(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        tax: true,
        inventories: { include: { warehouse: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: { tenantId, ...dto },
        include: { category: true, tax: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('SKU already exists in this tenant');
      }
      throw e;
    }
  }

  async updateProduct(id: string, tenantId: string, dto: UpdateProductDto) {
    await this.getProduct(id, tenantId);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, tax: true },
    });
  }

  async deleteProduct(id: string, tenantId: string) {
    await this.getProduct(id, tenantId);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  // ─── Categories ────────────────────────────────────────────────────────────

  async listCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { tenantId, ...dto } });
  }

  // ─── Warehouses ────────────────────────────────────────────────────────────

  async listWarehouses(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId, isActive: true },
      include: { branch: true },
    });
  }

  // ─── Stock ─────────────────────────────────────────────────────────────────

  async getStockLevels(tenantId: string, dto: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { tenantId },
        include: { product: true, warehouse: true },
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.inventory.count({ where: { tenantId } }),
    ]);
    return { data: items, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async recordMovement(tenantId: string, dto: StockMovementDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.isService) throw new BadRequestException('Cannot move stock for a service');

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: dto.type,
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          reference: dto.reference,
          notes: dto.notes,
          createdBy: userId,
        },
      });

      const delta = ['IN', 'RETURN'].includes(dto.type) ? dto.quantity : -dto.quantity;

      await tx.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
        update: { quantity: { increment: delta } },
        create: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantity: delta < 0 ? 0 : delta,
        },
      });

      return tx.inventory.findFirst({
        where: { productId: dto.productId, warehouseId: dto.warehouseId },
        include: { product: true, warehouse: true },
      });
    });
  }

  async getMovements(tenantId: string, dto: MovementsFilterDto) {
    const where: Record<string, unknown> = { tenantId };
    if (dto.productId)   where['productId']   = dto.productId;
    if (dto.warehouseId) where['warehouseId'] = dto.warehouseId;
    if (dto.type)        where['type']        = dto.type;
    if (dto.dateFrom || dto.dateTo) {
      where['createdAt'] = {
        ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
        ...(dto.dateTo   ? { lte: new Date(dto.dateTo + 'T23:59:59Z') } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        include: { product: true, warehouse: true },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return { data: items, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }
}
