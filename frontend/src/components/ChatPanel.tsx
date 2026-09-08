'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button, Card, Textarea } from '@/components/ui';
import { ChatMessage } from '@/lib/types';

export function ChatPanel({ applicationId }: { applicationId: string }) {
  const userId = useAuthStore((s) => s.userId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<ChatMessage[]>(`/applications/${applicationId}/chat`).then((res) => setMessages(res.data));
  }, [applicationId]);

  useEffect(() => {
    if (!accessToken) return;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${base}/chat`, { auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join', { applicationId });
    socket.on('message', (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      socket.disconnect();
    };
  }, [applicationId, accessToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    socketRef.current?.emit('message', { applicationId, message: text });
    setDraft('');
  };

  return (
    <Card>
      <h2 className="font-serif text-lg mb-4">Переписка с Министерством иностранных дел Республики Абхазия</h2>
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && <p className="text-sm text-ink-soft">Сообщений пока нет.</p>}
        {messages.map((m) => {
          const mine = m.senderUserId === userId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                mine ? 'self-end bg-primary/10 text-ink' : 'self-start bg-paper-dark text-ink'
              }`}
            >
              <div>{m.message}</div>
              <div className="text-[10px] text-ink-soft mt-1">
                {new Date(m.createdAt).toLocaleString('ru-RU')}
                {!mine && ' · Министерство'}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Написать сообщение…"
          rows={2}
          className="flex-1"
        />
        <Button onClick={send}>Отправить</Button>
      </div>
    </Card>
  );
}
