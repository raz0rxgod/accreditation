'use client';

import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { AppDocument, DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { Alert, Button, Card, Select } from '@/components/ui';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

const DOC_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export function DocumentsPanel({ applicantId, editable }: { applicantId: string; editable: boolean }) {
  const [documents, setDocuments] = useState<AppDocument[] | null>(null);
  const [type, setType] = useState<DocumentType>('passport_scan');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<AppDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<AppDocument[]>(`/applicants/${applicantId}/documents`).then((res) => setDocuments(res.data));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantId]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      await api.post(`/applicants/${applicantId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить файл'));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/documents/${id}`);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось удалить документ'));
    }
  };

  return (
    <Card>
      <h2 className="font-serif text-lg mb-4">Документы</h2>

      {error && <Alert>{error}</Alert>}

      {documents === null && <p className="text-sm text-ink-soft">Загрузка…</p>}

      {documents && documents.length === 0 && (
        <p className="text-sm text-ink-soft mb-4">Документы ещё не загружены.</p>
      )}

      {documents && documents.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
              <div>
                <div>{DOCUMENT_TYPE_LABELS[doc.type]}</div>
                <div className="text-xs text-ink-soft">
                  {doc.filename} · {(Number(doc.fileSize) / 1024).toFixed(0)} КБ
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.downloadUrl && (
                  <button onClick={() => setPreview(doc)} className="text-primary hover:underline text-xs">
                    просмотреть
                  </button>
                )}
                {doc.downloadUrl && (
                  <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                    скачать
                  </a>
                )}
                {editable && (
                  <button onClick={() => remove(doc.id)} className="text-seal-dark text-xs hover:underline">
                    удалить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className="w-auto">
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary"
          />
          <Button type="button" onClick={upload} disabled={uploading}>
            {uploading ? 'Загружаем…' : 'Загрузить'}
          </Button>
          <span className="text-xs text-ink-soft w-full">PDF, JPG или PNG, до 15 МБ</span>
        </div>
      )}

      {preview && preview.downloadUrl && (
        <DocumentPreviewModal
          filename={preview.filename}
          url={preview.downloadUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </Card>
  );
}
