import { z } from 'zod';

/**
 * Learn pages: content/learn/<topic-id>.md, a small front matter block and Markdown.
 *
 *   ---
 *   title: Binary trees & traversals
 *   summary: One sentence for the index card.
 *   related: graphs, heaps
 *   terms:
 *     - binary tree
 *     - inorder traversal #traversals
 *   ---
 *
 * `terms` are phrases that link here from Explore-topic panels and other Learn pages; `#anchor` points
 * at a heading on this page (its slugified text). Consecutive python / java / cpp code fences become one
 * block that follows the player's language, and ```diagram fences hold JSON pictures (content/diagram.ts).
 */
export const LearnTermSchema = z.object({ term: z.string().min(2), href: z.string() });
export type LearnTerm = z.infer<typeof LearnTermSchema>;

export const LearnPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(60),
  summary: z.string().min(1).max(220),
  related: z.array(z.string()).default([]),
  md: z.string().min(1),
});
export type LearnPage = z.infer<typeof LearnPageSchema>;

export const LearnIndexSchema = z.object({
  pages: z.array(LearnPageSchema.omit({ md: true }).extend({ terms: z.array(LearnTermSchema), minutes: z.number().int().positive() })),
  builtAt: z.string(),
});
export type LearnIndex = z.infer<typeof LearnIndexSchema>;

export interface LearnSource extends LearnPage {
  terms: { term: string; anchor?: string }[];
}

/** "Inorder, preorder & postorder" → "inorder-preorder-postorder" (heading ids and term anchors). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Parse a page file (front matter + Markdown). Throws with a readable message when malformed. */
export function parseLearnSource(slug: string, src: string): LearnSource {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src.replace(/\r\n/g, '\n'));
  if (!m) throw new Error(`${slug}: missing the --- front matter block`);
  const meta: Record<string, string> = {};
  const terms: { term: string; anchor?: string }[] = [];
  let inTerms = false;
  for (const raw of m[1].split('\n')) {
    if (!raw.trim()) continue;
    const item = /^\s+-\s+(.+?)\s*$/.exec(raw);
    if (item && inTerms) {
      const t = /^(.*?)\s+#([a-z0-9-]+)$/.exec(item[1]);
      terms.push(t ? { term: t[1].trim(), anchor: t[2] } : { term: item[1].trim() });
      continue;
    }
    const kv = /^([a-z]+):\s*(.*)$/.exec(raw);
    if (!kv) throw new Error(`${slug}: can't read front matter line "${raw}"`);
    inTerms = kv[1] === 'terms';
    if (!inTerms) meta[kv[1]] = kv[2].trim();
  }
  const page = LearnPageSchema.parse({
    slug,
    title: meta.title,
    summary: meta.summary,
    related: (meta.related ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    md: m[2].trim(),
  });
  return { ...page, terms };
}

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/** ## and ### headings outside code fences, with their ids (for the contents list and anchors). */
export function headingsOf(md: string): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence) continue;
    const h = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) out.push({ depth: h[1].length as 2 | 3, text: h[2].replace(/[`*_]/g, ''), id: slugify(h[2]) });
  }
  return out;
}

const GROUP_LANGS: Record<string, 'python3' | 'java' | 'cpp'> = { python: 'python3', python3: 'python3', py: 'python3', java: 'java', cpp: 'cpp', 'c++': 'cpp' };

/**
 * Merge runs of consecutive python / java / cpp fences into one ```codegroup fence holding JSON
 * {python3, java, cpp}, so the page shows the player's language with tabs for the others.
 */
export function groupCodeFences(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  const readFence = (at: number): { lang: string; body: string; end: number } | null => {
    const open = /^```\s*([\w+]+)\s*$/.exec(lines[at] ?? '');
    if (!open) return null;
    let j = at + 1;
    while (j < lines.length && !/^```\s*$/.test(lines[j])) j++;
    if (j >= lines.length) return null;
    return { lang: open[1].toLowerCase(), body: lines.slice(at + 1, j).join('\n'), end: j };
  };
  while (i < lines.length) {
    const f = readFence(i);
    if (!f || !GROUP_LANGS[f.lang]) {
      // Copy any other fence verbatim (so a code line that looks like a fence opener isn't misread).
      if (f) {
        out.push(...lines.slice(i, f.end + 1));
        i = f.end + 1;
      } else out.push(lines[i++]);
      continue;
    }
    const group: Record<string, string> = { [GROUP_LANGS[f.lang]]: f.body };
    let end = f.end;
    for (;;) {
      let k = end + 1;
      while (k < lines.length && !lines[k].trim()) k++;
      const g = readFence(k);
      if (!g || !GROUP_LANGS[g.lang] || group[GROUP_LANGS[g.lang]] !== undefined) break;
      group[GROUP_LANGS[g.lang]] = g.body;
      end = g.end;
    }
    out.push('```codegroup', JSON.stringify(group), '```');
    i = end + 1;
  }
  return out.join('\n');
}

/** Reading time for the index cards (prose words; code and diagrams count less). */
export function readingMinutes(md: string): number {
  const prose = md.replace(/```[\s\S]*?```/g, ' code ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  const fences = (md.match(/```/g) ?? []).length / 2;
  return Math.max(1, Math.round(words / 230 + fences * 0.25));
}

/** Term links for a page, resolved to URLs. */
export function termLinks(p: LearnSource): LearnTerm[] {
  return p.terms.map((t) => ({ term: t.term, href: `/learn/${p.slug}${t.anchor ? `#${t.anchor}` : ''}` }));
}

// ---------- search ----------

/** One ## / ### section of a page as plain text, for the Learn search (id '' is the intro). */
export interface LearnSection {
  id: string;
  /** Heading text ('' for the intro before the first heading). */
  h: string;
  /** Prose with the Markdown taken out (links keep their text, diagrams keep their captions). */
  t: string;
  /** Distinct identifiers from the section's code, space-separated (searchable, never shown in full). */
  c: string;
}
export interface LearnSearchIndex {
  pages: { slug: string; title: string; sections: LearnSection[] }[];
}

/** Inline Markdown → plain text. */
export function plainInline(s: string): string {
  const code: string[] = [];
  return s
    .replace(/`([^`]+)`/g, (_, c: string) => `${code.push(c) - 1}`)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|\*/g, '')
    .replace(/(^|[^\w])_(?=\S)|(?<=\S)_(?=[^\w]|$)/g, '$1')
    .replace(/~~/g, '')
    .replace(/(\d+)/g, (_, i: string) => code[Number(i)]);
}

/** Captions and labels inside a ```diagram fence (JSON), so pictures are findable too. */
function diagramText(json: string): string {
  try {
    const out: string[] = [];
    const walk = (v: unknown, key = ''): void => {
      if (typeof v === 'string' && /^(caption|title|label|note|text)$/.test(key)) out.push(v);
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key === 'labels' ? 'label' : ''));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(JSON.parse(json));
    return out.join(' ');
  } catch {
    return '';
  }
}

/** Split a page into sections of searchable plain text (headings follow headingsOf's ids). */
export function searchSections(md: string): LearnSection[] {
  const out: LearnSection[] = [];
  let cur = { id: '', h: '', t: [] as string[], c: new Set<string>() };
  const flush = () => {
    const t = cur.t.join(' ').replace(/\s+/g, ' ').trim();
    if (t || cur.h || cur.c.size) out.push({ id: cur.id, h: cur.h, t, c: [...cur.c].join(' ') });
  };
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w+-]*)/.exec(line);
    if (fence) {
      let j = i + 1;
      while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++;
      const body = lines.slice(i + 1, j).join('\n');
      if (fence[1] === 'diagram') cur.t.push(diagramText(body));
      else for (const w of body.match(/[A-Za-z_][\w.]*[\w]|[A-Za-z_]/g) ?? []) if (w.length >= 3) cur.c.add(w);
      i = j;
      continue;
    }
    const h = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      flush();
      cur = {
        id: slugify(h[2]),
        h: h[2].replace(/[`*_]/g, ''),
        t: [],
        c: new Set(),
      };
      continue;
    }
    if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // table divider
    const text = line
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/\|/g, ' ');
    if (text.trim()) cur.t.push(plainInline(text));
  }
  flush();
  return out;
}
