'use client';

import { useEffect, useState } from 'react';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { AppDocument, DOCUMENT_TYPE_LABELS } from '@/lib/types';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

export function StaffDocumentsList({ applicantId }: { applicantId: string }) {
  const [documents, setDocuments] = useState<AppDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AppDocument | null>(null);

  useEffect(() => {
    staffApi
      .get<AppDocument[]>(`/applicants/${applicantId}/documents`)
      .then((res) => setDocuments(res.data))
      .catch((e) => setError(apiErrorMessage(e, 'Не удалось загрузить документы')));
  }, [applicantId]);

  if (error) return <p className="text-sm text-seal-dark">{error}</p>;
  if (documents === null) return <p className="text-sm text-ink-soft">Загрузка…</p>;
  if (documents.length === 0) return <p className="text-sm text-ink-soft">Документы не загружены.</p>;

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
        >
          <div>
            <div>{DOCUMENT_TYPE_LABELS[doc.type]}</div>
            <div className="text-xs text-ink-soft">
              {doc.filename} · {(Number(doc.fileSize) / 1024).toFixed(0)} КБ
            </div>
          </div>
          {doc.downloadUrl && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setPreview(doc)}
                className="text-primary hover:underline text-xs"
              >
                просмотреть
              </button>
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-xs"
              >
                скачать
              </a>
            </div>
          )}
        </div>
      ))}

      {preview && preview.downloadUrl && (
        <DocumentPreviewModal
          filename={preview.filename}
          url={preview.downloadUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
