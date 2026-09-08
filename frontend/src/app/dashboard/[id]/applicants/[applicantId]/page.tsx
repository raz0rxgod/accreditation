'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { DashboardShell } from '@/components/DashboardShell';
import { Alert, Card } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { ApplicantForm, ApplicantFormValues } from '@/components/ApplicantForm';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { MaterialsPanel } from '@/components/MaterialsPanel';
import { PhotoUpload } from '@/components/PhotoUpload';
import { api, apiErrorMessage } from '@/lib/api';
import { AccreditationCard, Applicant, ApplicationDetail } from '@/lib/types';

export default function ApplicantDetailPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string; applicantId: string }>();
  const { id: applicationId, applicantId } = params;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [card, setCard] = useState<AccreditationCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<ApplicationDetail>(`/applications/${applicationId}`);
      setApplication(res.data);
      const found = res.data.applicants.find((a) => a.id === applicantId) ?? null;
      if (!found) {
        setError('Анкета не найдена в этой заявке');
        return;
      }
      setApplicant(found);

      if (found.status === 'approved') {
        try {
          const cardRes = await api.get<AccreditationCard>(`/applicants/${applicantId}/card`);
          setCard(cardRes.data);
        } catch {
          // карта ещё не сгенерирована — не критично
        }
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить анкету'));
    }
  };

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, applicationId, applicantId]);

  if (!ready) return null;

  if (error) {
    return (
      <DashboardShell>
        <Alert>{error}</Alert>
      </DashboardShell>
    );
  }

  if (!application || !applicant) {
    return (
      <DashboardShell>
        <p className="text-ink-soft">Загрузка…</p>
      </DashboardShell>
    );
  }

  const editable = application.status === 'draft';

  const onSubmit = async (values: ApplicantFormValues) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.patch<Applicant>(`/applicants/${applicantId}`, values);
      setApplicant(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось сохранить анкету'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <button
        onClick={() => router.push(`/dashboard/${applicationId}`)}
        className="text-sm text-ink-soft hover:text-primary mb-4"
      >
        ← К заявке {application.applicationNumber}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">
          {applicant.lastName} {applicant.firstName}
        </h1>
        <StatusStamp status={applicant.status} kind="applicant" />
      </div>

      {!editable && (
        <Alert tone="success">
          Заявка отправлена на рассмотрение — анкета доступна только для просмотра.
        </Alert>
      )}

      {card && (
        <Card className="my-6 flex items-center justify-between">
          <div>
            <div className="font-serif text-lg">Карта аккредитации № {card.accreditationNumber}</div>
            <div className="text-xs text-ink-soft">
              Действительна до {new Date(card.expiresAt).toLocaleDateString('ru-RU')}
            </div>
          </div>
          {card.downloadUrl && (
            <a href={card.downloadUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">
              Скачать PDF
            </a>
          )}
        </Card>
      )}

      <div className="my-6">
        <PhotoUpload
          applicantId={applicantId}
          photoUrl={applicant.photoUrl}
          editable={editable}
          onUploaded={(photoUrl) => setApplicant({ ...applicant, photoUrl })}
        />
      </div>

      <div className="my-6">
        <ApplicantForm applicant={applicant} editable={editable} saving={saving} onSubmit={onSubmit} />
      </div>

      {saved && <Alert tone="success">Анкета сохранена</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className="mt-6">
        <DocumentsPanel applicantId={applicantId} editable={editable} />
      </div>

      {applicant.status === 'approved' && (
        <div className="mt-6">
          <MaterialsPanel applicantId={applicantId} />
        </div>
      )}
    </DashboardShell>
  );
}
