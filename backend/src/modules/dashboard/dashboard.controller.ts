import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Main dashboard overview — all KPI tiles' })
  getOverview(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getOverview(u.tenantId);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Recent sales, purchases and leads' })
  getRecentActivity(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getRecentActivity(u.tenantId);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Last 20 audit log entries' })
  getAuditLog(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getAuditLog(u.tenantId);
  }
}
