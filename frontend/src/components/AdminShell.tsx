'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStaffAuthStore } from '@/store/staffAuth';
import { STAFF_ROLE_LABELS } from '@/lib/types';
import { staffApi } from '@/lib/staffApi';
import { NotificationBell } from '@/components/NotificationBell';
import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME } from '@/lib/brand';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const fullName = useStaffAuthStore((s) => s.fullName);
  const role = useStaffAuthStore((s) => s.role);
  const accessToken = useStaffAuthStore((s) => s.accessToken);
  const logout = useStaffAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="portal-header-gradient text-white sticky top-0 z-10 shadow-card">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <Link href="/admin/applications" className="flex items-center gap-3 min-w-0">
            <PortalLogo className="h-11 w-11 shrink-0 text-white" />
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-sm sm:text-base tracking-tight truncate">
                {ORG_FULL_NAME}
              </span>
              <span className="block text-[11px] sm:text-xs text-white/70 truncate">Панель сотрудника</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <NotificationBell apiClient={staffApi} accessToken={accessToken} variant="dark" />
            {fullName && (
              <span className="hidden md:inline font-mono text-white/80">
                {fullName}
                {role && <span className="text-white/50"> · {STAFF_ROLE_LABELS[role]}</span>}
              </span>
            )}
            <button
              onClick={() => {
                logout();
                router.replace('/admin/login');
              }}
              className="border border-white/30 rounded-full px-3 py-1 hover:border-white hover:bg-white/10 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
        <nav className="border-t border-white/10 bg-black/10">
          <div className="max-w-6xl mx-auto px-6 flex items-center gap-6 text-sm text-white/80">
            <Link href="/admin/applications" className="py-2.5 hover:text-white transition-colors">
              Заявки
            </Link>
            <Link href="/admin/scan" className="py-2.5 hover:text-white transition-colors">
              Сканер QR
            </Link>
            <Link href="/admin/analytics" className="py-2.5 hover:text-white transition-colors">
              Аналитика
            </Link>
            <Link href="/admin/media-organizations" className="py-2.5 hover:text-white transition-colors">
              Организации
            </Link>
            {role === 'admin' && (
              <Link href="/admin/staff" className="py-2.5 hover:text-white transition-colors">
                Сотрудники
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
