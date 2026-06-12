import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetingService } from './budgeting.service';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Budgeting')
@ApiBearerAuth()
@Controller('budgeting')
export class BudgetingController {
  constructor(private svc: BudgetingService) {}

  @Get('plans')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'List budget plans' })
  listPlans(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listPlans(u.tenantId, q);
  }

  @Get('plans/:id')
  @RequirePermissions('budgeting:READ')
  @ApiOperation({ summary: 'Get budget plan details with allocations and approvals' })
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
  @ApiOperation({ summary: 'Approve a budget plan' })
  approvePlan(
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.approvePlan(id, u.tenantId, u.userId, body.comments);
  }

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
