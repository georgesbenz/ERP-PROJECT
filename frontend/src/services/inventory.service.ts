import { api } from '@/lib/api';
import type { Product, Category, Warehouse, StockLevel, StockMovement } from '@/types/models';

export const inventoryService = {
  async listProducts(page = 1, limit = 20, search?: string) {
    const { data } = await api.get('/inventory/products', { params: { page, limit, search } });
    return data.data as { data: Product[]; meta: unknown };
  },
  async getProduct(id: string) {
    const { data } = await api.get(`/inventory/products/${id}`);
    return data.data as Product;
  },
  async createProduct(payload: Partial<Product>) {
    const { data } = await api.post('/inventory/products', payload);
    return data.data as Product;
  },
  async updateProduct(id: string, payload: Partial<Product>) {
    const { data } = await api.patch(`/inventory/products/${id}`, payload);
    return data.data as Product;
  },
  async deleteProduct(id: string) {
    await api.delete(`/inventory/products/${id}`);
  },
  async listFamilies() {
    const { data } = await api.get('/inventory/families');
    return data.data as { id: string; name: string; code: string; description?: string }[];
  },
  async createFamily(payload: { name: string; code: string; description?: string }) {
    const { data } = await api.post('/inventory/families', payload);
    return data.data;
  },
  async listPriceCategories() {
    const { data } = await api.get('/inventory/price-categories');
    return data.data as { id: string; name: string; code: string; description?: string }[];
  },
  async createPriceCategory(payload: { name: string; code: string; description?: string }) {
    const { data } = await api.post('/inventory/price-categories', payload);
    return data.data;
  },
  async updatePriceCategory(id: string, payload: Partial<{ name: string; code: string; description: string; isActive: boolean }>) {
    const { data } = await api.patch(`/inventory/price-categories/${id}`, payload);
    return data.data;
  },
  async listCategories() {
    const { data } = await api.get('/inventory/categories');
    return data.data as Category[];
  },
  async listWarehouses() {
    const { data } = await api.get('/inventory/warehouses');
    return data.data as Warehouse[];
  },
  async getStockLevels(page = 1, limit = 20) {
    const { data } = await api.get('/inventory/stock', { params: { page, limit } });
    return data.data as { data: StockLevel[]; meta: unknown };
  },
  async listMovements(params: {
    page?: number;
    limit?: number;
    productId?: string;
    warehouseId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { data } = await api.get('/inventory/movements', { params });
    return data.data as { data: StockMovement[]; meta: import('@/lib/api').PaginationMeta };
  },
  async recordMovement(payload: {
    productId: string;
    warehouseId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
    quantity: number;
    unitCost?: number;
    reference?: string;
    notes?: string;
  }) {
    const { data } = await api.post('/inventory/movements', payload);
    return data.data;
  },
};
