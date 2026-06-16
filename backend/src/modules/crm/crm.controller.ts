import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ActivityQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  opportunityId?: string;
}

@ApiTags('CRM')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private svc: CrmService) {}

  // ── Leads ────────────────────────────────────────────────────────────────

  @Get('leads')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List leads' })
  listLeads(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listLeads(u.tenantId, q);
  }

  @Get('leads/:id')
  @RequirePermissions('crm:READ')
  getLead(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getLead(id, u.tenantId);
  }

  @Post('leads')
  @RequirePermissions('crm:CREATE')
  @ApiOperation({ summary: 'Create a lead' })
  createLead(@Body() dto: CreateLeadDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createLead(u.tenantId, dto);
  }

  @Patch('leads/:id')
  @RequirePermissions('crm:UPDATE')
  updateLead(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLeadDto>,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.updateLead(id, u.tenantId, dto);
  }

  @Delete('leads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('crm:DELETE')
  deleteLead(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.deleteLead(id, u.tenantId);
  }

  @Post('leads/:id/convert')
  @RequirePermissions('crm:UPDATE')
  @ApiOperation({ summary: 'Convert lead to customer' })
  convertLead(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.convertLead(id, u.tenantId);
  }

  // ── Opportunities ────────────────────────────────────────────────────────

  @Get('opportunities')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List opportunities' })
  listOpportunities(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listOpportunities(u.tenantId, q);
  }

  @Get('opportunities/:id')
  @RequirePermissions('crm:READ')
  getOpportunity(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getOpportunity(id, u.tenantId);
  }

  @Post('opportunities')
  @RequirePermissions('crm:CREATE')
  @ApiOperation({ summary: 'Create an opportunity' })
  createOpportunity(@Body() dto: CreateOpportunityDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createOpportunity(u.tenantId, dto);
  }

  @Patch('opportunities/:id')
  @RequirePermissions('crm:UPDATE')
  updateOpportunity(
    @Param('id') id: string,
    @Body() dto: Partial<CreateOpportunityDto>,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.updateOpportunity(id, u.tenantId, dto);
  }

  @Patch('opportunities/:id/stage')
  @RequirePermissions('crm:UPDATE')
  @ApiOperation({ summary: 'Move opportunity to a new pipeline stage (emits real-time event)' })
  moveStage(
    @Param('id') id: string,
    @Body() body: { stageId: string },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.moveOpportunityStage(id, u.tenantId, body.stageId);
  }

  // ── Pipelines ────────────────────────────────────────────────────────────

  @Get('pipelines')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List sales pipelines with stages and opportunities' })
  listPipelines(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listPipelines(u.tenantId);
  }

  // ── Activities ───────────────────────────────────────────────────────────

  @Get('activities')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List CRM activities (filterable by leadId or opportunityId)' })
  listActivities(@CurrentUser() u: AuthenticatedUser, @Query() q: ActivityQuery) {
    return this.svc.listActivities(u.tenantId, q);
  }

  @Post('activities')
  @RequirePermissions('crm:CREATE')
  @ApiOperation({ summary: 'Log a CRM activity (call, email, meeting, task, note)' })
  createActivity(@Body() dto: CreateActivityDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createActivity(u.tenantId, u.userId, dto);
  }

  @Patch('activities/:id/complete')
  @RequirePermissions('crm:UPDATE')
  @ApiOperation({ summary: 'Mark activity as completed' })
  completeActivity(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.completeActivity(id, u.tenantId);
  }

  @Delete('activities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('crm:DELETE')
  deleteActivity(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.deleteActivity(id, u.tenantId);
  }

  // ── Campaigns ────────────────────────────────────────────────────────────

  @Get('campaigns')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List marketing campaigns' })
  listCampaigns(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listCampaigns(u.tenantId, q);
  }

  @Get('campaigns/:id')
  @RequirePermissions('crm:READ')
  getCampaign(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getCampaign(id, u.tenantId);
  }

  @Post('campaigns')
  @RequirePermissions('crm:CREATE')
  @ApiOperation({ summary: 'Create a marketing campaign' })
  createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createCampaign(u.tenantId, dto);
  }

  @Patch('campaigns/:id/launch')
  @RequirePermissions('crm:UPDATE')
  @ApiOperation({ summary: 'Launch a campaign (sets status ACTIVE, emits real-time event)' })
  launchCampaign(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.launchCampaign(id, u.tenantId);
  }

  // ── Metrics ──────────────────────────────────────────────────────────────

  @Get('metrics')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'CRM dashboard metrics: lead funnel, opportunity win rate, daily activity count' })
  getMetrics(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getMetrics(u.tenantId);
  }
}
