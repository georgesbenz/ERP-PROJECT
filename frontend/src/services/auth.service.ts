import { api } from '@/lib/api';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  companyName: string;
  companySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  currency?: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post('/auth/login', payload);
    return data.data as { accessToken: string; refreshToken: string; user: { id: string; email: string; firstName: string; lastName: string; tenantId: string; roles: string[] } };
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data.data;
  },

  async forgotPassword(email: string) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data.data as { message: string };
  },

  async resetPassword(token: string, newPassword: string) {
    const { data } = await api.post('/auth/reset-password', { token, newPassword });
    return data.data as { message: string };
  },
};
