'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Card } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { Application, ApplicationStatus, STAFF_APPLICATION_TABS } from '@/lib/types';

export default function StaffApplicationsPage() {
  const ready = useRequireStaffAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ApplicationStatus>('submitted');
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (status: ApplicationStatus) => {
    setApplications(null);
    try {
      const res = await staffApi.get<Application[]>('/applications/staff/all', { params: { status } });
      setApplications(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить заявки'));
    }
  };

  useEffect(() => {
    if (ready) load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tab]);

  if (!ready) return null;

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl mb-6">Заявки на аккредитацию</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        {STAFF_APPLICATION_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t.value
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}

      {applications === null && !error && <p className="text-ink-soft">Загрузка…</p>}

      {applications && applications.length === 0 && (
        <Card className="text-center text-ink-soft">Заявок с этим статусом нет.</Card>
      )}

      <div className="flex flex-col gap-3">
        {applications?.map((app) => (
          <Card
            key={app.id}
            className="flex items-center justify-between cursor-pointer hover:border-primary/40"
            onClick={() => router.push(`/admin/applications/${app.id}`)}
          >
            <div>
              <div className="font-mono text-sm text-ink-soft">{app.applicationNumber}</div>
              <div className="font-serif text-lg">
                {app.applicants.length > 0
                  ? app.applicants.map((a) => `${a.lastName} ${a.firstName}`).join(', ')
                  : 'Участники не добавлены'}
              </div>
              <div className="text-xs text-ink-soft mt-1">
                {app.user?.fullName} · {app.user?.email}
                {app.submittedAt && ` · отправлена ${new Date(app.submittedAt).toLocaleDateString('ru-RU')}`}
              </div>
            </div>
            <StatusStamp status={app.status} kind="application" />
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
