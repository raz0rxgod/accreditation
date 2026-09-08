import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JwtPayload {
  sub: string;
  email?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  setToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userId: null,
      email: null,
      setToken: (token: string) => {
        const payload = decodeJwt(token);
        set({
          accessToken: token,
          userId: payload?.sub ?? null,
          email: payload?.email ?? null,
        });
      },
      logout: () => set({ accessToken: null, userId: null, email: null }),
      isAuthenticated: () => {
        const { accessToken } = get();
        if (!accessToken) return false;
        const payload = decodeJwt(accessToken);
        if (payload?.exp && payload.exp * 1000 < Date.now()) return false;
        return true;
      },
    }),
    { name: 'mid-accreditation-auth' },
  ),
);
