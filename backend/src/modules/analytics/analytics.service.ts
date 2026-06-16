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
    return this.prisma.cashFlowForecast
      .findMany({ where: { tenantId }, orderBy: { periodDate: 'desc' }, take: 24 })
      .then((rows) => rows.reverse());
  }

  async getKpis(tenantId: string) {
    return this.prisma.kpiTracker.findMany({
      where: { tenantId },
      orderBy: { periodDate: 'desc' },
      take: 50,
    });
  }

  async getForecasts(tenantId: string) {
    return this.prisma.forecast.findMany({ where: { tenantId }, orderBy: { startDate: 'asc' } });
  }

  async getGoals(tenantId: string) {
    return this.prisma.goalTracker.findMany({ where: { tenantId }, orderBy: { endDate: 'asc' } });
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
    const paid = Number(outstandingAgg._sum.paidAmount ?? 0);
    return { totalSales, totalRevenue: revenueAgg._sum.total ?? 0, outstanding: Math.max(0, total - paid) };
  }

  async getInventorySummary(tenantId: string) {
    const [totalProducts, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, deletedAt: null, isService: false } }),
      this.prisma.inventory.findMany({
        where: { tenantId, product: { minStock: { gt: 0 }, isService: false } },
        include: { product: true, warehouse: true },
      }),
    ]);
    return {
      totalProducts,
      lowStockItems: lowStock.filter((i) => Number(i.quantity) < Number(i.product.minStock)),
    };
  }

  // ─── CRM Analytics ─────────────────────────────────────────────────────────

  async getCrmAnalytics(tenantId: string) {
    const [leadGroups, oppGroups, oppValues, sourceGroups, recentActivities] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.opportunity.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.opportunity.aggregate({
        where: { tenantId, deletedAt: null, status: 'WON' },
        _sum: { value: true },
        _avg: { value: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.crmActivity.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { lead: true, opportunity: true },
      }),
    ]);

    const leadByStatus = Object.fromEntries(leadGroups.map((r) => [r.status, r._count.id]));
    const oppByStatus = Object.fromEntries(oppGroups.map((r) => [r.status, r._count.id]));
    const totalLeads = Object.values(leadByStatus).reduce((s, n) => s + n, 0);
    const totalOpps = Object.values(oppByStatus).reduce((s, n) => s + n, 0);
    const wonCount = oppByStatus['WON'] ?? 0;

    return {
      leadFunnel: [
        { stage: 'Nouveaux', count: leadByStatus['NEW'] ?? 0 },
        { stage: 'Contactés', count: leadByStatus['CONTACTED'] ?? 0 },
        { stage: 'Qualifiés', count: leadByStatus['QUALIFIED'] ?? 0 },
        { stage: 'Convertis', count: leadByStatus['CONVERTED'] ?? 0 },
      ],
      opportunityFunnel: [
        { stage: 'Ouverts', count: oppByStatus['OPEN'] ?? 0 },
        { stage: 'Gagnés', count: wonCount },
        { stage: 'Perdus', count: oppByStatus['LOST'] ?? 0 },
      ],
      kpis: {
        totalLeads,
        conversionRate: totalLeads > 0 ? Math.round(((leadByStatus['CONVERTED'] ?? 0) / totalLeads) * 100) : 0,
        totalOpportunities: totalOpps,
        winRate: totalOpps > 0 ? Math.round((wonCount / totalOpps) * 100) : 0,
        wonValue: Number(oppValues._sum.value ?? 0),
        avgDealSize: Number(oppValues._avg.value ?? 0),
      },
      sourceBreakdown: sourceGroups
        .filter((s) => s.source)
        .map((s) => ({ source: s.source ?? 'Inconnu', count: s._count.id })),
      recentActivities,
    };
  }

  // ─── Budget Analytics ──────────────────────────────────────────────────────

  async getBudgetAnalytics(tenantId: string) {
    const plans = await this.prisma.budgetPlan.findMany({
      where: { tenantId },
      include: {
        department: true,
        allocations: { include: { category: true } },
      },
      orderBy: { fiscalYear: 'desc' },
      take: 10,
    });

    const byDepartment = plans.map((plan) => {
      const totalAllocated = plan.allocations.reduce((s, a) => s + Number(a.allocated), 0);
      const totalActual = plan.allocations.reduce((s, a) => s + Number(a.actual), 0);
      return {
        planId: plan.id,
        name: plan.name,
        fiscalYear: plan.fiscalYear,
        department: plan.department?.name ?? 'Global',
        status: plan.status,
        totalAmount: Number(plan.totalAmount),
        allocated: totalAllocated,
        actual: totalActual,
        utilizationPct: totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0,
        variance: totalAllocated - totalActual,
      };
    });

    const activePlans = plans.filter((p) => ['APPROVED', 'ACTIVE'].includes(p.status));
    const totalBudgeted = activePlans.reduce((s, p) => s + Number(p.totalAmount), 0);
    const totalAllocated = activePlans.reduce(
      (s, p) => s + p.allocations.reduce((as, a) => as + Number(a.allocated), 0),
      0,
    );
    const totalActual = activePlans.reduce(
      (s, p) => s + p.allocations.reduce((as, a) => as + Number(a.actual), 0),
      0,
    );

    return {
      byPlan: byDepartment,
      summary: {
        totalPlans: plans.length,
        activePlans: activePlans.length,
        totalBudgeted,
        totalAllocated,
        totalActual,
        overallUtilization: totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0,
      },
    };
  }
}
