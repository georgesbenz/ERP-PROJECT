import { api } from '@/lib/api';

export interface PosItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  description?: string;
}

export interface PosCheckoutPayload {
  items: PosItem[];
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE' | 'CREDIT';
  paymentAmount: number;
  customerId?: string;
  branchId?: string;
  warehouseId?: string;
  notes?: string;
}

export const posService = {
  async checkout(payload: PosCheckoutPayload) {
    const { data } = await api.post('/pos/checkout', payload);
    return data.data as { sale: unknown; receipt: PosReceipt };
  },
  async getSession() {
    const { data } = await api.get('/pos/session');
    return data.data as { salesToday: number; revenueToday: number | string };
  },
};

export interface PosReceipt {
  reference: string;
  date: string;
  items: { name: string; sku?: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  customer: string;
}
