let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gainNode = c.createGain();
    osc.connect(gainNode);
    gainNode.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    gainNode.gain.setValueAtTime(gain, c.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sounds = {
  correct() {
    playTone(523, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150);
    setTimeout(() => playTone(784, 0.25, 'sine', 0.3), 300);
  },
  wrong() {
    playTone(300, 0.1, 'sawtooth', 0.2);
    setTimeout(() => playTone(250, 0.3, 'sawtooth', 0.2), 100);
  },
  tick() {
    playTone(880, 0.05, 'square', 0.05);
  },
  countdown() {
    playTone(660, 0.1, 'sine', 0.2);
  },
  gameOver() {
    const notes = [523, 494, 440, 392];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.4, 'sine', 0.3), i * 200));
  },
  join() {
    playTone(440, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(550, 0.15, 'sine', 0.15), 100);
  },
};
