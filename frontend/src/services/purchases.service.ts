import { api } from '@/lib/api';
import type { Supplier, Purchase } from '@/types/models';

export const purchasesService = {
  async listSuppliers(page = 1, limit = 20, search?: string) {
    const { data } = await api.get('/purchases/suppliers', { params: { page, limit, search } });
    return data.data as { data: Supplier[]; meta: unknown };
  },
  async createSupplier(payload: Partial<Supplier>) {
    const { data } = await api.post('/purchases/suppliers', payload);
    return data.data as Supplier;
  },
  async listPurchases(page = 1, limit = 20) {
    const { data } = await api.get('/purchases', { params: { page, limit } });
    return data.data as { data: Purchase[]; meta: unknown };
  },
  async getPurchase(id: string) {
    const { data } = await api.get(`/purchases/${id}`);
    return data.data as Purchase;
  },
  async createPurchase(payload: {
    supplierId?: string;
    branchId?: string;
    expectedDate?: string;
    notes?: string;
    lines: { productId: string; quantity: number; unitCost: number; discount?: number; taxRate?: number }[];
  }) {
    const { data } = await api.post('/purchases', payload);
    return data.data as Purchase;
  },
  async receivePurchase(id: string) {
    const { data } = await api.post(`/purchases/${id}/receive`);
    return data.data as Purchase;
  },
};
