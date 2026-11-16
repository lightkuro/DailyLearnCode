import { describe, expect, it } from 'vitest';
import { COMPACT_KEYS, MORE_KEYS, formatKey, keysFor, parseKey, rowsFor } from './keybarKeys';

describe('shortcut keys', () => {
  it('reads tap/hold keys with several hold options', () => {
    expect(parseKey('(/)')).toEqual({ tap: '(', hold: [')'] });
    expect(parseKey('+/-/*/%')).toEqual({ tap: '+', hold: ['-', '*', '%'] });
    expect(parseKey('->/::')).toEqual({ tap: '->', hold: ['::'] });
  });
  it('keeps slashes usable', () => {
    expect(parseKey('/')).toEqual({ tap: '/', hold: [] });
    expect(parseKey('//')).toEqual({ tap: '//', hold: [] });
    expect(parseKey('/=')).toEqual({ tap: '/=', hold: [] });
    expect(parseKey('\\//%')).toEqual({ tap: '/', hold: ['%'] });
    expect(parseKey('+/\\/')).toEqual({ tap: '+', hold: ['/'] });
  });
  it('formats back to the same text', () => {
    for (const t of ['(/)', '+/-/*/%', '\\//%', '//', 'tab', '=/:']) expect(formatKey(parseKey(t))).toBe(t);
  });
  it('compact defaults fit one row, brackets near the end, = with : or ; last', () => {
    for (const lang of Object.keys(COMPACT_KEYS) as (keyof typeof COMPACT_KEYS)[]) {
      const keys = keysFor(lang);
      expect(rowsFor(keys.length), lang).toBe(1);
      expect(keys.at(-1), lang).toEqual({ tap: '=', hold: [lang === 'python3' ? ':' : ';'] });
      expect(keys.slice(-4, -1).map((k) => k.tap), lang).toEqual(['[', '{', '(']);
      expect(COMPACT_KEYS[lang].includes(';'), lang).toBe(lang !== 'python3');
    }
  });
  it('the longer set takes two rows', () => {
    expect(rowsFor(keysFor('python3', { more: true }).length)).toBe(2);
    expect(MORE_KEYS.cpp.includes('left right')).toBe(true);
  });
  it('splits hold keys apart when holding is off; custom lists win', () => {
    expect(keysFor('java', { custom: { java: '+/-/* ;' }, hold: false }).map((k) => k.tap)).toEqual(['+', '-', '*', ';']);
    expect(keysFor('java', { custom: { java: '   ' } })).toEqual(keysFor('java'));
  });
});
