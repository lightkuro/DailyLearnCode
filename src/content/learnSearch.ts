import type { LearnIndex, LearnSearchIndex } from './learn';

/**
 * Learn search: every query word must appear in a section (its heading, prose, code identifiers or the
 * page title). Sections are ranked by where the words are (heading > page title > prose > code) and
 * grouped by page.
 */

/** Lower case, curly quotes straightened, `-` and `_` read as spaces. Keeps the length (positions line up). */
export function fold(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[-‐‑–—_]/g, ' ')
    .toLowerCase();
}

export function queryWords(q: string): string[] {
  return [...new Set(fold(q).split(/\s+/).filter(Boolean))];
}

export interface SectionHit {
  id: string;
  heading: string;
  /** A short window of prose around the first match ('' when only the code matched). */
  snippet: string;
  inCode: boolean;
  score: number;
}
export interface PageHit {
  slug: string;
  title: string;
  summary: string;
  sections: SectionHit[];
  score: number;
}

const count = (hay: string, needle: string): number => {
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0 && n < 20; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
};

/** About `width` characters of `text` around the first match, cut at word boundaries. */
export function snippetOf(text: string, words: string[], phrase: string, width = 180): string {
  const f = fold(text);
  let at = phrase ? f.indexOf(phrase) : -1;
  if (at < 0) {
    const hits = words.map((w) => f.indexOf(w)).filter((i) => i >= 0);
    at = hits.length ? Math.min(...hits) : 0;
  }
  if (text.length <= width) return text;
  let start = Math.max(0, at - Math.round(width * 0.35));
  let end = Math.min(text.length, start + width);
  start = Math.max(0, end - width);
  if (start > 0) {
    const sp = text.indexOf(' ', start);
    if (sp >= 0 && sp < at) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(' ', end);
    if (sp > at) end = sp;
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Folded copies are made once per index (searching runs on every keystroke). */
interface Prepared {
  slug: string;
  title: string;
  ft: string;
  sections: {
    id: string;
    h: string;
    t: string;
    fh: string;
    ft: string;
    fc: string;
  }[];
}
const prepared = new WeakMap<LearnSearchIndex, Prepared[]>();
function prepare(index: LearnSearchIndex): Prepared[] {
  let p = prepared.get(index);
  if (!p) {
    p = index.pages.map((pg) => ({
      slug: pg.slug,
      title: pg.title,
      ft: fold(pg.title),
      sections: pg.sections.map((s) => ({
        id: s.id,
        h: s.h,
        t: s.t,
        fh: fold(s.h),
        ft: fold(s.t),
        fc: fold(s.c),
      })),
    }));
    prepared.set(index, p);
  }
  return p;
}

/** Pages with their matching sections, best first. `meta` adds summaries and term matches. */
export function searchLearn(index: LearnSearchIndex, meta: LearnIndex | null, q: string): PageHit[] {
  const words = queryWords(q);
  if (!words.length) return [];
  const phrase = words.length > 1 ? fold(q).trim().replace(/\s+/g, ' ') : '';
  const byMeta = new Map(meta?.pages.map((p) => [p.slug, p]) ?? []);
  const out: PageHit[] = [];
  for (const page of prepare(index)) {
    const info = byMeta.get(page.slug);
    const fsum = fold(info?.summary ?? '');
    const fterms = fold(info?.terms.map((t) => t.term).join(' | ') ?? '');
    const sections: SectionHit[] = [];
    for (const s of page.sections) {
      const all = `${s.fh} ${s.ft} ${s.fc} ${page.ft}`;
      if (!words.every((w) => all.includes(w))) continue;
      // The page title alone doesn't make every section a match.
      if (!words.some((w) => s.fh.includes(w) || s.ft.includes(w) || s.fc.includes(w))) continue;
      let score = 0;
      for (const w of words) {
        if (s.fh.includes(w)) score += 10;
        if (page.ft.includes(w)) score += 3;
        score += Math.min(count(s.ft, w), 5);
        if (s.fc.includes(w)) score += 1;
      }
      if (phrase) {
        if (s.fh.includes(phrase)) score += 30;
        score += Math.min(count(s.ft, phrase), 4) * 6;
      } else if (s.fh === words[0]) score += 15;
      const inProse = words.some((w) => s.fh.includes(w) || s.ft.includes(w));
      sections.push({
        id: s.id,
        heading: s.h || page.title,
        snippet: inProse ? snippetOf(s.t, words, phrase) : '',
        inCode: !words.every((w) => `${s.fh} ${s.ft} ${page.ft}`.includes(w)),
        score,
      });
    }
    const metaHit = words.every((w) => page.ft.includes(w) || fsum.includes(w) || fterms.includes(w));
    if (!sections.length && !metaHit) continue;
    sections.sort((a, b) => b.score - a.score);
    let score = sections.length ? sections[0].score + sections.slice(1).reduce((n, s) => n + s.score, 0) * 0.15 : 0;
    if (words.every((w) => page.ft.includes(w))) score += 40;
    else if (metaHit) score += 15;
    out.push({
      slug: page.slug,
      title: page.title,
      summary: info?.summary ?? '',
      sections,
      score,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Split `text` into plain and matched parts, for <mark>ing the query words in a snippet. */
export function markParts(text: string, words: string[]): { s: string; hit: boolean }[] {
  if (!words.length) return [{ s: text, hit: false }];
  const f = fold(text);
  const hit = new Uint8Array(text.length);
  for (const w of words) for (let i = f.indexOf(w); i >= 0; i = f.indexOf(w, i + w.length)) hit.fill(1, i, i + w.length);
  const out: { s: string; hit: boolean }[] = [];
  let from = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || hit[i] !== hit[from]) {
      out.push({ s: text.slice(from, i), hit: hit[from] === 1 });
      from = i;
    }
  }
  return out;
}
