import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PeriodQuery {
  @ApiPropertyOptional({ description: 'Period string e.g. 2026-Q1 or 2026-01' })
  @IsOptional()
  @IsString()
  period?: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('financial')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Financial P&L snapshots' })
  getFinancial(@CurrentUser() u: AuthenticatedUser, @Query() q: PeriodQuery) {
    return this.svc.getFinancialSummary(u.tenantId, q.period);
  }

  @Get('revenue')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Revenue analytics (last 12 periods)' })
  getRevenue(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getRevenueSummary(u.tenantId);
  }

  @Get('expenses')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Expense analytics (last 12 periods)' })
  getExpenses(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getExpenseSummary(u.tenantId);
  }

  @Get('cash-flow')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Cash flow forecast (next 24 periods)' })
  getCashFlow(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getCashFlowForecast(u.tenantId);
  }

  @Get('kpis')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'KPI tracker records' })
  getKpis(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getKpis(u.tenantId);
  }

  @Get('forecasts')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Revenue/expense/cashflow forecasts' })
  getForecasts(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getForecasts(u.tenantId);
  }

  @Get('goals')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Goal tracker' })
  getGoals(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getGoals(u.tenantId);
  }

  @Get('sales-summary')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Real-time sales summary' })
  getSalesSummary(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getSalesSummary(u.tenantId);
  }

  @Get('inventory-summary')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Inventory health with low-stock alerts' })
  getInventorySummary(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getInventorySummary(u.tenantId);
  }
}
