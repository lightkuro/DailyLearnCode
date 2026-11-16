import { describe, expect, it } from 'vitest';
import { isOn, mergeLcLog, mergeStamps, setStamp } from './review';

describe('review logs', () => {
  it('a later clear wins over an older mark from another device', () => {
    const local = setStamp(undefined, 'q1', false, 2000); // cleared at t=2000
    const remote = { q1: 1000, q2: 1500 }; // marked at t=1000 elsewhere
    const m = mergeStamps(local, remote);
    expect(isOn(m, 'q1')).toBe(false);
    expect(isOn(m, 'q2')).toBe(true);
    expect(isOn(mergeStamps({ q1: 3000 }, { q1: -2500 }), 'q1')).toBe(true);
  });
  it('ignores junk in remote files', () => {
    expect(mergeStamps({ a: 1 }, { b: 'x', c: Infinity })).toEqual({ a: 1 });
    expect(mergeStamps({ a: 1 }, null)).toEqual({ a: 1 });
  });
  it('a solved LeetCode problem stays solved', () => {
    const m = mergeLcLog({ '42': { solved: true, at: 10 } }, { '42': { solved: false, at: 20 }, '1': { solved: false, at: 5 } });
    expect(m['42']).toEqual({ solved: true, at: 20 });
    expect(m['1']).toEqual({ solved: false, at: 5 });
  });
});
