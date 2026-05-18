'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface Answer { questionId: string; isCorrect: boolean; selectedOptionIds: string[]; openText?: string; }
interface Option { id: string; text: string; isCorrect: boolean; order: number; }
interface Question { id: string; text: string; type: string; points: number; answerOptions: Option[]; }
interface Result { attempt: any; quiz: { title: string; questions: Question[] }; answers: Answer[]; pct: number; }

export default function ResultsPage() {
  const { attemptId, locale } = useParams<{ attemptId: string; locale: string }>();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/attempts/${attemptId}/result`)
      .then(res => setResult(res.data))
      .catch(() => router.replace(`/${locale}/dashboard`))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );
  if (!result) return null;

  const { attempt, quiz, answers, pct } = result;
  const correct = answers.filter(a => a.isCorrect).length;
  const total = quiz?.questions?.length ?? 0;

  const scoreColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = pct >= 80 ? 'from-emerald-600 to-teal-600' : pct >= 50 ? 'from-yellow-600 to-orange-600' : 'from-red-600 to-rose-600';

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <button onClick={() => router.push(`/${locale}/dashboard`)} className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
      >
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${scoreBg}`}>
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white">{quiz?.title}</h1>
        <p className="mb-6 text-gray-400">Quiz completed!</p>

        <div className={`text-6xl font-black mb-2 ${scoreColor}`}>{pct}%</div>
        <p className="text-gray-400">{attempt.score} / {attempt.totalPoints} points</p>
        <p className="mt-2 text-sm text-gray-500">{correct} correct out of {total} questions</p>
      </motion.div>

      {/* Questions review */}
      {quiz?.questions && (
        <>
          <h2 className="mb-4 font-semibold text-white">Review</h2>
          <div className="space-y-3">
            {[...quiz.questions].sort((a, b) => a.order - b.order).map((q, i) => {
              const ans = answers.find(a => a.questionId === q.id);
              const isCorrect = ans?.isCorrect ?? false;
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl border p-4 ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect
                      ? <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                      : <XCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
                    }
                    <p className="font-medium text-white">{q.text}</p>
                  </div>

                  {q.type !== 'open' && q.answerOptions && (
                    <div className="ml-8 space-y-1.5">
                      {[...q.answerOptions].sort((a, b) => a.order - b.order).map(opt => {
                        const wasSelected = ans?.selectedOptionIds?.includes(opt.id);
                        return (
                          <div key={opt.id} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${
                            opt.isCorrect ? 'bg-emerald-500/15 text-emerald-300' :
                            wasSelected ? 'bg-red-500/15 text-red-300' : 'text-gray-500'
                          }`}>
                            {opt.isCorrect && <span className="text-emerald-400">✓</span>}
                            {wasSelected && !opt.isCorrect && <span className="text-red-400">✗</span>}
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'open' && ans?.openText && (
                    <p className="ml-8 text-sm text-gray-400 italic">"{ans.openText}"</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
