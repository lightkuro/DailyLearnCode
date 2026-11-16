/** Which quiz picture fits a question: keyword rules over its tags and wording. */
export type ArtKind =
  | 'graph'
  | 'tree'
  | 'array'
  | 'hash'
  | 'stack'
  | 'search'
  | 'clock'
  | 'grid'
  | 'bits'
  | 'database'
  | 'network'
  | 'lock'
  | 'threads'
  | 'server'
  | 'git'
  | 'test'
  | 'memory'
  | 'code'
  | 'computer';

/** Keyword rules, first match wins. Matched against tags + the question text, lower-cased. */
const RULES: [ArtKind, RegExp][] = [
  ['lock', /secur|auth|owasp|xss|csrf|inject|encrypt|password|hash(ing)? password|token|cors|tls|https/],
  ['database', /database|sql|index|transaction|isolation|acid|query|postgres|mysql|\bdb\b/],
  ['git', /\bgit\b|version control|rebase|merge conflict|commit|branch/],
  ['test', /\btest|mock|coverage|tdd|assert/],
  ['threads', /thread|concurren|mutex|lock-free|deadlock|race|semaphore|async|await|goroutine|parallel/],
  ['server', /distributed|replica|consisten|cap theorem|load balanc|shard|cach|queue system|message queue|kafka|microservice|server|scal/],
  ['network', /tcp|udp|dns|http|network|rest|api|socket|latency|packet|ip address|websocket/],
  ['memory', /memory|heap allocation|garbage|\bgc\b|process|operating system|\bos\b|schedul|virtual|paging|stack overflow/],
  ['graph', /graph|bfs|dfs|dijkstra|topolog|shortest path|union.?find|edge|vertex|vertices/],
  ['tree', /tree|bst|trie|traversal|inorder|preorder|postorder/],
  ['stack', /stack|queue|deque|monotonic|heap|priority/],
  ['grid', /dynamic programming|\bdp\b|memo|backtrack|subproblem|tabulation|knapsack/],
  ['bits', /\bbit|xor|binary representation|mask|two's complement/],
  ['search', /binary search|search|sorted|sort/],
  ['hash', /hash|dict|map|set\b|lookup/],
  ['array', /array|two pointer|sliding window|prefix|subarray|list|string/],
  ['clock', /complexity|big.?o|o\(|amortiz|runtime|time limit/],
  ['code', /code|snippet|output|print|function|class|python|java|c\+\+|javascript|rust|go\b/],
];

export function pickArt(text: string, tags: string[] = []): ArtKind {
  const hay = `${tags.join(' ')} ${text}`.toLowerCase();
  for (const [kind, re] of RULES) if (re.test(hay)) return kind;
  return 'computer';
}
