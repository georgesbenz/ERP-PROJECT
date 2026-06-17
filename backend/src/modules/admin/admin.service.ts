import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        city: true,
        country: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, sales: true, products: true } },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      city: t.city,
      country: t.country,
      plan: t.plan,
      isActive: t.isActive,
      createdAt: t.createdAt,
      userCount: t._count.users,
      saleCount: t._count.sales,
      productCount: t._count.products,
    }));
  }

  async suspendTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async activateTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: true } });
  }

  async getPlatformStats() {
    const [totalTenants, activeTenants, totalUsers, thisMonthSales] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.sale.count({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
      }),
    ]);

    return { totalTenants, activeTenants, suspendedTenants: totalTenants - activeTenants, totalUsers, thisMonthSales };
  }
}
