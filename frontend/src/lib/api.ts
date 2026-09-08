import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Достаёт человекочитаемое сообщение об ошибке из ответа NestJS (ValidationPipe и обычных исключений). */
export function apiErrorMessage(error: unknown, fallback = 'Что-то пошло не так, попробуйте ещё раз'): string {
  const data = (error as any)?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data.message)) return data.message.join('; ');
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.errors)) return data.errors.join('; ');
  return fallback;
}
