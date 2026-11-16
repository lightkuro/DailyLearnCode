/**
 * Checks content/learn/*.md: front matter, every ```diagram fence, term anchors, links between pages,
 * and that each topic in src/content/topics.ts has a page.
 *
 * Usage: tsx scripts/validate-learn.ts [slug ...]   (no slugs = every page)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseDiagram } from '../src/content/diagram';
import { groupCodeFences, headingsOf, parseLearnSource, type LearnSource } from '../src/content/learn';
import { GUIDES, TOPICS, isLearnSlug } from '../src/content/topics';
import { LEARN_DIR } from './lib/days';

export function validateLearn(only: string[] = []): { errors: string[]; warnings: string[]; pages: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!existsSync(LEARN_DIR)) return { errors: ['content/learn is missing'], warnings, pages: 0 };
  const pages: LearnSource[] = [];
  for (const f of readdirSync(LEARN_DIR).filter((n) => n.endsWith('.md'))) {
    try {
      pages.push(parseLearnSource(basename(f, '.md'), readFileSync(join(LEARN_DIR, f), 'utf8')));
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message.split('\n').slice(0, 6).join(' ')}`);
    }
  }
  const slugs = new Set(pages.map((p) => p.slug));
  const anchorsOf = new Map(pages.map((p) => [p.slug, new Set(headingsOf(p.md).map((h) => h.id))]));
  const termOwner = new Map<string, string>();
  for (const p of pages) for (const t of p.terms) {
    const k = t.term.toLowerCase();
    if (termOwner.has(k) && termOwner.get(k) !== p.slug) errors.push(`${p.slug}: term "${t.term}" is also claimed by ${termOwner.get(k)}`);
    termOwner.set(k, p.slug);
  }
  for (const p of pages) {
    if (only.length && !only.includes(p.slug)) continue;
    const e = (m: string) => errors.push(`${p.slug}: ${m}`);
    const w = (m: string) => warnings.push(`${p.slug}: ${m}`);
    if (!isLearnSlug(p.slug)) e('file name is not a topic or guide id in src/content/topics.ts');
    const heads = headingsOf(p.md);
    if (heads.filter((h) => h.depth === 2).length < 3) e('needs at least three ## sections');
    const ids = heads.map((h) => h.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) e(`duplicate heading ids: ${[...new Set(dup)].join(', ')}`);
    if (/^#\s/m.test(p.md.replace(/```[\s\S]*?```/g, ''))) e('do not use a # heading (the title comes from front matter)');
    if (p.terms.length < 3) e('list at least three terms');
    for (const t of p.terms) if (t.anchor && !anchorsOf.get(p.slug)!.has(t.anchor)) e(`term "${t.term}" points at #${t.anchor}, which is not a heading id here (ids: ${ids.join(', ')})`);
    for (const r of p.related) if (!slugs.has(r) && !isLearnSlug(r)) e(`related page "${r}" is not a topic id`);
    // Diagrams and code groups.
    const grouped = groupCodeFences(p.md);
    let n = 0;
    for (const m of grouped.matchAll(/```diagram\n([\s\S]*?)\n```/g)) {
      n++;
      const r = parseDiagram(m[1]);
      if (!r.ok) e(`diagram ${n}: ${r.error}`);
    }
    for (const m of grouped.matchAll(/```codegroup\n([\s\S]*?)\n```/g)) {
      const g = JSON.parse(m[1]) as Record<string, string>;
      const langs = Object.keys(g);
      if (langs.length === 2 && !p.slug.startsWith('lang-')) w(`a code group has only ${langs.join(', ')} (give python, java and cpp together)`);
    }
    for (const m of p.md.matchAll(/\]\((\/learn\/[^)\s]*)\)/g)) {
      const [, path] = m;
      const [slug, anchor] = path.slice('/learn/'.length).split('#');
      if (!slugs.has(slug) && !isLearnSlug(slug)) e(`link to unknown page ${path}`);
      else if (anchor && slugs.has(slug) && !anchorsOf.get(slug)!.has(anchor)) e(`link to missing anchor ${path}`);
      else if (!slugs.has(slug)) w(`link to ${path}: that page isn't written yet`);
    }
    if (/<\/?(div|span|br|img|svg|details|table)\b/i.test(p.md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, ''))) e('raw HTML is not rendered; use Markdown');
    if (/!\[[^\]]*\]\(/.test(p.md)) e('images are not rendered; use a ```diagram fence');
    const words = p.md.replace(/```[\s\S]*?```/g, '').split(/\s+/).length;
    if (words < 500) w(`only ${words} words of prose`);
    if (n === 0 && !p.slug.startsWith('lang-')) w('no diagrams');
  }
  for (const t of [...TOPICS, ...GUIDES]) if (!slugs.has(t.id) && !only.length) warnings.push(`no page yet for ${t.id}`);
  return { errors, warnings, pages: pages.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv.slice(2);
  const { errors, warnings, pages } = validateLearn(only);
  for (const x of warnings) console.warn(`  ⚠ ${x}`);
  for (const x of errors) console.error(`  ✘ ${x}`);
  console.log(errors.length ? `\nLearn: ${errors.length} error(s) in ${pages} page(s).` : `\nLearn: ${pages} page(s) valid.`);
  process.exit(errors.length ? 1 : 0);
}
