import { api } from '@/lib/api';

export const analyticsService = {
  async getFinancialSummary(period?: string) {
    const { data } = await api.get('/analytics/financial', { params: { period } });
    return data.data;
  },
  async getRevenueSummary() {
    const { data } = await api.get('/analytics/revenue');
    return data.data;
  },
  async getExpenseSummary() {
    const { data } = await api.get('/analytics/expenses');
    return data.data;
  },
  async getCashFlowForecast() {
    const { data } = await api.get('/analytics/cash-flow');
    return data.data;
  },
  async getKpis() {
    const { data } = await api.get('/analytics/kpis');
    return data.data;
  },
  async getSalesSummary() {
    const { data } = await api.get('/analytics/sales-summary');
    return data.data;
  },
  async getInventorySummary() {
    const { data } = await api.get('/analytics/inventory-summary');
    return data.data;
  },
};
