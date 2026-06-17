import { api } from '@/lib/api';

export const stockService = {
  getStockSummary: async () => {
    const { data } = await api.get('/stock/summary');
    return data.data;
  },
  getStockLevels: async (params?: any) => {
    const { data } = await api.get('/stock/levels', { params });
    return data.data;
  },
  getProductStock: async (id: string) => {
    const { data } = await api.get(`/stock/levels/${id}`);
    return data.data;
  },
  getMovements: async (params?: any) => {
    const { data } = await api.get('/stock/movements', { params });
    return data.data;
  },
  getAdjustments: async (params?: any) => {
    const { data } = await api.get('/stock/adjustments', { params });
    return data.data;
  },
  createAdjustment: async (body: any) => {
    const { data } = await api.post('/stock/adjustments', body);
    return data.data;
  },
  submitAdjustment: async (id: string) => {
    const { data } = await api.post(`/stock/adjustments/${id}/submit`);
    return data.data;
  },
  approveAdjustment: async (id: string, body: any) => {
    const { data } = await api.post(`/stock/adjustments/${id}/approve`, body);
    return data.data;
  },
  applyAdjustment: async (id: string) => {
    const { data } = await api.post(`/stock/adjustments/${id}/apply`);
    return data.data;
  },
  getTransfers: async (params?: any) => {
    const { data } = await api.get('/stock/transfers', { params });
    return data.data;
  },
  createTransfer: async (body: any) => {
    const { data } = await api.post('/stock/transfers', body);
    return data.data;
  },
  sendTransfer: async (id: string) => {
    const { data } = await api.post(`/stock/transfers/${id}/send`);
    return data.data;
  },
  receiveTransfer: async (id: string, body: any) => {
    const { data } = await api.post(`/stock/transfers/${id}/receive`, body);
    return data.data;
  },
  cancelTransfer: async (id: string) => {
    const { data } = await api.post(`/stock/transfers/${id}/cancel`);
    return data.data;
  },
  getLowStockAlerts: async () => {
    const { data } = await api.get('/stock/alerts/low-stock');
    return data.data;
  },
  getExpiryAlerts: async (daysAhead = 30) => {
    const { data } = await api.get('/stock/alerts/expiry', { params: { daysAhead } });
    return data.data;
  },
  getBatches: async (params?: any) => {
    const { data } = await api.get('/stock/batches', { params });
    return data.data;
  },
  getSerials: async (params?: any) => {
    const { data } = await api.get('/stock/serials', { params });
    return data.data;
  },
  listCycleCounts: async () => {
    const { data } = await api.get('/stock/counts');
    return data.data as CycleCount[];
  },
  createCycleCount: async (warehouseId?: string) => {
    const { data } = await api.post('/stock/counts', { warehouseId });
    return data.data as CycleCount;
  },
  getCycleCount: async (id: string) => {
    const { data } = await api.get(`/stock/counts/${id}`);
    return data.data as CycleCount;
  },
  updateCycleCountLine: async (countId: string, lineId: string, countedQty: number) => {
    const { data } = await api.patch(`/stock/counts/${countId}/lines/${lineId}`, { countedQty });
    return data.data;
  },
  completeCycleCount: async (countId: string) => {
    const { data } = await api.patch(`/stock/counts/${countId}/complete`);
    return data.data as CycleCount;
  },
  getReorderSuggestions: async () => {
    const { data } = await api.get('/stock/reorder-suggestions');
    return data.data as ReorderSuggestion[];
  },
};

export interface CycleCountLine {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku?: string };
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
}

export interface CycleCount {
  id: string;
  reference: string;
  status: string;
  warehouseId?: string;
  warehouse?: { name: string };
  createdAt: string;
  lines?: CycleCountLine[];
  _count?: { lines: number };
}

export interface ReorderSuggestion {
  productId: string;
  name: string;
  sku?: string;
  currentQty: number;
  minStock: number;
  suggestedOrderQty: number;
  avgDailyUsage: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  estimatedCost?: number;
}
