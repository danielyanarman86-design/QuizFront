'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { User, Mail, Globe, Save, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { getInitials } from '@/lib/utils';

type Toast = { type: 'success' | 'error'; message: string } | null;

export default function ProfilePage() {
  const t = useTranslations();
  const { user, setAuth, token } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    preferredLocale: user?.preferredLocale || 'hy',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me', form);
      setAuth(res.data, token!);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('error', 'New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast('success', 'Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl ${
            toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </motion.div>
      )}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-2xl font-bold text-white"
      >
        {t('dashboard.profile')}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
      >
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black text-white"
            style={{ backgroundColor: user.avatarColor || '#6366f1' }}
          >
            {user.avatar
              ? <img src={user.avatar} className="h-20 w-20 rounded-2xl object-cover" />
              : getInitials(user.firstName, user.lastName)
            }
          </div>
          <div>
            <p className="text-xl font-bold text-white">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300 capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm text-gray-400">
                <User className="h-3.5 w-3.5" /> {t('auth.firstName')}
              </label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm text-gray-400">
                <User className="h-3.5 w-3.5" /> {t('auth.lastName')}
              </label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm text-gray-400">
              <Mail className="h-3.5 w-3.5" /> {t('auth.email')}
            </label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm text-gray-400">
              <Globe className="h-3.5 w-3.5" /> Language
            </label>
            <select
              value={form.preferredLocale}
              onChange={(e) => setForm({ ...form, preferredLocale: e.target.value as any })}
              className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
            >
              <option value="hy">Հայերեն</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-semibold text-white transition-all ${
              saved
                ? 'bg-emerald-600'
                : 'bg-gradient-to-r from-violet-600 to-blue-600 shadow-lg shadow-violet-500/25'
            } disabled:opacity-60`}
          >
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : saving ? '...' : t('common.save')}
          </motion.button>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Lock className="h-4 w-4 text-violet-400" />
          Change Password
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
            <div key={field}>
              <label className="mb-1.5 block text-sm text-gray-400 capitalize">
                {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                value={pwForm[field]}
                onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-violet-500 transition"
              />
            </div>
          ))}
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={savingPw}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 font-semibold text-white hover:bg-white/10 disabled:opacity-60 transition"
          >
            <Lock className="h-4 w-4" />
            {savingPw ? 'Saving...' : 'Change Password'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
