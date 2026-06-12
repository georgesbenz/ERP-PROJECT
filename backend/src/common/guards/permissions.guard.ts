import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { userId, tenantId } = req.user;

    // Fetch role permissions + user-level direct overrides in parallel
    const [userRoles, userDirectPerms] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
      }),
    ]);

    const granted = new Set<string>();

    // Permissions from active roles
    for (const ur of userRoles) {
      if (!ur.role.isActive) continue;
      for (const rp of ur.role.permissions) {
        granted.add(`${rp.permission.module}:${rp.permission.action}`);
      }
    }

    // Direct user-level permission overrides (extra grants beyond their role)
    for (const up of userDirectPerms) {
      granted.add(`${up.permission.module}:${up.permission.action}`);
    }

    if (!required.every((p) => granted.has(p))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    void tenantId;
    return true;
  }
}
