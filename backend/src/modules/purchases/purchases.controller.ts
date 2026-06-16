import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private svc: PurchasesService) {}

  @Get('suppliers')
  @RequirePermissions('purchases:READ')
  @ApiOperation({ summary: 'List suppliers' })
  listSuppliers(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listSuppliers(u.tenantId, q);
  }

  @Get('suppliers/:id')
  @RequirePermissions('purchases:READ')
  getSupplier(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getSupplier(id, u.tenantId);
  }

  @Post('suppliers')
  @RequirePermissions('purchases:CREATE')
  createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createSupplier(u.tenantId, dto);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('purchases:UPDATE')
  updateSupplier(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplierDto>,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.svc.updateSupplier(id, u.tenantId, dto);
  }

  @Delete('suppliers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('purchases:DELETE')
  deleteSupplier(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.deleteSupplier(id, u.tenantId);
  }

  @Get('suppliers/:id/balance')
  @RequirePermissions('purchases:READ')
  @ApiOperation({ summary: 'Supplier balance: total owed, paid, outstanding + aging by order' })
  getSupplierBalance(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getSupplierBalance(id, u.tenantId);
  }

  @Get()
  @RequirePermissions('purchases:READ')
  @ApiOperation({ summary: 'List purchase orders' })
  listPurchases(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.svc.listPurchases(u.tenantId, q);
  }

  @Get(':id')
  @RequirePermissions('purchases:READ')
  getPurchase(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.getPurchase(id, u.tenantId);
  }

  @Post()
  @RequirePermissions('purchases:CREATE')
  @ApiOperation({ summary: 'Create a purchase order' })
  createPurchase(@Body() dto: CreatePurchaseDto, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.createPurchase(u.tenantId, dto, u.userId);
  }

  @Patch(':id/receive')
  @RequirePermissions('purchases:UPDATE')
  @ApiOperation({ summary: 'Mark purchase order as received' })
  receivePurchase(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.svc.receivePurchase(id, u.tenantId);
  }
}
