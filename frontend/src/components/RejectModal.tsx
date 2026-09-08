'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field, Textarea } from '@/components/ui';

export function RejectModal({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!comment.trim()) {
      setError('Укажите причину отказа — это обязательно, комментарий видят только сотрудники');
      return;
    }
    onConfirm(comment.trim());
  };

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-6">
      <Card className="w-full max-w-md">
        <h2 className="font-serif text-lg mb-1">Причина отказа</h2>
        <p className="text-xs text-ink-soft mb-4">
          Видно только сотрудникам Министерства иностранных дел Республики Абхазия. Заявитель получит уведомление о статусе, но не увидит этот текст —
          для уточнений используйте чат внутри заявки.
        </p>

        <Field label="Комментарий" htmlFor="reject-comment">
          <Textarea
            id="reject-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: истёк срок действия скана паспорта"
            autoFocus
          />
        </Field>

        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Отмена
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy}>
            {busy ? 'Отклоняем…' : 'Отклонить анкету'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
