import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { DailySet } from '../content/schema';
import { dayNumber, localToday } from '../game/dates';
import { DAY_MAX, grade, stageMax, stageScore } from '../game/scoring';
import { shareText, stageEmoji } from '../game/share';
import type { DayRecord } from '../game/store';
import { SyncButton } from './SyncButton';
import { ScoreRing } from './ScoreRing';
import { Button, Card } from './ui';

const STAGE_LABEL = ['Starter', 'Easy', 'Medium', 'Hard', 'SWE'];

function useCountdown(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function ResultsPanel({ set, record, streak, onReview }: { set: DailySet; record: DayRecord; streak: number; onReview: (i: number) => void }) {
  const total = set.stages.reduce((n, _, i) => n + stageScore(set, i, record.stages[i]), 0);
  const g = grade(total);
  const countdown = useCountdown();
  const [copied, setCopied] = useState(false);
  const practice = record.mode === 'practice';

  const share = async () => {
    const text = shareText({
      set,
      dayKey: record.key,
      stages: record.stages,
      score: total,
      streak,
      practice,
    });
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Card className="mx-auto max-w-2xl overflow-hidden p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <motion.p initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-xs font-semibold tracking-widest text-muted uppercase">
          {practice ? `Practice · Day ${dayNumber(record.setDate)} cleared` : `Day ${dayNumber(record.key)} cleared · you reached ${total} km`}
        </motion.p>
        <div className="mt-5">
          <ScoreRing score={total} max={DAY_MAX} />
        </div>
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 300, damping: 15 }}
          className="mt-4 font-display text-2xl font-semibold"
        >
          {g.emoji} {g.label}
        </motion.p>
        {!practice && streak > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-warn/10 px-3 py-1 text-sm font-semibold text-warn"
          >
            <span className="animate-flicker inline-block">🔥</span> {streak}-day streak
          </motion.p>
        )}
      </div>

      <ul className="mt-7 grid grid-cols-5 gap-2">
        {set.stages.map((_, i) => {
          const sc = stageScore(set, i, record.stages[i]);
          const mx = stageMax(set, i);
          const full = sc === mx;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
            >
              <button
                type="button"
                onClick={() => onReview(i)}
                className={`w-full rounded-xl border px-1 py-3 text-center transition-colors hover:bg-surface-3 ${full ? 'border-good/40 bg-good/5' : 'border-line bg-surface-2'}`}
                title={`${STAGE_LABEL[i]}: ${sc} ${sc === 1 ? 'point' : 'points'}`}
              >
                <p className="text-2xl leading-none" aria-hidden="true">
                  {stageEmoji(sc, mx)}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">{STAGE_LABEL[i]}</p>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={share}>
          {copied ? 'Copied!' : 'Share result'}
        </Button>
        <Link to="/archive">
          <Button>Practice past days</Button>
        </Link>
        <Link to="/stats">
          <Button variant="ghost">Stats</Button>
        </Link>
      </div>
      <div className="mt-5 flex justify-center">
        <SyncButton variant="label" placement="up" />
      </div>
      {!practice && record.key === localToday() && (
        <p className="mt-5 text-center text-sm text-muted">
          Next daily in <span className="font-mono text-ink tabular-nums">{countdown}</span>
        </p>
      )}
    </Card>
  );
}
