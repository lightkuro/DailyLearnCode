---
title: Union-find
summary: Disjoint sets with near-constant merge and lookup. Path compression, union by rank or size, connected components, cycle detection, Kruskal's minimum spanning tree, and when it beats DFS.
related: graphs, greedy-intervals, hashing, topological-sort
terms:
  - union-find
  - union find
  - disjoint set
  - disjoint sets
  - disjoint set union
  - DSU
  - path compression #path-compression
  - union by rank #union-by-rank-or-size
  - union by size #union-by-rank-or-size
  - inverse Ackermann #union-by-rank-or-size
  - minimum spanning tree #kruskal-s-minimum-spanning-tree
  - MST #kruskal-s-minimum-spanning-tree
  - Kruskal's algorithm #kruskal-s-minimum-spanning-tree
  - redundant connection #cycle-detection-in-undirected-graphs
  - accounts merge #accounts-merge
  - remove max number of edges #two-structures-shared-edges-first
  - couples holding hands #minimum-swaps-by-counting-cycles
  - minimum swaps #minimum-swaps-by-counting-cycles
  - find all people with secret #edges-grouped-by-time-resetting-after-each-slot
  - edge length limited paths #offline-threshold-queries
---

## The idea

**Union-find** (also called a **disjoint set union**, or **DSU**) keeps track of elements split into groups that never overlap, and supports exactly two operations:

- **find(x)**: which group is `x` in? It returns a *representative*, one element that stands for the whole group. Two elements are in the same group exactly when `find` gives the same answer for both.
- **union(a, b)**: merge the group containing `a` with the group containing `b`.

That's all it does, and it does it in close to O(1) per operation. It can't split groups, list a group's members quickly, or tell you a path between two elements. In exchange, it's the fastest way to answer "are these two connected?" while connections keep arriving.

Think of it as tracking friend circles at a party. Whenever two people meet, their circles merge. At any moment you can ask "are Ann and Bob in the same circle?" Recomputing circles from scratch with a [graph traversal](/learn/graphs) after every meeting would cost O(V + E) each time; union-find makes each meeting and each question almost free.

## A forest of parent pointers

Each group is stored as a tree, and the whole structure is just an array: `parent[x]` is the element above `x`. The root of each tree is its group's representative and points to itself. Initially every element is its own group: `parent[x] = x`.

```diagram
{"type":"graph","nodes":[{"id":"0","x":1,"y":0},{"id":"1","x":0,"y":1},{"id":"2","x":2,"y":1},{"id":"3","x":0,"y":2},{"id":"4","x":4,"y":0},{"id":"5","x":3.5,"y":1},{"id":"6","x":4.5,"y":1},{"id":"7","x":6,"y":0}],"edges":[["1","0"],["2","0"],["3","1"],["5","4"],["6","4"]],"directed":true,"highlight":["0","4","7"],"caption":"Three sets: {0, 1, 2, 3}, {4, 5, 6} and {7}. Arrows point to parents; roots are highlighted. parent = [0, 0, 0, 1, 4, 4, 4, 7]."}
```

- **find(x)**: follow parent pointers until you reach an element that is its own parent. `find(3)` goes 3 → 1 → 0, so 3's representative is 0.
- **union(a, b)**: find both roots; if they differ, make one root the parent of the other. One pointer change merges two whole trees.

The shape of the trees doesn't mean anything. Only the roots matter. That freedom is what the two optimisations below exploit.

## Path compression

Done naively, the trees can degenerate into long chains. Union `0-1`, then `1-2`, then `2-3`, always hanging the old root under the new one, and you get a chain where `find` on the bottom element walks every node: O(n) per call.

**Path compression** fixes this while you're already walking: once `find(x)` knows the root, it points every node it passed directly at the root. The first `find` pays for the walk; every later `find` on those nodes takes one step.

```diagram
{"type":"graph","nodes":["4","3","2","1","0"],"edges":[["4","3"],["3","2"],["2","1"],["1","0"]],"directed":true,"layout":"layers","path":["4","3","2","1","0"],"caption":"A chain: find(4) walks 4 → 3 → 2 → 1 → 0 before it reaches the root."}
```

```diagram
{"type":"array","rows":[{"label":"before","values":[0,0,1,2,3],"highlight":[0]},{"label":"after find(4)","values":[0,0,0,0,0],"highlight":[2,3,4]}],"caption":"The parent array. After one find(4), elements 2, 3 and 4 point straight at the root 0, so the tree is one level deep."}
```

The code is a two-line recursion: find the root of your parent, then make it your parent.

```text
find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])    # point x straight at the root
    return parent[x]
```

An iterative variant, **path halving**, makes each node on the path skip to its grandparent (`parent[x] = parent[parent[x]]`) as it climbs. It needs no recursion and gives the same guarantees.

## Union by rank or size

The other half is deciding *which* root goes under which. Hanging a big tree under a single node makes everything in it one level deeper. Hanging the small tree under the big one keeps depth down.

- **Union by size**: track how many elements each root's tree has, and attach the smaller tree under the larger root. Bonus: `size[find(x)]` tells you how big `x`'s group is, which many problems ask for.
- **Union by rank**: track a **rank** per root (an upper bound on the tree's height), attach the lower rank under the higher, and add 1 to the rank only when the two are equal.

Either rule alone keeps every tree's height at O(log n): an element only gets deeper when its tree at least doubles in size, which can happen at most log₂ n times.

With **both** path compression and union by rank or size, a sequence of `m` operations on `n` elements takes O(m · α(n)) time, where α is the **inverse Ackermann** function. It grows so slowly that α(n) ≤ 4 for any n you could ever store, so in practice each operation is constant time on average (amortized, not per call: one `find` can still walk a few levels).

| Version | find / union cost |
|---|---|
| Naive | O(n) worst case |
| Path compression only | O(log n) amortized |
| Union by rank or size only | O(log n) worst case |
| Both | O(α(n)) amortized, effectively O(1) |

### The template

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))         # every element starts as its own root
        self.size = [1] * n
        self.count = n                       # number of separate sets

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])   # path compression
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                     # already in the same set
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra                  # make ra the bigger tree
        self.parent[rb] = ra                 # union by size: small under big
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True
```

```java
class UnionFind {
    int[] parent, size;
    int count;                               // number of separate sets

    UnionFind(int n) {
        parent = new int[n];
        size = new int[n];
        count = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }  // every element is its own root
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
        return parent[x];
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already in the same set
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }  // make ra the bigger tree
        parent[rb] = ra;                     // union by size: small under big
        size[ra] += size[rb];
        count--;
        return true;
    }
}
```

```cpp
struct UnionFind {
    vector<int> parent, size;
    int count;                               // number of separate sets

    UnionFind(int n) : parent(n), size(n, 1), count(n) {
        iota(parent.begin(), parent.end(), 0);   // every element is its own root
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
        return parent[x];
    }

    bool unite(int a, int b) {               // "union" is a keyword in C++
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already in the same set
        if (size[ra] < size[rb]) swap(ra, rb);   // make ra the bigger tree
        parent[rb] = ra;                     // union by size: small under big
        size[ra] += size[rb];
        count--;
        return true;
    }
};
```

Two details make this template convenient. `union` returns whether it actually merged anything, which is the cycle test below. And `count` tracks the number of sets, which is the component count. Recursion in `find` is safe here: union by size keeps trees O(log n) deep, so the recursion never goes deeper than about 20 levels for a million elements.

## Counting connected components

Start with `n` singleton sets and union the two ends of every edge. Each successful union merges two components into one, so the number left at the end is the number of **connected components**.

```python
def count_components(n, edges):
    # start with n singleton sets, i.e. n components
    uf = UnionFind(n)
    # each edge unions its endpoints; a real merge lowers the count by one
    for a, b in edges:
        uf.union(a, b)
    # sets left = connected components
    return uf.count
```

```java
int countComponents(int n, int[][] edges) {
    // start with n singleton sets, i.e. n components
    UnionFind uf = new UnionFind(n);
    // each edge unions its endpoints; a real merge lowers the count by one
    for (int[] e : edges) uf.union(e[0], e[1]);
    // sets left = connected components
    return uf.count;
}
```

```cpp
int countComponents(int n, vector<vector<int>>& edges) {
    // start with n singleton sets, i.e. n components
    UnionFind uf(n);
    // each edge unions its endpoints; a real merge lowers the count by one
    for (auto& e : edges) uf.unite(e[0], e[1]);
    // sets left = connected components
    return uf.count;
}
```

That's O(n + E · α(n)). The same pattern solves *number of provinces* (union `i` and `j` whenever `isConnected[i][j]` is 1), *satisfiability of equality equations* (union every `a == b`, then check that no `a != b` has both sides in one set), and *smallest string with swaps* (indices that can be swapped form a set; sort the characters within each set).

## Cycle detection in undirected graphs

Process the edges one at a time. If an edge's two endpoints are *already* in the same set, a path between them exists, and this edge closes a loop. That's exactly when `union` returns false.

*Redundant connection* gives a tree with one extra edge and asks which edge to remove: the first edge whose `union` fails.

```python
def find_redundant_connection(edges):
    uf = UnionFind(len(edges) + 1)           # nodes are numbered 1..n
    for a, b in edges:
        if not uf.union(a, b):
            return [a, b]                    # a and b were already connected: a cycle
    return []
```

```java
int[] findRedundantConnection(int[][] edges) {
    UnionFind uf = new UnionFind(edges.length + 1);   // nodes are numbered 1..n
    for (int[] e : edges) {
        if (!uf.union(e[0], e[1])) return e;          // already connected: a cycle
    }
    return new int[0];
}
```

```cpp
vector<int> findRedundantConnection(vector<vector<int>>& edges) {
    UnionFind uf(edges.size() + 1);                   // nodes are numbered 1..n
    for (auto& e : edges) {
        if (!uf.unite(e[0], e[1])) return e;          // already connected: a cycle
    }
    return {};
}
```

*Graph valid tree* combines both checks: `n` vertices form a tree exactly when there are `n - 1` edges and no union fails.

This only works for **undirected** graphs. In a directed graph, `A → B` and `A → C` and `B → C` puts B and C in one set without any directed cycle. For directed cycles use DFS colours or Kahn's algorithm (see [topological sort](/learn/topological-sort)).

## Kruskal's minimum spanning tree

A **spanning tree** of a connected, weighted, undirected graph is a set of `V - 1` edges that connects every vertex with no cycles. A **minimum spanning tree (MST)** is one with the smallest total weight: the cheapest way to wire up every house, connect every city or link every point.

**Kruskal's algorithm** is greedy:

1. Sort all edges by weight, cheapest first.
2. Go through them in order. Keep an edge if its endpoints are in *different* components (union succeeds); skip it if they're already connected (it would make a cycle).
3. Stop after `V - 1` edges.

Why is greedy safe here? The **cut property**: split the vertices into any two groups, and the cheapest edge crossing between them belongs to some MST. When Kruskal keeps an edge, it's the cheapest edge leaving its component (all cheaper ones were already considered), so it's always a safe choice. See [greedy algorithms](/learn/greedy-intervals) for more arguments of this kind.

```diagram
{"type":"graph","nodes":[{"id":"0","x":0,"y":0},{"id":"1","x":1,"y":1},{"id":"2","x":2,"y":0},{"id":"3","x":3,"y":1},{"id":"4","x":4,"y":0},{"id":"5","x":5,"y":1}],"edges":[["0","1",1],["1","2",2],["0","2",4],["2","3",3],["1","3",5],["3","4",2],["2","4",6],["4","5",1],["3","5",4]],"path":["0","1","2","3","4","5"],"caption":"Kruskal keeps 0-1 (1), 4-5 (1), 1-2 (2), 3-4 (2), 2-3 (3) and skips every heavier edge. MST weight: 9."}
```

| Edge | Weight | Components before | Action |
|---|---|---|---|
| 0-1 | 1 | all separate | keep |
| 4-5 | 1 | {0,1} | keep |
| 1-2 | 2 | {0,1} {4,5} | keep |
| 3-4 | 2 | {0,1,2} {4,5} | keep |
| 2-3 | 3 | {0,1,2} {3,4,5} | keep: 5 edges, done |
| 0-2, 3-5, 1-3, 2-4 | 4, 4, 5, 6 | one component | skip (each would close a cycle) |

```python
def minimum_spanning_tree(n, edges):         # edge [u, v, w]
    uf = UnionFind(n)
    total = used = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if uf.union(u, v):                   # joins two components: keep it
            total += w
            used += 1
            if used == n - 1:
                break
    return total if used == n - 1 else -1    # -1: the graph isn't connected
```

```java
int minimumSpanningTree(int n, int[][] edges) {   // edge {u, v, w}
    int[][] sorted = edges.clone();
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[2], b[2]));
    UnionFind uf = new UnionFind(n);
    int total = 0, used = 0;
    for (int[] e : sorted) {
        if (uf.union(e[0], e[1])) {               // joins two components: keep it
            total += e[2];
            if (++used == n - 1) break;
        }
    }
    return used == n - 1 ? total : -1;            // -1: the graph isn't connected
}
```

```cpp
int minimumSpanningTree(int n, vector<vector<int>> edges) {   // edge {u, v, w}; copied, then sorted
    sort(edges.begin(), edges.end(), [](auto& a, auto& b) { return a[2] < b[2]; });
    UnionFind uf(n);
    int total = 0, used = 0;
    for (auto& e : edges) {
        if (uf.unite(e[0], e[1])) {               // joins two components: keep it
            total += e[2];
            if (++used == n - 1) break;
        }
    }
    return used == n - 1 ? total : -1;            // -1: the graph isn't connected
}
```

Sorting dominates: **O(E log E)**. The alternative, **Prim's algorithm**, grows one tree from a start vertex and repeatedly adds the cheapest edge leaving it, using a heap like Dijkstra's. On a dense graph such as *min cost to connect all points* (every pair of points is an edge, so E ≈ n²/2), Prim with a plain array runs in O(n²) and beats sorting all the edges.

## Two structures, shared edges first

Some problems have two people walking the same graph with different permissions. *Remove max number of edges to keep graph fully traversable* has three kinds of edge: type 1 only Alice can use, type 2 only Bob can use, type 3 both can use. Remove as many edges as possible while each of them can still reach every node from every other node (or return -1 if that's impossible from the start).

Keep **one union-find per person** and count the edges that actually merge something:

1. **Shared edges first.** For each type 3 edge, union it in Alice's structure; if that merged two sets, union it in Bob's as well and count it as kept. Until now both structures have seen exactly the same edges, so they hold the same sets and one test covers both.
2. **Then the private edges.** Union each type 1 edge in Alice's structure and each type 2 edge in Bob's, counting the ones that merge.
3. If either structure still has more than one set, return -1. Otherwise every edge that didn't merge anything is removable: the answer is `edges - kept`.

Why shared edges first? Each person needs exactly `n - 1` merging edges, and a type 3 edge that merges counts for both of them at once. Taking it before a private edge can only lower the total kept, never raise it. It's Kruskal's argument from above, with type 3 edges as the cheapest weight. Processing them in input order instead lets a private edge use up a connection that a shared edge could have covered for both people.

```python
def max_num_edges_to_remove(n, edges):
    # Shared edges first, so one edge can serve both people
    # Keep edge only if it merges two sets in its owner's structure
    # Removable = edges not kept, if both structures end up as one set
    alice, bob = UnionFind(n), UnionFind(n)
    kept = 0
    for kind, u, v in edges:
        # both structures hold same sets here, so one test covers both
        if kind == 3 and alice.union(u - 1, v - 1):
            bob.union(u - 1, v - 1)
            kept += 1
    for kind, u, v in edges:
        if kind == 1 and alice.union(u - 1, v - 1):
            kept += 1
        elif kind == 2 and bob.union(u - 1, v - 1):
            kept += 1
    # someone can't reach every node
    if alice.count > 1 or bob.count > 1:
        return -1
    return len(edges) - kept
```

```java
int maxNumEdgesToRemove(int n, int[][] edges) {
    // Shared edges first, so one edge can serve both people
    // Keep edge only if it merges two sets in its owner's structure
    // Removable = edges not kept, if both structures end up as one set
    UnionFind alice = new UnionFind(n), bob = new UnionFind(n);
    int kept = 0;
    for (int[] e : edges) {
        // both structures hold same sets here, so one test covers both
        if (e[0] == 3 && alice.union(e[1] - 1, e[2] - 1)) {
            bob.union(e[1] - 1, e[2] - 1);
            kept++;
        }
    }
    for (int[] e : edges) {
        if (e[0] == 1 && alice.union(e[1] - 1, e[2] - 1)) kept++;
        else if (e[0] == 2 && bob.union(e[1] - 1, e[2] - 1)) kept++;
    }
    // someone can't reach every node
    if (alice.count > 1 || bob.count > 1) return -1;
    return edges.length - kept;
}
```

```cpp
int maxNumEdgesToRemove(int n, vector<vector<int>>& edges) {
    // Shared edges first, so one edge can serve both people
    // Keep edge only if it merges two sets in its owner's structure
    // Removable = edges not kept, if both structures end up as one set
    UnionFind alice(n), bob(n);
    int kept = 0;
    for (auto& e : edges) {
        // both structures hold same sets here, so one test covers both
        if (e[0] == 3 && alice.unite(e[1] - 1, e[2] - 1)) {
            bob.unite(e[1] - 1, e[2] - 1);
            kept++;
        }
    }
    for (auto& e : edges) {
        if (e[0] == 1 && alice.unite(e[1] - 1, e[2] - 1)) kept++;
        else if (e[0] == 2 && bob.unite(e[1] - 1, e[2] - 1)) kept++;
    }
    // someone can't reach every node
    if (alice.count > 1 || bob.count > 1) return -1;
    return edges.size() - kept;
}
```

On `n = 4` with edges `[3,1,2] [3,2,3] [1,1,3] [1,2,4] [1,1,2] [2,3,4]`, both shared edges merge (kept 2). Alice's `1-3` closes a loop, `2-4` merges and `1-2` closes a loop (kept 3); Bob's `3-4` merges (kept 4). Both structures are one set, so 6 - 4 = **2** edges can go.

That's **O(E · α(n))**: two passes over the edges, no sorting. The pitfalls: counting a shared edge twice (it's one edge, even though it merged in two structures), forgetting the -1 check, and nodes numbered from 1.

## Accounts merge

*Accounts merge* gives a list of accounts, each a name followed by emails. Two accounts belong to the same person if they share any email, directly or through a chain of other accounts. Merge them.

Union-find over account indices handles the chains automatically:

1. Walk every email. The first time you see it, record which account owns it. If you've seen it before, union the current account with that owner.
2. Group every email under `find(owner)`, the root account of its person.
3. Output each group as the root account's name plus its sorted emails.

```python
from collections import defaultdict

def accounts_merge(accounts):
    uf = UnionFind(len(accounts))
    owner = {}                               # email -> first account that listed it
    for i, (_, *emails) in enumerate(accounts):
        for e in emails:
            if e in owner:
                uf.union(i, owner[e])        # same email: same person
            else:
                owner[e] = i
    groups = defaultdict(list)
    for e, i in owner.items():
        groups[uf.find(i)].append(e)
    return [[accounts[root][0]] + sorted(es) for root, es in groups.items()]
```

```java
List<List<String>> accountsMerge(List<List<String>> accounts) {
    UnionFind uf = new UnionFind(accounts.size());
    Map<String, Integer> owner = new HashMap<>();     // email -> first account that listed it
    for (int i = 0; i < accounts.size(); i++) {
        List<String> acc = accounts.get(i);
        for (int j = 1; j < acc.size(); j++) {
            Integer prev = owner.putIfAbsent(acc.get(j), i);
            if (prev != null) uf.union(i, prev);      // same email: same person
        }
    }
    Map<Integer, List<String>> groups = new HashMap<>();
    for (Map.Entry<String, Integer> e : owner.entrySet()) {
        groups.computeIfAbsent(uf.find(e.getValue()), k -> new ArrayList<>()).add(e.getKey());
    }
    List<List<String>> out = new ArrayList<>();
    for (Map.Entry<Integer, List<String>> g : groups.entrySet()) {
        List<String> row = new ArrayList<>(g.getValue());
        Collections.sort(row);
        row.add(0, accounts.get(g.getKey()).get(0));  // the name goes first
        out.add(row);
    }
    return out;
}
```

```cpp
vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
    UnionFind uf(accounts.size());
    unordered_map<string, int> owner;                 // email -> first account that listed it
    for (int i = 0; i < (int)accounts.size(); i++) {
        for (int j = 1; j < (int)accounts[i].size(); j++) {
            auto [it, inserted] = owner.try_emplace(accounts[i][j], i);
            if (!inserted) uf.unite(i, it->second);   // same email: same person
        }
    }
    unordered_map<int, vector<string>> groups;
    for (auto& [email, i] : owner) groups[uf.find(i)].push_back(email);
    vector<vector<string>> out;
    for (auto& [root, emails] : groups) {
        sort(emails.begin(), emails.end());
        vector<string> row = {accounts[root][0]};     // the name goes first
        row.insert(row.end(), emails.begin(), emails.end());
        out.push_back(row);
    }
    return out;
}
```

Notice that the *names* are never compared: two different people can both be called "John". Only shared emails link accounts. The cost is dominated by sorting the emails: O(N log N) for N emails in total. The general trick is worth remembering: when the elements are strings or coordinates, map them to integer ids with a [hash map](/learn/hashing) first, or let the parent array itself be a hash map.

## Minimum swaps by counting cycles

*Couples holding hands*: `2n` people sit in a row, and persons `2k` and `2k + 1` are a couple. Couch `i` is seats `2i` and `2i + 1`. What's the fewest swaps of two people that seats every couple on one couch?

Turn it into a graph whose vertices are **couples** (couple id = `person // 2`). Each couch joins the two couple ids sitting on it with an edge. Every couple has exactly two members, so every vertex has degree 2 (a couple already together gives a loop on itself). A graph where every degree is 2 splits into **cycles**, and union-find counts them: union the two ids on each couch, then `count` is the number of cycles.

```diagram
{"type":"graph","nodes":["c0","c1","c2","c3"],"edges":[["c0","c1"],["c1","c2"],["c2","c0"]],"highlight":["c3"],"notes":{"c3":"together"},"caption":"Row [0, 2, 3, 4, 5, 1, 6, 7]: couches hold couples (0, 1), (1, 2), (2, 0) and (3, 3). One 3-cycle plus couple 3 on its own: 4 couples - 2 cycles = 2 swaps."}
```

A cycle of `k` couples needs exactly **k - 1 swaps**:

- **Enough**: fix one couch per swap. Bring a partner over to complete one couch; that shortens the cycle by one. The last swap of the cycle completes two couches at once.
- **Necessary**: a swap rewires two couches, so it splits one cycle into at most two (or merges two into one). Each swap adds at most one cycle. The goal state has `n` cycles (every couple a loop), so starting from `c` cycles needs at least `n - c` swaps.

Summing over all cycles: **answer = couples − cycles**.

```python
def min_swaps_couples(row):
    # Couple id = person // 2; each couch links couple ids sitting on it
    # Every couple id sits on two couches, so components are cycles
    # Cycle of k couples needs k - 1 swaps, so answer = couples - cycles
    couples = len(row) // 2
    uf = UnionFind(couples)
    # couch i holds seats 2i and 2i + 1
    for seat in range(0, len(row), 2):
        uf.union(row[seat] // 2, row[seat + 1] // 2)
    # couple already together = cycle of its own
    return couples - uf.count
```

```java
int minSwapsCouples(int[] row) {
    // Couple id = person / 2; each couch links couple ids sitting on it
    // Every couple id sits on two couches, so components are cycles
    // Cycle of k couples needs k - 1 swaps, so answer = couples - cycles
    int couples = row.length / 2;
    UnionFind uf = new UnionFind(couples);
    // couch i holds seats 2i and 2i + 1
    for (int seat = 0; seat < row.length; seat += 2) uf.union(row[seat] / 2, row[seat + 1] / 2);
    // couple already together = cycle of its own
    return couples - uf.count;
}
```

```cpp
int minSwapsCouples(vector<int>& row) {
    // Couple id = person / 2; each couch links couple ids sitting on it
    // Every couple id sits on two couches, so components are cycles
    // Cycle of k couples needs k - 1 swaps, so answer = couples - cycles
    int couples = row.size() / 2;
    UnionFind uf(couples);
    // couch i holds seats 2i and 2i + 1
    for (int seat = 0; seat < (int)row.size(); seat += 2) uf.unite(row[seat] / 2, row[seat + 1] / 2);
    // couple already together = cycle of its own
    return couples - uf.count;
}
```

**O(n · α(n))** time, O(n) space. The same count answers *minimum swaps to sort a permutation*: draw an arrow from each index `i` to `p[i]`, and the answer is `n − cycles`. There you can also count the cycles by following arrows with a visited array, no union-find needed.

The pitfall is **simulating greedily and counting swaps** without a reason it's optimal, or counting couples that are out of place (a 2-cycle has two misplaced couples but needs only one swap). Count cycles, not misplaced elements.

## Edges grouped by time: resetting after each slot

*Find all people with secret*: person 0 tells `firstPerson` a secret at time 0. Meetings `[x, y, time]` follow; at a meeting, anyone who knows the secret shares it, and sharing within the same time slot is instant (it can pass along a chain of meetings at the same time). Who knows it at the end?

Sort the meetings by time and handle one time slot at a time. Within a slot, union everyone who meets: whoever ends up in person 0's set knows the secret. The catch is the people who met in this slot but **didn't** join 0's set. Their links mean "met each other at time t", and that fact must not carry the secret later. If `a` and `b` meet at time 1 without the secret, and `b` learns it at time 2, `a` must still not know it.

So after each slot, **reset** every person from that slot who isn't connected to 0: `parent[p] = p`, `size[p] = 1`. That's safe because of an invariant: between slots, every person is either in 0's set or alone. So a set made in this slot without 0 contains only this slot's people, and resetting all of them undoes it completely.

```python
def find_all_people(n, meetings, first_person):
    # Union people who meet at same time, one time slot at a time
    # After slot, anyone not joined to person 0 resets to own set
    # Meeting with no secret holder passes nothing on, so its links must go
    uf = UnionFind(n)
    uf.union(0, first_person)
    meetings.sort(key=lambda m: m[2])
    i = 0
    while i < len(meetings):
        # j = end of this time slot
        j = i
        while j < len(meetings) and meetings[j][2] == meetings[i][2]:
            j += 1
        for x, y, _ in meetings[i:j]:
            uf.union(x, y)
        # met only people without secret, so undo those links
        for x, y, _ in meetings[i:j]:
            for p in (x, y):
                if uf.find(p) != uf.find(0):
                    uf.parent[p] = p
                    uf.size[p] = 1
        i = j
    return [p for p in range(n) if uf.find(p) == uf.find(0)]
```

```java
List<Integer> findAllPeople(int n, int[][] meetings, int firstPerson) {
    // Union people who meet at same time, one time slot at a time
    // After slot, anyone not joined to person 0 resets to own set
    // Meeting with no secret holder passes nothing on, so its links must go
    UnionFind uf = new UnionFind(n);
    uf.union(0, firstPerson);
    Arrays.sort(meetings, (a, b) -> Integer.compare(a[2], b[2]));
    int i = 0;
    while (i < meetings.length) {
        // j = end of this time slot
        int j = i;
        while (j < meetings.length && meetings[j][2] == meetings[i][2]) j++;
        for (int k = i; k < j; k++) uf.union(meetings[k][0], meetings[k][1]);
        // met only people without secret, so undo those links
        for (int k = i; k < j; k++) {
            for (int p : new int[]{meetings[k][0], meetings[k][1]}) {
                if (uf.find(p) != uf.find(0)) {
                    uf.parent[p] = p;
                    uf.size[p] = 1;
                }
            }
        }
        i = j;
    }
    List<Integer> result = new ArrayList<>();
    for (int p = 0; p < n; p++) if (uf.find(p) == uf.find(0)) result.add(p);
    return result;
}
```

```cpp
vector<int> findAllPeople(int n, vector<vector<int>>& meetings, int firstPerson) {
    // Union people who meet at same time, one time slot at a time
    // After slot, anyone not joined to person 0 resets to own set
    // Meeting with no secret holder passes nothing on, so its links must go
    UnionFind uf(n);
    uf.unite(0, firstPerson);
    sort(meetings.begin(), meetings.end(),
         [](auto& a, auto& b) { return a[2] < b[2]; });
    size_t i = 0;
    while (i < meetings.size()) {
        // j = end of this time slot
        size_t j = i;
        while (j < meetings.size() && meetings[j][2] == meetings[i][2]) j++;
        for (size_t k = i; k < j; k++) uf.unite(meetings[k][0], meetings[k][1]);
        // met only people without secret, so undo those links
        for (size_t k = i; k < j; k++) {
            for (int p : {meetings[k][0], meetings[k][1]}) {
                if (uf.find(p) != uf.find(0)) {
                    uf.parent[p] = p;
                    uf.size[p] = 1;
                }
            }
        }
        i = j;
    }
    vector<int> result;
    for (int p = 0; p < n; p++) if (uf.find(p) == uf.find(0)) result.push_back(p);
    return result;
}
```

Sorting costs **O(m log m)** for m meetings; the unions, finds and resets are near O(1) each, and the final scan is O(n α(n)). Pitfalls:

- **Resetting only the roots** leaves children pointing into a dead set. Reset every person who took part in the slot.
- **Resetting someone connected to 0.** Check `find(p) != find(0)`; 0's root can change when sets merge under union by size.
- **Processing meetings one at a time** instead of by slot. Order inside a slot doesn't matter, so `a–b` before `b–0` at the same time must still tell `a`.

## Offline threshold queries

*Checking existence of edge length limited paths*: given a weighted graph and queries `[p, q, limit]`, is there a path from `p` to `q` using only edges **lighter than** `limit`? A BFS per query is O(q · (V + E)).

Answer the queries [offline](/learn/heaps#offline-queries-with-a-sweep), in increasing order of limit. As the limit grows, the set of usable edges only **grows**, and union-find handles additions perfectly. Sort the edges by weight and keep one pointer into them:

1. Sort the edges by weight, and the query **indices** by limit.
2. For each query, union every not-yet-used edge with weight `< limit`.
3. The answer is whether `p` and `q` have the same root. Write it at the query's original index.

Each edge is unioned once over the whole sweep, so it's like running [Kruskal](/learn/union-find#kruskal-s-minimum-spanning-tree) once and pausing to answer questions.

```python
def distance_limited_paths_exist(n, edge_list, queries):
    # Sort edges and queries by limit; sweep queries from smallest limit up
    # Before each query, union every edge lighter than its limit
    # Edges only get added, so each is unioned once overall
    edge_list.sort(key=lambda e: e[2])
    order = sorted(range(len(queries)), key=lambda q: queries[q][2])
    uf = UnionFind(n)
    ans = [False] * len(queries)
    # i = next edge not yet unioned
    i = 0
    for q in order:
        p, r, limit = queries[q]
        # strictly below limit counts
        while i < len(edge_list) and edge_list[i][2] < limit:
            uf.union(edge_list[i][0], edge_list[i][1])
            i += 1
        ans[q] = uf.find(p) == uf.find(r)
    return ans
```

```java
boolean[] distanceLimitedPathsExist(int n, int[][] edgeList, int[][] queries) {
    // Sort edges and queries by limit; sweep queries from smallest limit up
    // Before each query, union every edge lighter than its limit
    // Edges only get added, so each is unioned once overall
    Arrays.sort(edgeList, (a, b) -> Integer.compare(a[2], b[2]));
    Integer[] order = new Integer[queries.length];
    for (int q = 0; q < order.length; q++) order[q] = q;
    Arrays.sort(order, (a, b) -> Integer.compare(queries[a][2], queries[b][2]));
    UnionFind uf = new UnionFind(n);
    boolean[] ans = new boolean[queries.length];
    // i = next edge not yet unioned
    int i = 0;
    for (int q : order) {
        int limit = queries[q][2];
        // strictly below limit counts
        while (i < edgeList.length && edgeList[i][2] < limit) {
            uf.union(edgeList[i][0], edgeList[i][1]);
            i++;
        }
        ans[q] = uf.find(queries[q][0]) == uf.find(queries[q][1]);
    }
    return ans;
}
```

```cpp
vector<bool> distanceLimitedPathsExist(int n, vector<vector<int>>& edgeList,
                                       vector<vector<int>>& queries) {
    // Sort edges and queries by limit; sweep queries from smallest limit up
    // Before each query, union every edge lighter than its limit
    // Edges only get added, so each is unioned once overall
    sort(edgeList.begin(), edgeList.end(),
         [](auto& a, auto& b) { return a[2] < b[2]; });
    vector<int> order(queries.size());
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(),
         [&](int a, int b) { return queries[a][2] < queries[b][2]; });
    UnionFind uf(n);
    vector<bool> ans(queries.size());
    // i = next edge not yet unioned
    size_t i = 0;
    for (int q : order) {
        int limit = queries[q][2];
        // strictly below limit counts
        while (i < edgeList.size() && edgeList[i][2] < limit) {
            uf.unite(edgeList[i][0], edgeList[i][1]);
            i++;
        }
        ans[q] = uf.find(queries[q][0]) == uf.find(queries[q][1]);
    }
    return ans;
}
```

**O(E log E + q log q)** for the sorts, plus near-linear unions. Pitfalls: strict `<` versus `<=` (read the statement: here edges must be strictly lighter), sorting the queries themselves instead of their indices (the answers come out in the wrong order), and forgetting that edges between the same pair can repeat (harmless: the second union returns `False`). The same sweep answers "smallest limit that connects `p` and `q`" by stopping when they join, and "how many nodes are reachable under each threshold" by reading set sizes.

## Union-find vs DFS for islands

*Number of islands* can be solved either way. With union-find, give cell `(r, c)` the id `r * cols + c`, union each land cell with its land neighbours to the right and below, and count the land sets. Both approaches are O(rows × cols) (union-find with an extra α factor). So which should you reach for?

| Situation | Better choice |
|---|---|
| A fixed grid or graph, count or label components once | DFS / BFS: simpler, no extra structure |
| Land or edges **added over time**, answer after each (*number of islands II*) | Union-find: each addition is near O(1), DFS would redo O(V + E) |
| Input is a list of edges or equivalences, only connectivity matters | Union-find: no adjacency list needed |
| Need distances, paths or the actual route | BFS / DFS |
| Edges or cells **removed** over time | Neither directly. Union-find can't split sets; process the events in reverse so removals become additions |
| Directed graphs | DFS (union-find ignores direction) |

The rule of thumb: union-find answers *"are these connected?"* under a stream of merges. Traversals answer everything else.

## Pitfalls

- **Union the roots, not the elements.** `parent[a] = b` silently corrupts the structure if `a` isn't a root. Always `ra, rb = find(a), find(b)` first.
- **Compare roots, not parents.** "Same set" is `find(a) == find(b)`. After unions, `parent[x]` may point to an old root that is no longer the top.
- **Call `find` when grouping.** When collecting members by set at the end, group by `find(x)`, not `parent[x]`.
- **Deep recursion without union by size.** With path compression alone, the first `find` on a long chain recurses n deep and can overflow (Python's limit is about 1,000). Use union by size, or the iterative path-halving `find`.
- **1-indexed input.** Size the structure `n + 1` when vertices are numbered from 1.
- **Directed graphs.** Union-find treats every edge as undirected. Don't use it for directed cycle detection or reachability.
- **Weighted variants exist.** *Evaluate division* stores a ratio on each parent pointer so `find` returns both the root and `x / root`. It's the same structure with one extra array, updated during path compression.
