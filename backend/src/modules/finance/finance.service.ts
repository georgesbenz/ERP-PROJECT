import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── Payments ──────────────────────────────────────────────────────────────

  async listPayments(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { sale: true, purchase: true, invoice: true },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async createPayment(tenantId: string, dto: CreatePaymentDto) {
    const reference = `PAY-${String((await this.prisma.payment.count({ where: { tenantId } })) + 1).padStart(6, '0')}`;
    return this.prisma.payment.create({
      data: {
        tenantId,
        reference,
        method: dto.method,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        exchangeRate: dto.exchangeRate ?? 1,
        saleId: dto.saleId,
        purchaseId: dto.purchaseId,
        invoiceId: dto.invoiceId,
        notes: dto.notes,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────

  async listInvoices(tenantId: string, dto: PaginationDto) {
    const where = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { sale: true, customer: true },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { issueDate: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getInvoice(id: string, tenantId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { sale: true, customer: true, payments: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  // ─── Chart of Accounts ─────────────────────────────────────────────────────

  async listAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: { children: true },
      orderBy: { code: 'asc' },
    });
  }

  // ─── Journals ──────────────────────────────────────────────────────────────

  async listJournalEntries(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { journal: true, lines: { include: { debitAccount: true, creditAccount: true } } },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { entryDate: 'desc' },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  // ─── Tax management ────────────────────────────────────────────────────────

  async listTaxes(tenantId: string) {
    return this.prisma.tax.findMany({ where: { tenantId, isActive: true } });
  }
}
