'use client';

import { useRef, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Alert, Button, Card } from '@/components/ui';

export function PhotoUpload({
  applicantId,
  photoUrl,
  editable,
  onUploaded,
}: {
  applicantId: string;
  photoUrl?: string | null;
  editable: boolean;
  onUploaded: (photoUrl: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ photoUrl: string }>(`/applicants/${applicantId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (fileRef.current) fileRef.current.value = '';
      onUploaded(res.data.photoUrl);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить фото'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <h2 className="font-serif text-lg mb-4">Фото для бейджа</h2>

      {error && <Alert>{error}</Alert>}

      <div className="flex items-center gap-4">
        <div className="w-24 h-28 rounded-md border border-border bg-paper-dark flex items-center justify-center overflow-hidden shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Фото журналиста" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-ink-soft text-center px-2">Фото не загружено</span>
          )}
        </div>

        {editable && (
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
            />
            <Button type="button" variant="secondary" onClick={upload} disabled={uploading}>
              {uploading ? 'Загружаем…' : photoUrl ? 'Заменить фото' : 'Загрузить фото'}
            </Button>
            <span className="text-xs text-ink-soft">JPG или PNG, до 5 МБ, портрет анфас</span>
          </div>
        )}
      </div>
    </Card>
  );
}
