'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { DashboardShell } from '@/components/DashboardShell';
import { Alert, Button, Card } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { api, apiErrorMessage } from '@/lib/api';
import { Application } from '@/lib/types';

export default function DashboardPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<Application[]>('/applications');
      setApplications(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить заявки'));
    }
  };

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;

  const createApplication = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<Application>('/applications');
      router.push(`/dashboard/${res.data.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось создать заявку'));
      setCreating(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">Мои заявки</h1>
        <Button onClick={createApplication} disabled={creating}>
          {creating ? 'Создаём…' : '+ Новая заявка'}
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {applications === null && !error && <p className="text-ink-soft">Загрузка…</p>}

      {applications && applications.length === 0 && (
        <Card className="text-center text-ink-soft">
          У вас пока нет заявок. Нажмите «Новая заявка», чтобы начать оформление аккредитации.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {applications?.map((app) => (
          <Card
            key={app.id}
            className="flex items-center justify-between cursor-pointer hover:border-primary/40"
            onClick={() => router.push(`/dashboard/${app.id}`)}
          >
            <div>
              <div className="font-mono text-sm text-ink-soft">{app.applicationNumber}</div>
              <div className="font-serif text-lg">
                {app.applicants.length > 0
                  ? app.applicants.map((a) => `${a.lastName} ${a.firstName}`).join(', ')
                  : 'Участники ещё не добавлены'}
              </div>
              <div className="text-xs text-ink-soft mt-1">
                Создана {new Date(app.createdAt).toLocaleDateString('ru-RU')}
                {app.submittedAt && ` · отправлена ${new Date(app.submittedAt).toLocaleDateString('ru-RU')}`}
              </div>
            </div>
            <StatusStamp status={app.status} kind="application" />
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
