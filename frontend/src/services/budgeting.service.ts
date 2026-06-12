import { api } from '@/lib/api';
import type { BudgetPlan, Department } from '@/types/models';

export const budgetingService = {
  async listPlans(page = 1, limit = 20) {
    const { data } = await api.get('/budgeting/plans', { params: { page, limit } });
    return data.data as { data: BudgetPlan[]; meta: unknown };
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
    const { data } = await api.post(`/budgeting/plans/${id}/submit`);
    return data.data;
  },
  async approvePlan(id: string, comments?: string) {
    const { data } = await api.post(`/budgeting/plans/${id}/approve`, { comments });
    return data.data;
  },
  async listDepartments() {
    const { data } = await api.get('/budgeting/departments');
    return data.data as Department[];
  },
  async listCategories() {
    const { data } = await api.get('/budgeting/categories');
    return data.data;
  },
};
