import { describe, expect, it } from 'vitest';
import { mergeCode, mergeDays } from './merge';
import type { DayRecord } from './store';

const rec = (over: Partial<DayRecord>): DayRecord => ({
  key: '2026-11-04',
  setDate: '2026-11-04',
  mode: 'daily',
  stages: [
    { kind: 'quiz', answers: [null, null, null, null], done: false },
    { kind: 'code', status: 'active', hintsUsed: 0, submissions: 0 },
  ] as DayRecord['stages'],
  stageScores: [null, null],
  code: {},
  startedAt: 1,
  ...over,
});

describe('mergeDays', () => {
  it('keeps days that exist on only one side', () => {
    const a = { x: rec({ key: 'x' }) };
    const b = { y: rec({ key: 'y' }) };
    expect(Object.keys(mergeDays(a, b)).sort()).toEqual(['x', 'y']);
  });
  it('keeps the record that got further, and saved code from both', () => {
    const local = rec({ code: { 1: { python3: 'local py' } } });
    const remote = rec({
      completedAt: 5,
      score: 12,
      stages: [
        { kind: 'quiz', answers: [1, 2, 3, 0], done: true },
        { kind: 'code', status: 'accepted', hintsUsed: 1, submissions: 2 },
      ] as DayRecord['stages'],
      code: { 1: { java: 'remote java' } },
    });
    const m = mergeDays({ d: local }, { d: remote }).d;
    expect(m.completedAt).toBe(5);
    expect(m.code[1]).toEqual({ python3: 'local py', java: 'remote java' });
  });
  it('never imports the per-device unlimited scratch round', () => {
    expect(mergeDays({}, { unlimited: rec({ key: 'unlimited', mode: 'unlimited' }) })).toEqual({});
  });
});

describe('mergeCode', () => {
  it('takes the newer edit of each file when both sides have timestamps', () => {
    const m = mergeCode(
      { code: { 1: { python3: 'old', java: 'mine' } }, codeAt: { 1: { python3: 10, java: 50 } } },
      { code: { 1: { python3: 'new', java: 'theirs' } }, codeAt: { 1: { python3: 20, java: 40 } } },
    );
    expect(m.code[1]).toEqual({ python3: 'new', java: 'mine' });
    expect(m.codeAt[1]).toEqual({ python3: 20, java: 50 });
  });
  it('prefers the first side without timestamps, and fills gaps from the other', () => {
    const m = mergeCode({ code: { 1: { python3: 'a' } } }, { code: { 1: { python3: 'b', cpp: 'c' }, 2: { java: 'd' } } });
    expect(m.code).toEqual({ 1: { python3: 'a', cpp: 'c' }, 2: { java: 'd' } });
  });
});
