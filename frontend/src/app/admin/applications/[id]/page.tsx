'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Button, Card } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { ApplicantReviewPanel } from '@/components/ApplicantReviewPanel';
import { StaffChatPanel } from '@/components/StaffChatPanel';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { Applicant, ApplicationDetail } from '@/lib/types';

export default function StaffApplicationDetailPage() {
  const ready = useRequireStaffAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const applicationId = params.id;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const printPack = async () => {
    setPrintBusy(true);
    setPrintError(null);
    try {
      const res = await staffApi.post<{ downloadUrl: string }>(
        `/applications/${applicationId}/print-pack`,
      );
      window.open(res.data.downloadUrl, '_blank', 'noreferrer');
    } catch (e) {
      setPrintError(apiErrorMessage(e, 'Не удалось сформировать печатный пакет'));
    } finally {
      setPrintBusy(false);
    }
  };

  const load = async () => {
    try {
      const res = await staffApi.get<ApplicationDetail>(`/applications/${applicationId}`);
      setApplication(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить заявку'));
    }
  };

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, applicationId]);

  if (!ready) return null;

  if (error) {
    return (
      <AdminShell>
        <Alert>{error}</Alert>
      </AdminShell>
    );
  }

  if (!application) {
    return (
      <AdminShell>
        <p className="text-ink-soft">Загрузка…</p>
      </AdminShell>
    );
  }

  const updateApplicant = (updated: Applicant) => {
    setApplication({
      ...application,
      applicants: application.applicants.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
    });
    // Статус заявки мог пересчитаться на бэкенде вслед за статусом анкеты — подтягиваем заявку целиком.
    load();
  };

  return (
    <AdminShell>
      <button
        onClick={() => router.push('/admin/applications')}
        className="text-sm text-ink-soft hover:text-primary mb-4"
      >
        ← Все заявки
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-sm text-ink-soft">{application.applicationNumber}</div>
          <h1 className="font-serif text-2xl">{application.user?.fullName}</h1>
          <div className="text-xs text-ink-soft">{application.user?.email}</div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={printPack} disabled={printBusy}>
            {printBusy ? 'Формируем пакет…' : 'Отправить всё на печать'}
          </Button>
          <StatusStamp status={application.status} kind="application" />
        </div>
      </div>

      {printError && (
        <div className="mb-4">
          <Alert>{printError}</Alert>
        </div>
      )}

      {application.equipmentList && application.equipmentList.items.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-serif text-lg mb-3">Техника группы</h2>
          <div className="flex flex-col gap-1 text-sm">
            {application.equipmentList.items.map((item) => (
              <div key={item.id}>
                {item.category} — {item.brand} {item.model}{' '}
                <span className="font-mono text-ink-soft">№ {item.serialNumber}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {application.applicants.map((applicant) => (
          <ApplicantReviewPanel key={applicant.id} applicant={applicant} onStatusChanged={updateApplicant} />
        ))}
      </div>

      <StaffChatPanel applicationId={applicationId} />
    </AdminShell>
  );
}
