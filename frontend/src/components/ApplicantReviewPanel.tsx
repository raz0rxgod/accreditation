'use client';

import { useEffect, useState } from 'react';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { Alert, Button, Card } from '@/components/ui';
import { StatusStamp } from '@/components/StatusStamp';
import { StaffDocumentsList } from '@/components/StaffDocumentsList';
import { RejectModal } from '@/components/RejectModal';
import {
  AccreditationCard,
  Applicant,
  ApplicantStatus,
  APPLICANT_STATUS_LABELS,
  PersonHistoryEntry,
  StatusHistoryEntry,
} from '@/lib/types';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

function isExpired(value?: string | null): boolean {
  if (!value) return false;
  return new Date(value) < new Date();
}

export function ApplicantReviewPanel({
  applicant,
  onStatusChanged,
}: {
  applicant: Applicant;
  onStatusChanged: (updated: Applicant) => void;
}) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [personHistory, setPersonHistory] = useState<PersonHistoryEntry[]>([]);
  const [card, setCard] = useState<AccreditationCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const loadHistory = () => {
    staffApi
      .get<StatusHistoryEntry[]>(`/applicants/${applicant.id}/status-history`)
      .then((res) => setHistory(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
    staffApi
      .get<PersonHistoryEntry[]>(`/applicants/${applicant.id}/person-history`)
      .then((res) => setPersonHistory(res.data))
      .catch(() => setPersonHistory([]));
    if (applicant.status === 'approved') {
      staffApi
        .get<AccreditationCard>(`/applicants/${applicant.id}/card`)
        .then((res) => setCard(res.data))
        .catch(() => setCard(null));
    } else {
      setCard(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant.id, applicant.status]);

  const changeStatus = async (newStatus: ApplicantStatus, internalComment?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await staffApi.patch<Applicant>(`/applicants/${applicant.id}/status`, {
        newStatus,
        internalComment,
      });
      onStatusChanged(res.data);
      loadHistory();
      setShowReject(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось изменить статус'));
    } finally {
      setBusy(false);
    }
  };

  const expiredFlags = [
    isExpired(applicant.passportExpiry) && 'Паспорт просрочен',
    !applicant.visaFree && isExpired(applicant.visaExpiry) && 'Виза просрочена',
    !applicant.noPressCard && isExpired(applicant.pressCardExpiry) && 'Пресс-карта просрочена',
  ].filter(Boolean) as string[];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-16 rounded-md border border-border bg-paper-dark flex items-center justify-center overflow-hidden shrink-0">
            {applicant.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={applicant.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-ink-soft text-center px-1">Нет фото</span>
            )}
          </div>
          <div>
            <h3 className="font-serif text-lg">
              {applicant.lastName} {applicant.firstName} {applicant.middleName ?? ''}
            </h3>
            <div className="text-xs text-ink-soft">{applicant.media?.name ?? 'Организация не указана'}</div>
          </div>
        </div>
        <StatusStamp status={applicant.status} kind="applicant" />
      </div>

      {expiredFlags.length > 0 && (
        <div className="mb-4">
          <Alert>{expiredFlags.join(' · ')}</Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
        <div>
          <span className="text-ink-soft">Должность:</span> {applicant.position ?? '—'}
        </div>
        <div>
          <span className="text-ink-soft">Гражданство:</span> {applicant.citizenshipCountry?.name ?? '—'}
        </div>
        <div>
          <span className="text-ink-soft">Паспорт:</span> {applicant.passportNumber ?? '—'} (до{' '}
          {formatDate(applicant.passportExpiry)})
        </div>
        <div>
          <span className="text-ink-soft">Виза:</span>{' '}
          {applicant.visaFree ? 'безвизовый режим' : `до ${formatDate(applicant.visaExpiry)}`}
        </div>
        <div>
          <span className="text-ink-soft">Пресс-карта:</span>{' '}
          {applicant.noPressCard ? 'отсутствует' : `до ${formatDate(applicant.pressCardExpiry)}`}
        </div>
        <div>
          <span className="text-ink-soft">Поездка:</span> {formatDate(applicant.tripStart)} —{' '}
          {formatDate(applicant.tripEnd)}
        </div>
        <div className="col-span-2">
          <span className="text-ink-soft">Контакты:</span> {applicant.phone ?? '—'} · {applicant.email ?? '—'}
        </div>
        <div className="col-span-2">
          <span className="text-ink-soft">Цель визита:</span> {applicant.visitPurpose ?? '—'}
        </div>
      </div>

      <div className="border-t border-border pt-4 mb-4">
        <h4 className="text-xs uppercase tracking-wide text-ink-soft mb-2">Документы</h4>
        <StaffDocumentsList applicantId={applicant.id} />
      </div>

      {personHistory.length > 0 && (
        <div className="border-t border-border pt-4 mb-4">
          <h4 className="text-xs uppercase tracking-wide text-ink-soft mb-2">
            История журналиста · {personHistory.length}{' '}
            {personHistory.length === 1 ? 'прошлое обращение' : 'прошлых обращений'}
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            {personHistory.map((entry) => (
              <div key={entry.applicantId} className="border border-border rounded-md px-3 py-2">
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="font-mono">{entry.applicationNumber}</span>
                  <span>{new Date(entry.submittedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="mt-1">
                  {entry.media && <span className="text-ink-soft">{entry.media} · </span>}
                  <span
                    className={entry.status === 'rejected' ? 'text-seal-dark' : 'text-ink'}
                  >
                    {APPLICANT_STATUS_LABELS[entry.status]}
                  </span>
                </div>
                {entry.lastRejectionComment && (
                  <div className="text-ink-soft mt-1">
                    Комментарий к отказу: «{entry.lastRejectionComment}»
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-border pt-4 mb-4">
          <h4 className="text-xs uppercase tracking-wide text-ink-soft mb-2">История рассмотрения</h4>
          <div className="flex flex-col gap-2 text-xs text-ink-soft">
            {history.map((h) => (
              <div key={h.id}>
                {new Date(h.createdAt).toLocaleString('ru-RU')} · {h.staff?.fullName ?? 'система'} ·{' '}
                {h.oldStatus ?? '—'} → {h.newStatus}
                {h.internalComment && <div className="text-ink mt-0.5">«{h.internalComment}»</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {card && (
        <div className="border-t border-border pt-4 mb-4 flex items-center justify-between text-sm">
          <span>
            <span className="text-ink-soft">Карта:</span> № {card.accreditationNumber} · до{' '}
            {formatDate(card.expiresAt)}
          </span>
          {card.downloadUrl && (
            <a href={card.downloadUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
              Скачать PDF
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="flex gap-2 border-t border-border pt-4">
        <Button
          variant="secondary"
          disabled={busy || applicant.status === 'in_review'}
          onClick={() => changeStatus('in_review')}
        >
          Принять на рассмотрение
        </Button>
        <Button
          disabled={busy || applicant.status === 'approved'}
          onClick={() => changeStatus('approved')}
        >
          Одобрить
        </Button>
        <Button
          variant="danger"
          disabled={busy || applicant.status === 'rejected'}
          onClick={() => setShowReject(true)}
        >
          Отклонить
        </Button>
      </div>

      {showReject && (
        <RejectModal
          busy={busy}
          onCancel={() => setShowReject(false)}
          onConfirm={(comment) => changeStatus('rejected', comment)}
        />
      )}
    </Card>
  );
}
