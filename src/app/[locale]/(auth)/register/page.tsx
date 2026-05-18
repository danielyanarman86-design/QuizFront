'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, User, School, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['teacher', 'student']),
  schoolId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface School {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { locale } = useParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  });

  useEffect(() => {
    api.get('/schools').then((res) => setSchools(res.data)).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', data);
      if (res.data.accessToken) {
        setAuth(res.data.user, res.data.accessToken);
        router.push(`/${locale}/dashboard`);
      } else {
        setPending(true);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Registered!</h2>
          <p className="text-gray-400">{t('pendingApproval')}</p>
          <Link href={`/${locale}/login`} className="mt-6 inline-block text-violet-400 hover:underline">
            {t('login')}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'backOut' }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/30">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            QuizRush
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="mb-6 text-2xl font-bold text-white">{t('register')}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">{t('firstName')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    {...register('firstName')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">{t('lastName')}</label>
                <input
                  {...register('lastName')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-400">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  {...register('email')}
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-400">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  {...register('password')}
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-400">{t('role')}</label>
              <select
                {...register('role')}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              >
                <option value="student">{t('student')}</option>
                <option value="teacher">{t('teacher')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-400">{t('school')}</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <select
                  {...register('schoolId')}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] pl-10 pr-4 py-3 text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                >
                  <option value="">Select school...</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {errors.schoolId && <p className="mt-1 text-xs text-red-400">{errors.schoolId.message}</p>}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-60"
            >
              {loading ? '...' : t('register')}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/login`} className="text-violet-400 hover:text-violet-300 font-medium transition">
              {t('login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
