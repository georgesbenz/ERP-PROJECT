import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class BudgetingService {
  constructor(private prisma: PrismaService) {}

  async listPlans(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.budgetPlan.findMany({
        where,
        include: { department: true, allocations: { include: { category: true } } },
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
        approvals: {
          create: { approverId: userId, status: 'PENDING' },
        },
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

    return this.getPlan(id, tenantId);
  }

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
