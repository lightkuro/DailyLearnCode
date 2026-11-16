import { describe, expect, it } from 'vitest';
import { pickArt } from './quizArtPick';

describe('pickArt', () => {
  it('matches topics from tags and wording', () => {
    expect(pickArt('Breadth-first search from a source in an **unweighted** graph finds...', ['bfs'])).toBe('graph');
    expect(pickArt('Which isolation level prevents dirty reads?', ['databases'])).toBe('database');
    expect(pickArt('What does a CSRF token protect against?', [])).toBe('lock');
    expect(pickArt('Two threads increment a shared counter without a mutex.', [])).toBe('threads');
    expect(pickArt('What is the time complexity of this loop?', ['complexity'])).toBe('clock');
    expect(pickArt('What does `git rebase` do to your commits?', [])).toBe('git');
  });
  it('falls back to the friendly computer', () => {
    expect(pickArt('Pick the best answer.', [])).toBe('computer');
  });
});
