---
title: Shortest paths
summary: BFS for unweighted graphs, Dijkstra with a heap, Bellman-Ford for negative edges and k-stop limits, 0-1 BFS, Floyd-Warshall for all pairs, and how to pick between them.
related: graphs, heaps, topological-sort, dynamic-programming
terms:
  - shortest path
  - shortest paths
  - single-source shortest path
  - edge relaxation #relaxation
  - Dijkstra #dijkstra-s-algorithm
  - Dijkstra's algorithm #dijkstra-s-algorithm
  - Bellman-Ford #bellman-ford
  - negative cycle #bellman-ford
  - negative cycles #bellman-ford
  - cheapest flights within k stops #at-most-k-edges-cheapest-flights
  - 0-1 BFS #0-1-bfs
  - Floyd-Warshall #floyd-warshall
  - all-pairs shortest paths #floyd-warshall
  - A* search #a-search
  - bottleneck path #bottleneck-paths-max-in-place-of
  - minimax path #bottleneck-paths-max-in-place-of
  - swim in rising water #bottleneck-paths-max-in-place-of
  - minimum time to visit a cell in a grid #cells-that-open-at-set-times
---

## The problem

In a **weighted graph** each edge has a cost: kilometres, minutes, dollars. The length of a path is the sum of its edge weights, and a **shortest path** from `s` to `t` is a path with the smallest total. Most problems want the **single-source shortest path** distances: the cheapest way from one start vertex to every other vertex, stored in an array `dist`.

Weights change everything. In an unweighted graph the route with the fewest edges is the shortest, and plain [BFS](/learn/graphs) finds it. With weights, a route with five cheap edges can beat one expensive direct edge, so the order in which BFS discovers vertices no longer means anything.

There is no single best algorithm. The right one depends on the weights:

| Graph | Algorithm | Time |
|---|---|---|
| Unweighted (or all weights equal) | BFS | O(V + E) |
| Weights 0 or 1 only | 0-1 BFS | O(V + E) |
| Non-negative weights | Dijkstra with a heap | O((V + E) log V) |
| Negative weights, or "at most k edges" | Bellman-Ford | O(V · E), or O(k · E) |
| A DAG, any weights | relax in [topological order](/learn/topological-sort) | O(V + E) |
| Every pair of vertices, small V | Floyd-Warshall | O(V³) |

## Relaxation

Every algorithm on this page is built from one move. Keep a tentative distance `dist[v]` for each vertex, starting at 0 for the source and infinity for everything else. **Relaxing** the edge `u → v` with weight `w` means asking: "is going through `u` cheaper than the best route to `v` I know?"

```text
if dist[u] + w < dist[v]:
    dist[v] = dist[u] + w
    parent[v] = u        # optional: remember the route
```

Tentative distances only ever go down, and they never drop below the true distance. The algorithms differ only in *which edges they relax, in what order*, and how they know they're done. Storing `parent[v]` lets you rebuild the path afterwards: follow parents back from the target and reverse.

## Dijkstra's algorithm

**Dijkstra's algorithm** is BFS with the queue replaced by a priority queue keyed on distance. It repeatedly takes the unfinished vertex with the smallest tentative distance, declares that distance final, and relaxes its outgoing edges.

Why is the smallest tentative distance final? Say `u` has the smallest tentative distance `d` among all unfinished vertices. Any other route to `u` has to leave the finished set through some unfinished vertex, which already costs at least `d`, and the remaining edges can only add to that because **no weight is negative**. So nothing can beat `d`. That one argument is the whole proof, and it's also why negative edges break the algorithm.

```diagram
{"type":"graph","nodes":["1","2","3","4","5"],"edges":[["1","2",4],["1","3",1],["3","2",2],["2","4",1],["3","4",5],["4","5",3]],"directed":true,"layout":"layers","path":["1","3","2","4","5"],"notes":{"1":"0","3":"1","2":"3","4":"4","5":"7"},"caption":"Dijkstra from 1. Notes are final distances. The path 1 → 3 → 2 → 4 → 5 (cost 7) beats the direct-looking 1 → 2 (4) and 3 → 4 (5)."}
```

### Lazy deletion

A binary heap can't lower the key of an entry already inside it. The standard workaround is **lazy deletion**: when `dist[v]` improves, push a *new* entry `(dist[v], v)` and leave the old one in the heap. When an entry comes out, compare it with `dist`: if it's larger, it's **stale** (that vertex was already finished with a smaller distance), so skip it.

Here is the run on the graph above (ties broken by vertex number):

| Step | Pop `(d, u)` | What happens | Heap afterwards |
|---|---|---|---|
| 1 | (0, 1) | dist[2] = 4, dist[3] = 1 | (1,3) (4,2) |
| 2 | (1, 3) | dist[2] = 3, dist[4] = 6 | (3,2) (4,2) (6,4) |
| 3 | (3, 2) | dist[4] = 4 | (4,2) (4,4) (6,4) |
| 4 | (4, 2) | stale (dist[2] is 3): skip | (4,4) (6,4) |
| 5 | (4, 4) | dist[5] = 7 | (6,4) (7,5) |
| 6 | (6, 4) | stale (dist[4] is 4): skip | (7,5) |
| 7 | (7, 5) | no outgoing edges | empty |

This is *network delay time*: a signal starts at node `k`; how long until every node has it? It's the largest shortest-path distance, or -1 if some node is unreachable.

```python
import heapq

def network_delay_time(times, n, k):
    graph = [[] for _ in range(n + 1)]       # nodes are numbered 1..n
    for u, v, w in times:
        graph[u].append((v, w))
    dist = [float("inf")] * (n + 1)
    dist[k] = 0
    heap = [(0, k)]                          # (distance, node): smallest distance first
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue                         # stale entry: u is already finished
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    best = max(dist[1:])
    return best if best < float("inf") else -1
```

```java
int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i <= n; i++) graph.add(new ArrayList<>());  // nodes are numbered 1..n
    for (int[] t : times) graph.get(t[0]).add(new int[]{t[1], t[2]});
    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    // {distance, node}: smallest distance first
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    heap.add(new int[]{0, k});
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;           // stale entry: u is already finished
        for (int[] e : graph.get(u)) {
            int v = e[0], w = e[1];
            if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.add(new int[]{dist[v], v});
            }
        }
    }
    int best = 0;
    for (int i = 1; i <= n; i++) best = Math.max(best, dist[i]);
    return best == Integer.MAX_VALUE ? -1 : best;
}
```

```cpp
int networkDelayTime(vector<vector<int>>& times, int n, int k) {
    vector<vector<pair<int, int>>> graph(n + 1);   // nodes are numbered 1..n
    for (auto& t : times) graph[t[0]].push_back({t[1], t[2]});
    vector<int> dist(n + 1, INT_MAX);
    dist[k] = 0;
    // {distance, node}; greater<> turns the default max-heap into a min-heap
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap;
    heap.push({0, k});
    while (!heap.empty()) {
        auto [d, u] = heap.top(); heap.pop();
        if (d > dist[u]) continue;           // stale entry: u is already finished
        for (auto [v, w] : graph[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.push({dist[v], v});
            }
        }
    }
    int best = *max_element(dist.begin() + 1, dist.end());
    return best == INT_MAX ? -1 : best;
}
```

### Cost

Each edge can push at most one entry, so the heap holds at most E entries, and each push or pop costs O(log E) = O(log V) (because E ≤ V²). Total: **O((V + E) log V)** time and O(V + E) space. On a dense graph (E close to V²) a version without a heap, which scans all vertices for the minimum each round, runs in O(V²) and is faster. See [heaps](/learn/heaps) for how the priority queue works.

### Variations that are still Dijkstra

- **Single target**: stop as soon as the target is popped; its distance is final.
- **Path cost isn't a sum**: *path with minimum effort* scores a path by its largest step, *swim in rising water* by its highest cell. Dijkstra still works when extending a path can never make its score better: push `max(d, w)` instead of `d + w`.
- **Maximise instead of minimise**: *path with maximum probability* multiplies probabilities (each at most 1, so a path never improves by getting longer). Use a max-heap.
- **Extra state**: when the cost depends on more than the vertex (fuel left, stops used, keys held), the heap holds `(cost, vertex, state)` and `dist` is indexed by `(vertex, state)`.

### Bottleneck paths: max in place of +

A **bottleneck** (or **minimax**) path minimises the **largest** edge or cell on it, not the sum. *Swim in rising water*: cell `(r, c)` is under water until time `grid[r][c]`; the earliest time you can swim from the top-left to the bottom-right is the smallest possible **highest cell** on a path.

Dijkstra works unchanged except for one line: extending a path to a cell with height `h` gives cost `max(d, h)` instead of `d + w`. The proof still holds because `max` never makes a longer path cheaper, which is all the "no negative edges" argument needed. So the first time the target pops, its cost is final.

```diagram
{"type":"grid","cells":[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]],"path":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[2,3],[2,2],[2,1],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4]],"highlight":[[2,4]],"caption":"The best path snakes along rows 0, 2 and 4. Its highest cell is 16, so the answer is 16. Straight down the right edge meets 20."}
```

```python
import heapq

def swim_in_water(grid):
    # Path cost = highest cell on it, so relax with max(d, cell) in place of d + w
    # Max never shrinks as path grows, so first pop of cell is final
    n = len(grid)
    # best[r][c] (lowest possible highest cell on path to (r, c))
    best = [[float("inf")] * n for _ in range(n)]
    best[0][0] = grid[0][0]
    heap = [(grid[0][0], 0, 0)]
    while heap:
        d, r, c = heapq.heappop(heap)
        if (r, c) == (n - 1, n - 1):
            return d
        # stale entry, cell already finished lower
        if d > best[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < n and 0 <= nc < n:
                nd = max(d, grid[nr][nc])
                if nd < best[nr][nc]:
                    best[nr][nc] = nd
                    heapq.heappush(heap, (nd, nr, nc))
    return -1  # unreachable
```

```java
int swimInWater(int[][] grid) {
    // Path cost = highest cell on it, so relax with max(d, cell) in place of d + w
    // Max never shrinks as path grows, so first pop of cell is final
    int n = grid.length;
    // best[r][c] (lowest possible highest cell on path to (r, c))
    int[][] best = new int[n][n];
    for (int[] row : best) Arrays.fill(row, Integer.MAX_VALUE);
    best[0][0] = grid[0][0];
    // {d, r, c}, smallest d first
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    heap.add(new int[]{grid[0][0], 0, 0});
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int d = top[0], r = top[1], c = top[2];
        if (r == n - 1 && c == n - 1) return d;
        // stale entry, cell already finished lower
        if (d > best[r][c]) continue;
        for (int[] dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            int nd = Math.max(d, grid[nr][nc]);
            if (nd < best[nr][nc]) {
                best[nr][nc] = nd;
                heap.add(new int[]{nd, nr, nc});
            }
        }
    }
    return -1;  // unreachable
}
```

```cpp
int swimInWater(const vector<vector<int>>& grid) {
    // Path cost = highest cell on it, so relax with max(d, cell) in place of d + w
    // Max never shrinks as path grows, so first pop of cell is final
    int n = grid.size();
    // best[r][c] (lowest possible highest cell on path to (r, c))
    vector<vector<int>> best(n, vector<int>(n, INT_MAX));
    best[0][0] = grid[0][0];
    // {d, r, c}; greater<> makes it min-heap
    priority_queue<array<int, 3>, vector<array<int, 3>>, greater<>> heap;
    heap.push({grid[0][0], 0, 0});
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!heap.empty()) {
        auto [d, r, c] = heap.top(); heap.pop();
        if (r == n - 1 && c == n - 1) return d;
        // stale entry, cell already finished lower
        if (d > best[r][c]) continue;
        for (auto& dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            int nd = max(d, grid[nr][nc]);
            if (nd < best[nr][nc]) {
                best[nr][nc] = nd;
                heap.push({nd, nr, nc});
            }
        }
    }
    return -1;  // unreachable
}
```

**O(n² log n)** for an n × n grid. Two other standard solutions have the same flavour: binary search on the answer `T` with a BFS over cells `<= T`, or [union-find](/learn/union-find) adding cells in increasing height until the corners connect. The mirror image, **maximin** (maximise the smallest edge, e.g. *path with maximum minimum value*), uses a max-heap and `min(d, w)`. *Path with minimum effort* is minimax over edge weights `|h1 − h2|` instead of cells. The pitfall is seeding: the start cell's own height counts, so `best[0][0] = grid[0][0]`, not 0.

### Cells that open at set times

*Minimum time to visit a cell in a grid*: you can enter cell `(r, c)` only at time `grid[r][c]` or later, each move takes one second, and you **can't wait in place**: every second you must move to a neighbour. Starting at `(0, 0)` at time 0, when can you reach the bottom-right cell?

Not being allowed to wait seems to break Dijkstra, but there's a trick. If you can make any move at all, you can **step back and forth** between two cells to burn time, 2 seconds per round trip. So when you'd arrive at a neighbour at time `t + 1` but it opens at `open > t + 1`, you can arrive at `open` if the gap `open − (t + 1)` is even, or at `open + 1` if it's odd: the bounces only burn time in pairs. That's a **parity adjustment** on an otherwise normal Dijkstra over arrival times.

The only time you're truly stuck is at the very start: if both neighbours of `(0, 0)` open after time 1, you can't make the first move, so the answer is −1. After any move, the cell you came from is always available to bounce on.

```python
import heapq

def minimum_time(grid):
    # Dijkstra on arrival time; must move every second, never wait
    # Once moving, step back and forth to burn time, 2 seconds per round trip
    # So arrival waits until open time, plus 1 if gap is odd (parity)
    m, n = len(grid), len(grid[0])
    # both first moves shut = stuck at start for good
    if grid[0][1] > 1 and grid[1][0] > 1:
        return -1
    # best[r][c] (earliest arrival at (r, c))
    best = [[float("inf")] * n for _ in range(m)]
    best[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        t, r, c = heapq.heappop(heap)
        if (r, c) == (m - 1, n - 1):
            return t
        # stale entry
        if t > best[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < m and 0 <= nc < n:
                arrive = t + 1
                # still shut; bounce until open, odd gap costs 1 more
                if arrive < grid[nr][nc]:
                    gap = grid[nr][nc] - arrive
                    arrive = grid[nr][nc] + gap % 2
                if arrive < best[nr][nc]:
                    best[nr][nc] = arrive
                    heapq.heappush(heap, (arrive, nr, nc))
    return -1  # unreachable
```

```java
int minimumTime(int[][] grid) {
    // Dijkstra on arrival time; must move every second, never wait
    // Once moving, step back and forth to burn time, 2 seconds per round trip
    // So arrival waits until open time, plus 1 if gap is odd (parity)
    int m = grid.length, n = grid[0].length;
    // both first moves shut = stuck at start for good
    if (grid[0][1] > 1 && grid[1][0] > 1) return -1;
    // best[r][c] (earliest arrival at (r, c))
    int[][] best = new int[m][n];
    for (int[] row : best) Arrays.fill(row, Integer.MAX_VALUE);
    best[0][0] = 0;
    // {t, r, c}, earliest first
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    heap.add(new int[]{0, 0, 0});
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int t = top[0], r = top[1], c = top[2];
        if (r == m - 1 && c == n - 1) return t;
        // stale entry
        if (t > best[r][c]) continue;
        for (int[] dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            int arrive = t + 1;
            // still shut; bounce until open, odd gap costs 1 more
            if (arrive < grid[nr][nc]) {
                int gap = grid[nr][nc] - arrive;
                arrive = grid[nr][nc] + gap % 2;
            }
            if (arrive < best[nr][nc]) {
                best[nr][nc] = arrive;
                heap.add(new int[]{arrive, nr, nc});
            }
        }
    }
    return -1;  // unreachable
}
```

```cpp
int minimumTime(const vector<vector<int>>& grid) {
    // Dijkstra on arrival time; must move every second, never wait
    // Once moving, step back and forth to burn time, 2 seconds per round trip
    // So arrival waits until open time, plus 1 if gap is odd (parity)
    int m = grid.size(), n = grid[0].size();
    // both first moves shut = stuck at start for good
    if (grid[0][1] > 1 && grid[1][0] > 1) return -1;
    // best[r][c] (earliest arrival at (r, c))
    vector<vector<int>> best(m, vector<int>(n, INT_MAX));
    best[0][0] = 0;
    // {t, r, c}; greater<> makes it min-heap
    priority_queue<array<int, 3>, vector<array<int, 3>>, greater<>> heap;
    heap.push({0, 0, 0});
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!heap.empty()) {
        auto [t, r, c] = heap.top(); heap.pop();
        if (r == m - 1 && c == n - 1) return t;
        // stale entry
        if (t > best[r][c]) continue;
        for (auto& dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            int arrive = t + 1;
            // still shut; bounce until open, odd gap costs 1 more
            if (arrive < grid[nr][nc]) {
                int gap = grid[nr][nc] - arrive;
                arrive = grid[nr][nc] + gap % 2;
            }
            if (arrive < best[nr][nc]) {
                best[nr][nc] = arrive;
                heap.push({arrive, nr, nc});
            }
        }
    }
    return -1;  // unreachable
}
```

**O(mn log(mn))**. Pitfalls: waiting until `open` without the **parity** fix (arriving one second too early on odd gaps), forgetting the **start check** (the only −1 case), and treating it as BFS: arrival times jump forward by more than 1, so the queue must be a heap.

## Why negative edges break Dijkstra

Dijkstra's proof needed "the remaining edges can only add". A negative edge breaks that:

```diagram
{"type":"graph","nodes":["A","B","C"],"edges":[["A","B",2],["A","C",5],["C","B",-4]],"directed":true,"path":["A","C","B"],"notes":{"A":"0","B":"1, not 2","C":"5"},"caption":"Dijkstra pops B at distance 2 and calls it final. The true distance is 1, through C, which it only explores afterwards."}
```

A version that marks vertices as finished returns 2 for B. The lazy version above happens to fix B when C pushes it again, but then vertices get processed over and over, and on bad inputs the running time becomes exponential. Adding a constant to every weight to make them positive doesn't help either: it penalises paths with more edges, so it changes which path is shortest.

A **negative cycle** is worse: a cycle whose total weight is below zero. Going round it again always lowers the cost, so "shortest path" stops having a meaning for anything reachable from it. The algorithm you need for negative weights must also detect these cycles.

## Bellman-Ford

**Bellman-Ford** gives up on choosing a clever order. It relaxes *every* edge, and repeats that V - 1 times.

Why V - 1 rounds? A shortest path (with no negative cycle around) never repeats a vertex, so it has at most V - 1 edges. After round 1, every vertex whose shortest path has one edge has its final distance. After round 2, everything reachable in at most two edges is final, and so on. After V - 1 rounds, everything is.

**Negative-cycle detection** falls out for free: run one more round. If any edge can still be relaxed, some path keeps getting cheaper beyond V - 1 edges, which only a negative cycle allows.

```python
def bellman_ford(n, edges, src):
    INF = float("inf")
    dist = [INF] * n
    dist[src] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break                            # nothing moved: already final
    for u, v, w in edges:                    # round V: any improvement means a negative cycle
        if dist[u] != INF and dist[u] + w < dist[v]:
            return None
    return dist
```

```java
// Returns null if a negative cycle is reachable from src.
long[] bellmanFord(int n, int[][] edges, int src) {
    long INF = Long.MAX_VALUE;
    long[] dist = new long[n];
    Arrays.fill(dist, INF);
    dist[src] = 0;
    for (int round = 0; round < n - 1; round++) {
        boolean changed = false;
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                changed = true;
            }
        }
        if (!changed) break;                 // nothing moved: already final
    }
    for (int[] e : edges) {                  // round V: any improvement means a negative cycle
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return null;
    }
    return dist;
}
```

```cpp
// Returns an empty vector if a negative cycle is reachable from src.
vector<long long> bellmanFord(int n, vector<vector<int>>& edges, int src) {
    const long long INF = LLONG_MAX;
    vector<long long> dist(n, INF);
    dist[src] = 0;
    for (int round = 0; round < n - 1; round++) {
        bool changed = false;
        for (auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                changed = true;
            }
        }
        if (!changed) break;                 // nothing moved: already final
    }
    for (auto& e : edges) {                  // round V: any improvement means a negative cycle
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return {};
    }
    return dist;
}
```

The `dist[u] != INF` check matters: without it, "infinity minus 4" looks like a real distance (and in Java or C++, `MAX_VALUE + w` overflows). Bellman-Ford takes **O(V · E)** time, slower than Dijkstra, so use it only when you need what it offers: negative weights, cycle detection, or a limit on the number of edges.

### At most k edges: cheapest flights

*Cheapest flights within k stops* asks for the cheapest route that uses at most `k` stops, which means at most `k + 1` flights (edges). Dijkstra can't easily respect the limit: the cheapest way into a city may have used too many flights.

Bellman-Ford's rounds are exactly what's needed, because round `i` accounts for paths of up to `i` edges. Run `k + 1` rounds, with one change: relax from a **copy** of the previous round's array. Otherwise a round can chain several edges together (relax `0 → 1`, then immediately `1 → 2` from the new value) and sneak in extra flights.

```diagram
{"type":"graph","nodes":["0","1","2","3"],"edges":[["0","1",100],["1","2",100],["2","0",100],["1","3",600],["2","3",200]],"directed":true,"layout":"layers","path":["0","1","3"],"caption":"Flights from 0 to 3. With k = 1 stop, the best is 0 → 1 → 3 for 700. With 2 stops, 0 → 1 → 2 → 3 costs 400."}
```

```diagram
{"type":"grid","cells":[["0","∞","∞","∞"],["0","100","∞","∞"],["0","100","200","700"],["0","100","200","400"]],"rowLabels":["start","≤ 1 flight","≤ 2 flights","≤ 3 flights"],"colLabels":["0","1","2","3"],"highlight":[[2,3]],"caption":"dist after each round. k = 1 means 2 rounds: the answer is 700. Without the copy, one pass over the edges in the order listed would already reach 400."}
```

```python
def find_cheapest_price(n, flights, src, dst, k):
    INF = float("inf")
    dist = [INF] * n
    dist[src] = 0
    for _ in range(k + 1):                   # k stops = at most k + 1 flights
        prev = dist[:]                       # extend only last round's paths
        for u, v, w in flights:
            if prev[u] != INF and prev[u] + w < dist[v]:
                dist[v] = prev[u] + w
    return dist[dst] if dist[dst] != INF else -1
```

```java
int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int INF = Integer.MAX_VALUE;
    int[] dist = new int[n];
    Arrays.fill(dist, INF);
    dist[src] = 0;
    for (int round = 0; round <= k; round++) {   // k stops = at most k + 1 flights
        int[] prev = dist.clone();               // extend only last round's paths
        for (int[] f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (prev[u] != INF && prev[u] + w < dist[v]) dist[v] = prev[u] + w;
        }
    }
    return dist[dst] == INF ? -1 : dist[dst];
}
```

```cpp
int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
    const int INF = INT_MAX;
    vector<int> dist(n, INF);
    dist[src] = 0;
    for (int round = 0; round <= k; round++) {   // k stops = at most k + 1 flights
        vector<int> prev = dist;                 // extend only last round's paths
        for (auto& f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (prev[u] != INF && prev[u] + w < dist[v]) dist[v] = prev[u] + w;
        }
    }
    return dist[dst] == INF ? -1 : dist[dst];
}
```

That's O(k · E) time. Viewed another way, it's a [dynamic programming](/learn/dynamic-programming) table: `dist[i][v]` is the cheapest way to reach `v` with at most `i` edges, and each row only reads the row before it.

## 0-1 BFS

When every weight is 0 or 1, you can skip the heap. Use a **deque** instead: when relaxing a 0-weight edge, push the vertex to the *front* (same distance as `u`); for a 1-weight edge, push it to the *back* (one more). The deque then always holds vertices in order of distance, with at most two distinct values in it, exactly like BFS's queue. That's **0-1 BFS**, and it runs in **O(V + E)**.

It fits grid problems where some moves are free and others cost one: *minimum obstacle removal* (stepping on an empty cell costs 0, on an obstacle 1), *minimum cost to make at least one valid path* (following the arrow in a cell is free, changing it costs 1).

```python
from collections import deque

def zero_one_bfs(graph, src):                # graph[u] = [(v, w)] with w in {0, 1}
    dist = [float("inf")] * len(graph)
    dist[src] = 0
    dq = deque([src])
    while dq:
        u = dq.popleft()
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    dq.appendleft(v)         # same distance as u: front of the line
                else:
                    dq.append(v)             # one more: back of the line
    return dist
```

```java
int[] zeroOneBfs(List<List<int[]>> graph, int src) {   // graph.get(u) = {v, w}, w in {0, 1}
    int[] dist = new int[graph.size()];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    Deque<Integer> dq = new ArrayDeque<>();
    dq.add(src);
    while (!dq.isEmpty()) {
        int u = dq.pollFirst();
        for (int[] e : graph.get(u)) {
            int v = e[0], w = e[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.addFirst(v);  // same distance as u: front of the line
                else dq.addLast(v);          // one more: back of the line
            }
        }
    }
    return dist;
}
```

```cpp
vector<int> zeroOneBfs(vector<vector<pair<int, int>>>& graph, int src) {  // {v, w}, w in {0, 1}
    vector<int> dist(graph.size(), INT_MAX);
    dist[src] = 0;
    deque<int> dq = {src};
    while (!dq.empty()) {
        int u = dq.front(); dq.pop_front();
        for (auto [v, w] : graph[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.push_front(v); // same distance as u: front of the line
                else dq.push_back(v);         // one more: back of the line
            }
        }
    }
    return dist;
}
```

## Floyd-Warshall

Sometimes you need the distance between *every* pair of vertices. **Floyd-Warshall** does it with three nested loops over an adjacency matrix. `dist[i][j]` starts as the direct edge weight (0 on the diagonal, infinity if there's no edge). Then, for each vertex `k` in turn, allow `k` as a stopover:

```text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

After processing `k`, `dist[i][j]` is the shortest path that only stops at vertices `0..k` along the way. When `k` has run through every vertex, all paths are allowed. This is dynamic programming over "which stopovers are allowed", which is why **`k` must be the outermost loop**. Putting it inside is a classic bug that gives wrong answers.

```diagram
{"type":"grid","cells":[["0","3","4","5"],["3","0","1","2"],["4","1","0","1"],["5","2","1","0"]],"rowLabels":["0","1","2","3"],"colLabels":["0","1","2","3"],"highlight":[[0,3],[3,0]],"caption":"All-pairs distances for undirected edges 0-1 (3), 1-2 (1), 1-3 (4), 2-3 (1). dist[0][3] = 5 goes 0 → 1 → 2 → 3, cheaper than 0 → 1 → 3 (7)."}
```

```python
def floyd_warshall(n, edges):                # directed edges [u, v, w]
    INF = float("inf")
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)
    for k in range(n):                       # k outermost: allow k as a stopover
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist
```

```java
int[][] floydWarshall(int n, int[][] edges) {    // directed edges {u, v, w}
    int INF = Integer.MAX_VALUE / 2;             // INF + INF must not overflow
    int[][] dist = new int[n][n];
    for (int i = 0; i < n; i++) {
        Arrays.fill(dist[i], INF);
        dist[i][i] = 0;
    }
    for (int[] e : edges) dist[e[0]][e[1]] = Math.min(dist[e[0]][e[1]], e[2]);
    for (int k = 0; k < n; k++)                  // k outermost: allow k as a stopover
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
    return dist;
}
```

```cpp
vector<vector<int>> floydWarshall(int n, vector<vector<int>>& edges) {  // directed {u, v, w}
    const int INF = INT_MAX / 2;                 // INF + INF must not overflow
    vector<vector<int>> dist(n, vector<int>(n, INF));
    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (auto& e : edges) dist[e[0]][e[1]] = min(dist[e[0]][e[1]], e[2]);
    for (int k = 0; k < n; k++)                  // k outermost: allow k as a stopover
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
    return dist;
}
```

It's **O(V³)** time and O(V²) space, so it suits graphs up to a few hundred vertices. It handles negative edges, and a negative cycle shows up as a negative value on the diagonal (`dist[i][i] < 0`). For undirected graphs, set both `dist[u][v]` and `dist[v][u]`. Typical problems: *find the city with the smallest number of neighbours within a threshold distance*, and answering many "how far from `a` to `b`?" queries on a small fixed graph. For sparse graphs, running Dijkstra from every vertex (O(V · E log V)) is usually faster.

## A* search

**A\* search** is Dijkstra with a sense of direction, used when there's one target and a way to estimate how far away it is. Instead of ordering the heap by `g(v)` (distance so far), order it by `g(v) + h(v)`, where `h(v)` is a heuristic estimate of the remaining distance to the target. On a grid where you move in four directions, `h` is usually the Manhattan distance to the target.

- If `h` never overestimates (it's **admissible**), A\* still finds an optimal path.
- If `h` is also **consistent** (`h(u) ≤ w(u, v) + h(v)` for every edge), each vertex is finished at most once, just like Dijkstra.
- With `h = 0`, A\* *is* Dijkstra.

A good heuristic steers the search toward the target, so far fewer vertices are explored. It's the standard choice in games and route planning, but it rarely appears in interviews beyond "what would make this faster?"

## Pitfalls

- **Min-heap direction.** C++'s `priority_queue` is a max-heap: use `greater<>` (or push negated distances). Java's `PriorityQueue` needs a comparator for `int[]`. Python's `heapq` is a min-heap on tuples, so put the distance first.
- **Skipping stale entries.** Without `if d > dist[u]: continue`, Dijkstra still returns the right answer, but it reprocesses vertices and can be far slower.
- **Overflow.** `INT_MAX + w` wraps to a negative number. Check `dist[u] != INF` before adding, use `INF = MAX / 2` when two infinities can be added, or use `long`.
- **1-indexed input.** Many problems number vertices from 1. Size arrays `n + 1` and ignore index 0 when taking a max.
- **Undirected weighted graphs.** Add each edge in both directions.
- **The k-stops copy.** Bellman-Ford for "at most k edges" must read from the previous round's array.
- **Picking the tool by habit.** Check the weights first: all equal means BFS, 0 and 1 means 0-1 BFS, non-negative means Dijkstra, anything negative means Bellman-Ford (or topological order on a DAG).
