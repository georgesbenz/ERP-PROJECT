import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PdfService } from '../pdf/pdf.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService, private pdf: PdfService) {}

  @Get()
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Generate a report (sales, inventory, customer aging, P&L…)' })
  generate(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.generate(user.tenantId, query);
  }

  @Get('employees')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Sales performance by employee' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  employeeReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.employeeReport(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('branches')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Sales by branch' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  branchReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.branchReport(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('tax')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'VAT / tax collected by rate' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  taxReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.taxReport(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('margin')
  @RequirePermissions('analytics:READ')
  @ApiOperation({ summary: 'Gross margin by product' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  marginReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.marginReport(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('csv')
  @ApiOperation({ summary: 'Export data as CSV — type: sales | purchases | inventory | customers | expenses' })
  @ApiQuery({ name: 'type', enum: ['sales', 'purchases', 'inventory', 'customers', 'expenses'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  exportCsv(
    @Query('type') type: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    return this.pdf.exportCsv(user.tenantId, type, startDate, endDate, res);
  }
}
