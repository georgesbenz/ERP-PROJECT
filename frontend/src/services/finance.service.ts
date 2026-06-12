import { api } from '@/lib/api';
import type { Invoice, Payment, Account } from '@/types/models';

export const financeService = {
  async listAccounts() {
    const { data } = await api.get('/finance/accounts');
    return data.data as Account[];
  },
  async listInvoices(page = 1, limit = 20) {
    const { data } = await api.get('/finance/invoices', { params: { page, limit } });
    return data.data as { data: Invoice[]; meta: unknown };
  },
  async getInvoice(id: string) {
    const { data } = await api.get(`/finance/invoices/${id}`);
    return data.data as Invoice;
  },
  async listPayments(page = 1, limit = 20) {
    const { data } = await api.get('/finance/payments', { params: { page, limit } });
    return data.data as { data: Payment[]; meta: unknown };
  },
  async createPayment(payload: {
    method: string;
    amount: number;
    currency?: string;
    saleId?: string;
    purchaseId?: string;
    invoiceId?: string;
    notes?: string;
  }) {
    const { data } = await api.post('/finance/payments', payload);
    return data.data as Payment;
  },
  async listTaxes() {
    const { data } = await api.get('/finance/taxes');
    return data.data;
  },
  async listJournalEntries(page = 1, limit = 20) {
    const { data } = await api.get('/finance/journal-entries', { params: { page, limit } });
    return data.data as { data: unknown[]; meta: unknown };
  },
};
