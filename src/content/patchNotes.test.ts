import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RELEASES, parsePatchNotes } from './patchNotes';

const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

describe('patch notes', () => {
  it('parse versions, dates, highlights and bodies', () => {
    const r = parsePatchNotes('<!-- note -->\n## 1.2.0 — 2026-01-02\n\n### Big thing\n\n- a\n\n## 1.1.0 — 2026-01-01\n\n- b\n');
    expect(r).toEqual([
      { version: '1.2.0', date: '2026-01-02', title: 'Big thing', md: '- a', id: 'v1-2-0' },
      { version: '1.1.0', date: '2026-01-01', title: undefined, md: '- b', id: 'v1-1-0' },
    ]);
  });

  it('cover the current version, newest first, each with notes', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(RELEASES[0].version).toBe(pkg.version);
    for (let i = 1; i < RELEASES.length; i++) expect(cmp(RELEASES[i - 1].version, RELEASES[i].version)).toBeGreaterThan(0);
    for (const r of RELEASES) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.md.length).toBeGreaterThan(10);
    }
  });
});
