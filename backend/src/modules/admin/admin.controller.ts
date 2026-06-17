import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Platform stats — all tenants aggregated' })
  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @ApiOperation({ summary: 'List all tenants with usage metrics' })
  @Get('tenants')
  listTenants() {
    return this.adminService.listTenants();
  }

  @ApiOperation({ summary: 'Suspend a tenant (sets isActive=false)' })
  @Patch('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string) {
    return this.adminService.suspendTenant(id);
  }

  @ApiOperation({ summary: 'Activate a suspended tenant' })
  @Patch('tenants/:id/activate')
  activateTenant(@Param('id') id: string) {
    return this.adminService.activateTenant(id);
  }
}
