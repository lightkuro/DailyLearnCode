---
title: Dynamic programming
summary: Solving a problem by reusing answers to smaller overlapping subproblems. Memoization vs tables, defining states, the classic 1D, grid, string and knapsack problems, LIS, Kadane, and saving space.
related: recursion-backtracking, greedy-intervals, binary-search, topological-sort, shortest-paths
terms:
  - dynamic programming
  - DP
  - memoization #top-down-memoization
  - tabulation #bottom-up-tabulation
  - overlapping subproblems #what-dynamic-programming-is
  - optimal substructure #what-dynamic-programming-is
  - knapsack #knapsack
  - 0/1 knapsack #0-1-knapsack
  - coin change #unbounded-knapsack-coin-change
  - longest common subsequence #longest-common-subsequence
  - edit distance #edit-distance
  - longest increasing subsequence #longest-increasing-subsequence
  - Kadane's algorithm #kadane-s-algorithm
  - Kadane #kadane-s-algorithm
  - rolling array #space-optimisation-with-rolling-arrays
  - house robber #one-dimensional-dp-house-robber
  - house robber II #houses-in-a-circle
  - distinct subsequences #distinct-subsequences
  - wrapping arithmetic #distinct-subsequences
  - weighted interval scheduling #weighted-interval-scheduling
  - interval DP #interval-dp-burst-balloons
  - burst balloons #interval-dp-burst-balloons
  - palindrome partitioning #palindrome-partitioning-minimum-cuts
  - palindrome partitioning II #palindrome-partitioning-minimum-cuts
  - minimum difficulty of a job schedule #splitting-an-array-into-k-groups
  - job schedule difficulty #splitting-an-array-into-k-groups
  - wildcard matching #wildcard-matching
  - perfect squares #perfect-squares
  - frog jump #remembering-the-last-move-frog-jump
  - game DP #game-dp-winning-and-losing-positions
  - winning and losing positions #game-dp-winning-and-losing-positions
  - divisor game #game-dp-winning-and-losing-positions
  - longest palindromic subsequence #longest-palindromic-subsequence
  - minimum insertions to make a palindrome #longest-palindromic-subsequence
  - row-by-row bitmask DP #row-by-row-bitmask-dp
  - maximum students taking exam #row-by-row-bitmask-dp
---

## What dynamic programming is

**Dynamic programming (DP)** solves a problem by breaking it into smaller versions of itself, solving each smaller version *once*, storing the answer, and building bigger answers out of stored ones. The name is historical and tells you nothing; "solve subproblems once and reuse them" is the whole idea.

Fibonacci shows why it matters. The definition `fib(n) = fib(n - 1) + fib(n - 2)` translates directly into a recursive function, and that function is hopelessly slow, because it solves the same subproblems again and again:

```diagram
{"type":"tree","values":[5,4,3,3,2,2,1,2,1,1,0,1,0,null,null,1,0],"highlight":[3],"caption":"The calls made by naive fib(5); each node is the n in fib(n). fib(3) runs twice and fib(2) three times: 15 calls for 6 distinct subproblems."}
```

The call tree roughly doubles with each level, so the naive version takes exponential time: fib(30) makes over 2.6 million calls. But there are only `n + 1` different questions (`fib(0)` to `fib(n)`). Store each answer the first time you compute it and the whole thing takes O(n).

DP applies when a problem has two properties:

- **Overlapping subproblems**: the same smaller question comes up many times. (Merge sort splits the array into halves that never overlap, so caching would buy nothing. That's plain [divide and conquer](/learn/recursion-backtracking), not DP.)
- **Optimal substructure**: the best answer to the big problem is built from best answers to smaller ones. The cheapest path to `t` through `v` uses the cheapest path to `v`.

DP is careful brute force. It still considers every choice, like [backtracking](/learn/recursion-backtracking), but never solves the same subproblem twice. If a single locally best choice is provably always right, you don't need DP at all: that's a [greedy algorithm](/learn/greedy-intervals), which is faster when it works.

## Top-down: memoization

The easiest way into DP is to write the plain recursive solution and then add a cache. **Memoization** means: before computing `f(x)`, check whether you've already stored `f(x)`; after computing it, store it. The recursion still explores the problem top-down, from the big question to the small ones, but each subproblem is solved once.

*Climbing stairs*: you can climb 1 or 2 steps at a time; how many ways are there to reach step `n`? Your last move was either a 1-step from `n - 1` or a 2-step from `n - 2`, so `ways(n) = ways(n - 1) + ways(n - 2)`, with one way to stand at step 0 or step 1.

```python
from functools import cache

def climb_stairs(n):
    @cache                                   # stores every ways(i) after the first call
    def ways(i):
        if i <= 1:
            return 1                         # one way to be at step 0 or step 1
        return ways(i - 1) + ways(i - 2)     # the last move was 1 step or 2 steps
    return ways(n)
```

```java
int climbStairs(int n) {
    return ways(n, new HashMap<>());
}

int ways(int i, Map<Integer, Integer> memo) {
    if (i <= 1) return 1;                    // one way to be at step 0 or step 1
    Integer cached = memo.get(i);
    if (cached != null) return cached;
    int result = ways(i - 1, memo) + ways(i - 2, memo);   // the last move was 1 or 2 steps
    memo.put(i, result);
    return result;
}
```

```cpp
int ways(int i, unordered_map<int, int>& memo) {
    if (i <= 1) return 1;                    // one way to be at step 0 or step 1
    auto it = memo.find(i);
    if (it != memo.end()) return it->second;
    int result = ways(i - 1, memo) + ways(i - 2, memo);   // the last move was 1 or 2 steps
    memo[i] = result;
    return result;
}

int climbStairs(int n) {
    unordered_map<int, int> memo;
    return ways(n, memo);
}
```

The cost of a memoized solution is easy to estimate: **number of distinct states × work per state**. Here that's `n` states × O(1) = O(n) time, plus O(n) for the cache and the recursion stack.

Python's `functools.cache` (or `lru_cache(maxsize=None)` before Python 3.9) does the bookkeeping for you, but the arguments must be hashable: pass indices and tuples, not lists. When the state is a pair of small integers, a 2D array of "unknown" markers is faster than a hash map.

## Bottom-up: tabulation

**Tabulation** turns the recursion inside out. Instead of asking for `ways(n)` and letting recursion find the small cases, fill a table from the smallest cases upward, in an order where everything a cell needs is already filled in.

```python
def climb_stairs(n):
    dp = [1] * (n + 1)                       # dp[0] = dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
```

```java
int climbStairs(int n) {
    int[] dp = new int[n + 1];
    Arrays.fill(dp, 1);                      // dp[0] = dp[1] = 1
    for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}
```

```cpp
int climbStairs(int n) {
    vector<int> dp(n + 1, 1);                // dp[0] = dp[1] = 1
    for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}
```

Both styles compute the same values with the same complexity. They differ in practice:

| | Top-down (memoization) | Bottom-up (tabulation) |
|---|---|---|
| How you write it | recursion + cache; close to the problem statement | loops; you must work out the fill order |
| States computed | only those actually reached | all of them, needed or not |
| Overhead | function calls, hashing; recursion depth limits | tight loops, cache-friendly arrays |
| Saving memory | hard | easy: keep only the rows you need |

A good interview strategy: think top-down (it's easier to get right), then convert to bottom-up if the interviewer asks or if recursion depth is a risk. Python's default recursion limit is about 1,000 frames, so a memoized function on `n = 10⁵` will crash unless you raise the limit or switch to a table.

## Defining state and transitions

Every DP solution, however clever it looks, answers the same four questions. Write the answers down before coding.

1. **State**: what does `dp[i]` (or `dp[i][j]`) mean, in one plain sentence? "The number of ways to reach step `i`." "The length of the longest common subsequence of the first `i` characters of `a` and the first `j` of `b`." If you can't say it in words, the recurrence will be wrong.
2. **Transition**: how is a state computed from smaller ones? The trick is to think about the **last decision**: the last step taken, whether the last item was used, which character was dealt with last.
3. **Base cases**: the smallest states, whose answers you know directly (empty prefix, zero capacity, the first row of a grid).
4. **Order and answer**: which states must be filled first, and which cell holds the final answer (`dp[n]`, `dp[m][n]`, or the max over all cells).

Most interview DPs use one of a handful of state shapes:

| State | Meaning | Examples |
|---|---|---|
| `dp[i]` | answer for the first `i` elements (a prefix) | climbing stairs, house robber, decode ways, word break |
| `dp[i]` ending at `i` | best thing that *ends exactly* at index `i` | LIS, maximum subarray |
| `dp[r][c]` | answer for reaching cell `(r, c)` | unique paths, minimum path sum |
| `dp[i][j]` | two prefixes, one from each string | LCS, edit distance, interleaving strings |
| `dp[i][c]` | first `i` items with capacity `c` left | 0/1 knapsack, partition equal subset sum |
| `dp[l][r]` | the subarray or substring from `l` to `r` | longest palindromic subsequence, burst balloons |
| `dp[k][i]` | first `i` items split into `k` groups | job schedule difficulty, split array largest sum |
| `dp[i][s]` | position plus a small extra state | stock trading with cooldown (holding or not), bitmask over visited items |

## One-dimensional DP: house robber

*House robber*: houses in a row hold `nums[i]` money, and you can't rob two adjacent houses. What's the most you can take?

- **State**: `dp[i]` = the most money from houses `0..i`.
- **Transition**: the last decision is about house `i`. Skip it, and the best is `dp[i - 1]`. Rob it, and you can't have robbed house `i - 1`, so the best is `dp[i - 2] + nums[i]`. Take the larger.
- **Base cases**: `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`.

```diagram
{"type":"array","rows":[{"label":"nums","values":[2,7,9,3,1],"highlight":[0,2,4]},{"label":"dp","values":[2,7,11,11,12],"highlight":[4]}],"caption":"dp[2] = max(7, 2 + 9) = 11; dp[4] = max(11, 11 + 1) = 12. The best plan robs houses 0, 2 and 4 for 2 + 9 + 1 = 12."}
```

```python
def rob(nums):
    n = len(nums)
    if n == 1:
        return nums[0]
    dp = [0] * n                             # dp[i] = most money from houses 0..i
    dp[0], dp[1] = nums[0], max(nums[0], nums[1])
    for i in range(2, n):
        dp[i] = max(dp[i - 1],               # skip house i
                    dp[i - 2] + nums[i])     # rob house i, so house i - 1 was skipped
    return dp[-1]
```

```java
int rob(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    int[] dp = new int[n];                   // dp[i] = most money from houses 0..i
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    for (int i = 2; i < n; i++) {
        dp[i] = Math.max(dp[i - 1],          // skip house i
                         dp[i - 2] + nums[i]); // rob house i, so house i - 1 was skipped
    }
    return dp[n - 1];
}
```

```cpp
int rob(vector<int>& nums) {
    int n = nums.size();
    if (n == 1) return nums[0];
    vector<int> dp(n);                       // dp[i] = most money from houses 0..i
    dp[0] = nums[0];
    dp[1] = max(nums[0], nums[1]);
    for (int i = 2; i < n; i++) {
        dp[i] = max(dp[i - 1],               // skip house i
                    dp[i - 2] + nums[i]);    // rob house i, so house i - 1 was skipped
    }
    return dp[n - 1];
}
```

O(n) time and O(n) space, which drops to O(1) because each cell only looks two back (see the section on space optimisation below). Close relatives: *min cost climbing stairs*, *delete and earn* (bucket the values, then it's house robber), *house robber II* (houses in a circle: run the line version twice, once without the first house and once without the last), and *decode ways* (`dp[i]` adds `dp[i - 1]` if the last digit is a valid letter and `dp[i - 2]` if the last two are).

### Houses in a circle

*House robber II* puts the houses in a circle, so the first and last houses are neighbours. Any valid plan leaves at least one of them unrobbed, so split it into two straight-line problems and take the better: houses `0..n-2` (never the last) and houses `1..n-1` (never the first). The line version only ever looks two houses back, so two variables replace the table:

```python
def rob_circle(nums):
    def rob_line(lo, hi):                # best for houses lo..hi in a row
        prev2 = prev1 = 0                # best up to two houses back, one house back
        for i in range(lo, hi + 1):
            prev2, prev1 = prev1, max(prev1, prev2 + nums[i])
        return prev1

    n = len(nums)
    if n == 1:
        return nums[0]
    return max(rob_line(0, n - 2),       # never rob the last house
               rob_line(1, n - 1))       # never rob the first house
```

```java
int robCircle(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    return Math.max(robLine(nums, 0, n - 2),     // never rob the last house
                    robLine(nums, 1, n - 1));    // never rob the first house
}

int robLine(int[] nums, int lo, int hi) {        // best for houses lo..hi in a row
    int prev2 = 0, prev1 = 0;                    // best up to two houses back, one house back
    for (int i = lo; i <= hi; i++) {
        int cur = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}
```

```cpp
int robLine(const vector<int>& nums, int lo, int hi) {   // best for houses lo..hi in a row
    int prev2 = 0, prev1 = 0;                    // best up to two houses back, one house back
    for (int i = lo; i <= hi; i++) {
        int cur = max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}

int robCircle(const vector<int>& nums) {
    int n = nums.size();
    if (n == 1) return nums[0];
    return max(robLine(nums, 0, n - 2),          // never rob the last house
               robLine(nums, 1, n - 1));         // never rob the first house
}
```

**O(n) time, O(1) space.** The pitfall is a single house: both ranges are empty and the formula returns 0, so return `nums[0]` first.

## Grids: unique paths

*Unique paths*: a robot starts in the top-left corner of an `m × n` grid and moves only right or down. How many paths reach the bottom-right corner?

The last move into cell `(r, c)` came from above or from the left, so `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`. Every cell in the first row and first column has exactly one path (all right, or all down). Fill row by row, left to right, and every cell's two inputs are ready when you reach it.

```diagram
{"type":"grid","cells":[[1,1,1,1,1,1,1],[1,2,3,4,5,6,7],[1,3,6,10,15,21,28]],"highlight":[[2,6]],"caption":"Number of paths to each cell of a 3 × 7 grid: the cell above plus the cell to the left. The answer is 28."}
```

```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]         # first row and column: one path each
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]   # from above + from the left
    return dp[m - 1][n - 1]
```

```java
int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    for (int[] row : dp) Arrays.fill(row, 1);        // first row and column: one path each
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];  // from above + from the left
    return dp[m - 1][n - 1];
}
```

```cpp
int uniquePaths(int m, int n) {
    vector<vector<int>> dp(m, vector<int>(n, 1));    // first row and column: one path each
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];  // from above + from the left
    return dp[m - 1][n - 1];
}
```

O(m · n) time and space. The same skeleton handles the common variants: obstacles (a blocked cell gets 0), *minimum path sum* (`grid[r][c] + min(above, left)` instead of a sum of counts), *dungeon game* (fill from the bottom-right backwards, because the answer depends on what comes after), and *maximal square* (`1 + min(above, left, diagonal)`).

## Two strings: LCS and edit distance

When the input is two strings, the state is almost always a pair of prefixes: `dp[i][j]` describes the first `i` characters of `a` and the first `j` of `b`. Using lengths rather than indices gives a row and column for the **empty prefix**, which makes the base cases trivial. The table has `(m + 1) × (n + 1)` cells and each takes O(1), so these problems run in **O(m · n)**.

### Longest common subsequence

A **subsequence** keeps characters in order but can skip some ("ace" is a subsequence of "abcde"). The **longest common subsequence (LCS)** of two strings is the longest string that's a subsequence of both.

Look at the last characters of the two prefixes:

- If `a[i - 1] == b[j - 1]`, use that character: `dp[i][j] = dp[i - 1][j - 1] + 1`.
- Otherwise at least one of them isn't in the LCS, so drop one and take the better result: `dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`.

```diagram
{"type":"grid","cells":[[0,0,0,0],[0,1,1,1],[0,1,1,1],[0,1,2,2],[0,1,2,2],[0,1,2,3]],"rowLabels":["","a","b","c","d","e"],"colLabels":["","a","c","e"],"highlight":[[1,1],[3,2],[5,3]],"path":[[1,1],[2,1],[3,2],[4,2],[5,3]],"caption":"LCS of \"abcde\" (rows) and \"ace\" (columns): 3, in the corner. The first row and column are the empty prefix. Highlighted cells are matches; the line traces back \"ace\"."}
```

```python
def longest_common_subsequence(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]   # dp[i][j]: LCS of a[:i] and b[:j]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1              # use the matching character
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])   # drop one character
    return dp[m][n]
```

```java
int longestCommonSubsequence(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];              // dp[i][j]: LCS of a[0..i) and b[0..j)
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;  // use it
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);                    // drop one
        }
    }
    return dp[m][n];
}
```

```cpp
int longestCommonSubsequence(string a, string b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));   // dp[i][j]: LCS of a[0..i) and b[0..j)
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;   // use it
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);             // drop one
        }
    }
    return dp[m][n];
}
```

The same table answers *minimum deletions to make two strings equal* (`m + n - 2 · LCS`), and *longest palindromic subsequence* is the LCS of a string and its reverse. Don't confuse it with the longest common *substring*, which must be contiguous: there, a mismatch resets the cell to 0 and the answer is the largest cell anywhere.

### Edit distance

**Edit distance** (Levenshtein distance) is the fewest single-character insertions, deletions and replacements that turn `a` into `b`. Spell checkers, DNA alignment and `diff` all use versions of it.

`dp[i][j]` = edits to turn `a[:i]` into `b[:j]`. Turning a prefix into the empty string takes `i` deletions, and building `b[:j]` from nothing takes `j` insertions: that's the first column and first row. For the rest, look at the last characters:

- If they're equal, no edit is needed: `dp[i][j] = dp[i - 1][j - 1]`.
- Otherwise, pay 1 for the cheapest of: **delete** `a[i - 1]` (`dp[i - 1][j]`), **insert** `b[j - 1]` (`dp[i][j - 1]`), or **replace** one with the other (`dp[i - 1][j - 1]`).

For "horse" → "ros" the table is:

| | ∅ | r | o | s |
|---|---|---|---|---|
| **∅** | 0 | 1 | 2 | 3 |
| **h** | 1 | 1 | 2 | 3 |
| **o** | 2 | 2 | 1 | 2 |
| **r** | 3 | 2 | 2 | 2 |
| **s** | 4 | 3 | 3 | 2 |
| **e** | 5 | 4 | 4 | 3 |

The answer, 3, matches: replace `h` with `r` (rorse), delete the second `r` (rose), delete `e` (ros).

```python
def min_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]   # dp[i][j]: edits to turn a[:i] into b[:j]
    for i in range(m + 1):
        dp[i][0] = i                             # delete all i characters
    for j in range(n + 1):
        dp[0][j] = j                             # insert all j characters
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]      # last characters match: free
            else:
                dp[i][j] = 1 + min(dp[i - 1][j],      # delete a[i-1]
                                   dp[i][j - 1],      # insert b[j-1]
                                   dp[i - 1][j - 1])  # replace a[i-1] with b[j-1]
    return dp[m][n]
```

```java
int minDistance(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];          // dp[i][j]: edits to turn a[0..i) into b[0..j)
    for (int i = 0; i <= m; i++) dp[i][0] = i;   // delete all i characters
    for (int j = 0; j <= n; j++) dp[0][j] = j;   // insert all j characters
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];   // free
            else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],                      // replace
                                Math.min(dp[i - 1][j], dp[i][j - 1]));          // delete, insert
        }
    }
    return dp[m][n];
}
```

```cpp
int minDistance(string a, string b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));  // dp[i][j]: edits to turn a[0..i) into b[0..j)
    for (int i = 0; i <= m; i++) dp[i][0] = i;   // delete all i characters
    for (int j = 0; j <= n; j++) dp[0][j] = j;   // insert all j characters
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1];             // free
            else dp[i][j] = 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]});  // replace, delete, insert
        }
    }
    return dp[m][n];
}
```

### Distinct subsequences

*Distinct subsequences*: in how many ways does `t` appear as a subsequence of `s`? For `s = "rabbbit"` and `t = "rabbit"` the answer is 3: choose which of the three b's to leave out.

- **State**: `dp[i][j]` = the number of ways to form `t[:j]` from the first `i` characters of `s`.
- **Transition**: character `s[i - 1]` is either skipped (`dp[i - 1][j]` ways) or, if it equals `t[j - 1]`, used as that character (`dp[i - 1][j - 1]` ways). It's a count, so **add** the two options where LCS took the max.
- **Base cases**: `dp[i][0] = 1` (the empty string appears once: pick nothing) and `dp[0][j] = 0` for `j > 0`.

```diagram
{"type":"grid","cells":[[1,0,0,0,0,0,0],[1,1,0,0,0,0,0],[1,1,1,0,0,0,0],[1,1,1,1,0,0,0],[1,1,1,2,1,0,0],[1,1,1,3,3,0,0],[1,1,1,3,3,3,0],[1,1,1,3,3,3,3]],"rowLabels":["","r","a","b","b","b","i","t"],"colLabels":["","r","a","b","b","i","t"],"highlight":[[7,6]],"caption":"s = \"rabbbit\" down the side, t = \"rabbit\" across. Each b in s adds the cell up-left to the cell above, so \"rabb\" can be formed in 3 ways. The answer is 3."}
```

The code keeps one row, `ways[j]`, and runs `j` **downwards** so that `ways[j - 1]` still holds the value from before the current character, the same trick as 0/1 knapsack below.

```python
def num_distinct(s, t):                  # ways t appears as a subsequence of s
    m = len(t)
    ways = [1] + [0] * m                 # ways[j]: ways to form t[:j] from the s seen so far
    for c in s:
        for j in range(m, 0, -1):        # downward, so ways[j - 1] still means "before c"
            if t[j - 1] == c:
                ways[j] += ways[j - 1]   # c either plays t[j - 1] or is skipped
    return ways[m]
```

```java
int numDistinct(String s, String t) {    // ways t appears as a subsequence of s
    int m = t.length();
    int[] ways = new int[m + 1];         // ways[j]: ways to form t[0..j) from the s seen so far
    ways[0] = 1;
    for (char c : s.toCharArray())
        for (int j = m; j >= 1; j--)     // downward, so ways[j - 1] still means "before c"
            if (t.charAt(j - 1) == c)
                ways[j] += ways[j - 1];  // may wrap; only additions, so ways[m] still comes out right
    return ways[m];
}
```

```cpp
int numDistinct(const string& s, const string& t) {   // ways t appears as a subsequence of s
    int m = t.size();
    vector<unsigned> ways(m + 1, 0);     // unsigned wraps mod 2^32; signed overflow is UB
    ways[0] = 1;
    for (char c : s)
        for (int j = m; j >= 1; j--)     // downward, so ways[j - 1] still means "before c"
            if (t[j - 1] == c)
                ways[j] += ways[j - 1];
    return (int)ways[m];                 // exact, because the true answer fits
}
```

**O(|s| · |t|) time, O(|t|) space.**

**When partial counts overflow.** LeetCode promises the final answer fits in a 32-bit int, but the cells on the way don't have to. With `s` = ten a's, a b, then 200 a's, and `t` = ten a's then a b, the answer is 1, yet `ways[10]` climbs to C(210, 10) ≈ 3.7 × 10¹⁶. Two ways to cope:

- **Let it wrap.** Fixed-width addition that overflows is **wrapping arithmetic**: it computes the true sum mod 2³² (or 2⁶⁴). Since `(a + b) mod 2³²` is the same whether you reduce at every step or once at the end, every cell holds its true value mod 2³², and a true final answer below 2³¹ comes out exact. Java's `int` wraps by definition. In C++ signed overflow is undefined behaviour, so use `unsigned`, which is defined to wrap, and cast at the end, as the code does. Python's integers never overflow.
- **Reduce mod 10⁹ + 7** when the problem asks for the count modulo a prime; it's the same argument (see [modular arithmetic](/learn/math#modular-arithmetic)).

The pitfall: this only works for **additions, subtractions and multiplications**. Once a wrapped value is compared (`max`, `min`, `<`) or divided, the result means nothing, so optimisation DPs need a type wide enough for the true values.

### Wildcard matching

*Wildcard matching* asks whether a pattern matches a **whole** string, where `?` matches any one character and `*` matches any run of characters, including an empty one. It's a common hard string DP, and a warm-up for *regular expression matching*, where `*` repeats the character before it instead.

The state is the same pair of prefixes as LCS: `dp[i][j]` is true when the first `i` characters of `s` match the first `j` characters of `p`. Look at the last pattern character `p[j - 1]`:

- **A letter or `?`**: it must match `s[i - 1]` (anything, for `?`), and the rest must match: `dp[i][j] = dp[i - 1][j - 1]`.
- **A `*`**: either it matches nothing, so drop it (`dp[i][j - 1]`), or it swallows `s[i - 1]` and stays available for more (`dp[i - 1][j]`). So `dp[i][j] = dp[i][j - 1] || dp[i - 1][j]`.
- **Base cases**: `dp[0][0]` is true, `dp[i][0]` is false for `i > 0`, and `dp[0][j]` is true only while `p[:j]` is all stars.

The second star option keeps `j` the same. That's what lets one star absorb any number of characters, one cell at a time, without an inner loop over how many it takes (which would cost an extra factor of `m`).

```python
def is_match(s, p):
    # Prefix pairs, as in edit distance
    # Star stands for any run, so it either stops here or eats one more char
    m, n = len(s), len(p)
    # dp[i][j] (s[:i] matches p[:j])
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    # empty s matches only leading stars
    for j in range(1, n + 1):
        dp[0][j] = dp[0][j - 1] and p[j - 1] == "*"
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == "*":
                # star matches empty run, or eats s[i - 1] and stays for more
                dp[i][j] = dp[i][j - 1] or dp[i - 1][j]
            elif p[j - 1] == "?" or p[j - 1] == s[i - 1]:
                # one char against one char
                dp[i][j] = dp[i - 1][j - 1]
    return dp[m][n]
```

```java
boolean isMatch(String s, String p) {
    // Prefix pairs, as in edit distance
    // Star stands for any run, so it either stops here or eats one more char
    int m = s.length(), n = p.length();
    // dp[i][j] (first i chars of s match first j of p)
    boolean[][] dp = new boolean[m + 1][n + 1];
    dp[0][0] = true;
    // empty s matches only leading stars
    for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && p.charAt(j - 1) == '*';
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            char pc = p.charAt(j - 1);
            // star matches empty run, or eats s[i - 1] and stays for more
            if (pc == '*') dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
            // one char against one char
            else if (pc == '?' || pc == s.charAt(i - 1)) dp[i][j] = dp[i - 1][j - 1];
        }
    }
    return dp[m][n];
}
```

```cpp
bool isMatch(const string& s, const string& p) {
    // Prefix pairs, as in edit distance
    // Star stands for any run, so it either stops here or eats one more char
    int m = s.size(), n = p.size();
    // dp[i][j] (first i chars of s match first j of p)
    vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
    dp[0][0] = true;
    // empty s matches only leading stars
    for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && p[j - 1] == '*';
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            // star matches empty run, or eats s[i - 1] and stays for more
            if (p[j - 1] == '*') dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
            // one char against one char
            else if (p[j - 1] == '?' || p[j - 1] == s[i - 1]) dp[i][j] = dp[i - 1][j - 1];
        }
    }
    return dp[m][n];
}
```

`"adceb"` matches `"*a*b"` (the stars take `""` and `"dce"`), and `"acdcb"` doesn't match `"a*c?b"`. **O(m · n) time and space**; each row reads only itself and the row above, so two rows bring space down to O(n). Pitfalls:

- **Missing the leading-stars base row.** Without it, `s = ""` and `p = "**"` returns false.
- **Writing the star case as `dp[i - 1][j - 1]`.** That lets a star match exactly one character, which is what `?` does.
- **Mixing it up with regex.** In a regular expression `a*` means "zero or more a's", so the star case looks back at `p[j - 2]` instead.

## Knapsack

Knapsack problems ask you to choose items, each with a weight (or cost) and a value, to fit a capacity. They're the template for any "choose a subset with a budget" question.

### 0/1 knapsack

In the **0/1 knapsack**, each item can be taken at most once. With capacity `C`, maximise the total value.

- **State**: `dp[i][c]` = the best value using only the first `i` items with capacity `c`.
- **Transition**: the last decision is item `i`. Leave it: `dp[i - 1][c]`. Take it (if it fits): `dp[i - 1][c - w] + v`. Take the larger.

```diagram
{"type":"grid","cells":[[0,0,0,0,0],[0,15,15,15,15],[0,15,15,20,35],[0,15,15,20,35]],"rowLabels":["no items","w1 $15","w3 $20","w4 $30"],"colLabels":[0,1,2,3,4],"highlight":[[2,4],[3,4]],"caption":"Items (weight 1, $15), (3, $20), (4, $30) and capacity 4. dp[2][4] = max(15, dp[1][1] + 20) = 35: take items 1 and 2. Item 3 alone (30) is worse."}
```

Each row only reads the row above it, so one array is enough, *if* you fill it from right to left. Going downward in `c` means `dp[c - w]` still holds the previous row's value (this item not yet used). Going upward would let the same item be added again and again, which is a different problem.

```python
def knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)                # dp[c] = best value with capacity c
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1): # downward: each item used at most once
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[capacity]
```

```java
int knapsack(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];            // dp[c] = best value with capacity c
    for (int i = 0; i < weights.length; i++) {
        for (int c = capacity; c >= weights[i]; c--) {   // downward: each item used at most once
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

```cpp
int knapsack(vector<int>& weights, vector<int>& values, int capacity) {
    vector<int> dp(capacity + 1, 0);             // dp[c] = best value with capacity c
    for (int i = 0; i < (int)weights.size(); i++) {
        for (int c = capacity; c >= weights[i]; c--) {   // downward: each item used at most once
            dp[c] = max(dp[c], dp[c - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

That's O(n · C) time and O(C) space. Note that it depends on the capacity's *value*, not just the input length, so it's only practical when `C` is moderate (up to around 10⁴ to 10⁵ in interview problems).

The 0/1 pattern hides in many problems. *Partition equal subset sum* is a boolean knapsack (can some subset reach `sum / 2`?). *Target sum* counts subsets reaching a value. *Last stone weight II* finds the subset sum closest to half. *Ones and zeroes* has two capacities, so its state has two dimensions.

### Unbounded knapsack: coin change

In the **unbounded** version, each item can be used any number of times. *Coin change*: given coin values and an amount, what's the fewest coins that make the amount exactly?

- **State**: `dp[a]` = the fewest coins that make amount `a`.
- **Transition**: the last coin was some `c`, leaving `a - c` to make: `dp[a] = min(dp[a - c] + 1)` over coins with `c ≤ a`.
- **Base case**: `dp[0] = 0`. Everything else starts at infinity, meaning "can't be made yet".

For coins `[1, 2, 5]` and amount 11, the table is `dp = [0, 1, 1, 2, 2, 1, 2, 2, 3, 3, 2, 3]`, so the answer is 3 (5 + 5 + 1).

```python
def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount                # dp[a] = fewest coins that make a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1        # the last coin was c
    return dp[amount] if dp[amount] != INF else -1
```

```java
int coinChange(int[] coins, int amount) {
    int INF = amount + 1;                        // more coins than could ever be needed
    int[] dp = new int[amount + 1];              // dp[a] = fewest coins that make a
    Arrays.fill(dp, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);   // the last coin was c
        }
    }
    return dp[amount] == INF ? -1 : dp[amount];
}
```

```cpp
int coinChange(vector<int>& coins, int amount) {
    const int INF = amount + 1;                  // more coins than could ever be needed
    vector<int> dp(amount + 1, INF);             // dp[a] = fewest coins that make a
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);   // the last coin was c
        }
    }
    return dp[amount] == INF ? -1 : dp[amount];
}
```

O(amount × coins) time, O(amount) space. Greedy ("always take the biggest coin") fails here: with coins `[1, 3, 4]` and amount 6, greedy takes 4 + 1 + 1 (three coins) but 3 + 3 uses two.

**Counting** ways instead of minimising brings a subtle trap: the loop order decides what you count.

```text
for c in coins:                      # coins outer: combinations
    for a in range(c, amount + 1):   # (1+2 and 2+1 counted once)
        ways[a] += ways[a - c]

for a in range(1, amount + 1):       # amounts outer: ordered sequences
    for c in coins:                  # (1+2 and 2+1 counted separately)
        if c <= a: ways[a] += ways[a - c]
```

*Coin change II* wants combinations (coins outer); *combination sum IV* wants ordered sequences (amounts outer). With `ways[0] = 1`, both are O(amount × coins).

### Perfect squares

*Perfect squares* asks for the fewest perfect squares (1, 4, 9, 16, …) that add up to `n`. It's coin change in disguise: the coins are the squares up to `n`, each usable any number of times, and the amount is `n`. So `fewest[a] = 1 + min(fewest[a - k²])` over `k² ≤ a`, with `fewest[0] = 0`.

Greedy fails here too: for 12, taking the largest square first gives 9 + 1 + 1 + 1 (four squares), but 4 + 4 + 4 needs three.

```python
def num_squares(n):
    # Coin change with coins 1, 4, 9, 16, ...
    # Fewest for a = 1 + fewest for (a - last square)
    # fewest[a] (fewest squares summing to a; a ones = upper bound)
    fewest = list(range(n + 1))
    for a in range(2, n + 1):
        k = 2
        # each square k*k <= a as last coin (k = 1 already in start value)
        while k * k <= a:
            fewest[a] = min(fewest[a], fewest[a - k * k] + 1)
            k += 1
    return fewest[n]
```

```java
int numSquares(int n) {
    // Coin change with coins 1, 4, 9, 16, ...
    // Fewest for a = 1 + fewest for (a - last square)
    // fewest[a] (fewest squares summing to a; a ones = upper bound)
    int[] fewest = new int[n + 1];
    for (int a = 0; a <= n; a++) fewest[a] = a;
    for (int a = 2; a <= n; a++)
        // each square k*k <= a as last coin (k = 1 already in start value)
        for (int k = 2; k * k <= a; k++)
            fewest[a] = Math.min(fewest[a], fewest[a - k * k] + 1);
    return fewest[n];
}
```

```cpp
int numSquares(int n) {
    // Coin change with coins 1, 4, 9, 16, ...
    // Fewest for a = 1 + fewest for (a - last square)
    // fewest[a] (fewest squares summing to a; a ones = upper bound)
    vector<int> fewest(n + 1);
    iota(fewest.begin(), fewest.end(), 0);
    for (int a = 2; a <= n; a++)
        // each square k*k <= a as last coin (k = 1 already in start value)
        for (int k = 2; k * k <= a; k++)
            fewest[a] = min(fewest[a], fewest[a - k * k] + 1);
    return fewest[n];
}
```

There are about √n squares up to `n`, so **O(n√n) time and O(n) space**. Starting each cell at `a` (all ones) gives a safe upper bound, so no infinity is needed. The usual mistake is greedy; the usual follow-up is "can you do better?". Number theory says the answer is always 1, 2, 3 or 4 and tells you which in O(√n): see [sums of squares](/learn/math#sums-of-squares-lagrange-and-legendre).

## Longest increasing subsequence

The **longest increasing subsequence (LIS)** of `[10, 9, 2, 5, 3, 7, 101, 18]` has length 4 (for example 2, 3, 7, 18). Elements must keep their order but needn't be adjacent.

### O(n²): extend an earlier subsequence

Here the useful state is "ending exactly at `i`": `dp[i]` = the length of the longest increasing subsequence that *ends with* `nums[i]`. Any earlier `nums[j] < nums[i]` can be extended by `nums[i]`, so `dp[i] = 1 + max(dp[j])` over those `j` (or just 1 if there are none). The answer is the largest `dp[i]`, not `dp[n - 1]`, because the best subsequence can end anywhere.

For the example, `dp = [1, 1, 1, 2, 2, 3, 4, 4]`.

```python
def length_of_lis(nums):
    dp = [1] * len(nums)                     # dp[i] = longest increasing subsequence ending at i
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)   # extend the one ending at j
    return max(dp)
```

```java
int lengthOfLIS(int[] nums) {
    int[] dp = new int[nums.length];             // dp[i] = longest increasing subsequence ending at i
    int best = 0;
    for (int i = 0; i < nums.length; i++) {
        dp[i] = 1;
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);   // extend the one ending at j
        }
        best = Math.max(best, dp[i]);
    }
    return best;
}
```

```cpp
int lengthOfLIS(vector<int>& nums) {
    vector<int> dp(nums.size(), 1);              // dp[i] = longest increasing subsequence ending at i
    int best = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = max(dp[i], dp[j] + 1);   // extend the one ending at j
        }
        best = max(best, dp[i]);
    }
    return best;
}
```

### O(n log n): keep the smallest tails

A faster method keeps one array, `tails`, where `tails[k]` is the **smallest possible last element** of an increasing subsequence of length `k + 1` seen so far. A smaller tail is always better, because more future numbers can extend it. `tails` is always sorted, so for each new `x`, [binary search](/learn/binary-search) for the first tail that is `>= x`:

- if there's none, `x` extends the longest subsequence: append it;
- otherwise, `x` becomes a smaller tail for that length: overwrite it.

```diagram
{"type":"array","rows":[{"label":"x = 10","values":[10],"highlight":[0]},{"label":"x = 9","values":[9],"highlight":[0]},{"label":"x = 2","values":[2],"highlight":[0]},{"label":"x = 5","values":[2,5],"highlight":[1]},{"label":"x = 3","values":[2,3],"highlight":[1]},{"label":"x = 7","values":[2,3,7],"highlight":[2]},{"label":"x = 101","values":[2,3,7,101],"highlight":[3]},{"label":"x = 18","values":[2,3,7,18],"highlight":[3]}],"caption":"tails after each element of [10, 9, 2, 5, 3, 7, 101, 18]; the highlighted slot was just written. The final length, 4, is the answer."}
```

```python
from bisect import bisect_left

def length_of_lis(nums):
    tails = []                               # tails[k] = smallest tail of an increasing run of length k + 1
    for x in nums:
        k = bisect_left(tails, x)            # first tail >= x
        if k == len(tails):
            tails.append(x)                  # x extends the longest run
        else:
            tails[k] = x                     # x is a smaller tail for length k + 1
    return len(tails)
```

```java
int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];          // tails[k] = smallest tail of an increasing run of length k + 1
    int len = 0;
    for (int x : nums) {
        int k = Arrays.binarySearch(tails, 0, len, x);
        if (k < 0) k = -(k + 1);                 // not found: the insertion point, i.e. first tail > x
        tails[k] = x;                            // extend (k == len) or lower an existing tail
        if (k == len) len++;
    }
    return len;
}
```

```cpp
int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;                           // tails[k] = smallest tail of an increasing run of length k + 1
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);   // first tail >= x
        if (it == tails.end()) tails.push_back(x);              // x extends the longest run
        else *it = x;                                           // x is a smaller tail
    }
    return tails.size();
}
```

Careful: `tails` is *not* necessarily an actual increasing subsequence. Here it ends as 2, 3, 7, 18, which happens to be one, but for `[3, 4, 1]` it ends as `[1, 4]`, and 1 comes after 4 in the input. Only its length is meaningful. For a non-decreasing subsequence, search for the first tail strictly greater than `x` (`bisect_right`, `upper_bound`). *Russian doll envelopes* is LIS in disguise: sort by width ascending and height descending, then run LIS on the heights.

## Weighted interval scheduling

*Maximum profit in job scheduling*: each job has a start, an end and a profit; choose jobs that don't overlap (one may start exactly when another ends) to maximise the total profit. Without profits this is activity selection, and greedy by earliest end is optimal ([greedy & intervals](/learn/greedy-intervals#choosing-the-most-intervals)). With profits, greedy fails: one long job can be worth more than three short ones.

1. Sort the jobs by **end** time.
2. `dp[i]` = the best profit using only the first `i` jobs in that order, with `dp[0] = 0`.
3. For job `i` (start `s`, profit `p`), either skip it (`dp[i - 1]`) or take it. Taking it rules out every job that ends after `s`. Because the jobs are sorted by end, the compatible ones form a prefix: the first `k` jobs, where `k` is the number of earlier jobs ending at or before `s`. **Binary search** the sorted end times for `k` (`bisect_right`, `upper_bound`), and the option is `dp[k] + p`.
4. The answer is `dp[n]`.

```diagram
{"type":"array","rows":[{"label":"end","values":[3,4,5,6]},{"label":"profit","values":[50,10,40,70],"highlight":[3]},{"label":"dp","values":[0,50,50,90,120],"highlight":[1,4]}],"caption":"Jobs [1,3] 50, [2,4] 10, [3,5] 40, [3,6] 70, sorted by end. The last job starts at 3, so only job 1 is compatible: dp[4] = max(dp[3], dp[1] + 70) = max(90, 120) = 120."}
```

```python
from bisect import bisect_right

def job_scheduling(start, end, profit):
    jobs = sorted(zip(end, start, profit))         # by end time
    ends = [e for e, _, _ in jobs]
    dp = [0] * (len(jobs) + 1)                     # dp[i]: best profit from the first i jobs
    for i, (e, s, p) in enumerate(jobs, 1):
        k = bisect_right(ends, s, 0, i - 1)        # how many earlier jobs end at or before s
        dp[i] = max(dp[i - 1],                     # skip job i
                    dp[k] + p)                     # take it after the best compatible prefix
    return dp[-1]
```

```java
int jobScheduling(int[] startTime, int[] endTime, int[] profit) {
    int n = profit.length;
    Integer[] job = new Integer[n];
    for (int i = 0; i < n; i++) job[i] = i;
    Arrays.sort(job, (a, b) -> Integer.compare(endTime[a], endTime[b]));   // by end time
    int[] ends = new int[n];
    for (int i = 0; i < n; i++) ends[i] = endTime[job[i]];
    int[] dp = new int[n + 1];                     // dp[i]: best profit from the first i jobs
    for (int i = 1; i <= n; i++) {
        int j = job[i - 1], s = startTime[j];
        int lo = 0, hi = i - 1;                    // count earlier jobs that end at or before s
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (ends[mid] <= s) lo = mid + 1; else hi = mid;
        }
        dp[i] = Math.max(dp[i - 1],                // skip job i
                         dp[lo] + profit[j]);      // take it after the best compatible prefix
    }
    return dp[n];
}
```

```cpp
int jobScheduling(vector<int>& startTime, vector<int>& endTime, vector<int>& profit) {
    int n = profit.size();
    vector<array<int, 3>> jobs;                    // {end, start, profit}
    for (int i = 0; i < n; i++) jobs.push_back({endTime[i], startTime[i], profit[i]});
    sort(jobs.begin(), jobs.end());                // by end time
    vector<int> ends(n), dp(n + 1, 0);             // dp[i]: best profit from the first i jobs
    for (int i = 0; i < n; i++) ends[i] = jobs[i][0];
    for (int i = 1; i <= n; i++) {
        auto [e, s, p] = jobs[i - 1];
        // how many earlier jobs end at or before s
        int k = upper_bound(ends.begin(), ends.begin() + (i - 1), s) - ends.begin();
        dp[i] = max(dp[i - 1],                     // skip job i
                    dp[k] + p);                    // take it after the best compatible prefix
    }
    return dp[n];
}
```

**O(n log n)**: the sort plus one binary search per job. O(n) space. Pitfalls:

- **The search must include ties.** A job that ends exactly at `s` is compatible, so count ends `<= s` (an upper bound). A strict `<` loses it.
- **Search only the earlier jobs.** Restrict the range to the first `i - 1` ends.
- **Sort by end, not start**, for this form. (Sorting by start also works if you fill `dp` from the right: `dp[i] = max(dp[i + 1], p + dp[first job starting at or after this end])`.)
- The same "sort by end, binary search for the last compatible item" shape solves *maximum number of events that can be attended II*, with an extra dimension for how many events you've taken.

## Interval DP: burst balloons

Some problems are about a range `l..r` of an array, and the answer for a range is built from smaller ranges inside it: **interval DP**, with state `dp[l][r]`. The table is filled by increasing length, so every shorter range is ready when a longer one needs it. That's O(n²) states, and usually O(n) choices each, for **O(n³)** time.

*Burst balloons* shows the key move. Bursting balloon `i` earns `nums[i - 1] · nums[i] · nums[i + 1]` from its *current* neighbours, which then become adjacent. Maximise the total. Choosing which balloon to burst **first** is a dead end: after it pops, its two neighbours touch, and the two sides are no longer independent subproblems.

Choose which balloon goes **last** instead:

- Pad the array with a 1 at each end and let `dp[l][r]` be the best total from bursting every balloon *strictly between* `l` and `r` (an open interval), with `l` and `r` still standing.
- If `k` is the last balloon burst in that interval, everything between `l` and `k` and between `k` and `r` has already gone, and those two groups never interacted, because `k` stood between them the whole time. When `k` finally bursts, its neighbours are `l` and `r`.
- So `dp[l][r] = max over l < k < r of dp[l][k] + vals[l] · vals[k] · vals[r] + dp[k][r]`, with `dp[l][l + 1] = 0` (nothing in between).

```python
def max_coins(nums):
    vals = [1] + nums + [1]              # padding: an edge balloon multiplies by 1
    n = len(vals)
    dp = [[0] * n for _ in range(n)]     # dp[l][r]: best for the balloons strictly between l and r
    for gap in range(2, n):              # shorter intervals first
        for l in range(n - gap):
            r = l + gap
            for k in range(l + 1, r):    # k is the LAST balloon burst between l and r
                dp[l][r] = max(dp[l][r],
                               dp[l][k] + vals[l] * vals[k] * vals[r] + dp[k][r])
    return dp[0][n - 1]
```

```java
int maxCoins(int[] nums) {
    int n = nums.length + 2;
    int[] vals = new int[n];             // padding: an edge balloon multiplies by 1
    vals[0] = vals[n - 1] = 1;
    for (int i = 0; i < nums.length; i++) vals[i + 1] = nums[i];
    int[][] dp = new int[n][n];          // dp[l][r]: best for the balloons strictly between l and r
    for (int gap = 2; gap < n; gap++) {  // shorter intervals first
        for (int l = 0; l + gap < n; l++) {
            int r = l + gap;
            for (int k = l + 1; k < r; k++)   // k is the LAST balloon burst between l and r
                dp[l][r] = Math.max(dp[l][r],
                                    dp[l][k] + vals[l] * vals[k] * vals[r] + dp[k][r]);
        }
    }
    return dp[0][n - 1];
}
```

```cpp
int maxCoins(vector<int>& nums) {
    vector<int> vals = {1};              // padding: an edge balloon multiplies by 1
    vals.insert(vals.end(), nums.begin(), nums.end());
    vals.push_back(1);
    int n = vals.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));   // dp[l][r]: best strictly between l and r
    for (int gap = 2; gap < n; gap++) {  // shorter intervals first
        for (int l = 0; l + gap < n; l++) {
            int r = l + gap;
            for (int k = l + 1; k < r; k++)   // k is the LAST balloon burst between l and r
                dp[l][r] = max(dp[l][r],
                               dp[l][k] + vals[l] * vals[k] * vals[r] + dp[k][r]);
        }
    }
    return dp[0][n - 1];
}
```

For `[3, 1, 5, 8]` the answer is 167 (burst 1, 5, 3, 8 in that order: 15 + 120 + 24 + 8). **O(n³) time, O(n²) space.**

The same "pick the element that goes last, or the split point" pattern solves *minimum cost to cut a stick* (pad the cut positions with the stick's ends and choose the first cut `k`, which costs the whole piece's length), *matrix chain multiplication*, *minimum score triangulation of a polygon* and *strange printer*. Pitfalls: looping `l` and `r` in plain row order instead of by length (a cell would read ranges that aren't filled yet), and mixing up closed and open intervals in the base cases.

### Longest palindromic subsequence

The **longest palindromic subsequence** (LPS) of a string is its longest subsequence that reads the same both ways: for `"bbbab"` it's `"bbbb"`, length 4. It's interval DP with no split point to choose, only the two ends of `s[l..r]`:

- If `s[l] == s[r]`, both ends wrap whatever is best inside: `dp[l][r] = dp[l + 1][r - 1] + 2`.
- Otherwise at least one end isn't used, so drop one: `dp[l][r] = max(dp[l + 1][r], dp[l][r - 1])`.
- A single character has `dp[l][l] = 1`, and an empty range counts as 0.

**Minimum insertions to make a palindrome** reads off the same table. Keep the LPS as the core; every character outside it needs a copy inserted on the mirror side. So the answer is `n - LPS`, and so is the minimum number of *deletions*. For `"mbadm"` the LPS is 3 (`"mam"`), so 2 insertions are enough: `"mbdadbm"`.

```python
def longest_palindrome_subseq(s):
    # Ends match = both join palindrome around inside; else drop one end
    n = len(s)
    # dp[l][r] (longest palindromic subsequence in s[l..r]; 0 = empty range)
    dp = [[0] * n for _ in range(n)]
    # l downwards, so dp[l + 1][...] row is ready
    for l in range(n - 1, -1, -1):
        dp[l][l] = 1
        for r in range(l + 1, n):
            if s[l] == s[r]:
                # wrap inside (empty when r = l + 1) with matching pair
                dp[l][r] = dp[l + 1][r - 1] + 2
            else:
                # one end is unused, so drop better one
                dp[l][r] = max(dp[l + 1][r], dp[l][r - 1])
    return dp[0][n - 1]

def min_insertions(s):
    # each char outside longest palindromic subsequence needs mirror copy
    return len(s) - longest_palindrome_subseq(s)
```

```java
int longestPalindromeSubseq(String s) {
    // Ends match = both join palindrome around inside; else drop one end
    int n = s.length();
    // dp[l][r] (longest palindromic subsequence in s[l..r]; 0 = empty range)
    int[][] dp = new int[n][n];
    // l downwards, so dp[l + 1][...] row is ready
    for (int l = n - 1; l >= 0; l--) {
        dp[l][l] = 1;
        for (int r = l + 1; r < n; r++) {
            // wrap inside (empty when r = l + 1) with matching pair
            if (s.charAt(l) == s.charAt(r)) dp[l][r] = dp[l + 1][r - 1] + 2;
            // one end is unused, so drop better one
            else dp[l][r] = Math.max(dp[l + 1][r], dp[l][r - 1]);
        }
    }
    return dp[0][n - 1];
}

int minInsertions(String s) {
    // each char outside longest palindromic subsequence needs mirror copy
    return s.length() - longestPalindromeSubseq(s);
}
```

```cpp
int longestPalindromeSubseq(const string& s) {
    // Ends match = both join palindrome around inside; else drop one end
    int n = s.size();
    // dp[l][r] (longest palindromic subsequence in s[l..r]; 0 = empty range)
    vector<vector<int>> dp(n, vector<int>(n, 0));
    // l downwards, so dp[l + 1][...] row is ready
    for (int l = n - 1; l >= 0; l--) {
        dp[l][l] = 1;
        for (int r = l + 1; r < n; r++) {
            // wrap inside (empty when r = l + 1) with matching pair
            if (s[l] == s[r]) dp[l][r] = dp[l + 1][r - 1] + 2;
            // one end is unused, so drop better one
            else dp[l][r] = max(dp[l + 1][r], dp[l][r - 1]);
        }
    }
    return dp[0][n - 1];
}

int minInsertions(const string& s) {
    // each char outside longest palindromic subsequence needs mirror copy
    return (int)s.size() - longestPalindromeSubseq(s);
}
```

**O(n²) time and space.** As the LCS section says, the LPS is also the LCS of `s` and its reverse; the interval form is more direct. Pitfalls:

- **Subsequence vs substring.** The longest palindromic *substring* must be contiguous; expanding around each centre ([two pointers](/learn/two-pointers#expand-around-the-centre)) solves that one in O(n²) time and O(1) space.
- **Fill order.** `dp[l][r]` reads row `l + 1`, so `l` goes downwards, as in the palindrome table in the next section.
- **Two-character ranges.** When `r = l + 1` the inside is empty and must count as 0. A zero-filled table handles it; a recursive version needs an explicit `l > r` base case.

## Palindrome partitioning: minimum cuts

*Palindrome partitioning II*: cut a string into pieces that are all palindromes, using as few cuts as possible. `"aab"` needs 1 cut (`"aa" | "b"`), and `"banana"` needs 1 (`"b" | "anana"`). Interviewers like it because it stacks two DPs: one answers "is this substring a palindrome?", and the other is an ordinary prefix DP that asks that question in its inner loop.

1. **Palindrome table.** `pal[l][r]` is true when `s[l..r]` is a palindrome: its two ends match and the inside `s[l+1..r-1]` is a palindrome (or has fewer than two characters). That's interval DP, so fill it with `l` going **downwards**, which makes `pal[l + 1][r - 1]` ready before `pal[l][r]` reads it.
2. **Prefix DP.** `pieces[i]` = the fewest palindromes that cover the first `i` characters, with `pieces[0] = 0`. The last decision is where the last piece starts: try every `j < i` with `pal[j][i - 1]` true, and take `pieces[j] + 1`.
3. The answer is `pieces[n] - 1`, because `k` pieces need `k - 1` cuts.

```diagram
{"type":"array","rows":[{"label":"s","values":["b","a","n","a","n","a"],"window":[1,5],"highlight":[1,2,3,4,5]},{"label":"pieces","values":[0,1,2,3,2,3,2],"highlight":[1,6]}],"caption":"pieces has n + 1 cells. s[1..5] = \"anana\" is a palindrome, so pieces[6] = pieces[1] + 1 = 2: two pieces, one cut."}
```

```python
def min_cut(s):
    # Fewest pieces for prefix = 1 + fewest for prefix before last piece
    # Palindrome table answers "is last piece palindrome?" in O(1)
    n = len(s)
    # pal[l][r] (s[l..r] reads same both ways)
    pal = [[False] * n for _ in range(n)]
    # l downwards, so pal[l + 1][r - 1] is ready
    for l in range(n - 1, -1, -1):
        for r in range(l, n):
            # ends match and inside is palindrome (or under 2 chars)
            pal[l][r] = s[l] == s[r] and (r - l < 2 or pal[l + 1][r - 1])
    # pieces[i] (fewest palindromes covering s[:i]; n = worse than any real split)
    pieces = [0] + [n] * n
    for i in range(1, n + 1):
        # each start j of last piece s[j..i-1]
        for j in range(i):
            if pal[j][i - 1]:
                pieces[i] = min(pieces[i], pieces[j] + 1)
    # k pieces need k - 1 cuts
    return pieces[n] - 1
```

```java
int minCut(String s) {
    // Fewest pieces for prefix = 1 + fewest for prefix before last piece
    // Palindrome table answers "is last piece palindrome?" in O(1)
    int n = s.length();
    // pal[l][r] (s[l..r] reads same both ways)
    boolean[][] pal = new boolean[n][n];
    // l downwards, so pal[l + 1][r - 1] is ready
    for (int l = n - 1; l >= 0; l--)
        for (int r = l; r < n; r++)
            // ends match and inside is palindrome (or under 2 chars)
            pal[l][r] = s.charAt(l) == s.charAt(r) && (r - l < 2 || pal[l + 1][r - 1]);
    // pieces[i] (fewest palindromes covering first i chars; n = worse than any real split)
    int[] pieces = new int[n + 1];
    Arrays.fill(pieces, 1, n + 1, n);
    for (int i = 1; i <= n; i++)
        // each start j of last piece s[j..i-1]
        for (int j = 0; j < i; j++)
            if (pal[j][i - 1]) pieces[i] = Math.min(pieces[i], pieces[j] + 1);
    // k pieces need k - 1 cuts
    return pieces[n] - 1;
}
```

```cpp
int minCut(const string& s) {
    // Fewest pieces for prefix = 1 + fewest for prefix before last piece
    // Palindrome table answers "is last piece palindrome?" in O(1)
    int n = s.size();
    // pal[l][r] (s[l..r] reads same both ways)
    vector<vector<bool>> pal(n, vector<bool>(n, false));
    // l downwards, so pal[l + 1][r - 1] is ready
    for (int l = n - 1; l >= 0; l--)
        for (int r = l; r < n; r++)
            // ends match and inside is palindrome (or under 2 chars)
            pal[l][r] = s[l] == s[r] && (r - l < 2 || pal[l + 1][r - 1]);
    // pieces[i] (fewest palindromes covering first i chars; n = worse than any real split)
    vector<int> pieces(n + 1, n);
    pieces[0] = 0;
    for (int i = 1; i <= n; i++)
        // each start j of last piece s[j..i-1]
        for (int j = 0; j < i; j++)
            if (pal[j][i - 1]) pieces[i] = min(pieces[i], pieces[j] + 1);
    // k pieces need k - 1 cuts
    return pieces[n] - 1;
}
```

**O(n²) time and O(n²) space** for the table; the prefix DP adds O(n). Pitfalls:

- **Checking palindromes inside the DP loop** by scanning the substring makes it O(n³). Build the table first.
- **Filling `pal` in the wrong order.** With `l` going up, `pal[l + 1][r - 1]` hasn't been computed yet and reads as false.
- **Returning pieces instead of cuts.** The off-by-one is easy to miss on `"aab"`, where both 1 and 2 look plausible.

To save memory, skip the table and expand around each centre instead: every palindrome `s[l..r]` found that way updates `pieces[r + 1]` from `pieces[l]`. That's O(n²) time and O(n) space. *Palindrome partitioning* (the first version) asks for every partition rather than the fewest cuts; it's [backtracking](/learn/recursion-backtracking) over the start of the next piece, and the same table makes each check O(1).

## Splitting an array into k groups

A family of problems cuts an array into `k` **contiguous** groups and scores each group: *minimum difficulty of a job schedule* (a day's difficulty is its hardest job; minimise the sum over `d` days), *split array largest sum*, *partition array for maximum sum*. The state is how many items have been placed and how many groups were used:

- **State**: `best[k][i]` = the best total for the first `i` items split into `k` groups. `best[0][0] = 0`; every other `best[0][i]` is impossible (infinity).
- **Transition**: the last decision is where the **last group** starts. If it's `jobs[j..i-1]`, the first `j` items form the other `k - 1` groups: `best[k][i] = min over j of best[k - 1][j] + cost(j, i)`.
- **Cheap group cost**: loop `j` **from right to left**, so the last group grows by one item per step and its cost (here a running max) updates in O(1).
- Each group needs at least one item, so `i ≥ k` and `j ≥ k - 1`. If there are fewer items than groups, there's no answer.

For jobs `[6, 5, 4, 3, 2, 1]` over 2 days, the best plan puts the first five jobs on day 1 (difficulty 6) and the last on day 2 (difficulty 1): 7 in total.

```python
def min_difficulty(jobs, d):
    # Last day takes jobs[j..i-1]; earlier days split jobs[:j] into k - 1 groups
    # Walk j leftwards so last day's max grows one job per step
    n = len(jobs)
    # fewer jobs than days, so some day would be empty
    if n < d:
        return -1
    INF = float("inf")
    # best[k][i] (least total difficulty for first i jobs in k days)
    best = [[INF] * (n + 1) for _ in range(d + 1)]
    best[0][0] = 0
    for k in range(1, d + 1):
        # k days need at least k jobs
        for i in range(k, n + 1):
            day_max = 0
            # last day starts at j, leaving at least k - 1 jobs for earlier days
            for j in range(i - 1, k - 2, -1):
                day_max = max(day_max, jobs[j])
                best[k][i] = min(best[k][i], best[k - 1][j] + day_max)
    return best[d][n]
```

```java
int minDifficulty(int[] jobs, int d) {
    // Last day takes jobs[j..i-1]; earlier days split jobs[0..j-1] into k - 1 groups
    // Walk j leftwards so last day's max grows one job per step
    int n = jobs.length;
    // fewer jobs than days, so some day would be empty
    if (n < d) return -1;
    // large but safe to add to (no int overflow)
    final int INF = 1_000_000_000;
    // best[k][i] (least total difficulty for first i jobs in k days)
    int[][] best = new int[d + 1][n + 1];
    for (int[] row : best) Arrays.fill(row, INF);
    best[0][0] = 0;
    for (int k = 1; k <= d; k++) {
        // k days need at least k jobs
        for (int i = k; i <= n; i++) {
            int dayMax = 0;
            // last day starts at j, leaving at least k - 1 jobs for earlier days
            for (int j = i - 1; j >= k - 1; j--) {
                dayMax = Math.max(dayMax, jobs[j]);
                best[k][i] = Math.min(best[k][i], best[k - 1][j] + dayMax);
            }
        }
    }
    return best[d][n];
}
```

```cpp
int minDifficulty(const vector<int>& jobs, int d) {
    // Last day takes jobs[j..i-1]; earlier days split jobs[0..j-1] into k - 1 groups
    // Walk j leftwards so last day's max grows one job per step
    int n = jobs.size();
    // fewer jobs than days, so some day would be empty
    if (n < d) return -1;
    // large but safe to add to (no int overflow)
    const int INF = 1'000'000'000;
    // best[k][i] (least total difficulty for first i jobs in k days)
    vector<vector<int>> best(d + 1, vector<int>(n + 1, INF));
    best[0][0] = 0;
    for (int k = 1; k <= d; k++) {
        // k days need at least k jobs
        for (int i = k; i <= n; i++) {
            int dayMax = 0;
            // last day starts at j, leaving at least k - 1 jobs for earlier days
            for (int j = i - 1; j >= k - 1; j--) {
                dayMax = max(dayMax, jobs[j]);
                best[k][i] = min(best[k][i], best[k - 1][j] + dayMax);
            }
        }
    }
    return best[d][n];
}
```

**O(d · n²) time.** The table is O(d · n), but row `k` reads only row `k - 1`, so two rows are enough. Pitfalls:

- **Allowing empty groups.** Start `i` at `k` and stop `j` at `k - 1`; otherwise a day with no jobs sneaks in with difficulty 0.
- **Recomputing the group cost** from scratch for every `j` adds another factor of `n`. Walk `j` leftwards and carry it.
- **Infinity that overflows.** In Java and C++, use a large value such as 10⁹ rather than `INT_MAX`, so `INF + dayMax` doesn't wrap negative.

When the group cost is a sum and you minimise the largest group (*split array largest sum*), [binary search on the answer](/learn/binary-search) with a greedy check is faster, O(n log(sum)). The DP is the general tool: it works for any cost you can extend one item at a time.

## Remembering the last move: frog jump

Sometimes the position alone doesn't say what you can do next, because the allowed moves depend on the move that got you there. Then the **last move goes into the state**. It's the "missing state" pitfall turned into a technique: whatever the next choice depends on must be part of the key.

*Frog jump*: stones sit at increasing positions with `stones[0] = 0`. The frog's first jump is 1 unit, and if its last jump was `k` units, the next must be `k - 1`, `k` or `k + 1` units, forward only. Can it reach the last stone?

Landing on a stone with a jump of 2 or with a jump of 3 are different situations (the next jump is 1–3 or 2–4), so `dp[stone]` isn't enough. The state is `(stone, last jump)`:

1. For each stone, keep the set of jump lengths that can land on it. Seed the first stone with a jump of 0, so its only forward move is 1.
2. Visit the stones left to right. Every jump moves right, so by the time you reach a stone, every jump into it is known.
3. From each `(pos, k)`, try `k - 1`, `k` and `k + 1`; if `pos + step` is a stone, add `step` to that stone's set.
4. The answer is whether the last stone's set is non-empty.

```python
def can_cross(stones):
    # State = (stone, length of jump that landed there)
    # Next jump is last - 1, last or last + 1, so stone alone isn't enough
    # jumps[pos] (lengths of jumps that can land on pos)
    jumps = {pos: set() for pos in stones}
    # pretend frog arrived at first stone with jump 0, so first real jump is 1
    jumps[stones[0]].add(0)
    # stones left to right, so every jump into pos is known before leaving it
    for pos in stones:
        for last in jumps[pos]:
            for step in (last - 1, last, last + 1):
                # forward only, and only onto stone
                if step > 0 and pos + step in jumps:
                    jumps[pos + step].add(step)
    return len(jumps[stones[-1]]) > 0
```

```java
boolean canCross(int[] stones) {
    // State = (stone, length of jump that landed there)
    // Next jump is last - 1, last or last + 1, so stone alone isn't enough
    // jumps[pos] (lengths of jumps that can land on pos)
    Map<Integer, Set<Integer>> jumps = new HashMap<>();
    for (int pos : stones) jumps.put(pos, new HashSet<>());
    // pretend frog arrived at first stone with jump 0, so first real jump is 1
    jumps.get(stones[0]).add(0);
    // stones left to right, so every jump into pos is known before leaving it
    for (int pos : stones) {
        for (int last : jumps.get(pos)) {
            for (int step = last - 1; step <= last + 1; step++) {
                // forward only, and only onto stone
                if (step > 0 && jumps.containsKey(pos + step)) jumps.get(pos + step).add(step);
            }
        }
    }
    return !jumps.get(stones[stones.length - 1]).isEmpty();
}
```

```cpp
bool canCross(vector<int>& stones) {
    // State = (stone, length of jump that landed there)
    // Next jump is last - 1, last or last + 1, so stone alone isn't enough
    // jumps[pos] (lengths of jumps that can land on pos)
    unordered_map<int, unordered_set<int>> jumps;
    for (int pos : stones) jumps[pos];
    // pretend frog arrived at first stone with jump 0, so first real jump is 1
    jumps[stones[0]].insert(0);
    // stones left to right, so every jump into pos is known before leaving it
    for (int pos : stones) {
        for (int last : jumps[pos]) {
            for (int step = last - 1; step <= last + 1; step++) {
                // forward only, and only onto stone
                auto it = jumps.find(pos + step);
                if (step > 0 && it != jumps.end()) it->second.insert(step);
            }
        }
    }
    return !jumps[stones.back()].empty();
}
```

For `[0, 1, 3, 5, 6, 8, 12, 17]` the frog makes it (jumps 1, 2, 2, 3, 4, 5). For `[0, 1, 2, 3, 4, 8, 9, 11]` it can't: a jump grows by at most 1 each time, so it's at most 2 by stone 4, and the gap to 8 needs 4.

A jump grows by at most 1 per stone, so it stays below `n`. That's at most O(n²) `(stone, jump)` states, each handled in O(1) expected time: **O(n²) time and space**. The pitfall is memoizing a recursive `canReach(pos)` on position alone: it caches "false" from one arrival and wrongly reuses it for an arrival with a different last jump. The same move shows up in *stock trading with cooldown* (whether you just sold), *student attendance record II* (late days in a row so far) and *dice roll simulation* (the last face and how many times in a row it came up).

## Game DP: winning and losing positions

Two-player games where "both players play optimally" are DP over game positions. Label each position from the point of view of the **player about to move**:

- **Losing**: there's no move, or every move leads to a winning position (for the opponent).
- **Winning**: at least one move leads to a losing position, because you can always pick that move.

Fill the smallest positions first and build up. In interviews this covers *divisor game*, *stone game*, *Nim*, *can I win* and *predict the winner*.

*Divisor game*: the number `n` is on a board. On a turn, a player picks `x` with `0 < x < n` and `n % x == 0`, and replaces `n` with `n - x`. A player who can't move loses. Alice moves first; does she win? `n = 1` has no move, so it's losing. From 2, subtract 1 to hand the opponent a 1: winning. From 3 the only move is to 2, which wins for the opponent: losing.

```diagram
{"type":"array","rows":[{"label":"n","values":[1,2,3,4,5,6,7,8]},{"label":"to move","values":["lose","win","lose","win","lose","win","lose","win"],"highlight":[1,3,5,7]}],"indices":false,"caption":"Divisor game from the mover's side. Every even n wins (subtract 1); every odd n loses, because its divisors are all odd and leave an even number."}
```

```python
def divisor_game(n):
    # Position wins if some move leaves opponent in losing position
    # No move left (k = 1) = loss for player to move
    # wins[k] (player to move on k wins with best play)
    wins = [False] * (n + 1)
    for k in range(2, n + 1):
        # each proper divisor x is move to k - x
        for x in range(1, k):
            if k % x == 0 and not wins[k - x]:
                # one losing reply for opponent is enough
                wins[k] = True
                break
    return wins[n]
```

```java
boolean divisorGame(int n) {
    // Position wins if some move leaves opponent in losing position
    // No move left (k = 1) = loss for player to move
    // wins[k] (player to move on k wins with best play)
    boolean[] wins = new boolean[n + 1];
    for (int k = 2; k <= n; k++) {
        // each proper divisor x is move to k - x
        for (int x = 1; x < k; x++) {
            if (k % x == 0 && !wins[k - x]) {
                // one losing reply for opponent is enough
                wins[k] = true;
                break;
            }
        }
    }
    return wins[n];
}
```

```cpp
bool divisorGame(int n) {
    // Position wins if some move leaves opponent in losing position
    // No move left (k = 1) = loss for player to move
    // wins[k] (player to move on k wins with best play)
    vector<bool> wins(n + 1, false);
    for (int k = 2; k <= n; k++) {
        // each proper divisor x is move to k - x
        for (int x = 1; x < k; x++) {
            if (k % x == 0 && !wins[k - x]) {
                // one losing reply for opponent is enough
                wins[k] = true;
                break;
            }
        }
    }
    return wins[n];
}
```

The table shows a pattern, and spotting it is a perfectly good interview route: **even numbers win**. From an even `n`, subtract 1 to leave an odd number. An odd number has only odd divisors, so any move from it leaves an even number again. The player facing odd numbers eventually gets stuck at 1, so the answer is `n % 2 == 0`. The table as written is **O(n²)** (O(n√n) if you list divisors in pairs); the parity answer is O(1).

When the game has **scores** (*stone game*, *predict the winner*), store the best **score difference** for the player to move instead of win or lose: `dp[state] = max over moves of (points taken - dp[next state])`, because the opponent's best difference counts against you. A difference of at least 0 at the start means the first player doesn't lose.

Pitfalls:

- **Fixing the state to one player.** Keep everything relative to the player to move, and flip with `not` (or a minus sign) when you step into the opponent's turn. Tracking "Alice's result" makes every other level backwards.
- **Assuming greedy play.** Taking the biggest pile now can hand the opponent a better move; the DP considers every reply.

## Row-by-row bitmask DP

Grid problems with a narrow width (up to about 8 columns) and a rule that links neighbouring rows can be solved one row at a time, with the **previous row's choices as a bitmask** in the state. Each row is a mask of `n` bits; the DP moves from row to row by pairing every valid mask with every compatible mask of the row above. *Maximum students taking exam* is the classic; *painting a grid with three colours* and tiling a narrow board work the same way.

*Maximum students taking exam*: seats form a grid, `.` for good and `#` for broken. A student can see the answers of anyone directly left, right, up-left or up-right of them. Seat as many students as possible so nobody can copy.

Bit `c` of a mask means someone sits in column `c`. Within a row there are two rules: students only on good seats, and no two side by side. Between rows there's one: nobody up-left or up-right of a student. Nothing reaches further back, so the only thing row `r` needs from the past is row `r - 1`'s mask:

1. `best[mask]` = the most students seated so far, with the last row seated as `mask` (−1 = impossible). Before the first row only the empty mask is possible, with 0 students.
2. For each row, keep the masks that are valid on their own: `mask & ~good == 0` (good seats only) and `mask & (mask >> 1) == 0` (no neighbours).
3. Pair each with every reachable `prev` where `mask & (prev << 1) == 0` (nobody up-left) and `mask & (prev >> 1) == 0` (nobody up-right), and take `best[prev] + popcount(mask)`.
4. The answer is the best value over the last row's masks.

```python
def max_students(seats):
    # Fill row by row; state = mask of seated columns in row above
    # Only row above can see current row, so older rows don't matter
    n = len(seats[0])
    full = 1 << n
    # best[mask] (most students so far with last row seated as mask; -1 = impossible)
    # empty row above first row
    best = [0] + [-1] * (full - 1)
    for row in seats:
        # bit c set = seat c not broken
        good = sum(1 << c for c in range(n) if row[c] == ".")
        nxt = [-1] * full
        for mask in range(full):
            # broken seat used, or two students side by side
            if mask & ~good or mask & (mask >> 1):
                continue
            for prev in range(full):
                # unreachable row above, or student up-left or up-right can be seen
                if best[prev] < 0 or mask & (prev << 1) or mask & (prev >> 1):
                    continue
                nxt[mask] = max(nxt[mask], best[prev] + bin(mask).count("1"))
        best = nxt
    return max(best)
```

```java
int maxStudents(char[][] seats) {
    // Fill row by row; state = mask of seated columns in row above
    // Only row above can see current row, so older rows don't matter
    int n = seats[0].length, full = 1 << n;
    // best[mask] (most students so far with last row seated as mask; -1 = impossible)
    int[] best = new int[full];
    Arrays.fill(best, -1);
    // empty row above first row
    best[0] = 0;
    for (char[] row : seats) {
        // bit c set = seat c not broken
        int good = 0;
        for (int c = 0; c < n; c++) if (row[c] == '.') good |= 1 << c;
        int[] nxt = new int[full];
        Arrays.fill(nxt, -1);
        for (int mask = 0; mask < full; mask++) {
            // broken seat used, or two students side by side
            if ((mask & ~good) != 0 || (mask & (mask >> 1)) != 0) continue;
            for (int prev = 0; prev < full; prev++) {
                // unreachable row above, or student up-left or up-right can be seen
                if (best[prev] < 0 || (mask & (prev << 1)) != 0 || (mask & (prev >> 1)) != 0) continue;
                nxt[mask] = Math.max(nxt[mask], best[prev] + Integer.bitCount(mask));
            }
        }
        best = nxt;
    }
    return Arrays.stream(best).max().getAsInt();
}
```

```cpp
int maxStudents(vector<vector<char>>& seats) {
    // Fill row by row; state = mask of seated columns in row above
    // Only row above can see current row, so older rows don't matter
    int n = seats[0].size(), full = 1 << n;
    // best[mask] (most students so far with last row seated as mask; -1 = impossible)
    vector<int> best(full, -1);
    // empty row above first row
    best[0] = 0;
    for (auto& row : seats) {
        // bit c set = seat c not broken
        int good = 0;
        for (int c = 0; c < n; c++) if (row[c] == '.') good |= 1 << c;
        vector<int> nxt(full, -1);
        for (int mask = 0; mask < full; mask++) {
            // broken seat used, or two students side by side
            if ((mask & ~good) || (mask & (mask >> 1))) continue;
            for (int prev = 0; prev < full; prev++) {
                // unreachable row above, or student up-left or up-right can be seen
                if (best[prev] < 0 || (mask & (prev << 1)) || (mask & (prev >> 1))) continue;
                nxt[mask] = max(nxt[mask], best[prev] + popcount((unsigned)mask));
            }
        }
        best = nxt;
    }
    return *max_element(best.begin(), best.end());
}
```

For `m` rows and `n` columns there are 2ⁿ × 2ⁿ mask pairs per row, so **O(m · 4ⁿ) time** (about 5 × 10⁵ pairs for the largest 8 × 8 input) and **O(2ⁿ) space** with two rolling arrays. Pitfalls:

- **Checking only one diagonal.** A student at column `c` sees `c - 1` and `c + 1` in the row above, so both shifts must come out clear.
- **A wider grid.** The 4ⁿ pairs per row are what the small width pays for; at 12 columns it's 1.7 × 10⁷ per row. Listing the valid masks of each row first (often a few dozen) shrinks it a lot.
- **Rules that reach two rows back** need both masks in the state, 2²ⁿ of them. Check how far the rule reaches before choosing the state.

See [bit manipulation](/learn/bit-manipulation#bitmask-dp) for the mask operations and the other bitmask DP shape, `dp[mask]` over subsets of items.

## Kadane's algorithm

*Maximum subarray*: find the contiguous subarray with the largest sum. **Kadane's algorithm** solves it in one pass, and it's DP with the "ending here" state:

- **State**: `cur` = the best sum of a subarray that *ends at* the current element.
- **Transition**: either extend the best run ending at the previous element, or start fresh here: `cur = max(x, cur + x)`. Starting fresh wins exactly when the previous run's sum is negative, because a negative prefix only drags the total down.
- **Answer**: the largest `cur` seen.

For `[-2, 1, -3, 4, -1, 2, 1, -5, 4]`, `cur` goes -2, 1, -2, 4, 3, 5, 6, 1, 5, so the answer is 6 (the subarray 4, -1, 2, 1).

```python
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)                # extend the run ending here, or restart at x
        best = max(best, cur)
    return best
```

```java
int maxSubArray(int[] nums) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);  // extend the run ending here, or restart
        best = Math.max(best, cur);
    }
    return best;
}
```

```cpp
int maxSubArray(vector<int>& nums) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < (int)nums.size(); i++) {
        cur = max(nums[i], cur + nums[i]);       // extend the run ending here, or restart
        best = max(best, cur);
    }
    return best;
}
```

O(n) time and O(1) space. Starting `best` at `nums[0]` rather than 0 handles arrays where every number is negative. Variants:

- **Maximum product subarray**: track both the largest and the smallest product ending here, because a negative number turns the smallest into the largest.
- **Maximum circular subarray**: the answer is either a normal maximum subarray or the total minus the minimum subarray (the part left out), unless every number is negative.
- **Best time to buy and sell stock**: Kadane on the day-to-day price differences, or equivalently track the lowest price so far.

## Space optimisation with rolling arrays

A DP table often only ever reads the previous row (or the previous one or two cells). Then you don't need to keep the whole table; a **rolling array** keeps just what the next step reads.

- **Two variables** for 1D recurrences that look back a fixed distance: house robber and climbing stairs need only `prev2` and `prev1`, so O(n) space becomes O(1).
- **Two rows** for 2D tables where row `i` reads only row `i - 1` (LCS, edit distance): O(m · n) space becomes O(n). Swap the rows after each `i`.
- **One row**, updated in place, when the order of updates makes the old and new values line up. Unique paths is the cleanest example: before `row[c]` is overwritten it still holds the value from the row above, and `row[c - 1]` has already been updated to the current row.

```python
def unique_paths(m, n):
    row = [1] * n                            # row[c] still holds the row above until overwritten
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]             # above (old row[c]) + left (new row[c - 1])
    return row[-1]
```

```java
int uniquePaths(int m, int n) {
    int[] row = new int[n];
    Arrays.fill(row, 1);                         // row[c] still holds the row above until overwritten
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            row[c] += row[c - 1];                // above (old row[c]) + left (new row[c - 1])
    return row[n - 1];
}
```

```cpp
int uniquePaths(int m, int n) {
    vector<int> row(n, 1);                       // row[c] still holds the row above until overwritten
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            row[c] += row[c - 1];                // above (old row[c]) + left (new row[c - 1])
    return row[n - 1];
}
```

The 0/1 knapsack's right-to-left loop is the same idea: the direction is chosen so that `dp[c - w]` is still the *old* row's value when it's read. When a cell needs the old value of a neighbour that's already been overwritten (LCS reads the diagonal `dp[i - 1][j - 1]`), save it in a temporary before overwriting.

The cost of rolling: you lose the full table, so you can no longer walk back through it to rebuild the actual solution. Optimise space only when you only need the number.

## Reconstructing the answer

Interviewers often follow up with "now return the actual subsequence / path / set of items". The table already contains the answer: start at the final cell and repeatedly ask *which choice produced this value*, then step to the cell that choice came from.

For LCS: if the characters match, that character is in the answer and you move diagonally; otherwise move to whichever neighbour (up or left) holds the larger value, since that's the one the `max` took. Collect characters and reverse at the end. (This is the line in the LCS diagram above.)

```python
def lcs_string(a, b, dp):                    # dp: the filled LCS table for a and b
    out, i, j = [], len(a), len(b)
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])             # this character is in the LCS
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1                           # the value came from above
        else:
            j -= 1                           # the value came from the left
    return "".join(reversed(out))
```

```java
String lcsString(String a, String b, int[][] dp) {   // dp: the filled LCS table for a and b
    StringBuilder out = new StringBuilder();
    int i = a.length(), j = b.length();
    while (i > 0 && j > 0) {
        if (a.charAt(i - 1) == b.charAt(j - 1)) {
            out.append(a.charAt(i - 1));             // this character is in the LCS
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;                                     // the value came from above
        } else {
            j--;                                     // the value came from the left
        }
    }
    return out.reverse().toString();
}
```

```cpp
string lcsString(const string& a, const string& b, vector<vector<int>>& dp) {  // dp: the filled LCS table
    string out;
    int i = a.size(), j = b.size();
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            out += a[i - 1];                         // this character is in the LCS
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;                                     // the value came from above
        } else {
            j--;                                     // the value came from the left
        }
    }
    reverse(out.begin(), out.end());
    return out;
}
```

Walking back is O(m + n). The alternative is to record the choice in a separate `parent` or `choice` table while filling, which is simpler when the transition has many options (for LIS, store the `j` that gave each `dp[i]`, then follow those links back from the best `i`). For knapsack, item `i` was taken exactly when `dp[i][c] != dp[i - 1][c]`; then subtract its weight from `c` and continue with row `i - 1`.

## How to recognise a DP problem

Signals in the problem statement:

- It asks for **a count** ("how many ways"), **an optimum** ("minimum cost", "maximum profit", "longest", "fewest") or **feasibility** ("is it possible to...").
- You make a **sequence of choices** (take or skip, which step, which coin, match or edit), and earlier choices change what's possible later, so a greedy rule can't safely commit.
- The input is a sequence, a string, a pair of strings, a grid, or a budget.
- The constraints fit a polynomial table: `n ≤ 1,000` to `5,000` suggests O(n²); `n ≤ 10⁵` with a target `≤ 10⁴` suggests O(n · target); `n ≤ 20` suggests a bitmask over subsets.

Then follow a fixed process rather than hunting for the recurrence directly:

1. Write the **brute-force recursion** that tries every choice.
2. Look at its **parameters**: they're your state. If the same parameters can come up via different routes, subproblems overlap.
3. Add **memoization**. You now have a correct top-down DP.
4. If needed, convert to a **table** filled in dependency order, then **roll** it to save space.

DP also shows up in disguise elsewhere: on trees, a postorder traversal that returns a small tuple per node (*house robber III*, *binary tree maximum path sum*) is DP over subtrees (see [binary trees](/learn/trees)); on DAGs, processing vertices in [topological order](/learn/topological-sort) is DP; and Bellman-Ford's "at most k edges" rounds in [shortest paths](/learn/shortest-paths) are a DP table over the number of edges.

## Pitfalls

- **Off-by-one in prefix tables.** If `dp[i]` means "the first `i` characters", the table has `n + 1` entries and character `i` is `s[i - 1]`. Mixing "first `i`" with "up to index `i`" is the most common DP bug. Write the state's meaning as a comment.
- **Wrong initial values.** Minimisation tables start at infinity (except the base case); maximisation at minus infinity or 0 depending on whether "nothing" is allowed; counting tables start at 0 with `ways[0] = 1`.
- **Wrong loop direction.** 0/1 knapsack in one array must go downward; unbounded goes upward. Coins outer vs amounts outer changes combinations into permutations.
- **Missing state.** If the recurrence needs to know something the state doesn't record (whether you're holding a stock, how many transactions are left, whether the first house was robbed), add it as another dimension.
- **Recursion limits.** A memoized recursion on 10⁴ or more levels can overflow, especially in Python. Switch to bottom-up or raise the limit.
- **Unhashable or stale caches.** `functools.cache` needs hashable arguments (tuples, not lists). A global or class-level cache can leak results between test cases that use different inputs.
- **Overflow and modulo.** Counting problems often say "return the answer modulo 10⁹ + 7": apply the modulo at every addition, not once at the end, and use 64-bit integers for intermediate products.
