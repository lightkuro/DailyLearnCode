---
title: Prefix sums
summary: Precompute running totals so any range sum is one subtraction, then extend the idea to counting subarrays, 2D grids, range updates with difference arrays, and prefix XOR and products.
related: sliding-window, hashing, arrays-strings, dynamic-programming, bit-manipulation
terms:
  - prefix sum
  - prefix sums
  - prefix-sum
  - cumulative sum #the-idea
  - range sum query #the-idea
  - range sum queries #the-idea
  - subarray sum equals k #subarray-sum-equals-k
  - 2D prefix sum #2d-prefix-sums
  - 2D prefix sums #2d-prefix-sums
  - difference array #difference-arrays
  - difference arrays #difference-arrays
  - prefix XOR #prefix-xor
  - product of array except self #prefix-and-suffix-products
  - shortest subarray with sum at least k #shortest-subarray-with-sum-at-least-k
  - contribution technique #contribution-counting
  - contribution counting #contribution-counting
  - count of range sum #counting-prefix-sum-pairs-in-a-range
  - coordinate compression #fenwick-tree-with-coordinate-compression
  - Fenwick tree #fenwick-tree-with-coordinate-compression
  - binary indexed tree #fenwick-tree-with-coordinate-compression
  - count subarrays with median k #balance-around-a-fixed-index-median-equals-k
---

## The idea

Suppose you'll be asked many times for the sum of `nums[l..r]`. Adding up the range each time is O(n) per query. Instead, compute running totals once: a **prefix sum** array `P` where `P[i]` is the sum of the first `i` elements.

- `P[0] = 0` (the sum of nothing)
- `P[i + 1] = P[i] + nums[i]`

Then the sum of `nums[l..r]` (inclusive) is everything up to `r` minus everything before `l`:

`sum(l, r) = P[r + 1] − P[l]`

Building `P` is O(n), and every **range sum query** after that is O(1).

```diagram
{"type":"array","rows":[{"label":"nums","values":[3,1,4,1,5,9,2],"window":[2,4],"highlight":[2,3,4]},{"label":"P","values":[0,3,4,8,9,14,23,25],"highlight":[2,5]}],"caption":"P has one more cell than nums. sum(2, 4) = 4 + 1 + 5 = P[5] − P[2] = 14 − 4 = 10."}
```

Giving `P` length `n + 1` with a leading 0 is deliberate: it makes `sum(0, r) = P[r + 1] − P[0]` work without a special case for ranges that start at index 0.

```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0] * (len(nums) + 1)      # prefix[i] = sum of nums[0..i-1]
        for i, x in enumerate(nums):
            self.prefix[i + 1] = self.prefix[i] + x

    def sum_range(self, left, right):            # inclusive, O(1)
        return self.prefix[right + 1] - self.prefix[left]
```

```java
class NumArray {
    private final long[] prefix;                 // prefix[i] = sum of nums[0..i-1]

    NumArray(int[] nums) {
        prefix = new long[nums.length + 1];
        for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
    }

    long sumRange(int left, int right) {         // inclusive, O(1)
        return prefix[right + 1] - prefix[left];
    }
}
```

```cpp
class NumArray {
    vector<long long> prefix;                    // prefix[i] = sum of nums[0..i-1]
public:
    NumArray(const vector<int>& nums) : prefix(nums.size() + 1, 0) {
        for (size_t i = 0; i < nums.size(); i++) prefix[i + 1] = prefix[i] + nums[i];
    }

    long long sumRange(int left, int right) const {   // inclusive, O(1)
        return prefix[right + 1] - prefix[left];
    }
};
```

The prefix array is also called a **cumulative sum** or running sum. Python has `itertools.accumulate`, C++ has `std::partial_sum`, and Java has `Arrays.parallelPrefix`, though writing the loop yourself is just as short and makes the off-by-one choice explicit. Use 64-bit totals in Java and C++: the sum of 10⁵ values up to 10⁹ overflows an `int`.

A few common uses of a single prefix array: the pivot index (where the left sum equals the right sum, `P[i] == P[n] − P[i + 1]`), the average of every window of size k, and counting occurrences of something in a range (prefix counts instead of prefix sums).

## Subarray sum equals k

Count the subarrays whose sum is exactly `k`. A subarray `nums[l..r]` sums to `k` when `P[r + 1] − P[l] = k`, that is, when an earlier prefix equals `P[r + 1] − k`. So scan left to right, keep a hash map from each prefix value to how many times it has occurred so far, and at each position add the number of earlier prefixes equal to `current − k`.

```diagram
{"type":"array","rows":[{"label":"nums","values":[3,4,7,2,-3,1,4,2],"window":[2,5]},{"label":"P","values":[0,3,7,14,16,13,14,18,20],"highlight":[2,6]}],"caption":"k = 7. P[6] − P[2] = 14 − 7 = 7, so nums[2..5] = 7 + 2 − 3 + 1 sums to 7. The scan finds all 4 such subarrays in one pass."}
```

```python
def subarray_sum(nums, k):
    seen = {0: 1}                        # prefix value -> times seen; the empty prefix is 0
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0) # earlier prefixes p with prefix - p == k
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

```java
int subarraySum(int[] nums, int k) {
    Map<Long, Integer> seen = new HashMap<>();   // prefix value -> times seen
    seen.put(0L, 1);                             // the empty prefix
    long prefix = 0;
    int count = 0;
    for (int x : nums) {
        prefix += x;
        count += seen.getOrDefault(prefix - k, 0);   // earlier prefixes p with prefix - p == k
        seen.merge(prefix, 1, Integer::sum);
    }
    return count;
}
```

```cpp
int subarraySum(const vector<int>& nums, int k) {
    unordered_map<long long, int> seen{{0, 1}};  // prefix value -> times seen; empty prefix is 0
    long long prefix = 0;
    int count = 0;
    for (int x : nums) {
        prefix += x;
        auto it = seen.find(prefix - k);         // earlier prefixes p with prefix - p == k
        if (it != seen.end()) count += it->second;
        seen[prefix]++;
    }
    return count;
}
```

O(n) time and O(n) space. Two details matter:

- **Seed the map with `{0: 1}`.** It stands for the empty prefix, so subarrays that start at index 0 are counted.
- **Look up before inserting** the current prefix. Otherwise, when `k = 0`, every position would count the empty subarray ending at itself.

Unlike a [sliding window](/learn/sliding-window), this works with negative numbers, because it never decides to move a pointer; it just asks the map. It's the same complement idea as two sum in [hash maps & sets](/learn/hashing).

Variants change what the map stores:

| Problem | Map key | Map value |
|---|---|---|
| Count subarrays with sum k | prefix | how many times seen |
| Longest subarray with sum k | prefix | first index where it appeared |
| Subarray sum divisible by k | prefix mod k | how many times seen |
| Contiguous array (equal 0s and 1s) | prefix, with 0 counted as −1 | first index where it appeared |

For "longest", store only the *first* index of each prefix (don't overwrite it) so the subarray is as long as possible, and seed with `{0: -1}`. For "divisible by k", two prefixes with the same remainder bound a subarray whose sum is a multiple of k. In Java and C++, `%` can return a negative result for negative numbers, so normalize with `((p % k) + k) % k`.

### Balance around a fixed index: median equals k

A count table also works when every subarray must contain one fixed index. *Count subarrays with median k*: `nums` is a permutation of `1..n`; how many subarrays have median `k` (the middle element after sorting, the left one of the two middles for even lengths)?

Only the comparison with `k` matters, so map each value to **+1 if bigger than k, −1 if smaller**, and `k` itself to 0. A subarray containing `k` has median `k` exactly when its **balance** (the sum) is **0** (odd length: as many bigger as smaller) or **1** (even length: one extra bigger, so `k` is the left middle). A subarray without `k` never counts, so every answer contains `k`'s index `pos`.

Split each such subarray at `pos` into a left part `nums[start..pos-1]` and a right part `nums[pos+1..end]`, each possibly empty. Their balances add up, so:

1. Walk left from `pos`, recording how many left parts have each balance (the empty part has balance 0).
2. Walk right from `pos`. For a right balance `b`, the left part must have balance `−b` or `1 − b`: add both counts.

```diagram
{"type":"array","rows":[{"label":"nums","values":[3,2,1,4,5],"pointers":{"pos":3}},{"label":"vs k = 4","values":[-1,-1,-1,0,1]}],"caption":"Left balances (empty, [1], [2,1], [3,2,1]): 0, −1, −2, −3. Right balances (empty, [5]): 0 and 1. Three pairs sum to 0 or 1, giving [4], [4,5] and [1,4,5]."}
```

```python
from collections import Counter

def count_subarrays(nums, k):
    # Score bigger than k as +1, smaller as -1; subarray must hold k
    # Median is k when balance = 0 (odd length) or 1 (even length)
    # Count left balances first, then pair each right balance with them
    pos = nums.index(k)
    # left_count[b] (left ends with balance b over nums[start..pos-1])
    left_count = Counter({0: 1})
    balance = 0
    # extend left end one step at a time
    for i in range(pos - 1, -1, -1):
        balance += 1 if nums[i] > k else -1
        left_count[balance] += 1
    total = balance = 0
    # extend right end; balance over nums[pos+1..j]
    for j in range(pos, len(nums)):
        if j > pos:
            balance += 1 if nums[j] > k else -1
        # left part must bring total to 0 or 1
        total += left_count[-balance] + left_count[1 - balance]
    return total
```

```java
int countSubarrays(int[] nums, int k) {
    // Score bigger than k as +1, smaller as -1; subarray must hold k
    // Median is k when balance = 0 (odd length) or 1 (even length)
    // Count left balances first, then pair each right balance with them
    int n = nums.length, pos = 0;
    while (nums[pos] != k) pos++;
    // leftCount[b + n] (left ends with balance b; shifted by n, as b can be negative)
    int[] leftCount = new int[2 * n + 2];
    leftCount[n] = 1;
    int balance = 0;
    // extend left end one step at a time
    for (int i = pos - 1; i >= 0; i--) {
        balance += nums[i] > k ? 1 : -1;
        leftCount[balance + n]++;
    }
    int total = 0;
    balance = 0;
    // extend right end; balance over nums[pos+1..j]
    for (int j = pos; j < n; j++) {
        if (j > pos) balance += nums[j] > k ? 1 : -1;
        // left part must bring total to 0 or 1
        total += leftCount[-balance + n] + leftCount[1 - balance + n];
    }
    return total;
}
```

```cpp
int countSubarrays(const vector<int>& nums, int k) {
    // Score bigger than k as +1, smaller as -1; subarray must hold k
    // Median is k when balance = 0 (odd length) or 1 (even length)
    // Count left balances first, then pair each right balance with them
    int n = nums.size();
    int pos = find(nums.begin(), nums.end(), k) - nums.begin();
    // leftCount[b + n] (left ends with balance b; shifted by n, as b can be negative)
    vector<int> leftCount(2 * n + 2, 0);
    leftCount[n] = 1;
    int balance = 0;
    // extend left end one step at a time
    for (int i = pos - 1; i >= 0; i--) {
        balance += nums[i] > k ? 1 : -1;
        leftCount[balance + n]++;
    }
    int total = 0;
    balance = 0;
    // extend right end; balance over nums[pos+1..j]
    for (int j = pos; j < n; j++) {
        if (j > pos) balance += nums[j] > k ? 1 : -1;
        // left part must bring total to 0 or 1
        total += leftCount[-balance + n] + leftCount[1 - balance + n];
    }
    return total;
}
```

**O(n)** time and space: one walk each way and an array (offset by `n`, since balances go negative) or a hash map. The pitfalls are the **even-length rule** (forgetting the `1 − b` lookup only counts odd lengths), forgetting the **empty left part** (balance 0, count 1), and counting subarrays that don't contain `k`. The same ±1 trick turns "more bigger than smaller", "majority" and "equal 0s and 1s" questions into prefix-balance counting.

## Shortest subarray with sum at least k

*Shortest subarray with sum at least k*: find the length of the shortest subarray whose sum is **at least** `k`, where values can be negative. With only positive values a [sliding window](/learn/sliding-window) works, but a negative value breaks it: a window that's too short can become long enough later, and shrinking can *raise* the sum. A hash map doesn't help either, because "at least" isn't a single value to look up.

In prefix-sum terms, `nums[i..j-1]` qualifies when `P[j] − P[i] ≥ k`. For each end `j` we want the **latest** start `i` that satisfies it. Keep a **deque** of candidate starts whose prefix values **increase** from front to back, and for each `j`:

1. **Pop from the front** while `P[j] − P[front] ≥ k`, scoring `j − front` each time. A later `j` would only make that subarray longer, so the front is finished for good.
2. **Pop from the back** while `P[back] ≥ P[j]`. As a start, `j` is later (shorter subarrays) and no higher (bigger differences), so the back can never beat it.
3. Push `j` on the back.

```diagram
{"type":"array","rows":[{"label":"nums","values":[2,-1,2,3]},{"label":"P","values":[0,2,1,3,6],"highlight":[0,2,3],"pointers":{"j":4}}],"caption":"k = 4. Index 1 (P = 2) was popped from the back when P[2] = 1 arrived. At j = 4, P[4] − P[0] = 6 and P[4] − P[2] = 5 both reach 4 (lengths 4 and 2); P[4] − P[3] = 3 doesn't. Answer 2."}
```

```python
from collections import deque

def shortest_subarray(nums, k):
    # Subarray i..j-1 qualifies when P[j] - P[i] >= k
    # Deque keeps candidate starts i with P[i] rising front to back
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    # n + 1 = nothing found yet
    best = n + 1
    starts = deque()
    for j in range(n + 1):
        # front works for j; later j only gives longer, so score and drop it
        while starts and prefix[j] - prefix[starts[0]] >= k:
            best = min(best, j - starts.popleft())
        # j is later and no higher, so it beats back as start
        while starts and prefix[starts[-1]] >= prefix[j]:
            starts.pop()
        starts.append(j)
    return best if best <= n else -1
```

```java
int shortestSubarray(int[] nums, int k) {
    // Subarray i..j-1 qualifies when P[j] - P[i] >= k
    // Deque keeps candidate starts i with P[i] rising front to back
    int n = nums.length;
    // long, since sums can pass int range
    long[] prefix = new long[n + 1];
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    // n + 1 = nothing found yet
    int best = n + 1;
    Deque<Integer> starts = new ArrayDeque<>();
    for (int j = 0; j <= n; j++) {
        // front works for j; later j only gives longer, so score and drop it
        while (!starts.isEmpty() && prefix[j] - prefix[starts.peekFirst()] >= k)
            best = Math.min(best, j - starts.pollFirst());
        // j is later and no higher, so it beats back as start
        while (!starts.isEmpty() && prefix[starts.peekLast()] >= prefix[j])
            starts.pollLast();
        starts.offerLast(j);
    }
    return best <= n ? best : -1;
}
```

```cpp
int shortestSubarray(const vector<int>& nums, int k) {
    // Subarray i..j-1 qualifies when P[j] - P[i] >= k
    // Deque keeps candidate starts i with P[i] rising front to back
    int n = nums.size();
    // long long, since sums can pass int range
    vector<long long> prefix(n + 1, 0);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    // n + 1 = nothing found yet
    int best = n + 1;
    deque<int> starts;
    for (int j = 0; j <= n; j++) {
        // front works for j; later j only gives longer, so score and drop it
        while (!starts.empty() && prefix[j] - prefix[starts.front()] >= k) {
            best = min(best, j - starts.front());
            starts.pop_front();
        }
        // j is later and no higher, so it beats back as start
        while (!starts.empty() && prefix[starts.back()] >= prefix[j])
            starts.pop_back();
        starts.push_back(j);
    }
    return best <= n ? best : -1;
}
```

Each index enters and leaves the deque at most once: **O(n) time, O(n) space.** It's the [monotonic deque](/learn/stacks-queues#monotonic-deque-sliding-window-maximum) from sliding window maximum, run over prefix sums instead of the values. Pitfalls:

- **Using a sliding window** because the problem looks like one. Check for negative values first.
- **Starting from `j = 1`.** The empty prefix `P[0] = 0` must be a candidate start, or subarrays beginning at index 0 are missed.
- **Overflow.** 10⁵ values of size up to 10⁵ give prefix sums up to 10¹⁰, past an `int`: use 64-bit totals in Java and C++.

## 2D prefix sums

The same idea works on a grid. Let `P[r][c]` be the sum of the top-left block of `r` rows and `c` columns (again with an extra row and column of zeros). Building it uses **inclusion-exclusion**: add the block above and the block to the left, then subtract their overlap, which was counted twice.

`P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] − P[r][c]`

The sum of the rectangle from `(r1, c1)` to `(r2, c2)` is the big block, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice:

`P[r2 + 1][c2 + 1] − P[r1][c2 + 1] − P[r2 + 1][c1] + P[r1][c1]`

```diagram
{"type":"grid","cells":[[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]],"highlight":[[2,1],[2,2],[2,3],[3,1],[3,2],[3,3],[4,1],[4,2],[4,3]],"rowLabels":[0,1,2,3,4],"colLabels":[0,1,2,3,4],"caption":"The region from (2, 1) to (4, 3) sums to 8. With a 2D prefix array that's four lookups, whatever the region's size."}
```

```python
class NumMatrix:
    def __init__(self, matrix):
        m, n = len(matrix), len(matrix[0])
        P = [[0] * (n + 1) for _ in range(m + 1)]   # P[r][c] = sum of the r x c top-left block
        for r in range(m):
            for c in range(n):
                P[r + 1][c + 1] = matrix[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]
        self.P = P

    def sum_region(self, r1, c1, r2, c2):           # inclusive corners, O(1)
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
```

```java
class NumMatrix {
    private final int[][] P;                        // P[r][c] = sum of the r x c top-left block

    NumMatrix(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        P = new int[m + 1][n + 1];
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                P[r + 1][c + 1] = matrix[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
    }

    int sumRegion(int r1, int c1, int r2, int c2) { // inclusive corners, O(1)
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
}
```

```cpp
class NumMatrix {
    vector<vector<int>> P;                          // P[r][c] = sum of the r x c top-left block
public:
    NumMatrix(const vector<vector<int>>& matrix)
        : P(matrix.size() + 1, vector<int>(matrix[0].size() + 1, 0)) {
        for (size_t r = 0; r < matrix.size(); r++)
            for (size_t c = 0; c < matrix[0].size(); c++)
                P[r + 1][c + 1] = matrix[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
    }

    int sumRegion(int r1, int c1, int r2, int c2) const {   // inclusive corners, O(1)
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
};
```

Building is O(m · n); each query is O(1). Typical uses: "matrix block sum", counting 1s in any sub-rectangle, and "largest square of 1s" checks. Combining 2D prefix sums with the hash map trick over pairs of rows counts submatrices that sum to a target in O(m² · n).

## Difference arrays

Prefix sums make range *queries* cheap. **Difference arrays** do the reverse: they make range *updates* cheap. To add `v` to every element of `[l, r]`, record only where the change starts and where it stops:

- `D[l] += v`
- `D[r + 1] -= v`

After all updates, the prefix sum of `D` gives the final array: the `+v` carries forward from `l` and the `−v` cancels it after `r`. Each update is O(1), and one O(n) pass at the end materializes everything.

```diagram
{"type":"array","rows":[{"label":"+2 on [1, 3]","values":[0,2,0,0,-2,0],"highlight":[1,4]},{"label":"+3 on [2, 4]","values":[0,2,3,0,-2,-3],"highlight":[2,5]},{"label":"−2 on [0, 2]","values":[-2,2,3,2,-2,-3],"highlight":[0,3]},{"label":"prefix sum","values":[-2,0,3,5,3]}],"caption":"Three range updates on an array of length 5, two cell changes each. The prefix sum of D is the final array: [-2, 0, 3, 5, 3]."}
```

```python
def range_addition(length, updates):     # each update: [start, end, inc], inclusive
    diff = [0] * (length + 1)            # one extra slot for end + 1
    for start, end, inc in updates:
        diff[start] += inc               # the increase starts here...
        diff[end + 1] -= inc             # ...and stops after end
    out, running = [], 0
    for i in range(length):
        running += diff[i]
        out.append(running)
    return out
```

```java
int[] rangeAddition(int length, int[][] updates) {   // each update: {start, end, inc}
    int[] diff = new int[length + 1];                // one extra slot for end + 1
    for (int[] u : updates) {
        diff[u[0]] += u[2];                          // the increase starts here...
        diff[u[1] + 1] -= u[2];                      // ...and stops after end
    }
    int[] out = new int[length];
    int running = 0;
    for (int i = 0; i < length; i++) {
        running += diff[i];
        out[i] = running;
    }
    return out;
}
```

```cpp
vector<int> rangeAddition(int length, const vector<array<int, 3>>& updates) {   // {start, end, inc}
    vector<int> diff(length + 1, 0);                 // one extra slot for end + 1
    for (const auto& [start, end, inc] : updates) {
        diff[start] += inc;                          // the increase starts here...
        diff[end + 1] -= inc;                        // ...and stops after end
    }
    vector<int> out(length);
    int running = 0;
    for (int i = 0; i < length; i++) {
        running += diff[i];
        out[i] = running;
    }
    return out;
}
```

O(n + u) for `u` updates, instead of O(n · u). Where difference arrays show up:

- **Car pooling and flight bookings**: each trip adds passengers on a range of stops; check whether the running total ever exceeds capacity.
- **Counting overlaps**: `+1` at each interval's start and `−1` just after its end; the running sum is how many intervals cover each point. With large coordinates, store the `±1` events in a sorted map (a "sweep line").
- **2D**: a rectangle update touches four corners (`+v`, `−v`, `−v`, `+v`), and a 2D prefix sum recovers the grid.

## Prefix XOR and products

Prefix sums work because subtraction undoes addition. Any operation with an inverse works the same way.

### Prefix XOR

XOR is its own inverse (`x ^ x = 0`), so with `X[0] = 0` and `X[i + 1] = X[i] ^ nums[i]`:

`xor(l, r) = X[r + 1] ^ X[l]`

For `[1, 3, 4, 8]` the prefix XORs are `[0, 1, 2, 6, 14]`, so `xor(1, 2) = X[3] ^ X[1] = 6 ^ 1 = 7`, which is `3 ^ 4`. The hash map trick carries over too: count subarrays whose XOR equals `k` by looking up `current ^ k` among earlier prefixes. More XOR tricks in [bit manipulation](/learn/bit-manipulation).

### Prefix and suffix products

Products have an inverse (division) only when nothing is zero, so problems avoid it. **Product of array except self** asks for `out[i]` = the product of every element except `nums[i]`, without division. Split it into the product of everything to the left of `i` (a prefix product) and everything to the right (a suffix product):

```diagram
{"type":"array","rows":[{"label":"nums","values":[1,2,3,4]},{"label":"left of i","values":[1,1,2,6]},{"label":"right of i","values":[24,12,4,1]},{"label":"left × right","values":[24,12,8,6],"highlight":[0,1,2,3]}],"caption":"out[2] = (1 × 2) × (4) = 8. The left products are an exclusive prefix product; the right ones are a suffix product."}
```

```python
def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    left = 1
    for i in range(n):                   # out[i] = product of everything left of i
        out[i] = left
        left *= nums[i]
    right = 1
    for i in range(n - 1, -1, -1):       # times the product of everything right of i
        out[i] *= right
        right *= nums[i]
    return out
```

```java
int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] out = new int[n];
    int left = 1;
    for (int i = 0; i < n; i++) {        // out[i] = product of everything left of i
        out[i] = left;
        left *= nums[i];
    }
    int right = 1;
    for (int i = n - 1; i >= 0; i--) {   // times the product of everything right of i
        out[i] *= right;
        right *= nums[i];
    }
    return out;
}
```

```cpp
vector<int> productExceptSelf(const vector<int>& nums) {
    int n = nums.size();
    vector<int> out(n, 1);
    int left = 1;
    for (int i = 0; i < n; i++) {        // out[i] = product of everything left of i
        out[i] = left;
        left *= nums[i];
    }
    int right = 1;
    for (int i = n - 1; i >= 0; i--) {   // times the product of everything right of i
        out[i] *= right;
        right *= nums[i];
    }
    return out;
}
```

O(n) time and O(1) extra space beyond the output: the left products are written straight into `out`, and the right products are folded in on the way back. Zeros need no special handling. The same prefix-and-suffix split solves "trapping rain water" (the highest wall to the left and to the right of each position) and many "best split point" problems.

## Contribution counting

Some questions ask for a total over **every subarray**: the sum of all odd-length subarrays, the sum of every subarray's minimum. There are O(n²) subarrays, so listing them is slow. Turn the sum around instead: for each element, count **how many subarrays include it** (or take it as their minimum), and add `value × count`. This is the **contribution technique**.

The count comes from choosing the two ends independently. A subarray containing index `i` starts at one of the `i + 1` positions `0..i` and ends at one of the `n − i` positions `i..n−1`, so `(i + 1) · (n − i)` subarrays contain it.

*Sum of all odd-length subarrays* needs only the odd-length ones. The length is odd exactly when the start and the end are at distances from `i` with the **same parity** (both even or both odd). So count the starts at even and odd distances on the left, the ends on the right, and pair them up. With `n = 5` and `i = 2`: starts at distance 0 or 2 (two even) and 1 (one odd), ends at 0 or 2 (two even) and 1 (one odd), so 2 · 2 + 1 · 1 = 5 of the 9 subarrays through index 2 have odd length.

```python
def sum_odd_length_subarrays(arr):
    # Each value adds itself once per odd-length subarray holding it
    # Odd length = start and end same distance parity from i
    n = len(arr)
    total = 0
    for i, x in enumerate(arr):
        # starts at even / odd distance left of i (i itself = distance 0)
        left_even, left_odd = i // 2 + 1, (i + 1) // 2
        # ends at even / odd distance right of i
        right_even, right_odd = (n - 1 - i) // 2 + 1, (n - i) // 2
        total += x * (left_even * right_even + left_odd * right_odd)
    return total
```

```java
int sumOddLengthSubarrays(int[] arr) {
    // Each value adds itself once per odd-length subarray holding it
    // Odd length = start and end same distance parity from i
    int n = arr.length, total = 0;
    for (int i = 0; i < n; i++) {
        // starts at even / odd distance left of i (i itself = distance 0)
        int leftEven = i / 2 + 1, leftOdd = (i + 1) / 2;
        // ends at even / odd distance right of i
        int rightEven = (n - 1 - i) / 2 + 1, rightOdd = (n - i) / 2;
        total += arr[i] * (leftEven * rightEven + leftOdd * rightOdd);
    }
    return total;
}
```

```cpp
int sumOddLengthSubarrays(const vector<int>& arr) {
    // Each value adds itself once per odd-length subarray holding it
    // Odd length = start and end same distance parity from i
    int n = arr.size(), total = 0;
    for (int i = 0; i < n; i++) {
        // starts at even / odd distance left of i (i itself = distance 0)
        int leftEven = i / 2 + 1, leftOdd = (i + 1) / 2;
        // ends at even / odd distance right of i
        int rightEven = (n - 1 - i) / 2 + 1, rightOdd = (n - i) / 2;
        total += arr[i] * (leftEven * rightEven + leftOdd * rightOdd);
    }
    return total;
}
```

**O(n) time, O(1) space**, against O(n²) or worse for listing the subarrays. A shortcut you'll see is `((i + 1) · (n − i) + 1) / 2`: of all the subarrays through `i`, half rounded up have odd length.

Other places the same reversal appears:

- **Sum of subarray minimums**: element `i` is the minimum of the subarrays that stay between the nearest smaller value on its left and on its right, found with a [monotonic stack](/learn/stacks-queues#sum-of-subarray-minimums). Its count is `(i − left) · (right − i)`. With equal values, stop at a strictly smaller value on one side and at a smaller-or-equal value on the other, or a subarray with two equal minimums is counted twice.
- **Sum of subarray ranges**: the sum of maximums minus the sum of minimums, each by contribution.
- **Total appeal or unique characters of all substrings**: each character counts for the substrings where it's the first (or only) copy of its letter.

The pitfall is **double counting**. Before adding `value × count`, make sure every subarray is credited to exactly one element (or to each element exactly once).

## Counting prefix-sum pairs in a range

*Count of range sum*: count the subarrays whose sum lies in `[lower, upper]`. In prefix sums, `nums[i..j-1]` qualifies when

`lower ≤ P[j] − P[i] ≤ upper`, that is, `P[j] − upper ≤ P[i] ≤ P[j] − lower`.

So scan `j` from left to right, and for each one count the **earlier** prefixes that fall in a band of values. The hash map from subarray sum equals k answers "how many equal x?", not "how many lie between a and b?". For that you need a structure that counts values in a range, and there are two standard ways to get one in O(n log n).

### Fenwick tree with coordinate compression

A **Fenwick tree** (**binary indexed tree**) keeps counts over positions `1..m` and supports "add 1 at position r" and "how many at positions 1..r?", each in O(log m). Cell `tree[r]` covers the `lowbit(r)` positions ending at `r`, where `lowbit(r) = r & -r` is the lowest set bit (see [bit manipulation](/learn/bit-manipulation)). Adding walks up with `r += r & -r`; counting walks down with `r -= r & -r`. Either walk visits at most log₂ m cells.

Its positions are array indices, but prefix sums can be negative or as large as 10¹⁴. **Coordinate compression** fixes that: collect the values, sort them, remove duplicates, and replace each value by its **rank** (its position in that sorted list). Only the order of the values matters for "how many lie between", and ranks keep the order while shrinking the range to `1..m`, where `m` is at most the number of values. Look a value's rank up with a binary search (or a dictionary built once).

Here only the prefixes need ranks: the band ends `P[j] − upper` and `P[j] − lower` don't have to be prefix values themselves, because a binary search turns them into index boundaries in the sorted list.

1. Build the prefixes and compress them.
2. For each prefix `p` in order, find the slice `[lo, hi)` of the sorted list that lies inside `[p − upper, p − lower]`, and count how many stored prefixes fall in it: `count_below(hi) − count_below(lo)`.
3. Then store `p` itself. Storing after counting is what restricts pairs to earlier `i`.

For `nums = [-2, 5, -1]` and the range `[-2, 2]`, the answer is 3: `[-2]`, `[-1]` and `[-2, 5, -1]`.

```python
from bisect import bisect_left, bisect_right

def count_range_sum(nums, lower, upper):
    # Sum of nums[i..j-1] = P[j] - P[i], in range when P[i] in [P[j] - upper, P[j] - lower]
    # Scan j; Fenwick tree counts earlier prefixes in that band
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    # coordinate compression (sorted distinct prefixes; rank = index + 1)
    vals = sorted(set(prefix))
    # tree[r] (count of stored ranks in (r - lowbit(r), r]), 1-based
    tree = [0] * (len(vals) + 1)

    # stored prefixes whose index in vals is below r
    def count_below(r):
        total = 0
        while r > 0:
            total += tree[r]
            r -= r & -r
        return total

    ans = 0
    for p in prefix:
        # band [p - upper, p - lower] as index range [lo, hi) in vals
        lo = bisect_left(vals, p - upper)
        hi = bisect_right(vals, p - lower)
        ans += count_below(hi) - count_below(lo)
        # store after counting, ensuring only earlier prefixes pair with p
        r = bisect_left(vals, p) + 1
        # every node whose range covers rank r
        while r < len(tree):
            tree[r] += 1
            r += r & -r
    return ans
```

```java
int countRangeSum(int[] nums, int lower, int upper) {
    // Sum of nums[i..j-1] = P[j] - P[i], in range when P[i] in [P[j] - upper, P[j] - lower]
    // Scan j; Fenwick tree counts earlier prefixes in that band
    int n = nums.length;
    long[] prefix = new long[n + 1];
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    // coordinate compression (sorted distinct prefixes; rank = index + 1)
    long[] vals = Arrays.stream(prefix).distinct().sorted().toArray();
    // tree[r] (count of stored ranks in (r - lowbit(r), r]), 1-based
    int[] tree = new int[vals.length + 1];
    int ans = 0;
    for (long p : prefix) {
        // band [p - upper, p - lower] as index range [lo, hi) in vals
        int lo = firstAtLeast(vals, p - upper), hi = firstAtLeast(vals, p - lower + 1);
        ans += countBelow(tree, hi) - countBelow(tree, lo);
        // store after counting, ensuring only earlier prefixes pair with p
        int rank = firstAtLeast(vals, p) + 1;
        // every node whose range covers rank
        for (int r = rank; r < tree.length; r += r & -r) tree[r]++;
    }
    return ans;
}

// index of first value >= x (vals.length if none)
int firstAtLeast(long[] vals, long x) {
    int lo = 0, hi = vals.length;
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (vals[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// stored prefixes whose index in vals is below r
int countBelow(int[] tree, int r) {
    int total = 0;
    for (; r > 0; r -= r & -r) total += tree[r];
    return total;
}
```

```cpp
int countRangeSum(const vector<int>& nums, int lower, int upper) {
    // Sum of nums[i..j-1] = P[j] - P[i], in range when P[i] in [P[j] - upper, P[j] - lower]
    // Scan j; Fenwick tree counts earlier prefixes in that band
    int n = nums.size();
    vector<long long> prefix(n + 1, 0);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    // coordinate compression (sorted distinct prefixes; rank = index + 1)
    vector<long long> vals = prefix;
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    // tree[r] (count of stored ranks in (r - lowbit(r), r]), 1-based
    vector<int> tree(vals.size() + 1, 0);
    // stored prefixes whose index in vals is below r
    auto countBelow = [&](int r) {
        int total = 0;
        for (; r > 0; r -= r & -r) total += tree[r];
        return total;
    };
    int ans = 0;
    for (long long p : prefix) {
        // band [p - upper, p - lower] as index range [lo, hi) in vals
        int lo = lower_bound(vals.begin(), vals.end(), p - upper) - vals.begin();
        int hi = upper_bound(vals.begin(), vals.end(), p - lower) - vals.begin();
        ans += countBelow(hi) - countBelow(lo);
        // store after counting, ensuring only earlier prefixes pair with p
        int rank = lower_bound(vals.begin(), vals.end(), p) - vals.begin() + 1;
        // every node whose range covers rank
        for (int r = rank; r < (int)tree.size(); r += r & -r) tree[r]++;
    }
    return ans;
}
```

**O(n log n) time, O(n) space.** Pitfalls:

- **Inserting before counting**, which pairs a prefix with itself (an empty subarray, counted whenever 0 is in range).
- **Forgetting `P[0] = 0`**, which loses every subarray that starts at index 0.
- **Overflow.** Sums of 10⁵ values near 2³¹ need 64-bit prefixes, and so do the band ends `p − upper`.
- **Off-by-one in the ranks.** A Fenwick tree is 1-based: rank 0 would loop forever in `r += r & -r`.

### Merge sort counting

The other method sorts the prefix array with [merge sort](/learn/sorting) and counts during each merge. When the two sorted halves are about to be merged, every pair (left element, right element) has the left one earlier in the array. For each left value `a`, the right values in `[a + lower, a + upper]` form a contiguous run of the sorted right half, and as `a` increases both ends of the run only move right. Two pointers find every run in O(length) per merge, so the total is O(n log n), with no compression needed.

Both methods solve the other "count pairs `i < j` with a condition on values" problems: *count of smaller numbers after self*, *reverse pairs* (`nums[i] > 2 · nums[j]`), and counting inversions.

## When prefix sums fit

| Situation | Tool |
|---|---|
| Static array, many range-sum queries | prefix sums: O(n) build, O(1) query |
| Many range updates, then read everything once | difference array |
| Updates and queries interleaved | Fenwick tree or segment tree: O(log n) each |
| Range minimum or maximum | not invertible: sparse table, segment tree, or a monotonic deque for sliding windows |
| Subarray sums with negative numbers | prefix sums plus a hash map |
| Shortest subarray with sum at least k, negatives allowed | prefix sums plus a monotonic deque |
| Count subarrays with sum in a range | prefix sums plus a Fenwick tree or merge sort |
| Total over every subarray | contribution counting |

The requirement is an **invertible** operation: you must be able to "subtract" the part before `l`. Sum, XOR and count work; min and max don't, because knowing the minimum of `nums[0..r]` and of `nums[0..l-1]` tells you nothing about the minimum of `nums[l..r]`.

## Pitfalls

- **Off-by-one.** With `P` of length `n + 1`, the sum of `nums[l..r]` is `P[r + 1] − P[l]`. Mixing that with a length-`n` inclusive prefix array is the most common bug. Pick one convention.
- **Forgetting `{0: 1}`** (or `{0: -1}` for "longest") in the hash map version, which misses subarrays starting at index 0.
- **Overflow.** Prefix sums grow; use `long` or `long long` in Java and C++.
- **Negative remainders** in Java and C++ when keying by `prefix % k`.
- **Updating the map before looking up**, which counts a subarray of length 0 when `k = 0`.
- **Difference array size.** It needs `n + 1` slots, or a bounds check, for the `r + 1` write.
