import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ─── Leads ─────────────────────────────────────────────────────────────────

  async listLeads(tenantId: string, dto: PaginationDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(dto.search
        ? {
            OR: [
              { firstName: { contains: dto.search, mode: 'insensitive' as const } },
              { lastName: { contains: dto.search, mode: 'insensitive' as const } },
              { email: { contains: dto.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, skip: dto.skip, take: dto.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getLead(id: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { activities: true, tasks: true, customer: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(tenantId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: { tenantId, ...dto } });
  }

  async updateLead(id: string, tenantId: string, dto: Partial<CreateLeadDto>) {
    await this.getLead(id, tenantId);
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async deleteLead(id: string, tenantId: string) {
    await this.getLead(id, tenantId);
    return this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  }

  async convertLead(id: string, tenantId: string) {
    const lead = await this.getLead(id, tenantId);
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: `${lead.firstName} ${lead.lastName}`,
        code: `CUST-${Date.now()}`,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        address: lead.company ?? undefined,
      },
    });
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
        customerId: customer.id,
      },
    });
  }

  // ─── Opportunities ─────────────────────────────────────────────────────────

  async listOpportunities(tenantId: string, dto: PaginationDto) {
    const where = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        include: { customer: true, stage: true, pipeline: true },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getOpportunity(id: string, tenantId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, stage: true, pipeline: true, activities: true, tasks: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async createOpportunity(tenantId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        tenantId,
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: { customer: true, pipeline: true, stage: true },
    });
  }

  async updateOpportunity(id: string, tenantId: string, dto: Partial<CreateOpportunityDto>) {
    await this.getOpportunity(id, tenantId);
    return this.prisma.opportunity.update({
      where: { id },
      data: { ...dto, expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined },
    });
  }

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  async listPipelines(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId, isActive: true },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  async listCampaigns(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip: dto.skip, take: dto.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }
}
