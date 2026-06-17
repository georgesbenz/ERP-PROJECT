import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { STOCK_ALERTS_QUEUE } from './processors/stock-alerts.processor';
import { NOTIFICATION_CLEANUP_QUEUE } from './processors/notification-cleanup.processor';

@Injectable()
export class QueueSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(
    @InjectQueue(STOCK_ALERTS_QUEUE) private stockAlertsQueue: Queue,
    @InjectQueue(NOTIFICATION_CLEANUP_QUEUE) private cleanupQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    // Remove any stale repeatable jobs from previous runs
    await this.stockAlertsQueue.drain();
    await this.cleanupQueue.drain();
    this.logger.log('Queue scheduler ready');
  }

  // Every day at 07:00 — check all tenants for low stock
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async scheduleDailyStockCheck() {
    await this.stockAlertsQueue.add('check-all-tenants', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    this.logger.log('Queued daily stock alert check');
  }

  // Every Sunday at 03:00 — clean up old read notifications
  @Cron(CronExpression.EVERY_WEEK)
  async scheduleNotificationCleanup() {
    await this.cleanupQueue.add('cleanup-read', {}, {
      attempts: 2,
      removeOnComplete: 10,
      removeOnFail: 10,
    });
    this.logger.log('Queued weekly notification cleanup');
  }
}
