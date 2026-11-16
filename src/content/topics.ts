/**
 * The topic map: every content tag belongs to exactly one topic, and every topic has a Learn page
 * (content/learn/<id>.md). Stats group answers by topic, Unlimited filters by it, and tags link to
 * the matching Learn page. The validator rejects tags that aren't listed here.
 */
export type Area = 'dsa' | 'swe';

export interface Topic {
  /** Also the Learn page slug. */
  id: string;
  label: string;
  area: Area;
  group: string;
  /** Tags (lowercase) that mean this topic. The first one is the canonical tag. */
  tags: string[];
}

export const AREA_LABEL: Record<Area, string> = { dsa: 'Algorithms & data structures', swe: 'Software engineering' };

export const TOPICS: Topic[] = [
  // ---- Algorithms & data structures ----
  { id: 'big-o', label: 'Big-O & complexity', area: 'dsa', group: 'Foundations', tags: ['complexity', 'big-o', 'time complexity', 'space complexity', 'amortized analysis'] },
  { id: 'arrays-strings', label: 'Arrays & strings', area: 'dsa', group: 'Foundations', tags: ['arrays', 'strings', 'matrix', 'grids', 'simulation', 'merging', 'data structures'] },
  { id: 'hashing', label: 'Hash maps & sets', area: 'dsa', group: 'Foundations', tags: ['hashing', 'hash map', 'hash set', 'hash table', 'counting'] },
  { id: 'recursion-backtracking', label: 'Recursion & backtracking', area: 'dsa', group: 'Foundations', tags: ['recursion', 'backtracking', 'divide and conquer'] },
  { id: 'sorting', label: 'Sorting', area: 'dsa', group: 'Foundations', tags: ['sorting', 'bucket sort', 'merge sort', 'quicksort', 'counting sort'] },
  { id: 'two-pointers', label: 'Two pointers', area: 'dsa', group: 'Patterns', tags: ['two pointers'] },
  { id: 'sliding-window', label: 'Sliding window', area: 'dsa', group: 'Patterns', tags: ['sliding window'] },
  { id: 'prefix-sums', label: 'Prefix sums', area: 'dsa', group: 'Patterns', tags: ['prefix sums', 'prefix sum', 'difference array'] },
  { id: 'binary-search', label: 'Binary search', area: 'dsa', group: 'Patterns', tags: ['binary search'] },
  { id: 'greedy-intervals', label: 'Greedy & intervals', area: 'dsa', group: 'Patterns', tags: ['greedy', 'intervals'] },
  { id: 'bit-manipulation', label: 'Bit manipulation', area: 'dsa', group: 'Patterns', tags: ['bit manipulation', 'bits', 'xor'] },
  { id: 'math', label: 'Math & combinatorics', area: 'dsa', group: 'Patterns', tags: ['math', 'combinatorics', 'number theory'] },
  { id: 'stacks-queues', label: 'Stacks & queues', area: 'dsa', group: 'Data structures', tags: ['stacks', 'stack', 'queues', 'queue', 'deque', 'monotonic stack', 'monotonic queue'] },
  { id: 'linked-lists', label: 'Linked lists', area: 'dsa', group: 'Data structures', tags: ['linked list', 'linked lists'] },
  { id: 'trees', label: 'Binary trees & traversals', area: 'dsa', group: 'Data structures', tags: ['trees', 'binary tree', 'tree traversal', 'bst', 'binary search tree'] },
  { id: 'heaps', label: 'Heaps & priority queues', area: 'dsa', group: 'Data structures', tags: ['heap', 'heaps', 'priority queue', 'top-k'] },
  { id: 'tries', label: 'Tries', area: 'dsa', group: 'Data structures', tags: ['trie', 'tries', 'prefix tree'] },
  { id: 'union-find', label: 'Union-find', area: 'dsa', group: 'Data structures', tags: ['union-find', 'disjoint set'] },
  { id: 'graphs', label: 'Graphs: BFS & DFS', area: 'dsa', group: 'Graphs', tags: ['graphs', 'bfs', 'dfs', 'graph traversal', 'connected components'] },
  { id: 'shortest-paths', label: 'Shortest paths', area: 'dsa', group: 'Graphs', tags: ['dijkstra', 'shortest path', 'bellman-ford', '0-1 bfs'] },
  { id: 'topological-sort', label: 'Topological sort', area: 'dsa', group: 'Graphs', tags: ['topological sort', 'dag'] },
  { id: 'dynamic-programming', label: 'Dynamic programming', area: 'dsa', group: 'Techniques', tags: ['dynamic programming', 'memoization', 'kadane'] },

  // ---- Software engineering ----
  { id: 'databases', label: 'Databases & indexing', area: 'swe', group: 'Data', tags: ['databases', 'sql', 'indexing', 'nosql'] },
  { id: 'transactions', label: 'Transactions & isolation', area: 'swe', group: 'Data', tags: ['transactions', 'isolation'] },
  { id: 'caching', label: 'Caching', area: 'swe', group: 'Data', tags: ['caching', 'cdn'] },
  { id: 'system-design', label: 'System design basics', area: 'swe', group: 'Systems', tags: ['system design', 'scalability', 'load balancing', 'rate limiting', 'message queues', 'sharding'] },
  { id: 'distributed-systems', label: 'Distributed systems', area: 'swe', group: 'Systems', tags: ['distributed systems', 'replication', 'consensus', 'consistency'] },
  { id: 'networking', label: 'Networking & HTTP', area: 'swe', group: 'Systems', tags: ['networking', 'http', 'dns', 'web', 'tcp', 'tls'] },
  { id: 'api-design', label: 'API design', area: 'swe', group: 'Systems', tags: ['api design', 'rest', 'apis', 'versioning', 'idempotency'] },
  { id: 'security', label: 'Security', area: 'swe', group: 'Systems', tags: ['security', 'auth'] },
  { id: 'concurrency', label: 'Concurrency', area: 'swe', group: 'Code & runtime', tags: ['concurrency', 'async', 'java memory model', 'threads', 'locks'] },
  { id: 'os-memory', label: 'OS, memory & performance', area: 'swe', group: 'Code & runtime', tags: ['operating systems', 'memory', 'garbage collection', 'raii', 'performance'] },
  { id: 'language-gotchas', label: 'Language gotchas', area: 'swe', group: 'Code & runtime', tags: ['language gotchas', 'gotchas', 'language internals', 'python', 'javascript', 'java', 'c++', 'floating point', 'encoding', 'iterators', 'time'] },
  { id: 'oop-design', label: 'OOP & design patterns', area: 'swe', group: 'Code & runtime', tags: ['oop', 'design patterns', 'solid', 'object-oriented design'] },
  { id: 'testing-debugging', label: 'Testing & debugging', area: 'swe', group: 'Practice', tags: ['testing', 'debugging', 'code review'] },
  { id: 'devops', label: 'Git, deploys & reliability', area: 'swe', group: 'Practice', tags: ['git', 'devops', 'deployment', 'dependencies', 'reliability', 'observability', 'ci/cd'] },
];

/**
 * Language crash courses: Learn pages that aren't topics (no tags, no stats). Written for programmers who
 * know another language and want this one's syntax, idioms, library and gotchas fast.
 */
export interface Guide {
  /** Also the Learn page slug. */
  id: string;
  label: string;
  /** A shorter name for tight spots (the compact index tiles). */
  short?: string;
}
export const GUIDES_LABEL = 'Language crash courses';
export const GUIDES: Guide[] = [
  { id: 'lang-python', label: 'Python' },
  { id: 'lang-java', label: 'Java' },
  { id: 'lang-cpp', label: 'C++' },
  { id: 'lang-web', label: 'JavaScript, TypeScript, HTML & React', short: 'JS, TS, HTML & React' },
  { id: 'lang-sql', label: 'SQL & SQLite' },
];
export const GUIDE_BY_ID = new Map(GUIDES.map((g) => [g.id, g]));

/** Any Learn page: a topic or a language crash course. */
export const isLearnSlug = (slug: string) => TOPIC_BY_ID.has(slug) || GUIDE_BY_ID.has(slug);
/** Short name for links to a Learn page. */
export const learnLabel = (slug: string) => TOPIC_BY_ID.get(slug)?.label ?? GUIDE_BY_ID.get(slug)?.label ?? slug;

const BY_TAG = new Map<string, Topic>();
for (const t of TOPICS) for (const tag of t.tags) BY_TAG.set(tag, t);
export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function topicOf(tag: string): Topic | undefined {
  return BY_TAG.get(tag.trim().toLowerCase());
}

/** Distinct topics for a list of tags (unknown tags are dropped). */
export function topicsOf(tags: readonly string[]): Topic[] {
  const out: Topic[] = [];
  for (const tag of tags) {
    const t = topicOf(tag);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Problems with a tag the map doesn't know (for the validator). */
export function unknownTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !topicOf(t));
}

/** The canonical tag list as text (one line per topic), for docs and tooling. */
export function tagGuide(area?: Area): string {
  return TOPICS.filter((t) => !area || t.area === area)
    .map((t) => `${t.label}: ${t.tags.map((x) => `"${x}"`).join(', ')}`)
    .join('\n');
}
