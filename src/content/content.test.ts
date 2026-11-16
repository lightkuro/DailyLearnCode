import { describe, expect, it } from 'vitest';
import { quizScore } from '../game/scoring';
import { resolveQuestion } from './quiz';
import { fillGaps, lineDiff } from './detective';
import { checkSvg } from './svg';

const q = {
  id: 'q',
  promptMd: 'py?',
  choices: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  explanationMd: 'e',
  tags: [],
  variants: { java: { promptMd: 'java?', choices: ['w', 'x', 'y', 'z'], answerIndex: 2, explanationMd: 'j' } },
};

describe('language variants', () => {
  it('serves the variant for the chosen language, else the base', () => {
    expect(resolveQuestion(q, 'java').promptMd).toBe('java?');
    expect(resolveQuestion(q, 'cpp').promptMd).toBe('py?');
    expect(resolveQuestion(q, 'python3').variantLang).toBe('python3');
    expect(resolveQuestion({ ...q, variants: undefined }, 'java').variantLang).toBeNull();
  });

  it('scores each answer against the version it was answered in; skipped scores 0', () => {
    const stage = { kind: 'quiz' as const, id: 'dsa' as const, title: '', questions: [q, q, q, q] };
    expect(quizScore(stage, [0, 2, 2, -1], ['python3', 'java', 'python3', null])).toBe(2);
    expect(quizScore(stage, [0, 0, 0, 0])).toBe(4); // old saves without langs use the base version
  });
});

describe('checkSvg', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="url(#g)"/><text x="1" y="5">hi</text></svg>';
  it('accepts simple static SVG', () => {
    expect(checkSvg(ok)).toEqual([]);
  });
  it('rejects scripts, handlers, external refs and foreign content', () => {
    expect(checkSvg(ok.replace('<text', '<script>alert(1)</script><text'))).toContain('element <script> not allowed');
    expect(checkSvg(ok.replace('<rect ', '<rect onload="x()" ')).join()).toMatch(/event handler/);
    expect(checkSvg(ok.replace('<text', '<use href="https://evil/x.svg#a"/><text')).join()).toMatch(/external href/);
    expect(checkSvg(ok.replace('url(#g)', 'url(https://x/y)')).join()).toMatch(/external url/);
    expect(checkSvg(ok.replace('<text', '<foreignObject></foreignObject><text')).join()).toMatch(/foreignobject/);
    expect(checkSvg('<div></div>').length).toBeGreaterThan(0);
  });
});

import { breakSentences } from './format';

describe('breakSentences', () => {
  it('breaks after sentence ends but not inside code or decimals', () => {
    expect(breakSentences('First one. Second one? Third!')).toBe('First one.  \nSecond one?  \nThird!');
    expect(breakSentences('Use `a. B` here. Then `x`.')).toBe('Use `a. B` here.  \nThen `x`.');
    expect(breakSentences('Pi is 3.14 e.g. close. Done')).toBe('Pi is 3.14 e.g. close.  \nDone');
    expect(breakSentences('Code:\n\n```py\nx = 1. Y = 2\n```')).toBe('Code:\n\n```py\nx = 1. Y = 2\n```');
  });
});

describe('detective helpers', () => {
  it('diffs removed lines before added ones', () => {
    expect(lineDiff(['a', 'b', 'c'], ['a', 'x', 'c']).map((d) => d.kind)).toEqual(['same', 'del', 'add', 'same']);
    expect(lineDiff(['a', 'c'], ['a', 'b', 'c']).map((d) => `${d.kind}:${d.text}`)).toEqual(['same:a', 'add:b', 'same:c']);
  });
  it('fills gaps with the indentation of the gap line', () => {
    expect(fillGaps(['if x:', '    «?»', 'done'], ['  y = 1 '])).toEqual(['if x:', '    y = 1', 'done']);
  });
});
