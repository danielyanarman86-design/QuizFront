'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, Plus, Hash } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface Class {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  students?: any[];
}

export default function ClassesPage() {
  const t = useTranslations('dashboard');
  const { locale } = useParams();
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', form);
      setForm({ name: '', description: '' });
      setShowForm(false);
      fetchClasses();
    } catch {}
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes/join', { inviteCode });
      setInviteCode('');
      fetchClasses();
    } catch {}
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('myClasses')}</h1>
        {isTeacher && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create Class
          </motion.button>
        )}
      </div>

      {isTeacher && showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Class Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="rounded-xl bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-500 transition">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-6 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
          </div>
        </motion.form>
      )}

      {isStudent && (
        <form onSubmit={handleJoin} className="mb-6 flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-white outline-none focus:border-violet-500 transition" />
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white">Join Class</button>
        </form>
      )}

      {loading ? (
        <div className="flex gap-2 justify-center py-12">
          {[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Users className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-gray-400">{isTeacher ? 'No classes yet. Create your first class!' : 'You are not in any class yet. Enter an invite code.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, i) => (
            <motion.a
              key={cls.id}
              href={`/${locale}/classes/${cls.id}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, y: -3 }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-violet-500/40 transition-all cursor-pointer"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-violet-300 transition">{cls.name}</h3>
              {cls.description && <p className="mt-1 text-sm text-gray-500">{cls.description}</p>}
              {isTeacher && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">{cls.inviteCode}</span>
                </div>
              )}
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
