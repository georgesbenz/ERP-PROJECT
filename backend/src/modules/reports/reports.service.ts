import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportQueryDto, ReportType, ReportGroupBy } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generate(tenantId: string, query: ReportQueryDto) {
    const start = query.startDate ? new Date(query.startDate) : this.defaultStart();
    const end = query.endDate ? new Date(query.endDate) : new Date();

    switch (query.type) {
      case ReportType.SALES_BY_PERIOD:
        return this.salesByPeriod(tenantId, start, end, query.groupBy);
      case ReportType.INVENTORY_VALUATION:
        return this.inventoryValuation(tenantId);
      case ReportType.CUSTOMER_AGING:
        return this.customerAging(tenantId);
      case ReportType.PURCHASES_BY_PERIOD:
        return this.purchasesByPeriod(tenantId, start, end, query.groupBy);
      case ReportType.PROFIT_LOSS:
        return this.profitLoss(tenantId, start, end);
    }
  }

  // ─── Sales by Period ──────────────────────────────────────────────────────

  private async salesByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    groupBy: ReportGroupBy = ReportGroupBy.MONTH,
  ) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, deletedAt: null, saleDate: { gte: start, lte: end } },
      select: { saleDate: true, total: true, status: true, paidAmount: true },
      orderBy: { saleDate: 'asc' },
    });

    const grouped = this.groupByPeriod(
      sales,
      (s) => s.saleDate,
      groupBy,
    );

    const rows = Object.entries(grouped).map(([period, items]) => ({
      period,
      count: items.length,
      revenue: items.reduce((sum, s) => sum + Number(s.total), 0),
      paid: items.reduce((sum, s) => sum + Number(s.paidAmount), 0),
      confirmed: items.filter((s) => s.status === 'CONFIRMED').length,
      cancelled: items.filter((s) => s.status === 'CANCELLED').length,
    }));

    const totals = {
      count: rows.reduce((s, r) => s + r.count, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
    };

    return {
      type: ReportType.SALES_BY_PERIOD,
      period: { start, end },
      groupBy,
      rows,
      totals,
    };
  }

  // ─── Inventory Valuation ──────────────────────────────────────────────────

  private async inventoryValuation(tenantId: string) {
    const stock = await this.prisma.inventory.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, sku: true, costPrice: true, salePrice: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    const rows = stock.map((s) => ({
      product: s.product.name,
      sku: s.product.sku,
      warehouse: s.warehouse.name,
      quantity: Number(s.quantity),
      costPrice: Number(s.product.costPrice ?? 0),
      salePrice: Number(s.product.salePrice),
      costValue: Number(s.quantity) * Number(s.product.costPrice ?? 0),
      saleValue: Number(s.quantity) * Number(s.product.salePrice),
    }));

    const totals = {
      totalItems: rows.reduce((sum, r) => sum + r.quantity, 0),
      totalCostValue: rows.reduce((sum, r) => sum + r.costValue, 0),
      totalSaleValue: rows.reduce((sum, r) => sum + r.saleValue, 0),
    };

    return { type: ReportType.INVENTORY_VALUATION, rows, totals };
  }

  // ─── Customer Aging ───────────────────────────────────────────────────────

  private async customerAging(tenantId: string) {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, deletedAt: null, status: { notIn: ['PAID', 'CANCELLED'] } },
      include: { customer: { select: { id: true, name: true } } },
    });

    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const rows = invoices.map((inv) => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000));
      const balance = Number(inv.total) - Number(inv.paidAmount);

      if (daysOverdue === 0) buckets.current += balance;
      else if (daysOverdue <= 30) buckets.days30 += balance;
      else if (daysOverdue <= 60) buckets.days60 += balance;
      else if (daysOverdue <= 90) buckets.days90 += balance;
      else buckets.over90 += balance;

      return {
        customer: inv.customer?.name ?? 'Unknown',
        invoiceNumber: inv.reference,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total: Number(inv.total),
        paid: Number(inv.paidAmount),
        balance,
        daysOverdue,
        bucket:
          daysOverdue === 0 ? 'Current'
            : daysOverdue <= 30 ? '1–30 days'
            : daysOverdue <= 60 ? '31–60 days'
            : daysOverdue <= 90 ? '61–90 days'
            : 'Over 90 days',
      };
    });

    return {
      type: ReportType.CUSTOMER_AGING,
      asOf: now,
      rows,
      buckets,
      totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0),
    };
  }

  // ─── Purchases by Period ──────────────────────────────────────────────────

  private async purchasesByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    groupBy: ReportGroupBy = ReportGroupBy.MONTH,
  ) {
    const purchases = await this.prisma.purchase.findMany({
      where: { tenantId, deletedAt: null, orderDate: { gte: start, lte: end } },
      select: { orderDate: true, total: true, status: true },
      orderBy: { orderDate: 'asc' },
    });

    const grouped = this.groupByPeriod(purchases, (p) => p.orderDate, groupBy);
    const rows = Object.entries(grouped).map(([period, items]) => ({
      period,
      count: items.length,
      total: items.reduce((sum, p) => sum + Number(p.total), 0),
      received: items.filter((p) => p.status === 'RECEIVED').length,
    }));

    return {
      type: ReportType.PURCHASES_BY_PERIOD,
      period: { start, end },
      groupBy,
      rows,
      totals: {
        count: rows.reduce((s, r) => s + r.count, 0),
        total: rows.reduce((s, r) => s + r.total, 0),
      },
    };
  }

  // ─── Profit & Loss ────────────────────────────────────────────────────────

  private async profitLoss(tenantId: string, start: Date, end: Date) {
    const [revenue, purchases] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, saleDate: { gte: start, lte: end }, status: 'CONFIRMED' },
        _sum: { total: true, taxAmount: true, discountAmount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, deletedAt: null, orderDate: { gte: start, lte: end }, status: 'RECEIVED' },
        _sum: { total: true },
      }),
    ]);

    const totalRevenue = Number(revenue._sum.total ?? 0);
    const totalCogs = Number(purchases._sum.total ?? 0);
    const grossProfit = totalRevenue - totalCogs;

    return {
      type: ReportType.PROFIT_LOSS,
      period: { start, end },
      revenue: {
        total: totalRevenue,
        tax: Number(revenue._sum.taxAmount ?? 0),
        discounts: Number(revenue._sum.discountAmount ?? 0),
        net: totalRevenue - Number(revenue._sum.taxAmount ?? 0),
      },
      costOfGoods: totalCogs,
      grossProfit,
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private groupByPeriod<T>(
    items: T[],
    getDate: (item: T) => Date,
    groupBy: ReportGroupBy = ReportGroupBy.MONTH,
  ): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
      const d = getDate(item);
      let key: string;
      if (groupBy === ReportGroupBy.DAY) {
        key = d.toISOString().slice(0, 10);
      } else if (groupBy === ReportGroupBy.WEEK) {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      (result[key] ??= []).push(item);
    }
    return result;
  }

  private defaultStart(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
}
