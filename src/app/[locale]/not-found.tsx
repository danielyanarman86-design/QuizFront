'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors');
  const { locale } = useParams();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f1a] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.h1
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-[10rem] font-black leading-none bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent"
        >
          404
        </motion.h1>
        <p className="mt-4 text-xl text-gray-400">{t('notFound')}</p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-3 font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 transition"
        >
          {t('goHome')}
        </Link>
      </motion.div>
    </div>
  );
}
