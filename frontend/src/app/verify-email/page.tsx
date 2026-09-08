'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui';
import Link from 'next/link';
import { AuthPageHeader } from '@/components/AuthPageHeader';

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setError('Ссылка неполная — отсутствует токен подтверждения');
      return;
    }
    api
      .post('/auth/verify-email', null, { params: { token } })
      .then((res) => {
        setToken(res.data.accessToken);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 1200);
      })
      .catch((e) => {
        setStatus('error');
        setError(apiErrorMessage(e, 'Ссылка недействительна или истекла'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <AuthPageHeader />
      <Card className="w-full max-w-md text-center">
        {status === 'loading' && <p className="text-ink-soft">Подтверждаем почту…</p>}
        {status === 'success' && (
          <>
            <h1 className="font-serif text-2xl mb-2">Почта подтверждена</h1>
            <p className="text-sm text-ink-soft">Переходим в личный кабинет…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="font-serif text-2xl mb-2">Не получилось подтвердить почту</h1>
            <p className="text-sm text-seal-dark mb-4">{error}</p>
            <Link href="/login" className="text-primary hover:underline text-sm">
              Вернуться ко входу
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <AuthPageHeader />
          <Card className="w-full max-w-md text-center">
            <p className="text-ink-soft">Подтверждаем почту…</p>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
