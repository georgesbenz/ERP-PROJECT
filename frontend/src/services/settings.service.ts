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

export interface CompanyInfo {
  id: string;
  name: string;
  tradingName?: string;
  slogan?: string;
  industry?: string;
  dateEstablished?: string;
  businessDescription?: string;
  website?: string;
  logoUrl?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  address?: string;
  physicalAddress?: string;
  postalAddress?: string;
  city?: string;
  district?: string;
  subdivision?: string;
  division?: string;
  region?: string;
  country?: string;
  gpsCoordinates?: string;
  rccm?: string;
  niu?: string;
  taxId?: string;
  cnps?: string;
  patent?: string;
  statisticalNumber?: string;
  shareCapital?: number;
  legalForm?: string;
  vatEnabled: boolean;
  vatNumber?: string;
  taxRegime?: string;
  taxOffice?: string;
  ohadaEnabled: boolean;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  accountingMethod: string;
  currency: string;
  locale: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  decimalPrecision: number;
  multiBranch: boolean;
  multiWarehouse: boolean;
  multiCurrency: boolean;
  receiptSize: string;
  autoPrint: boolean;
  maxDiscountPct: number;
  mandatoryCashOpen: boolean;
  mandatoryCashClose: boolean;
  returnPolicyDays: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  defaultValuationMethod: string;
}

export interface CompanyBankAccount {
  id: string;
  tenantId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  swift?: string;
  branch?: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyRepresentative {
  id: string;
  tenantId: string;
  name: string;
  title?: string;
  role?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyDocument {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  fileUrl?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyDocumentSequence {
  id: string;
  tenantId: string;
  docType: string;
  prefix: string;
  nextNumber: number;
  padding: number;
}

export interface CompanySocialMedia {
  id: string;
  tenantId: string;
  platform: string;
  url: string;
  isActive: boolean;
}

export const settingsService = {
  // ── Company ────────────────────────────────────────────────────────────────
  async getCompany(): Promise<CompanyInfo> {
    const { data } = await api.get('/settings/company');
    return data.data;
  },
  async updateCompany(payload: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const { data } = await api.patch('/settings/company', payload);
    return data.data;
  },

  // ── Bank Accounts ──────────────────────────────────────────────────────────
  async listBankAccounts(): Promise<CompanyBankAccount[]> {
    const { data } = await api.get('/settings/bank-accounts');
    return data.data;
  },
  async createBankAccount(payload: Omit<CompanyBankAccount, 'id' | 'tenantId' | 'createdAt'>): Promise<CompanyBankAccount> {
    const { data } = await api.post('/settings/bank-accounts', payload);
    return data.data;
  },
  async updateBankAccount(id: string, payload: Partial<CompanyBankAccount>): Promise<CompanyBankAccount> {
    const { data } = await api.patch(`/settings/bank-accounts/${id}`, payload);
    return data.data;
  },
  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/settings/bank-accounts/${id}`);
  },

  // ── Representatives ────────────────────────────────────────────────────────
  async listRepresentatives(): Promise<CompanyRepresentative[]> {
    const { data } = await api.get('/settings/representatives');
    return data.data;
  },
  async createRepresentative(payload: Omit<CompanyRepresentative, 'id' | 'tenantId' | 'createdAt' | 'isActive'>): Promise<CompanyRepresentative> {
    const { data } = await api.post('/settings/representatives', payload);
    return data.data;
  },
  async updateRepresentative(id: string, payload: Partial<CompanyRepresentative>): Promise<CompanyRepresentative> {
    const { data } = await api.patch(`/settings/representatives/${id}`, payload);
    return data.data;
  },
  async deleteRepresentative(id: string): Promise<void> {
    await api.delete(`/settings/representatives/${id}`);
  },

  // ── Documents ──────────────────────────────────────────────────────────────
  async listDocuments(): Promise<CompanyDocument[]> {
    const { data } = await api.get('/settings/documents');
    return data.data;
  },
  async createDocument(payload: Omit<CompanyDocument, 'id' | 'tenantId' | 'createdAt' | 'isActive'>): Promise<CompanyDocument> {
    const { data } = await api.post('/settings/documents', payload);
    return data.data;
  },
  async updateDocument(id: string, payload: Partial<CompanyDocument>): Promise<CompanyDocument> {
    const { data } = await api.patch(`/settings/documents/${id}`, payload);
    return data.data;
  },
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/settings/documents/${id}`);
  },

  // ── Document Sequences ─────────────────────────────────────────────────────
  async listDocumentSequences(): Promise<CompanyDocumentSequence[]> {
    const { data } = await api.get('/settings/document-sequences');
    return data.data;
  },
  async upsertDocumentSequence(payload: Omit<CompanyDocumentSequence, 'id' | 'tenantId'>): Promise<CompanyDocumentSequence> {
    const { data } = await api.put('/settings/document-sequences', payload);
    return data.data;
  },

  // ── Social Media ───────────────────────────────────────────────────────────
  async listSocialMedia(): Promise<CompanySocialMedia[]> {
    const { data } = await api.get('/settings/social-media');
    return data.data;
  },
  async upsertSocialMedia(payload: Omit<CompanySocialMedia, 'id' | 'tenantId'>): Promise<CompanySocialMedia> {
    const { data } = await api.put('/settings/social-media', payload);
    return data.data;
  },
  async deleteSocialMedia(id: string): Promise<void> {
    await api.delete(`/settings/social-media/${id}`);
  },

  // ── Branches ───────────────────────────────────────────────────────────────
  async listBranches(): Promise<Branch[]> {
    const { data } = await api.get('/settings/branches');
    return data.data;
  },
  async createBranch(payload: Partial<Branch>): Promise<Branch> {
    const { data } = await api.post('/settings/branches', payload);
    return data.data;
  },
  async updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
    const { data } = await api.patch(`/settings/branches/${id}`, payload);
    return data.data;
  },
  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/settings/branches/${id}`);
  },

  // ── Roles ──────────────────────────────────────────────────────────────────
  async listRoles(): Promise<Role[]> {
    const { data } = await api.get('/settings/roles');
    return data.data;
  },
  async createRole(payload: { name: string; description?: string }): Promise<Role> {
    const { data } = await api.post('/settings/roles', payload);
    return data.data;
  },
  async updateRole(id: string, payload: { name?: string; description?: string }): Promise<Role> {
    const { data } = await api.patch(`/settings/roles/${id}`, payload);
    return data.data;
  },
  async cloneRole(id: string): Promise<Role> {
    const { data } = await api.post(`/settings/roles/${id}/clone`);
    return data.data;
  },
  async toggleRole(id: string): Promise<Role> {
    const { data } = await api.patch(`/settings/roles/${id}/toggle`);
    return data.data;
  },
  async deleteRole(id: string): Promise<void> {
    await api.delete(`/settings/roles/${id}`);
  },
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const { data } = await api.put(`/settings/roles/${roleId}/permissions`, { permissionIds });
    return data.data;
  },
  async listPermissions(): Promise<Permission[]> {
    const { data } = await api.get('/settings/permissions');
    return data.data;
  },
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const { data } = await api.get(`/users/${userId}/permissions`);
    return data.data;
  },
  async addUserPermission(userId: string, permissionId: string): Promise<UserPermission> {
    const { data } = await api.post(`/users/${userId}/permissions`, { permissionId });
    return data.data;
  },
  async removeUserPermission(userId: string, permissionId: string): Promise<void> {
    await api.delete(`/users/${userId}/permissions/${permissionId}`);
  },

  // ── Tax Codes ──────────────────────────────────────────────────────────────
  async listTaxes(): Promise<TaxCode[]> {
    const { data } = await api.get('/settings/taxes');
    return data.data;
  },
  async createTax(payload: { name: string; code: string; rate: number; description?: string }): Promise<TaxCode> {
    const { data } = await api.post('/settings/taxes', payload);
    return data.data;
  },
  async updateTax(id: string, payload: Partial<{ name: string; code: string; rate: number; description: string; isActive: boolean }>): Promise<TaxCode> {
    const { data } = await api.patch(`/settings/taxes/${id}`, payload);
    return data.data;
  },
  async deleteTax(id: string): Promise<void> {
    await api.delete(`/settings/taxes/${id}`);
  },
};
