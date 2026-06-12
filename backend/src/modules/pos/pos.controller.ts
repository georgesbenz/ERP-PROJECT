import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private pos: PosService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Process a POS checkout — creates sale + payment + decrements stock' })
  checkout(@Body() dto: PosCheckoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pos.checkout(user.tenantId, dto, user.userId);
  }

  @Get('session')
  @ApiOperation({ summary: 'POS session summary: sales and revenue today' })
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.pos.getSession(user.tenantId);
  }
}
