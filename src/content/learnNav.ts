import type { Heading } from './learn';
import { AREA_LABEL, GUIDES, GUIDES_LABEL, TOPICS, type Area } from './topics';

/**
 * Getting around Learn: how the index is laid out (sections and groups) and how a page's headings nest.
 * The browser side (view choice, recent pages, scroll-spy) is in useLearnNav.ts.
 */

export interface LearnSectionDef {
  key: Area | 'guides';
  label: string;
  /** For the jump chips, where the full label doesn't fit. */
  short: string;
  blurb?: string;
  /** Pages in order; a group without a name has no sub-heading. */
  groups: { name: string; slugs: string[] }[];
}

const AREA_SHORT: Record<Area, string> = { dsa: 'Algorithms', swe: 'Software' };

export const LEARN_SECTIONS: LearnSectionDef[] = [
  ...(['dsa', 'swe'] as Area[]).map((area) => {
    const inArea = TOPICS.filter((t) => t.area === area);
    return {
      key: area,
      label: AREA_LABEL[area],
      short: AREA_SHORT[area],
      groups: [...new Set(inArea.map((t) => t.group))].map((name) => ({
        name,
        slugs: inArea.filter((t) => t.group === name).map((t) => t.id),
      })),
    };
  }),
  {
    key: 'guides',
    label: GUIDES_LABEL,
    short: 'Languages',
    blurb: 'For programmers who know another language: syntax, idioms, the standard library and the gotchas, fast.',
    groups: [{ name: '', slugs: GUIDES.map((g) => g.id) }],
  },
];

/** The element id of a section on the index (jump chips scroll to it). */
export const sectionAnchor = (key: string) => `area-${key}`;

// ---------- contents ----------

export interface HeadingGroup {
  /** The ## heading; null for ### headings that come before the first ##. */
  head: Heading | null;
  kids: Heading[];
}

/** ## headings with their ### headings under them. */
export function groupHeadings(heads: Heading[]): HeadingGroup[] {
  const out: HeadingGroup[] = [];
  for (const h of heads) {
    if (h.depth === 2) out.push({ head: h, kids: [] });
    else if (out.length) out[out.length - 1].kids.push(h);
    else out.push({ head: null, kids: [h] });
  }
  return out;
}

/** Long contents lists fold their ### headings away, except under the section being read. */
export const FOLD_OVER = 14;

/** The ## heading a heading id sits under (itself for a ## heading). */
export function parentOf(groups: HeadingGroup[], id: string): string {
  for (const g of groups) if (g.head?.id === id || g.kids.some((k) => k.id === id)) return g.head?.id ?? '';
  return '';
}
