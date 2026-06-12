import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getFinancialSummary(tenantId: string, period?: string) {
    const where = period ? { tenantId, period } : { tenantId };
    return this.prisma.financialAnalytic.findMany({
      where,
      orderBy: { periodDate: 'desc' },
      take: 12,
    });
  }

  async getRevenueSummary(tenantId: string) {
    return this.prisma.revenueAnalytic.findMany({
      where: { tenantId },
      orderBy: { periodDate: 'asc' },
      take: 24,
    });
  }

  async getExpenseSummary(tenantId: string) {
    return this.prisma.expenseAnalytic.findMany({
      where: { tenantId },
      orderBy: { periodDate: 'desc' },
      take: 12,
    });
  }

  async getCashFlowForecast(tenantId: string) {
    return this.prisma.cashFlowForecast.findMany({
      where: { tenantId },
      orderBy: { periodDate: 'desc' },
      take: 24,
    }).then(rows => rows.reverse());
  }

  async getKpis(tenantId: string) {
    return this.prisma.kpiTracker.findMany({
      where: { tenantId },
      orderBy: { periodDate: 'desc' },
      take: 50,
    });
  }

  async getForecasts(tenantId: string) {
    return this.prisma.forecast.findMany({
      where: { tenantId },
      orderBy: { startDate: 'asc' },
    });
  }

  async getGoals(tenantId: string) {
    return this.prisma.goalTracker.findMany({
      where: { tenantId },
      orderBy: { endDate: 'asc' },
    });
  }

  async getSalesSummary(tenantId: string) {
    const COUNTED = ['CONFIRMED', 'DELIVERED', 'PROCESSING'];
    const [totalSales, revenueAgg, outstandingAgg] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, deletedAt: null, status: { in: COUNTED as any } } }),
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, status: { in: COUNTED as any } },
        _sum: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, status: { in: COUNTED as any } },
        _sum: { total: true, paidAmount: true },
      }),
    ]);

    const total = Number(outstandingAgg._sum.total ?? 0);
    const paid  = Number(outstandingAgg._sum.paidAmount ?? 0);
    return {
      totalSales,
      totalRevenue: revenueAgg._sum.total ?? 0,
      outstanding: Math.max(0, total - paid),
    };
  }

  async getInventorySummary(tenantId: string) {
    const [totalProducts, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, deletedAt: null, isService: false } }),
      this.prisma.inventory.findMany({
        where: {
          tenantId,
          product: { minStock: { gt: 0 }, isService: false },
        },
        include: { product: true, warehouse: true },
      }),
    ]);

    return {
      totalProducts,
      lowStockItems: lowStock.filter(
        (i) => Number(i.quantity) < Number(i.product.minStock),
      ),
    };
  }
}
