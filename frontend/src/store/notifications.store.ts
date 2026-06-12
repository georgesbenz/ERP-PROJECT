import { create } from 'zustand';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  prependNotification: (n: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),

  prependNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
