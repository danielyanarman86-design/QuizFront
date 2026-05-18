'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, CheckCircle, Clock, XCircle, Trophy, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';

interface StudentRow {
  student: { id: string; firstName: string; lastName: string; email: string };
  status: 'completed' | 'inProgress' | 'notStarted';
  score: number | null;
  totalPoints: number;
  pct: number | null;
  finishedAt: string | null;
}

interface OpenAnswer {
  answerId: string;
  questionText: string;
  openText: string;
  isCorrect: boolean;
  points: number;
}
interface OpenAnswerGroup {
  attemptId: string;
  student: { id: string; firstName: string; lastName: string };
  answers: OpenAnswer[];
}

interface ResultsData {
  assignment: { id: string; quiz: { title: string }; deadline: string | null };
  totalStudents: number;
  completed: number;
  avgPct: number;
  rows: StudentRow[];
}

const statusConfig = {
  completed:   { label: 'Completed',   icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  inProgress:  { label: 'In Progress', icon: Clock,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20'  },
  notStarted:  { label: 'Not Started', icon: XCircle,      color: 'text-gray-500',    bg: 'bg-white/5 border-white/10'             },
};

export default function AssignmentResultsPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [openAnswers, setOpenAnswers] = useState<OpenAnswerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'results' | 'open'>('results');
  const [grading, setGrading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/assignments/${id}/results`),
      api.get(`/attempts/assignment/${id}/open-answers`),
    ])
      .then(([res, openRes]) => {
        setData(res.data);
        setOpenAnswers(openRes.data);
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  const handleGrade = async (answerId: string, isCorrect: boolean) => {
    setGrading(answerId);
    try {
      await api.patch(`/attempts/answers/${answerId}/grade`, { isCorrect });
      setOpenAnswers(prev => prev.map(group => ({
        ...group,
        answers: group.answers.map(a => a.answerId === answerId ? { ...a, isCorrect } : a),
      })));
    } finally {
      setGrading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  if (!data) return null;

  const sortedRows = [...data.rows].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (b.status === 'completed' && a.status !== 'completed') return 1;
    return (b.pct ?? -1) - (a.pct ?? -1);
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{data.assignment.quiz.title}</h1>
          <p className="text-sm text-gray-500">Class Results</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {[
          { key: 'results', label: 'Results', icon: Users },
          { key: 'open', label: `Open Answers${openAnswers.length ? ` (${openAnswers.length})` : ''}`, icon: FileText },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? 'border-violet-500 bg-violet-500/15 text-violet-300' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
            }`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'open' && (
        <div className="space-y-4">
          {openAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-gray-400">No open answers to review</p>
            </div>
          ) : openAnswers.map(group => (
            <motion.div key={group.attemptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 font-semibold text-white">{group.student.firstName} {group.student.lastName}</p>
              <div className="space-y-3">
                {group.answers.map(a => (
                  <div key={a.answerId} className={`rounded-xl border p-4 ${a.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-black/20'}`}>
                    <p className="mb-1 text-xs text-gray-500">{a.questionText} · {a.points} pts</p>
                    <p className="mb-3 text-sm text-white">{a.openText || <span className="text-gray-500 italic">No answer</span>}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleGrade(a.answerId, true)} disabled={grading === a.answerId}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${a.isCorrect ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-white/10 bg-white/5 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400'}`}>
                        <ThumbsUp className="h-3 w-3" /> Correct
                      </button>
                      <button onClick={() => handleGrade(a.answerId, false)} disabled={grading === a.answerId}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${!a.isCorrect ? 'border-red-500 bg-red-500/15 text-red-400' : 'border-white/10 bg-white/5 text-gray-400 hover:border-red-500/50 hover:text-red-400'}`}>
                        <ThumbsDown className="h-3 w-3" /> Wrong
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'results' && <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students', value: data.totalStudents, icon: Users, color: 'text-violet-400' },
          { label: 'Completed', value: data.completed, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Pending', value: data.totalStudents - data.completed, icon: Clock, color: 'text-yellow-400' },
          { label: 'Avg Score', value: `${data.avgPct}%`, icon: Trophy, color: 'text-blue-400' },
        ].map(card => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <card.icon className={`mb-2 h-5 w-5 ${card.color}`} />
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-400">Completion rate</span>
          <span className="font-bold text-white">{data.totalStudents > 0 ? Math.round((data.completed / data.totalStudents) * 100) : 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.totalStudents > 0 ? (data.completed / data.totalStudents) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600"
          />
        </div>
      </div>

      {/* Student table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
          <span>Student</span>
          <span className="text-right">Status</span>
          <span className="text-right">Score</span>
          <span className="text-right">Finished</span>
        </div>
        {sortedRows.map((row, i) => {
          const cfg = statusConfig[row.status] || statusConfig.notStarted;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={row.student.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition"
            >
              <div>
                <p className="font-medium text-white">{row.student.firstName} {row.student.lastName}</p>
                <p className="text-xs text-gray-500">{row.student.email}</p>
              </div>
              <span className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
              <span className="text-right font-bold text-white">
                {row.pct !== null ? (
                  <span className={row.pct >= 70 ? 'text-emerald-400' : row.pct >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                    {row.pct}%
                  </span>
                ) : '—'}
              </span>
              <span className="text-right text-xs text-gray-500">
                {row.finishedAt ? new Date(row.finishedAt).toLocaleDateString() : '—'}
              </span>
            </motion.div>
          );
        })}
      </div>
      </>}
    </div>
  );
}
