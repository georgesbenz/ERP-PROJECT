import { api } from '@/lib/api';
import type { TaxCode } from '@/types/models';

export type { TaxCode };

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  isMain: boolean;
  isActive: boolean;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number };
}

export interface UserPermission {
  userId: string;
  permissionId: string;
  permission: Permission;
}

export const settingsService = {
  async getCompany() {
    const { data } = await api.get('/settings/company');
    return data.data;
  },
  async updateCompany(payload: Record<string, unknown>) {
    const { data } = await api.patch('/settings/company', payload);
    return data.data;
  },
  async listBranches() {
    const { data } = await api.get('/settings/branches');
    return data.data as Branch[];
  },
  async createBranch(payload: Partial<Branch>) {
    const { data } = await api.post('/settings/branches', payload);
    return data.data as Branch;
  },
  async updateBranch(id: string, payload: Partial<Branch>) {
    const { data } = await api.patch(`/settings/branches/${id}`, payload);
    return data.data as Branch;
  },
  async deleteBranch(id: string) {
    await api.delete(`/settings/branches/${id}`);
  },
  async listRoles() {
    const { data } = await api.get('/settings/roles');
    return data.data as Role[];
  },
  async createRole(payload: { name: string; description?: string }) {
    const { data } = await api.post('/settings/roles', payload);
    return data.data as Role;
  },
  async updateRole(id: string, payload: { name?: string; description?: string }) {
    const { data } = await api.patch(`/settings/roles/${id}`, payload);
    return data.data as Role;
  },
  async cloneRole(id: string) {
    const { data } = await api.post(`/settings/roles/${id}/clone`);
    return data.data as Role;
  },
  async toggleRole(id: string) {
    const { data } = await api.patch(`/settings/roles/${id}/toggle`);
    return data.data as Role;
  },
  async deleteRole(id: string) {
    await api.delete(`/settings/roles/${id}`);
  },
  async assignPermissions(roleId: string, permissionIds: string[]) {
    const { data } = await api.put(`/settings/roles/${roleId}/permissions`, { permissionIds });
    return data.data as Role;
  },
  async listPermissions() {
    const { data } = await api.get('/settings/permissions');
    return data.data as Permission[];
  },
  async getUserPermissions(userId: string) {
    const { data } = await api.get(`/users/${userId}/permissions`);
    return data.data as UserPermission[];
  },
  async addUserPermission(userId: string, permissionId: string) {
    const { data } = await api.post(`/users/${userId}/permissions`, { permissionId });
    return data.data as UserPermission;
  },
  async removeUserPermission(userId: string, permissionId: string) {
    await api.delete(`/users/${userId}/permissions/${permissionId}`);
  },

  // ── Tax Codes ────────────────────────────────────────────────────────────
  async listTaxes() {
    const { data } = await api.get('/settings/taxes');
    return data.data as TaxCode[];
  },
  async createTax(payload: { name: string; code: string; rate: number; description?: string }) {
    const { data } = await api.post('/settings/taxes', payload);
    return data.data as TaxCode;
  },
  async updateTax(id: string, payload: Partial<{ name: string; code: string; rate: number; description: string; isActive: boolean }>) {
    const { data } = await api.patch(`/settings/taxes/${id}`, payload);
    return data.data as TaxCode;
  },
  async deleteTax(id: string) {
    await api.delete(`/settings/taxes/${id}`);
  },
};
