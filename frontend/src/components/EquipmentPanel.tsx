'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, apiErrorMessage } from '@/lib/api';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { QrCodeImage } from '@/components/QrCodeImage';
import { EquipmentList } from '@/lib/types';

interface ItemForm {
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
}

// QR кодирует ссылку на публичную страницу /verify, а не голый токен — так его можно
// открыть любой камерой телефона, а не только через сканер в админке.
function buildVerifyUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify?token=${encodeURIComponent(token)}`;
}

export function EquipmentPanel({
  applicationId,
  equipmentList,
  editable,
  onChange,
}: {
  applicationId: string;
  equipmentList: EquipmentList | null | undefined;
  editable: boolean;
  onChange: (list: EquipmentList) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { register, handleSubmit, reset } = useForm<ItemForm>();

  const items = equipmentList?.items ?? [];
  const hasRealQr = !!equipmentList?.qrToken && !equipmentList.qrToken.startsWith('pending-');

  const addItem = async (data: ItemForm) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<EquipmentList>(`/applications/${applicationId}/equipment`, {
        items: [data],
      });
      onChange(res.data);
      reset();
      setShowForm(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось добавить технику'));
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/equipment-items/${id}`);
      onChange({ ...(equipmentList as EquipmentList), items: items.filter((i) => i.id !== id) });
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось удалить позицию'));
    } finally {
      setBusy(false);
    }
  };

  const generateQr = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<EquipmentList>(`/applications/${applicationId}/equipment/qr`);
      onChange(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось сгенерировать QR'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg">Техника и оборудование</h2>
        {editable && (
          <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Отмена' : '+ Добавить'}
          </Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-ink-soft">Техника не добавлена. Это необязательно.</p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
            >
              <span>
                {item.category} — {item.brand} {item.model}{' '}
                <span className="font-mono text-ink-soft">№ {item.serialNumber}</span>
              </span>
              {editable && (
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  className="text-seal-dark text-xs hover:underline"
                >
                  удалить
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && editable && (
        <form onSubmit={handleSubmit(addItem)} className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Категория" htmlFor="category">
            <Input id="category" placeholder="Камера, штатив…" {...register('category', { required: true })} />
          </Field>
          <Field label="Производитель" htmlFor="brand">
            <Input id="brand" {...register('brand', { required: true })} />
          </Field>
          <Field label="Модель" htmlFor="model">
            <Input id="model" {...register('model', { required: true })} />
          </Field>
          <Field label="Серийный номер" htmlFor="serialNumber">
            <Input id="serialNumber" {...register('serialNumber', { required: true })} />
          </Field>
          <Button type="submit" disabled={busy} className="col-span-2">
            Добавить в список
          </Button>
        </form>
      )}

      {items.length > 0 && editable && (
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="text-xs text-ink-soft">
            {hasRealQr ? 'Групповой QR на технику сгенерирован' : 'QR ещё не сгенерирован'}
          </div>
          <Button variant="secondary" onClick={generateQr} disabled={busy}>
            {hasRealQr ? 'Перегенерировать QR' : 'Сгенерировать QR'}
          </Button>
        </div>
      )}

      {hasRealQr && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <QrCodeImage value={buildVerifyUrl(equipmentList!.qrToken)} />
          <p className="text-xs text-ink-soft text-center max-w-xs">
            Покажите этот код на таможне при въезде с оборудованием — он подтверждает,
            что техника заявлена и привязана к одобренной заявке.
          </p>
          <button
            type="button"
            onClick={() => setShowToken((s) => !s)}
            className="text-xs text-primary hover:underline"
          >
            {showToken ? 'скрыть текст кода' : 'показать текст кода'}
          </button>
          {showToken && (
            <div className="font-mono text-xs break-all bg-paper-dark rounded-md p-3 text-ink-soft w-full">
              {equipmentList!.qrToken}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
