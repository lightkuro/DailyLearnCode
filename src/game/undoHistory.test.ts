import { beforeEach, describe, expect, it } from 'vitest';
import { clearUndo, loadUndo, mergeUndo, saveUndo, undoFiles, UNDO_FILES } from './undoHistory';

// A tiny in-memory localStorage for the node test environment.
beforeEach(() => {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

describe('undo history store', () => {
  it('gives the history back only for the exact code it was saved with', () => {
    saveUndo('d|1|python3', 'abc', { h: 1 });
    expect(loadUndo('d|1|python3', 'abc')).toEqual({ h: 1 });
    expect(loadUndo('d|1|python3', 'abcd')).toBeUndefined();
  });
  it(`keeps only the ${UNDO_FILES} newest files`, () => {
    for (let i = 0; i < UNDO_FILES + 3; i++) saveUndo(`d|${i}|java`, 'x', { i });
    const keys = Object.keys(undoFiles());
    expect(keys).toHaveLength(UNDO_FILES);
  });
  it('merges another device: newest per file wins', () => {
    saveUndo('k', 'local', { v: 'local' });
    const at = undoFiles().k.at;
    mergeUndo({ k: { doc: 'old', hist: { v: 'old' }, at: at - 1000 }, j: { doc: 'j', hist: { v: 'j' }, at } });
    expect(loadUndo('k', 'local')).toEqual({ v: 'local' });
    expect(loadUndo('j', 'j')).toEqual({ v: 'j' });
    mergeUndo({ k: { doc: 'remote', hist: { v: 'remote' }, at: at + 1000 } });
    expect(loadUndo('k', 'remote')).toEqual({ v: 'remote' });
  });
  it('skips histories that are too big, and clears', () => {
    saveUndo('big', 'x', { s: 'y'.repeat(200_000) });
    expect(loadUndo('big', 'x')).toBeUndefined();
    saveUndo('k', 'x', 1);
    clearUndo();
    expect(undoFiles()).toEqual({});
  });
});
