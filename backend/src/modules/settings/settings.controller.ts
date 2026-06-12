import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  // ─── Company ──────────────────────────────────────────────────────────────

  @Get('company')
  @ApiOperation({ summary: 'Get tenant company info' })
  getCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getCompany(user.tenantId);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Update tenant company info' })
  updateCompany(@Body() dto: UpdateCompanyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateCompany(user.tenantId, dto);
  }

  // ─── Branches ─────────────────────────────────────────────────────────────

  @Get('branches')
  @ApiOperation({ summary: 'List all branches' })
  listBranches(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listBranches(user.tenantId);
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get branch by ID' })
  getBranch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getBranch(id, user.tenantId);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch' })
  createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createBranch(user.tenantId, dto);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update a branch' })
  updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateBranch(id, user.tenantId, dto);
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Deactivate a branch' })
  deleteBranch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteBranch(id, user.tenantId);
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: 'List all roles with permissions' })
  listRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listRoles(user.tenantId);
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get role by ID' })
  getRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getRole(id, user.tenantId);
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createRole(user.tenantId, dto);
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update a role (system roles: Admin only)' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateRole(id, user.tenantId, dto, user.roles);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a role (custom roles only)' })
  deleteRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteRole(id, user.tenantId);
  }

  @Post('roles/:id/clone')
  @ApiOperation({ summary: 'Clone a role (creates a custom copy with same permissions)' })
  cloneRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.cloneRole(id, user.tenantId);
  }

  @Patch('roles/:id/toggle')
  @ApiOperation({ summary: 'Toggle a role active/inactive (system roles: Admin only)' })
  toggleRoleActive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.toggleRoleActive(id, user.tenantId, user.roles);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Replace permissions on a role (system roles: Admin only)' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.assignPermissions(id, user.tenantId, dto, user.roles);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions() {
    return this.settings.listPermissions();
  }

  // ─── Tax Codes ────────────────────────────────────────────────────────────

  @Get('taxes')
  @ApiOperation({ summary: 'List all tax codes' })
  listTaxes(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listTaxes(user.tenantId);
  }

  @Post('taxes')
  @ApiOperation({ summary: 'Create a tax code' })
  createTax(@Body() dto: CreateTaxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createTax(user.tenantId, dto);
  }

  @Patch('taxes/:id')
  @ApiOperation({ summary: 'Update a tax code' })
  updateTax(@Param('id') id: string, @Body() dto: UpdateTaxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateTax(id, user.tenantId, dto);
  }

  @Delete('taxes/:id')
  @ApiOperation({ summary: 'Delete a tax code (only if no products use it)' })
  deleteTax(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteTax(id, user.tenantId);
  }
}
