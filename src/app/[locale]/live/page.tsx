'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Hash, CheckCircle, Trophy, Clock, WifiOff } from 'lucide-react';
import { getLiveSocket, disconnectLiveSocket } from '@/lib/socket';
import { sounds } from '@/lib/sounds';
import { useAuthStore } from '@/store/auth.store';

type Phase = 'entry' | 'lobby' | 'question' | 'answered' | 'results' | 'finished';

interface Question {
  id: string; text: string; type: string; timeLimit: number; points: number;
  index: number; total: number;
  answerOptions: { id: string; text: string }[];
}
interface LeaderboardEntry { rank: number; name: string; score: number; }

const COLORS = [
  'from-violet-600 to-purple-700 border-violet-500',
  'from-blue-600 to-cyan-700 border-blue-500',
  'from-emerald-600 to-teal-700 border-emerald-500',
  'from-orange-600 to-red-700 border-orange-500',
];
const LABELS = ['A', 'B', 'C', 'D'];
const LS_KEY = 'quizrush_live_session';

function saveSession(pin: string, name: string, score: number) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ pin, name, score, ts: Date.now() })); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}
function loadSession(): { pin: string; name: string; score: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 2 hours
    if (Date.now() - data.ts > 2 * 60 * 60 * 1000) { localStorage.removeItem(LS_KEY); return null; }
    return data;
  } catch { return null; }
}

export default function LivePage() {
  const { locale } = useParams<{ locale: string }>();
  const authUser = useAuthStore(s => s.user);

  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('entry');
  const [players, setPlayers] = useState<{ name: string }[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pinRef = useRef('');
  const nameRef = useRef('');

  // On mount: check for saved session to auto-reconnect
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setPin(saved.pin);
      setName(saved.name);
      setScore(saved.score);
      setReconnecting(true);
    }
  }, []);

  const setupSocketListeners = (socket: ReturnType<typeof getLiveSocket>, currentPin: string, currentName: string) => {
    pinRef.current = currentPin;
    nameRef.current = currentName;

    socket.off('player:joined');
    socket.off('lobby:players');
    socket.off('question:start');
    socket.off('question:waiting');
    socket.off('player:answerResult');
    socket.off('question:results');
    socket.off('game:finished');
    socket.off('error');

    socket.on('player:joined', () => {
      saveSession(currentPin, currentName, 0);
      setPhase('lobby');
      setReconnecting(false);
    });

    socket.on('lobby:players', ({ players: p }: any) => setPlayers(p));

    socket.on('question:start', (q: Question) => {
      setQuestion(q);
      setSelected([]);
      setIsCorrect(null);
      setPhase('question');
      setTimeLeft(q.timeLimit);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
          if (prev <= 6) sounds.tick();
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('question:waiting', () => setPhase('lobby'));

    socket.on('player:answerResult', ({ isCorrect: ic, score: s }: any) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsCorrect(ic);
      setScore(s);
      saveSession(pinRef.current, nameRef.current, s);
      if (ic) sounds.correct(); else sounds.wrong();
      setPhase('answered');
    });

    socket.on('question:results', ({ correctOptionIds: ids, leaderboard: lb }: any) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCorrectOptionIds(ids);
      setLeaderboard(lb);
      setPhase('results');
    });

    socket.on('game:finished', ({ leaderboard: lb }: any) => {
      clearSession();
      setLeaderboard(lb);
      sounds.gameOver();
      setPhase('finished');
    });

    socket.on('error', ({ message }: any) => {
      clearSession();
      setError(message);
      setPhase('entry');
      setReconnecting(false);
      disconnectLiveSocket();
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !name) return;
    setError('');
    const socket = getLiveSocket();
    setupSocketListeners(socket, pin, name);
    socket.emit('player:join', { pin, name, userId: authUser?.id });
  };

  const handleReconnect = () => {
    const saved = loadSession();
    if (!saved) return;
    setError('');
    const socket = getLiveSocket();
    setupSocketListeners(socket, saved.pin, saved.name);
    socket.emit('player:join', { pin: saved.pin, name: saved.name, userId: authUser?.id });
  };

  const handleAnswer = (optId: string) => {
    if (phase !== 'question' || !question) return;
    let newSelected: string[];
    if (question.type === 'single' || question.type === 'truefalse') {
      newSelected = [optId];
    } else {
      newSelected = selected.includes(optId) ? selected.filter(o => o !== optId) : [...selected, optId];
    }
    setSelected(newSelected);

    if (question.type === 'single' || question.type === 'truefalse') {
      getLiveSocket().emit('player:answer', { pin, questionIndex: question.index, selectedOptionIds: newSelected });
      setPhase('answered');
    }
  };

  const submitMultiple = () => {
    if (!question || !selected.length) return;
    getLiveSocket().emit('player:answer', { pin, questionIndex: question.index, selectedOptionIds: selected });
    setPhase('answered');
  };

  const handlePlayAgain = () => {
    clearSession();
    disconnectLiveSocket();
    setPhase('entry');
    setPin('');
    setName('');
    setScore(0);
    setReconnecting(false);
  };

  if (phase === 'entry') return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: 'backOut' }} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(139,92,246,0.4)', '0 0 60px rgba(139,92,246,0.7)', '0 0 20px rgba(139,92,246,0.4)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600"
          >
            <Zap className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">QuizRush Live</h1>
        </div>

        {/* Reconnect banner */}
        {reconnecting && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">Session found</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">PIN: <b className="text-white">{pin}</b> · Name: <b className="text-white">{name}</b></p>
            <div className="flex gap-2">
              <button onClick={handleReconnect}
                className="flex-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/30 transition">
                Rejoin Game
              </button>
              <button onClick={() => { clearSession(); setReconnecting(false); setPin(''); setName(''); }}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 transition">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">PIN Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-center text-2xl font-black tracking-widest text-white placeholder-gray-600 outline-none focus:border-violet-500 transition" />
              </div>
              <div className="mt-2 flex justify-center gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`h-1 w-8 rounded-full transition-all ${i < pin.length ? 'bg-violet-500' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">{error}</p>}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
              disabled={pin.length !== 6 || !name}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 font-bold text-white text-lg shadow-lg disabled:opacity-50 transition">
              Join Game!
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );

  if (phase === 'lobby') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f1a] p-8 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600">
        <Zap className="h-8 w-8 text-white" />
      </motion.div>
      <h2 className="mb-2 text-2xl font-bold text-white">Welcome, {name}!</h2>
      <p className="text-gray-400 mb-8">Waiting for the teacher to start...</p>
      <div className="flex gap-2 justify-center">
        {[0,1,2].map(i => <div key={i} className="h-3 w-3 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
      </div>
      {players.length > 0 && (
        <p className="mt-8 text-sm text-gray-500">{players.length} player{players.length !== 1 ? 's' : ''} in room</p>
      )}
    </div>
  );

  if ((phase === 'question' || phase === 'answered') && question) return (
    <div className="min-h-screen flex flex-col bg-[#0f0f1a]">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Q {question.index + 1}/{question.total}</span>
          <div className={`flex items-center gap-1 text-sm font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
            <Clock className="h-3.5 w-3.5" /> {timeLeft}s
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600 transition-all" style={{ width: `${((question.index) / question.total) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-xs text-gray-500 mb-1">{question.points} pt{question.points !== 1 ? 's' : ''}</p>
            <p className="text-xl font-bold text-white">{question.text}</p>
          </div>

          {phase === 'answered' ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border p-8 text-center ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
              <div className="text-5xl mb-3">{isCorrect ? '✓' : '✗'}</div>
              <p className={`text-xl font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrect ? 'Correct!' : 'Wrong!'}
              </p>
              <p className="mt-2 text-gray-400">Score: <span className="font-bold text-white">{score}</span></p>
              <p className="mt-4 text-sm text-gray-500">Waiting for others...</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {question.answerOptions.map((opt, oi) => {
                  const isSelected = selected.includes(opt.id);
                  return (
                    <motion.button key={opt.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(opt.id)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-gradient-to-br p-6 transition-all ${COLORS[oi % 4]} ${isSelected ? 'ring-4 ring-white/40' : ''}`}>
                      <span className="text-3xl font-black text-white">{LABELS[oi % 4]}</span>
                      <span className="text-center font-semibold text-white text-sm">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>
              {question.type === 'multiple' && selected.length > 0 && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={submitMultiple}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 font-bold text-white">
                  Submit ({selected.length} selected)
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (phase === 'results' && question) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f1a] p-6">
      <p className="mb-4 text-gray-400 text-sm">Correct Answer:</p>
      <div className="w-full max-w-lg space-y-3 mb-8">
        {question.answerOptions.map((opt, oi) => {
          const isCorrectOpt = correctOptionIds.includes(opt.id);
          const wasSelected = selected.includes(opt.id);
          return (
            <div key={opt.id} className={`flex items-center gap-4 rounded-2xl border-2 p-4 ${isCorrectOpt ? 'border-emerald-400 bg-emerald-500/15' : wasSelected ? 'border-red-400 bg-red-500/10 opacity-60' : 'border-white/10 bg-white/5 opacity-40'}`}>
              <span className={`text-2xl font-black ${isCorrectOpt ? 'text-emerald-300' : 'text-white'}`}>{LABELS[oi % 4]}</span>
              <span className="font-medium text-white">{opt.text}</span>
              {isCorrectOpt && <CheckCircle className="ml-auto h-5 w-5 text-emerald-400" />}
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><Trophy className="h-4 w-4 text-yellow-400" /> Leaderboard</h3>
        <motion.ul layout className="space-y-1">
          <AnimatePresence>
            {leaderboard.slice(0, 5).map(p => (
              <motion.li
                key={p.name}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${p.name === name ? 'bg-violet-500/15 border border-violet-500/30' : 'bg-white/5'}`}
              >
                <span className={`w-8 font-bold text-sm ${p.rank === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>#{p.rank}</span>
                <span className={`flex-1 font-medium text-sm ${p.name === name ? 'text-violet-400' : 'text-white'}`}>{p.name} {p.name === name && '(you)'}</span>
                <motion.span
                  key={`${p.name}-${p.score}`}
                  initial={{ scale: 1.4, color: '#a78bfa' }}
                  animate={{ scale: 1, color: '#8b5cf6' }}
                  className="font-bold text-sm text-violet-400"
                >{p.score}</motion.span>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>
      <p className="mt-6 text-gray-500 text-sm">Waiting for next question...</p>
    </div>
  );

  if (phase === 'finished') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f1a] p-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-500 to-orange-500">
        <Trophy className="h-12 w-12 text-white" />
      </motion.div>
      <h1 className="mb-2 text-3xl font-black text-white">Game Over!</h1>
      {leaderboard.find(p => p.name === name) && (
        <p className="mb-8 text-lg text-gray-400">
          Your rank: <span className="font-bold text-white">#{leaderboard.find(p => p.name === name)?.rank}</span> — Score: <span className="font-bold text-violet-400">{leaderboard.find(p => p.name === name)?.score}</span>
        </p>
      )}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {leaderboard.slice(0, 10).map(p => (
          <div key={p.name} className={`flex items-center justify-between rounded-2xl px-6 py-4 ${p.name === name ? 'border border-violet-500/50 bg-violet-500/10' : 'bg-white/5'}`}>
            <span className={`w-8 font-bold ${p.rank <= 3 ? 'text-yellow-400' : 'text-gray-500'}`}>#{p.rank}</span>
            <span className={`flex-1 text-left font-semibold ${p.name === name ? 'text-violet-300' : 'text-white'}`}>{p.name}</span>
            <span className="font-black text-violet-400">{p.score}</span>
          </div>
        ))}
      </div>
      <button onClick={handlePlayAgain}
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-3 font-bold text-white">
        Play Again
      </button>
    </div>
  );

  return null;
}
