---
title: Recursion & backtracking
summary: How recursive calls use the stack, how to read a recursion tree, and the choose, explore, un-choose template behind subsets, permutations, combinations and N-Queens.
related: trees, dynamic-programming, big-o, graphs, sorting
terms:
  - recursion
  - recursive call #how-recursion-works
  - base case #how-recursion-works
  - base cases #how-recursion-works
  - call stack #the-call-stack
  - recursion tree #recursion-trees
  - recursion trees #recursion-trees
  - divide and conquer #divide-and-conquer
  - backtracking
  - backtrack #the-backtracking-template
  - N-Queens #n-queens
  - pruning #pruning
  - recursion limit #recursion-limits
  - recursion depth #recursion-limits
  - bitmask N-Queens #bitmask-n-queens
  - Sudoku #sudoku-solver
  - Sudoku solver #sudoku-solver
  - minimum remaining values #sudoku-solver
  - most constrained cell #sudoku-solver
  - palindrome partitions #palindrome-partitions
  - generate parentheses #generate-parentheses
  - Catalan number #generate-parentheses
  - Catalan numbers #generate-parentheses
  - unique paths III #grid-walks-unique-paths-iii
---

## How recursion works

A recursive function solves a problem by calling itself on a smaller version of the same problem. Every recursive function has two parts:

- A **base case**: an input small enough to answer directly, with no further calls. Without one (or if the input never reaches it), the function recurses forever.
- A **recursive case**: shrink the input, make the **recursive call**, and combine its answer into yours.

Factorial is the smallest example: `fact(n) = 1` if `n ≤ 1`, otherwise `n * fact(n - 1)`. The calls go down until they hit the base case, then the answers come back up:

```text
fact(4) = 4 * fact(3)
        = 4 * (3 * fact(2))
        = 4 * (3 * (2 * fact(1)))
        = 4 * (3 * (2 * 1))          base case reached; now unwind
        = 24
```

The useful mindset is the **leap of faith**: when writing `fact(n)`, assume `fact(n - 1)` already works and only think about one step. To design any recursive function, answer three questions:

1. What is the smallest input, and what's its answer? (base case)
2. How do I make the input smaller? (one element fewer, half the array, a child node)
3. How do I turn the smaller answer into mine? (combine)

### The call stack

Each call gets a **stack frame** holding its parameters, local variables and where to return to. Frames are pushed on the **call stack** when a call starts and popped when it returns, so the stack's height is the current recursion depth.

```diagram
{"type":"array","values":["fact(4)","fact(3)","fact(2)","fact(1)"],"vertical":true,"indices":false,"caption":"The call stack while fact(1) runs: four frames, each waiting for the one above it to return."}
```

That's why recursion costs **space** even when it allocates nothing: depth `d` means O(d) memory. A recursive sum over `n` items uses O(n) stack; binary search uses O(log n).

## Recursion trees

When a function makes more than one recursive call, draw each call as a node with its calls as children. This **recursion tree** shows the total work: the number of nodes times the work per node.

Naive Fibonacci, `fib(n) = fib(n - 1) + fib(n - 2)`, branches twice per call:

```diagram
{"type":"tree","values":[4,3,2,2,1,1,0,1,0],"highlight":[2],"caption":"Calls made by fib(4): 9 calls for one answer. fib(2) (highlighted) is computed twice and fib(1) three times."}
```

A tree with branching factor `b` and depth `d` has up to `b^d` nodes, so naive Fibonacci is O(2ⁿ) (more precisely about 1.6ⁿ). The recursion tree also tells you the stack space: it's the tree's *height*, not its size, because only one root-to-node path is on the stack at a time. Fibonacci uses O(n) stack. For turning recurrences into Big-O with the Master theorem, see [Big-O & complexity](/learn/big-o).

## Divide and conquer

**Divide and conquer** splits a problem into independent parts, solves each recursively, and combines the results. Merge sort splits an array in half, sorts both halves and merges them (see [sorting](/learn/sorting)); tree problems recurse on the left and right subtrees (see [binary trees](/learn/trees)).

Fast exponentiation is a compact example: `xⁿ = (x^(n/2))²`, times one more `x` when `n` is odd. One recursive call on half the exponent gives O(log n) time and stack.

```python
def my_pow(x, n):                        # x^n with O(log n) multiplications
    if n < 0:
        return 1 / my_pow(x, -n)
    if n == 0:                           # base case
        return 1.0
    half = my_pow(x, n // 2)             # one call on half the problem...
    return half * half if n % 2 == 0 else half * half * x   # ...then combine
```

```java
double myPow(double x, long n) {         // long: negating Integer.MIN_VALUE overflows an int
    if (n < 0) return 1 / myPow(x, -n);
    if (n == 0) return 1.0;              // base case
    double half = myPow(x, n / 2);       // one call on half the problem...
    return n % 2 == 0 ? half * half : half * half * x;   // ...then combine
}
```

```cpp
double myPow(double x, long long n) {    // long long: negating INT_MIN overflows an int
    if (n < 0) return 1 / myPow(x, -n);
    if (n == 0) return 1.0;              // base case
    double half = myPow(x, n / 2);       // one call on half the problem...
    return n % 2 == 0 ? half * half : half * half * x;   // ...then combine
}
```

Storing `half` matters. Writing `myPow(x, n / 2) * myPow(x, n / 2)` makes two calls per level, which turns O(log n) into O(n).

## When to memoize

Look at the recursion tree. If the **same arguments appear more than once** (overlapping subproblems, like `fib(2)` above), cache each result the first time you compute it and return the cached value after that. That's **memoization**, and it turns naive Fibonacci from O(2ⁿ) into O(n): each distinct `fib(k)` is computed once. In Python, `@functools.cache` on the function does it; in Java or C++, use a map or an array indexed by the arguments.

Memoization doesn't help when every call works on a different piece of the input (merge sort, tree traversals) or when the state includes the whole path so far (most backtracking). It's the bridge from recursion to [dynamic programming](/learn/dynamic-programming).

## Backtracking

**Backtracking** builds a solution one choice at a time and explores every way of continuing. When a partial solution can't lead anywhere valid, it gives up on it and goes back to try the next choice. Think of it as depth-first search over a tree of decisions: each node is a partial solution, each edge is a choice, and the leaves are complete candidates.

### The backtracking template

Every backtracking solution has the same skeleton: **choose, explore, un-choose**.

```text
backtrack(state):
    if state is a complete solution:
        record a copy of it
        return
    for each choice available from state:
        if the choice breaks a constraint: skip it      (pruning)
        make the choice                                 (choose)
        backtrack(state with the choice)                (explore)
        undo the choice                                 (un-choose)
```

The "undo" step is what makes it backtracking: one shared `path` is modified in place and restored after each call, instead of copying state for every branch. Only when you record a finished solution do you copy it.

### Subsets

Generate all subsets of distinct numbers. Pass a `start` index so each element is only chosen after the ones before it, which avoids producing `[2, 1]` as well as `[1, 2]`. Every node of the tree is a valid subset, so record at every call.

```diagram
{"type":"graph","nodes":["[]","1","2","3","1,2","1,3","2,3","1,2,3"],"edges":[["[]","1"],["[]","2"],["[]","3"],["1","1,2"],["1","1,3"],["2","2,3"],["1,2","1,2,3"]],"directed":true,"layout":"layers","order":["[]","1","1,2","1,2,3","1,3","2","2,3","3"],"caption":"The subset tree for [1, 2, 3]. Badges show the order the code below records them: [], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]."}
```

```python
def subsets(nums):
    res, path = [], []

    def backtrack(start):
        res.append(path[:])              # every node is a subset: record a copy
        for i in range(start, len(nums)):
            path.append(nums[i])         # choose
            backtrack(i + 1)             # explore
            path.pop()                   # un-choose

    backtrack(0)
    return res
```

```java
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), res);
    return res;
}

void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));          // every node is a subset: record a copy
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                   // choose
        backtrack(nums, i + 1, path, res);   // explore
        path.remove(path.size() - 1);        // un-choose
    }
}
```

```cpp
void backtrack(const vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& res) {
    res.push_back(path);                     // every node is a subset: record a copy
    for (int i = start; i < (int)nums.size(); i++) {
        path.push_back(nums[i]);             // choose
        backtrack(nums, i + 1, path, res);   // explore
        path.pop_back();                     // un-choose
    }
}

vector<vector<int>> subsets(const vector<int>& nums) {
    vector<vector<int>> res;
    vector<int> path;
    backtrack(nums, 0, path, res);
    return res;
}
```

There are 2ⁿ subsets and copying each takes up to O(n), so O(n · 2ⁿ) time.

**With duplicates** (`[1, 2, 2]`): sort first, then skip a choice equal to the previous one at the same level: `if i > start and nums[i] == nums[i - 1]: continue`. The same line removes duplicate results from combinations and combination sums.

### Permutations

Order matters now, so every unused element is a choice at every level. Track what's in the path with a `used` array, and record only complete paths (leaves).

```python
def permute(nums):
    res, path = [], []
    used = [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):       # a complete permutation
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True               # choose
            path.append(nums[i])
            backtrack()                  # explore
            path.pop()                   # un-choose
            used[i] = False

    backtrack()
    return res
```

```java
List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), res);
    return res;
}

void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == nums.length) {        // a complete permutation
        res.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;                      // choose
        path.add(nums[i]);
        backtrack(nums, used, path, res);    // explore
        path.remove(path.size() - 1);        // un-choose
        used[i] = false;
    }
}
```

```cpp
void backtrack(const vector<int>& nums, vector<bool>& used, vector<int>& path, vector<vector<int>>& res) {
    if (path.size() == nums.size()) {        // a complete permutation
        res.push_back(path);
        return;
    }
    for (size_t i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;                      // choose
        path.push_back(nums[i]);
        backtrack(nums, used, path, res);    // explore
        path.pop_back();                     // un-choose
        used[i] = false;
    }
}

vector<vector<int>> permute(const vector<int>& nums) {
    vector<vector<int>> res;
    vector<int> path;
    vector<bool> used(nums.size(), false);
    backtrack(nums, used, path, res);
    return res;
}
```

There are n! permutations, each O(n) to copy: O(n · n!).

### Combinations

Choose `k` numbers from `1..n`. It's the subsets template with two changes: record only when the path has `k` elements, and stop the loop early when there aren't enough numbers left to fill the path.

```python
def combine(n, k):                       # all k-element subsets of 1..n
    res, path = [], []

    def backtrack(start):
        if len(path) == k:
            res.append(path[:])
            return
        need = k - len(path)
        for i in range(start, n - need + 2):     # prune: leave room for the rest
            path.append(i)
            backtrack(i + 1)
            path.pop()

    backtrack(1)
    return res
```

```java
List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(n, k, 1, new ArrayList<>(), res);
    return res;
}

void backtrack(int n, int k, int start, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == k) {
        res.add(new ArrayList<>(path));
        return;
    }
    int need = k - path.size();
    for (int i = start; i <= n - need + 1; i++) {   // prune: leave room for the rest
        path.add(i);
        backtrack(n, k, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}
```

```cpp
void backtrack(int n, int k, int start, vector<int>& path, vector<vector<int>>& res) {
    if ((int)path.size() == k) {
        res.push_back(path);
        return;
    }
    int need = k - path.size();
    for (int i = start; i <= n - need + 1; i++) {   // prune: leave room for the rest
        path.push_back(i);
        backtrack(n, k, i + 1, path, res);
        path.pop_back();
    }
}

vector<vector<int>> combine(int n, int k) {
    vector<vector<int>> res;
    vector<int> path;
    backtrack(n, k, 1, path, res);
    return res;
}
```

**Combination sum** (reach a target, numbers may be reused) is the same shape: recurse with `i` instead of `i + 1` so the same number can be picked again, subtract it from the remaining target, and record when the remainder hits 0.

### Palindrome partitions

*Palindrome partitioning* asks for **every** way to cut a string into pieces that are all palindromes: `"aab"` gives `["a", "a", "b"]` and `["aa", "b"]`. (The fewest-cuts version is a [DP](/learn/dynamic-programming#palindrome-partitioning-minimum-cuts).) It's the subsets template over cut positions:

- The state is `start`, the index where the next piece begins.
- The choice is where that piece ends: any `end` from `start` to `n - 1`.
- Prune at once: recurse only when `s[start..end]` is a palindrome. A piece that isn't can never be part of an answer, so nothing past it is worth exploring.
- When `start == n`, the pieces in `path` cover the whole string: record a copy.

```python
def partition(s):
    # Choose where next piece ends; recurse only if piece is palindrome
    # Reaching end of string = one complete partition
    res, path = [], []

    def backtrack(start):
        if start == len(s):
            res.append(path[:])
            return
        # each end of next piece s[start..end]
        for end in range(start, len(s)):
            piece = s[start:end + 1]
            # prune at once, so every leaf is valid
            if piece == piece[::-1]:
                path.append(piece)
                backtrack(end + 1)
                path.pop()

    backtrack(0)
    return res
```

```java
List<List<String>> partition(String s) {
    // Choose where next piece ends; recurse only if piece is palindrome
    // Reaching end of string = one complete partition
    List<List<String>> res = new ArrayList<>();
    backtrack(s, 0, new ArrayList<>(), res);
    return res;
}

void backtrack(String s, int start, List<String> path, List<List<String>> res) {
    if (start == s.length()) {
        res.add(new ArrayList<>(path));
        return;
    }
    // each end of next piece s[start..end]
    for (int end = start; end < s.length(); end++) {
        // prune at once, so every leaf is valid
        if (!isPalindrome(s, start, end)) continue;
        path.add(s.substring(start, end + 1));
        backtrack(s, end + 1, path, res);
        path.remove(path.size() - 1);
    }
}

boolean isPalindrome(String s, int lo, int hi) {
    while (lo < hi) if (s.charAt(lo++) != s.charAt(hi--)) return false;
    return true;
}
```

```cpp
bool isPalindrome(const string& s, int lo, int hi) {
    while (lo < hi) if (s[lo++] != s[hi--]) return false;
    return true;
}

void backtrack(const string& s, int start, vector<string>& path, vector<vector<string>>& res) {
    if (start == (int)s.size()) {
        res.push_back(path);
        return;
    }
    // each end of next piece s[start..end]
    for (int end = start; end < (int)s.size(); end++) {
        // prune at once, so every leaf is valid
        if (!isPalindrome(s, start, end)) continue;
        path.push_back(s.substr(start, end - start + 1));
        backtrack(s, end + 1, path, res);
        path.pop_back();
    }
}

vector<vector<string>> partition(const string& s) {
    // Choose where next piece ends; recurse only if piece is palindrome
    // Reaching end of string = one complete partition
    vector<vector<string>> res;
    vector<string> path;
    backtrack(s, 0, path, res);
    return res;
}
```

A string of length `n` has `n - 1` gaps, each cut or not, so there are at most 2ⁿ⁻¹ partitions, and `"aaaa"` hits that bound (8). Recording a partition and checking a piece each cost O(n), so **O(n · 2ⁿ) time** and O(n) extra space. Pitfalls: re-checking the same substring over and over (precompute a `pal[l][r]` table, as in the DP version, to make each check O(1)), and building each substring before checking it; the Java and C++ versions check by index and only build the pieces they keep.

### Generate parentheses

*Generate parentheses*: list every balanced string of `n` pairs. Generating all 2²ⁿ strings of `(` and `)` and filtering is wasteful. Instead, prune so that every prefix stays valid:

- Add `(` while fewer than `n` have been used (`opened < n`).
- Add `)` only if it closes something (`closed < opened`). Using `closed < n` instead lets prefixes like `())` through.

With both rules no branch ever dead-ends: every path that reaches length `2n` is an answer.

```diagram
{"type":"graph","nodes":["start","(","((","()","(()","()(","(())","()()"],"edges":[["start","("],["(","(("],["(","()"],["((","(()"],["()","()("],["(()","(())"],["()(","()()"]],"directed":true,"layout":"layers","highlight":["(())","()()"],"caption":"n = 2, starting from the empty string. \"((\" can only close (no opens left) and \"()\" can only open (nothing to close). Both leaves are answers."}
```

```python
def generate_parenthesis(n):
    # Add "(" while some are left; add ")" only to close open one
    # Both rules keep every prefix valid, so no branch dies and every leaf is answer
    res, path = [], []

    def backtrack(opened, closed):
        if len(path) == 2 * n:
            res.append("".join(path))
            return
        # opens still left to place
        if opened < n:
            path.append("(")
            backtrack(opened + 1, closed)
            path.pop()
        # some "(" still unmatched, so ")" keeps prefix valid
        if closed < opened:
            path.append(")")
            backtrack(opened, closed + 1)
            path.pop()

    backtrack(0, 0)
    return res
```

```java
List<String> generateParenthesis(int n) {
    // Add "(" while some are left; add ")" only to close open one
    // Both rules keep every prefix valid, so no branch dies and every leaf is answer
    List<String> res = new ArrayList<>();
    backtrack(n, 0, 0, new StringBuilder(), res);
    return res;
}

void backtrack(int n, int opened, int closed, StringBuilder path, List<String> res) {
    if (path.length() == 2 * n) {
        res.add(path.toString());
        return;
    }
    // opens still left to place
    if (opened < n) {
        path.append('(');
        backtrack(n, opened + 1, closed, path, res);
        path.deleteCharAt(path.length() - 1);
    }
    // some "(" still unmatched, so ")" keeps prefix valid
    if (closed < opened) {
        path.append(')');
        backtrack(n, opened, closed + 1, path, res);
        path.deleteCharAt(path.length() - 1);
    }
}
```

```cpp
void backtrack(int n, int opened, int closed, string& path, vector<string>& res) {
    if ((int)path.size() == 2 * n) {
        res.push_back(path);
        return;
    }
    // opens still left to place
    if (opened < n) {
        path.push_back('(');
        backtrack(n, opened + 1, closed, path, res);
        path.pop_back();
    }
    // some "(" still unmatched, so ")" keeps prefix valid
    if (closed < opened) {
        path.push_back(')');
        backtrack(n, opened, closed + 1, path, res);
        path.pop_back();
    }
}

vector<string> generateParenthesis(int n) {
    // Add "(" while some are left; add ")" only to close open one
    // Both rules keep every prefix valid, so no branch dies and every leaf is answer
    vector<string> res;
    string path;
    backtrack(n, 0, 0, path, res);
    return res;
}
```

The number of answers is the **Catalan number** `C(n) = C(2n, n) / (n + 1)`: 1, 2, 5, 14, 42, 132, 429, 1430 for `n` = 1 to 8. Splitting on the `)` that matches the first `(` gives `( A ) B`, where `A` and `B` are smaller balanced strings, so `C(n + 1) = Σ C(i) · C(n - i)` with `C(0) = 1`. The same recurrence counts many other "balanced" structures, which is worth recognising: binary trees and BSTs with `n` nodes (*unique binary search trees*), triangulations of a polygon with `n + 2` sides, and mountain ranges of `n` up-steps and `n` down-steps. Catalan numbers grow like 4ⁿ / (n^1.5 · √π), and each answer costs O(n) to copy, so generating them takes **O(4ⁿ / √n)** time and O(n) extra space.

## N-Queens

Place `n` queens on an `n × n` board so no two attack each other. Since each row holds exactly one queen, the decision at depth `r` is "which column in row `r`?". A square `(r, c)` is attacked if its column is taken, or its diagonal (`r - c` is constant along it) or anti-diagonal (`r + c` is constant) is taken. Keeping those three in sets makes each check O(1).

```diagram
{"type":"grid","cells":[["","Q","",""],["","","","Q"],["Q","","",""],["","","Q",""]],"highlight":[[0,1],[1,3],[2,0],[3,2]],"rowLabels":[0,1,2,3],"colLabels":[0,1,2,3],"caption":"The first 4-Queens solution the code finds: columns 1, 3, 0, 2. Each row, column and diagonal has at most one queen."}
```

```python
def total_n_queens(n):
    cols, diag, anti = set(), set(), set()

    def place(r):
        if r == n:                       # a queen in every row: one solution
            return 1
        count = 0
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:
                continue                 # attacked: prune this branch
            cols.add(c); diag.add(r - c); anti.add(r + c)
            count += place(r + 1)
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)
        return count

    return place(0)
```

```java
int totalNQueens(int n) {
    return place(0, n, new boolean[n], new boolean[2 * n - 1], new boolean[2 * n - 1]);
}

int place(int r, int n, boolean[] cols, boolean[] diag, boolean[] anti) {
    if (r == n) return 1;                    // a queen in every row: one solution
    int count = 0;
    for (int c = 0; c < n; c++) {
        int d = r - c + n - 1, a = r + c;    // shift r - c so it's never negative
        if (cols[c] || diag[d] || anti[a]) continue;   // attacked: prune
        cols[c] = diag[d] = anti[a] = true;
        count += place(r + 1, n, cols, diag, anti);
        cols[c] = diag[d] = anti[a] = false;
    }
    return count;
}
```

```cpp
int place(int r, int n, vector<bool>& cols, vector<bool>& diag, vector<bool>& anti) {
    if (r == n) return 1;                    // a queen in every row: one solution
    int count = 0;
    for (int c = 0; c < n; c++) {
        int d = r - c + n - 1, a = r + c;    // shift r - c so it's never negative
        if (cols[c] || diag[d] || anti[a]) continue;   // attacked: prune
        cols[c] = diag[d] = anti[a] = true;
        count += place(r + 1, n, cols, diag, anti);
        cols[c] = diag[d] = anti[a] = false;
    }
    return count;
}

int totalNQueens(int n) {
    vector<bool> cols(n), diag(2 * n - 1), anti(2 * n - 1);
    return place(0, n, cols, diag, anti);
}
```

There are 2 solutions for `n = 4` and 92 for `n = 8`. To return the boards instead of a count, keep a `queens[r] = c` array and build the strings when `r == n`.

### Bitmask N-Queens

The set version is fine in an interview. For counting solutions on larger boards (n up to about 15), a **bitmask** version is several times faster, and it's a common follow-up. Each row's attacked squares become the bits of an integer, bit `c` for column `c` (see [bit manipulation](/learn/bit-manipulation)):

- `cols`: columns that already hold a queen.
- `diag`: squares in the current row attacked along a `r - c` diagonal. Going down one row moves each attack one column right, so it becomes `diag << 1`.
- `anti`: squares attacked along a `r + c` anti-diagonal. These move one column left per row: `anti >> 1`.

For each row:

1. `free = full & ~(cols | diag | anti)` is the set of safe squares, where `full = (1 << n) - 1` has one bit per column.
2. `bit = free & -free` isolates the lowest safe square. In two's complement, `-x` flips every bit above the lowest 1, so the AND keeps only that bit.
3. Remove `bit` from `free` and recurse with `cols | bit`, `((diag | bit) << 1) & full` and `(anti | bit) >> 1`.
4. When `cols == full`, all `n` queens are placed.

```diagram
{"type":"array","rows":[{"label":"cols","values":[0,1,0,0]},{"label":"diag","values":[0,0,1,0]},{"label":"anti","values":[1,0,0,0]},{"label":"free","values":[0,0,0,1],"highlight":[3]}],"caption":"Row 1 of 4-Queens after a queen at row 0, column 1 (cells are bits, column 0 on the left). Its column, down-right square and down-left square are blocked; only column 3 is free."}
```

```python
def total_n_queens_bits(n):
    full = (1 << n) - 1                      # n one-bits: every column

    def place(cols, diag, anti):             # bit c set = square c in this row is attacked
        if cols == full:                     # every column used: n queens placed
            return 1
        count = 0
        free = full & ~(cols | diag | anti)
        while free:
            bit = free & -free               # lowest free square
            free ^= bit
            count += place(cols | bit,
                           ((diag | bit) << 1) & full,   # r - c diagonals move one column right
                           (anti | bit) >> 1)            # r + c diagonals move one column left
        return count

    return place(0, 0, 0)
```

```java
int totalNQueensBits(int n) {
    return placeBits((1 << n) - 1, 0, 0, 0);
}

int placeBits(int full, int cols, int diag, int anti) {   // bit c set = column c attacked
    if (cols == full) return 1;              // every column used: n queens placed
    int count = 0;
    int free = full & ~(cols | diag | anti);
    while (free != 0) {
        int bit = free & -free;              // lowest free square
        free ^= bit;
        count += placeBits(full, cols | bit,
                           ((diag | bit) << 1) & full,   // r - c diagonals move right
                           (anti | bit) >> 1);           // r + c diagonals move left
    }
    return count;
}
```

```cpp
int placeBits(unsigned full, unsigned cols, unsigned diag, unsigned anti) {
    if (cols == full) return 1;              // every column used: n queens placed
    int count = 0;
    unsigned free = full & ~(cols | diag | anti);   // bit c set = column c is safe
    while (free) {
        unsigned bit = free & -free;         // lowest free square
        free ^= bit;
        count += placeBits(full, cols | bit,
                           ((diag | bit) << 1) & full,   // r - c diagonals move right
                           (anti | bit) >> 1);           // r + c diagonals move left
    }
    return count;
}

int totalNQueensBits(int n) {
    return placeBits((1u << n) - 1, 0, 0, 0);
}
```

The search tree is the same as before, so the bound is still O(n!) time with O(n) stack, but each node costs a handful of machine instructions instead of set lookups: n = 12 (14,200 solutions) takes milliseconds. Pitfalls:

- **Mask with `full`.** `~` flips every bit, including those above column `n - 1` (in Python `~x` is negative), so `free` needs the `full &`. The left shift also pushes attacks off the board, which the mask drops.
- **Keep the shift directions straight.** Whichever way you draw the board, the two diagonal masks must shift in opposite directions, and the same way every row.
- `1 << n` overflows a 32-bit int at n = 32; any board that big is far beyond backtracking anyway.

## Sudoku solver

*Sudoku solver*: fill a 9 × 9 grid so every row, column and 3 × 3 box holds the digits 1 to 9 exactly once. It's backtracking with a constraint check per digit, like N-Queens, and two improvements turn it from slow to instant.

**Digit bitmasks.** Keep one 9-bit mask per row, per column and per box, with bit `d` set when digit `d` is already used there. The digits allowed in cell `(r, c)` are the bits used by none of the three masks: `~(rows[r] | cols[c] | boxes[b]) & 0x3FE`, where `b = (r / 3) · 3 + c / 3` numbers the boxes 0 to 8 and `0x3FE` keeps bits 1 to 9. Placing or removing a digit is three ORs or XORs, and counting the options is one popcount (see [bit manipulation](/learn/bit-manipulation)).

**Most constrained cell first.** Filling cells in reading order wastes time: an early cell with nine options branches nine ways before the search discovers that some later cell has none. Instead, at every step pick the empty cell with the **fewest options**. This rule is called **minimum remaining values** (MRV). A cell with one option is forced, so no branching happens; a cell with zero options means the current board is a dead end, and the search backs up at once instead of filling more cells first.

1. Scan the empty cells and pick the one with the fewest options.
2. If it has none, return false (undo happens in the caller).
3. For each option: set the bit in its row, column and box masks, write the digit, recurse. If the recursion solves the board, stop; otherwise clear the bits and try the next.

```diagram
{"type":"grid","cells":[["5","3","","","7","","","",""],["6","","","1","9","5","","",""],["","9","8","","","","","6",""]],"highlight":[[0,2]],"rowLabels":[0,1,2],"colLabels":[0,1,2,3,4,5,6,7,8],"caption":"Top band of a puzzle. Cell (0, 2): row 0 uses 3, 5, 7 and box 0 uses 3, 5, 6, 8, 9, and column 2 holds only 8, so 1, 2 and 4 remain."}
```

```python
def solve_sudoku(board):
    # Bit d of mask set = digit d used (one mask per row, column, box)
    # Fill empty cell with fewest legal digits first; none left = dead end, so undo
    rows, cols, boxes = [0] * 9, [0] * 9, [0] * 9
    empty = []
    for r in range(9):
        for c in range(9):
            if board[r][c] == ".":
                empty.append((r, c))
            else:
                bit = 1 << int(board[r][c])
                rows[r] |= bit
                cols[c] |= bit
                boxes[r // 3 * 3 + c // 3] |= bit

    def options(r, c):
        # bits 1-9 (0x3FE) used by none of cell's row, column, box
        return ~(rows[r] | cols[c] | boxes[r // 3 * 3 + c // 3]) & 0x3FE

    def solve():
        if not empty:
            return True
        # most constrained cell (fewest options)
        pick = min(range(len(empty)), key=lambda t: options(*empty[t]).bit_count())
        # swap to end, so pop now and append on undo
        empty[pick], empty[-1] = empty[-1], empty[pick]
        r, c = empty.pop()
        b = r // 3 * 3 + c // 3
        opts = options(r, c)
        while opts:
            # lowest remaining digit
            bit = opts & -opts
            opts ^= bit
            rows[r] |= bit
            cols[c] |= bit
            boxes[b] |= bit
            board[r][c] = str(bit.bit_length() - 1)
            if solve():
                return True
            rows[r] ^= bit
            cols[c] ^= bit
            boxes[b] ^= bit
        # no digit works here, so give cell back and let caller try its next digit
        board[r][c] = "."
        empty.append((r, c))
        return False

    solve()
```

```java
class Solution {
    // Bit d of mask set = digit d used (one mask per row, column, box)
    // Fill empty cell with fewest legal digits first; none left = dead end, so undo
    int[] rows = new int[9], cols = new int[9], boxes = new int[9];
    // empty cells as r * 9 + c; first count of them still unfilled
    int[] empty = new int[81];
    int count = 0;
    char[][] board;

    public void solveSudoku(char[][] board) {
        this.board = board;
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') empty[count++] = r * 9 + c;
                else {
                    int bit = 1 << (board[r][c] - '0');
                    rows[r] |= bit;
                    cols[c] |= bit;
                    boxes[r / 3 * 3 + c / 3] |= bit;
                }
            }
        solve();
    }

    int options(int r, int c) {
        // bits 1-9 (0x3FE) used by none of cell's row, column, box
        return ~(rows[r] | cols[c] | boxes[r / 3 * 3 + c / 3]) & 0x3FE;
    }

    boolean solve() {
        if (count == 0) return true;
        // most constrained cell (fewest options)
        int pick = 0;
        for (int t = 1; t < count; t++)
            if (Integer.bitCount(options(empty[t] / 9, empty[t] % 9))
                    < Integer.bitCount(options(empty[pick] / 9, empty[pick] % 9))) pick = t;
        // swap to end, so shrinking count removes it and growing it undoes
        int cell = empty[pick];
        empty[pick] = empty[count - 1];
        empty[--count] = cell;
        int r = cell / 9, c = cell % 9, b = r / 3 * 3 + c / 3;
        for (int opts = options(r, c); opts != 0; ) {
            // lowest remaining digit
            int bit = opts & -opts;
            opts ^= bit;
            rows[r] |= bit;
            cols[c] |= bit;
            boxes[b] |= bit;
            board[r][c] = (char) ('0' + Integer.numberOfTrailingZeros(bit));
            if (solve()) return true;
            rows[r] ^= bit;
            cols[c] ^= bit;
            boxes[b] ^= bit;
        }
        // no digit works here, so give cell back and let caller try its next digit
        board[r][c] = '.';
        count++;
        return false;
    }
}
```

```cpp
class Solution {
    // Bit d of mask set = digit d used (one mask per row, column, box)
    // Fill empty cell with fewest legal digits first; none left = dead end, so undo
    int rows[9] = {}, cols[9] = {}, boxes[9] = {};
    // empty cells as {r, c}
    vector<pair<int, int>> empty;

    int options(int r, int c) {
        // bits 1-9 (0x3FE) used by none of cell's row, column, box
        return ~(rows[r] | cols[c] | boxes[r / 3 * 3 + c / 3]) & 0x3FE;
    }

    bool solve(vector<vector<char>>& board) {
        if (empty.empty()) return true;
        // most constrained cell (fewest options)
        int pick = 0;
        for (int t = 1; t < (int)empty.size(); t++)
            if (popcount((unsigned)options(empty[t].first, empty[t].second))
                    < popcount((unsigned)options(empty[pick].first, empty[pick].second))) pick = t;
        // swap to end, so pop now and push back on undo
        swap(empty[pick], empty.back());
        auto [r, c] = empty.back();
        empty.pop_back();
        int b = r / 3 * 3 + c / 3;
        for (int opts = options(r, c); opts != 0; ) {
            // lowest remaining digit
            int bit = opts & -opts;
            opts ^= bit;
            rows[r] |= bit;
            cols[c] |= bit;
            boxes[b] |= bit;
            board[r][c] = '0' + countr_zero((unsigned)bit);
            if (solve(board)) return true;
            rows[r] ^= bit;
            cols[c] ^= bit;
            boxes[b] ^= bit;
        }
        // no digit works here, so give cell back and let caller try its next digit
        board[r][c] = '.';
        empty.push_back({r, c});
        return false;
    }

public:
    void solveSudoku(vector<vector<char>>& board) {
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') empty.push_back({r, c});
                else {
                    int bit = 1 << (board[r][c] - '0');
                    rows[r] |= bit;
                    cols[c] |= bit;
                    boxes[r / 3 * 3 + c / 3] |= bit;
                }
            }
        solve(board);
    }
};
```

The worst case is still exponential (up to 9 choices for each of 81 cells), but MRV keeps real search trees small: most steps are forced. The example puzzle above takes 52 calls for its 51 empty cells; puzzles built to defeat backtracking take from about 10,000 to several hundred thousand, still well under a second in Java or C++. Each call costs O(81) to find the best cell. Pitfalls:

- **Forgetting to undo** all three masks *and* the board cell. The bits must be cleared on the way back, and the cell set back to empty when every digit fails.
- **Stopping only the current call.** Once a solution is found, return true all the way up; otherwise the next loop iteration overwrites the solved cell.
- **The box index.** `(r / 3) · 3 + c / 3` with integer division, not `r / 3 + c / 3`, which gives the same box to different cells.
- **Bit 0.** Digits are bits 1 to 9; masking with `0x1FF` instead of `0x3FE` offers a digit 0.

The same two ideas, bitmask constraints and choosing the most constrained variable, speed up any constraint search: N-Queens, graph colouring, word puzzles and exact cover problems.

## Grid walks: unique paths III

*Unique paths III*: a grid has a start (1), an end (2), empty cells (0) and obstacles (−1). Count the walks from start to end that move up, down, left or right and step on every non-obstacle cell exactly once. The grid has at most 20 cells, which is the hint: this is backtracking, not DP.

1. Count the walkable cells (start and end included); the walk must cover all of them.
2. DFS from the start. On entering a cell, turn it into an obstacle (choose), try the four neighbours (explore), then restore it (un-choose).
3. The end is a stop. Count the walk only if the end is the last cell left to cover.

```python
def unique_paths_iii(grid):
    # DFS from start, turning each path cell into wall until DFS backs out
    # Count reaching end only once every walkable cell is on path
    rows, cols = len(grid), len(grid[0])
    # walkable cells (start and end included) path must cover
    todo = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != -1:
                todo += 1
            if grid[r][c] == 1:
                start = (r, c)

    def walk(r, c, left):
        # left = cells still to cover, this one included
        if grid[r][c] == 2:
            return 1 if left == 1 else 0
        saved = grid[r][c]
        # choose (wall, ensuring path never revisits cell)
        grid[r][c] = -1
        count = 0
        # four neighbours of cell
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != -1:
                count += walk(nr, nc, left - 1)
        # un-choose
        grid[r][c] = saved
        return count

    return walk(start[0], start[1], todo)
```

```java
int uniquePathsIII(int[][] grid) {
    // DFS from start, turning each path cell into wall until DFS backs out
    // Count reaching end only once every walkable cell is on path
    // walkable cells (start and end included) path must cover
    int todo = 0, sr = 0, sc = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] != -1) todo++;
            if (grid[r][c] == 1) { sr = r; sc = c; }
        }
    }
    return walk(grid, sr, sc, todo);
}

// left = cells still to cover, this one included
int walk(int[][] grid, int r, int c, int left) {
    if (grid[r][c] == 2) return left == 1 ? 1 : 0;
    int saved = grid[r][c];
    // choose (wall, ensuring path never revisits cell)
    grid[r][c] = -1;
    int count = 0;
    // four neighbours of cell
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    for (int[] d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] != -1)
            count += walk(grid, nr, nc, left - 1);
    }
    // un-choose
    grid[r][c] = saved;
    return count;
}
```

```cpp
// left = cells still to cover, this one included
int walk(vector<vector<int>>& grid, int r, int c, int left) {
    if (grid[r][c] == 2) return left == 1 ? 1 : 0;
    int saved = grid[r][c];
    // choose (wall, ensuring path never revisits cell)
    grid[r][c] = -1;
    int count = 0;
    // four neighbours of cell
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    for (auto& d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < (int)grid.size() && nc >= 0 && nc < (int)grid[0].size() && grid[nr][nc] != -1)
            count += walk(grid, nr, nc, left - 1);
    }
    // un-choose
    grid[r][c] = saved;
    return count;
}

int uniquePathsIII(vector<vector<int>>& grid) {
    // DFS from start, turning each path cell into wall until DFS backs out
    // Count reaching end only once every walkable cell is on path
    // walkable cells (start and end included) path must cover
    int todo = 0, sr = 0, sc = 0;
    for (int r = 0; r < (int)grid.size(); r++) {
        for (int c = 0; c < (int)grid[0].size(); c++) {
            if (grid[r][c] != -1) todo++;
            if (grid[r][c] == 1) { sr = r; sc = c; }
        }
    }
    return walk(grid, sr, sc, todo);
}
```

`[[1,0,0,0],[0,0,0,0],[0,0,2,-1]]` has 2 such walks, and the same grid with the obstacle replaced by the end has 4.

**Why O(3^P).** Let `P` be the number of walkable cells. A walk is at most `P` steps long. The first step has up to 4 choices and every later step at most 3, because the cell you came from is marked. So the tree has at most 4 · 3^(P−1) leaves: **O(3^P) time** with O(P) recursion depth. It's a loose bound (walls, edges and visited cells cut most branches, so 20-cell grids finish instantly), but it's the one interviewers expect, and the same argument bounds any grid search that never revisits a cell: *word search* is O(m · n · 3^L) for a word of length `L`.

Pitfalls:

- **Counting every arrival at the end.** A walk that reaches the end early has skipped cells; check the count left.
- **Walking through the end.** Return as soon as you reach it, whether or not it counts.
- **Forgetting to restore** the cell after exploring, which blocks it for every sibling branch.
- **Memoizing on the cell alone.** The future depends on which cells are used, so the honest state is `(cell, visited mask)`: a valid DP with 20 · 2²⁰ states, but rarely worth it here.

## Pruning

**Pruning** means cutting off a branch as soon as you can prove it won't produce a valid answer, instead of discovering that at the leaf. It's the difference between a backtracking solution that passes and one that times out.

- **Check constraints when you choose**, not at the end. N-Queens rejects an attacked square immediately rather than placing all `n` queens and then validating the board.
- **Sort the input so you can `break`.** In combination sum with sorted candidates, once a candidate exceeds the remaining target, every later one does too.
- **Count what's left.** If the remaining elements can't fill the path (combinations) or the remaining budget can't reach the target, stop.
- **Skip duplicates** at the same level, as in subsets with duplicates.

Pruning rarely changes the worst-case bound, but it often cuts the real running time by orders of magnitude.

## Complexity of backtracking

Estimate the number of nodes in the decision tree, multiplied by the work per node (usually the O(n) copy at each recorded solution):

| Problem | Results | Time | Extra space |
|---|---|---|---|
| Subsets | 2ⁿ | O(n · 2ⁿ) | O(n) path and stack |
| Permutations | n! | O(n · n!) | O(n) |
| Combinations, k of n | C(n, k) | O(k · C(n, k)) | O(k) |
| N-Queens | 92 for n = 8 | O(n!) upper bound | O(n) |
| Palindrome partitions | up to 2ⁿ⁻¹ | O(n · 2ⁿ) | O(n) |
| Generate parentheses | Catalan C(n) | O(4ⁿ / √n) | O(n) |
| Grid walk, P free cells, no revisits | varies | O(3^P) | O(P) |

The output itself is excluded from "extra space". These growth rates are why backtracking problems come with tiny limits: `n ≤ 20` for subsets and `n ≤ 10` for permutations (see the input-size table in [Big-O & complexity](/learn/big-o)).

## Recursion limits

Deep recursion runs out of stack long before it runs out of memory:

| Language | Limit | What happens |
|---|---|---|
| Python | 1,000 frames by default (`sys.getrecursionlimit()`) | `RecursionError` |
| Java | the thread's stack size (often 1 MB): on the order of 10,000 frames, depending on frame size | `StackOverflowError` |
| C++ | usually 8 MB on Linux, 1 MB on Windows | a crash (segmentation fault), no exception |

Recursing once per element over 10⁵ elements (a linked list, a degenerate tree, a long DFS path in a grid) will fail in Python and can fail in Java. Options:

- Raise the limit: `sys.setrecursionlimit(10**6)` in Python (the interpreter may still crash if the C stack runs out), or run the work in a `Thread` created with a larger stack size in Java.
- Convert to iteration with an explicit stack. Any recursion can be rewritten this way; DFS and tree traversals are the usual cases.
- None of the three languages guarantees tail-call optimization, so writing a call in tail position doesn't save you.

## Pitfalls

- **Recording a reference instead of a copy.** `res.append(path)` in Python or `res.add(path)` in Java stores the same list every time, and since it's emptied by backtracking, the result is a list of empty lists. Copy: `path[:]`, `new ArrayList<>(path)`. (C++ `push_back(path)` copies already.)
- **Forgetting to un-choose.** Every change made before the recursive call (path, `used`, sets, counters) must be undone after it.
- **A base case that's never reached.** Make sure every call moves toward it: `n - 1`, `i + 1`, a smaller range. Negative inputs are a common way to skip past `n == 0`.
- **Repeating work.** If the recursion tree has repeated subproblems, memoize; if a call is made twice with the same arguments in one line, store the result.
- **Slicing in Python.** `solve(nums[1:])` copies the list on every call; pass an index instead.
