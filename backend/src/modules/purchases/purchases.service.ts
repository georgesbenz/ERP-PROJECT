import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto, PurchaseLineDto } from './dto/create-purchase.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  async listSuppliers(tenantId: string, dto: PaginationDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(dto.search ? { name: { contains: dto.search, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip: dto.skip, take: dto.limit, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getSupplier(id: string, tenantId: string) {
    const s = await this.prisma.supplier.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { tenantId, ...dto } });
  }

  async updateSupplier(id: string, tenantId: string, dto: Partial<CreateSupplierDto>) {
    await this.getSupplier(id, tenantId);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(id: string, tenantId: string) {
    await this.getSupplier(id, tenantId);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  }

  // ─── Purchase Orders ───────────────────────────────────────────────────────

  async listPurchases(tenantId: string, dto: PaginationDto) {
    const where = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: { supplier: true, lines: { include: { product: true } } },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getPurchase(id: string, tenantId: string) {
    const p = await this.prisma.purchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { supplier: true, lines: { include: { product: true } }, payments: true },
    });
    if (!p) throw new NotFoundException('Purchase order not found');
    return p;
  }

  async createPurchase(tenantId: string, dto: CreatePurchaseDto, userId: string) {
    const { subtotal, taxAmount, total } = this.calcTotals(dto.lines);
    const reference = `PO-${String((await this.prisma.purchase.count({ where: { tenantId } })) + 1).padStart(6, '0')}`;

    return this.prisma.purchase.create({
      data: {
        tenantId,
        reference,
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        createdBy: userId,
        lines: {
          create: dto.lines.map((l, i) => ({
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitCost: l.unitCost,
            discount: l.discount ?? 0,
            taxRate: l.taxRate ?? 0,
            total: this.lineTotal(l),
            sortOrder: i,
          })),
        },
      },
      include: { lines: { include: { product: true } }, supplier: true },
    });
  }

  async receivePurchase(id: string, tenantId: string) {
    await this.getPurchase(id, tenantId);
    return this.prisma.purchase.update({
      where: { id },
      data: { status: 'RECEIVED', receivedDate: new Date() },
    });
  }

  private calcTotals(lines: PurchaseLineDto[]) {
    let subtotal = 0;
    let taxAmount = 0;
    for (const l of lines) {
      const base = l.quantity * l.unitCost * (1 - (l.discount ?? 0) / 100);
      subtotal += base;
      taxAmount += base * ((l.taxRate ?? 0) / 100);
    }
    return {
      subtotal: new Decimal(subtotal.toFixed(2)),
      taxAmount: new Decimal(taxAmount.toFixed(2)),
      total: new Decimal((subtotal + taxAmount).toFixed(2)),
    };
  }

  private lineTotal(l: PurchaseLineDto): Decimal {
    const base = l.quantity * l.unitCost * (1 - (l.discount ?? 0) / 100);
    return new Decimal((base + base * ((l.taxRate ?? 0) / 100)).toFixed(2));
  }
}
