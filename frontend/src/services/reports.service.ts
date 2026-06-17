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
  async employeeReport(startDate?: string, endDate?: string) {
    const { data } = await api.get('/reports/employees', { params: { startDate, endDate } });
    return data.data as { userId: string; name: string; salesCount: number; revenue: number }[];
  },
  async branchReport(startDate?: string, endDate?: string) {
    const { data } = await api.get('/reports/branches', { params: { startDate, endDate } });
    return data.data as { branchId: string; name: string; salesCount: number; revenue: number }[];
  },
  async taxReport(startDate?: string, endDate?: string) {
    const { data } = await api.get('/reports/tax', { params: { startDate, endDate } });
    return data.data as { taxRate: number; taxableAmount: number; taxAmount: number; invoiceCount: number }[];
  },
  async marginReport(startDate?: string, endDate?: string) {
    const { data } = await api.get('/reports/margin', { params: { startDate, endDate } });
    return data.data as { productId: string; name: string; revenue: number; cost: number; gross: number; marginPct: number }[];
  },
  downloadCsv(type: 'sales' | 'purchases' | 'inventory' | 'customers' | 'expenses', startDate?: string, endDate?: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('erp_auth') : null;
    const auth = token ? JSON.parse(token) : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    const params = new URLSearchParams({ type });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    fetch(`${base}/reports/csv?${params}`, { headers: { Authorization: `Bearer ${auth?.state?.accessToken ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  },
};
