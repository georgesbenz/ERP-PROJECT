import { api } from '@/lib/api';

export const notificationsService = {
  async getMyNotifications(page = 1, limit = 20) {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data;
  },
  async getUnreadCount(): Promise<number> {
    const { data } = await api.get('/notifications/unread-count');
    return data.data.count;
  },
  async markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await api.patch('/notifications/read-all');
  },
};
