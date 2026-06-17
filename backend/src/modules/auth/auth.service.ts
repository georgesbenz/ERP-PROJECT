import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponse } from './dto/auth-response.dto';
import { JwtPayload } from '../../common/types/jwt-payload.type';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const exists = await this.prisma.tenant.findUnique({ where: { slug: dto.companySlug } });
    if (exists) throw new ConflictException('Company slug already taken');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug: dto.companySlug,
        currency: dto.currency ?? 'USD',
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // ── Default warehouse ────────────────────────────────────────────────────
    await this.prisma.warehouse.create({
      data: { tenantId: tenant.id, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    });

    // ── Seed all 10 default roles with pre-assigned permissions ──────────────
    const allPermissions = await this.prisma.permission.findMany();
    if (allPermissions.length === 0) {
      // No permissions seeded — create minimal Admin role and return
      const bare = await this.prisma.role.create({
        data: { tenantId: tenant.id, name: 'Super Admin', description: 'Full system access', isSystem: true },
      });
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: bare.id } });
      return this.buildTokens(user.id, tenant.id, user.email, ['Super Admin']);
    }

    const p = (module: string, action: string) =>
      allPermissions.find((x) => x.module === module && x.action === action)?.id;

    const all = allPermissions.map((x) => x.id);

    // Role definitions: [name, description, permissionIds[]]
    const roleDefs: Array<{ name: string; description: string; perms: (string | undefined)[] }> = [
      {
        name: 'Super Admin',
        description: 'Full system access — can manage everything including system settings',
        perms: all,
      },
      {
        name: 'Admin',
        description: 'Administrative access — manages users, operations and roles (excludes system settings)',
        perms: all.filter((id) => id !== p('system', 'MANAGE_SETTINGS')),
      },
      {
        name: 'HR Manager',
        description: 'Human Resources — manages users, profiles and access',
        perms: [
          p('users', 'READ'), p('users', 'CREATE'), p('users', 'UPDATE'),
          p('analytics', 'READ'),
          p('system', 'READ'),
        ],
      },
      {
        name: 'Finance Manager',
        description: 'Finance & Accounting — manages invoices, payments, budgets and reports',
        perms: [
          p('finance', 'READ'), p('finance', 'CREATE'), p('finance', 'UPDATE'),
          p('budgeting', 'READ'), p('budgeting', 'CREATE'), p('budgeting', 'UPDATE'), p('budgeting', 'APPROVE'),
          p('analytics', 'READ'),
          p('purchases', 'READ'), p('sales', 'READ'),
          p('system', 'READ'),
        ],
      },
      {
        name: 'Procurement Officer',
        description: 'Purchasing — manages purchase orders, suppliers and receiving goods',
        perms: [
          p('purchases', 'READ'), p('purchases', 'CREATE'), p('purchases', 'UPDATE'), p('purchases', 'DELETE'),
          p('inventory', 'READ'),
          p('finance', 'READ'),
          p('analytics', 'READ'),
        ],
      },
      {
        name: 'Sales Manager',
        description: 'Sales & CRM — manages sales orders, customers, leads and opportunities',
        perms: [
          p('sales', 'READ'), p('sales', 'CREATE'), p('sales', 'UPDATE'), p('sales', 'DELETE'),
          p('crm', 'READ'), p('crm', 'CREATE'), p('crm', 'UPDATE'), p('crm', 'DELETE'),
          p('inventory', 'READ'),
          p('finance', 'READ'),
          p('analytics', 'READ'),
        ],
      },
      {
        name: 'Inventory Manager',
        description: 'Warehouse & Stock — manages products, categories, stock movements and warehouses',
        perms: [
          p('inventory', 'READ'), p('inventory', 'CREATE'), p('inventory', 'UPDATE'), p('inventory', 'DELETE'),
          p('purchases', 'READ'),
          p('analytics', 'READ'),
        ],
      },
      {
        name: 'Department Manager',
        description: 'Department oversight — view all modules, create and edit within operations',
        perms: [
          p('users', 'READ'),
          p('inventory', 'READ'), p('inventory', 'UPDATE'),
          p('sales', 'READ'), p('sales', 'CREATE'), p('sales', 'UPDATE'),
          p('purchases', 'READ'), p('purchases', 'CREATE'),
          p('finance', 'READ'),
          p('crm', 'READ'), p('crm', 'CREATE'), p('crm', 'UPDATE'),
          p('analytics', 'READ'),
          p('budgeting', 'READ'),
          p('system', 'READ'),
        ],
      },
      {
        name: 'Employee',
        description: 'Basic access — daily operations: view and create in their primary modules',
        perms: [
          p('inventory', 'READ'),
          p('sales', 'READ'), p('sales', 'CREATE'),
          p('purchases', 'READ'), p('purchases', 'CREATE'),
          p('crm', 'READ'),
        ],
      },
      {
        name: 'Auditor',
        description: 'Read-only access across all modules — for compliance and audit purposes',
        perms: allPermissions.filter((x) => x.action === 'READ').map((x) => x.id),
      },
    ];

    // Create all roles and assign permissions in parallel batches
    const createdRoles = await Promise.all(
      roleDefs.map((def) =>
        this.prisma.role.create({
          data: { tenantId: tenant.id, name: def.name, description: def.description, isSystem: true },
        }),
      ),
    );

    const superAdminRole = createdRoles[0]; // Super Admin is always first
    await this.prisma.userRole.create({ data: { userId: user.id, roleId: superAdminRole.id } });

    await Promise.all(
      createdRoles.map((role, idx) => {
        const permIds = roleDefs[idx].perms.filter((id): id is string => !!id);
        if (permIds.length === 0) return Promise.resolve();
        return this.prisma.rolePermission.createMany({
          data: permIds.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }),
    );

    return this.buildTokens(user.id, tenant.id, user.email, ['Super Admin']);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.roles.map((ur) => ur.role.name);
    return this.buildTokens(user.id, user.tenantId, user.email, roles);
  }

  async refresh(userId: string, rawRefreshToken: string): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    if (!user?.refreshToken) throw new UnauthorizedException();

    const matches = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!matches) throw new UnauthorizedException();

    const roles = user.roles.map((ur) => ur.role.name);
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL', 900)),
    });

    return { accessToken };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    // Always return success to avoid email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    // In production, send email. In dev, log the token.
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${rawToken}`;
    this.logger.log(`[DEV] Password reset for ${user.email} → ${resetUrl}`);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshToken: null,
      },
    });

    return { message: 'Password updated successfully. Please log in.' };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        tenantId: true,
        lastLoginAt: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async buildTokens(
    userId: string,
    tenantId: string,
    email: string,
    roles: string[],
  ): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: userId, tenantId, email, roles };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL', 900)),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: Number(this.config.get('JWT_REFRESH_TTL', 604800)),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
    });

    return { accessToken, refreshToken, user: { ...user, roles } };
  }
}
