import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';

export const NOTIFICATION_CLEANUP_QUEUE = 'notification-cleanup';

@Processor(NOTIFICATION_CLEANUP_QUEUE)
export class NotificationCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationCleanupProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'cleanup-read') {
      return this.cleanupReadNotifications();
    }
  }

  private async cleanupReadNotifications() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const { count } = await this.prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoff } },
    });
    this.logger.log(`Cleaned up ${count} read notifications older than 30 days`);
    return { deleted: count };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.name} #${job.id} failed: ${err.message}`);
  }
}
