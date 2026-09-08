'use client';

import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Material } from '@/lib/types';
import { Alert, Button, Card, Input } from '@/components/ui';

export function MaterialsPanel({ applicantId }: { applicantId: string }) {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api.get<Material[]>(`/applicants/${applicantId}/materials`).then((res) => setMaterials(res.data));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantId]);

  const addUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/applicants/${applicantId}/materials`, { url: url.trim() });
      setUrl('');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось добавить ссылку'));
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/applicants/${applicantId}/materials/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить файл'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/materials/${id}`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось удалить материал'));
    }
  };

  return (
    <Card>
      <h2 className="font-serif text-lg mb-4">Материалы по итогам поездки</h2>

      <Alert tone="success">
        Пожалуйста, загрузите ссылки и материалы, подготовленные вами по результатам поездки в
        Республику Абхазия. Наличие и объём вашей базы материалов напрямую влияют на скорость
        обработки последующих запросов: чем больше материалов загружено, тем быстрее будет
        рассмотрена ваша следующая заявка на аккредитацию.
      </Alert>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {materials === null && <p className="text-sm text-ink-soft">Загрузка…</p>}

        {materials && materials.length === 0 && (
          <p className="text-sm text-ink-soft mb-4">Материалы ещё не загружены.</p>
        )}

        {materials && materials.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
              >
                <div className="truncate pr-4">
                  {m.type === 'url' ? (
                    <a
                      href={m.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {m.url}
                    </a>
                  ) : (
                    <span>PDF-отчёт</span>
                  )}
                  <div className="text-xs text-ink-soft">
                    {new Date(m.uploadedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.type === 'pdf' && m.downloadUrl && (
                    <a
                      href={m.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      скачать
                    </a>
                  )}
                  <button onClick={() => remove(m.id)} className="text-seal-dark text-xs hover:underline">
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="max-w-xs"
        />
        <Button type="button" onClick={addUrl} disabled={busy || !url.trim()}>
          Добавить ссылку
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 mt-4">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
        />
        <Button type="button" onClick={uploadPdf} disabled={busy}>
          {busy ? 'Загружаем…' : 'Загрузить PDF'}
        </Button>
        <span className="text-xs text-ink-soft w-full">PDF, до 15 МБ</span>
      </div>
    </Card>
  );
}
