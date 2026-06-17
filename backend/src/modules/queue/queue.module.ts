import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { StockAlertsProcessor, STOCK_ALERTS_QUEUE } from './processors/stock-alerts.processor';
import { NotificationCleanupProcessor, NOTIFICATION_CLEANUP_QUEUE } from './processors/notification-cleanup.processor';
import { QueueSchedulerService } from './queue-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: STOCK_ALERTS_QUEUE },
      { name: NOTIFICATION_CLEANUP_QUEUE },
    ),
    PrismaModule,
  ],
  providers: [
    StockAlertsProcessor,
    NotificationCleanupProcessor,
    QueueSchedulerService,
  ],
  exports: [BullModule],
})
export class QueueModule {}
