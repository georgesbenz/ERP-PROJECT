import { api } from '@/lib/api';
import type { Lead, Opportunity, Pipeline } from '@/types/models';

export const crmService = {
  // ── Leads ────────────────────────────────────────────────────────────────
  async listLeads(page = 1, limit = 20, search?: string) {
    const { data } = await api.get('/crm/leads', { params: { page, limit, search } });
    return data.data as { data: Lead[]; meta: any };
  },
  async getLead(id: string) {
    const { data } = await api.get(`/crm/leads/${id}`);
    return data.data as Lead;
  },
  async createLead(payload: Partial<Lead>) {
    const { data } = await api.post('/crm/leads', payload);
    return data.data as Lead;
  },
  async updateLead(id: string, payload: Partial<Lead>) {
    const { data } = await api.patch(`/crm/leads/${id}`, payload);
    return data.data as Lead;
  },
  async deleteLead(id: string) {
    await api.delete(`/crm/leads/${id}`);
  },
  async convertLead(id: string) {
    const { data } = await api.post(`/crm/leads/${id}/convert`);
    return data.data;
  },

  // ── Opportunities ────────────────────────────────────────────────────────
  async listOpportunities(page = 1, limit = 50) {
    const { data } = await api.get('/crm/opportunities', { params: { page, limit } });
    return data.data as { data: Opportunity[]; meta: any };
  },
  async createOpportunity(payload: Partial<Opportunity>) {
    const { data } = await api.post('/crm/opportunities', payload);
    return data.data as Opportunity;
  },
  async updateOpportunity(id: string, payload: Partial<Opportunity>) {
    const { data } = await api.patch(`/crm/opportunities/${id}`, payload);
    return data.data as Opportunity;
  },
  async moveOpportunityStage(id: string, stageId: string) {
    const { data } = await api.patch(`/crm/opportunities/${id}/stage`, { stageId });
    return data.data as Opportunity;
  },

  // ── Pipelines ────────────────────────────────────────────────────────────
  async listPipelines() {
    const { data } = await api.get('/crm/pipelines');
    return data.data as Pipeline[];
  },

  // ── Activities ───────────────────────────────────────────────────────────
  async listActivities(params?: { page?: number; limit?: number; leadId?: string; opportunityId?: string }) {
    const { data } = await api.get('/crm/activities', { params: { page: 1, limit: 20, ...params } });
    return data.data as { data: any[]; meta: any };
  },
  async createActivity(payload: {
    type: string;
    subject: string;
    description?: string;
    leadId?: string;
    opportunityId?: string;
    customerId?: string;
    dueDate?: string;
  }) {
    const { data } = await api.post('/crm/activities', payload);
    return data.data;
  },
  async completeActivity(id: string) {
    const { data } = await api.patch(`/crm/activities/${id}/complete`);
    return data.data;
  },
  async deleteActivity(id: string) {
    await api.delete(`/crm/activities/${id}`);
  },

  // ── Campaigns ────────────────────────────────────────────────────────────
  async listCampaigns(page = 1, limit = 20) {
    const { data } = await api.get('/crm/campaigns', { params: { page, limit } });
    return data.data as { data: any[]; meta: any };
  },
  async createCampaign(payload: {
    name: string;
    type: string;
    subject?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
  }) {
    const { data } = await api.post('/crm/campaigns', payload);
    return data.data;
  },
  async launchCampaign(id: string) {
    const { data } = await api.patch(`/crm/campaigns/${id}/launch`);
    return data.data;
  },

  // ── Metrics ──────────────────────────────────────────────────────────────
  async getMetrics() {
    const { data } = await api.get('/crm/metrics');
    return data.data as {
      leadFunnel: Record<string, number>;
      opportunities: { total: number; open: number; won: number; lost: number; winRate: number; totalValue: number; wonValue: number };
      activitiesToday: number;
    };
  },
};
