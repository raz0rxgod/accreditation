'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { MediaOrganization, MediaType, MEDIA_TYPE_LABELS } from '@/lib/types';
import { Alert, Button, Input, Select } from '@/components/ui';

export function MediaOrgSelect({
  value,
  onChange,
  id,
}: {
  value?: string | null;
  onChange: (id: string) => void;
  id?: string;
}) {
  const [orgs, setOrgs] = useState<MediaOrganization[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMediaType, setNewMediaType] = useState<MediaType>('other');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get<MediaOrganization[]>('/media-organizations').then((res) => setOrgs(res.data));

  useEffect(() => {
    load();
  }, []);

  const createOrg = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<MediaOrganization>('/media-organizations', {
        name: newName.trim(),
        mediaType: newMediaType,
      });
      await load();
      onChange(res.data.id);
      setAdding(false);
      setNewName('');
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось добавить организацию'));
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Название организации"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Select
            value={newMediaType}
            onChange={(e) => setNewMediaType(e.target.value as MediaType)}
            className="w-auto"
          >
            {(Object.keys(MEDIA_TYPE_LABELS) as MediaType[]).map((t) => (
              <option key={t} value={t}>
                {MEDIA_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={createOrg} disabled={busy}>
            Добавить
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
            Отмена
          </Button>
        </div>
        {error && <Alert>{error}</Alert>}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="flex-1">
        <option value="">— не выбрано —</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
        + Новая организация
      </Button>
    </div>
  );
}
