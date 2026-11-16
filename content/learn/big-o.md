---
title: Big-O & complexity
summary: How to measure an algorithm's time and space as the input grows, analyze loops and recursion, and read input limits to guess the complexity a problem expects.
related: arrays-strings, recursion-backtracking, sorting, hashing, dynamic-programming
terms:
  - Big-O
  - Big O
  - Big-O notation
  - time complexity
  - space complexity #space-complexity
  - auxiliary space #space-complexity
  - amortized #amortized-cost
  - amortized analysis #amortized-cost
  - Master theorem #a-light-master-theorem
  - worst case #best-average-and-worst-case
  - average case #best-average-and-worst-case
  - logarithmic time #the-common-classes
  - quadratic time #the-common-classes
  - geometric series #summing-loop-costs
  - harmonic series #summing-loop-costs
---

## What Big-O measures

Timing code in seconds tells you about one machine and one input. Interviews ask a different question: **how does the work grow as the input grows?** Count the basic steps (comparisons, additions, array reads) as a function of the input size `n`, then keep only the part that dominates for large `n`.

**Big-O** gives an upper bound on that growth. Formally, `f(n) = O(g(n))` if there are constants `c` and `n₀` such that `f(n) ≤ c · g(n)` for every `n ≥ n₀`. In practice that means two rules:

- **Drop constants.** `3n` and `n/2` are both O(n). Constants depend on the language and hardware; growth doesn't.
- **Keep only the dominant term.** `2n² + 100n + 7` is O(n²), because for large `n` the `n²` term swamps the rest.

| Exact step count | Big-O |
|---|---|
| `5n + 3` | O(n) |
| `n² / 2 + n` | O(n²) |
| `4 log n + 10` | O(log n) |
| `n log n + n` | O(n log n) |
| `1,000,000` | O(1) |

Two related symbols: **Big-Omega** (Ω) is a lower bound and **Big-Theta** (Θ) is a tight bound (both upper and lower). Strictly, binary search is also O(n), since an upper bound can be loose. In interviews "O" almost always means the tightest bound you can state, so give that.

The base of a logarithm doesn't matter: `log₂ n` and `log₁₀ n` differ by a constant factor, so both are just O(log n).

## The common classes

| Class | Name | Example |
|---|---|---|
| O(1) | constant | read `a[i]`, push to a stack, hash map lookup (average) |
| O(log n) | logarithmic | binary search, one operation on a balanced tree or heap |
| O(n) | linear | one pass over an array, counting, BFS over `n` nodes |
| O(n log n) | linearithmic | sorting, `n` heap operations |
| O(n²) | quadratic | all pairs, a nested loop, 2D DP over two strings |
| O(n³) | cubic | all triples, Floyd-Warshall |
| O(2ⁿ) | exponential | all subsets |
| O(n!) | factorial | all permutations |

**Logarithmic time** comes from halving: after `k` halvings, `n / 2ᵏ = 1` when `k = log₂ n`, so a million items take about 20 steps. **Quadratic time** comes from pairing every element with every other: a million items means about 5 × 10¹¹ pairs, which is far too slow.

```diagram
{"type":"complexity","curves":["1","log n","n","n log n","n^2","2^n"],"highlight":["n","n log n"],"caption":"Growth curves. O(n) and O(n log n) are the usual targets; O(n²) and O(2ⁿ) explode as n grows."}
```

## Analyzing loops

### Sequential and nested loops

- **Sequential** blocks add: a loop over `n` followed by a loop over `m` is O(n + m). Keep both variables; don't collapse them into one `n` unless they really are the same size.
- **Nested** loops multiply: for each of `n` outer iterations, the inner loop runs `m` times, so O(n · m).
- A triangular loop (`j` from `i + 1` to `n`) runs `n(n − 1)/2` times. That's still O(n²): halving doesn't change the class.

The same problem can land in different classes depending on the approach. "Does the array contain a duplicate?":

```python
def contains_duplicate_pairs(nums):      # O(n^2) time, O(1) extra space
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False

def contains_duplicate_sort(nums):       # O(n log n) time, O(n) for the copy
    s = sorted(nums)
    return any(s[i] == s[i + 1] for i in range(len(s) - 1))

def contains_duplicate_set(nums):        # O(n) time, O(n) space
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
```

```java
boolean containsDuplicatePairs(int[] nums) {   // O(n^2) time, O(1) extra space
    for (int i = 0; i < nums.length; i++)
        for (int j = i + 1; j < nums.length; j++)
            if (nums[i] == nums[j]) return true;
    return false;
}

boolean containsDuplicateSort(int[] nums) {    // O(n log n) time, O(n) for the copy
    int[] s = nums.clone();
    Arrays.sort(s);
    for (int i = 0; i + 1 < s.length; i++)
        if (s[i] == s[i + 1]) return true;
    return false;
}

boolean containsDuplicateSet(int[] nums) {     // O(n) time, O(n) space
    Set<Integer> seen = new HashSet<>();
    for (int x : nums)
        if (!seen.add(x)) return true;         // add() returns false if x was already there
    return false;
}
```

```cpp
bool containsDuplicatePairs(const vector<int>& nums) {  // O(n^2) time, O(1) extra space
    for (size_t i = 0; i < nums.size(); i++)
        for (size_t j = i + 1; j < nums.size(); j++)
            if (nums[i] == nums[j]) return true;
    return false;
}

bool containsDuplicateSort(vector<int> nums) {          // O(n log n); takes a copy
    sort(nums.begin(), nums.end());
    for (size_t i = 0; i + 1 < nums.size(); i++)
        if (nums[i] == nums[i + 1]) return true;
    return false;
}

bool containsDuplicateSet(const vector<int>& nums) {    // O(n) time, O(n) space
    unordered_set<int> seen;
    for (int x : nums)
        if (!seen.insert(x).second) return true;        // second is false if x was already there
    return false;
}
```

This trade of memory for time (a set instead of a nested loop) is the most common optimization in interviews. See [hash maps & sets](/learn/hashing).

### Loops that halve or double

A loop whose counter doubles (`i *= 2`) or halves (`n //= 2`) runs O(log n) times. Watch for the nested version: an outer loop that halves `n` with an inner loop over the current size does `n + n/2 + n/4 + … < 2n` steps, which is O(n), not O(n log n).

### Summing loop costs

When the inner loop's length depends on the outer counter, don't multiply the longest inner run by the number of outer iterations. Add up what each outer iteration really costs. Four sums cover most interview loops:

| Inner loop runs | Sum | Total |
|---|---|---|
| 1, 2, 4, …, n times (doubling) | **geometric series** `1 + 2 + 4 + … + n` | less than 2n: **O(n)** |
| n/1, n/2, n/3, …, n/n times | **harmonic series** `n · (1 + 1/2 + … + 1/n)` | about n ln n: **O(n log n)** |
| about √i times, for i = 1 … n | `√1 + √2 + … + √n` | about (2/3) n√n: **O(n√n)** |
| i times, for i = 1 … n | `1 + 2 + … + n` | n(n + 1)/2: **O(n²)** |

Why each one holds:

- **Geometric**: each term doubles the one before, so the last term is bigger than all the earlier ones together, and the sum is less than twice the largest term. Any ratio above 1 behaves the same way: the biggest term dominates. That's the doubling-array argument in [amortized cost](/learn/big-o#amortized-cost), and why halving `n` with a scan of the current size is O(n).
- **Harmonic**: `1 + 1/2 + 1/3 + … + 1/n` grows like `ln n` (it's about `ln n + 0.58`). Multiplied by `n`, that's O(n log n). The outer loop runs `n` times, but most inner loops are short.
- **Square roots**: every term is at most `√n`, so the sum is at most `n√n`; the upper half of the terms are each at least `√(n/2)`, so it's also at least `(n/2)·√(n/2)`. Both bounds are of order `n√n` = n^1.5. For n = 10⁵ that's about 3 × 10⁷ steps, fine; n² would be 10¹⁰.

The harmonic sum in practice: count the divisors of every number up to `n` by visiting the multiples of each `d`.

```python
def divisor_counts(n):                   # cnt[k] = number of divisors of k, for k <= n
    cnt = [0] * (n + 1)
    for d in range(1, n + 1):
        for m in range(d, n + 1, d):     # the n // d multiples of d
            cnt[m] += 1
    return cnt
```

```java
int[] divisorCounts(int n) {             // cnt[k] = number of divisors of k, for k <= n
    int[] cnt = new int[n + 1];
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d)  // the n / d multiples of d
            cnt[m]++;
    return cnt;
}
```

```cpp
vector<int> divisorCounts(int n) {       // cnt[k] = number of divisors of k, for k <= n
    vector<int> cnt(n + 1, 0);
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d)  // the n / d multiples of d
            cnt[m]++;
    return cnt;
}
```

The inner loop for `d` runs `n / d` times, so the total is the harmonic sum, O(n log n). Testing each `k` separately by trial division up to `√k` is the third row, O(n√n).

The common pitfall is getting the inner bound wrong. The harmonic bound needs a loop that *steps by* `d` (`m += d`). Looping over every `m` up to `n` and testing `m % d == 0` costs `n` per `d`, which is O(n²). In the other direction, the sieve of Eratosthenes only runs the inner loop for primes `p`, and the sum of `n / p` over primes is O(n log log n), smaller still.

### Pointers that only move forward

Two nested `while` loops are not automatically O(n²). In a [sliding window](/learn/sliding-window) or [two-pointer](/learn/two-pointers) scan, each pointer only moves forward and never past `n`, so the total number of moves is at most `2n`. Count how many times each element is touched over the whole run, not per outer iteration.

## Recursion

For a recursive function, count the calls and the work per call. Drawing the **recursion tree** (one node per call) makes this concrete.

- **One call, shrinking by a constant factor** (binary search): `T(n) = T(n/2) + O(1)`, a chain of `log n` calls, so O(log n).
- **Two calls, each on half** (merge sort): `T(n) = 2T(n/2) + O(n)`. Every level of the tree does O(n) work in total and there are `log₂ n` levels: O(n log n).
- **Several calls, shrinking by 1** (naive Fibonacci, subsets): `T(n) = 2T(n − 1) + O(1)`. The tree has up to `branches^depth` nodes, so O(2ⁿ).

```diagram
{"type":"tree","values":["n","n/2","n/2","n/4","n/4","n/4","n/4"],"caption":"Merge sort's recursion tree: each level does n work in total (n, 2 × n/2, 4 × n/4) and there are log₂ n levels."}
```

### A light Master theorem

Divide-and-conquer recurrences of the form `T(n) = a · T(n/b) + O(n^d)` (split into `a` parts of size `n/b`, then do `n^d` work to combine) have a shortcut. Compare `a` with `b^d`:

| Case | Result | Example |
|---|---|---|
| `a < b^d` | O(n^d) | `T(n/2) + O(n)`: halve and scan, O(n) |
| `a = b^d` | O(n^d log n) | merge sort `2T(n/2) + O(n)`: O(n log n); binary search `T(n/2) + O(1)`: O(log n) |
| `a > b^d` | O(n^(log_b a)) | tree traversal `2T(n/2) + O(1)`: O(n); Karatsuba `3T(n/2) + O(n)`: O(n^1.585) |

Intuitively: either the root's work dominates, every level costs the same, or the leaves dominate. The theorem doesn't cover `T(n − 1)` recurrences; for those, count the nodes in the tree directly. More on recursion trees in [recursion & backtracking](/learn/recursion-backtracking).

## Amortized cost

Some operations are usually cheap but occasionally expensive. **Amortized analysis** averages the cost over a whole sequence of operations, with no randomness involved: it's a guarantee about the total.

The standard example is appending to a dynamic array (Python `list`, Java `ArrayList`, C++ `vector`). When the array is full, it allocates a bigger block (say, double the capacity) and copies everything over. That single append is O(n), but it only happens at sizes 1, 2, 4, 8, … so `n` appends copy at most `1 + 2 + 4 + … + n < 2n` elements in total. The total is O(n), so each append is **amortized O(1)**.

```diagram
{"type":"array","rows":[{"label":"cap 1","values":[1],"highlight":[0]},{"label":"cap 2","values":[1,2],"highlight":[1]},{"label":"cap 4","values":[1,2,3,""],"highlight":[2],"dim":[3]},{"label":"cap 8","values":[1,2,3,4,5,"","",""],"highlight":[4],"dim":[5,6,7]}],"caption":"Appending 1 to 5 with doubling: growing copies 1, then 2, then 4 elements (7 in total). n appends copy fewer than 2n elements."}
```

The growth must be *multiplicative*. Growing by a fixed 10 slots each time makes `n` appends cost O(n²). Other amortized O(1) results you'll meet: a queue built from two stacks, hash table resizing, and monotonic stacks (each element is pushed once and popped at most once).

Don't confuse amortized with average case. Amortized is a worst-case bound on a sequence; average case is an expectation over random inputs.

## Space complexity

**Space complexity** counts the extra memory an algorithm allocates as a function of `n`. Usually you report **auxiliary space**, which excludes the input, and (say so explicitly) often excludes the output too.

What counts:

- New arrays, strings, sets and maps you build: a `seen` set of up to `n` items is O(n).
- **The recursion stack.** Every active call holds a frame, so recursion depth `d` costs O(d) space even if each call allocates nothing.
- Copies made by slicing or concatenation.

```python
def total_recursive(nums, i=0):     # O(n) time, O(n) stack
    if i == len(nums):
        return 0
    return nums[i] + total_recursive(nums, i + 1)

def total_iterative(nums):          # O(n) time, O(1) extra space
    s = 0
    for x in nums:
        s += x
    return s
```

```java
int totalRecursive(int[] nums, int i) {   // O(n) time, O(n) stack
    if (i == nums.length) return 0;
    return nums[i] + totalRecursive(nums, i + 1);
}

int totalIterative(int[] nums) {          // O(n) time, O(1) extra space
    int s = 0;
    for (int x : nums) s += x;
    return s;
}
```

```cpp
int totalRecursive(const vector<int>& nums, size_t i = 0) {  // O(n) time, O(n) stack
    if (i == nums.size()) return 0;
    return nums[i] + totalRecursive(nums, i + 1);
}

int totalIterative(const vector<int>& nums) {                // O(n) time, O(1) extra space
    int s = 0;
    for (int x : nums) s += x;
    return s;
}
```

Both versions are O(n) time, but the recursive one needs `n` stack frames. In Python it fails past about 1,000 elements (the default recursion limit). Writing it as `nums[0] + total(nums[1:])` is worse still: each slice copies the rest of the list, making it O(n²) time and space.

A balanced binary tree traversal uses O(log n) stack; a degenerate one (a "stick") uses O(n). See [binary trees](/learn/trees).

## Best, average and worst case

One algorithm can have different costs on different inputs of the same size:

| Algorithm | Best | Average | Worst |
|---|---|---|---|
| Linear search | O(1) (first element) | O(n) | O(n) |
| Insertion sort | O(n) (already sorted) | O(n²) | O(n²) |
| Quicksort | O(n log n) | O(n log n) | O(n²) (bad pivots) |
| Hash map lookup | O(1) | O(1) | O(n) (all keys collide) |
| Merge sort | O(n log n) | O(n log n) | O(n log n) |

The **worst case** is the guarantee. The **average case** is the expected cost over random inputs (or random choices inside the algorithm, like a random pivot). Best case is rarely interesting. In interviews, state the worst case by default, and say "expected" or "average" when you rely on hashing or randomization, as in "O(n) expected time with a hash set".

## From input size to target complexity

Constraints are a hint. A judge runs roughly 10⁸ simple operations per second in C++ or Java (Python is around 10 to 50 times slower), and limits are usually 1 to 2 seconds. That gives a quick table:

| `n` up to | Feasible complexity | Typical approach |
|---|---|---|
| 10 | O(n!) | try every permutation |
| 20 | O(2ⁿ) or O(n · 2ⁿ) | every subset, bitmask DP |
| 500 | O(n³) | triple loop, Floyd-Warshall, interval DP |
| 10⁴ | O(n²) | all pairs, 2D DP |
| 10⁶ | O(n log n) | sort, heap, binary search per element |
| 10⁸ | O(n) | one pass, counting, two pointers |
| beyond | O(log n) or O(1) | binary search on the answer, a formula |

If `n ≤ 10⁵` and your idea is O(n²), it's too slow: look for sorting, hashing, a heap or a single pass. If `n ≤ 15`, exponential search is probably intended.

## Pitfalls

Hidden loops make "one line" expensive:

| Looks cheap | Really costs | Use instead |
|---|---|---|
| `x in some_list`, `list.contains(x)`, `std::find` | O(n) | a set |
| `list.pop(0)`, `ArrayList.remove(0)`, `v.erase(v.begin())` | O(n) (shifts everything) | a deque |
| slicing, `substring`, `substr` | O(length of the slice) | indices |
| `s = s + t` in a loop | O(len(s)) per step | a list and `join`, `StringBuilder` |
| `min(list)`, `max(list)` inside a loop | O(n) per call | track a running min/max |

- **Two inputs, two variables.** Merging lists of sizes `n` and `m` is O(n + m); comparing every pair is O(n · m).
- **Numbers as input.** A loop up to a value `target` is O(target), which can be huge even when the array is tiny (this is called pseudo-polynomial time).
- **Sorting is not free.** Sorting first makes the whole solution at least O(n log n).
- **Recursion depth is space.** Mention it when you state space complexity.
