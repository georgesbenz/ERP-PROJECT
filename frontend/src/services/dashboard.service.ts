import { api } from '@/lib/api';
import type { DashboardOverview } from '@/types/models';

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const { data } = await api.get('/dashboard/overview');
    return data.data;
  },
  async getRecentActivity() {
    const { data } = await api.get('/dashboard/recent-activity');
    return data.data;
  },
  async getAuditLog() {
    const { data } = await api.get('/dashboard/audit-log');
    return data.data;
  },
  async getTopProducts() {
    const { data } = await api.get('/dashboard/top-products');
    return data.data as { product: { id: string; name: string; sku: string }; quantity: number; revenue: number; transactions: number }[];
  },
  async getCashSummary() {
    const { data } = await api.get('/dashboard/cash-summary');
    return data.data as {
      openSession: { id: string; status: string; openingBalance: number; openedAt: string; openedByUser?: { firstName: string; lastName: string }; branch?: { name: string } } | null;
      today: { cashIn: number; cashOut: number; net: number };
      recentSessions: { id: string; status: string; openingBalance: number; closingBalance?: number; difference?: number; cashIn: number; openedAt: string; closedAt?: string }[];
    };
  },
};
