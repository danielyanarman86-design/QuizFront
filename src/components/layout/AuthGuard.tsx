'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { locale } = useParams();
  const { user, token, _hydrated } = useAuthStore();

  useEffect(() => {
    if (!_hydrated) return;

    if (!token || !user) {
      router.replace(`/${locale}/login`);
      return;
    }

    if (user.role === 'superAdmin') {
      router.replace(`/${locale}/login`);
    }
  }, [_hydrated, token, user]);

  if (!_hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!token || !user || user.role === 'superAdmin') {
    return null;
  }

  return <>{children}</>;
}
