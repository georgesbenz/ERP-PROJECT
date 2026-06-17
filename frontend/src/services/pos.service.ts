import { api } from '@/lib/api';

export interface PosItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  description?: string;
}

export interface PosPayment {
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE' | 'CREDIT';
  amount: number;
}

export interface PosCheckoutPayload {
  items: PosItem[];
  payments: PosPayment[];
  customerId?: string;
  branchId?: string;
  warehouseId?: string;
  notes?: string;
  loyaltyPointsRedeem?: number;
}

export const posService = {
  async getProducts(search?: string) {
    const { data } = await api.get('/pos/products', { params: { search } });
    return data as { data: import('@/types/models').Product[] };
  },
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
  payments?: { method: string; amount: number }[];
  customer: string;
  loyaltyDiscount?: number;
  loyaltyPointsEarned?: number;
}
