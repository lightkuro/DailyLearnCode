import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { drawRound } from './unlimited';

const day = JSON.parse(readFileSync(new URL('../../content/days/2026-11-06.json', import.meta.url), 'utf8'));
const bank = JSON.parse(readFileSync(new URL('../../content/bank/swe.json', import.meta.url), 'utf8'));

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
}

describe('unlimited rounds', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/days/index.json') return respond({ days: [{ date: day.date, titles: [] }], banks: ['swe'], builtAt: '' });
      if (url === `/days/${day.date}.json`) return respond(day);
      if (url === '/bank/swe.json') return respond(bank);
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
  });
  afterAll(() => vi.unstubAllGlobals());

  it('mixes the SWE bank into SWE rounds and avoids repeats until the pool runs out', async () => {
    const seen = new Set<string>();
    const ids: string[] = [];
    const pool = bank.questions.length + 4;
    for (let r = 0; r < Math.floor(pool / 4); r++) {
      const set = await drawRound(4, seen);
      const st = set.stages[4];
      if (st.kind !== 'quiz') throw new Error('expected a quiz');
      expect(st.questions).toHaveLength(4);
      ids.push(...st.questions.map((q) => q.id));
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('bank-swe-'))).toBe(true);
    expect(ids.some((id) => id.startsWith(day.date))).toBe(true);
  });

  it('skips banks the index does not list', async () => {
    const set = await drawRound(0, new Set());
    const st = set.stages[0];
    expect(st.kind === 'quiz' && st.questions.every((q) => q.id.startsWith(day.date))).toBe(true);
  });
});
