import type { LearnTerm } from './learn';

/* Minimal mdast shapes (avoids depending on @types/mdast directly). */
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
}

const SKIP = new Set(['link', 'linkReference', 'inlineCode', 'code', 'heading', 'definition', 'html', 'image', 'imageReference']);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Acronyms and camelCase names (REST, SOLID, hashCode) only match with the same capitals, so "the rest" stays plain text. */
const caseSensitive = (term: string) => /[A-Z]/.test(term.slice(1));

export interface TermMatcher {
  /** Non-overlapping hits in `text`, left to right (longer terms win). */
  find(text: string): { index: number; text: string; href: string; key: string }[];
  hrefOf(phrase: string): string | undefined;
}

/** Build a matcher for a term list (whole words; longest terms first). */
export function termMatcher(terms: LearnTerm[]): TermMatcher | null {
  if (!terms.length) return null;
  const exact = new Map<string, string>();
  const loose = new Map<string, string>();
  for (const t of terms) {
    if (caseSensitive(t.term)) exact.set(t.term, t.href);
    else loose.set(t.term.toLowerCase(), t.href);
  }
  const build = (keys: string[], flags: string) =>
    keys.length ? new RegExp(`(?<![\\w-])(${[...keys].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})(?![\\w-])`, flags) : null;
  const reExact = build([...exact.keys()], 'g');
  const reLoose = build([...loose.keys()], 'gi');
  return {
    find(text) {
      const hits: { index: number; text: string; href: string; key: string }[] = [];
      for (const [re, map, lower] of [
        [reExact, exact, false],
        [reLoose, loose, true],
      ] as const) {
        if (!re) continue;
        re.lastIndex = 0;
        for (let m = re.exec(text); m; m = re.exec(text)) {
          const key = lower ? m[1].toLowerCase() : m[1];
          hits.push({ index: m.index, text: m[1], href: map.get(key)!, key: m[1].toLowerCase() });
        }
      }
      hits.sort((a, b) => a.index - b.index || b.text.length - a.text.length);
      const out: typeof hits = [];
      let end = 0;
      for (const h of hits) if (h.index >= end) {
        out.push(h);
        end = h.index + h.text.length;
      }
      return out;
    },
    hrefOf(phrase) {
      return exact.get(phrase.trim()) ?? loose.get(phrase.trim().toLowerCase());
    },
  };
}

/**
 * Remark plugin: link the first mention of each Learn term in the text (not inside code, links or
 * headings). `skipPrefix` leaves terms that point at the current page alone.
 */
export function remarkTermLinks(opts: { terms: LearnTerm[]; skipPrefix?: string }) {
  const m = termMatcher(opts.terms);
  return () => (tree: MdNode) => {
    if (!m) return;
    const used = new Set<string>();
    const visit = (node: MdNode) => {
      if (!node.children) return;
      const next: MdNode[] = [];
      for (const child of node.children) {
        if (SKIP.has(child.type)) {
          next.push(child);
          continue;
        }
        if (child.type !== 'text' || !child.value) {
          visit(child);
          next.push(child);
          continue;
        }
        const text = child.value;
        let last = 0;
        for (const hit of m.find(text)) {
          if (used.has(hit.key) || (opts.skipPrefix && (hit.href === opts.skipPrefix || hit.href.startsWith(`${opts.skipPrefix}#`)))) continue;
          used.add(hit.key);
          if (hit.index > last) next.push({ type: 'text', value: text.slice(last, hit.index) });
          next.push({ type: 'link', url: hit.href, data: { hProperties: { className: 'term-link' } }, children: [{ type: 'text', value: hit.text }] });
          last = hit.index + hit.text.length;
        }
        if (last === 0) next.push(child);
        else if (last < text.length) next.push({ type: 'text', value: text.slice(last) });
      }
      node.children = next;
    };
    visit(tree);
  };
}

/** Plain-text lookup: the Learn link for a short phrase (e.g. a key term), if one matches exactly or contains a term. */
export function linkForPhrase(phrase: string, terms: LearnTerm[]): string | undefined {
  const m = termMatcher(terms);
  if (!m) return undefined;
  return m.hrefOf(phrase) ?? m.find(phrase)[0]?.href;
}
