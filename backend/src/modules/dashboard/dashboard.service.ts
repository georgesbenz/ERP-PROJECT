import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalCustomers,
      totalProducts,
      salesThisMonth,
      revenueThisMonth,
      pendingPurchases,
      openLeads,
      openOpportunities,
      unreadNotifications,
      lowStockCount,
      activeBudgets,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      this.prisma.sale.count({
        where: { tenantId, deletedAt: null, saleDate: { gte: startOfMonth } },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, saleDate: { gte: startOfMonth }, status: 'CONFIRMED' },
        _sum: { total: true },
      }),
      this.prisma.purchase.count({
        where: { tenantId, deletedAt: null, status: { in: ['DRAFT', 'ORDERED'] } },
      }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null, status: { in: ['NEW', 'CONTACTED'] } } }),
      this.prisma.opportunity.count({ where: { tenantId, deletedAt: null, status: 'OPEN' } }),
      this.prisma.notification.count({ where: { tenantId, isRead: false } }),
      this.prisma.inventory.count({
        where: {
          tenantId,
          product: { isService: false, minStock: { gt: 0 } },
          quantity: { lt: this.prisma.inventory.fields.quantity },
        },
      }).catch(() => 0),
      this.prisma.budgetPlan.count({
        where: { tenantId, status: { in: ['APPROVED', 'ACTIVE'] } },
      }),
    ]);

    return {
      totalCustomers,
      totalProducts,
      salesThisMonth,
      revenueThisMonth: revenueThisMonth._sum.total ?? 0,
      pendingPurchases,
      openLeads,
      openOpportunities,
      unreadNotifications,
      lowStockCount,
      activeBudgets,
    };
  }

  async getTopProducts(tenantId: string, limit = 10) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const lines = await this.prisma.saleLine.groupBy({
      by: ['productId'],
      where: { sale: { tenantId, status: 'CONFIRMED', saleDate: { gte: startOfMonth } } },
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productIds = lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return lines.map((l) => ({
      product: productMap.get(l.productId) ?? { id: l.productId, name: 'Unknown', sku: '' },
      quantity: Number(l._sum.quantity ?? 0),
      revenue: Number(l._sum.total ?? 0),
      transactions: l._count,
    }));
  }

  async getCashSummary(tenantId: string) {
    const openSession = await this.prisma.cashSession.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      include: { openedByUser: { select: { firstName: true, lastName: true } }, branch: { select: { name: true } } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [posSalesToday, expensesToday, sessionsThisWeek] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, reference: { startsWith: 'POS-' }, status: 'CONFIRMED', saleDate: { gte: today } },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, expenseDate: { gte: today } },
        _sum: { totalAmount: true },
      }),
      this.prisma.cashSession.findMany({
        where: { tenantId, openedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { openedAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, openingBalance: true, closingBalance: true,
          difference: true, cashIn: true, openedAt: true, closedAt: true,
        },
      }),
    ]);

    return {
      openSession,
      today: {
        cashIn: Number(posSalesToday._sum.total ?? 0),
        cashOut: Number(expensesToday._sum.totalAmount ?? 0),
        net: Number(posSalesToday._sum.total ?? 0) - Number(expensesToday._sum.totalAmount ?? 0),
      },
      recentSessions: sessionsThisWeek,
    };
  }

  async getRecentActivity(tenantId: string) {
    const [recentSales, recentPurchases, recentLeads] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, deletedAt: null },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.purchase.findMany({
        where: { tenantId, deletedAt: null },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.lead.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return { recentSales, recentPurchases, recentLeads };
  }

  async getAuditLog(tenantId: string) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
