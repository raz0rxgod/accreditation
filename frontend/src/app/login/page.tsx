'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { AuthPageHeader } from '@/components/AuthPageHeader';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setToken(res.data.accessToken);
      router.replace('/dashboard');
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось войти. Проверьте почту и пароль.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <AuthPageHeader />
      <Card className="w-full max-w-md">
        <h1 className="font-serif text-2xl mb-1">Личный кабинет заявителя</h1>
        <p className="text-sm text-ink-soft mb-6">Портал электронной аккредитации</p>

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

        <p className="text-sm text-ink-soft mt-6">
          Нет учётной записи?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </Card>
    </div>
  );
}
