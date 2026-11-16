import { describe, expect, it } from 'vitest';
import type { DayRecord } from './store';
import { computeTopicStats, mergeTopicLog, type TopicsFile } from './topicStats';

describe('topic stats', () => {
  const file: TopicsFile = {
    '2026-11-03': [
      { q: [{ t: ['complexity'], a: 1 }, { t: ['bfs'], a: 0, v: { java: 2 } }, { t: ['heaps'], a: 3 }, { t: ['complexity'], a: 2 }] },
      { p: ['arrays', 'hashing'] },
      { p: ['graphs'] },
      { p: ['dynamic programming'] },
      { q: [{ t: ['caching'], a: 0 }, { t: ['databases'], a: 1 }, { t: ['sql'], a: 1 }, { t: ['security'], a: 2 }] },
    ],
  };
  const rec = {
    key: '2026-11-03',
    setDate: '2026-11-03',
    mode: 'daily',
    stages: [
      { kind: 'quiz', answers: [1, 2, -1, null], langs: ['python3', 'java', 'python3', null], done: false },
      { kind: 'code', status: 'accepted', hintsUsed: 1, submissions: 2 },
      { kind: 'code', status: 'gaveup', hintsUsed: 3, submissions: 0 },
      { kind: 'code', status: 'active', hintsUsed: 0, submissions: 1 },
      { kind: 'quiz', answers: [null, null, null, null], done: false },
    ],
    stageScores: [],
    code: {},
    startedAt: 0,
  } as unknown as DayRecord;

  it('counts answers per topic from day records, language variants and the log', () => {
    const m = computeTopicStats({ '2026-11-03': rec }, file, { databases: { seen: 2, right: 1 } });
    expect(m.get('big-o')).toEqual({ seen: 1, right: 1 }); // the unanswered 4th question doesn't count
    expect(m.get('graphs')).toEqual({ seen: 2, right: 1 }); // Java variant key 2 → right; gave up on the problem
    expect(m.get('heaps')).toEqual({ seen: 1, right: 0 }); // skipped
    expect(m.get('hashing')).toEqual({ seen: 1, right: 1 });
    expect(m.has('dynamic-programming')).toBe(false); // still active
    expect(m.get('databases')).toEqual({ seen: 2, right: 1 });
  });
  it('merges synced logs without losing either side', () => {
    expect(mergeTopicLog({ a: { seen: 3, right: 1 } }, { a: { seen: 2, right: 2 }, b: { seen: 1, right: 0 }, c: 'junk' })).toEqual({
      a: { seen: 3, right: 2 },
      b: { seen: 1, right: 0 },
    });
  });
});
