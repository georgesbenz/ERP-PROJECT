import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { ApproveExpenseDto, CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  async listCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({ data: { tenantId, ...dto } });
  }

  async updateCategory(id: string, tenantId: string, dto: Partial<CreateExpenseCategoryDto>) {
    await this.findCategory(id, tenantId);
    return this.prisma.expenseCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string, tenantId: string) {
    await this.findCategory(id, tenantId);
    const used = await this.prisma.expense.count({ where: { categoryId: id, tenantId } });
    if (used > 0) throw new BadRequestException('Category is in use');
    return this.prisma.expenseCategory.delete({ where: { id }, select: { id: true } });
  }

  private async findCategory(id: string, tenantId: string) {
    const c = await this.prisma.expenseCategory.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Expense category not found');
    return c;
  }

  // ─── Expenses ────────────────────────────────────────────────────────────────

  async listExpenses(tenantId: string, dto: PaginationDto & { categoryId?: string; status?: string }) {
    const where: any = { tenantId };
    if (dto.search) where.description = { contains: dto.search, mode: 'insensitive' };
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.status) where.status = dto.status;

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          category: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getExpense(id: string, tenantId: string) {
    const e = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!e) throw new NotFoundException('Expense not found');
    return e;
  }

  async createExpense(tenantId: string, userId: string, dto: CreateExpenseDto) {
    await this.findCategory(dto.categoryId, tenantId);
    const count = await this.prisma.expense.count({ where: { tenantId } });
    const reference = `EXP-${String(count + 1).padStart(6, '0')}`;
    const taxAmount = dto.taxAmount ?? 0;
    const totalAmount = dto.amount + taxAmount;

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        reference,
        description: dto.description,
        categoryId: dto.categoryId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        amount: new Decimal(dto.amount.toFixed(2)),
        taxAmount: new Decimal(taxAmount.toFixed(2)),
        totalAmount: new Decimal(totalAmount.toFixed(2)),
        expenseDate: new Date(dto.expenseDate),
        paymentMethod: dto.paymentMethod ?? 'CASH',
        status: 'PENDING',
        createdBy: userId,
        notes: dto.notes,
      },
      include: { category: { select: { name: true } } },
    });

    this.gateway.emitToTenant(tenantId, 'expense:created', { id: expense.id, reference, description: dto.description });
    return expense;
  }

  async approveExpense(id: string, tenantId: string, userId: string, dto: ApproveExpenseDto) {
    const expense = await this.getExpense(id, tenantId);
    if (expense.status !== 'PENDING') throw new BadRequestException('Only PENDING expenses can be actioned');

    const status = dto.status ?? 'APPROVED';
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        notes: dto.notes ?? expense.notes,
      },
    });

    const event = status === 'APPROVED' ? 'expense:approved' : 'expense:rejected';
    this.gateway.emitToTenant(tenantId, event, { id, reference: expense.reference, status });
    return updated;
  }

  async deleteExpense(id: string, tenantId: string) {
    const e = await this.getExpense(id, tenantId);
    if (e.status !== 'PENDING') throw new BadRequestException('Only PENDING expenses can be deleted');
    return this.prisma.expense.delete({ where: { id }, select: { id: true } });
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getReport(tenantId: string, from?: string, to?: string) {
    const where: any = { tenantId };
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }

    const [byCategory, byStatus, totals] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['status'],
        where,
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({ where, _sum: { totalAmount: true, taxAmount: true, amount: true }, _count: true }),
    ]);

    const categoryIds = byCategory.map((b) => b.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, code: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return {
      period: { from: from ?? null, to: to ?? null },
      totals: {
        count: totals._count,
        amount: totals._sum.amount ?? 0,
        taxAmount: totals._sum.taxAmount ?? 0,
        totalAmount: totals._sum.totalAmount ?? 0,
      },
      byCategory: byCategory.map((b) => ({
        category: catMap.get(b.categoryId) ?? { id: b.categoryId, name: 'Unknown', code: '' },
        count: b._count,
        totalAmount: b._sum.totalAmount ?? 0,
      })),
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count, totalAmount: b._sum.totalAmount ?? 0 })),
    };
  }
}
