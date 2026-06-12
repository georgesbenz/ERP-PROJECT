import { api } from '@/lib/api';
import type { Lead, Opportunity, Pipeline } from '@/types/models';

export const crmService = {
  async listLeads(page = 1, limit = 20, search?: string) {
    const { data } = await api.get('/crm/leads', { params: { page, limit, search } });
    return data.data as { data: Lead[]; meta: unknown };
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
  async convertLead(id: string) {
    const { data } = await api.post(`/crm/leads/${id}/convert`);
    return data.data;
  },
  async listOpportunities(page = 1, limit = 20) {
    const { data } = await api.get('/crm/opportunities', { params: { page, limit } });
    return data.data as { data: Opportunity[]; meta: unknown };
  },
  async createOpportunity(payload: Partial<Opportunity>) {
    const { data } = await api.post('/crm/opportunities', payload);
    return data.data as Opportunity;
  },
  async updateOpportunity(id: string, payload: Partial<Opportunity>) {
    const { data } = await api.patch(`/crm/opportunities/${id}`, payload);
    return data.data as Opportunity;
  },
  async listPipelines() {
    const { data } = await api.get('/crm/pipelines');
    return data.data as Pipeline[];
  },
};
