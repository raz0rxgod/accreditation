'use client';

import { useEffect, useState } from 'react';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Card, Input, Select } from '@/components/ui';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { MediaOrganization, MediaType, MEDIA_TYPE_LABELS } from '@/lib/types';

export default function MediaOrganizationsPage() {
  const ready = useRequireStaffAuth();

  const [orgs, setOrgs] = useState<MediaOrganization[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = (query?: string) =>
    staffApi
      .get<MediaOrganization[]>('/media-organizations', { params: query ? { search: query } : undefined })
      .then((res) => setOrgs(res.data))
      .catch((e) => setError(apiErrorMessage(e, 'Не удалось загрузить справочник организаций')));

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const changeMediaType = async (org: MediaOrganization, mediaType: MediaType) => {
    setBusyId(org.id);
    setError(null);
    try {
      await staffApi.patch(`/media-organizations/${org.id}`, { mediaType });
      setOrgs((prev) => (prev ? prev.map((o) => (o.id === org.id ? { ...o, mediaType } : o)) : prev));
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось изменить тип организации'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl mb-6">Справочник организаций</h1>

      <p className="text-sm text-ink-soft mb-4">
        Тип организации используется в отчёте «Соотношение по типам организаций» на странице{' '}
        <a href="/admin/analytics" className="text-primary hover:underline">
          Аналитика
        </a>
        . У организаций, добавленных до введения этого поля, тип пока не проставлен — задайте его вручную
        ниже.
      </p>

      <form onSubmit={onSearchSubmit} className="flex gap-2 mb-4">
        <Input
          placeholder="Поиск по названию"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </form>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card>
        {orgs === null && <p className="text-sm text-ink-soft">Загрузка…</p>}
        {orgs && orgs.length === 0 && <p className="text-sm text-ink-soft">Ничего не найдено.</p>}
        {orgs && orgs.length > 0 && (
          <div className="flex flex-col gap-2">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between gap-3 text-sm border border-border rounded-md px-3 py-2"
              >
                {/* min-w-0 обязателен: без него flex-элемент не сжимается меньше своего
                    содержимого, truncate не срабатывает, и длинный текст выдавливает
                    соседний Select за пределы строки (был баг с перекрытием). */}
                <div className="truncate min-w-0">
                  <div className="truncate">{org.name}</div>
                  <div className="text-xs text-ink-soft truncate">
                    {org.country?.name ?? 'страна не указана'}
                    {org.website ? ` · ${org.website}` : ''}
                  </div>
                </div>
                <Select
                  value={org.mediaType ?? ''}
                  disabled={busyId === org.id}
                  onChange={(e) => changeMediaType(org, e.target.value as MediaType)}
                  className="w-44 shrink-0 text-xs"
                >
                  <option value="" disabled>
                    — не указано —
                  </option>
                  {(Object.keys(MEDIA_TYPE_LABELS) as MediaType[]).map((t) => (
                    <option key={t} value={t}>
                      {MEDIA_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
