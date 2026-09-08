import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StaffJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
}

function decodeJwt(token: string): StaffJwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export type StaffRole = 'mfa_officer' | 'checkpoint' | 'customs' | 'admin';

interface StaffAuthState {
  accessToken: string | null;
  staffId: string | null;
  role: StaffRole | null;
  fullName: string | null;
  setSession: (token: string, fullName: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: StaffRole[]) => boolean;
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      staffId: null,
      role: null,
      fullName: null,
      setSession: (token: string, fullName: string) => {
        const payload = decodeJwt(token);
        set({
          accessToken: token,
          staffId: payload?.sub ?? null,
          role: (payload?.role as StaffRole) ?? null,
          fullName,
        });
      },
      logout: () => set({ accessToken: null, staffId: null, role: null, fullName: null }),
      isAuthenticated: () => {
        const { accessToken } = get();
        if (!accessToken) return false;
        const payload = decodeJwt(accessToken);
        if (payload?.exp && payload.exp * 1000 < Date.now()) return false;
        return true;
      },
      hasRole: (...roles: StaffRole[]) => {
        const { role } = get();
        return !!role && roles.includes(role);
      },
    }),
    { name: 'mid-accreditation-staff-auth' },
  ),
);
