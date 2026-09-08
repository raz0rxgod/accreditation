'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { DashboardShell } from '@/components/DashboardShell';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { EquipmentPanel } from '@/components/EquipmentPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { api, apiErrorMessage } from '@/lib/api';
import { ApplicationDetail, EquipmentList } from '@/lib/types';

interface QuickAddForm {
  lastName: string;
  firstName: string;
}

export default function ApplicationDetailPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const applicationId = params.id;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuickAddForm>();

  const load = async () => {
    try {
      const res = await api.get<ApplicationDetail>(`/applications/${applicationId}`);
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
      <DashboardShell>
        <Alert>{error}</Alert>
      </DashboardShell>
    );
  }
  if (!application) {
    return (
      <DashboardShell>
        <p className="text-ink-soft">Загрузка…</p>
      </DashboardShell>
    );
  }

  const editable = application.status === 'draft';

  const addApplicant = async (data: QuickAddForm) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/applications/${applicationId}/applicants`, data);
      reset();
      setShowAddForm(false);
      router.push(`/dashboard/${applicationId}/applicants/${res.data.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось добавить участника'));
    } finally {
      setBusy(false);
    }
  };

  const removeApplicant = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/applicants/${id}`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось удалить анкету'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setSubmitErrors(null);
    try {
      await api.post(`/applications/${applicationId}/submit`);
      await load();
    } catch (e: any) {
      const data = e?.response?.data;
      if (Array.isArray(data?.errors)) {
        setSubmitErrors(data.errors);
      } else {
        setError(apiErrorMessage(e, 'Не удалось отправить заявку'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <button onClick={() => router.push('/dashboard')} className="text-sm text-ink-soft hover:text-primary mb-4">
        ← Все заявки
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-sm text-ink-soft">{application.applicationNumber}</div>
          <h1 className="font-serif text-2xl">Заявка на аккредитацию</h1>
        </div>
        <StatusStamp status={application.status} kind="application" />
      </div>

      {error && <Alert>{error}</Alert>}
      {submitErrors && (
        <Alert>
          <div className="font-medium mb-1">Заявка не может быть отправлена:</div>
          <ul className="list-disc pl-4">
            {submitErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">Участники</h2>
          {editable && (
            <Button variant="secondary" onClick={() => setShowAddForm((s) => !s)}>
              {showAddForm ? 'Отмена' : '+ Добавить участника'}
            </Button>
          )}
        </div>

        {showAddForm && editable && (
          <Card>
            <form onSubmit={handleSubmit(addApplicant)} className="grid grid-cols-2 gap-3">
              <Field label="Фамилия" htmlFor="qa-lastName" error={errors.lastName?.message}>
                <Input id="qa-lastName" {...register('lastName', { required: 'Обязательное поле' })} />
              </Field>
              <Field label="Имя" htmlFor="qa-firstName" error={errors.firstName?.message}>
                <Input id="qa-firstName" {...register('firstName', { required: 'Обязательное поле' })} />
              </Field>
              <Button type="submit" disabled={busy} className="col-span-2">
                Добавить и заполнить анкету
              </Button>
            </form>
          </Card>
        )}

        {application.applicants.length === 0 && !showAddForm && (
          <Card className="text-center text-ink-soft">Участники ещё не добавлены</Card>
        )}

        {application.applicants.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/${applicationId}/applicants/${a.id}`)}
            >
              <div className="font-serif text-lg">
                {a.lastName} {a.firstName}
              </div>
              <div className="text-xs text-ink-soft">
                {a.media?.name ?? 'Организация не указана'}
                {a.accreditationCard && ' · карта выпущена'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusStamp status={a.status} kind="applicant" />
              {editable && (
                <button
                  onClick={() => removeApplicant(a.id)}
                  disabled={busy}
                  className="text-seal-dark text-xs hover:underline"
                >
                  удалить
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {editable && (
        <Card className="mb-6 flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            Проверьте анкеты участников и документы, затем отправьте заявку на рассмотрение администрации портала.
          </p>
          <Button onClick={submit} disabled={busy}>
            Отправить на рассмотрение
          </Button>
        </Card>
      )}

      <div className="mb-6">
        <EquipmentPanel
          applicationId={applicationId}
          equipmentList={application.equipmentList}
          editable={editable}
          onChange={(list: EquipmentList) => setApplication({ ...application, equipmentList: list })}
        />
      </div>

      <ChatPanel applicationId={applicationId} />
    </DashboardShell>
  );
}
