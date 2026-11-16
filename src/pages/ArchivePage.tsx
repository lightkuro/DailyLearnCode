import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BUILD } from '../build-info';
import { Card, Spinner } from '../components/ui';
import { loadIndex } from '../content/loadDay';
import type { DayIndex } from '../content/schema';
import { dayNumber, formatShortDate, localToday } from '../game/dates';
import { DAY_MAX } from '../game/scoring';
import { useStore } from '../game/store';

export function ArchivePage() {
  const [index, setIndex] = useState<DayIndex | null>(null);
  const days = useStore((s) => s.days);
  const today = localToday();

  useEffect(() => {
    loadIndex().then(setIndex, () => setIndex({ days: [], builtAt: '' }));
  }, []);

  if (!index) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  // Preview builds publish every day, so they list upcoming sets too.
  const showUpcoming = BUILD.channel !== 'production';
  const list = [...index.days].filter((d) => showUpcoming || d.date <= today).reverse();

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/stats" className="text-sm font-semibold text-accent-soft hover:underline">
        ← Stats
      </Link>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Archive</h1>
      <p className="mt-1 text-muted">
        Replay any past set. Practice runs are scored but don&apos;t touch your streak.
        {showUpcoming && ' This preview build also lists upcoming sets.'}
      </p>
      <ul className="mt-6 space-y-2.5">
        {list.length === 0 && <p className="text-muted">Nothing here yet.</p>}
        {list.map((d, i) => {
          const rec = days[d.date];
          const isToday = d.date === today;
          const upcoming = d.date > today;
          const status = rec?.completedAt ? (
            <span className="font-black tabular-nums">
              {rec.score}
              <span className="text-xs text-faint">/{DAY_MAX}</span>
            </span>
          ) : rec ? (
            <span className="text-xs font-semibold text-warn">In progress</span>
          ) : (
            <span className="text-xs text-faint">Not played</span>
          );
          return (
            <motion.li key={d.date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}>
              <Link to={isToday ? '/' : `/day/${d.date}`}>
                <Card className="flex items-center gap-4 px-5 py-4 transition-colors hover:border-faint">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-3 text-sm font-black text-accent-soft">#{dayNumber(d.date)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {formatShortDate(d.date)} {isToday && <span className="ml-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-soft">Today</span>}
                      {upcoming && <span className="ml-1 rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Upcoming</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{d.titles.join(' · ')}</p>
                  </div>
                  <div className="text-right">{status}</div>
                </Card>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
