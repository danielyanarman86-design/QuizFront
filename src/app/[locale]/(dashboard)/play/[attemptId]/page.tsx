'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface AnswerOption { id: string; text: string; order: number; }
interface Question {
  id: string; text: string; type: string;
  timeLimit: number; points: number; order: number;
  answerOptions: AnswerOption[];
}
interface Quiz { title: string; questions: Question[]; settings: any; }
interface Attempt { id: string; totalPoints: number; }

const COLORS = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-600 to-teal-700',
  'from-orange-600 to-red-700',
];
const LABELS = ['A', 'B', 'C', 'D'];

export default function PlayQuizPage() {
  const { attemptId, locale } = useParams<{ attemptId: string; locale: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [openText, setOpenText] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Load attempt result to get quiz
    api.get(`/attempts/${attemptId}/result`)
      .then(res => {
        setAttempt(res.data.attempt);
        const q: Quiz = res.data.quiz;
        if (q?.questions) {
          q.questions = [...q.questions].sort((a, b) => a.order - b.order);
          q.questions.forEach(ques => {
            ques.answerOptions = [...(ques.answerOptions || [])].sort((a, b) => a.order - b.order);
          });
        }
        setQuiz(q);
      })
      .catch(() => router.replace(`/${locale}/dashboard`))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const question = quiz?.questions[currentIdx];

  useEffect(() => {
    if (!question) return;
    setSelected([]);
    setOpenText('');
    setAnswered(false);
    startTimeRef.current = Date.now();
    if (question.timeLimit) {
      setTimeLeft(question.timeLimit);
    }
  }, [currentIdx, question?.id]);

  useEffect(() => {
    if (!question?.timeLimit || answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, question?.id, answered]);

  const handleSubmitAnswer = useCallback(async (timeout = false) => {
    if (answered || submitting || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(true);
    setSubmitting(true);

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await api.post(`/attempts/${attemptId}/answer`, {
        questionId: question.id,
        selectedOptionIds: selected,
        openText: openText || undefined,
        timeSpent,
      });
    } catch {}
    setSubmitting(false);
  }, [answered, submitting, question, selected, openText, attemptId]);

  const handleNext = async () => {
    if (!answered) await handleSubmitAnswer();

    if (currentIdx + 1 < (quiz?.questions.length ?? 0)) {
      setCurrentIdx(i => i + 1);
    } else {
      // finish
      try {
        const res = await api.post(`/attempts/${attemptId}/finish`);
        router.replace(`/${locale}/results/${attemptId}`);
      } catch {
        router.replace(`/${locale}/results/${attemptId}`);
      }
    }
  };

  const toggleOption = (optId: string) => {
    if (answered) return;
    if (question?.type === 'single' || question?.type === 'truefalse') {
      setSelected([optId]);
    } else {
      setSelected(prev => prev.includes(optId) ? prev.filter(o => o !== optId) : [...prev, optId]);
    }
  };

  if (loading || !quiz || !question) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      </div>
    );
  }

  const progress = ((currentIdx) / quiz.questions.length) * 100;
  const isLast = currentIdx + 1 === quiz.questions.length;

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-black/20 px-6 py-3 flex items-center gap-4">
        <span className="text-sm text-gray-400">{quiz.title}</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-sm text-gray-400">{currentIdx + 1}/{quiz.questions.length}</span>
        {question.timeLimit > 0 && (
          <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-sm font-bold ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
            <Clock className="h-3.5 w-3.5" />
            {timeLeft}s
          </div>
        )}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question text */}
              <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm text-gray-500 mb-2">{question.points} point{question.points !== 1 ? 's' : ''}</p>
                <p className="text-xl font-bold text-white leading-snug">{question.text}</p>
              </div>

              {/* Answer options */}
              {question.type === 'open' ? (
                <textarea
                  value={openText}
                  onChange={e => setOpenText(e.target.value)}
                  disabled={answered}
                  placeholder="Type your answer..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500 transition resize-none h-32 disabled:opacity-60"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.answerOptions.map((opt, oi) => {
                    const isSelected = selected.includes(opt.id);
                    return (
                      <motion.button
                        key={opt.id}
                        whileHover={!answered ? { scale: 1.02 } : {}}
                        whileTap={!answered ? { scale: 0.98 } : {}}
                        onClick={() => toggleOption(opt.id)}
                        disabled={answered}
                        className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                        } disabled:cursor-default`}
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${COLORS[oi % 4]}`}>
                          {LABELS[oi % 4]}
                        </span>
                        <span className="font-medium">{opt.text}</span>
                        {isSelected && <CheckCircle className="ml-auto h-5 w-5 text-violet-400 flex-shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Next button */}
              <div className="mt-8 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleNext}
                  disabled={submitting || (!answered && selected.length === 0 && !openText && question.type !== 'open')}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-3 font-bold text-white shadow-lg shadow-violet-500/25 disabled:opacity-50 transition"
                >
                  {isLast ? 'Finish' : 'Next'}
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
