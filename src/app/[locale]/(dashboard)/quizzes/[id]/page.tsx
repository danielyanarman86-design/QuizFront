'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Clock, Trophy, Shuffle, Eye, Copy, Trash2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
  timeLimit: number;
  points: number;
  order: number;
  answerOptions: AnswerOption[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  settings: {
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showAnswerAfter: string;
    maxAttempts: number;
  };
  questions: Question[];
  createdAt: string;
}

const COLORS = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-orange-600'];
const LABELS = ['A', 'B', 'C', 'D'];

const typeLabel: Record<string, string> = {
  single: 'Single Choice',
  multiple: 'Multiple Choice',
  truefalse: 'True / False',
  open: 'Open Answer',
};

export default function QuizDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then(res => setQuiz(res.data))
      .catch(() => router.replace(`/${locale}/quizzes`))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDuplicate = async () => {
    try {
      const res = await api.post(`/quizzes/${id}/duplicate`);
      router.push(`/${locale}/quizzes/${res.data.id}`);
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this quiz?')) return;
    setDeleting(true);
    try {
      await api.delete(`/quizzes/${id}`);
      router.replace(`/${locale}/quizzes`);
    } catch {
      setDeleting(false);
    }
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-yellow-500/20 text-yellow-300',
    published: 'bg-emerald-500/20 text-emerald-300',
    archived: 'bg-gray-500/20 text-gray-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const isOwner = user?.role === 'teacher' || user?.role === 'superAdmin';

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor[quiz.status] ?? 'bg-gray-500/20 text-gray-300'}`}>
              {quiz.status}
            </span>
          </div>
          {quiz.description && <p className="mt-1 text-gray-400 text-sm">{quiz.description}</p>}
          {quiz.category && <p className="mt-0.5 text-xs text-gray-500">{quiz.category}</p>}
        </div>

        {isOwner && (
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={() => router.push(`/${locale}/quizzes/${id}/assign`)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition"
            >
              <Send className="h-3.5 w-3.5" /> Assign
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:text-white transition"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Questions', value: quiz.questions?.length ?? 0 },
          { icon: Trophy, label: 'Max Attempts', value: quiz.settings?.maxAttempts ?? 1 },
          { icon: Eye, label: 'Show Answers', value: quiz.settings?.showAnswerAfter === 'question' ? 'Each Q' : 'End' },
          { icon: Shuffle, label: 'Shuffle', value: quiz.settings?.shuffleQuestions ? 'On' : 'Off' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3"
          >
            <s.icon className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="font-semibold text-white text-sm">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Questions */}
      <h2 className="mb-4 font-semibold text-white">Questions ({quiz.questions?.length ?? 0})</h2>

      {(!quiz.questions || quiz.questions.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No questions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...quiz.questions].sort((a, b) => a.order - b.order).map((q, qi) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.06 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
                    {qi + 1}
                  </span>
                  <p className="font-medium text-white leading-snug">{q.text}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2 text-xs text-gray-500">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">{typeLabel[q.type] ?? q.type}</span>
                  {q.timeLimit && <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"><Clock className="inline h-3 w-3" /> {q.timeLimit}s</span>}
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"><Trophy className="inline h-3 w-3" /> {q.points}pt</span>
                </div>
              </div>

              {q.type !== 'open' && q.answerOptions && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...q.answerOptions].sort((a, b) => a.order - b.order).map((opt, oi) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition ${
                        opt.isCorrect
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${COLORS[oi % 4]}`}>
                        {LABELS[oi % 4]}
                      </span>
                      <span className={`text-sm ${opt.isCorrect ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}>
                        {opt.text || <span className="text-gray-600 italic">Empty</span>}
                      </span>
                      {opt.isCorrect && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'open' && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-500 italic">
                  Open text answer — no options
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
