'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotificationsStore } from '@/store/notifications.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { useAuthStore } from '@/store/auth.store';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, setUnreadCount, markRead, markAllRead } = useNotificationsStore();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Poll unread count every 30 s
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

  // Fetch latest notifications when panel opens
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications-panel'],
    queryFn: () => notificationsService.getMyNotifications(1, 15),
    enabled: isOpen && isAuthenticated,
    staleTime: 10_000,
  });

  const notifications: any[] = notifData?.data?.data ?? notifData?.data ?? [];

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: (_d, id) => {
      markRead(id);
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      qc.invalidateQueries({ queryKey: ['notifications-panel'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      markAllRead();
      setUnreadCount(0);
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      qc.invalidateQueries({ queryKey: ['notifications-panel'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>

      <div className="relative" ref={panelRef}>
        {/* Bell button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="relative rounded-lg p-2 text-slate-400 hover:bg-stone-100 hover:text-slate-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">
                Notifications {unreadCount > 0 && <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">{unreadCount}</span>}
              </span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-stone-100 hover:text-slate-700 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-400">Chargement…</div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">Aucune notification</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      n.isRead ? 'bg-white' : 'bg-blue-50/50',
                    )}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        n.isRead ? 'bg-stone-200' : 'bg-blue-500',
                      )} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm', n.isRead ? 'text-slate-600' : 'font-medium text-slate-800')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{n.body}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>

                    {/* Mark as read */}
                    {!n.isRead && (
                      <button
                        onClick={() => markOneMutation.mutate(n.id)}
                        disabled={markOneMutation.isPending}
                        className="mt-1 flex-shrink-0 rounded p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-stone-100 px-4 py-2.5 text-center">
                <span className="text-xs text-slate-400">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
