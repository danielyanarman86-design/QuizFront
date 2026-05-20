'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save,
  ArrowLeft, Check, Shuffle,
} from 'lucide-react';
import { api } from '@/lib/api';

type QuestionType = 'single' | 'multiple' | 'truefalse' | 'open';

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  type: QuestionType;
  timeLimit: number | null;
  points: number;
  options: AnswerOption[];
}

const defaultQuestion = (): Question => ({
  text: '',
  type: 'single',
  timeLimit: 30,
  points: 1,
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

const optionColors = [
  'from-violet-600 to-violet-700',
  'from-blue-600 to-blue-700',
  'from-emerald-600 to-emerald-700',
  'from-orange-600 to-orange-700',
];

export default function CreateQuizPage() {
  const { locale } = useParams();
  const router = useRouter();
  const t = useTranslations('createQuiz');
  const tCommon = useTranslations('common');

  const typeLabels: Record<QuestionType, string> = {
    single: t('typeSingle'),
    multiple: t('typeMultiple'),
    truefalse: t('typeTrueFalse'),
    open: t('typeOpen'),
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [showAnswerAfter, setShowAnswerAfter] = useState<'question' | 'end'>('end');
  const [maxAttempts, setMaxAttempts] = useState(1);

  const [questions, setQuestions] = useState<Question[]>([defaultQuestion()]);
  const [openIndex, setOpenIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateQuestion = (i: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };

  const updateOption = (qi: number, oi: number, patch: Partial<AnswerOption>) => {
    setQuestions((prev) => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const options = q.options.map((o, oidx) => oidx === oi ? { ...o, ...patch } : o);
      return { ...q, options };
    }));
  };

  const toggleCorrect = (qi: number, oi: number) => {
    const q = questions[qi];
    if (q.type === 'single' || q.type === 'truefalse') {
      updateQuestion(qi, { options: q.options.map((o, idx) => ({ ...o, isCorrect: idx === oi })) });
    } else {
      updateOption(qi, oi, { isCorrect: !q.options[oi].isCorrect });
    }
  };

  const changeType = (qi: number, type: QuestionType) => {
    const defaults: Record<QuestionType, AnswerOption[]> = {
      single: [
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
      ],
      multiple: [
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
      ],
      truefalse: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: false },
      ],
      open: [],
    };
    updateQuestion(qi, { type, options: defaults[type] });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, defaultQuestion()]);
    setOpenIndex(questions.length);
  };

  const removeQuestion = (i: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
    setOpenIndex(Math.max(0, i - 1));
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError(t('titleRequired')); return; }
    if (questions.some((q) => !q.text.trim())) { setError(t('allQuestionsMustHaveText')); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title, description, category, isPublic, status,
        settings: { shuffleQuestions, shuffleAnswers, showAnswerAfter, maxAttempts },
        questions: questions.map((q, order) => ({
          text: q.text, type: q.type, timeLimit: q.timeLimit, points: q.points, order,
          answerOptions: q.options.map((o, oOrder) => ({ text: o.text, isCorrect: o.isCorrect, order: oOrder })),
        })),
      };
      await api.post('/quizzes', payload);
      router.push(`/${locale}/quizzes`);
    } catch (e: any) {
      setError(e.response?.data?.message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-gray-400">{t('titleLabel')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-400">{t('description')}</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-400">{t('category')}</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('categoryPlaceholder')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('shuffleQuestions'), value: shuffleQuestions, set: setShuffleQuestions },
            { label: t('shuffleAnswers'), value: shuffleAnswers, set: setShuffleAnswers },
            { label: t('publicLibrary'), value: isPublic, set: setIsPublic },
          ].map((s) => (
            <button key={s.label} type="button" onClick={() => s.set(!s.value)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                s.value ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}>
              <Shuffle className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">{t('attempts')}</label>
            <select value={maxAttempts} onChange={(e) => setMaxAttempts(+e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-[#1a1a2e] px-2 py-2 text-xs text-white outline-none">
              {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{t('showAnswersAfter')}</span>
          {(['question', 'end'] as const).map((v) => (
            <button key={v} onClick={() => setShowAnswerAfter(v)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                showAnswerAfter === v
                  ? 'bg-violet-500/20 border border-violet-500 text-violet-300'
                  : 'border border-white/10 text-gray-400 hover:text-white'
              }`}>
              {v === 'question' ? t('eachQuestion') : t('endOfQuiz')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {questions.map((q, qi) => (
          <motion.div key={qi} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div onClick={() => setOpenIndex(openIndex === qi ? -1 : qi)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white">
                  {qi + 1}
                </span>
                <span className={`text-sm font-medium truncate ${q.text ? 'text-white' : 'text-gray-500'}`}>
                  {q.text || t('questionPlaceholder')}
                </span>
                <span className="flex-shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs text-gray-400">
                  {typeLabels[q.type]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); removeQuestion(qi); }}
                  className="rounded-lg p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
                {openIndex === qi ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </div>

            <AnimatePresence>
              {openIndex === qi && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10 px-5 py-4 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t('typeLabel')}</label>
                      <select value={q.type} onChange={(e) => changeType(qi, e.target.value as QuestionType)}
                        className="rounded-xl border border-white/10 bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none">
                        {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t('timerLabel')}</label>
                      <select value={q.timeLimit ?? ''}
                        onChange={(e) => updateQuestion(qi, { timeLimit: e.target.value ? +e.target.value : null })}
                        className="rounded-xl border border-white/10 bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none">
                        <option value="">{tCommon('noLimit')}</option>
                        {[10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n}s</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t('points')}</label>
                      <input type="number" min={1} max={10} value={q.points}
                        onChange={(e) => updateQuestion(qi, { points: +e.target.value })}
                        className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-400">{t('questionLabel')}</label>
                    <textarea value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} rows={2}
                      placeholder={t('questionPlaceholder')}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition resize-none" />
                  </div>

                  {q.type !== 'open' && (
                    <div>
                      <label className="mb-2 block text-xs text-gray-400">{t('answerOptions')}</label>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${optionColors[oi % 4]} text-xs font-bold text-white`}>
                              {String.fromCharCode(65 + oi)}
                            </div>
                            <input value={opt.text} onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                              disabled={q.type === 'truefalse'}
                              placeholder={`${String.fromCharCode(65 + oi)}`}
                              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition disabled:opacity-50" />
                            <button onClick={() => toggleCorrect(qi, oi)}
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition ${
                                opt.isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 text-gray-500 hover:border-emerald-500/50 hover:text-emerald-500'
                              }`}>
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'open' && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-400">
                      {t('openTextHint')}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={addQuestion}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-4 text-sm text-gray-400 hover:border-violet-500/50 hover:text-violet-400 transition">
        <Plus className="h-4 w-4" />
        {t('addQuestion')}
      </motion.button>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </motion.p>
      )}

      <div className="flex gap-3">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => handleSave('draft')} disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition disabled:opacity-60">
          <Save className="h-4 w-4" />
          {t('saveAsDraft')}
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => handleSave('published')} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60">
          <Check className="h-4 w-4" />
          {saving ? tCommon('saving') : t('publishQuiz')}
        </motion.button>
      </div>
    </div>
  );
}
