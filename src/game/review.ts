/**
 * Small synced logs behind Stats' review list and LeetCode coverage, and Learn's reading progress.
 *
 * Stamps: key → time in ms. A positive stamp means "on" (missed, read); a negative one means it was cleared at
 * |stamp| (answered right later, marked unread). Merging keeps whichever happened last, so clearing on one
 * device isn't undone by an older copy on another.
 */
export type Stamps = Record<string, number>;

export function setStamp(log: Stamps | undefined, key: string, on: boolean, now = Date.now()): Stamps {
  return { ...log, [key]: on ? now : -now };
}

export function isOn(log: Stamps | undefined, key: string): boolean {
  return (log?.[key] ?? 0) > 0;
}

export function mergeStamps(local: Stamps | undefined, remote: unknown): Stamps {
  const out: Stamps = { ...local };
  if (!remote || typeof remote !== 'object') return out;
  for (const [k, v] of Object.entries(remote as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (Math.abs(v) > Math.abs(out[k] ?? 0)) out[k] = v;
  }
  return out;
}

/** Coding problems played outside the daily sets (Unlimited), by LeetCode number. */
export type LcLog = Record<string, { solved: boolean; at: number }>;

export function mergeLcLog(local: LcLog | undefined, remote: unknown): LcLog {
  const out: LcLog = { ...local };
  if (!remote || typeof remote !== 'object') return out;
  for (const [k, v] of Object.entries(remote as Record<string, unknown>)) {
    const r = v as { solved?: unknown; at?: unknown };
    if (!r || typeof r.at !== 'number') continue;
    const l = out[k];
    out[k] = { solved: !!r.solved || !!l?.solved, at: Math.max(r.at, l?.at ?? 0) };
  }
  return out;
}
