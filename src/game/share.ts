import { SITE } from '../site';
import type { DailySet } from '../content/schema';
import { dayNumber } from './dates';
import { DAY_MAX, stageMax, stageScore, type StageProgress } from './scoring';

/** The deployed site's address (VITE_SITE_URL); the share text leaves it out when unset. */
export const SHARE_URL = SITE.url;

/** One emoji per stage, in ascending order of how well it went: 🌂 < ☁️ < 🌧️ < 🌈. */
export function stageEmoji(points: number, max: number): string {
  if (points <= 0) return '🌂';
  if (points >= max) return '🌈';
  return points === 1 ? '☁️' : '🌧️';
}

/** Spoiler-free summary, e.g. "dailylearncode #1 · 4/20 🔥1\n🌂 ☁️ 🌧️ 🌈 🌈\nhttps://example.com". */
export function shareText(opts: { set: DailySet; dayKey: string; stages: StageProgress[]; score: number; streak: number; practice: boolean }): string {
  const { set, stages, score, streak, practice } = opts;
  const row = set.stages.map((_, i) => stageEmoji(stageScore(set, i, stages[i]), stageMax(set, i))).join(' ');
  const header = `${SITE.name} #${dayNumber(opts.dayKey)}${practice ? ' (practice)' : ''} · ${score}/${DAY_MAX}${streak > 0 && !practice ? ` 🔥${streak}` : ''}`;
  return [header, row, ...(SHARE_URL ? [SHARE_URL] : [])].join('\n');
}
