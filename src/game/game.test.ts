import { describe, expect, it } from 'vitest';
import { pickDaily } from '../content/loadDay';
import { addDays, dayNumber, EPOCH, toISODate } from './dates';
import { drawCases, mergeDetective, normalizeLine } from './detective';
import { CODE_MAX, codeMax, codeScore, grade, quizScore } from './scoring';
import { computeStreak } from './streak';
import type { DayRecord } from './store';

const quiz = {
  kind: 'quiz' as const,
  id: 'dsa' as const,
  title: 't',
  questions: [0, 1, 2, 3].map((a) => ({ id: `q${a}`, promptMd: 'p', choices: ['a', 'b', 'c', 'd'], answerIndex: a, explanationMd: 'e', tags: [] })),
};

describe('scoring', () => {
  it('quiz: 1 point per correct answer', () => {
    expect(quizScore(quiz, [0, 1, 2, 3])).toBe(4);
    expect(quizScore(quiz, [0, 0, 2, null])).toBe(2);
    expect(quizScore(quiz, [null, null, null, null])).toBe(0);
  });

  it('code: each hint lowers the max by one', () => {
    expect(codeMax(0)).toBe(CODE_MAX);
    expect(codeMax(1)).toBe(3);
    expect(codeMax(3)).toBe(1);
    expect(codeMax(9)).toBe(1);
  });

  it('code: all-or-nothing', () => {
    expect(codeScore({ status: 'accepted', hintsUsed: 0 })).toBe(4);
    expect(codeScore({ status: 'accepted', hintsUsed: 2 })).toBe(2);
    expect(codeScore({ status: 'active', hintsUsed: 0 })).toBe(0);
    expect(codeScore({ status: 'gaveup', hintsUsed: 1 })).toBe(0);
  });

  it('grades', () => {
    expect(grade(20).label).toBe('Flawless');
    expect(grade(0).label).toBeTruthy();
  });
});

function rec(key: string, completedOn: string | null, mode: 'daily' | 'practice' = 'daily'): DayRecord {
  return {
    key,
    setDate: key,
    mode,
    stages: [],
    stageScores: [],
    code: {},
    startedAt: 0,
    completedAt: completedOn ? new Date(`${completedOn}T12:00:00`).getTime() : undefined,
    score: completedOn ? 10 : undefined,
  };
}

describe('streak', () => {
  it('counts consecutive dailies finished on their own day', () => {
    const days = Object.fromEntries(
      [rec('2026-11-01', '2026-11-01'), rec('2026-11-02', '2026-11-02'), rec('2026-11-03', '2026-11-03')].map((r) => [r.key, r]),
    );
    expect(computeStreak(days, '2026-11-03')).toEqual({ current: 3, best: 3, todayDone: true });
    // Today not played yet: yesterday's streak is still alive.
    expect(computeStreak(days, '2026-11-04').current).toBe(3);
    // A missed day breaks it.
    expect(computeStreak(days, '2026-11-05').current).toBe(0);
    expect(computeStreak(days, '2026-11-05').best).toBe(3);
  });

  it('ignores practice runs and dailies finished late', () => {
    const days = Object.fromEntries(
      [rec('2026-11-01', '2026-11-01'), rec('2026-11-02', '2026-11-03'), rec('2026-10-31', '2026-11-03', 'practice')].map((r) => [r.key, r]),
    );
    const s = computeStreak(days, '2026-11-02');
    expect(s.current).toBe(1);
    expect(s.todayDone).toBe(false);
  });
});

describe('dates', () => {
  it('numbers days from the epoch', () => {
    expect(dayNumber(EPOCH)).toBe(1);
    expect(dayNumber(addDays(EPOCH, 9))).toBe(10);
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('formats local dates', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('pickDaily', () => {
  const index = { builtAt: '', days: ['2026-11-03', '2026-11-04', '2026-11-05'].map((date) => ({ date, titles: [] })) };
  it('uses today when published', () => {
    expect(pickDaily(index, '2026-11-04')).toEqual({ setDate: '2026-11-04', classic: false });
  });
  it('falls back to a deterministic past classic', () => {
    const a = pickDaily(index, '2026-11-20');
    expect(a?.classic).toBe(true);
    expect(a?.setDate && a.setDate < '2026-11-20').toBe(true);
    expect(pickDaily(index, '2026-11-20')).toEqual(a);
  });
  it('handles an empty index', () => {
    expect(pickDaily({ builtAt: '', days: [] }, '2026-11-20')).toBeNull();
  });
});

import { shareText, stageEmoji } from './share';

describe('share text', () => {
  it('maps stage points to the ascending emoji scale', () => {
    expect([0, 1, 2, 3, 4].map((p) => stageEmoji(p, 4))).toEqual(['🌂', '☁️', '🌧️', '🌧️', '🌈']);
  });
  it('formats header, one emoji per stage and the site link', () => {
    const q = (a: number) => ({ id: `q${a}`, promptMd: 'p', choices: ['a', 'b', 'c', 'd'], answerIndex: 0, explanationMd: 'e', tags: [] });
    const quiz = (id: 'dsa' | 'swe') => ({ kind: 'quiz' as const, id, title: '', questions: [q(1), q(2), q(3), q(4)] });
    const code = { kind: 'code' as const, problem: {} as never };
    const set = { date: '2026-11-03', version: 1 as const, stages: [quiz('dsa'), code, code, code, quiz('swe')] as never };
    const stages = [
      { kind: 'quiz' as const, answers: [-1, -1, -1, -1], done: true },
      { kind: 'code' as const, status: 'accepted' as const, hintsUsed: 3, submissions: 1 },
      { kind: 'code' as const, status: 'accepted' as const, hintsUsed: 1, submissions: 1 },
      { kind: 'code' as const, status: 'accepted' as const, hintsUsed: 0, submissions: 1 },
      { kind: 'quiz' as const, answers: [0, 0, 0, 0], done: true },
    ];
    expect(shareText({ set, dayKey: '2026-11-03', stages, score: 12, streak: 1, practice: false })).toBe(
      'dailylearncode #1 · 12/20 🔥1\n🌂 ☁️ 🌧️ 🌈 🌈', // no site URL configured in tests, so no link line
    );
  });
});

describe('detective', () => {
  it('normalises typed lines', () => {
    expect(normalizeLine("  seen.add( x ) ;")).toBe(normalizeLine('seen.add(x)'));
    expect(normalizeLine("d['k'] = 1")).toBe(normalizeLine('d["k"]=1'));
    expect(normalizeLine('w += 1')).not.toBe(normalizeLine('w -= 1'));
  });
  it('draws unseen cases first and fills each mode to 5', () => {
    const leet = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
    const swe = ['s1', 's2', 's3'];
    const design = ['d1', 'd2'];
    const orig = drawCases('original', { leet, swe, design }, ['l1', 'l2', 'l3']);
    expect(orig).toHaveLength(5);
    expect(orig.filter((x) => x.startsWith('l')).sort()).toEqual(['l4', 'l5', 'l6']);
    expect(drawCases('swe', { leet, swe, design }, [])).toHaveLength(5); // 3 code + 2 design cases
    expect(drawCases('swe', { leet, swe }, [])).toHaveLength(3); // SWE mode never takes algorithm cases
    expect(drawCases('design', { leet, swe, design }, []).sort()).toEqual(['d1', 'd2']);
    expect(drawCases('prep', { leet, swe, design }, [])).toHaveLength(5);
  });
  it('mixes software design into the SWE file and has a file of its own', () => {
    const swe = ['s1', 's2', 's3', 's4'];
    const design = ['d1', 'd2', 'd3'];
    const oop = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'];
    const mix = drawCases('swe', { swe, design, oop }, []);
    const count = (p: string) => mix.filter((x) => x.startsWith(p)).length;
    expect([count('s'), count('o'), count('d')]).toEqual([2, 2, 1]);
    const only = drawCases('oop', { swe, design, oop }, []);
    expect(only).toHaveLength(5);
    expect(only.every((x) => x.startsWith('o'))).toBe(true);
    const orig = drawCases('original', { leet: ['l1', 'l2', 'l3'], oop }, []);
    expect(orig.filter((x) => x.startsWith('o'))).toHaveLength(2);
    // Preferred cases (e.g. in the player's language) come first while they last.
    const pref = drawCases('oop', { oop }, [], Math.random, (id) => id === 'o5' || id === 'o6');
    expect(pref).toEqual(expect.arrayContaining(['o5', 'o6']));
  });
  it('merges synced stats without losing either side', () => {
    const m = mergeDetective({ seen: ['a'], cases: 3, solved: 2, rounds: 1, perfect: 0 }, { seen: ['b'], cases: 5, solved: 1, rounds: 1, perfect: 1 });
    expect(m).toMatchObject({ cases: 5, solved: 2, rounds: 1, perfect: 1 });
    expect(m.seen.sort()).toEqual(['a', 'b']);
  });
});
