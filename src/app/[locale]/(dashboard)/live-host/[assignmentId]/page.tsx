'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play, ChevronRight, Trophy, StopCircle, Clock, QrCode } from 'lucide-react';
import { getLiveSocket, disconnectLiveSocket } from '@/lib/socket';
import { QRCodeSVG } from 'qrcode.react';

interface Player { name: string; score: number; }
interface LeaderboardEntry { rank: number; name: string; score: number; }
interface Question {
  id: string; text: string; type: string; timeLimit: number; points: number;
  index: number; total: number;
  answerOptions: { id: string; text: string }[];
}

type Phase = 'connecting' | 'lobby' | 'question' | 'results' | 'finished';

const COLORS = ['from-violet-600 to-purple-700', 'from-blue-600 to-cyan-700', 'from-emerald-600 to-teal-700', 'from-orange-600 to-red-700'];
const LABELS = ['A', 'B', 'C', 'D'];

export default function LiveHostPage() {
  const { assignmentId, locale } = useParams<{ assignmentId: string; locale: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('connecting');
  const [pin, setPin] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [hasMore, setHasMore] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getLiveSocket();

    socket.emit('host:create', { assignmentId });

    socket.on('host:created', ({ pin: p }: { pin: string }) => {
      setPin(p);
      setPhase('lobby');
    });

    socket.on('lobby:players', ({ players: p }: { players: Player[] }) => setPlayers(p));
    socket.on('host:playerJoined', ({ count }: { count: number }) => {});

    socket.on('host:answerCount', (data: { answered: number; total: number }) => {
      setAnswerCount(data);
    });

    socket.on('question:results', ({ correctOptionIds: ids, leaderboard: lb }: any) => {
      setCorrectOptionIds(ids);
      setLeaderboard(lb);
      setPhase('results');
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('host:questionDone', ({ leaderboard: lb, hasMore: more }: any) => {
      setLeaderboard(lb);
      setHasMore(more);
    });

    socket.on('game:finished', ({ leaderboard: lb }: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(lb);
      setPhase('finished');
    });

    socket.on('error', ({ message }: { message: string }) => {
      alert(message);
      router.back();
    });

    return () => {
      socket.off('host:created');
      socket.off('lobby:players');
      socket.off('host:playerJoined');
      socket.off('host:answerCount');
      socket.off('question:results');
      socket.off('host:questionDone');
      socket.off('game:finished');
      socket.off('error');
      disconnectLiveSocket();
    };
  }, [assignmentId]);

  const startQuestion = () => {
    const socket = getLiveSocket();
    socket.emit('host:startQuestion', { pin });
    setAnswerCount({ answered: 0, total: players.length });
    setCorrectOptionIds([]);

    // Listen for question:start here to get question data for host too
    socket.once('question:start', (q: Question) => {
      setQuestion(q);
      setPhase('question');
      setTimeLeft(q.timeLimit);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    });
  };

  const endQuestion = () => {
    getLiveSocket().emit('host:endQuestion', { pin });
  };

  const nextQuestion = () => {
    getLiveSocket().emit('host:nextQuestion', { pin });
    if (hasMore) setPhase('lobby');
  };

  const endGame = () => {
    getLiveSocket().emit('host:nextQuestion', { pin }); // will trigger finish if no more
  };

  if (phase === 'connecting') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="h-3 w-3 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      <p className="text-gray-400">Creating live session...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-black/30 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">PIN</p>
            <p className="text-3xl font-black text-white tracking-widest font-mono">{pin}</p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-white">{players.length}</span>
            <span className="text-sm">players</span>
          </div>
        </div>
        {phase === 'question' && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
            <Clock className="h-4 w-4" />
            {timeLeft}s
          </div>
        )}
        <button onClick={() => { disconnectLiveSocket(); router.back(); }} className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition">
          <StopCircle className="h-4 w-4" /> End Game
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">

          {/* LOBBY */}
          {phase === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <div className="flex gap-8 items-start justify-center">
                {/* QR + PIN */}
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-2xl bg-white p-4">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/live?pin=${pin}`}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">PIN Code</p>
                    <p className="text-5xl font-black text-white tracking-widest font-mono">{pin}</p>
                    <p className="text-xs text-gray-500 mt-1">or scan QR to join</p>
                  </div>
                </div>

                {/* Players + Start */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">{players.length} players joined</span>
                  </div>
                  {players.length > 0 ? (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {players.map(p => (
                        <motion.span key={p.name} initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white">{p.name}</motion.span>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-6 text-gray-500 text-sm">Students join at <b className="text-gray-300">/live</b> using the PIN or QR code</p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={startQuestion}
                    disabled={players.length === 0}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-violet-500/30 disabled:opacity-40 transition"
                  >
                    <Play className="h-5 w-5" />
                    {players.length === 0 ? 'Waiting for players...' : 'Start!'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* QUESTION */}
          {phase === 'question' && question && (
            <motion.div key="question" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-500 mb-2">Question {question.index + 1} of {question.total}</p>
                <p className="text-2xl font-bold text-white">{question.text}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {question.answerOptions.map((opt, oi) => (
                  <div key={opt.id} className={`flex items-center gap-4 rounded-2xl bg-gradient-to-br ${COLORS[oi % 4]} p-5`}>
                    <span className="text-2xl font-black text-white">{LABELS[oi % 4]}</span>
                    <span className="font-semibold text-white text-lg">{opt.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-gray-400">
                  <span className="text-2xl font-bold text-white">{answerCount.answered}</span>/{answerCount.total} answered
                </div>
                <button onClick={endQuestion} className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition">
                  Show Results <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {phase === 'results' && question && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <p className="text-center text-xl font-bold text-white mb-6">Correct Answer:</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {question.answerOptions.map((opt, oi) => {
                  const isCorrect = correctOptionIds.includes(opt.id);
                  return (
                    <div key={opt.id} className={`flex items-center gap-4 rounded-2xl p-5 border-2 transition ${isCorrect ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/10 bg-white/5 opacity-50'}`}>
                      <span className={`text-2xl font-black ${isCorrect ? 'text-emerald-300' : 'text-white'}`}>{LABELS[oi % 4]}</span>
                      <span className="font-semibold text-white text-lg">{opt.text}</span>
                      {isCorrect && <span className="ml-auto text-emerald-400 text-2xl">✓</span>}
                    </div>
                  );
                })}
              </div>

              <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-4 font-semibold text-white flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" /> Leaderboard</h3>
                <motion.ul layout className="space-y-2">
                  <AnimatePresence>
                    {leaderboard.slice(0, 5).map(p => (
                      <motion.li
                        key={p.name}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={`flex items-center justify-between rounded-xl px-4 py-2 ${p.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5'}`}
                      >
                        <span className={`w-6 font-bold ${p.rank === 1 ? 'text-yellow-400' : 'text-gray-400'}`}>#{p.rank}</span>
                        <span className="flex-1 font-medium text-white">{p.name}</span>
                        <motion.span
                          key={`${p.name}-${p.score}`}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="font-bold text-violet-400"
                        >{p.score}</motion.span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </div>

              <div className="flex justify-center">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={nextQuestion}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-10 py-4 text-lg font-bold text-white shadow-xl">
                  {hasMore ? (<><ChevronRight className="h-5 w-5" /> Next Question</>) : (<><Trophy className="h-5 w-5" /> Finish Game</>)}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* FINISHED */}
          {phase === 'finished' && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <h1 className="mb-8 text-3xl font-black text-white">Game Over!</h1>
              <div className="space-y-3 mb-8">
                {leaderboard.slice(0, 10).map(p => (
                  <div key={p.name} className={`flex items-center justify-between rounded-2xl px-6 py-4 ${p.rank === 1 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10'}`}>
                    <span className={`w-8 text-lg font-black ${p.rank === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>#{p.rank}</span>
                    <span className="flex-1 text-left font-semibold text-white">{p.name}</span>
                    <span className={`font-black text-xl ${p.rank === 1 ? 'text-yellow-400' : 'text-violet-400'}`}>{p.score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => router.back()} className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-3 font-bold text-white">
                Back
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
