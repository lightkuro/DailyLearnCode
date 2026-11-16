import { useEffect, useMemo, useState } from 'react';
import { topicsOf } from '../content/topics';
import type { Lang } from '../runner/harness/types';
import { LOCAL_ONLY_KEYS } from './merge';
import { SKIPPED, type StageProgress } from './scoring';
import { useStore, type DayRecord } from './store';

export interface TopicTally {
  seen: number;
  right: number;
}

/**
 * public/days/topics.json (written by the content build): per published day and stage, the tags and
 * answer keys needed to count answers by topic without downloading every day.
 */
export type TopicsFile = Record<string, ({ q: { t: string[]; a: number; v?: Partial<Record<Lang, number>> }[] } | { p: string[] })[]>;

let filePromise: Promise<TopicsFile> | null = null;
export function loadTopicsFile(): Promise<TopicsFile> {
  filePromise ??= fetch('/days/topics.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<TopicsFile>) : {}))
    .catch(() => {
      filePromise = null;
      return {};
    });
  return filePromise;
}

function add(map: Map<string, TopicTally>, tags: readonly string[], right: boolean): void {
  for (const t of topicsOf(tags)) {
    const cur = map.get(t.id) ?? { seen: 0, right: 0 };
    map.set(t.id, { seen: cur.seen + 1, right: cur.right + (right ? 1 : 0) });
  }
}

/** Per-topic answers from the daily / archive sets you played plus the Unlimited / Detective log. */
export function computeTopicStats(days: Record<string, DayRecord>, file: TopicsFile, log: Record<string, TopicTally> | undefined): Map<string, TopicTally> {
  const out = new Map<string, TopicTally>();
  for (const [key, rec] of Object.entries(days)) {
    if (LOCAL_ONLY_KEYS.has(key) || key === 'unlimited') continue;
    const day = file[rec.setDate];
    if (!day) continue;
    rec.stages.forEach((p: StageProgress | undefined, i) => {
      const meta = day[i];
      if (!p || !meta) return;
      if (p.kind === 'quiz' && 'q' in meta) {
        p.answers.forEach((a, qi) => {
          const q = meta.q[qi];
          if (a === null || a === undefined || !q) return;
          const lang = p.langs?.[qi];
          const key = (lang && q.v?.[lang]) ?? q.a;
          add(out, q.t, a !== SKIPPED && a === key);
        });
      } else if (p.kind === 'code' && 'p' in meta && p.status !== 'active') {
        add(out, meta.p, p.status === 'accepted');
      }
    });
  }
  for (const [id, t] of Object.entries(log ?? {})) {
    const cur = out.get(id) ?? { seen: 0, right: 0 };
    out.set(id, { seen: cur.seen + t.seen, right: cur.right + t.right });
  }
  return out;
}

/** Synced logs: keep the larger count per topic (never loses answers, may undercount across devices). */
export function mergeTopicLog(local: Record<string, TopicTally> | undefined, remote: Record<string, unknown>): Record<string, TopicTally> {
  const out: Record<string, TopicTally> = { ...local };
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  for (const [id, raw] of Object.entries(remote)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<TopicTally>;
    const l = out[id] ?? { seen: 0, right: 0 };
    out[id] = { seen: Math.max(l.seen, num(r.seen)), right: Math.max(l.right, num(r.right)) };
  }
  return out;
}

export function useTopicStats(): { byTopic: Map<string, TopicTally>; ready: boolean } {
  const days = useStore((s) => s.days);
  const log = useStore((s) => s.topicLog);
  const [file, setFile] = useState<TopicsFile | null>(null);
  useEffect(() => {
    let alive = true;
    void loadTopicsFile().then((f) => alive && setFile(f));
    return () => {
      alive = false;
    };
  }, []);
  const byTopic = useMemo(() => computeTopicStats(days, file ?? {}, log), [days, file, log]);
  return { byTopic, ready: file !== null };
}
