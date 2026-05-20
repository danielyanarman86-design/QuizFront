import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('quizrush_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthPage) {
        localStorage.removeItem('quizrush_token');
        // Определяем locale из текущего URL (первый сегмент пути)
        const segments = window.location.pathname.split('/').filter(Boolean);
        const locales = ['hy', 'ru', 'en'];
        const locale = locales.includes(segments[0]) ? segments[0] : 'hy';
        window.location.href = `/${locale}/login`;
      }
    }
    return Promise.reject(error);
  },
);
