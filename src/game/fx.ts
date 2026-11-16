import confetti from 'canvas-confetti';
import { useStore } from './store';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

export function confettiBurst(kind: 'small' | 'big' | 'perfect' = 'small'): void {
  if (prefersReducedMotion()) return;
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 60 };
  if (kind === 'small') {
    confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38, origin: { y: 0.7 } });
    return;
  }
  confetti({ ...base, particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.6 } });
  if (kind === 'perfect') {
    const end = Date.now() + 1600;
    const frame = () => {
      confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
      confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  } else {
    setTimeout(() => confetti({ ...base, particleCount: 80, spread: 120, origin: { x: 0.5, y: 0.5 } }), 250);
  }
}

// ---------- tiny WebAudio synth (no audio files) ----------
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export type Sfx = 'correct' | 'wrong' | 'accepted' | 'fail' | 'hint' | 'complete' | 'tick';

export function playSfx(kind: Sfx): void {
  if (!useStore.getState().settings.sound) return;
  switch (kind) {
    case 'tick':
      tone(880, 0, 0.05, 'triangle', 0.03);
      break;
    case 'correct':
      tone(660, 0, 0.12, 'triangle');
      tone(990, 0.08, 0.18, 'triangle');
      break;
    case 'wrong':
      tone(220, 0, 0.18, 'sawtooth', 0.04);
      tone(180, 0.1, 0.22, 'sawtooth', 0.04);
      break;
    case 'hint':
      tone(520, 0, 0.12, 'sine', 0.05);
      break;
    case 'fail':
      tone(300, 0, 0.15, 'square', 0.03);
      tone(240, 0.12, 0.2, 'square', 0.03);
      break;
    case 'accepted':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle'));
      break;
    case 'complete':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.07));
      tone(262, 0, 0.9, 'sine', 0.05);
      break;
  }
}
