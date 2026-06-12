import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private svc: FinanceService) {}

  @Get('payments')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'List all payments' })
  listPayments(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listPayments(u.tenantId, q);
  }

  @Post('payments')
  @RequirePermissions('finance:CREATE')
  @ApiOperation({ summary: 'Record a payment' })
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createPayment(u.tenantId, dto);
  }

  @Get('invoices')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'List invoices' })
  listInvoices(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listInvoices(u.tenantId, q);
  }

  @Get('invoices/:id')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'Get invoice by ID' })
  getInvoice(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getInvoice(id, u.tenantId);
  }

  @Get('accounts')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'Chart of accounts (tree)' })
  listAccounts(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listAccounts(u.tenantId);
  }

  @Get('journal-entries')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'List journal entries (double-entry)' })
  listJournalEntries(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listJournalEntries(u.tenantId, q);
  }

  @Get('taxes')
  @RequirePermissions('finance:READ')
  @ApiOperation({ summary: 'List tax rates' })
  listTaxes(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listTaxes(u.tenantId);
  }
}
