'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Plus, Tag } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  questions?: any[];
}

const statusColors: Record<string, string> = {
  draft: 'text-yellow-400 bg-yellow-400/10',
  published: 'text-emerald-400 bg-emerald-400/10',
  archived: 'text-gray-400 bg-gray-400/10',
};

export default function QuizzesPage() {
  const tQuiz = useTranslations('quiz');
  const t = useTranslations('quizzes');
  const { locale } = useParams();
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    api.get('/quizzes').then((res) => setQuizzes(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        {isTeacher && (
          <motion.a href={`/${locale}/quizzes/create`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <Plus className="h-4 w-4" /> {tQuiz('create')}
          </motion.a>
        )}
      </div>

      {loading ? (
        <div className="flex gap-2 justify-center py-12">
          {[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <BookOpen className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-gray-400">{isTeacher ? t('noQuizzesTeacher') : t('noQuizzesStudent')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz, i) => (
            <motion.a key={quiz.id} href={`/${locale}/quizzes/${quiz.id}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, y: -3 }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-violet-500/40 transition-all cursor-pointer">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[quiz.status] || ''}`}>
                  {tQuiz(quiz.status as any)}
                </span>
              </div>
              <h3 className="font-semibold text-white group-hover:text-violet-300 transition">{quiz.title}</h3>
              {quiz.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{quiz.description}</p>}
              {quiz.category && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                  {quiz.category}
                </div>
              )}
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
