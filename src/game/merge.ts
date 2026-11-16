import type { Lang } from '../runner/harness/types';
import type { DayRecord } from './store';

/** Rough "how far along" a record is: finished days first, then finished stages, then answers/hints. */
export function progressWeight(r: DayRecord): number {
  let w = r.completedAt ? 1_000_000 : 0;
  for (const s of r.stages) {
    if (s.kind === 'quiz') {
      if (s.done) w += 1000;
      w += s.answers.filter((a) => a !== null).length * 10;
    } else {
      if (s.status !== 'active') w += 1000;
      w += s.hintsUsed;
    }
  }
  return w;
}

type CodeMap = DayRecord['code'];
type CodeTimes = NonNullable<DayRecord['codeAt']>;

/**
 * Merge two days' saved code file by file (stage × language). The newer edit wins when both sides
 * have a timestamp; otherwise `prefer`'s copy wins (the side whose progress got further).
 */
export function mergeCode(
  prefer: { code?: CodeMap; codeAt?: CodeTimes },
  other: { code?: CodeMap; codeAt?: CodeTimes },
): { code: CodeMap; codeAt: CodeTimes } {
  const code: CodeMap = {};
  const codeAt: CodeTimes = {};
  const stages = new Set([...Object.keys(other.code ?? {}), ...Object.keys(prefer.code ?? {})].map(Number));
  for (const i of stages) {
    const a = prefer.code?.[i] ?? {};
    const b = other.code?.[i] ?? {};
    for (const lang of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Lang>) {
      const ta = prefer.codeAt?.[i]?.[lang];
      const tb = other.codeAt?.[i]?.[lang];
      const useB = a[lang] === undefined || (b[lang] !== undefined && ta !== undefined && tb !== undefined && tb > ta) || (ta === undefined && tb !== undefined && b[lang] !== undefined);
      const text = useB ? b[lang] : a[lang];
      const at = useB ? tb : ta;
      if (text === undefined) continue;
      (code[i] ??= {})[lang] = text;
      if (at !== undefined) (codeAt[i] ??= {})[lang] = at;
    }
  }
  return { code, codeAt };
}

/** Keys that are per-device scratch space and never leave this browser. */
export const LOCAL_ONLY_KEYS = new Set(['unlimited']);

/**
 * Merge two progress snapshots (e.g. this browser and the copy saved in Google Drive) without
 * losing anything: for each day keep the record that got further (ties: the more recent start),
 * and keep saved code from both (newest edit of each file wins).
 * Unlimited rounds are per-device scratch space and always stay local.
 */
export function mergeDays(local: Record<string, DayRecord>, remote: Record<string, DayRecord>): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = { ...local };
  for (const [key, r] of Object.entries(remote)) {
    if (LOCAL_ONLY_KEYS.has(key) || !r || typeof r !== 'object') continue;
    const l = local[key];
    if (!l) {
      out[key] = { ...r, code: r.code ?? {} };
      continue;
    }
    if (l.setDate !== r.setDate) {
      // Different content for the same key (a "classic" replay): keep whichever is further along.
      out[key] = progressWeight(r) > progressWeight(l) ? r : l;
      continue;
    }
    const wl = progressWeight(l);
    const wr = progressWeight(r);
    const win = wr > wl || (wr === wl && r.startedAt > l.startedAt) ? r : l;
    const lose = win === r ? l : r;
    const { code, codeAt } = mergeCode(win, lose);
    out[key] = { ...win, code, codeAt };
  }
  return out;
}
