import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';
import {
  CreateBankAccountDto, UpdateBankAccountDto,
  CreateRepresentativeDto, UpdateRepresentativeDto,
  CreateDocumentDto, UpdateDocumentDto,
  UpsertDocumentSequenceDto, UpsertSocialMediaDto,
} from './dto/company-entities.dto';
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

  // ─── Bank Accounts ────────────────────────────────────────────────────────

  @Get('bank-accounts')
  @ApiOperation({ summary: 'List company bank accounts' })
  listBankAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listBankAccounts(user.tenantId);
  }

  @Post('bank-accounts')
  @ApiOperation({ summary: 'Add a bank account' })
  createBankAccount(@Body() dto: CreateBankAccountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createBankAccount(user.tenantId, dto);
  }

  @Patch('bank-accounts/:id')
  @ApiOperation({ summary: 'Update a bank account' })
  updateBankAccount(
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.updateBankAccount(id, user.tenantId, dto);
  }

  @Delete('bank-accounts/:id')
  @ApiOperation({ summary: 'Delete a bank account' })
  deleteBankAccount(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteBankAccount(id, user.tenantId);
  }

  // ─── Representatives ──────────────────────────────────────────────────────

  @Get('representatives')
  @ApiOperation({ summary: 'List company representatives' })
  listRepresentatives(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listRepresentatives(user.tenantId);
  }

  @Post('representatives')
  @ApiOperation({ summary: 'Add a representative' })
  createRepresentative(@Body() dto: CreateRepresentativeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createRepresentative(user.tenantId, dto);
  }

  @Patch('representatives/:id')
  @ApiOperation({ summary: 'Update a representative' })
  updateRepresentative(
    @Param('id') id: string,
    @Body() dto: UpdateRepresentativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.updateRepresentative(id, user.tenantId, dto);
  }

  @Delete('representatives/:id')
  @ApiOperation({ summary: 'Delete a representative' })
  deleteRepresentative(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteRepresentative(id, user.tenantId);
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  @Get('documents')
  @ApiOperation({ summary: 'List company documents' })
  listDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listDocuments(user.tenantId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Add a company document' })
  createDocument(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createDocument(user.tenantId, dto);
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Update a company document' })
  updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.updateDocument(id, user.tenantId, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a company document' })
  deleteDocument(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteDocument(id, user.tenantId);
  }

  // ─── Document Sequences ───────────────────────────────────────────────────

  @Get('document-sequences')
  @ApiOperation({ summary: 'List document numbering sequences' })
  listDocumentSequences(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listDocumentSequences(user.tenantId);
  }

  @Put('document-sequences')
  @ApiOperation({ summary: 'Upsert a document numbering sequence' })
  upsertDocumentSequence(@Body() dto: UpsertDocumentSequenceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.upsertDocumentSequence(user.tenantId, dto);
  }

  // ─── Social Media ──────────────────────────────────────────────────────────

  @Get('social-media')
  @ApiOperation({ summary: 'List company social media links' })
  listSocialMedia(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listSocialMedia(user.tenantId);
  }

  @Put('social-media')
  @ApiOperation({ summary: 'Upsert a social media link' })
  upsertSocialMedia(@Body() dto: UpsertSocialMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.upsertSocialMedia(user.tenantId, dto);
  }

  @Delete('social-media/:id')
  @ApiOperation({ summary: 'Delete a social media link' })
  deleteSocialMedia(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteSocialMedia(id, user.tenantId);
  }

  // ─── Branches ─────────────────────────────────────────────────────────────

  @Get('branches')
  listBranches(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listBranches(user.tenantId);
  }

  @Get('branches/:id')
  getBranch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getBranch(id, user.tenantId);
  }

  @Post('branches')
  createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createBranch(user.tenantId, dto);
  }

  @Patch('branches/:id')
  updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateBranch(id, user.tenantId, dto);
  }

  @Delete('branches/:id')
  deleteBranch(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteBranch(id, user.tenantId);
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get('roles')
  listRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listRoles(user.tenantId);
  }

  @Get('roles/:id')
  getRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getRole(id, user.tenantId);
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createRole(user.tenantId, dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateRole(id, user.tenantId, dto, user.roles);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteRole(id, user.tenantId);
  }

  @Post('roles/:id/clone')
  cloneRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.cloneRole(id, user.tenantId);
  }

  @Patch('roles/:id/toggle')
  toggleRoleActive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.toggleRoleActive(id, user.tenantId, user.roles);
  }

  @Put('roles/:id/permissions')
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.assignPermissions(id, user.tenantId, dto, user.roles);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  listPermissions() {
    return this.settings.listPermissions();
  }

  // ─── Tax Codes ────────────────────────────────────────────────────────────

  @Get('taxes')
  listTaxes(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.listTaxes(user.tenantId);
  }

  @Post('taxes')
  createTax(@Body() dto: CreateTaxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.createTax(user.tenantId, dto);
  }

  @Patch('taxes/:id')
  updateTax(@Param('id') id: string, @Body() dto: UpdateTaxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateTax(id, user.tenantId, dto);
  }

  @Delete('taxes/:id')
  deleteTax(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.deleteTax(id, user.tenantId);
  }
}
