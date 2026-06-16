import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PosCheckoutDto, PosItemDto } from './dto/pos-checkout.dto';
import { CloseCashSessionDto, OpenCashSessionDto } from './dto/cash-session.dto';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async checkout(tenantId: string, dto: PosCheckoutDto, userId: string) {
    // 1. Validate every item
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, deletedAt: null },
      include: { tax: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
    }

    // 2. If warehouseId provided, validate stock for physical items
    if (dto.warehouseId) {
      const physicalItems = dto.items.filter((i) => !productMap.get(i.productId)?.isService);
      if (physicalItems.length > 0) {
        const stocks = await this.prisma.inventory.findMany({
          where: {
            tenantId,
            warehouseId: dto.warehouseId,
            productId: { in: physicalItems.map((i) => i.productId) },
          },
        });
        const stockMap = new Map(stocks.map((s) => [s.productId, Number(s.quantity)]));
        for (const item of physicalItems) {
          const available = stockMap.get(item.productId) ?? 0;
          if (available < item.quantity) {
            const product = productMap.get(item.productId);
            throw new BadRequestException(
              `Insufficient stock for "${product?.name}": available ${available}, requested ${item.quantity}`,
            );
          }
        }
      }
    }

    // 3. Enrich items with product tax rates (product tax overrides explicit taxRate = 0)
    const enrichedItems = dto.items.map((item) => {
      const product = productMap.get(item.productId) as (typeof products)[number];
      const productTaxRate = product?.tax ? Number(product.tax.rate) : 0;
      return {
        ...item,
        taxRate: item.taxRate !== undefined && item.taxRate > 0 ? item.taxRate : productTaxRate,
        taxCode: product?.tax?.code,
      };
    });

    // 4. Calculate totals
    const { subtotal, taxAmount, total, lines } = this.calcTotals(enrichedItems);

    // 4. All-in-one transaction
    return this.prisma.$transaction(async (tx) => {
      // Reference
      const count = await tx.sale.count({ where: { tenantId } });
      const reference = `POS-${String(count + 1).padStart(6, '0')}`;

      // Create sale (CONFIRMED immediately)
      const sale = await tx.sale.create({
        data: {
          tenantId,
          reference,
          status: 'CONFIRMED',
          customerId: dto.customerId,
          branchId: dto.branchId,
          notes: dto.notes,
          subtotal,
          taxAmount,
          discountAmount: 0,
          total,
          paidAmount: new Decimal(dto.paymentAmount.toFixed(2)),
          createdBy: userId,
          lines: {
            create: lines.map((l, i) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount ?? 0,
              taxRate: l.taxRate ?? 0,
              total: l.lineTotal,
              sortOrder: i,
            })),
          },
        },
        include: {
          lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
          customer: { select: { id: true, name: true } },
        },
      });

      // Create payment
      const payRef = `PAY-${String((await tx.payment.count({ where: { tenantId } })) + 1).padStart(6, '0')}`;
      await tx.payment.create({
        data: {
          tenantId,
          reference: payRef,
          method: dto.paymentMethod,
          amount: new Decimal(dto.paymentAmount.toFixed(2)),
          status: 'COMPLETED',
          saleId: sale.id,
          paidAt: new Date(),
        },
      });

      // Decrement stock for physical products
      if (dto.warehouseId) {
        for (const item of enrichedItems) {
          const product = productMap.get(item.productId)!;
          if (!product.isService) {
            await tx.inventoryMovement.create({
              data: {
                tenantId,
                productId: item.productId,
                warehouseId: dto.warehouseId,
                type: 'OUT',
                quantity: item.quantity,
                reference: sale.reference,
                createdBy: userId,
              },
            });
            await tx.inventory.update({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: dto.warehouseId! } },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        }
      }

      return {
        sale,
        receipt: {
          reference: sale.reference,
          date: sale.saleDate,
          items: sale.lines.map((l) => ({
            name: l.product.name,
            sku: l.product.sku,
            qty: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            taxRate: Number(l.taxRate),
            total: Number(l.total),
          })),
          subtotal: Number(sale.subtotal),
          taxAmount: Number(sale.taxAmount),
          total: Number(sale.total),
          paid: dto.paymentAmount,
          change: Math.max(0, dto.paymentAmount - Number(sale.total)),
          paymentMethod: dto.paymentMethod,
          customer: sale.customer?.name ?? 'Walk-in',
        },
      };
    });
  }

  async getSession(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [sales, revenue, openSession] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, reference: { startsWith: 'POS-' }, saleDate: { gte: today } } }),
      this.prisma.sale.aggregate({
        where: { tenantId, reference: { startsWith: 'POS-' }, saleDate: { gte: today }, status: 'CONFIRMED' },
        _sum: { total: true },
      }),
      this.prisma.cashSession.findFirst({ where: { tenantId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } }),
    ]);
    return { salesToday: sales, revenueToday: revenue._sum.total ?? 0, openSession };
  }

  // ─── Cash Sessions ──────────────────────────────────────────────────────────

  async openCashSession(tenantId: string, userId: string, dto: OpenCashSessionDto) {
    const existing = await this.prisma.cashSession.findFirst({ where: { tenantId, status: 'OPEN' } });
    if (existing) throw new BadRequestException('A cash session is already open');

    const session = await this.prisma.cashSession.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        openedBy: userId,
        openingBalance: new Decimal(dto.openingBalance.toFixed(2)),
        status: 'OPEN',
        notes: dto.notes,
      },
    });
    this.gateway.emitToTenant(tenantId, 'cash:session-opened', { id: session.id, openingBalance: dto.openingBalance });
    return session;
  }

  async closeCashSession(id: string, tenantId: string, userId: string, dto: CloseCashSessionDto) {
    const session = await this.prisma.cashSession.findFirst({ where: { id, tenantId, status: 'OPEN' } });
    if (!session) throw new NotFoundException('Open cash session not found');

    // Compute cashIn from POS sales since session opened
    const salesAgg = await this.prisma.sale.aggregate({
      where: { tenantId, reference: { startsWith: 'POS-' }, status: 'CONFIRMED', saleDate: { gte: session.openedAt } },
      _sum: { total: true },
    });
    const cashIn = Number(salesAgg._sum.total ?? 0);
    const expectedBalance = Number(session.openingBalance) + cashIn;
    const difference = dto.closingBalance - expectedBalance;

    const updated = await this.prisma.cashSession.update({
      where: { id },
      data: {
        closedBy: userId,
        closingBalance: new Decimal(dto.closingBalance.toFixed(2)),
        expectedBalance: new Decimal(expectedBalance.toFixed(2)),
        difference: new Decimal(difference.toFixed(2)),
        cashIn: new Decimal(cashIn.toFixed(2)),
        status: 'CLOSED',
        closedAt: new Date(),
        notes: dto.notes ?? session.notes,
      },
    });
    this.gateway.emitToTenant(tenantId, 'cash:session-closed', { id, difference });
    return updated;
  }

  async reconcileCashSession(id: string, tenantId: string) {
    const session = await this.prisma.cashSession.findFirst({ where: { id, tenantId, status: 'CLOSED' } });
    if (!session) throw new NotFoundException('Closed cash session not found');
    return this.prisma.cashSession.update({ where: { id }, data: { status: 'RECONCILED' } });
  }

  async listCashSessions(tenantId: string) {
    return this.prisma.cashSession.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        openedByUser: { select: { id: true, firstName: true, lastName: true } },
        closedByUser: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  private calcTotals(items: PosItemDto[]) {
    let sub = 0;
    let tax = 0;
    const lines = items.map((item) => {
      const base = item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
      const lineTax = base * ((item.taxRate ?? 0) / 100);
      sub += base;
      tax += lineTax;
      return { ...item, lineTotal: new Decimal((base + lineTax).toFixed(2)) };
    });
    return {
      lines,
      subtotal: new Decimal(sub.toFixed(2)),
      taxAmount: new Decimal(tax.toFixed(2)),
      total: new Decimal((sub + tax).toFixed(2)),
    };
  }
}
