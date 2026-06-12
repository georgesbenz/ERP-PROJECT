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
};
