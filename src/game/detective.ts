import type { DetectiveKind } from '../content/schema';
import type { Lang } from '../runner/harness/types';

/** Which case files a Detective round draws from. */
export type DetectiveMode = 'original' | 'swe' | 'oop' | 'design' | 'prep';
export type CaseKind = DetectiveKind;

export const DETECTIVE_MODES: { id: DetectiveMode; label: string; blurb: string; picks: { from: CaseKind[]; n: number }[] }[] = [
  {
    id: 'original',
    label: 'Original',
    blurb: '3 algorithm cases + 2 software-engineering cases (code, software or system design)',
    picks: [{ from: ['leet'], n: 3 }, { from: ['swe', 'oop', 'design'], n: 2 }],
  },
  {
    id: 'swe',
    label: 'SWE mix',
    blurb: '2 code cases, 2 software design, 1 system design',
    picks: [{ from: ['swe'], n: 2 }, { from: ['oop'], n: 2 }, { from: ['design'], n: 1 }],
  },
  {
    id: 'oop',
    label: 'Software design',
    blurb: 'Classes, SOLID and design patterns (Factory, Strategy, Observer…), in code and in class-design interviews',
    picks: [{ from: ['oop'], n: 5 }],
  },
  { id: 'design', label: 'System design', blurb: '5 system design docs, no code: find the decision that breaks at scale', picks: [{ from: ['design'], n: 5 }] },
  { id: 'prep', label: 'Prep', blurb: '5 algorithm cases from classic interview problems', picks: [{ from: ['leet'], n: 5 }] },
];

export const CASES_PER_ROUND = 5;
/** "Missing line" cases allow this many checks before the answer is shown. */
export const MAX_TRIES = 3;

/** How one case went. */
export interface CaseResult {
  /** Language the case was shown in (the code differs per language). */
  lang: Lang;
  /** Finished: solved, or out of tries / revealed / wrong pick. */
  done: boolean;
  solved: boolean;
  /** "What's wrong?" pick. */
  choice?: number;
  /** "Find the incorrect lines": the flagged line numbers (1-based). */
  lines?: number[];
  /** "Missing line": each attempt (one string per missing line). */
  tries?: string[][];
}

export interface DetectiveRound {
  mode: DetectiveMode;
  ids: string[];
  results: (CaseResult | null)[];
  startedAt: number;
  finishedAt?: number;
}

/** Lifetime numbers (synced) plus the round in progress (this device only). */
export interface DetectiveStats {
  /** Case ids already drawn (newest last; capped), so rounds avoid repeats. */
  seen: string[];
  cases: number;
  solved: number;
  rounds: number;
  perfect: number;
  round?: DetectiveRound;
}

export const EMPTY_DETECTIVE: DetectiveStats = { seen: [], cases: 0, solved: 0, rounds: 0, perfect: 0 };
const SEEN_CAP = 400;

export function addSeen(seen: string[], ids: string[]): string[] {
  const rest = seen.filter((x) => !ids.includes(x));
  return [...rest, ...ids].slice(-SEEN_CAP);
}

/** Merge synced stats: union of seen cases, the larger of each counter; the local round stays. */
export function mergeDetective(local: DetectiveStats | undefined, remote: Partial<DetectiveStats>): DetectiveStats {
  const l = local ?? EMPTY_DETECTIVE;
  const num = (a: number, b: unknown) => Math.max(a, typeof b === 'number' && Number.isFinite(b) ? b : 0);
  const remoteSeen = Array.isArray(remote.seen) ? remote.seen.filter((x): x is string => typeof x === 'string') : [];
  return {
    seen: addSeen(remoteSeen, l.seen),
    cases: num(l.cases, remote.cases),
    solved: num(l.solved, remote.solved),
    rounds: num(l.rounds, remote.rounds),
    perfect: num(l.perfect, remote.perfect),
    round: l.round,
  };
}

/** Normalise a typed line for comparison: whitespace, quote style and a trailing `;` don't matter. */
export function normalizeLine(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/'/g, '"')
    .replace(/;+$/, '');
}

export function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick `n` ids from `pool`: unseen ones first (those `prefer` likes ahead of the rest, e.g. cases in the
 * player's language), then the longest-ago seen.
 */
export function pickCases(pool: string[], n: number, seen: string[], rnd: () => number = Math.random, prefer?: (id: string) => boolean): string[] {
  const order = new Map(seen.map((id, i) => [id, i]));
  const unseen = pool.filter((id) => !order.has(id));
  const fresh = prefer ? [...shuffle(unseen.filter(prefer), rnd), ...shuffle(unseen.filter((id) => !prefer(id)), rnd)] : shuffle(unseen, rnd);
  const old = pool.filter((id) => order.has(id)).sort((a, b) => order.get(a)! - order.get(b)!);
  return [...fresh, ...old].slice(0, n);
}

/** Draw a round's case ids for `mode` from the case files (unseen first), in a shuffled order. */
export function drawCases(
  mode: DetectiveMode,
  files: Partial<Record<CaseKind, string[]>>,
  seen: string[],
  rnd: () => number = Math.random,
  prefer?: (id: string) => boolean,
): string[] {
  const m = DETECTIVE_MODES.find((x) => x.id === mode)!;
  const picked: string[] = [];
  for (const p of m.picks) {
    const pool = p.from.flatMap((k) => files[k] ?? []).filter((id) => !picked.includes(id));
    picked.push(...pickCases(pool, p.n, seen, rnd, prefer));
  }
  // A file with too few cases: top up from the mode's other files so a round still has 5 cases.
  const short = CASES_PER_ROUND - picked.length;
  if (short > 0) {
    const rest = [...new Set(m.picks.flatMap((p) => p.from))].flatMap((k) => files[k] ?? []).filter((id) => !picked.includes(id));
    picked.push(...pickCases(rest, short, seen, rnd));
  }
  return shuffle(picked, rnd);
}
