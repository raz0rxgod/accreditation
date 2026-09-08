'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { api, apiErrorMessage } from '@/lib/api';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { AuthPageHeader } from '@/components/AuthPageHeader';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      setDone(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось зарегистрироваться'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <AuthPageHeader />
        <Card className="w-full max-w-md text-center">
          <h1 className="font-serif text-2xl mb-3">Проверьте почту</h1>
          <p className="text-sm text-ink-soft">
            Мы отправили письмо со ссылкой для подтверждения регистрации. Перейдите по ней, чтобы активировать
            личный кабинет и войти.
          </p>
          <Link href="/login" className="inline-block mt-6 text-primary hover:underline text-sm">
            Вернуться ко входу
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <AuthPageHeader />
      <Card className="w-full max-w-md">
        <h1 className="font-serif text-2xl mb-1">Регистрация заявителя</h1>
        <p className="text-sm text-ink-soft mb-6">Для подачи заявки на аккредитацию создайте учётную запись</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="ФИО" htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" {...register('fullName', { required: 'Укажите ФИО' })} />
          </Field>
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
              autoComplete="new-password"
              {...register('password', {
                required: 'Укажите пароль',
                minLength: { value: 8, message: 'Не менее 8 символов' },
              })}
            />
          </Field>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Отправляем…' : 'Зарегистрироваться'}
          </Button>
        </form>

        <p className="text-sm text-ink-soft mt-6">
          Уже есть учётная запись?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}
