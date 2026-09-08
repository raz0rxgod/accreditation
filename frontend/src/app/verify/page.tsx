'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui';
import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME } from '@/lib/brand';

type ScanResult = 'valid' | 'expired' | 'not_approved';

interface VerifyResponse {
  result: ScanResult;
  message: string;
  applicant?: { fullName: string; media: string | null; accreditationNumber: string; expiresAt: string };
  items?: Array<{ category: string; brand: string; model: string; serialNumber: string }>;
}

const RESULT_STYLES: Record<ScanResult, string> = {
  valid: 'bg-success/10 border-success text-success',
  expired: 'bg-seal/10 border-seal text-seal-dark',
  not_approved: 'bg-seal/10 border-seal-dark text-seal-dark',
};

const RESULT_TITLES: Record<ScanResult, string> = {
  valid: 'Аккредитация действительна',
  expired: 'Срок действия истёк',
  not_approved: 'Не подтверждено',
};

function VerifyContent() {
  const params = useSearchParams();
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('В ссылке отсутствует код проверки');
      setLoading(false);
      return;
    }
    api
      .get<VerifyResponse>('/qr/verify', { params: { token } })
      .then((res) => setResponse(res.data))
      .catch((e) => setError(apiErrorMessage(e, 'Не удалось проверить код')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center gap-2">
          <PortalLogo className="h-12 w-12 text-primary" />
          <div className="font-serif text-lg leading-tight">{ORG_FULL_NAME}</div>
          <div className="text-xs text-ink-soft">Проверка аккредитации</div>
        </div>

        {loading && (
          <Card className="text-center text-ink-soft">Проверяем код…</Card>
        )}

        {!loading && error && (
          <Card className="text-center">
            <div className="text-seal-dark">{error}</div>
          </Card>
        )}

        {!loading && response && (
          <div className={`rounded-card border-2 p-6 text-center ${RESULT_STYLES[response.result]}`}>
            <div className="text-2xl font-serif mb-2">{RESULT_TITLES[response.result]}</div>

            {response.applicant && (
              <div className="text-sm mt-3 space-y-1">
                <div className="font-medium text-lg">{response.applicant.fullName}</div>
                <div>{response.applicant.media ?? 'Организация не указана'}</div>
                <div className="font-mono">{response.applicant.accreditationNumber}</div>
                <div>действительна до {new Date(response.applicant.expiresAt).toLocaleDateString('ru-RU')}</div>
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
      </div>
    </div>
  );
}

export default function PublicVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
          <Card className="text-center text-ink-soft">Проверяем код…</Card>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
