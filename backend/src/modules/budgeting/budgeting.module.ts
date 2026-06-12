import { Module } from '@nestjs/common';
import { BudgetingController } from './budgeting.controller';
import { BudgetingService } from './budgeting.service';

@Module({
  controllers: [BudgetingController],
  providers: [BudgetingService],
  exports: [BudgetingService],
})
export class BudgetingModule {}
