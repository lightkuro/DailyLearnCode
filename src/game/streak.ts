import { addDays, toISODate } from './dates';
import type { DayRecord } from './store';

/** A daily counts toward the streak only if it was finished on the same local day it was issued. */
export function completedDailyDates(days: Record<string, DayRecord>): Set<string> {
  const out = new Set<string>();
  for (const d of Object.values(days)) {
    if (d.mode === 'daily' && d.completedAt && toISODate(new Date(d.completedAt)) === d.key) out.add(d.key);
  }
  return out;
}

export interface Streak {
  current: number;
  best: number;
  /** True when today's daily is already done. */
  todayDone: boolean;
}

export function computeStreak(days: Record<string, DayRecord>, today: string): Streak {
  const done = completedDailyDates(days);
  const todayDone = done.has(today);
  // The streak stays alive through today until midnight even if today is not finished yet.
  let cursor = todayDone ? today : addDays(today, -1);
  let current = 0;
  while (done.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...done].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), todayDone };
}
