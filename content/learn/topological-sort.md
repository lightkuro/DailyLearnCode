---
title: Topological sort
summary: Ordering the vertices of a DAG so every edge points forward. Kahn's in-degree queue, reversed DFS postorder, cycle detection, course schedule, and dynamic programming on DAGs.
related: graphs, shortest-paths, dynamic-programming, heaps
terms:
  - topological sort
  - topological sorting
  - topological order
  - topological ordering
  - DAG #what-a-topological-order-is
  - DAGs #what-a-topological-order-is
  - directed acyclic graph #what-a-topological-order-is
  - Kahn's algorithm #kahn-s-algorithm-bfs-with-in-degrees
  - in-degree #kahn-s-algorithm-bfs-with-in-degrees
  - reverse postorder #dfs-postorder-reversed
  - course schedule #course-schedule
  - dependency graph #build-systems-and-package-managers
  - longest path in a DAG #longest-path-in-a-dag
  - critical path #longest-path-in-a-dag
  - largest color value #largest-colour-value-in-a-directed-graph
  - largest colour value #largest-colour-value-in-a-directed-graph
  - unique topological order #is-the-order-unique
  - sequence reconstruction #is-the-order-unique
---

## What a topological order is

A **directed acyclic graph (DAG)** is a directed graph with no cycles: follow the arrows from anywhere and you never get back to where you started. DAGs are how dependencies look. "Compile `lexer` before `parser`", "take Calculus before Physics", "install `libssl` before `curl`": each is an edge `u → v` meaning *u must come first*.

A **topological order** lists every vertex so that for every edge `u → v`, `u` appears before `v`. Producing one is called **topological sort**. It's the answer to "in what order can I do these tasks without breaking a dependency?"

Two facts to remember:

- **An order exists exactly when the graph has no directed cycle.** If `A` needs `B` and `B` needs `A`, neither can go first. So every topological sort algorithm doubles as a cycle detector.
- **The order is usually not unique.** Any vertex whose dependencies are all done can go next. Interview problems that ask for "an order" accept any valid one.

```diagram
{"type":"graph","nodes":[{"id":"5","x":0,"y":0},{"id":"4","x":0,"y":2},{"id":"2","x":1,"y":0},{"id":"0","x":1,"y":2},{"id":"3","x":2,"y":0},{"id":"1","x":3,"y":1}],"edges":[["5","2"],["5","0"],["4","0"],["4","1"],["2","3"],["3","1"]],"directed":true,"highlight":["4","5"],"notes":{"0":"in=2","1":"in=2","2":"in=1","3":"in=1","4":"in=0","5":"in=0"},"caption":"A DAG with in-degrees. 4 and 5 have no incoming edges, so either can go first. Valid orders include 4 5 2 0 3 1 and 5 4 2 3 1 0."}
```

Topological sort runs in **O(V + E)**, the same as a plain [graph traversal](/learn/graphs). There are two standard ways to do it: peel off vertices with no remaining dependencies (Kahn's algorithm), or use the finishing order of a DFS.

## Kahn's algorithm (BFS with in-degrees)

The **in-degree** of a vertex is the number of edges coming into it: its number of unmet dependencies. A vertex with in-degree 0 is ready to go.

**Kahn's algorithm** repeatedly takes a ready vertex, outputs it, and "deletes" its outgoing edges by decrementing its neighbours' in-degrees. Any neighbour that drops to 0 becomes ready.

1. Count the in-degree of every vertex.
2. Put every vertex with in-degree 0 in a queue.
3. Pop `u`, append it to the order, and for each edge `u → v` decrement `indeg[v]`; if it hits 0, push `v`.
4. When the queue is empty, if the order has all V vertices, it's a topological order. If not, the rest are stuck behind a cycle.

On the DAG above (queue seeded in index order):

| Pop | In-degree changes | Queue afterwards | Order so far |
|---|---|---|---|
| (start) | | 4, 5 | |
| 4 | 0: 2 → 1, 1: 2 → 1 | 5 | 4 |
| 5 | 2: 1 → 0, 0: 1 → 0 | 2, 0 | 4 5 |
| 2 | 3: 1 → 0 | 0, 3 | 4 5 2 |
| 0 | (no outgoing edges) | 3 | 4 5 2 0 |
| 3 | 1: 1 → 0 | 1 | 4 5 2 0 3 |
| 1 | (no outgoing edges) | (empty) | 4 5 2 0 3 1 |

```python
from collections import deque

def topo_sort(n, edges):                     # edge [u, v]: u must come before v
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(u for u in range(n) if indeg[u] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1                    # one fewer unmet dependency
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []  # vertices left over: there's a cycle
```

```java
List<Integer> topoSort(int n, int[][] edges) {   // edge {u, v}: u must come before v
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        indeg[e[1]]++;
    }
    Deque<Integer> q = new ArrayDeque<>();
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.add(u);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : graph.get(u)) {
            if (--indeg[v] == 0) q.add(v);       // one fewer unmet dependency
        }
    }
    return order.size() == n ? order : new ArrayList<>();  // leftovers: a cycle
}
```

```cpp
vector<int> topoSort(int n, vector<vector<int>>& edges) {  // edge {u, v}: u must come before v
    vector<vector<int>> graph(n);
    vector<int> indeg(n, 0);
    for (auto& e : edges) {
        graph[e[0]].push_back(e[1]);
        indeg[e[1]]++;
    }
    queue<int> q;
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.push(u);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : graph[u]) {
            if (--indeg[v] == 0) q.push(v);      // one fewer unmet dependency
        }
    }
    if ((int)order.size() != n) return {};       // leftovers: a cycle
    return order;
}
```

Each vertex is pushed and popped once and each edge decremented once: **O(V + E)** time, O(V + E) space for the graph.

### Cycle detection with Kahn's

A vertex on a cycle always has an incoming edge from another vertex on the same cycle, so its in-degree never reaches 0 and it never enters the queue. Neither does anything downstream of the cycle. That's why `len(order) < n` means "there's a cycle", and the vertices that never came out are the ones on it or stuck behind it.

```diagram
{"type":"graph","nodes":["0","1","2","3"],"edges":[["0","1"],["1","2"],["2","1"],["2","3"]],"directed":true,"layout":"layers","highlight":["1","2","3"],"caption":"Kahn's outputs 0, then stops: 1 and 2 each wait for the other, and 3 waits for 2. One vertex out of four means a cycle."}
```

### Is the order unique?

Some problems ask whether a DAG has **exactly one** topological order. *Sequence reconstruction* is the standard form: do the given subsequences force one ordering of `1..n`? Treat each consecutive pair in a subsequence as an edge and ask whether the topological order is unique.

Run Kahn's algorithm and watch the queue. **If it ever holds two vertices, the order isn't unique**: neither of them depends on the other (both have no unmet dependencies), so either can go next. If it never holds more than one, each pop makes exactly one new vertex ready, which means the order's consecutive vertices are joined by edges. A path through every vertex leaves no room to swap anything, so the order is forced.

```diagram
{"type":"graph","nodes":["0","1","2"],"edges":[["0","1"],["0","2"]],"directed":true,"layout":"layers","highlight":["1","2"],"caption":"After 0 pops, 1 and 2 are both ready, so 0 1 2 and 0 2 1 are both valid. Add the edge 1 → 2 and the order becomes unique."}
```

```python
from collections import deque

def has_unique_order(n, edges):
    # Two ready vertices at once = either can go first, so order not unique
    # Queue never above one = each pop forces next vertex
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(u for u in range(n) if indeg[u] == 0)
    placed = 0
    while q:
        # choice between ready vertices
        if len(q) > 1:
            return False
        u = q.popleft()
        placed += 1
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    # fewer than n placed = cycle, so no order at all
    return placed == n
```

```java
boolean hasUniqueOrder(int n, int[][] edges) {
    // Two ready vertices at once = either can go first, so order not unique
    // Queue never above one = each pop forces next vertex
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        indeg[e[1]]++;
    }
    Deque<Integer> q = new ArrayDeque<>();
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.add(u);
    int placed = 0;
    while (!q.isEmpty()) {
        // choice between ready vertices
        if (q.size() > 1) return false;
        int u = q.poll();
        placed++;
        for (int v : graph.get(u)) {
            if (--indeg[v] == 0) q.add(v);
        }
    }
    // fewer than n placed = cycle, so no order at all
    return placed == n;
}
```

```cpp
bool hasUniqueOrder(int n, const vector<vector<int>>& edges) {
    // Two ready vertices at once = either can go first, so order not unique
    // Queue never above one = each pop forces next vertex
    vector<vector<int>> graph(n);
    vector<int> indeg(n, 0);
    for (auto& e : edges) {
        graph[e[0]].push_back(e[1]);
        indeg[e[1]]++;
    }
    queue<int> q;
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.push(u);
    int placed = 0;
    while (!q.empty()) {
        // choice between ready vertices
        if (q.size() > 1) return false;
        int u = q.front(); q.pop();
        placed++;
        for (int v : graph[u]) {
            if (--indeg[v] == 0) q.push(v);
        }
    }
    // fewer than n placed = cycle, so no order at all
    return placed == n;
}
```

Still **O(V + E)**. Two pitfalls: a cycle also keeps the queue small (it can even start empty), so finish with the usual check that all `n` vertices were placed. And isolated vertices count: a vertex with no edges is ready from the start, next to the real first vertex, so with `n > 1` it always makes the order ambiguous.

## DFS postorder, reversed

The other approach uses depth-first search. When a DFS call on `u` *finishes*, every vertex reachable from `u` has already finished. So if you write vertices down in the order they finish (**postorder**), each vertex appears *after* everything it points to. Reverse that list and every edge points forward: a **reverse postorder** is a topological order.

```diagram
{"type":"graph","nodes":[{"id":"5","x":0,"y":0},{"id":"4","x":0,"y":2},{"id":"2","x":1,"y":0},{"id":"0","x":1,"y":2},{"id":"3","x":2,"y":0},{"id":"1","x":3,"y":1}],"edges":[["5","2"],["5","0"],["4","0"],["4","1"],["2","3"],["3","1"]],"directed":true,"order":["0","1","3","2","4","5"],"caption":"DFS starting from 0, 1, 2… in turn. Badges show the finish order: 0, 1, 3, 2, 4, 5. Reversed: 5 4 2 3 1 0, a valid topological order."}
```

To detect cycles at the same time, use the three colours from [graphs](/learn/graphs): white (unvisited), grey (on the current DFS path), black (finished). Reaching a grey vertex means you've found a back edge, so there's a cycle.

```python
def topo_sort_dfs(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
    WHITE, GREY, BLACK = 0, 1, 2
    colour = [WHITE] * n
    post = []
    def dfs(u):
        colour[u] = GREY
        for v in graph[u]:
            if colour[v] == GREY:
                return False                 # back edge: cycle
            if colour[v] == WHITE and not dfs(v):
                return False
        colour[u] = BLACK
        post.append(u)                       # u finishes after everything it points to
        return True
    for u in range(n):
        if colour[u] == WHITE and not dfs(u):
            return []
    return post[::-1]
```

```java
static final int WHITE = 0, GREY = 1, BLACK = 2;

List<Integer> topoSortDfs(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) graph.get(e[0]).add(e[1]);
    int[] colour = new int[n];
    List<Integer> post = new ArrayList<>();
    for (int u = 0; u < n; u++) {
        if (colour[u] == WHITE && !dfs(graph, u, colour, post)) return new ArrayList<>();
    }
    Collections.reverse(post);
    return post;
}

boolean dfs(List<List<Integer>> graph, int u, int[] colour, List<Integer> post) {
    colour[u] = GREY;
    for (int v : graph.get(u)) {
        if (colour[v] == GREY) return false;     // back edge: cycle
        if (colour[v] == WHITE && !dfs(graph, v, colour, post)) return false;
    }
    colour[u] = BLACK;
    post.add(u);                                 // u finishes after everything it points to
    return true;
}
```

```cpp
enum { WHITE, GREY, BLACK };

bool dfs(vector<vector<int>>& graph, int u, vector<int>& colour, vector<int>& post) {
    colour[u] = GREY;
    for (int v : graph[u]) {
        if (colour[v] == GREY) return false;     // back edge: cycle
        if (colour[v] == WHITE && !dfs(graph, v, colour, post)) return false;
    }
    colour[u] = BLACK;
    post.push_back(u);                           // u finishes after everything it points to
    return true;
}

vector<int> topoSortDfs(int n, vector<vector<int>>& edges) {
    vector<vector<int>> graph(n);
    for (auto& e : edges) graph[e[0]].push_back(e[1]);
    vector<int> colour(n, WHITE), post;
    for (int u = 0; u < n; u++) {
        if (colour[u] == WHITE && !dfs(graph, u, colour, post)) return {};
    }
    reverse(post.begin(), post.end());
    return post;
}
```

Also O(V + E). The usual caveat applies: recursion depth can reach V, which overflows Python's default limit of about 1,000 frames on a long chain. Kahn's algorithm has no recursion, gives the cycle check for free, and is easier to adapt (heaps, levels), so it's the safer default in interviews.

| | Kahn's (BFS) | DFS postorder |
|---|---|---|
| Cycle check | `len(order) < n` | grey neighbour |
| Recursion | none | depth up to V |
| Smallest-first order | swap the queue for a heap | awkward |
| Level-by-level ("semesters") | natural | awkward |
| Also gives | in-degrees | finish times (used for strongly connected components) |

## Course schedule

*Course schedule* is the classic interview form: `numCourses` courses and pairs `[a, b]` meaning "to take `a` you must first take `b`". Can you finish them all? (Course schedule II asks for an order.)

The only trap is the **direction**. `[a, b]` means `b` comes first, so the edge is `b → a`. Get it backwards and you'll produce the order reversed (which still "passes" the yes/no version and fails the order version).

```python
def can_finish(num_courses, prerequisites):
    # [a, b] means "take b before a": the edge is b -> a
    edges = [[b, a] for a, b in prerequisites]
    return len(topo_sort(num_courses, edges)) == num_courses
```

```java
boolean canFinish(int numCourses, int[][] prerequisites) {
    int[][] edges = new int[prerequisites.length][];
    for (int i = 0; i < prerequisites.length; i++) {
        // [a, b] means "take b before a": the edge is b -> a
        edges[i] = new int[]{prerequisites[i][1], prerequisites[i][0]};
    }
    return topoSort(numCourses, edges).size() == numCourses;
}
```

```cpp
bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> edges;
    for (auto& p : prerequisites) edges.push_back({p[1], p[0]});  // [a, b]: edge b -> a
    return (int)topoSort(numCourses, edges).size() == numCourses;
}
```

Variants you'll meet:

- **Parallel courses**: the fewest semesters if you can take any number of ready courses at once. Run Kahn's level by level (pop the whole queue each round, as in [level-order traversal](/learn/trees)); the number of levels is the answer.
- **Alien dictionary**: given words sorted in an unknown alphabet, recover the letter order. Compare each pair of adjacent words; the first position where they differ gives one edge (`'t' → 'f'`). Then topologically sort the letters. Watch for the invalid case where a word comes before its own prefix (`"abc"` before `"ab"`).
- **Sequence reconstruction**: is there exactly one topological order? Only if the queue never holds more than one vertex at a time.
- **Minimum height trees**: not a DAG problem, but the same peel-the-leaves idea with degrees instead of in-degrees.

## Build systems and package managers

Topological sort is one of the most practical algorithms you'll learn, because every tool that handles dependencies runs it:

- **Build systems** (Make, Bazel, Gradle) build a **dependency graph** of targets and compile in topological order. Everything in Kahn's queue at the same moment has no unmet dependencies, so those targets can build *in parallel*: each "level" is a wave of parallel jobs.
- **Package managers** (npm, pip, apt, Cargo) install a package's dependencies before the package itself. A dependency cycle is reported as an error, which is Kahn's leftover vertices.
- **Spreadsheets** recalculate cells in topological order of their formula references, and flag a circular reference when there's a cycle.
- **Schedulers and data pipelines** (Airflow DAGs, CI pipelines) run each task once all its upstream tasks have finished.
- **Database migrations, module imports and class initialisation** follow the same rule: dependencies first.

## Lexicographically smallest order

When several vertices are ready at once, Kahn's algorithm takes them in whatever order the queue holds them. If the problem asks for the **lexicographically smallest** order (or "break ties by smallest id"), replace the queue with a **min-heap** so the smallest ready vertex always goes next. On the DAG above that gives 4 5 0 2 3 1 instead of 4 5 2 0 3 1.

```python
import heapq

def smallest_topo_order(n, edges):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    heap = [u for u in range(n) if indeg[u] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        u = heapq.heappop(heap)              # the smallest vertex that's ready
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)
    return order if len(order) == n else []
```

```java
List<Integer> smallestTopoOrder(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        indeg[e[1]]++;
    }
    PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap
    for (int u = 0; u < n; u++) if (indeg[u] == 0) heap.add(u);
    List<Integer> order = new ArrayList<>();
    while (!heap.isEmpty()) {
        int u = heap.poll();                               // the smallest vertex that's ready
        order.add(u);
        for (int v : graph.get(u)) if (--indeg[v] == 0) heap.add(v);
    }
    return order.size() == n ? order : new ArrayList<>();
}
```

```cpp
vector<int> smallestTopoOrder(int n, vector<vector<int>>& edges) {
    vector<vector<int>> graph(n);
    vector<int> indeg(n, 0);
    for (auto& e : edges) {
        graph[e[0]].push_back(e[1]);
        indeg[e[1]]++;
    }
    priority_queue<int, vector<int>, greater<int>> heap;   // min-heap
    for (int u = 0; u < n; u++) if (indeg[u] == 0) heap.push(u);
    vector<int> order;
    while (!heap.empty()) {
        int u = heap.top(); heap.pop();                    // the smallest vertex that's ready
        order.push_back(u);
        for (int v : graph[u]) if (--indeg[v] == 0) heap.push(v);
    }
    if ((int)order.size() != n) return {};
    return order;
}
```

The heap adds a log factor: **O(V log V + E)**. Note that reversing a DFS postorder does *not* give the smallest order, even if you visit neighbours in sorted order.

## Longest path in a DAG

In a general graph, the longest simple path is NP-hard. In a DAG it's easy, and the reason is the topological order. If you process vertices in that order, then by the time you reach `v`, every vertex with an edge into `v` has already been processed. That's exactly the condition [dynamic programming](/learn/dynamic-programming) needs: the subproblems you depend on are already solved.

Let `best[v]` be the longest path from the source to `v`. Then `best[v] = max(best[u] + w)` over all edges `u → v`. Walk the topological order and push each vertex's value forward along its outgoing edges.

```diagram
{"type":"graph","nodes":["s","a","b","c","d","e"],"edges":[["s","a",2],["s","b",1],["a","c",3],["b","c",1],["b","d",4],["c","e",2],["d","e",1]],"directed":true,"layout":"layers","path":["s","a","c","e"],"notes":{"s":"0","a":"2","b":"1","c":"5","d":"5","e":"7"},"caption":"Longest path from s, processed in topological order. c takes max(2 + 3, 1 + 1) = 5; e takes max(5 + 2, 5 + 1) = 7, along s → a → c → e."}
```

```python
def longest_path(n, edges, src):             # edge [u, v, w]
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
    order = topo_sort(n, [[u, v] for u, v, _ in edges])
    NEG = float("-inf")
    best = [NEG] * n                         # best[v] = longest path src -> v
    best[src] = 0
    for u in order:                          # every edge into u was handled before u
        if best[u] == NEG:
            continue                         # u isn't reachable from src
        for v, w in graph[u]:
            best[v] = max(best[v], best[u] + w)
    return best
```

```java
long[] longestPath(int n, int[][] edges, int src) {   // edge {u, v, w}
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) graph.get(e[0]).add(new int[]{e[1], e[2]});
    List<Integer> order = topoSort(n, edges);         // topoSort only reads e[0] and e[1]
    long NEG = Long.MIN_VALUE;
    long[] best = new long[n];                        // best[v] = longest path src -> v
    Arrays.fill(best, NEG);
    best[src] = 0;
    for (int u : order) {                             // every edge into u was handled before u
        if (best[u] == NEG) continue;                 // u isn't reachable from src
        for (int[] e : graph.get(u)) best[e[0]] = Math.max(best[e[0]], best[u] + e[1]);
    }
    return best;
}
```

```cpp
vector<long long> longestPath(int n, vector<vector<int>>& edges, int src) {  // edge {u, v, w}
    vector<vector<pair<int, int>>> graph(n);
    for (auto& e : edges) graph[e[0]].push_back({e[1], e[2]});
    vector<int> order = topoSort(n, edges);           // topoSort only reads e[0] and e[1]
    const long long NEG = LLONG_MIN;
    vector<long long> best(n, NEG);                   // best[v] = longest path src -> v
    best[src] = 0;
    for (int u : order) {                             // every edge into u was handled before u
        if (best[u] == NEG) continue;                 // u isn't reachable from src
        for (auto [v, w] : graph[u]) best[v] = max(best[v], best[u] + w);
    }
    return best;
}
```

The same loop solves a family of problems in O(V + E):

- **Shortest path in a DAG**, even with negative weights: use `min` instead of `max`. It's faster than Dijkstra and handles what Dijkstra can't (see [shortest paths](/learn/shortest-paths)).
- **Critical path** in project scheduling: with task durations as weights, the longest path is the minimum time to finish the whole project, and tasks on it can't slip without delaying everything (*parallel courses III*).
- **Counting paths**: `ways[v] = sum of ways[u]` over edges `u → v`.
- **Longest increasing path in a matrix**: edges go from each cell to larger neighbours, which can never form a cycle, so it's an implicit DAG (usually solved with memoized DFS, which computes the same thing).
- For the longest path *anywhere* rather than from one source, start every `best[v]` at 0.

## Largest colour value in a directed graph

*Largest color value in a directed graph*: each node has a colour (a lowercase letter). A path's **colour value** is how many nodes on it share the most frequent colour. Return the largest colour value over all paths, or −1 if the graph has a cycle.

It's the longest-path DP above with two changes:

- **The value is a vector, not a number.** `count[v][c]` = the most nodes of colour `c` on any path that ends at `v`. A single "best so far" can't work: the path that's best for red arriving at `v` may not be the one that's best for blue, and you don't know yet which colour will win further on. With 26 colours the vector is small.
- **The cycle check comes for free.** Run Kahn's algorithm. Nodes on a cycle never reach in-degree 0 and never pop, so if fewer than `n` nodes pop, return −1.

When `u` pops, every edge into it has been handled, so `count[u]` is final: add 1 for `u`'s own colour and update the answer. Then push the vector forward: for each edge `u → v`, `count[v][c] = max(count[v][c], count[u][c])` for every colour `c`.

```diagram
{"type":"graph","nodes":["0 a","1 b","2 a","3 c","4 a"],"edges":[["0 a","1 b"],["0 a","2 a"],["2 a","3 c"],["3 c","4 a"]],"directed":true,"layout":"layers","path":["0 a","2 a","3 c","4 a"],"notes":{"0 a":"a=1","1 b":"a=1","2 a":"a=2","3 c":"a=2","4 a":"a=3"},"caption":"Colours \"abaca\". Notes show count[v][a] after v pops. The path 0 → 2 → 3 → 4 holds three a's, so the answer is 3."}
```

```python
from collections import deque

def largest_path_value(colors, edges):
    # Kahn's order, carrying count[v][c] = most nodes of colour c on any path ending at v
    # Every edge into v is handled before v pops, so count[v] is final then
    # Nodes never popped sit on or behind cycle
    n = len(colors)
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    count = [[0] * 26 for _ in range(n)]
    q = deque(u for u in range(n) if indeg[u] == 0)
    best = popped = 0
    while q:
        u = q.popleft()
        popped += 1
        # colour index 0-25
        own = ord(colors[u]) - ord("a")
        # u itself ends path, so its colour counts once more
        count[u][own] += 1
        best = max(best, count[u][own])
        for v in graph[u]:
            # best path into v through u, colour by colour
            for c in range(26):
                count[v][c] = max(count[v][c], count[u][c])
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    # some node never freed, so graph has cycle
    return best if popped == n else -1
```

```java
int largestPathValue(String colors, int[][] edges) {
    // Kahn's order, carrying count[v][c] = most nodes of colour c on any path ending at v
    // Every edge into v is handled before v pops, so count[v] is final then
    // Nodes never popped sit on or behind cycle
    int n = colors.length();
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        indeg[e[1]]++;
    }
    int[][] count = new int[n][26];
    Deque<Integer> q = new ArrayDeque<>();
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.add(u);
    int best = 0, popped = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        popped++;
        // colour index 0-25
        int own = colors.charAt(u) - 'a';
        // u itself ends path, so its colour counts once more
        best = Math.max(best, ++count[u][own]);
        for (int v : graph.get(u)) {
            // best path into v through u, colour by colour
            for (int c = 0; c < 26; c++) count[v][c] = Math.max(count[v][c], count[u][c]);
            if (--indeg[v] == 0) q.add(v);
        }
    }
    // some node never freed, so graph has cycle
    return popped == n ? best : -1;
}
```

```cpp
int largestPathValue(const string& colors, const vector<vector<int>>& edges) {
    // Kahn's order, carrying count[v][c] = most nodes of colour c on any path ending at v
    // Every edge into v is handled before v pops, so count[v] is final then
    // Nodes never popped sit on or behind cycle
    int n = colors.size();
    vector<vector<int>> graph(n);
    vector<int> indeg(n, 0);
    for (auto& e : edges) {
        graph[e[0]].push_back(e[1]);
        indeg[e[1]]++;
    }
    vector<array<int, 26>> count(n, array<int, 26>{});
    queue<int> q;
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.push(u);
    int best = 0, popped = 0;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        popped++;
        // colour index 0-25
        int own = colors[u] - 'a';
        // u itself ends path, so its colour counts once more
        best = max(best, ++count[u][own]);
        for (int v : graph[u]) {
            // best path into v through u, colour by colour
            for (int c = 0; c < 26; c++) count[v][c] = max(count[v][c], count[u][c]);
            if (--indeg[v] == 0) q.push(v);
        }
    }
    // some node never freed, so graph has cycle
    return popped == n ? best : -1;
}
```

**O((V + E) · 26) time, O(V · 26) space.** Only the node's own colour can set a new record, because the largest count of colour `c` is always reached at a node of colour `c` (cut the path after its last `c` node). Pitfalls:

- **Counting a node's colour twice**, once when it's pushed and again when it pops. Add it exactly once, when `u` pops.
- **Returning the answer before the cycle check.** A graph with a cycle must return −1 even if some acyclic part has a large value.
- **Self-loops** (`u → u`) are cycles too; Kahn's catches them because `u`'s in-degree never reaches 0.
- **Only seeding nodes with edges.** Isolated nodes count: a single node is a path with colour value 1.

The same "vector of counts along a topological order" fits other DAG problems with several quantities per node, such as counting paths by length or tracking the best value for each remaining budget.

## Pitfalls

- **Edge direction.** Decide what `u → v` means ("u before v") and convert the input to match. Course schedule's `[a, b]` is `b → a`.
- **Isolated vertices.** Vertices with no edges still belong in the order. Build in-degrees for all `n` vertices, not just those that appear in edges.
- **Duplicate edges** are fine as long as they're counted in both the adjacency list and the in-degree (each copy is decremented once).
- **Self-loops** (`u → u`) are cycles; both algorithms catch them.
- **Forgetting the cycle check.** Kahn's on a cyclic graph silently returns a partial order. Always compare the length with `n`.
- **Expecting one specific answer.** Unless the problem fixes tie-breaking, many orders are correct.
