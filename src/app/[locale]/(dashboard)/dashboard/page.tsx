'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, BarChart3, ClipboardList, Trophy,
  Clock, CheckCircle, TrendingUp, Play, Radio, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface TeacherDashboard {
  role: 'teacher';
  stats: { totalClasses: number; totalStudents: number; totalQuizzes: number; totalAssignments: number };
  recentAssignments: { id: string; quizTitle: string; deadline: string | null; assignedAt: string }[];
  topStudents: { name: string; avgPct: number; attempts: number }[];
}

interface StudentDashboard {
  role: 'student';
  stats: { totalAttempts: number; avgScore: number; bestScore: number; pendingAssignments: number };
  recentAttempts: { id: string; quizTitle: string; pct: number; score: number; totalPoints: number; finishedAt: string }[];
}

type DashboardData = TeacherDashboard | StudentDashboard;

export default function DashboardPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/dashboard')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  return (
    <div className="p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {t('welcomeBack')}{' '}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            {user?.firstName}
          </span>{' '}👋
        </h1>
        <p className="mt-1 text-gray-400 capitalize">{user?.role} {t('account')}</p>
      </motion.div>

      {data?.role === 'teacher' ? <TeacherView data={data} locale={locale} router={router} t={t} /> : null}
      {data?.role === 'student' ? <StudentView data={data} locale={locale} router={router} t={t} /> : null}
      {!data && <FallbackCards locale={locale} role={user?.role} t={t} />}
    </div>
  );
}

function TeacherView({ data, locale, router, t }: { data: TeacherDashboard; locale: string; router: any; t: any }) {
  const statCards = [
    { icon: Users, label: t('classes'), value: data.stats.totalClasses, color: 'from-violet-600 to-purple-600', href: `/${locale}/classes` },
    { icon: Users, label: t('students'), value: data.stats.totalStudents, color: 'from-blue-600 to-cyan-600', href: `/${locale}/classes` },
    { icon: BookOpen, label: t('quizzes'), value: data.stats.totalQuizzes, color: 'from-emerald-600 to-teal-600', href: `/${locale}/quizzes` },
    { icon: ClipboardList, label: t('assignments'), value: data.stats.totalAssignments, color: 'from-orange-600 to-rose-600', href: `/${locale}/assignments` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            onClick={() => router.push(card.href)}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 cursor-pointer hover:border-white/20 transition group">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color}`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-black text-white group-hover:text-violet-300 transition">{card.value}</p>
            <p className="text-sm text-gray-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-400" /> {t('recentAssignments')}
            </h2>
            <button onClick={() => router.push(`/${locale}/assignments`)} className="text-xs text-gray-500 hover:text-violet-400 transition">
              {t('viewAll')}
            </button>
          </div>
          {data.recentAssignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t('noAssignmentsYet')}</p>
          ) : (
            <div className="space-y-2">
              {data.recentAssignments.map(a => (
                <div key={a.id} onClick={() => router.push(`/${locale}/assignments/${a.id}/results`)}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10 cursor-pointer transition">
                  <div>
                    <p className="text-sm font-medium text-white">{a.quizTitle}</p>
                    <p className="text-xs text-gray-500">{new Date(a.assignedAt).toLocaleDateString()}</p>
                  </div>
                  {a.deadline && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${new Date(a.deadline) < new Date() ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {new Date(a.deadline) < new Date() ? t('overdue') : `${t('due')} ${new Date(a.deadline).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> {t('topStudents')}
          </h2>
          {data.topStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t('noCompletedQuizzes')}</p>
          ) : (
            <div className="space-y-2">
              {data.topStudents.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <span className={`w-6 text-sm font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-white">{s.name}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-violet-400">{s.avgPct}%</p>
                    <p className="text-xs text-gray-500">{s.attempts}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t('createQuiz'), icon: BookOpen, color: 'from-violet-600 to-blue-600', href: `/${locale}/quizzes/create` },
          { label: t('viewLiveHistory'), icon: Radio, color: 'from-rose-600 to-orange-600', href: `/${locale}/live-history` },
          { label: t('statistics'), icon: BarChart3, color: 'from-emerald-600 to-teal-600', href: `/${locale}/statistics` },
        ].map(action => (
          <button key={action.label} onClick={() => router.push(action.href)}
            className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r ${action.color} px-5 py-4 font-semibold text-white hover:opacity-90 transition`}>
            <action.icon className="h-5 w-5" />
            {action.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

function StudentView({ data, locale, router, t }: { data: StudentDashboard; locale: string; router: any; t: any }) {
  const statCards = [
    { icon: CheckCircle, label: t('completed'), value: data.stats.totalAttempts, color: 'from-violet-600 to-purple-600' },
    { icon: TrendingUp, label: t('avgScore'), value: `${data.stats.avgScore}%`, color: 'from-blue-600 to-cyan-600' },
    { icon: Trophy, label: t('bestScore'), value: `${data.stats.bestScore}%`, color: 'from-yellow-600 to-orange-600' },
    { icon: AlertCircle, label: t('assignments'), value: data.stats.pendingAssignments, color: 'from-rose-600 to-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color}`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-black text-white">{card.value}</p>
            <p className="text-sm text-gray-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {data.stats.totalAttempts > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-gray-400">{t('averagePerformance')}</p>
            <p className="font-bold text-white">{data.stats.avgScore}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.stats.avgScore}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              className={`h-full rounded-full bg-gradient-to-r ${data.stats.avgScore >= 70 ? 'from-emerald-500 to-teal-500' : data.stats.avgScore >= 40 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500'}`}
            />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-400" /> {t('recentActivity')}
            </h2>
            <button onClick={() => router.push(`/${locale}/statistics`)} className="text-xs text-gray-500 hover:text-violet-400 transition">
              {t('viewAll')}
            </button>
          </div>
          {data.recentAttempts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t('noQuizzesTaken')}</p>
          ) : (
            <div className="space-y-2">
              {data.recentAttempts.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{a.quizTitle}</p>
                    <p className="text-xs text-gray-500">{new Date(a.finishedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-black ${a.pct >= 70 ? 'text-emerald-400' : a.pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {a.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white">{t('quickActions')}</h2>
          <div className="space-y-3">
            {[
              { label: t('myAssignments'), icon: ClipboardList, color: 'from-violet-600 to-blue-600', href: `/${locale}/assignments` },
              { label: t('joinLiveQuiz'), icon: Play, color: 'from-rose-600 to-orange-600', href: `/${locale}/live` },
              { label: t('viewStatistics'), icon: BarChart3, color: 'from-emerald-600 to-teal-600', href: `/${locale}/statistics` },
            ].map(action => (
              <button key={action.label} onClick={() => router.push(action.href)}
                className={`w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r ${action.color} px-5 py-3.5 font-semibold text-white hover:opacity-90 transition`}>
                <action.icon className="h-5 w-5" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FallbackCards({ locale, role, t }: { locale: string; role?: string; t: any }) {
  const isTeacher = role === 'teacher';
  const cards = isTeacher
    ? [
        { icon: Users, label: t('myClasses'), href: `/${locale}/classes`, color: 'from-violet-600 to-purple-600' },
        { icon: BookOpen, label: t('myQuizzes'), href: `/${locale}/quizzes`, color: 'from-blue-600 to-cyan-600' },
        { icon: BarChart3, label: t('statistics'), href: `/${locale}/statistics`, color: 'from-emerald-600 to-teal-600' },
      ]
    : [
        { icon: ClipboardList, label: t('assignments'), href: `/${locale}/assignments`, color: 'from-violet-600 to-blue-600' },
        { icon: BarChart3, label: t('statistics'), href: `/${locale}/statistics`, color: 'from-emerald-600 to-teal-600' },
        { icon: Play, label: t('liveQuiz'), href: `/${locale}/live`, color: 'from-orange-600 to-rose-600' },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.a key={card.label} href={card.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition cursor-pointer">
          <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color}`}>
            <card.icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition">{card.label}</h3>
        </motion.a>
      ))}
    </div>
  );
}
