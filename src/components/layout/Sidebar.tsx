'use client';

import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, BarChart3,
  User, LogOut, Zap, ClipboardList, History,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';

export function Sidebar() {
  const t = useTranslations('dashboard');
  const { locale } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const isTeacher = user?.role === 'teacher';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isTeacher || !user) return;
    const fetchPending = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const token = useAuthStore.getState().token;
        const { data } = await axios.get(`${api}/users/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingCount(data.stats?.pendingAssignments ?? 0);
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isTeacher, user]);

  const links = [
    { href: `/${locale}/dashboard`, label: t('welcome'), icon: LayoutDashboard, roles: ['teacher', 'student'] },
    { href: `/${locale}/classes`, label: t('myClasses'), icon: Users, roles: ['teacher', 'student'] },
    { href: `/${locale}/quizzes`, label: t('myQuizzes'), icon: BookOpen, roles: ['teacher'] },
    { href: `/${locale}/assignments`, label: t('assignments'), icon: ClipboardList, roles: ['teacher', 'student'] },
    { href: `/${locale}/live-history`, label: t('liveHistory'), icon: History, roles: ['teacher'] },
    { href: `/${locale}/statistics`, label: t('statistics'), icon: BarChart3, roles: ['teacher', 'student'] },
    { href: `/${locale}/profile`, label: t('profile'), icon: User, roles: ['teacher', 'student'] },
  ].filter((l) => l.roles.includes(user?.role || ''));

  const handleLogout = () => {
    clearAuth();
    router.push(`/${locale}/login`);
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/10 bg-[#0d0d1a] fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-black text-white text-sm">QuizRush</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <motion.a
              key={link.href}
              href={link.href}
              whileHover={{ x: 4 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-violet-600/20 to-blue-600/20 text-white border border-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <link.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-violet-400' : ''}`} />
              <span className="flex-1">{link.label}</span>
              {link.href.includes('/assignments') && !isTeacher && pendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-xs font-bold text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </motion.a>
          );
        })}
      </nav>

      {/* Locale Switcher */}
      <div className="px-4 pb-2 flex justify-center">
        <LocaleSwitcher />
      </div>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
            >
              {user.avatar
                ? <img src={user.avatar} className="h-8 w-8 rounded-full object-cover" />
                : getInitials(user.firstName, user.lastName)
              }
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          {useTranslations('auth')('logout')}
        </button>
      </div>
    </aside>
  );
}
