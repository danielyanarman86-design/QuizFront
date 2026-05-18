import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superAdmin' | 'teacher' | 'student';
  status: string;
  avatar?: string;
  avatarColor?: string;
  preferredLocale: 'hy' | 'ru' | 'en';
  schoolId?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  _hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem('quizrush_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('quizrush_token');
        set({ user: null, token: null });
      },
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'quizrush_auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
