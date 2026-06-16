import { api } from '@/lib/api';

export const expensesService = {
  // ─── Categories ─────────────────────────────────────────────────────────────
  async listCategories() {
    const { data } = await api.get('/expenses/categories');
    return data.data as { id: string; name: string; code: string; description?: string; isActive: boolean }[];
  },
  async createCategory(payload: { name: string; code: string; description?: string }) {
    const { data } = await api.post('/expenses/categories', payload);
    return data.data;
  },
  async updateCategory(id: string, payload: Partial<{ name: string; code: string; description: string; isActive: boolean }>) {
    const { data } = await api.patch(`/expenses/categories/${id}`, payload);
    return data.data;
  },
  async deleteCategory(id: string) {
    await api.delete(`/expenses/categories/${id}`);
  },

  // ─── Expenses ────────────────────────────────────────────────────────────────
  async listExpenses(page = 1, limit = 20, search?: string, categoryId?: string, status?: string) {
    const { data } = await api.get('/expenses', { params: { page, limit, search, categoryId, status } });
    return data.data as { data: ExpenseEntry[]; meta: PaginationMeta };
  },
  async getExpense(id: string) {
    const { data } = await api.get(`/expenses/${id}`);
    return data.data as ExpenseEntry;
  },
  async createExpense(payload: CreateExpensePayload) {
    const { data } = await api.post('/expenses', payload);
    return data.data as ExpenseEntry;
  },
  async approveExpense(id: string, payload: { status?: 'APPROVED' | 'REJECTED'; notes?: string }) {
    const { data } = await api.patch(`/expenses/${id}/approve`, payload);
    return data.data;
  },
  async deleteExpense(id: string) {
    await api.delete(`/expenses/${id}`);
  },

  // ─── Reports ─────────────────────────────────────────────────────────────────
  async getReport(from?: string, to?: string) {
    const { data } = await api.get('/expenses/report', { params: { from, to } });
    return data.data as ExpenseReport;
  },
};

// ─── Cash Sessions ────────────────────────────────────────────────────────────
export const cashSessionService = {
  async listSessions() {
    const { data } = await api.get('/pos/cash-sessions');
    return data.data as CashSession[];
  },
  async openSession(payload: { openingBalance: number; branchId?: string; notes?: string }) {
    const { data } = await api.post('/pos/cash-sessions', payload);
    return data.data as CashSession;
  },
  async closeSession(id: string, payload: { closingBalance: number; notes?: string }) {
    const { data } = await api.patch(`/pos/cash-sessions/${id}/close`, payload);
    return data.data as CashSession;
  },
  async reconcileSession(id: string) {
    const { data } = await api.patch(`/pos/cash-sessions/${id}/reconcile`, {});
    return data.data as CashSession;
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ExpenseEntry {
  id: string;
  reference: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  expenseDate: string;
  paymentMethod: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  notes?: string;
  category: { id: string; name: string; code: string };
  branch?: { id: string; name: string };
  supplier?: { id: string; name: string };
  creator: { id: string; firstName: string; lastName: string };
  approver?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateExpensePayload {
  categoryId: string;
  branchId?: string;
  supplierId?: string;
  description: string;
  amount: number;
  taxAmount?: number;
  expenseDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ExpenseReport {
  period: { from: string | null; to: string | null };
  totals: { count: number; amount: number; taxAmount: number; totalAmount: number };
  byCategory: { category: { id: string; name: string; code: string }; count: number; totalAmount: number }[];
  byStatus: { status: string; count: number; totalAmount: number }[];
}

export interface CashSession {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  cashIn: number;
  cashOut: number;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  openedByUser?: { firstName: string; lastName: string };
  closedByUser?: { firstName: string; lastName: string };
  branch?: { name: string };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
