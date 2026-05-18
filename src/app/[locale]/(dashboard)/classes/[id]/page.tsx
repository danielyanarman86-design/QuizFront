'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Hash, Trash2, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarColor?: string;
}

interface ClassDetail {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  students: Student[];
  teacher?: { firstName: string; lastName: string; email: string };
}

export default function ClassDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'superAdmin';

  useEffect(() => {
    api.get(`/classes/${id}`)
      .then(res => setCls(res.data))
      .catch(() => router.replace(`/${locale}/classes`))
      .finally(() => setLoading(false));
  }, [id]);

  const copyCode = () => {
    if (!cls) return;
    navigator.clipboard.writeText(cls.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this class?')) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${id}`);
      router.replace(`/${locale}/classes`);
    } catch {
      setDeleting(false);
    }
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

  if (!cls) return null;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{cls.name}</h1>
          {cls.description && <p className="mt-1 text-sm text-gray-400">{cls.description}</p>}
          {cls.teacher && (
            <p className="mt-1 text-xs text-gray-500">Teacher: {cls.teacher.firstName} {cls.teacher.lastName}</p>
          )}
        </div>
        {isTeacher && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      {/* Invite code (teachers only) */}
      {isTeacher && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
            <Hash className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-0.5">Invite Code — share with students</p>
            <p className="text-2xl font-black tracking-widest text-white font-mono">{cls.inviteCode}</p>
          </div>
          <button
            onClick={copyCode}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
              copied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Users className="h-4 w-4" />
        <span>{cls.students?.length ?? 0} student{cls.students?.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Students list */}
      <h2 className="mb-4 font-semibold text-white">Students</h2>

      {(!cls.students || cls.students.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No students yet</p>
          {isTeacher && (
            <p className="mt-1 text-sm text-gray-500">
              Share the code <span className="font-mono text-violet-400">{cls.inviteCode}</span> with your students
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {cls.students.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: student.avatarColor || '#6366f1' }}
              >
                {getInitials(student.firstName, student.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{student.email}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
