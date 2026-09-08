'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuthStore, StaffRole } from '@/store/staffAuth';

/** Пускает на страницу только авторизованных сотрудников (опционально — с нужной ролью). */
export function useRequireStaffAuth(allowedRoles?: StaffRole[]) {
  const router = useRouter();
  const isAuthenticated = useStaffAuthStore((s) => s.isAuthenticated);
  const hasRole = useStaffAuthStore((s) => s.hasRole);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/admin/login');
      return;
    }
    if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
      router.replace('/admin/applications');
      return;
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
