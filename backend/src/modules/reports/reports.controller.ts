import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Generate a report (sales, inventory, customer aging, P&L…)' })
  generate(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.generate(user.tenantId, query);
  }
}
