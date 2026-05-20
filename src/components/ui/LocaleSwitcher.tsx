'use client';

import { useParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';

const locales = [
  { code: 'hy', label: 'ՀԱՅ' },
  { code: 'ru', label: 'РУС' },
  { code: 'en', label: 'ENG' },
];

export function LocaleSwitcher() {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    const segments = pathname.split('/').filter(Boolean);
    const pathWithoutLocale = '/' + segments.slice(1).join('/') || '/';

    startTransition(() => {
      router.replace(pathWithoutLocale, { locale: newLocale });
    });
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          disabled={isPending}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
            locale === l.code
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          } disabled:opacity-50`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
