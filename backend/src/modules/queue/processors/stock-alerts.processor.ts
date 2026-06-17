import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';

export const STOCK_ALERTS_QUEUE = 'stock-alerts';

@Processor(STOCK_ALERTS_QUEUE)
export class StockAlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(StockAlertsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'check-low-stock') {
      return this.checkLowStock(job.data.tenantId);
    }
    if (job.name === 'check-all-tenants') {
      return this.checkAllTenants();
    }
  }

  private async checkAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    for (const { id } of tenants) {
      await this.checkLowStock(id);
    }
  }

  private async checkLowStock(tenantId: string) {
    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        product: { isActive: true, isService: false, deletedAt: null, minStock: { gt: 0 } },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, minStock: true } },
        warehouse: { select: { name: true } },
      },
    });

    const alerts = lowStockItems.filter(
      (inv) => inv.product.minStock !== null && inv.quantity <= inv.product.minStock,
    );

    if (alerts.length === 0) return { checked: lowStockItems.length, alerts: 0 };

    // Use the first admin user for the tenant as notification owner
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!adminUser) return { checked: lowStockItems.length, alerts: 0 };

    await this.prisma.notification.createMany({
      data: alerts.map((inv) => ({
        tenantId,
        userId: adminUser.id,
        type: 'WARNING' as const,
        title: `Low stock: ${inv.product.name}`,
        body: `${inv.product.name} (${inv.product.sku}) has only ${inv.quantity} units left (min: ${inv.product.minStock}) in ${inv.warehouse.name}`,
        isRead: false,
      })),
      skipDuplicates: false,
    });

    this.logger.log(`[${tenantId}] Created ${alerts.length} stock alert notifications`);
    return { checked: lowStockItems.length, alerts: alerts.length };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.name} #${job.id} failed: ${err.message}`);
  }
}
