import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('CRM')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private svc: CrmService) {}

  // Leads
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

  // Opportunities
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

  // Pipelines
  @Get('pipelines')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List sales pipelines with stages' })
  listPipelines(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listPipelines(u.tenantId);
  }

  // Campaigns
  @Get('campaigns')
  @RequirePermissions('crm:READ')
  @ApiOperation({ summary: 'List marketing campaigns' })
  listCampaigns(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listCampaigns(u.tenantId, q);
  }
}
