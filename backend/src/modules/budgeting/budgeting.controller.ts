import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetingService } from './budgeting.service';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Budgeting')
@ApiBearerAuth()
@Controller('budgeting')
export class BudgetingController {
  constructor(private svc: BudgetingService) {}

  // ── Plans ────────────────────────────────────────────────────────────────

  @Get('plans')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'List budget plans' })
  listPlans(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listPlans(u.tenantId, q);
  }

  @Get('plans/:id')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'Get budget plan details' })
  getPlan(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getPlan(id, u.tenantId);
  }

  @Post('plans')
  @RequirePermissions('budgeting:CREATE')
  @ApiOperation({ summary: 'Create a budget plan' })
  createPlan(@Body() dto: CreateBudgetPlanDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createPlan(u.tenantId, dto, u.userId);
  }

  @Patch('plans/:id/submit')
  @RequirePermissions('budgeting:UPDATE')
  @ApiOperation({ summary: 'Submit budget plan for approval' })
  submitForApproval(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.submitForApproval(id, u.tenantId, u.userId);
  }

  @Patch('plans/:id/approve')
  @RequirePermissions('budgeting:APPROVE')
  @ApiOperation({ summary: 'Approve a budget plan (emits real-time event)' })
  approvePlan(
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.approvePlan(id, u.tenantId, u.userId, body.comments);
  }

  @Patch('plans/:id/reject')
  @RequirePermissions('budgeting:APPROVE')
  @ApiOperation({ summary: 'Reject a budget plan (emits real-time event)' })
  rejectPlan(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.rejectPlan(id, u.tenantId, u.userId, body.reason);
  }

  // ── Allocations ──────────────────────────────────────────────────────────

  @Get('plans/:planId/allocations')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'List allocations for a budget plan' })
  listAllocations(@Param('planId') planId: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.listAllocations(planId, u.tenantId);
  }

  @Post('plans/:planId/allocations')
  @RequirePermissions('budgeting:CREATE')
  @ApiOperation({ summary: 'Create or update an allocation (upsert by category+period)' })
  createAllocation(
    @Param('planId') planId: string,
    @Body() dto: CreateAllocationDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.createAllocation(planId, u.tenantId, dto);
  }

  @Delete('plans/:planId/allocations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('budgeting:DELETE')
  deleteAllocation(
    @Param('planId') planId: string,
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.deleteAllocation(id, planId, u.tenantId);
  }

  // ── Variance / Budget vs Actual ──────────────────────────────────────────

  @Get('plans/:id/variance')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'Budget vs actual variance report for a plan' })
  getVariance(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getVarianceReport(id, u.tenantId);
  }

  // ── Lookups ──────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'List budget categories (tree)' })
  listCategories(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listCategories(u.tenantId);
  }

  @Get('departments')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'List departments with cost centers' })
  listDepartments(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listDepartments(u.tenantId);
  }
}
