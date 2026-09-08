'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import type { AxiosInstance } from 'axios';
import { InboxNotification } from '@/lib/types';

interface NotificationBellProps {
  apiClient: AxiosInstance;
  accessToken: string | null;
  /** 'dark' — для тёмной шапки админки, 'light' — для светлой шапки ЛК заявителя. */
  variant?: 'light' | 'dark';
}

export function NotificationBell({ apiClient, accessToken, variant = 'light' }: NotificationBellProps) {
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<{ items: InboxNotification[]; unreadCount: number }>('/notifications')
      .then((res) => {
        setItems(res.data.items);
        setUnreadCount(res.data.unreadCount);
      })
      .catch(() => {});
  }, [accessToken, apiClient]);

  useEffect(() => {
    if (!accessToken) return;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${base}/notifications`, { auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('notification', (payload: { notification: InboxNotification; unreadCount: number }) => {
      setItems((prev) => [payload.notification, ...prev].slice(0, 30));
      setUnreadCount(payload.unreadCount);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const openItem = (n: InboxNotification) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      apiClient.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    apiClient.post('/notifications/read-all').catch(() => {});
  };

  if (!accessToken) return null;

  const hoverBg = variant === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5';

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Уведомления"
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${hoverBg}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[10px] leading-[16px] text-center font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-border rounded-card shadow-card z-30 text-ink">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium">Уведомления</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">
                прочитать всё
              </button>
            )}
          </div>

          {items.length === 0 && <p className="text-sm text-ink-soft px-3 py-4">Уведомлений пока нет.</p>}

          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openItem(n)}
              className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-paper-dark transition-colors ${
                n.read ? '' : 'bg-primary/5'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                <span className="truncate">{n.title}</span>
              </div>
              <div className="text-xs text-ink-soft mt-0.5 line-clamp-2">{n.body}</div>
              <div className="text-[10px] text-ink-soft mt-1">{new Date(n.createdAt).toLocaleString('ru-RU')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
