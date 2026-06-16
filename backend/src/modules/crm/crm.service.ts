import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

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
      include: { activities: { orderBy: { createdAt: 'desc' } }, tasks: true, customer: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(tenantId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({ data: { tenantId, ...dto } });
    this.gateway.emitToTenant(tenantId, 'crm:lead-created', { id: lead.id, name: `${lead.firstName} ${lead.lastName}` });
    return lead;
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
    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: 'CONVERTED', convertedAt: new Date(), customerId: customer.id },
    });
    this.gateway.emitToTenant(tenantId, 'crm:lead-converted', { leadId: id, customerId: customer.id });
    return updated;
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
    const opp = await this.prisma.opportunity.create({
      data: {
        tenantId,
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: { customer: true, pipeline: true, stage: true },
    });
    this.gateway.emitToTenant(tenantId, 'crm:opportunity-created', { id: opp.id, title: opp.title });
    return opp;
  }

  async updateOpportunity(id: string, tenantId: string, dto: Partial<CreateOpportunityDto>) {
    await this.getOpportunity(id, tenantId);
    return this.prisma.opportunity.update({
      where: { id },
      data: { ...dto, expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined },
    });
  }

  async moveOpportunityStage(id: string, tenantId: string, stageId: string) {
    const opp = await this.getOpportunity(id, tenantId);
    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { stageId },
      include: { stage: true },
    });
    this.gateway.emitToTenant(tenantId, 'crm:opportunity-stage-changed', {
      opportunityId: id,
      title: opp.title,
      stageId,
      stageName: updated.stage?.name,
    });
    return updated;
  }

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  async listPipelines(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId, isActive: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        opportunities: {
          where: { deletedAt: null },
          include: { customer: true, stage: true },
        },
      },
    });
  }

  // ─── Activities ────────────────────────────────────────────────────────────

  async listActivities(tenantId: string, dto: PaginationDto & { leadId?: string; opportunityId?: string }) {
    const where = {
      tenantId,
      ...(dto.leadId ? { leadId: dto.leadId } : {}),
      ...(dto.opportunityId ? { opportunityId: dto.opportunityId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.crmActivity.findMany({
        where,
        include: { lead: true, opportunity: true, user: { select: { id: true, firstName: true, lastName: true } } },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.crmActivity.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async createActivity(tenantId: string, userId: string, dto: CreateActivityDto) {
    const activity = await this.prisma.crmActivity.create({
      data: {
        tenantId,
        userId,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        customerId: dto.customerId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: { lead: true, opportunity: true },
    });
    this.gateway.emitToTenant(tenantId, 'crm:activity-created', { id: activity.id, type: activity.type, subject: activity.subject });
    return activity;
  }

  async completeActivity(id: string, tenantId: string) {
    const activity = await this.prisma.crmActivity.findFirst({ where: { id, tenantId } });
    if (!activity) throw new NotFoundException('Activity not found');
    return this.prisma.crmActivity.update({ where: { id }, data: { completedAt: new Date() } });
  }

  async deleteActivity(id: string, tenantId: string) {
    const activity = await this.prisma.crmActivity.findFirst({ where: { id, tenantId } });
    if (!activity) throw new NotFoundException('Activity not found');
    return this.prisma.crmActivity.delete({ where: { id }, select: { id: true } });
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  async listCampaigns(tenantId: string, dto: PaginationDto) {
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: { _count: { select: { contacts: true } } },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getCampaign(id: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { contacts: { include: { customer: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        subject: dto.subject,
        content: dto.content,
        budget: dto.budget,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async launchCampaign(id: string, tenantId: string) {
    const campaign = await this.getCampaign(id, tenantId);
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE', sentCount: campaign.contacts.length },
    });
    this.gateway.emitToTenant(tenantId, 'crm:campaign-launched', { id, name: campaign.name });
    return updated;
  }

  // ─── Metrics ────────────────────────────────────────────────────────────────

  async getMetrics(tenantId: string) {
    const [leadCounts, oppCounts, wonValue, totalValue, activitiesToday] = await Promise.all([
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
      }),
      this.prisma.opportunity.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { value: true },
      }),
      this.prisma.crmActivity.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const leadByStatus = Object.fromEntries(leadCounts.map((r) => [r.status, r._count.id]));
    const oppByStatus = Object.fromEntries(oppCounts.map((r) => [r.status, r._count.id]));
    const totalOpps = Object.values(oppByStatus).reduce((s, n) => s + n, 0);
    const wonCount = oppByStatus['WON'] ?? 0;

    return {
      leadFunnel: {
        NEW: leadByStatus['NEW'] ?? 0,
        CONTACTED: leadByStatus['CONTACTED'] ?? 0,
        QUALIFIED: leadByStatus['QUALIFIED'] ?? 0,
        CONVERTED: leadByStatus['CONVERTED'] ?? 0,
        LOST: (leadByStatus['UNQUALIFIED'] ?? 0) + (leadByStatus['LOST'] ?? 0),
      },
      opportunities: {
        total: totalOpps,
        open: oppByStatus['OPEN'] ?? 0,
        won: wonCount,
        lost: oppByStatus['LOST'] ?? 0,
        winRate: totalOpps > 0 ? Math.round((wonCount / totalOpps) * 100) : 0,
        totalValue: Number(totalValue._sum.value ?? 0),
        wonValue: Number(wonValue._sum.value ?? 0),
      },
      activitiesToday,
    };
  }
}
