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
