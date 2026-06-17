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
  async getCustomerHistory(customerId: string) {
    const { data } = await api.get(`/sales/customers/${customerId}/history`);
    return data.data as {
      customer: Customer;
      totalOrders: number;
      totalSpent: number;
      sales: (Sale & { lines: { product: { name: string; sku: string } }[] })[];
    };
  },
  downloadInvoicePdf(id: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('erp_auth') : null;
    const auth = token ? JSON.parse(token) : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    const url = `${base}/sales/${id}/invoice.pdf`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `FACTURE-${id}.pdf`);
    // Pass token via URL not ideal; use fetch+blob for auth headers
    fetch(url, { headers: { Authorization: `Bearer ${auth?.state?.accessToken ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  },
  downloadReceiptPdf(id: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('erp_auth') : null;
    const auth = token ? JSON.parse(token) : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    fetch(`${base}/sales/${id}/receipt.pdf`, { headers: { Authorization: `Bearer ${auth?.state?.accessToken ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `RECU-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  },
};
