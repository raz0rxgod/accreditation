'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRequireStaffAuth } from '@/lib/useRequireStaffAuth';
import { AdminShell } from '@/components/AdminShell';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';

type ScanResult = 'valid' | 'expired' | 'not_approved';

interface ScanResponse {
  result: ScanResult;
  message: string;
  applicant?: { fullName: string; media: string | null; accreditationNumber: string; expiresAt: string };
  items?: Array<{ category: string; brand: string; model: string; serialNumber: string }>;
}

const SCANNER_ELEMENT_ID = 'qr-reader';

/** QR теперь кодирует ссылку вида /verify?token=..., а не голый токен — вытаскиваем token из неё.
 *  Если строка не URL (например, вставили токен напрямую) — используем как есть, для обратной совместимости. */
function extractToken(raw: string): string {
  try {
    const url = new URL(raw);
    return url.searchParams.get('token') ?? raw;
  } catch {
    return raw;
  }
}

export default function ScanPage() {
  const ready = useRequireStaffAuth(['checkpoint', 'customs', 'admin']);
  const [location, setLocation] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ScanResponse | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  const submitToken = async (token: string) => {
    // Не даём повторно слать один и тот же кадр камеры десятки раз подряд.
    if (busy || token === lastScannedRef.current) return;
    lastScannedRef.current = token;
    setBusy(true);
    setError(null);
    try {
      const res = await staffApi.post<ScanResponse>('/qr/scan', {
        token,
        checkpointLocation: location || undefined,
      });
      setResponse(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось проверить QR-код'));
      setResponse(null);
    } finally {
      setBusy(false);
      // Разрешаем повторное сканирование того же кода через пару секунд
      // (например, если сотрудник специально хочет перепроверить).
      setTimeout(() => {
        lastScannedRef.current = null;
      }, 3000);
    }
  };

  const startCamera = async () => {
    setError(null);
    setResponse(null);
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => submitToken(extractToken(decodedText)),
        undefined,
      );
      setCameraOn(true);
    } catch (e) {
      setError('Не удалось включить камеру. Проверьте разрешение браузера на доступ к камере.');
    }
  };

  const stopCamera = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {
      // камера уже могла быть остановлена — не критично
    }
    scannerRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  if (!ready) return null;

  const resultStyles: Record<ScanResult, string> = {
    valid: 'bg-success/10 border-success text-success',
    expired: 'bg-seal/10 border-seal text-seal-dark',
    not_approved: 'bg-seal/10 border-seal-dark text-seal-dark',
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl mb-6">Проверка QR-кода</h1>

      <Card className="mb-6">
        <Field label="Пост / локация (необязательно)" htmlFor="location">
          <Input
            id="location"
            placeholder="КПП Псоу, Таможенный терминал…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg">Камера</h2>
          <Button
            variant="secondary"
            onClick={cameraOn ? stopCamera : startCamera}
            className={!cameraOn ? 'bg-primary text-white border-primary hover:bg-primary-dark hover:text-white' : ''}
          >
            {cameraOn ? 'Остановить' : 'Включить камеру'}
          </Button>
        </div>
        <div id={SCANNER_ELEMENT_ID} className="rounded-md overflow-hidden" />
        {!cameraOn && (
          <p className="text-sm text-ink-soft mt-2">
            Включите камеру и наведите на QR-код на карте аккредитации или списке техники.
          </p>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="font-serif text-lg mb-3">Или вставьте код вручную</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Содержимое QR-кода"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => submitToken(extractToken(manualToken.trim()))} disabled={busy || !manualToken.trim()}>
            Проверить
          </Button>
        </div>
      </Card>

      {error && <Alert>{error}</Alert>}

      {response && (
        <div className={`rounded-card border-2 p-6 text-center ${resultStyles[response.result]}`}>
          <div className="text-2xl font-serif mb-2">
            {response.result === 'valid' && 'Аккредитация действительна'}
            {response.result === 'expired' && 'Срок действия истёк'}
            {response.result === 'not_approved' && 'Не подтверждено'}
          </div>
          {response.applicant && (
            <div className="text-sm mt-3 space-y-1">
              <div className="font-medium text-lg">{response.applicant.fullName}</div>
              <div>{response.applicant.media ?? 'Организация не указана'}</div>
              <div className="font-mono">{response.applicant.accreditationNumber}</div>
              <div>до {new Date(response.applicant.expiresAt).toLocaleDateString('ru-RU')}</div>
            </div>
          )}
          {response.items && response.items.length > 0 && (
            <div className="text-sm mt-3 text-left inline-block">
              {response.items.map((item, i) => (
                <div key={i}>
                  {item.category} — {item.brand} {item.model} (№ {item.serialNumber})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
