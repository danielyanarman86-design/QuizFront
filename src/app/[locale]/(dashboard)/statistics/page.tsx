'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BarChart3, Trophy, Clock, CheckCircle, Zap } from 'lucide-react';
import { api } from '@/lib/api';

interface Stats {
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  totalTime: number;
}

interface Attempt {
  id: string;
  type: 'assignment';
  quizTitle: string;
  score: number;
  totalPoints: number;
  pct: number;
  finishedAt: string;
}

interface LiveResult {
  id: string;
  type: 'live';
  quizTitle: string;
  score: number;
  rank: number;
  correctAnswers: number;
  totalQuestions: number;
  pin: string;
  finishedAt: string;
}

export default function StatisticsPage() {
  const tDash = useTranslations('dashboard');
  const t = useTranslations('statistics');
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/statistics/me')
      .then((res) => {
        const { recentAttempts, recentLive, ...statsData } = res.data;
        setStats({ ...statsData, totalTime: 0 });
        setAttempts(recentAttempts || []);
        setLiveResults(recentLive || []);
      })
      .catch(() => {
        setStats({ totalAttempts: 0, avgScore: 0, bestScore: 0, totalTime: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { icon: CheckCircle, label: t('totalAttempts'), value: stats.totalAttempts, color: 'from-violet-600 to-purple-600' },
    { icon: Trophy, label: t('bestScore'), value: `${stats.bestScore}%`, color: 'from-yellow-600 to-orange-600' },
    { icon: BarChart3, label: t('avgScore'), value: `${stats.avgScore}%`, color: 'from-blue-600 to-cyan-600' },
    { icon: Zap, label: t('liveParticipations'), value: liveResults.length, color: 'from-emerald-600 to-teal-600' },
  ] : [];

  const hasAny = attempts.length > 0 || liveResults.length > 0;

  return (
    <div className="p-6 md:p-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-2xl font-bold text-white">
        {tDash('statistics')}
      </motion.h1>

      {loading ? (
        <div className="flex gap-2 justify-center py-20">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-3xl font-black text-white">{card.value}</p>
              </motion.div>
            ))}
          </div>

          {!hasAny ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <BarChart3 className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">{t('noAttempts')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {attempts.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10">
                    <h2 className="font-semibold text-white">{t('recentAttempts')}</h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {attempts.map((attempt, i) => (
                      <motion.div key={attempt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{attempt.quizTitle}</p>
                          <p className="text-sm text-gray-500">{attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-violet-400">{attempt.score}/{attempt.totalPoints}</p>
                          <p className="text-xs text-gray-500">{attempt.pct}%</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {liveResults.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <h2 className="font-semibold text-white">{t('liveHistory')}</h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {liveResults.map((r, i) => (
                      <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{r.quizTitle}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-sm text-gray-500">{r.finishedAt ? new Date(r.finishedAt).toLocaleDateString() : ''}</p>
                            <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-400">PIN {r.pin}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">#{r.rank}</p>
                          <p className="text-xs text-gray-500">{r.correctAnswers}/{r.totalQuestions} · {r.score} pts</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
