'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui';
import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME, PORTAL_SHORT_TITLE } from '@/lib/brand';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Пока проверяем состояние авторизации — ничего не рисуем, чтобы не мигать
  // лендингом перед мгновенным редиректом уже вошедшего пользователя.
  if (!checked) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="portal-header-gradient text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <PortalLogo className="h-16 w-16 shrink-0 text-white" />
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-sm sm:text-base tracking-tight truncate">
                {ORG_FULL_NAME}
              </span>
              <span className="block text-[11px] sm:text-xs text-white/70 truncate">{PORTAL_SHORT_TITLE}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
              Войти
            </Link>
            <Link href="/register">
              <Button variant="secondary" className="!border-white/40 !text-white hover:!border-white hover:!bg-white/10">
                Подать заявку
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="stamp mx-auto mb-6 text-primary border-primary">Республика Абхазия</div>
          <h1 className="font-serif text-3xl md:text-4xl mb-4">
            Электронная аккредитация<br />для гостей Республики Абхазия
          </h1>
          <p className="text-ink-soft max-w-2xl mx-auto mb-8">
            Портал для иностранных гостей и организаций, планирующих
            профессиональную поездку в Республику Абхазия. Подайте заявку онлайн,
            загрузите документы, следите за статусом рассмотрения и получите
            аккредитационную карту с QR-кодом.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button>Подать заявку</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">У меня уже есть кабинет</Button>
            </Link>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="paper-card rounded-card shadow-card p-6">
            <div className="font-serif text-lg mb-2">1. Регистрация и анкета</div>
            <p className="text-sm text-ink-soft">
              Создайте личный кабинет, заполните анкету на каждого участника поездки
              и прикрепите сканы паспорта, визы и пресс-карты.
            </p>
          </div>
          <div className="paper-card rounded-card shadow-card p-6">
            <div className="font-serif text-lg mb-2">2. Рассмотрение</div>
            <p className="text-sm text-ink-soft">
              Администрация портала рассматривает заявку по каждому
              участнику отдельно. Статус и переписку с сотрудником можно
              отслеживать в личном кабинете.
            </p>
          </div>
          <div className="paper-card rounded-card shadow-card p-6">
            <div className="font-serif text-lg mb-2">3. Аккредитационная карта</div>
            <p className="text-sm text-ink-soft">
              После одобрения формируется именная карта с QR-кодом — для
              предъявления на границе и в поездке по стране.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-ink-soft">
        Портал аккредитации · Служба по работе с заявителями
      </footer>
    </div>
  );
}
