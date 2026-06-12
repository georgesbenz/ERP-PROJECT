import { api } from '@/lib/api';
import type { Customer, Sale } from '@/types/models';

export const salesService = {
  async listCustomers(page = 1, limit = 20, search?: string) {
    const { data } = await api.get('/sales/customers', { params: { page, limit, search } });
    return data.data as { data: Customer[]; meta: unknown };
  },
  async createCustomer(payload: Partial<Customer>) {
    const { data } = await api.post('/sales/customers', payload);
    return data.data as Customer;
  },
  async listSales(page = 1, limit = 20) {
    const { data } = await api.get('/sales', { params: { page, limit } });
    return data.data as { data: Sale[]; meta: unknown };
  },
  async getSale(id: string) {
    const { data } = await api.get(`/sales/${id}`);
    return data.data as Sale;
  },
  async createSale(payload: {
    customerId?: string;
    branchId?: string;
    dueDate?: string;
    notes?: string;
    lines: { productId: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number; description?: string }[];
  }) {
    const { data } = await api.post('/sales', payload);
    return data.data as Sale;
  },
  async confirmSale(id: string) {
    const { data } = await api.post(`/sales/${id}/confirm`);
    return data.data as Sale;
  },
  async cancelSale(id: string) {
    const { data } = await api.post(`/sales/${id}/cancel`);
    return data.data as Sale;
  },
};
