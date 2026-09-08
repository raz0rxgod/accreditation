'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { staffApi } from '@/lib/staffApi';
import { apiErrorMessage } from '@/lib/api';
import { useStaffAuthStore } from '@/store/staffAuth';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME } from '@/lib/brand';

interface StaffLoginForm {
  email: string;
  password: string;
}

export default function StaffLoginPage() {
  const router = useRouter();
  const setSession = useStaffAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginForm>();

  const onSubmit = async (data: StaffLoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const res = await staffApi.post('/auth/staff/login', data);
      setSession(res.data.accessToken, res.data.fullName);
      router.replace('/admin/applications');
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось войти. Проверьте почту и пароль.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-primary-dark">
      <div className="flex flex-col items-center gap-3 mb-6 text-center">
        <PortalLogo className="h-14 w-14 text-white" />
        <span className="font-serif text-base sm:text-lg leading-tight text-white max-w-xs">{ORG_FULL_NAME}</span>
      </div>
      <Card className="w-full max-w-md">
        <h1 className="font-serif text-2xl mb-1">Панель сотрудника</h1>
        <p className="text-sm text-ink-soft mb-6">
          Портал электронной аккредитации
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Укажите email' })}
            />
          </Field>
          <Field label="Пароль" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Укажите пароль' })}
            />
          </Field>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
