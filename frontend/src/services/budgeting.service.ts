import { api } from '@/lib/api';
import type { BudgetPlan, Department } from '@/types/models';

export const budgetingService = {
  // ── Plans ────────────────────────────────────────────────────────────────
  async listPlans(page = 1, limit = 20) {
    const { data } = await api.get('/budgeting/plans', { params: { page, limit } });
    return data.data as { data: BudgetPlan[]; meta: any };
  },
  async getPlan(id: string) {
    const { data } = await api.get(`/budgeting/plans/${id}`);
    return data.data as BudgetPlan;
  },
  async createPlan(payload: {
    name: string;
    fiscalYear: number;
    startDate: string;
    endDate: string;
    totalAmount: number;
    departmentId?: string;
    notes?: string;
  }) {
    const { data } = await api.post('/budgeting/plans', payload);
    return data.data as BudgetPlan;
  },
  async submitForApproval(id: string) {
    const { data } = await api.patch(`/budgeting/plans/${id}/submit`);
    return data.data;
  },
  async approvePlan(id: string, comments?: string) {
    const { data } = await api.patch(`/budgeting/plans/${id}/approve`, { comments });
    return data.data;
  },
  async rejectPlan(id: string, reason?: string) {
    const { data } = await api.patch(`/budgeting/plans/${id}/reject`, { reason });
    return data.data;
  },

  // ── Allocations ──────────────────────────────────────────────────────────
  async listAllocations(planId: string) {
    const { data } = await api.get(`/budgeting/plans/${planId}/allocations`);
    return data.data as any[];
  },
  async createAllocation(planId: string, payload: { categoryId: string; period: string; allocated: number; notes?: string }) {
    const { data } = await api.post(`/budgeting/plans/${planId}/allocations`, payload);
    return data.data;
  },
  async deleteAllocation(planId: string, id: string) {
    await api.delete(`/budgeting/plans/${planId}/allocations/${id}`);
  },

  // ── Variance ─────────────────────────────────────────────────────────────
  async getVariance(planId: string) {
    const { data } = await api.get(`/budgeting/plans/${planId}/variance`);
    return data.data as {
      plan: any;
      allocations: any[];
      summary: { totalAllocated: number; totalActual: number; totalVariance: number; utilizationPct: number; salesRevenue: number; purchaseCost: number };
    };
  },

  // ── Lookups ──────────────────────────────────────────────────────────────
  async listDepartments() {
    const { data } = await api.get('/budgeting/departments');
    return data.data as Department[];
  },
  async listCategories() {
    const { data } = await api.get('/budgeting/categories');
    return data.data;
  },
};
