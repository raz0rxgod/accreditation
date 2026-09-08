'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { NotificationBell } from '@/components/NotificationBell';
import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME, PORTAL_SHORT_TITLE } from '@/lib/brand';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const email = useAuthStore((s) => s.email);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="portal-header-gradient text-white sticky top-0 z-10 shadow-card">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <PortalLogo className="h-11 w-11 shrink-0 text-white" />
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-sm sm:text-base tracking-tight truncate">
                {ORG_FULL_NAME}
              </span>
              <span className="block text-[11px] sm:text-xs text-white/70 truncate">{PORTAL_SHORT_TITLE}</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <NotificationBell apiClient={api} accessToken={accessToken} variant="dark" />
            {email && <span className="hidden md:inline font-mono text-white/80">{email}</span>}
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="border border-white/30 rounded-full px-3 py-1 hover:border-white hover:bg-white/10 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
        <nav className="border-t border-white/10 bg-black/10">
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 text-sm text-white/80">
            <Link href="/dashboard" className="py-2.5 hover:text-white transition-colors">
              Заявки
            </Link>
            <Link href="/dashboard/info" className="py-2.5 hover:text-white transition-colors">
              Памятка журналиста
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
