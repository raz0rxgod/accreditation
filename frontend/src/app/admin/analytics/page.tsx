'use client';

import { useEffect, useState } from 'react';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Card } from '@/components/ui';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import {
  CurrentlyInCountryEntry,
  MediaTypeBreakdown,
  MaterialsByMonthGroup,
  BREAKDOWN_TYPE_LABELS,
} from '@/lib/types';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : '—';
}

function formatMonth(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function AnalyticsPage() {
  const ready = useRequireStaffAuth();

  const [inCountry, setInCountry] = useState<CurrentlyInCountryEntry[] | null>(null);
  const [breakdown, setBreakdown] = useState<MediaTypeBreakdown | null>(null);
  const [byMonth, setByMonth] = useState<MaterialsByMonthGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      staffApi.get<CurrentlyInCountryEntry[]>('/analytics/currently-in-country'),
      staffApi.get<MediaTypeBreakdown>('/analytics/media-type-breakdown'),
      staffApi.get<MaterialsByMonthGroup[]>('/analytics/materials-by-month'),
    ])
      .then(([a, b, c]) => {
        setInCountry(a.data);
        setBreakdown(b.data);
        setByMonth(c.data);
      })
      .catch((e) => setError(apiErrorMessage(e, 'Не удалось загрузить аналитику')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl mb-6">Аналитика</h1>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mb-6">
        <h2 className="font-serif text-lg mb-4">Аккредитованные журналисты в стране сейчас</h2>
        {inCountry === null && <p className="text-sm text-ink-soft">Загрузка…</p>}
        {inCountry && inCountry.length === 0 && (
          <p className="text-sm text-ink-soft">
            Сейчас никого нет — либо нет одобренных анкет с текущей поездкой, либо у них не указаны даты.
          </p>
        )}
        {inCountry && inCountry.length > 0 && (
          <div className="flex flex-col gap-2">
            {inCountry.map((p) => (
              <div
                key={p.applicantId}
                className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
              >
                <div>
                  <div>
                    {p.lastName} {p.firstName} {p.middleName ?? ''}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {p.media ?? 'Организация не указана'} · {p.citizenshipCountry ?? 'страна не указана'} · заявка{' '}
                    {p.applicationNumber}
                  </div>
                </div>
                <div className="text-xs text-ink-soft shrink-0">
                  {formatDate(p.tripStart)} — {formatDate(p.tripEnd)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="font-serif text-lg mb-4">Соотношение по типам организаций</h2>
        {breakdown === null && <p className="text-sm text-ink-soft">Загрузка…</p>}
        {breakdown && breakdown.total === 0 && (
          <p className="text-sm text-ink-soft">Пока нет одобренных анкет.</p>
        )}
        {breakdown && breakdown.total > 0 && (
          <div className="flex flex-col gap-2">
            {breakdown.breakdown.map((b) => (
              <div key={b.type} className="flex items-center gap-3">
                <div className="w-32 text-sm shrink-0">{BREAKDOWN_TYPE_LABELS[b.type]}</div>
                <div className="flex-1 h-3 rounded-full bg-paper-dark overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${b.percent}%` }} />
                </div>
                <div className="w-20 text-right text-xs text-ink-soft shrink-0">
                  {b.count} · {b.percent}%
                </div>
              </div>
            ))}
            <div className="text-xs text-ink-soft mt-2">Всего одобренных анкет: {breakdown.total}</div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-serif text-lg mb-4">Материалы по месяцам</h2>
        {byMonth === null && <p className="text-sm text-ink-soft">Загрузка…</p>}
        {byMonth && byMonth.length === 0 && (
          <p className="text-sm text-ink-soft">Материалы ещё не загружались.</p>
        )}
        {byMonth && byMonth.length > 0 && (
          <div className="flex flex-col gap-6">
            {byMonth.map((group) => (
              <div key={group.month}>
                <div className="text-sm font-medium mb-2 capitalize">{formatMonth(group.month)}</div>
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
                    >
                      <div className="truncate pr-4">
                        <div>
                          {item.journalist} {item.media ? `· ${item.media}` : ''}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {item.type === 'pdf' ? 'PDF-отчёт' : 'Ссылка на материал'}
                        </div>
                      </div>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-xs shrink-0"
                        >
                          открыть
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
