import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, buildMeta } from '../../common/dto/pagination.dto';
import { NotificationType } from '@prisma/client';

export interface SendNotificationDto {
  tenantId: string;
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getMyNotifications(userId: string, tenantId: string, dto: PaginationDto) {
    const where = { userId, tenantId };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: buildMeta(dto.page ?? 1, dto.limit ?? 20, total) };
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, tenantId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async send(dto: SendNotificationDto) {
    return this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        type: dto.type ?? 'INFO',
        title: dto.title,
        body: dto.body,
        link: dto.link,
      },
    });
  }

  async broadcastToTenant(
    tenantId: string,
    notification: Omit<SendNotificationDto, 'tenantId' | 'userId'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId,
        userId: u.id,
        type: notification.type ?? 'INFO',
        title: notification.title,
        body: notification.body,
        link: notification.link,
      })),
    });
  }
}
