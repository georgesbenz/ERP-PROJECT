import { api } from '@/lib/api';

export type ReportType =
  | 'sales_by_period'
  | 'inventory_valuation'
  | 'customer_aging'
  | 'purchases_by_period'
  | 'profit_loss';

export type ReportGroupBy = 'day' | 'week' | 'month';

export interface ReportQuery {
  type: ReportType;
  startDate?: string;
  endDate?: string;
  groupBy?: ReportGroupBy;
}

export const reportsService = {
  async generate(query: ReportQuery) {
    const { data } = await api.get('/reports', { params: query });
    return data.data;
  },
};
