import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

@ApiTags('Stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private stockService: StockService) {}

  // ── Overview ────────────────────────────────────────────────────────────────

  @Get('summary')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Dashboard stock summary KPIs' })
  getSummary(@CurrentUser() u: AuthenticatedUser) {
    return this.stockService.getStockSummary(u.tenantId);
  }

  @Get('levels')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List all products with stock levels' })
  getStockLevels(
    @CurrentUser() u: AuthenticatedUser,
    @Query('warehouseId') warehouseId?: string,
    @Query('search') search?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
  ) {
    return this.stockService.getStockLevels(
      u.tenantId,
      warehouseId,
      search,
      lowStockOnly === 'true',
    );
  }

  @Get('levels/:productId')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Get detailed stock for one product' })
  getProductStock(
    @Param('productId') productId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.getProductStock(u.tenantId, productId);
  }

  // ── Movements ───────────────────────────────────────────────────────────────

  @Get('movements')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List stock movements with rich filters' })
  getMovements(
    @CurrentUser() u: AuthenticatedUser,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockService.getMovements(u.tenantId, {
      warehouseId,
      productId,
      type,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  // ── Adjustments ─────────────────────────────────────────────────────────────

  @Get('adjustments')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List stock adjustments' })
  getAdjustments(
    @CurrentUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.stockService.getAdjustments(
      u.tenantId,
      status,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Post('adjustments')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a stock adjustment' })
  createAdjustment(
    @Body() dto: any,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.createAdjustment(u.tenantId, u.userId, dto);
  }

  @Post('adjustments/:id/submit')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Submit adjustment for approval' })
  submitAdjustment(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.submitAdjustmentForApproval(u.tenantId, id);
  }

  @Post('adjustments/:id/approve')
  @RequirePermissions('inventory:UPDATE')
  @ApiOperation({ summary: 'Approve or reject a stock adjustment' })
  approveAdjustment(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.approveAdjustment(
      u.tenantId,
      id,
      u.userId,
      body.approved,
      body.comments,
    );
  }

  @Post('adjustments/:id/apply')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Apply an approved adjustment (creates movements)' })
  applyAdjustment(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.applyAdjustment(u.tenantId, id, u.userId);
  }

  // ── Transfers ───────────────────────────────────────────────────────────────

  @Get('transfers')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List warehouse transfers' })
  getTransfers(
    @CurrentUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.stockService.getTransfers(
      u.tenantId,
      status,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Post('transfers')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a warehouse transfer' })
  createTransfer(
    @Body() dto: any,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.createTransfer(u.tenantId, u.userId, dto);
  }

  @Post('transfers/:id/send')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Send transfer (DRAFT → IN_TRANSIT), creates TRANSFER_OUT movements' })
  sendTransfer(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.sendTransfer(u.tenantId, id, u.userId);
  }

  @Post('transfers/:id/receive')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Receive transfer items, creates TRANSFER_IN movements' })
  receiveTransfer(
    @Param('id') id: string,
    @Body() body: { lines: { lineId: string; receivedQty: number }[] },
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.receiveTransfer(u.tenantId, id, u.userId, body.lines);
  }

  @Post('transfers/:id/cancel')
  @RequirePermissions('inventory:UPDATE')
  @ApiOperation({ summary: 'Cancel a warehouse transfer' })
  cancelTransfer(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.stockService.cancelTransfer(u.tenantId, id, u.userId);
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────

  @Get('alerts/low-stock')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Low stock and out-of-stock alerts' })
  getLowStockAlerts(@CurrentUser() u: AuthenticatedUser) {
    return this.stockService.getLowStockAlerts(u.tenantId);
  }

  @Get('alerts/expiry')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Expiry alerts for batches' })
  getExpiryAlerts(
    @CurrentUser() u: AuthenticatedUser,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.stockService.getExpiryAlerts(
      u.tenantId,
      daysAhead ? parseInt(daysAhead, 10) : 30,
    );
  }

  // ── Batches & Serials ───────────────────────────────────────────────────────

  @Get('batches')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List stock batches' })
  getBatches(
    @CurrentUser() u: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.stockService.getBatches(u.tenantId, productId, warehouseId);
  }

  @Get('serials')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List serial numbers' })
  getSerials(
    @CurrentUser() u: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('state') state?: string,
  ) {
    return this.stockService.getSerials(u.tenantId, productId, state);
  }
}
