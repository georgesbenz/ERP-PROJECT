import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService, private pdf: PdfService) {}

  // Customers
  @Get('customers')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'List customers' })
  listCustomers(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.salesService.listCustomers(u.tenantId, q);
  }

  @Get('customers/:id')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'Get customer by ID' })
  getCustomer(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.getCustomer(id, u.tenantId);
  }

  @Post('customers')
  @RequirePermissions('sales:CREATE')
  @ApiOperation({ summary: 'Create a customer' })
  createCustomer(@Body() dto: CreateCustomerDto, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.createCustomer(u.tenantId, dto);
  }

  @Patch('customers/:id')
  @RequirePermissions('sales:UPDATE')
  @ApiOperation({ summary: 'Update a customer' })
  updateCustomer(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCustomerDto>,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.salesService.updateCustomer(id, u.tenantId, dto);
  }

  @Delete('customers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('sales:DELETE')
  @ApiOperation({ summary: 'Delete a customer' })
  deleteCustomer(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.deleteCustomer(id, u.tenantId);
  }

  @Get('customers/:id/history')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'Get customer purchase history (last 50 confirmed sales)' })
  getCustomerHistory(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.getCustomerHistory(id, u.tenantId);
  }

  // Sales
  @Get()
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'List all sales' })
  listSales(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.salesService.listSales(u.tenantId, q);
  }

  @Get(':id')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'Get a sale by ID' })
  getSale(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.getSale(id, u.tenantId);
  }

  @Post()
  @RequirePermissions('sales:CREATE')
  @ApiOperation({ summary: 'Create a sale order' })
  createSale(@Body() dto: CreateSaleDto, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.createSale(u.tenantId, dto, u.userId);
  }

  @Patch(':id/confirm')
  @RequirePermissions('sales:UPDATE')
  @ApiOperation({ summary: 'Confirm a draft sale' })
  confirmSale(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.confirmSale(id, u.tenantId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('sales:UPDATE')
  @ApiOperation({ summary: 'Cancel a sale' })
  cancelSale(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.salesService.cancelSale(id, u.tenantId);
  }

  @Get(':id/invoice.pdf')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'Download sale invoice as PDF' })
  downloadInvoice(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser, @Res() res: Response) {
    return this.pdf.salesInvoice(u.tenantId, id, res);
  }

  @Get(':id/receipt.pdf')
  @RequirePermissions('sales:READ')
  @ApiOperation({ summary: 'Download POS receipt as PDF (narrow format)' })
  downloadReceipt(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser, @Res() res: Response) {
    return this.pdf.posReceipt(u.tenantId, id, res);
  }
}
