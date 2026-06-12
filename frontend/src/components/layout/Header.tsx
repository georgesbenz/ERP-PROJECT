'use client';

import { Bell } from 'lucide-react';
import { useNotificationsStore } from '@/store/notifications.store';
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { useAuthStore } from '@/store/auth.store';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationsStore();

  useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
      return count;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
