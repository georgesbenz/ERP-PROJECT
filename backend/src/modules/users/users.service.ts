import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';

const BCRYPT_ROUNDS = 12;
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  tenantId: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, dto: PaginationDto) {
    const where = {
      tenantId,
      deletedAt: null,
      ...(dto.search ? {
        OR: [
          { firstName: { contains: dto.search, mode: 'insensitive' as const } },
          { lastName: { contains: dto.search, mode: 'insensitive' as const } },
          { email: { contains: dto.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: USER_SELECT,
    });

    if (dto.roleId) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: dto.roleId },
      });
    }

    return user;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);

    const data: Record<string, unknown> = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      status: dto.status,
    };

    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async assignRole(userId: string, roleId: string, tenantId: string) {
    await this.findOne(userId, tenantId);
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeRole(userId: string, roleId: string, tenantId: string) {
    await this.findOne(userId, tenantId);
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async getUserPermissions(userId: string, tenantId: string) {
    await this.findOne(userId, tenantId);
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
  }

  async addUserPermission(userId: string, permissionId: string, tenantId: string) {
    await this.findOne(userId, tenantId);
    const perm = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!perm) throw new NotFoundException('Permission not found');
    return this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: {},
      create: { userId, permissionId },
      include: { permission: true },
    });
  }

  async removeUserPermission(userId: string, permissionId: string, tenantId: string) {
    await this.findOne(userId, tenantId);
    await this.prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
    });
  }
}
