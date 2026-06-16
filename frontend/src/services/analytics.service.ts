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
  async getCrmAnalytics() {
    const { data } = await api.get('/analytics/crm');
    return data.data as {
      leadFunnel: { stage: string; count: number }[];
      opportunityFunnel: { stage: string; count: number }[];
      kpis: { totalLeads: number; conversionRate: number; totalOpportunities: number; winRate: number; wonValue: number; avgDealSize: number };
      sourceBreakdown: { source: string; count: number }[];
      recentActivities: any[];
    };
  },
  async getBudgetAnalytics() {
    const { data } = await api.get('/analytics/budget');
    return data.data as {
      byPlan: any[];
      summary: { totalPlans: number; activePlans: number; totalBudgeted: number; totalAllocated: number; totalActual: number; overallUtilization: number };
    };
  },
};
