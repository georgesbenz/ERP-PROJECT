import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ─── Company ──────────────────────────────────────────────────────────────

  async getCompany(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  async updateCompany(tenantId: string, dto: UpdateCompanyDto) {
    const { dateEstablished, ...rest } = dto;
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { ...rest, ...(dateEstablished ? { dateEstablished: new Date(dateEstablished) } : {}) },
    });
  }

  // ─── Bank Accounts ────────────────────────────────────────────────────────

  async listBankAccounts(tenantId: string) {
    return this.prisma.companyBankAccount.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createBankAccount(tenantId: string, dto: CreateBankAccountDto) {
    if (dto.isDefault) {
      await this.prisma.companyBankAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.companyBankAccount.create({ data: { tenantId, ...dto } });
  }

  async updateBankAccount(id: string, tenantId: string, dto: UpdateBankAccountDto) {
    const existing = await this.prisma.companyBankAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Bank account not found');
    if (dto.isDefault) {
      await this.prisma.companyBankAccount.updateMany({
        where: { tenantId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.companyBankAccount.update({ where: { id }, data: dto });
  }

  async deleteBankAccount(id: string, tenantId: string) {
    const existing = await this.prisma.companyBankAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Bank account not found');
    await this.prisma.companyBankAccount.delete({ where: { id } });
    return { id };
  }

  // ─── Representatives ──────────────────────────────────────────────────────

  async listRepresentatives(tenantId: string) {
    return this.prisma.companyRepresentative.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRepresentative(tenantId: string, dto: CreateRepresentativeDto) {
    return this.prisma.companyRepresentative.create({ data: { tenantId, ...dto } });
  }

  async updateRepresentative(id: string, tenantId: string, dto: UpdateRepresentativeDto) {
    const existing = await this.prisma.companyRepresentative.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Representative not found');
    return this.prisma.companyRepresentative.update({ where: { id }, data: dto });
  }

  async deleteRepresentative(id: string, tenantId: string) {
    const existing = await this.prisma.companyRepresentative.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Representative not found');
    await this.prisma.companyRepresentative.delete({ where: { id } });
    return { id };
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  async listDocuments(tenantId: string) {
    return this.prisma.companyDocument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDocument(tenantId: string, dto: CreateDocumentDto) {
    const { expiresAt, ...rest } = dto;
    return this.prisma.companyDocument.create({
      data: { tenantId, ...rest, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}) },
    });
  }

  async updateDocument(id: string, tenantId: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.companyDocument.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Document not found');
    const { expiresAt, ...rest } = dto;
    return this.prisma.companyDocument.update({
      where: { id },
      data: { ...rest, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}) },
    });
  }

  async deleteDocument(id: string, tenantId: string) {
    const existing = await this.prisma.companyDocument.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Document not found');
    await this.prisma.companyDocument.delete({ where: { id } });
    return { id };
  }

  // ─── Document Sequences ───────────────────────────────────────────────────

  async listDocumentSequences(tenantId: string) {
    return this.prisma.companyDocumentSequence.findMany({
      where: { tenantId },
      orderBy: { docType: 'asc' },
    });
  }

  async upsertDocumentSequence(tenantId: string, dto: UpsertDocumentSequenceDto) {
    const { docType, prefix, nextNumber = 1, padding = 5 } = dto;
    return this.prisma.companyDocumentSequence.upsert({
      where: { tenantId_docType: { tenantId, docType } },
      create: { tenantId, docType, prefix, nextNumber, padding },
      update: { prefix, nextNumber, padding },
    });
  }

  // ─── Social Media ──────────────────────────────────────────────────────────

  async listSocialMedia(tenantId: string) {
    return this.prisma.companySocialMedia.findMany({
      where: { tenantId },
      orderBy: { platform: 'asc' },
    });
  }

  async upsertSocialMedia(tenantId: string, dto: UpsertSocialMediaDto) {
    const { platform, url, isActive = true } = dto;
    return this.prisma.companySocialMedia.upsert({
      where: { tenantId_platform: { tenantId, platform } },
      create: { tenantId, platform, url, isActive },
      update: { url, isActive },
    });
  }

  async deleteSocialMedia(id: string, tenantId: string) {
    const existing = await this.prisma.companySocialMedia.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Social media entry not found');
    await this.prisma.companySocialMedia.delete({ where: { id } });
    return { id };
  }

  // ─── Branches ─────────────────────────────────────────────────────────────

  async listBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  async getBranch(id: string, tenantId: string) {
    const b = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  async createBranch(tenantId: string, dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findFirst({ where: { tenantId, code: dto.code } });
    if (existing) throw new ConflictException('Branch code already used');
    return this.prisma.branch.create({ data: { tenantId, ...dto } });
  }

  async updateBranch(id: string, tenantId: string, dto: UpdateBranchDto) {
    await this.getBranch(id, tenantId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async deleteBranch(id: string, tenantId: string) {
    await this.getBranch(id, tenantId);
    await this.prisma.branch.update({ where: { id }, data: { isActive: false } });
    return { id };
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRole(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(tenantId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException('Role name already used');
    return this.prisma.role.create({ data: { tenantId, ...dto } });
  }

  private canModifySystem(callerRoles: string[]): boolean {
    return callerRoles.includes('Super Admin') || callerRoles.includes('Admin');
  }

  async updateRole(id: string, tenantId: string, dto: UpdateRoleDto, callerRoles: string[] = []) {
    const role = await this.getRole(id, tenantId);
    if (role.isSystem && !this.canModifySystem(callerRoles)) {
      throw new ForbiddenException('Only Admin or Super Admin can modify system roles');
    }
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async toggleRoleActive(id: string, tenantId: string, callerRoles: string[] = []) {
    const role = await this.getRole(id, tenantId);
    if (role.isSystem && !this.canModifySystem(callerRoles)) {
      throw new ForbiddenException('Only Admin or Super Admin can toggle system roles');
    }
    return this.prisma.role.update({ where: { id }, data: { isActive: !role.isActive } });
  }

  async cloneRole(id: string, tenantId: string) {
    const source = await this.getRole(id, tenantId);
    let newName = `${source.name} (Copy)`;
    const existing = await this.prisma.role.findFirst({ where: { tenantId, name: newName } });
    if (existing) newName = `${source.name} (Copy ${Date.now()})`;
    const cloned = await this.prisma.role.create({
      data: { tenantId, name: newName, description: source.description, isSystem: false },
    });
    const permIds = source.permissions.map((rp) => rp.permission.id);
    if (permIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId: cloned.id, permissionId })),
        skipDuplicates: true,
      });
    }
    return this.getRole(cloned.id, tenantId);
  }

  async deleteRole(id: string, tenantId: string) {
    const role = await this.getRole(id, tenantId);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deleted');
    await this.prisma.role.delete({ where: { id } });
    return { id };
  }

  async assignPermissions(roleId: string, tenantId: string, dto: AssignPermissionsDto, callerRoles: string[] = []) {
    const role = await this.getRole(roleId, tenantId);
    if (role.isSystem && !this.canModifySystem(callerRoles)) {
      throw new ForbiddenException('Only Admin or Super Admin can modify system role permissions');
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
    return this.getRole(roleId, tenantId);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { module: 'asc' } });
  }

  // ─── Tax Codes ────────────────────────────────────────────────────────────

  async listTaxes(tenantId: string) {
    return this.prisma.tax.findMany({
      where: { tenantId },
      orderBy: { rate: 'asc' },
    });
  }

  async getTax(id: string, tenantId: string) {
    const tax = await this.prisma.tax.findFirst({ where: { id, tenantId } });
    if (!tax) throw new NotFoundException('Tax code not found');
    return tax;
  }

  async createTax(tenantId: string, dto: CreateTaxDto) {
    const existing = await this.prisma.tax.findFirst({ where: { tenantId, code: dto.code } });
    if (existing) throw new ConflictException(`Tax code "${dto.code}" already exists`);
    return this.prisma.tax.create({ data: { tenantId, ...dto } });
  }

  async updateTax(id: string, tenantId: string, dto: UpdateTaxDto) {
    await this.getTax(id, tenantId);
    if (dto.code) {
      const conflict = await this.prisma.tax.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Tax code "${dto.code}" already in use`);
    }
    return this.prisma.tax.update({ where: { id }, data: dto });
  }

  async deleteTax(id: string, tenantId: string) {
    await this.getTax(id, tenantId);
    const usedByProducts = await this.prisma.product.count({ where: { taxId: id, deletedAt: null } });
    if (usedByProducts > 0) {
      throw new ConflictException(`Cannot delete: ${usedByProducts} product(s) use this tax code`);
    }
    await this.prisma.tax.delete({ where: { id } });
    return { id };
  }
}
