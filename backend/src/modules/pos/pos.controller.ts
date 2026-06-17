import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { CloseCashSessionDto, OpenCashSessionDto } from './dto/cash-session.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { RequirePermissions as Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private pos: PosService) {}

  @Get('products')
  @Permissions('pos:READ')
  @ApiOperation({ summary: 'List sellable products for the POS terminal' })
  getProducts(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.pos.getProductsForPos(user.tenantId, search);
  }

  @Post('checkout')
  @Permissions('pos:CREATE')
  @ApiOperation({ summary: 'Process a POS checkout — creates sale + payment + decrements stock' })
  checkout(@Body() dto: PosCheckoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pos.checkout(user.tenantId, dto, user.userId);
  }

  @Get('session')
  @Permissions('pos:READ')
  @ApiOperation({ summary: 'POS session summary: sales and revenue today, open cash session' })
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.pos.getSession(user.tenantId);
  }

  // ─── Cash Sessions ──────────────────────────────────────────────────────────

  @Get('cash-sessions')
  @Permissions('pos:READ')
  @ApiOperation({ summary: 'List cash sessions (last 50)' })
  listCashSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.pos.listCashSessions(user.tenantId);
  }

  @Post('cash-sessions')
  @Permissions('pos:CREATE')
  @ApiOperation({ summary: 'Open a new cash session' })
  openCashSession(@Body() dto: OpenCashSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pos.openCashSession(user.tenantId, user.userId, dto);
  }

  @Patch('cash-sessions/:id/close')
  @Permissions('pos:UPDATE')
  @ApiOperation({ summary: 'Close an open cash session' })
  closeCashSession(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pos.closeCashSession(id, user.tenantId, user.userId, dto);
  }

  @Patch('cash-sessions/:id/reconcile')
  @Permissions('pos:UPDATE')
  @ApiOperation({ summary: 'Mark closed cash session as reconciled' })
  reconcileCashSession(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pos.reconcileCashSession(id, user.tenantId);
  }
}
