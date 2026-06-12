import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { PosCheckoutDto, PosItemDto } from './dto/pos-checkout.dto';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

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
    const [sales, revenue] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, reference: { startsWith: 'POS-' }, saleDate: { gte: today } } }),
      this.prisma.sale.aggregate({
        where: { tenantId, reference: { startsWith: 'POS-' }, saleDate: { gte: today }, status: 'CONFIRMED' },
        _sum: { total: true },
      }),
    ]);
    return { salesToday: sales, revenueToday: revenue._sum.total ?? 0 };
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
