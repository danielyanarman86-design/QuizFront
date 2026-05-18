'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Play, Clock, Radio, BarChart2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Assignment {
  id: string;
  quiz: { id: string; title: string; description?: string; questions?: any[] };
  deadline?: string;
  assignedAt: string;
}

export default function AssignmentsPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get('/assignments')
      .then(res => setAssignments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isOverdue = (deadline?: string) => deadline ? new Date(deadline) < new Date() : false;

  const handleStart = async (assignmentId: string, deadline?: string) => {
    if (isOverdue(deadline)) return;
    setStarting(assignmentId);
    try {
      const res = await api.post('/attempts/start', { assignmentId });
      router.push(`/${locale}/play/${res.data.id}`);
    } catch {
      setStarting(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-2xl font-bold text-white">
        My Assignments
      </motion.h1>

      {loading ? (
        <div className="flex gap-2 justify-center py-20">
          {[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <BookOpen className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No quizzes assigned yet.</p>
          <p className="mt-1 text-sm text-gray-500">Ask your teacher to assign a quiz to your class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1">{a.quiz?.title}</h3>
              {a.quiz?.description && <p className="text-sm text-gray-500 mb-2">{a.quiz.description}</p>}

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                {a.quiz?.questions && (
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {a.quiz.questions.length} questions</span>
                )}
                {a.deadline && (
                  <span className="flex items-center gap-1 text-yellow-500"><Clock className="h-3 w-3" /> Due {new Date(a.deadline).toLocaleDateString()}</span>
                )}
              </div>

              <div className="mt-auto flex gap-2">
                {user?.role === 'student' ? (
                  isOverdue(a.deadline) ? (
                    <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400">
                      <Clock className="h-4 w-4" />
                      Overdue
                    </div>
                  ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleStart(a.id, a.deadline)}
                    disabled={starting === a.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60 transition"
                  >
                    <Play className="h-4 w-4" />
                    {starting === a.id ? 'Starting...' : 'Start'}
                  </motion.button>
                  )
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => router.push(`/${locale}/live-host/${a.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-lg transition"
                    >
                      <Radio className="h-4 w-4" />
                      Live
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => router.push(`/${locale}/assignments/${a.id}/results`)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-gray-300 hover:border-violet-500/50 hover:text-white transition"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
