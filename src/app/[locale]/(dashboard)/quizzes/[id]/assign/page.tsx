'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Calendar, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface Class { id: string; name: string; }

export default function AssignQuizPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/quizzes/${id}`),
      api.get('/classes'),
    ]).then(([qRes, cRes]) => {
      setQuizTitle(qRes.data.title);
      setClasses(cRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const toggle = (classId: string) => {
    setSelected(prev => prev.includes(classId) ? prev.filter(c => c !== classId) : [...prev, classId]);
  };

  const handleAssign = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      await api.post('/assignments', {
        quizId: id,
        classIds: selected,
        deadline: deadline || undefined,
      });
      router.push(`/${locale}/quizzes/${id}`);
    } catch {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Assign Quiz</h1>
          <p className="text-sm text-gray-400">{quizTitle}</p>
        </div>
      </div>

      {/* Classes */}
      <div className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <Users className="h-4 w-4 text-violet-400" /> Select Classes
        </h2>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-sm">No classes yet. Create a class first.</p>
        ) : (
          <div className="space-y-2">
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => toggle(cls.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selected.includes(cls.id)
                    ? 'border-violet-500 bg-violet-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition ${selected.includes(cls.id) ? 'border-violet-500 bg-violet-500' : 'border-gray-600'}`}>
                  {selected.includes(cls.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="font-medium">{cls.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Deadline */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <Calendar className="h-4 w-4 text-violet-400" /> Deadline (optional)
        </h2>
        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition [color-scheme:dark]"
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handleAssign}
        disabled={!selected.length || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-50 transition"
      >
        <Send className="h-4 w-4" />
        {saving ? 'Assigning...' : `Assign to ${selected.length} class${selected.length !== 1 ? 'es' : ''}`}
      </motion.button>
    </div>
  );
}
