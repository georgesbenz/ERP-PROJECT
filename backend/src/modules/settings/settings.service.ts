import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ─── Company ──────────────────────────────────────────────────────────────

  async getCompany(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  async updateCompany(tenantId: string, dto: UpdateCompanyDto) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
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
    // Ensure unique name within tenant
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
