import { describe, expect, it } from 'vitest';
import { parseDiagram } from './diagram';
import { groupCodeFences, headingsOf, parseLearnSource, searchSections, slugify } from './learn';
import { LEARN_SECTIONS, groupHeadings, parentOf } from './learnNav';
import { fold, markParts, searchLearn, snippetOf } from './learnSearch';
import { linkForPhrase, termMatcher } from './termLinks';
import { GUIDES, TOPICS, topicOf, topicsOf, unknownTags } from './topics';

describe('topics', () => {
  it('maps every tag to exactly one topic', () => {
    const seen = new Map<string, string>();
    for (const t of TOPICS)
      for (const tag of t.tags) {
        expect(seen.has(tag), `${tag} is in ${seen.get(tag)} and ${t.id}`).toBe(false);
        seen.set(tag, t.id);
      }
    expect(topicOf('Hash Map')?.id).toBe('hashing');
    expect(topicsOf(['bfs', 'dfs', 'graphs', 'dijkstra']).map((t) => t.id)).toEqual(['graphs', 'shortest-paths']);
    expect(unknownTags(['arrays', 'made up'])).toEqual(['made up']);
  });
});

describe('learn pages', () => {
  const src = `---
title: Binary trees
summary: A short summary.
related: graphs, heaps
terms:
  - binary tree
  - inorder traversal #depth-first-orders
---

## What it is

Text.

## Depth-first orders

\`\`\`python
x = 1
\`\`\`

\`\`\`java
int x = 1;
\`\`\`

\`\`\`cpp
int x = 1;
\`\`\`

\`\`\`sql
SELECT 1;
\`\`\`
`;
  it('parses front matter and terms', () => {
    const p = parseLearnSource('trees', src);
    expect(p.title).toBe('Binary trees');
    expect(p.related).toEqual(['graphs', 'heaps']);
    expect(p.terms).toEqual([{ term: 'binary tree' }, { term: 'inorder traversal', anchor: 'depth-first-orders' }]);
    expect(headingsOf(p.md).map((h) => h.id)).toEqual(['what-it-is', 'depth-first-orders']);
    expect(() => parseLearnSource('x', 'no front matter')).toThrow(/front matter/);
  });
  it('slugifies headings like the anchors expect', () => {
    expect(slugify('Depth-first: preorder, inorder, postorder')).toBe('depth-first-preorder-inorder-postorder');
    expect(slugify('Greedy & intervals')).toBe('greedy-intervals');
    expect(slugify('`O(n log n)` sorts')).toBe('on-log-n-sorts');
  });
  it('groups consecutive python/java/cpp fences into one block', () => {
    const out = groupCodeFences(parseLearnSource('trees', src).md);
    const m = /```codegroup\n(.*)\n```/.exec(out);
    expect(JSON.parse(m![1])).toEqual({ python3: 'x = 1', java: 'int x = 1;', cpp: 'int x = 1;' });
    expect(out).toContain('```sql\nSELECT 1;\n```');
  });
});

describe('term links', () => {
  const terms = [
    { term: 'binary tree', href: '/learn/trees' },
    { term: 'binary search', href: '/learn/binary-search' },
    { term: 'BST', href: '/learn/trees#bst' },
  ];
  it('matches whole words, longest first, ignoring case except for acronyms', () => {
    const m = termMatcher([...terms, { term: 'REST', href: '/learn/api-design' }])!;
    expect(m.find('A Binary Tree is not a binary searching BST.').map((x) => x.text)).toEqual(['Binary Tree', 'BST']);
    // Acronyms keep their capitals: "the rest" isn't a REST API, and "bst" isn't linked.
    expect(m.find('For the rest, a REST call; bst.').map((x) => x.text)).toEqual(['REST']);
    expect(linkForPhrase('BST', terms)).toBe('/learn/trees#bst');
    expect(linkForPhrase('Binary search on the answer', terms)).toBe('/learn/binary-search');
    expect(linkForPhrase('heap', terms)).toBeUndefined();
  });
});

describe('diagrams', () => {
  it('accepts valid diagrams and explains bad ones', () => {
    expect(parseDiagram('{"type":"tree","values":[1,2,null,3],"order":[3,2,1]}').ok).toBe(true);
    const bad = parseDiagram('{"type":"tree","values":[1,2],"highlight":[9]}');
    expect(bad.ok ? '' : bad.error).toMatch(/no node 9/);
    const edge = parseDiagram('{"type":"graph","nodes":["A","B"],"edges":[["A","C"]]}');
    expect(edge.ok ? '' : edge.error).toMatch(/unknown node C/);
    expect(parseDiagram('{"type":"array","values":[1,2],"pointers":{"i":5}}').ok).toBe(false);
    expect(parseDiagram('not json').ok).toBe(false);
  });
});

describe('learn search', () => {
  const md = [
    'Intro with a [link](/learn/heaps) and **bold** text.',
    '',
    '## Sift up and sift down',
    '',
    'Swap with the *smaller* child; `heap_push` is O(log n).',
    '',
    '```python',
    'import heapq',
    'heapq.heappush(h, 3)',
    '```',
    '',
    '| a | b |',
    '|---|---|',
    '| min-heap | max-heap |',
    '',
    '### Running median',
    '',
    '- keep two heaps',
  ].join('\n');

  it('splits a page into plain-text sections with heading ids', () => {
    const s = searchSections(md);
    expect(s.map((x) => x.id)).toEqual(['', 'sift-up-and-sift-down', 'running-median']);
    expect(s[0].t).toBe('Intro with a link and bold text.');
    expect(s[1].t).toBe('Swap with the smaller child; heap_push is O(log n). a b min-heap max-heap');
    expect(s[1].c.split(' ')).toContain('heapq.heappush');
    expect(s[2].t).toBe('keep two heaps');
  });

  it('needs every word, ranks headings first, and finds code-only words', () => {
    const index = { pages: [{ slug: 'heaps', title: 'Heaps', sections: searchSections(md) }] };
    expect(searchLearn(index, null, 'median heaps')[0].sections.map((s) => s.id)).toEqual(['running-median']);
    expect(searchLearn(index, null, 'banana')).toEqual([]);
    const code = searchLearn(index, null, 'heappush')[0].sections[0];
    expect(code).toMatchObject({ id: 'sift-up-and-sift-down', inCode: true, snippet: '' });
    expect(searchLearn(index, null, 'min heap')[0].sections[0].id).toBe('sift-up-and-sift-down');
  });

  it('marks matches and cuts snippets around them', () => {
    expect(markParts('A min-heap here', ['min heap'])).toEqual([
      { s: 'A ', hit: false },
      { s: 'min-heap', hit: true },
      { s: ' here', hit: false },
    ]);
    const long = `${'word '.repeat(80)}needle ${'tail '.repeat(80)}`.trim();
    const snip = snippetOf(long, ['needle'], '', 60);
    expect(snip).toContain('needle');
    expect(snip.startsWith('…') && snip.endsWith('…')).toBe(true);
    expect(fold('Hierholzer’s')).toBe("hierholzer's");
  });
});

describe('learn navigation', () => {
  it('lists every topic and guide exactly once across the index sections', () => {
    const slugs = LEARN_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.slugs));
    expect([...slugs].sort()).toEqual([...TOPICS.map((t) => t.id), ...GUIDES.map((g) => g.id)].sort());
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('groups ### headings under their ## heading', () => {
    const heads = headingsOf('### Before\n\n## One\n\n### A\n\n### B\n\n## Two\n');
    const groups = groupHeadings(heads);
    expect(groups.map((g) => [g.head?.id ?? null, g.kids.map((k) => k.id)])).toEqual([
      [null, ['before']],
      ['one', ['a', 'b']],
      ['two', []],
    ]);
    expect(parentOf(groups, 'b')).toBe('one');
    expect(parentOf(groups, 'two')).toBe('two');
    expect(parentOf(groups, 'before')).toBe('');
    expect(parentOf(groups, 'missing')).toBe('');
  });
});
