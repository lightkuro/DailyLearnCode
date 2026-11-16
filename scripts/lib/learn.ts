import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseLearnSource, type LearnSource } from '../../src/content/learn';
import { GUIDES, TOPICS } from '../../src/content/topics';
import { LEARN_DIR } from './days';

/** Every Learn page source, in topic order, then the language crash courses (pages for unknown slugs last). */
export function readLearnPages(): LearnSource[] {
  if (!existsSync(LEARN_DIR)) return [];
  const order = new Map([...TOPICS, ...GUIDES].map((t, i) => [t.id, i]));
  return readdirSync(LEARN_DIR)
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => {
      try {
        return [parseLearnSource(basename(f, '.md'), readFileSync(join(LEARN_DIR, f), 'utf8'))];
      } catch (e) {
        console.warn(`content: skipped learn page ${f}: ${(e as Error).message.split('\n')[0]}`);
        return [];
      }
    })
    .sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999) || a.slug.localeCompare(b.slug));
}
