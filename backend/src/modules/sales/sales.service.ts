import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto, SaleLineDto } from './dto/create-sale.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ─── Customers ─────────────────────────────────────────────────────────────

  async listCustomers(tenantId: string, dto: PaginationDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(dto.search
        ? {
            OR: [
              { name: { contains: dto.search, mode: 'insensitive' as const } },
              { email: { contains: dto.search, mode: 'insensitive' as const } },
              { code: { contains: dto.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip: dto.skip, take: dto.limit, orderBy: { name: 'asc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getCustomer(id: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async createCustomer(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { tenantId, ...dto } });
  }

  async updateCustomer(id: string, tenantId: string, dto: Partial<CreateCustomerDto>) {
    await this.getCustomer(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async deleteCustomer(id: string, tenantId: string) {
    await this.getCustomer(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  }

  // ─── Sales ─────────────────────────────────────────────────────────────────

  async listSales(tenantId: string, dto: PaginationDto) {
    const where = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { customer: true, lines: { include: { product: true } } },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { saleDate: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getSale(id: string, tenantId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, lines: { include: { product: true } }, payments: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async createSale(tenantId: string, dto: CreateSaleDto, userId: string) {
    const { subtotal, taxAmount, total } = this.calcTotals(dto.lines);
    const reference = await this.nextRef(tenantId, 'SALE');

    return this.prisma.sale.create({
      data: {
        tenantId,
        reference,
        customerId: dto.customerId,
        branchId: dto.branchId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
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
            unitPrice: l.unitPrice,
            discount: l.discount ?? 0,
            taxRate: l.taxRate ?? 0,
            total: this.lineTotal(l),
            sortOrder: i,
          })),
        },
      },
      include: { lines: { include: { product: true } }, customer: true },
    });
  }

  async confirmSale(id: string, tenantId: string) {
    await this.getSale(id, tenantId);
    return this.prisma.sale.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancelSale(id: string, tenantId: string) {
    await this.getSale(id, tenantId);
    return this.prisma.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private calcTotals(lines: SaleLineDto[]) {
    let subtotal = 0;
    let taxAmount = 0;
    for (const l of lines) {
      const lineBase = l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100);
      subtotal += lineBase;
      taxAmount += lineBase * ((l.taxRate ?? 0) / 100);
    }
    return {
      subtotal: new Decimal(subtotal.toFixed(2)),
      taxAmount: new Decimal(taxAmount.toFixed(2)),
      total: new Decimal((subtotal + taxAmount).toFixed(2)),
    };
  }

  private lineTotal(l: SaleLineDto): Decimal {
    const base = l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100);
    return new Decimal((base + base * ((l.taxRate ?? 0) / 100)).toFixed(2));
  }

  private async nextRef(tenantId: string, prefix: string): Promise<string> {
    const count = await this.prisma.sale.count({ where: { tenantId } });
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }
}
