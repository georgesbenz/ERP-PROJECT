import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class BudgetingService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  async listPlans(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.budgetPlan.findMany({
        where,
        include: {
          department: true,
          allocations: { include: { category: true } },
          _count: { select: { allocations: true, approvals: true } },
        },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { fiscalYear: 'desc' },
      }),
      this.prisma.budgetPlan.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getPlan(id: string, tenantId: string) {
    const plan = await this.prisma.budgetPlan.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        allocations: { include: { category: true } },
        approvals: { include: { approver: { select: { id: true, firstName: true, lastName: true } } } },
        revisions: { orderBy: { version: 'desc' }, take: 5 },
      },
    });
    if (!plan) throw new NotFoundException('Budget plan not found');
    return plan;
  }

  async createPlan(tenantId: string, dto: CreateBudgetPlanDto, userId: string) {
    return this.prisma.budgetPlan.create({
      data: {
        tenantId,
        name: dto.name,
        fiscalYear: dto.fiscalYear,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalAmount: dto.totalAmount,
        departmentId: dto.departmentId,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { department: true },
    });
  }

  async submitForApproval(id: string, tenantId: string, userId: string) {
    await this.getPlan(id, tenantId);
    return this.prisma.budgetPlan.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        approvals: { create: { approverId: userId, status: 'PENDING' } },
      },
    });
  }

  async approvePlan(id: string, tenantId: string, userId: string, comments?: string) {
    const plan = await this.getPlan(id, tenantId);
    await this.prisma.$transaction([
      this.prisma.budgetPlan.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
      }),
      this.prisma.budgetApproval.updateMany({
        where: { budgetPlanId: id, status: 'PENDING' },
        data: { status: 'APPROVED', comments, decidedAt: new Date() },
      }),
      this.prisma.budgetRevision.create({
        data: {
          budgetPlanId: id,
          version: (plan.revisions?.length ?? 0) + 1,
          reason: 'Approved',
          changedBy: userId,
          snapshot: plan as object,
        },
      }),
    ]);
    this.gateway.emitToTenant(tenantId, 'budget:plan-approved', { planId: id, name: plan.name });
    return this.getPlan(id, tenantId);
  }

  async rejectPlan(id: string, tenantId: string, userId: string, reason?: string) {
    const plan = await this.getPlan(id, tenantId);
    await this.prisma.$transaction([
      this.prisma.budgetPlan.update({ where: { id }, data: { status: 'REJECTED' } }),
      this.prisma.budgetApproval.updateMany({
        where: { budgetPlanId: id, status: 'PENDING' },
        data: { status: 'REJECTED', comments: reason, decidedAt: new Date() },
      }),
      this.prisma.budgetRevision.create({
        data: {
          budgetPlanId: id,
          version: (plan.revisions?.length ?? 0) + 1,
          reason: reason ?? 'Rejected',
          changedBy: userId,
          snapshot: plan as object,
        },
      }),
    ]);
    this.gateway.emitToTenant(tenantId, 'budget:plan-rejected', { planId: id, name: plan.name });
    return this.getPlan(id, tenantId);
  }

  // ─── Allocations ───────────────────────────────────────────────────────────

  async listAllocations(planId: string, tenantId: string) {
    await this.getPlan(planId, tenantId);
    return this.prisma.budgetAllocation.findMany({
      where: { budgetPlanId: planId },
      include: { category: true },
      orderBy: [{ period: 'asc' }, { category: { sortOrder: 'asc' } }],
    });
  }

  async createAllocation(planId: string, tenantId: string, dto: CreateAllocationDto) {
    await this.getPlan(planId, tenantId);
    return this.prisma.budgetAllocation.upsert({
      where: { budgetPlanId_categoryId_period: { budgetPlanId: planId, categoryId: dto.categoryId, period: dto.period } },
      create: {
        budgetPlanId: planId,
        categoryId: dto.categoryId,
        period: dto.period,
        allocated: dto.allocated,
        notes: dto.notes,
      },
      update: { allocated: dto.allocated, notes: dto.notes },
      include: { category: true },
    });
  }

  async deleteAllocation(id: string, planId: string, tenantId: string) {
    await this.getPlan(planId, tenantId);
    const alloc = await this.prisma.budgetAllocation.findFirst({ where: { id, budgetPlanId: planId } });
    if (!alloc) throw new NotFoundException('Allocation not found');
    return this.prisma.budgetAllocation.delete({ where: { id }, select: { id: true } });
  }

  // ─── Budget vs Actual ──────────────────────────────────────────────────────

  async getVarianceReport(planId: string, tenantId: string) {
    const plan = await this.getPlan(planId, tenantId);

    // Pull actual sales revenue and purchase costs within the plan period
    const [salesActual, purchaseActual] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'DELIVERED', 'PROCESSING'] as any },
          createdAt: { gte: plan.startDate, lte: plan.endDate },
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'RECEIVED'] as any },
          createdAt: { gte: plan.startDate, lte: plan.endDate },
        },
        _sum: { total: true },
      }),
    ]);

    const allocations = plan.allocations.map((a) => ({
      id: a.id,
      category: a.category,
      period: a.period,
      allocated: Number(a.allocated),
      actual: Number(a.actual),
      variance: Number(a.allocated) - Number(a.actual),
      utilizationPct: Number(a.allocated) > 0
        ? Math.round((Number(a.actual) / Number(a.allocated)) * 100)
        : 0,
    }));

    const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
    const totalActual = Number(salesActual._sum.total ?? 0) + Number(purchaseActual._sum.total ?? 0);

    return {
      plan: { id: plan.id, name: plan.name, fiscalYear: plan.fiscalYear, totalAmount: Number(plan.totalAmount), status: plan.status },
      allocations,
      summary: {
        totalAllocated,
        totalActual,
        totalVariance: totalAllocated - totalActual,
        utilizationPct: totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0,
        salesRevenue: Number(salesActual._sum.total ?? 0),
        purchaseCost: Number(purchaseActual._sum.total ?? 0),
      },
    };
  }

  // ─── Lookups ───────────────────────────────────────────────────────────────

  async listCategories(tenantId: string) {
    return this.prisma.budgetCategory.findMany({
      where: { tenantId },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, isActive: true },
      include: { costCenters: true },
    });
  }
}
