'use client';

import { useEffect } from 'react';

function isImage(filename: string): boolean {
  return /\.(jpe?g|png)$/i.test(filename);
}

export function DocumentPreviewModal({
  filename,
  url,
  onClose,
}: {
  filename: string;
  url: string;
  onClose: () => void;
}) {
  // Закрытие по Esc — стандартное ожидаемое поведение для модалок с просмотром файла.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-card shadow-card w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-medium truncate pr-4">{filename}</div>
          <div className="flex items-center gap-3 shrink-0">
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              скачать
            </a>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="text-ink-soft hover:text-primary text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-paper-dark overflow-auto">
          {isImage(filename) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={filename} className="w-full h-full object-contain" />
          ) : (
            <iframe src={url} title={filename} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}
