'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trophy, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

interface SessionSummary {
  id: string;
  pin: string;
  quizTitle: string;
  startedAt: string;
  finishedAt: string;
}

interface SessionResult {
  id: string;
  rank: number;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LiveHistoryPage() {
  const t = useTranslations('liveHistory');
  const token = useAuthStore(s => s.token);
  const headers = { Authorization: `Bearer ${token}` };

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SessionResult[]>>({});

  useEffect(() => {
    axios.get(`${api}/sessions/history`, { headers })
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!results[id]) {
      try {
        const { data } = await axios.get(`${api}/sessions/${id}/results`, { headers });
        setResults(prev => ({ ...prev, [id]: data }));
      } catch {}
    }
  };

  const duration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
          <History className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-sm text-gray-400">{t('subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-20 text-center">
          <History className="mb-4 h-12 w-12 text-gray-600" />
          <p className="text-gray-400">{t('noSessions')}</p>
          <p className="mt-1 text-sm text-gray-600">{t('startFromAssignments')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <button onClick={() => toggle(s.id)} className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-white/5 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{s.quizTitle}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.startedAt).toLocaleDateString()} · {duration(s.startedAt, s.finishedAt)}
                    </span>
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">PIN {s.pin}</span>
                  </div>
                </div>
                {expanded === s.id
                  ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>

              <AnimatePresence>
                {expanded === s.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/10">
                    <div className="p-6">
                      {!results[s.id] ? (
                        <div className="flex justify-center py-4">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                        </div>
                      ) : results[s.id].length === 0 ? (
                        <p className="text-center text-sm text-gray-500">{t('noResults')}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">{results[s.id].length} {t('players')}</span>
                          </div>
                          {results[s.id].map(r => (
                            <div key={r.id} className={`flex items-center gap-4 rounded-xl px-4 py-3 ${r.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5'}`}>
                              <span className={`w-8 font-bold text-sm ${r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-gray-300' : r.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                                #{r.rank}
                              </span>
                              {r.rank === 1 && <Trophy className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
                              <span className="flex-1 font-medium text-white text-sm">{r.playerName}</span>
                              <span className="text-xs text-gray-500">{r.correctAnswers}/{r.totalQuestions} {t('correct')}</span>
                              <span className="font-bold text-violet-400">{r.score} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
