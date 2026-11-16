---
title: Graphs: BFS & DFS
summary: Vertices, edges and how to store them, then the two traversals (breadth-first and depth-first) behind components, islands, cycle checks, bipartite tests and grid problems.
related: shortest-paths, topological-sort, union-find, trees, stacks-queues, recursion-backtracking
terms:
  - graph traversal
  - BFS #breadth-first-search-bfs
  - breadth-first search #breadth-first-search-bfs
  - DFS #depth-first-search-dfs
  - depth-first search #depth-first-search-dfs
  - adjacency list #representations
  - adjacency lists #representations
  - adjacency matrix #representations
  - directed graph #vocabulary
  - undirected graph #vocabulary
  - connected components #connected-components-and-islands
  - number of islands #connected-components-and-islands
  - bipartite #bipartite-check
  - multi-source BFS #multi-source-bfs
  - visited set #the-visited-set
  - Eulerian path #eulerian-paths-hierholzer-s-algorithm
  - Eulerian paths #eulerian-paths-hierholzer-s-algorithm
  - Eulerian circuit #eulerian-paths-hierholzer-s-algorithm
  - Hierholzer's algorithm #eulerian-paths-hierholzer-s-algorithm
  - reconstruct itinerary #eulerian-paths-hierholzer-s-algorithm
  - eccentricity #eccentricity-and-diameter
  - graph diameter #eccentricity-and-diameter
  - bus routes #bfs-over-route-groups-bus-routes
  - reorder routes #reorder-routes-direction-tags
  - clone graph #cloning-a-graph
---

## What a graph is

A **graph** is a set of **vertices** (also called nodes) joined by **edges**. That's the whole definition, which is why graphs model so much: cities and roads, people and friendships, web pages and links, tasks and the tasks they depend on, cells of a grid and the cells next to them.

A tree is a special graph: connected, no cycles, exactly `V - 1` edges (see [binary trees](/learn/trees)). General graphs drop those rules. A vertex can be reached by several routes, the graph can fall apart into separate pieces, and following edges can bring you back where you started. Almost every graph algorithm deals with those three facts using one tool: a record of which vertices you've already seen.

We write **V** for the number of vertices and **E** for the number of edges. Interview code numbers the vertices `0` to `V - 1`; if a problem gives you names (cities, words, account emails), map each name to an id with a hash map first.

## Vocabulary

- **Undirected graph**: edges work both ways (friendship). **Directed graph**: each edge has a direction, `u → v` (follows, links, "must happen before").
- **Weighted** graph: each edge carries a number (distance, cost, time). Unweighted means every edge counts as 1.
- **Degree** of a vertex: the number of edges touching it. In a directed graph, split it into **in-degree** (edges coming in) and **out-degree** (edges going out).
- **Path**: a sequence of vertices where each consecutive pair is joined by an edge. Its length is the number of edges (or the sum of weights in a weighted graph).
- **Cycle**: a path that starts and ends at the same vertex without reusing an edge. A graph with no cycles is **acyclic**.
- **Connected**: an undirected graph is connected if every vertex can reach every other. A **connected component** is a maximal connected piece. (Directed graphs have *strongly* connected components, where every vertex reaches every other along the arrows.)
- **DAG**: a directed acyclic graph. Dependencies form DAGs, and they get their own page: [topological sort](/learn/topological-sort).
- **Sparse** vs **dense**: a simple undirected graph has at most `V(V - 1) / 2` edges. Sparse graphs have E close to V; dense ones have E close to V². Most interview graphs are sparse.

```diagram
{"type":"graph","nodes":["0","1","2","3","4","5","6"],"edges":[["0","1"],["1","2"],["2","0"],["2","3"],["4","5"]],"highlight":["0","1","2","3"],"caption":"7 vertices, 5 edges, three connected components: {0, 1, 2, 3}, {4, 5} and {6}. 0-1-2 is a cycle; vertex 2 has degree 3."}
```

## Representations

The same graph can be stored several ways. The choice changes the cost of the two questions algorithms ask most: "what are the neighbours of `u`?" and "is there an edge `u - v`?"

An **adjacency list** keeps, for every vertex, a list of its neighbours. For the graph above, built from the edges `[0,1], [1,2], [2,0], [2,3], [4,5]`:

| Vertex | Neighbours |
|---|---|
| 0 | 1, 2 |
| 1 | 0, 2 |
| 2 | 1, 0, 3 |
| 3 | 2 |
| 4 | 5 |
| 5 | 4 |
| 6 | (none) |

An **adjacency matrix** is a V × V grid where `m[u][v]` is 1 (or the weight) if there's an edge. An **edge list** is just the list of `[u, v]` pairs, which is how most problems hand you the input.

| | Adjacency list | Adjacency matrix | Edge list |
|---|---|---|---|
| Space | O(V + E) | O(V²) | O(E) |
| Neighbours of `u` | O(deg u) | O(V) | O(E) |
| Is `u - v` an edge? | O(deg u), or O(1) with sets | O(1) | O(E) |
| Good for | almost everything | dense graphs, Floyd-Warshall | sorting edges (Kruskal), Bellman-Ford |

Default to an adjacency list. Converting the input takes a few lines; remember that an undirected edge goes into *both* lists:

```python
def build_graph(n, edges, directed=False):
    # one empty neighbour list per vertex
    graph = [[] for _ in range(n)]
    # each edge u - v is stored at u
    for u, v in edges:
        graph[u].append(v)
        # undirected: also store the reverse direction, v - u
        if not directed:
            graph[v].append(u)
    return graph
```

```java
List<List<Integer>> buildGraph(int n, int[][] edges, boolean directed) {
    // one empty neighbour list per vertex
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    // each edge u - v is stored at u
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        // undirected: also store the reverse direction, v - u
        if (!directed) graph.get(e[1]).add(e[0]);
    }
    return graph;
}
```

```cpp
vector<vector<int>> buildGraph(int n, vector<vector<int>>& edges, bool directed) {
    // one empty neighbour list per vertex
    vector<vector<int>> graph(n);
    // each edge u - v is stored at u
    for (auto& e : edges) {
        graph[e[0]].push_back(e[1]);
        // undirected: also store the reverse direction, v - u
        if (!directed) graph[e[1]].push_back(e[0]);
    }
    return graph;
}
```

For a weighted graph, store pairs: `graph[u].append((v, w))`.

### Grids are graphs too

A 2D grid is an **implicit graph**: each cell is a vertex and its neighbours are the cells up, down, left and right (sometimes the diagonals too). You never build the adjacency list. You compute neighbours on the fly with a direction array and a bounds check:

```python
for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        visit(nr, nc)
```

```java
// the four moves: down, up, right, left
int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
for (int[] d : dirs) {
    // neighbour cell, then skip it if it falls off the grid
    int nr = r + d[0], nc = c + d[1];
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) visit(nr, nc);
}
```

```cpp
// the four moves: down, up, right, left
int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
for (auto& d : dirs) {
    // neighbour cell, then skip it if it falls off the grid
    int nr = r + d[0], nc = c + d[1];
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) visit(nr, nc);
}
```

The same idea covers **state spaces**: in "open the lock" each 4-digit combination is a vertex and turning one wheel is an edge; in "word ladder" each word is a vertex and words one letter apart are joined. If a problem asks for the fewest moves between two states, it's a graph problem even when no graph is mentioned.

## Breadth-first search (BFS)

**Breadth-first search** explores a graph in rings, like a ripple from a stone dropped in water. First the start vertex, then everything one edge away, then everything two edges away, and so on. A **queue** (first in, first out) makes that happen automatically: vertices discovered earlier are processed earlier.

1. Put the start vertex in the queue and mark it seen, with distance 0.
2. Pop the front vertex `u`. For each neighbour `v` that hasn't been seen, mark it, set `dist[v] = dist[u] + 1`, and push it.
3. Repeat until the queue is empty.

```diagram
{"type":"graph","nodes":["A","B","C","D","E","F","G"],"edges":[["A","B"],["A","C"],["B","D"],["B","E"],["C","F"],["E","F"],["D","G"],["F","G"]],"layout":"layers","order":["A","B","C","D","E","F","G"],"notes":{"A":"d=0","B":"d=1","C":"d=1","D":"d=2","E":"d=2","F":"d=2","G":"d=3"},"caption":"BFS from A, neighbours in alphabetical order. Badges are the visit order; d is the number of edges from A."}
```

```python
from collections import deque

def bfs(graph, src):
    dist = [-1] * len(graph)       # -1 = not reached yet
    dist[src] = 0
    q = deque([src])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if dist[v] == -1:      # first time we see v: this is its shortest distance
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
```

```java
int[] bfs(List<List<Integer>> graph, int src) {
    int[] dist = new int[graph.size()];
    Arrays.fill(dist, -1);                 // -1 = not reached yet
    dist[src] = 0;
    Deque<Integer> q = new ArrayDeque<>();
    q.add(src);
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : graph.get(u)) {
            if (dist[v] == -1) {           // first time we see v
                dist[v] = dist[u] + 1;
                q.add(v);
            }
        }
    }
    return dist;
}
```

```cpp
vector<int> bfs(vector<vector<int>>& graph, int src) {
    vector<int> dist(graph.size(), -1);    // -1 = not reached yet
    dist[src] = 0;
    queue<int> q;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : graph[u]) {
            if (dist[v] == -1) {           // first time we see v
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist;
}
```

Here the `dist` array doubles as the visited set: `-1` means unseen. In Python, use `collections.deque`; `list.pop(0)` shifts every element and makes BFS quadratic.

### Why BFS finds shortest paths

In an unweighted graph, the **shortest path** is the one with the fewest edges, and BFS finds it for every vertex at once. The reason is the order of the queue. Everything at distance `d` is pushed before anything at distance `d + 1`, so the queue only ever holds two neighbouring distances, smallest at the front. When BFS first reaches `v` from `u`, no vertex closer to the start can still be waiting, so no shorter route to `v` exists.

To recover the path itself, not just its length, store `parent[v] = u` when you discover `v`. Then walk back from the target to the start and reverse.

This only works when every edge costs the same. With weights, a path with more edges can be cheaper, and you need Dijkstra's algorithm or one of its cousins: see [shortest paths](/learn/shortest-paths).

### Eccentricity and diameter

One BFS gives the distance from its start to everything. The largest of those distances is the start vertex's **eccentricity**: how far away its most remote vertex is. Take the largest eccentricity over all vertices and you get the **diameter**, the longest shortest path in the graph. The smallest eccentricity is the **radius**, and the vertices that achieve it are the **center**.

```diagram
{"type":"graph","nodes":["A","B","C","D","E"],"edges":[["A","B"],["B","C"],["C","D"],["B","E"]],"layout":"layers","highlight":["B","C"],"notes":{"A":"e=3","B":"e=2","C":"e=2","D":"e=3","E":"e=3"},"caption":"Eccentricity e of each vertex. Diameter = 3 (A to D, or E to D); radius = 2, and the center is B and C."}
```

They show up in disguise: *amount of time for a binary tree to be infected* is the eccentricity of the start node; *minimum height trees* asks for the center; *tree diameter* and "longest path between two cities" ask for the diameter; *divide nodes into the maximum number of groups* adds up the largest eccentricity (plus 1) of each component.

How to compute them:

- **Eccentricity of one vertex**: one BFS, **O(V + E)**. BFS pops vertices in distance order, so the last vertex popped is a farthest one.
- **Diameter of a general graph**: BFS from every vertex, **O(V · (V + E))**. There's no shortcut in general.
- **Diameter of a tree**: two BFS runs, O(V). BFS from any vertex to find the farthest vertex `a`; in a tree, `a` is always one end of a longest path. BFS again from `a`; the largest distance is the diameter.

```python
from collections import deque

def farthest(graph, src):
    # BFS pops vertices in distance order, so last one popped is farthest
    dist = [-1] * len(graph)
    dist[src] = 0
    q = deque([src])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                q.append(v)
    # u = last vertex popped, dist[u] = eccentricity of src
    return u, dist[u]

def tree_diameter(graph):
    # in tree, farthest vertex from anywhere ends some longest path
    end, _ = farthest(graph, 0)
    _, diameter = farthest(graph, end)
    return diameter
```

```java
// {farthest vertex, its distance}
int[] farthest(List<List<Integer>> graph, int src) {
    // BFS pops vertices in distance order, so last one popped is farthest
    int[] dist = new int[graph.size()];
    Arrays.fill(dist, -1);
    dist[src] = 0;
    Deque<Integer> q = new ArrayDeque<>();
    q.add(src);
    int u = src;
    while (!q.isEmpty()) {
        u = q.poll();
        for (int v : graph.get(u)) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q.add(v);
            }
        }
    }
    // u = last vertex popped, dist[u] = eccentricity of src
    return new int[]{u, dist[u]};
}

int treeDiameter(List<List<Integer>> graph) {
    // in tree, farthest vertex from anywhere ends some longest path
    int end = farthest(graph, 0)[0];
    return farthest(graph, end)[1];
}
```

```cpp
// {farthest vertex, its distance}
pair<int, int> farthest(vector<vector<int>>& graph, int src) {
    // BFS pops vertices in distance order, so last one popped is farthest
    vector<int> dist(graph.size(), -1);
    dist[src] = 0;
    queue<int> q;
    q.push(src);
    int u = src;
    while (!q.empty()) {
        u = q.front(); q.pop();
        for (int v : graph[u]) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    // u = last vertex popped, dist[u] = eccentricity of src
    return {u, dist[u]};
}

int treeDiameter(vector<vector<int>>& graph) {
    // in tree, farthest vertex from anywhere ends some longest path
    int end = farthest(graph, 0).first;
    return farthest(graph, end).second;
}
```

The pitfall: **the double-BFS trick only works on trees.** On a graph with cycles the farthest vertex from your first start need not be an end of a diameter, so the second BFS can come up short. For general graphs, run BFS from every vertex and take the maximum. Also watch disconnected graphs: eccentricity only makes sense within a component (vertices left at `-1` are unreachable, not close).

## Depth-first search (DFS)

**Depth-first search** is how you'd explore a maze with a ball of string: keep walking into new corridors, and only when you hit a dead end, back up to the last junction with an unexplored corridor. Recursion gives you the backing-up for free, because the call stack remembers the junctions.

```diagram
{"type":"graph","nodes":["A","B","C","D","E","F","G"],"edges":[["A","B"],["A","C"],["B","D"],["B","E"],["C","F"],["E","F"],["D","G"],["F","G"]],"layout":"layers","order":["A","B","D","G","F","C","E"],"path":["A","B","D","G","F","C"],"caption":"DFS on the same graph: A, B, D, G, F, C, then back up to F for E. It reaches C last-but-one, though C is next to A."}
```

```python
def dfs(graph, u, seen, order):
    # mark on entry so a cycle can't bring us back here
    seen[u] = True
    # record u in visit order (preorder)
    order.append(u)
    # go deep into each unvisited neighbour before trying the next
    for v in graph[u]:
        if not seen[v]:
            dfs(graph, v, seen, order)
```

```java
void dfs(List<List<Integer>> graph, int u, boolean[] seen, List<Integer> order) {
    // mark on entry so a cycle can't bring us back here
    seen[u] = true;
    // record u in visit order (preorder)
    order.add(u);
    // go deep into each unvisited neighbour before trying the next
    for (int v : graph.get(u)) {
        if (!seen[v]) dfs(graph, v, seen, order);
    }
}
```

```cpp
void dfs(vector<vector<int>>& graph, int u, vector<bool>& seen, vector<int>& order) {
    // mark on entry so a cycle can't bring us back here
    seen[u] = true;
    // record u in visit order (preorder)
    order.push_back(u);
    // go deep into each unvisited neighbour before trying the next
    for (int v : graph[u]) {
        if (!seen[v]) dfs(graph, v, seen, order);
    }
}
```

DFS does **not** find shortest paths. In the picture it reaches C through five edges even though C is next to A. What it's good at is structure: whether something is reachable, what a component contains, whether there's a cycle, and the "finish" order that topological sort needs.

### Iterative DFS

Recursion depth equals the length of the current path, which can be V. Python's default recursion limit is about 1,000, and a grid of 10⁵ cells can easily produce a path that long. The fix is an explicit stack:

```python
def dfs_iter(graph, src):
    seen = [False] * len(graph)
    order, stack = [], [src]
    while stack:
        u = stack.pop()
        if seen[u]:
            continue                       # u was pushed twice; skip the stale copy
        seen[u] = True
        order.append(u)
        for v in reversed(graph[u]):       # reversed so neighbours come off in list order
            if not seen[v]:
                stack.append(v)
    return order
```

```java
List<Integer> dfsIter(List<List<Integer>> graph, int src) {
    boolean[] seen = new boolean[graph.size()];
    List<Integer> order = new ArrayList<>();
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(src);
    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (seen[u]) continue;             // u was pushed twice; skip the stale copy
        seen[u] = true;
        order.add(u);
        List<Integer> nbrs = graph.get(u);
        for (int i = nbrs.size() - 1; i >= 0; i--) {
            if (!seen[nbrs.get(i)]) stack.push(nbrs.get(i));
        }
    }
    return order;
}
```

```cpp
vector<int> dfsIter(vector<vector<int>>& graph, int src) {
    vector<bool> seen(graph.size(), false);
    vector<int> order;
    stack<int> st;
    st.push(src);
    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (seen[u]) continue;             // u was pushed twice; skip the stale copy
        seen[u] = true;
        order.push_back(u);
        for (int i = (int)graph[u].size() - 1; i >= 0; i--) {
            if (!seen[graph[u][i]]) st.push(graph[u][i]);
        }
    }
    return order;
}
```

Marking on *pop* (and skipping stale entries) gives exactly the recursive visit order. If you only need to reach everything and don't care about order, you can mark on push instead, like BFS, which keeps the stack smaller. Swap the stack for a queue in that version and you have BFS: the two traversals differ only in which end of the to-do list you take from.

## The visited set

Without a record of what you've seen, a traversal on a graph with a cycle goes round forever, and even on an acyclic graph it can revisit shared vertices an exponential number of times. The **visited set** is what makes BFS and DFS linear.

- **Array or set?** With ids `0..V-1`, a boolean array is fastest. With names, coordinates or states, use a hash set (Python tuples and C++ pairs hash fine; in Java, encode `(r, c)` as `r * cols + c`).
- **Mark when you push, not when you pop** (for BFS). If you wait until popping, the same vertex can sit in the queue many times, and on a dense graph the queue grows to O(E).
- **Mutating the input** is a common shortcut on grids: overwrite a visited land cell with water. It saves memory but destroys the input, so say so in an interview.
- **The state may be more than the vertex.** In "shortest path visiting all nodes" or "shortest path with k obstacle eliminations", the same cell reached with a different bitmask or a different number of eliminations left is a different state. The visited set holds `(vertex, extra)` pairs.

## Connected components and islands

To process every vertex, not just those reachable from one start, wrap the traversal in a loop: try every vertex, and each time you find one that hasn't been visited, it starts a new component. Count those starts and you have the number of **connected components**.

**Number of islands** is the same thing on a grid: land cells (`"1"`) are vertices, neighbouring land cells are joined, and each island is a component.

```diagram
{"type":"grid","cells":[["1","1","","",""],["1","1","","",""],["","","2","",""],["","","","3","3"]],"highlight":[[0,0],[2,2],[3,3]],"caption":"Three islands, numbered in the order the row-by-row scan finds them. Highlighted cells start a new DFS; diagonal cells are not neighbours."}
```

```python
def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1":
                continue
            count += 1                     # a new island: sink all of it
            grid[r][c] = "0"
            stack = [(r, c)]
            while stack:
                i, j = stack.pop()
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ni, nj = i + di, j + dj
                    if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == "1":
                        grid[ni][nj] = "0"  # mark when pushed
                        stack.append((ni, nj))
    return count
```

```java
int numIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length, count = 0;
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] != '1') continue;
            count++;                       // a new island: sink all of it
            grid[r][c] = '0';
            Deque<int[]> stack = new ArrayDeque<>();
            stack.push(new int[]{r, c});
            while (!stack.isEmpty()) {
                int[] cell = stack.pop();
                for (int[] d : dirs) {
                    int ni = cell[0] + d[0], nj = cell[1] + d[1];
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && grid[ni][nj] == '1') {
                        grid[ni][nj] = '0'; // mark when pushed
                        stack.push(new int[]{ni, nj});
                    }
                }
            }
        }
    }
    return count;
}
```

```cpp
int numIslands(vector<vector<char>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), count = 0;
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] != '1') continue;
            count++;                       // a new island: sink all of it
            grid[r][c] = '0';
            vector<pair<int, int>> st = {{r, c}};
            while (!st.empty()) {
                auto [i, j] = st.back(); st.pop_back();
                for (auto& d : dirs) {
                    int ni = i + d[0], nj = j + d[1];
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && grid[ni][nj] == '1') {
                        grid[ni][nj] = '0'; // mark when pushed
                        st.push_back({ni, nj});
                    }
                }
            }
        }
    }
    return count;
}
```

Every cell is pushed at most once and checks four neighbours, so this is **O(rows × cols)** time. Variants reuse the same skeleton: *max area of island* (count cells per component), *surrounded regions* and *Pacific Atlantic water flow* (start the search from the border instead), *flood fill* (one component from a given cell). When edges arrive one at a time and you need the component count after each, [union-find](/learn/union-find) is the better tool.

## Cycle detection

### Undirected graphs: ignore the edge you came in on

In an undirected graph, every edge `u - v` appears in both lists, so DFS always sees its parent as an already-visited neighbour. That's not a cycle. A cycle is a visited neighbour that *isn't* the vertex you just came from:

```python
def has_cycle_undirected(graph):
    seen = [False] * len(graph)
    def dfs(u, parent):
        seen[u] = True
        for v in graph[u]:
            if v == parent:
                continue                   # the edge we arrived on
            if seen[v] or dfs(v, u):
                return True
        return False
    return any(not seen[u] and dfs(u, -1) for u in range(len(graph)))
```

```java
boolean hasCycleUndirected(List<List<Integer>> graph) {
    boolean[] seen = new boolean[graph.size()];
    for (int u = 0; u < graph.size(); u++) {
        if (!seen[u] && dfsUndirected(graph, u, -1, seen)) return true;
    }
    return false;
}

boolean dfsUndirected(List<List<Integer>> graph, int u, int parent, boolean[] seen) {
    seen[u] = true;
    for (int v : graph.get(u)) {
        if (v == parent) continue;         // the edge we arrived on
        if (seen[v] || dfsUndirected(graph, v, u, seen)) return true;
    }
    return false;
}
```

```cpp
bool dfsUndirected(vector<vector<int>>& graph, int u, int parent, vector<bool>& seen) {
    seen[u] = true;
    for (int v : graph[u]) {
        if (v == parent) continue;         // the edge we arrived on
        if (seen[v] || dfsUndirected(graph, v, u, seen)) return true;
    }
    return false;
}

bool hasCycleUndirected(vector<vector<int>>& graph) {
    vector<bool> seen(graph.size(), false);
    for (int u = 0; u < (int)graph.size(); u++) {
        if (!seen[u] && dfsUndirected(graph, u, -1, seen)) return true;
    }
    return false;
}
```

A quicker test exists when you only need yes or no: a connected undirected graph is a tree exactly when `E = V - 1`. Union-find also detects the first edge that closes a cycle ("redundant connection"). If the graph can have two parallel edges between the same pair, skipping by parent *vertex* misses that 2-cycle; skip by edge id instead.

### Directed graphs: three colours

The parent trick fails for directed graphs. In `A → B`, `A → C`, `C → B`, vertex B is reached twice, but there's no cycle: the arrows never lead back. What matters is whether an edge points to a vertex that is *still on the current DFS path*. Give each vertex one of three colours:

- **White**: not visited yet.
- **Grey**: visited, and its DFS call hasn't finished (it's an ancestor of where you are now).
- **Black**: finished; everything reachable from it has been explored, with no cycle found.

An edge into a grey vertex is a **back edge**, and a directed graph has a cycle exactly when DFS finds a back edge. An edge into a black vertex is harmless.

```diagram
{"type":"graph","nodes":["A","B","C","D","E"],"edges":[["A","B"],["B","C"],["C","D"],["D","B"],["A","E"]],"directed":true,"layout":"layers","highlight":["A","B","C","D"],"path":["B","C","D","B"],"caption":"DFS from A goes A, B, C, D, all grey (highlighted). D → B points at a grey vertex: the cycle B → C → D → B. E would end up black."}
```

```python
def has_cycle_directed(graph):
    WHITE, GREY, BLACK = 0, 1, 2
    colour = [WHITE] * len(graph)
    def dfs(u):
        colour[u] = GREY                   # on the current path
        for v in graph[u]:
            if colour[v] == GREY:          # back edge: v is an ancestor of u
                return True
            if colour[v] == WHITE and dfs(v):
                return True
        colour[u] = BLACK                  # finished, no cycle through u
        return False
    return any(colour[u] == WHITE and dfs(u) for u in range(len(graph)))
```

```java
static final int WHITE = 0, GREY = 1, BLACK = 2;

boolean hasCycleDirected(List<List<Integer>> graph) {
    int[] colour = new int[graph.size()];
    for (int u = 0; u < graph.size(); u++) {
        if (colour[u] == WHITE && dfsDirected(graph, u, colour)) return true;
    }
    return false;
}

boolean dfsDirected(List<List<Integer>> graph, int u, int[] colour) {
    colour[u] = GREY;                      // on the current path
    for (int v : graph.get(u)) {
        if (colour[v] == GREY) return true; // back edge: v is an ancestor of u
        if (colour[v] == WHITE && dfsDirected(graph, v, colour)) return true;
    }
    colour[u] = BLACK;                     // finished, no cycle through u
    return false;
}
```

```cpp
enum { WHITE, GREY, BLACK };

bool dfsDirected(vector<vector<int>>& graph, int u, vector<int>& colour) {
    colour[u] = GREY;                      // on the current path
    for (int v : graph[u]) {
        if (colour[v] == GREY) return true; // back edge: v is an ancestor of u
        if (colour[v] == WHITE && dfsDirected(graph, v, colour)) return true;
    }
    colour[u] = BLACK;                     // finished, no cycle through u
    return false;
}

bool hasCycleDirected(vector<vector<int>>& graph) {
    vector<int> colour(graph.size(), WHITE);
    for (int u = 0; u < (int)graph.size(); u++) {
        if (colour[u] == WHITE && dfsDirected(graph, u, colour)) return true;
    }
    return false;
}
```

This is the engine of *course schedule* ("can all courses be finished?") and of DFS-based topological sort. Kahn's algorithm finds directed cycles another way, by counting in-degrees: see [topological sort](/learn/topological-sort).

## Bipartite check

A graph is **bipartite** if its vertices can be split into two groups so that every edge goes between the groups, never inside one. Think of it as colouring every vertex red or blue so that neighbours always differ. Problems phrase it as "split people into two teams where no two who dislike each other share a team" (*possible bipartition*) or ask it directly (*is graph bipartite?*).

The check is a traversal that colours as it goes. Give the start vertex side 0; every newly discovered neighbour gets the opposite side of the vertex that found it. If you ever see an edge whose two ends have the same side, the graph isn't bipartite. Equivalently, a graph is bipartite exactly when it has **no odd-length cycle**: a triangle can't be 2-coloured, a square can.

```python
from collections import deque

def is_bipartite(graph):
    side = [-1] * len(graph)               # -1 = not coloured yet
    for start in range(len(graph)):        # every component
        if side[start] != -1:
            continue
        side[start] = 0
        q = deque([start])
        while q:
            u = q.popleft()
            for v in graph[u]:
                if side[v] == -1:
                    side[v] = 1 - side[u]  # the opposite side
                    q.append(v)
                elif side[v] == side[u]:   # an edge inside one side: odd cycle
                    return False
    return True
```

```java
boolean isBipartite(int[][] graph) {
    int[] side = new int[graph.length];
    Arrays.fill(side, -1);                 // -1 = not coloured yet
    for (int start = 0; start < graph.length; start++) {
        if (side[start] != -1) continue;
        side[start] = 0;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(start);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : graph[u]) {
                if (side[v] == -1) {
                    side[v] = 1 - side[u]; // the opposite side
                    q.add(v);
                } else if (side[v] == side[u]) {
                    return false;          // an edge inside one side: odd cycle
                }
            }
        }
    }
    return true;
}
```

```cpp
bool isBipartite(vector<vector<int>>& graph) {
    vector<int> side(graph.size(), -1);    // -1 = not coloured yet
    for (int start = 0; start < (int)graph.size(); start++) {
        if (side[start] != -1) continue;
        side[start] = 0;
        queue<int> q;
        q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : graph[u]) {
                if (side[v] == -1) {
                    side[v] = 1 - side[u]; // the opposite side
                    q.push(v);
                } else if (side[v] == side[u]) {
                    return false;          // an edge inside one side: odd cycle
                }
            }
        }
    }
    return true;
}
```

DFS works just as well; the point is the colouring, not the order. Don't forget the outer loop: a graph can be disconnected, and each component needs its own start.

## Multi-source BFS

Some problems ask for the distance to the *nearest* of many sources: how long until every orange is rotten when several rotten ones spread at once (*rotting oranges*), the distance from each cell to the nearest 0 (*01 matrix*), the distance from each room to the nearest gate (*walls and gates*).

Running one BFS per source costs O(sources × cells). **Multi-source BFS** does it in one pass: put *all* the sources in the queue at distance 0 before starting. The rings then grow from every source at once, and each cell is claimed by whichever source reaches it first, which is the nearest one. It's equivalent to adding an imaginary super-source joined to every real source.

```diagram
{"type":"grid","cells":[["0","1","2","2"],["1","2","","1"],["","2","1","0"]],"highlight":[[0,0],[2,3]],"caption":"Rotting oranges: two rotten oranges (highlighted, minute 0) spread together. Each number is the minute that orange rots; blanks are empty cells. Answer: 2."}
```

```python
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    q, fresh = deque(), 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                q.append((r, c))           # every source starts at minute 0
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:
        minutes += 1
        for _ in range(len(q)):            # one level of the BFS = one minute
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
    return minutes if fresh == 0 else -1
```

```java
int orangesRotting(int[][] grid) {
    int rows = grid.length, cols = grid[0].length, fresh = 0;
    Deque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) q.add(new int[]{r, c}); // every source starts at minute 0
            else if (grid[r][c] == 1) fresh++;
        }
    }
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    int minutes = 0;
    while (!q.isEmpty() && fresh > 0) {
        minutes++;
        for (int k = q.size(); k > 0; k--) { // one level of the BFS = one minute
            int[] cell = q.poll();
            for (int[] d : dirs) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    q.add(new int[]{nr, nc});
                }
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}
```

```cpp
int orangesRotting(vector<vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), fresh = 0;
    queue<pair<int, int>> q;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) q.push({r, c}); // every source starts at minute 0
            else if (grid[r][c] == 1) fresh++;
        }
    }
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    int minutes = 0;
    while (!q.empty() && fresh > 0) {
        minutes++;
        for (int k = q.size(); k > 0; k--) { // one level of the BFS = one minute
            auto [r, c] = q.front(); q.pop();
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    q.push({nr, nc});
                }
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}
```

Processing the queue one level at a time (record its size, pop exactly that many) is the same trick as level-order traversal of a tree. The `while q and fresh` condition matters: without `fresh`, the last level adds one extra minute in which nothing rots.

## BFS over route groups: Bus Routes

*Bus routes* gives a list of routes, each a list of stops the bus loops through, plus a `source` and `target` stop. What's the fewest **buses** you must take? The answer counts boardings, not stops: one bus can carry you across twenty stops for the price of one.

So make one BFS **level** mean "one more bus boarded". From the stops you can reach with `b` buses, boarding any route through them reaches *every* stop on that route with `b + 1` buses. Two maps make this work:

1. `routes_at[stop]`: the routes that pass through each stop, built once from the input.
2. `used[route]`: whether a route has been boarded already.

Process the queue a level at a time. For each stop in the level, look at each route through it. If the route isn't used yet, **mark it used** and push all of its unseen stops into the next level. Return the level number as soon as a route reaches `target`.

```diagram
{"type":"graph","nodes":["1","2","7","3","6"],"edges":[["1","2"],["2","7"],["7","1"],["7","3"],["3","6"],["6","7"]],"layout":"layers","highlight":["1","6"],"notes":{"1":"b=0","2":"b=1","7":"b=1","3":"b=2","6":"b=2"},"caption":"Routes [1, 2, 7] and [3, 6, 7], from stop 1 to stop 6; b = buses needed. The first bus reaches 2 and 7; changing at 7 onto the second route reaches 6. Answer: 2 buses."}
```

Why mark routes, not just stops? Without `used`, a route with `L` stops is scanned again from each of its `L` stops, which costs O(L²) per route and times out on long routes. With it, every route's stop list is scanned **once**, so the whole search is **O(sum of route lengths)** time and space.

```python
from collections import defaultdict, deque

def num_buses_to_destination(routes, source, target):
    # BFS level = buses boarded; boarding route reaches all its stops
    # Mark route on first boarding, so each stop list is scanned once
    if source == target:
        return 0
    # routes through each stop (stop to route indexes)
    routes_at = defaultdict(list)
    for r, stops in enumerate(routes):
        for stop in stops:
            routes_at[stop].append(r)
    used = [False] * len(routes)
    seen = {source}
    queue = deque([source])
    buses = 0
    while queue:
        buses += 1
        # stops reachable with buses - 1 buses
        for _ in range(len(queue)):
            stop = queue.popleft()
            # each route through this stop not boarded yet
            for r in routes_at[stop]:
                if used[r]:
                    continue
                used[r] = True
                for nxt in routes[r]:
                    if nxt == target:
                        return buses
                    if nxt not in seen:
                        seen.add(nxt)
                        queue.append(nxt)
    return -1
```

```java
int numBusesToDestination(int[][] routes, int source, int target) {
    // BFS level = buses boarded; boarding route reaches all its stops
    // Mark route on first boarding, so each stop list is scanned once
    if (source == target) return 0;
    // routes through each stop (stop to route indexes)
    Map<Integer, List<Integer>> routesAt = new HashMap<>();
    for (int r = 0; r < routes.length; r++)
        for (int stop : routes[r]) routesAt.computeIfAbsent(stop, k -> new ArrayList<>()).add(r);
    boolean[] used = new boolean[routes.length];
    Set<Integer> seen = new HashSet<>(List.of(source));
    Deque<Integer> queue = new ArrayDeque<>(List.of(source));
    int buses = 0;
    while (!queue.isEmpty()) {
        buses++;
        // stops reachable with buses - 1 buses
        for (int k = queue.size(); k > 0; k--) {
            int stop = queue.poll();
            // each route through this stop not boarded yet
            for (int r : routesAt.getOrDefault(stop, List.of())) {
                if (used[r]) continue;
                used[r] = true;
                for (int next : routes[r]) {
                    if (next == target) return buses;
                    if (seen.add(next)) queue.add(next);
                }
            }
        }
    }
    return -1;
}
```

```cpp
int numBusesToDestination(vector<vector<int>>& routes, int source, int target) {
    // BFS level = buses boarded; boarding route reaches all its stops
    // Mark route on first boarding, so each stop list is scanned once
    if (source == target) return 0;
    // routes through each stop (stop to route indexes)
    unordered_map<int, vector<int>> routesAt;
    for (int r = 0; r < (int)routes.size(); r++)
        for (int stop : routes[r]) routesAt[stop].push_back(r);
    vector<bool> used(routes.size(), false);
    unordered_set<int> seen{source};
    queue<int> q;
    q.push(source);
    int buses = 0;
    while (!q.empty()) {
        buses++;
        // stops reachable with buses - 1 buses
        for (int k = q.size(); k > 0; k--) {
            int stop = q.front(); q.pop();
            // each route through this stop not boarded yet
            for (int r : routesAt[stop]) {
                if (used[r]) continue;
                used[r] = true;
                for (int next : routes[r]) {
                    if (next == target) return buses;
                    if (seen.insert(next).second) q.push(next);
                }
            }
        }
    }
    return -1;
}
```

Pitfalls:

- **`source == target` needs 0 buses.** Check it before the BFS, which would otherwise answer 1 or more.
- **Building a stop-to-stop graph** (an edge between every pair of stops on a route) costs O(L²) per route before the BFS even starts. Keep the route lists and mark routes instead.
- **Stop ids can be huge** (up to 10⁶), so use hash maps rather than arrays sized by the largest id.

The same shape fits any problem where one move reaches a whole group at once: *jump game IV* (one jump reaches every index with the same value; clear that value's list after using it), or teleporters and portals in grid puzzles.

## Eulerian paths: Hierholzer's algorithm

An **Eulerian path** uses every *edge* exactly once; vertices may repeat. If it ends where it started, it's an **Eulerian circuit**. In interviews it hides behind "use every ticket / domino / pair exactly once": *reconstruct itinerary*, *valid arrangement of pairs*, *cracking the safe*.

Whether one exists depends only on degrees (ignoring vertices with no edges, all edges must be in one connected piece):

| | Circuit exists when | Path exists when |
|---|---|---|
| Undirected | every vertex has even degree | exactly 0 or 2 vertices have odd degree; start at an odd one |
| Directed | in-degree = out-degree everywhere | one vertex has out − in = 1 (the start), one has in − out = 1 (the end), the rest are balanced |

**Hierholzer's algorithm** builds the path in O(E):

1. Push the start vertex on a stack.
2. Look at the top vertex. If it has an unused edge, use it: delete the edge and push the vertex it leads to.
3. If it has no unused edges, pop it and append it to the route.
4. When the stack is empty, reverse the route.

Step 3 appends in **post-order**, and that's the key. A walk can only get stuck at the end vertex, so the first vertex appended is where the path finishes. If the walk missed a loop of edges, the stack backs up to a vertex on that loop, walks the loop as a detour, and appends it before the part that led into it. After reversing, the detour sits in the middle, exactly where it belongs.

**Lexicographically smallest itinerary**: when several edges are unused, always take the smallest destination. Sort each adjacency list (or keep a min-heap per vertex) and use the edges in that order. Greedy choice alone isn't enough, because the smallest edge can lead to a dead end; post-order fixes that.

```diagram
{"type":"graph","nodes":["JFK","KUL","NRT"],"edges":[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]],"directed":true,"path":["JFK","NRT","JFK","KUL"],"highlight":["KUL"],"caption":"Tickets JFK→KUL, JFK→NRT, NRT→JFK. KUL is the smaller destination but a dead end; the only itinerary using every ticket is JFK, NRT, JFK, KUL."}
```

On that example, the stack goes JFK, KUL; KUL is stuck, so the route starts `[KUL]`. Back at JFK the next ticket goes to NRT, then NRT goes back to JFK. Everything is stuck now, so the pops give `KUL, JFK, NRT, JFK`, and reversing gives `JFK, NRT, JFK, KUL`.

```python
from collections import defaultdict

def find_itinerary(tickets):
    graph = defaultdict(list)
    for src, dst in sorted(tickets, reverse=True):
        graph[src].append(dst)           # reverse-sorted, so pop() gives the smallest
    route, stack = [], ["JFK"]
    while stack:
        if graph[stack[-1]]:             # an unused ticket out of here: take it
            stack.append(graph[stack[-1]].pop())
        else:                            # stuck: this stop is finished (post-order)
            route.append(stack.pop())
    return route[::-1]
```

```java
List<String> findItinerary(List<List<String>> tickets) {
    Map<String, PriorityQueue<String>> graph = new HashMap<>();   // min-heap: smallest first
    for (List<String> t : tickets)
        graph.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).add(t.get(1));
    LinkedList<String> route = new LinkedList<>();
    Deque<String> stack = new ArrayDeque<>();
    stack.push("JFK");
    while (!stack.isEmpty()) {
        PriorityQueue<String> next = graph.get(stack.peek());
        if (next != null && !next.isEmpty()) stack.push(next.poll());  // take an unused ticket
        else route.addFirst(stack.pop());    // stuck: finished; prepending does the reverse
    }
    return route;
}
```

```cpp
vector<string> findItinerary(vector<vector<string>>& tickets) {
    unordered_map<string, vector<string>> graph;
    sort(tickets.begin(), tickets.end(), greater<>());
    for (auto& t : tickets) graph[t[0]].push_back(t[1]);   // reverse-sorted: back() is smallest
    vector<string> route, stack{"JFK"};
    while (!stack.empty()) {
        vector<string>& next = graph[stack.back()];
        if (!next.empty()) {                 // an unused ticket out of here: take it
            string to = next.back();
            next.pop_back();
            stack.push_back(to);
        } else {                             // stuck: this stop is finished (post-order)
            route.push_back(stack.back());
            stack.pop_back();
        }
    }
    reverse(route.begin(), route.end());
    return route;
}
```

**O(E log E)** for sorting the destinations, then O(V + E) for the walk; O(V + E) space. Pitfalls:

- **Don't mark vertices visited.** Vertices repeat; it's the edges that are used up, so delete each edge as you take it.
- **Append on the way out, not on the way in.** Recording vertices in pre-order gives a wrong route whenever a detour exists (try it on the example above).
- **Undirected graphs**: remove the edge from both endpoints' lists, usually by giving each edge an id and keeping a `used` array.
- **Recursive version**: the depth can reach E. Use the explicit stack in Python.
- **Pick the right start**: the vertex with out − in = 1 if there is one, otherwise any vertex that has edges.

## Reorder routes: direction tags

*Reorder routes to make all paths lead to the city zero*: `n` cities form a tree of one-way roads `[a, b]` (from `a` to `b`). What's the fewest roads to reverse so every city can reach city 0?

Ignore direction for the traversal, but **remember it as a tag**. Store each road in both cities' lists: in `a`'s list as `(b, 1)` (the real road points away from `a`), and in `b`'s list as `(a, 0)`. Then BFS or DFS from city 0 over this undirected view. Every edge you walk goes **away from 0**, and every road must end up pointing **towards 0**, so each walked edge tagged 1 must be flipped. Sum the tags.

```diagram
{"type":"graph","nodes":["0","1","3","2","4","5"],"edges":[["0","1"],["1","3"],["2","3"],["4","0"],["4","5"]],"directed":true,"highlight":["1","3","5"],"caption":"Roads 0→1, 1→3 and 4→5 point away from 0 (walking out from 0 follows them), so they must flip: answer 3. 2→3 and 4→0 already point towards 0."}
```

```python
from collections import deque

def min_reorder(n, connections):
    # BFS from city 0 over roads as undirected; each edge keeps real direction
    # Walking away from 0 along road that also points away = must flip it
    # graph[u] holds (v, 1 if real road is u to v, else 0)
    graph = [[] for _ in range(n)]
    for a, b in connections:
        graph[a].append((b, 1))
        graph[b].append((a, 0))
    seen = [False] * n
    seen[0] = True
    queue = deque([0])
    flips = 0
    while queue:
        u = queue.popleft()
        for v, away in graph[u]:
            if not seen[v]:
                seen[v] = True
                # road points from u to v, away from 0
                flips += away
                queue.append(v)
    return flips
```

```java
int minReorder(int n, int[][] connections) {
    // BFS from city 0 over roads as undirected; each edge keeps real direction
    // Walking away from 0 along road that also points away = must flip it
    // graph[u] holds {v, 1 if real road is u to v, else 0}
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] c : connections) {
        graph.get(c[0]).add(new int[]{c[1], 1});
        graph.get(c[1]).add(new int[]{c[0], 0});
    }
    boolean[] seen = new boolean[n];
    seen[0] = true;
    Deque<Integer> queue = new ArrayDeque<>();
    queue.add(0);
    int flips = 0;
    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int[] e : graph.get(u)) {
            if (seen[e[0]]) continue;
            seen[e[0]] = true;
            // road points from u to v, away from 0
            flips += e[1];
            queue.add(e[0]);
        }
    }
    return flips;
}
```

```cpp
int minReorder(int n, const vector<vector<int>>& connections) {
    // BFS from city 0 over roads as undirected; each edge keeps real direction
    // Walking away from 0 along road that also points away = must flip it
    // graph[u] holds {v, 1 if real road is u to v, else 0}
    vector<vector<pair<int, int>>> graph(n);
    for (auto& c : connections) {
        graph[c[0]].push_back({c[1], 1});
        graph[c[1]].push_back({c[0], 0});
    }
    vector<bool> seen(n, false);
    seen[0] = true;
    queue<int> q;
    q.push(0);
    int flips = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (auto [v, away] : graph[u]) {
            if (seen[v]) continue;
            seen[v] = true;
            // road points from u to v, away from 0
            flips += away;
            q.push(v);
        }
    }
    return flips;
}
```

**O(n)** time and space: the graph is a tree, so each road is walked once. The pitfall is using a directed adjacency list: from 0 you'd only reach cities along roads that already point away, and miss the rest. The tag trick works whenever a problem cares about edge direction but needs to reach every vertex: tag the reverse edge with a cost of 1 and the original with 0, and on a general graph [0-1 BFS](/learn/shortest-paths#0-1-bfs) finds the fewest reversals between two vertices.

## Cloning a graph

*Clone graph*: return a deep copy of a connected undirected graph, given one node. Each copied node must point to copied neighbours, never to the originals.

The graph can have cycles, so a plain recursive copy would loop forever. Keep a **map from each original node to its copy**. It does two jobs: it's the visited set, and it lets you find the copy of any neighbour you've already made.

1. Copy the start node and put it in the map and the queue.
2. Pop a node. For each neighbour: if it isn't in the map, create its copy and queue it. Either way, append the neighbour's copy to this node's copy's list.

```diagram
{"type":"graph","nodes":["1","2","3","4"],"edges":[["1","2"],["2","3"],["3","4"],["4","1"]],"order":["1","2","4","3"],"caption":"BFS from 1 copies 1, then 2 and 4 (its neighbours), then 3. When 3 is reached from 4, its copy already exists, so the map supplies it and the cycle closes."}
```

```python
def clone_graph(node):
    # Map each original node to its copy; map doubles as visited set
    # Create copy on first sight, then wire edges as each original is processed
    if not node:
        return None
    copies = {node: Node(node.val)}
    queue = deque([node])
    while queue:
        cur = queue.popleft()
        for nb in cur.neighbors:
            # first sight, so make its copy and visit it later
            if nb not in copies:
                copies[nb] = Node(nb.val)
                queue.append(nb)
            copies[cur].neighbors.append(copies[nb])
    return copies[node]
```

```java
Node cloneGraph(Node node) {
    // Map each original node to its copy; map doubles as visited set
    // Create copy on first sight, then wire edges as each original is processed
    if (node == null) return null;
    Map<Node, Node> copies = new HashMap<>();
    copies.put(node, new Node(node.val));
    Deque<Node> queue = new ArrayDeque<>();
    queue.add(node);
    while (!queue.isEmpty()) {
        Node cur = queue.poll();
        for (Node nb : cur.neighbors) {
            // first sight, so make its copy and visit it later
            if (!copies.containsKey(nb)) {
                copies.put(nb, new Node(nb.val));
                queue.add(nb);
            }
            copies.get(cur).neighbors.add(copies.get(nb));
        }
    }
    return copies.get(node);
}
```

```cpp
Node* cloneGraph(Node* node) {
    // Map each original node to its copy; map doubles as visited set
    // Create copy on first sight, then wire edges as each original is processed
    if (!node) return nullptr;
    unordered_map<Node*, Node*> copies;
    copies[node] = new Node(node->val);
    queue<Node*> q;
    q.push(node);
    while (!q.empty()) {
        Node* cur = q.front(); q.pop();
        for (Node* nb : cur->neighbors) {
            // first sight, so make its copy and visit it later
            if (!copies.count(nb)) {
                copies[nb] = new Node(nb->val);
                q.push(nb);
            }
            copies[cur]->neighbors.push_back(copies[nb]);
        }
    }
    return copies[node];
}
```

**O(V + E)** time and O(V) space for the map. Pitfalls: creating a copy **without registering it in the map first** (the next visit makes a second copy), wiring copies to **original** neighbours, and forgetting the empty input. The same map pattern copies any pointer structure with sharing or cycles: *copy list with random pointer* uses it too (or interleaves the copies into the list to get O(1) extra space).

## Why it's O(V + E)

Both traversals have the same cost. With an adjacency list:

- Each vertex is marked once, pushed once and popped once: **O(V)**.
- When a vertex is popped, you scan its neighbour list once. Summed over all vertices, that's every list once: **O(E)** for a directed graph, 2E for an undirected one (each edge sits in two lists).

Total: **O(V + E)** time, plus O(V) for the visited set and queue or stack. Both terms matter: a graph with a million isolated vertices still costs a million steps.

| Input | BFS / DFS time |
|---|---|
| Adjacency list | O(V + E) |
| Adjacency matrix | O(V²), since each row is scanned in full |
| Grid, R × C | O(R × C): each cell has at most 4 neighbours |
| Edge list | build an adjacency list first: O(V + E) |

## Choosing BFS or DFS

Both visit everything reachable in O(V + E). The choice is about *order* and *memory*:

| The question asks for... | Use |
|---|---|
| Fewest edges / moves / minutes, nearest anything | BFS (multi-source BFS for "nearest of many") |
| Level-by-level processing | BFS |
| Is `t` reachable? Count or label components | Either (or union-find) |
| Cycle in a directed graph, topological order | DFS (or Kahn's algorithm) |
| All paths, or a path with constraints (backtracking) | DFS |
| Weighted shortest path | Neither: [Dijkstra](/learn/shortest-paths) |

Memory differs too. BFS holds a whole frontier, which on a wide graph can be most of the vertices. DFS holds one path, which on a long thin graph can be all of them (and overflow the call stack if recursive). For a search toward one known target in a huge state space, **bidirectional BFS** (expand from both ends and stop when the frontiers meet) cuts the explored area dramatically.

## Pitfalls

- **Undirected edges go in both lists.** Forgetting the reverse edge makes half the graph unreachable.
- **Disconnected graphs.** A single traversal from vertex 0 only sees its component. Counting, colouring and cycle checks need the outer loop over every vertex.
- **Marking too late.** In BFS, mark when you push. Marking on pop lets duplicates pile up in the queue and can break the level-by-level logic.
- **`list.pop(0)` in Python** is O(n). Use `deque.popleft()`.
- **Recursion depth.** Recursive DFS on 10⁵ vertices overflows in Python and can in Java; use an explicit stack (or BFS, if order doesn't matter).
- **Grid bounds.** Check `0 <= r < rows` and `0 <= c < cols` before reading the cell, and be clear whether diagonals count.
- **Using BFS on weighted graphs.** It returns the path with the fewest edges, not the lowest total weight.
