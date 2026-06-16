import { Module } from '@nestjs/common';
import { BudgetingController } from './budgeting.controller';
import { BudgetingService } from './budgeting.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BudgetingController],
  providers: [BudgetingService],
  exports: [BudgetingService],
})
export class BudgetingModule {}
