---
title: Binary search
summary: Halve the search space every step: two loop templates and how to pick one, lower and upper bound, binary search on the answer, rotated arrays, and the built-ins in each language.
related: arrays-strings, sorting, two-pointers, trees
terms:
  - binary search
  - lower bound #lower-bound-and-upper-bound
  - upper bound #lower-bound-and-upper-bound
  - lower_bound #lower-bound-and-upper-bound
  - upper_bound #lower-bound-and-upper-bound
  - bisect #built-ins
  - bisect_left #built-ins
  - binary search on the answer #binary-search-on-the-answer
  - search on the answer #binary-search-on-the-answer
  - monotonic predicate #binary-search-on-the-answer
  - rotated sorted array #rotated-sorted-arrays
  - rotated sorted arrays #rotated-sorted-arrays
  - staircase search #sorted-matrix-staircase-search
  - search a 2D matrix II #sorted-matrix-staircase-search
  - search a 2D matrix #fully-sorted-matrix-one-flat-array
  - exponential search #unknown-length-exponential-search
  - galloping search #unknown-length-exponential-search
---

## The idea

Guess a number between 1 and 100, and after each guess you're told "higher" or "lower". The best strategy is to guess the middle every time: each answer throws away half of what's left, so you need at most 7 guesses. That's **binary search**.

On a sorted array it works the same way. Look at the middle element. If it's the target, stop. If it's smaller than the target, the target can only be to the right, so discard the left half; otherwise discard the right half. Each step halves the range, so an array of `n` elements takes about `log₂ n` steps: 20 for a million elements, 30 for a billion.

```diagram
{"type":"array","rows":[{"label":"step 1","values":[2,5,8,12,16,23,38,56,72,91],"pointers":{"lo":0,"mid":4,"hi":9},"highlight":[4]},{"label":"step 2","values":[2,5,8,12,16,23,38,56,72,91],"pointers":{"lo":5,"mid":7,"hi":9},"highlight":[7],"dim":[0,1,2,3,4]},{"label":"step 3","values":[2,5,8,12,16,23,38,56,72,91],"pointers":{"lo=mid":5,"hi":6},"highlight":[5],"dim":[0,1,2,3,4,7,8,9]}],"caption":"Searching for 23: 16 is too small (go right), 56 is too big (go left), then 23 is found."}
```

The array doesn't strictly have to be sorted. What binary search needs is a question you can ask about the middle that tells you which half to keep. "Is `a[mid]` at least the target?" works on a sorted array. "Can I finish in time at speed `mid`?" works on a range of speeds. Spotting that kind of question is most of the skill.

## Template 1: exact match (lo <= hi)

Every correct binary search keeps an **invariant**: a statement about `lo` and `hi` that is true before every iteration. For an exact match the invariant is "if the target is in the array, it's in `nums[lo..hi]`", a closed range with both ends included.

- Start with `lo = 0`, `hi = n - 1` (the whole array).
- The range is non-empty while `lo <= hi`, so that's the loop condition.
- `mid` has already been checked, so both updates skip past it: `lo = mid + 1` or `hi = mid - 1`.
- If the loop ends, the range is empty and the target isn't there.

```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1          # target, if present, is in nums[lo..hi]
    while lo <= hi:                    # the range is not empty
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1               # target is right of mid
        else:
            hi = mid - 1               # target is left of mid
    return -1
```

```java
int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;  // target, if present, is in nums[lo..hi]
    while (lo <= hi) {                 // the range is not empty
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

```cpp
int search(const vector<int>& nums, int target) {
    int lo = 0, hi = (int)nums.size() - 1;  // target, if present, is in nums[lo..hi]
    while (lo <= hi) {                      // the range is not empty
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

**O(log n) time, O(1) space.** With duplicates this returns *some* matching index, not necessarily the first. When you need the first or the last, use the second template.

## Template 2: first true (lo < hi)

Most binary search problems are really this one: you have a condition that is false for a prefix of the range and true for the rest (`F F F T T T`), and you want the **first true** position. The invariant is "the answer is in `[lo, hi]`", and the answer is allowed to be `n`, meaning "nothing is true".

- Start with `lo = 0`, `hi = n` (not `n - 1`: "none" is a valid answer).
- If the condition holds at `mid`, then `mid` might be the answer, so keep it: `hi = mid`.
- Otherwise the answer is after `mid`: `lo = mid + 1`.
- Loop while `lo < hi`. When they meet, `lo` is the answer. No `-1` case, no check inside the loop.

```python
def lower_bound(nums, x):
    """First index i with nums[i] >= x, or len(nums) if there is none."""
    lo, hi = 0, len(nums)              # the answer is in [lo, hi]
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] >= x:             # mid could be the answer: keep it
            hi = mid
        else:                          # mid is too small: drop it
            lo = mid + 1
    return lo                          # lo == hi
```

```java
int lowerBound(int[] nums, int x) {
    int lo = 0, hi = nums.length;      // the answer is in [lo, hi]
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= x) hi = mid;  // mid could be the answer: keep it
        else lo = mid + 1;             // mid is too small: drop it
    }
    return lo;                         // lo == hi
}
```

```cpp
int lowerBound(const vector<int>& nums, int x) {
    int lo = 0, hi = nums.size();      // the answer is in [lo, hi]
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= x) hi = mid;  // mid could be the answer: keep it
        else lo = mid + 1;             // mid is too small: drop it
    }
    return lo;                         // lo == hi
}
```

Swap `nums[mid] >= x` for any condition with the `F…F T…T` shape and the same loop finds where it flips. That's why this template is worth memorising: it covers lower bound, upper bound, rotated arrays and binary search on the answer.

### Lower bound and upper bound

Two positions come up constantly in a sorted array:

- **Lower bound** of `x`: the first index with `a[i] >= x`. It's also where `x` would be inserted to keep the array sorted.
- **Upper bound** of `x`: the first index with `a[i] > x`. Same code with `>` instead of `>=`.

```diagram
{"type":"array","values":[1,2,4,4,4,7,9],"highlight":[2,3,4],"pointers":{"lower":2,"upper":5},"caption":"For x = 4: lower bound 2, upper bound 5. The 4s fill [lower, upper), so there are 5 - 2 = 3 of them."}
```

Together they answer most "sorted array" questions:

| Question | Answer |
|---|---|
| Is `x` present? | `lower < n and a[lower] == x` |
| First index of `x` | `lower` (if present) |
| Last index of `x` | `upper - 1` (if present) |
| How many copies of `x` | `upper - lower` |
| Elements `< x` | `lower` |
| Elements `<= x` | `upper` |
| Insert position | `lower` |

### Which interval contains a point

Given sorted, **disjoint** intervals (IP ranges, bookings in a calendar, memory segments) and a point `x`, which interval contains it? Only one interval can: the **last one that starts at or before `x`**. Every later interval starts after `x`, and every earlier one ends before that one starts.

1. Keep the starts in their own sorted array, built once.
2. `i = upper bound of x in starts, minus 1`: the last start `<= x`.
3. If `i < 0`, `x` comes before every interval. If `x > ends[i]`, it falls in the gap after interval `i`. Otherwise it's in interval `i`.

```diagram
{"type":"array","rows":[{"label":"starts","values":[1,5,10,15],"highlight":[2],"pointers":{"i":2,"upper":3}},{"label":"ends","values":[3,8,12,20],"highlight":[2]}],"caption":"Intervals [1,3], [5,8], [10,12], [15,20]. For x = 11, upper bound is 3, so i = 2, and 11 <= 12: it's in [10,12]. For x = 13, i is also 2, but 13 > 12, so it falls in a gap."}
```

```python
from bisect import bisect_right

def find_interval(starts, ends, x):
    # last interval starting at or before x
    i = bisect_right(starts, x) - 1
    # none starts by x, or x sits in gap after interval i
    if i < 0 or x > ends[i]:
        return -1
    return i
```

```java
int findInterval(int[] starts, int[] ends, int x) {
    // upper bound (first start > x)
    int lo = 0, hi = starts.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (starts[mid] > x) hi = mid;
        else lo = mid + 1;
    }
    // last interval starting at or before x
    int i = lo - 1;
    // none starts by x, or x sits in gap after interval i
    if (i < 0 || x > ends[i]) return -1;
    return i;
}
```

```cpp
int findInterval(const vector<int>& starts, const vector<int>& ends, int x) {
    // last interval starting at or before x
    int i = upper_bound(starts.begin(), starts.end(), x) - starts.begin() - 1;
    // none starts by x, or x sits in gap after interval i
    if (i < 0 || x > ends[i]) return -1;
    return i;
}
```

**O(log n)** per query. Three pitfalls: using lower bound instead of upper bound, which misses an `x` that equals a start; forgetting the gap check after finding `i`; and rebuilding the starts array for each query, which makes every query O(n). If intervals are added and removed between queries, keep them in an ordered map keyed by start: Java's `TreeMap.floorEntry(x)`, or `std::map::upper_bound(x)` and step back one.

### How to pick a template

| You want | Range | Loop | Updates | Result |
|---|---|---|---|---|
| Index of an exact value | `[0, n-1]` closed | `lo <= hi` | `lo = mid + 1`, `hi = mid - 1` | `mid`, or `-1` after the loop |
| First position where a condition is true | `[0, n]` | `lo < hi` | `hi = mid`, `lo = mid + 1` | `lo` |
| Last position where a condition is true | first false, minus 1 | `lo < hi` | same as above | `lo - 1` |

Two rules prevent infinite loops:

1. If an update is `hi = mid` (keeps `mid`), the loop must be `lo < hi`. With `lo <= hi`, the state `lo == hi == mid` never changes.
2. If an update is `lo = mid` (keeps `mid` on the low side), round the midpoint **up**: `mid = lo + (hi - lo + 1) / 2`. With the usual round-down `mid`, the state `hi == lo + 1` gives `mid == lo` forever.

The simplest habit is to always write "first true" with `hi = mid` / `lo = mid + 1`, and turn "last true" questions into "first false, minus one".

## Off-by-one and overflow pitfalls

- **Overflow in the midpoint.** In Java and C++, `(lo + hi) / 2` overflows when `lo + hi` exceeds 2³¹ - 1, which happens when you search over values up to 10⁹ rather than indices. Write `lo + (hi - lo) / 2`. Java also accepts `(lo + hi) >>> 1` (an unsigned shift, fine while both are non-negative), and C++20 has `std::midpoint`. Python integers don't overflow, but the habit costs nothing.
- **Negative ranges.** `lo + (hi - lo) / 2` always rounds towards `lo` because `hi - lo >= 0`. `(lo + hi) / 2` rounds towards zero in Java and C++ but down in Python, so it behaves differently when the range is negative.
- **Wrong starting `hi`.** For lower bound the answer can be `n` (insert at the end), so start at `hi = n`. Starting at `n - 1` silently returns `n - 1` when every element is smaller.
- **Reading `a[lo]` after the loop.** In the first-true template `lo` can equal `n`; check `lo < n` before you index.
- **Duplicates.** Template 1 finds any copy. If the problem says "first" or "leftmost", use lower bound.
- **Overflow in the check.** A feasibility sum like "total hours" can exceed 32 bits even when every input fits. Use `long` / `long long`.

## Binary search on the answer

Sometimes there's no array to search, but the answer is a number in a known range and you can test a candidate. If the test is **monotonic** (once a value works, every larger value works too), the candidates look like `F F F T T T` and you can binary search for the smallest one that works. This is called **binary search on the answer**, and the test is a **monotonic predicate**.

The classic example is *Koko eating bananas*: there are piles of bananas, and Koko eats at most `k` bananas per hour from one pile (a pile of `p` takes `ceil(p / k)` hours). What's the smallest speed `k` that finishes all piles within `h` hours? A faster speed never takes longer, so "finishes within `h` hours" is monotonic in `k`.

```diagram
{"type":"array","rows":[{"label":"speed k","values":[1,2,3,4,5,6,7,8,9,10,11],"highlight":[3]},{"label":"hours","values":[27,15,10,8,8,6,5,5,5,5,4],"highlight":[3],"dim":[0,1,2]}],"indices":false,"caption":"piles = [3, 6, 7, 11], h = 8. Speeds 1 to 3 are too slow; from 4 on, every speed works. The answer is the first that works: 4."}
```

The recipe:

1. **Range.** `lo` is the smallest possible answer; `hi` must be an answer that surely works. Here `lo = 1` and `hi = max(piles)` (one pile per hour).
2. **Check.** Write `feasible(x)`, usually a greedy O(n) pass.
3. **Search.** Run the first-true template over the range.

```python
def min_eating_speed(piles, h):
    def hours(k):
        return sum((p + k - 1) // k for p in piles)   # ceil(p / k) per pile

    lo, hi = 1, max(piles)             # speed max(piles) always works
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if hours(mid) <= h:            # fast enough: the answer is mid or smaller
            hi = mid
        else:
            lo = mid + 1
    return lo
```

```java
int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);   // speed max(piles) always works
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long hours = 0;                         // can exceed the int range
        for (int p : piles) hours += (p + mid - 1L) / mid;
        if (hours <= h) hi = mid;               // fast enough
        else lo = mid + 1;
    }
    return lo;
}
```

```cpp
int minEatingSpeed(const vector<int>& piles, int h) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long long hours = 0;                    // can exceed the int range
        for (int p : piles) hours += (p + mid - 1LL) / mid;
        if (hours <= h) hi = mid;               // fast enough
        else lo = mid + 1;
    }
    return lo;
}
```

Time is **O(n log M)**, where `M` is the size of the answer range: about 30 checks for a range up to 10⁹. The same shape solves many "minimise the maximum" problems:

| Problem | Range | Feasible if |
|---|---|---|
| Ship packages within `D` days (minimum capacity) | `max(w)` to `sum(w)` | greedy loading needs `<= D` days |
| Split array into `k` parts, minimise the largest sum | `max(a)` to `sum(a)` | greedy split needs `<= k` parts |
| Minimum days to make `m` bouquets | `min(day)` to `max(day)` | enough adjacent bloomed flowers |
| Integer square root of `x` | `0` to `x` | last `k` with `k * k <= x` |

For "maximise the minimum" problems (place cows so the closest pair is as far apart as possible), the predicate is `T T T F F F`. Find the first false and subtract one.

## Rotated sorted arrays

Take a sorted array and rotate it: `[0, 1, 2, 4, 5, 6, 7]` becomes `[4, 5, 6, 7, 0, 1, 2]`. It's no longer sorted, but binary search still works because of one fact: **at least one half around `mid` is sorted.**

**Finding the minimum** is a first-true search. Every element of the left run is larger than the last element, and every element of the right run is at most the last element. So the predicate `a[i] <= a[n-1]` is `F F F F T T T`, and the minimum is the first true.

```diagram
{"type":"array","rows":[{"label":"nums","values":[4,5,6,7,0,1,2],"highlight":[4]},{"label":"<= last?","values":["F","F","F","F","T","T","T"],"highlight":[4]}],"caption":"The minimum (0, index 4) is the first index where nums[i] <= nums[6]."}
```

**Searching for a target** uses the closed template. At each step, check which half is sorted (`nums[lo] <= nums[mid]` means the left half is), then check whether the target lies within that sorted half's range. If it does, go there; if not, go to the other half.

```python
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:              # left half nums[lo..mid] is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                  # right half nums[mid..hi] is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

```java
int searchRotated(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {               // left half is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                   // right half is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```

```cpp
int searchRotated(const vector<int>& nums, int target) {
    int lo = 0, hi = (int)nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {               // left half is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                   // right half is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```

The `<=` in `nums[lo] <= nums[mid]` matters: when `lo == mid` the "left half" is the single element `nums[lo]`, which is sorted. With **duplicates** (`[1, 1, 1, 0, 1]`) you sometimes can't tell which half is sorted; the fix is to shrink by one (`lo += 1`) when `nums[lo] == nums[mid] == nums[hi]`, which makes the worst case O(n).

## Fully sorted matrix: one flat array

*Search a 2D matrix*: each row is sorted, and each row's first value is greater than the previous row's last value. Then reading the matrix row by row gives **one sorted list** of `m · n` values, and you can binary search it directly without building it.

Search positions `0..m·n − 1`. Position `p` is at row `p / n` and column `p % n` (integer division), because each row holds `n` values. Everything else is [template 1](/learn/binary-search#template-1-exact-match-lo-hi).

```diagram
{"type":"grid","cells":[[1,3,5,7],[10,11,16,20],[23,30,34,60]],"highlight":[[1,1]],"caption":"m = 3, n = 4. The first mid is (0 + 11) / 2 = 5, at row 5 / 4 = 1, column 5 % 4 = 1: the value 11."}
```

```python
def search_sorted_matrix(matrix, target):
    # Rows sorted and each row starts above previous row's end
    # So row-major order is one sorted list of m * n values
    # Binary search positions 0..m*n-1; position p sits at (p // n, p % n)
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m * n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        # n values per row
        val = matrix[mid // n][mid % n]
        if val == target:
            return True
        if val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

```java
boolean searchSortedMatrix(int[][] matrix, int target) {
    // Rows sorted and each row starts above previous row's end
    // So row-major order is one sorted list of m * n values
    // Binary search positions 0..m*n-1; position p sits at (p / n, p % n)
    int m = matrix.length, n = matrix[0].length;
    int lo = 0, hi = m * n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        // n values per row
        int val = matrix[mid / n][mid % n];
        if (val == target) return true;
        if (val < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}
```

```cpp
bool searchSortedMatrix(const vector<vector<int>>& matrix, int target) {
    // Rows sorted and each row starts above previous row's end
    // So row-major order is one sorted list of m * n values
    // Binary search positions 0..m*n-1; position p sits at (p / n, p % n)
    int m = matrix.size(), n = matrix[0].size();
    int lo = 0, hi = m * n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        // n values per row
        int val = matrix[mid / n][mid % n];
        if (val == target) return true;
        if (val < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}
```

**O(log(mn))** time, O(1) space. Pitfalls: dividing by the **number of columns** `n`, not rows (with `p / m` the mapping is wrong for any non-square matrix), and `m · n` overflowing a 32-bit int for very large matrices. It also needs the stronger ordering: if rows only sort within themselves and columns sort downwards, use the staircase search below instead.

## Sorted matrix: staircase search

*Search a 2D matrix II*: every row is sorted left to right and every column top to bottom, but a row can hold values smaller than the end of the row above it, so you can't treat the matrix as one sorted array. Is `target` in it?

Start at the **top-right corner**. That value is the largest in its row and the smallest in its column, so one comparison always throws away a whole line:

1. If it equals the target, you're done.
2. If it's bigger, everything below it in that column is bigger still: move left (drop the column).
3. If it's smaller, everything left of it in that row is smaller still: move down (drop the row).
4. If you walk off the matrix, the target isn't there.

```diagram
{"type":"grid","cells":[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]],"path":[[0,4],[0,3],[0,2],[0,1],[1,1]],"highlight":[[1,1]],"caption":"Searching for 5: 15, 11 and 7 are too big (left), 4 is too small (down), then 5 is found."}
```

```python
def search_matrix(matrix, target):
    if not matrix or not matrix[0]:
        return False
    # top-right corner (largest in its row, smallest in its column)
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        val = matrix[r][c]
        if val == target:
            return True
        # rest of column is even bigger, so drop column
        if val > target:
            c -= 1
        # rest of row is even smaller, so drop row
        else:
            r += 1
    return False
```

```java
boolean searchMatrix(int[][] matrix, int target) {
    if (matrix.length == 0 || matrix[0].length == 0) return false;
    // top-right corner (largest in its row, smallest in its column)
    int r = 0, c = matrix[0].length - 1;
    while (r < matrix.length && c >= 0) {
        int val = matrix[r][c];
        if (val == target) return true;
        // rest of column is even bigger, so drop column
        if (val > target) c--;
        // rest of row is even smaller, so drop row
        else r++;
    }
    return false;
}
```

```cpp
bool searchMatrix(const vector<vector<int>>& matrix, int target) {
    if (matrix.empty() || matrix[0].empty()) return false;
    // top-right corner (largest in its row, smallest in its column)
    int r = 0, c = matrix[0].size() - 1;
    while (r < (int)matrix.size() && c >= 0) {
        int val = matrix[r][c];
        if (val == target) return true;
        // rest of column is even bigger, so drop column
        if (val > target) c--;
        // rest of row is even smaller, so drop row
        else r++;
    }
    return false;
}
```

Each step removes a row or a column, so it takes at most `m + n` steps: **O(m + n)** time, O(1) space. Binary searching every row costs O(m log n), which is worse for a square matrix. The bottom-left corner works too, mirrored. The top-left and bottom-right corners don't: from the top-left, both neighbours are bigger, so a comparison doesn't tell you which way to go.

The same walk can **count** the entries `<= x` in O(m + n). Start at the bottom-left: if the value is `<= x`, so is everything above it in that column, so add `row + 1` and move right; otherwise move up. That count is the check inside *Kth smallest element in a sorted matrix*, which binary searches on the value.

## Unknown length: exponential search

*Search in a sorted array of unknown size*: you can only call `reader.get(i)`, which returns `2³¹ − 1` for an index past the end. Without the length, binary search has no `hi`.

**Exponential search** (also called **galloping search**) finds one: check index 1, 2, 4, 8, ... until the value there is `>= target`. Reads past the end return the huge sentinel, so the doubling stops there too. Now the target, if present, lies between `hi / 2` and `hi`, and an ordinary binary search finishes the job.

```diagram
{"type":"array","values":[-1,0,3,5,9,12,15,20,27,31],"highlight":[1,2,4,8],"window":[4,8],"caption":"target = 15. Doubling checks indices 1, 2, 4 (all smaller) and 8 (27, too big), so 15 must lie in [4, 8]."}
```

```python
def search(reader, target):
    # Double hi until it reaches target or runs past end
    # Then plain binary search between hi / 2 and hi
    # Reads past end return 2**31 - 1, so doubling stops there too
    hi = 1
    while reader.get(hi) < target:
        hi *= 2
    # get(hi / 2) < target (or hi / 2 = 0), so answer can't be left of it
    lo = hi // 2
    while lo <= hi:
        mid = (lo + hi) // 2
        val = reader.get(mid)
        if val == target:
            return mid
        if val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

```java
int search(ArrayReader reader, int target) {
    // Double hi until it reaches target or runs past end
    // Then plain binary search between hi / 2 and hi
    // Reads past end return 2^31 - 1, so doubling stops there too
    int hi = 1;
    while (reader.get(hi) < target) hi *= 2;
    // get(hi / 2) < target (or hi / 2 = 0), so answer can't be left of it
    int lo = hi / 2;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int val = reader.get(mid);
        if (val == target) return mid;
        if (val < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

```cpp
int search(const ArrayReader& reader, int target) {
    // Double hi until it reaches target or runs past end
    // Then plain binary search between hi / 2 and hi
    // Reads past end return 2^31 - 1, so doubling stops there too
    int hi = 1;
    while (reader.get(hi) < target) hi *= 2;
    // get(hi / 2) < target (or hi / 2 = 0), so answer can't be left of it
    int lo = hi / 2;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int val = reader.get(mid);
        if (val == target) return mid;
        if (val < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

If the target is at index `p`, the doubling takes about log₂ p steps and the binary search over a range of length at most `p` about log₂ p more: **O(log p)** time, which can beat O(log n) when the target is near the front. That's why Timsort uses galloping when merging runs, and why it suits unbounded streams and lists. Pitfalls: starting `hi` at 0 (doubling 0 stays 0), and overflow of `hi * 2` when the length can approach 2³¹ (cap it or use 64-bit).

## Built-ins

In real code (and in most interviews, once you've shown you can write it) use the library:

| Language | Lower bound | Upper bound | Notes |
|---|---|---|---|
| Python | `bisect.bisect_left(a, x)` | `bisect.bisect_right(a, x)` | `bisect.insort` inserts in order (O(n) shift); `key=` since 3.10 |
| Java | write your own | write your own | `Arrays.binarySearch` / `Collections.binarySearch` find *some* match |
| C++ | `std::lower_bound(first, last, x)` | `std::upper_bound(first, last, x)` | return iterators; also `binary_search`, `equal_range` |

```python
from bisect import bisect_left, bisect_right, insort

a = [1, 2, 4, 4, 4, 7, 9]
i = bisect_left(a, 4)     # 2: first index with a[i] >= 4
j = bisect_right(a, 4)    # 5: first index with a[i] > 4
k = bisect_left(a, 5)     # 5: where 5 would go
insort(a, 5)              # a == [1, 2, 4, 4, 4, 5, 7, 9]
```

```java
int[] a = {1, 2, 4, 4, 4, 7, 9};
int i = Arrays.binarySearch(a, 4);   // 3: *a* 4, not necessarily the first
int k = Arrays.binarySearch(a, 5);   // -6: not found; insertion point is -(k + 1) = 5
List<Integer> list = List.of(1, 2, 4, 4, 4, 7, 9);
int j = Collections.binarySearch(list, 7);   // 5
```

```cpp
vector<int> a = {1, 2, 4, 4, 4, 7, 9};
int i = lower_bound(a.begin(), a.end(), 4) - a.begin();   // 2: first a[i] >= 4
int j = upper_bound(a.begin(), a.end(), 4) - a.begin();   // 5: first a[i] > 4
bool has7 = binary_search(a.begin(), a.end(), 7);         // true
auto [first, last] = equal_range(a.begin(), a.end(), 4);  // iterators to a[2] and a[5]
```

- Java's `binarySearch` returns `-(insertion point) - 1` when the key is missing, so the result is always negative for "not found" (even when the insertion point is 0). With duplicates it makes no promise about which copy you get.
- For a set that changes while you search, use a balanced tree: Java's `TreeSet.ceiling` / `floor`, C++'s `set::lower_bound`. Call the **member** `s.lower_bound(x)` on a `std::set`; the free `std::lower_bound` on set iterators is O(n) because they aren't random access.
- All of these assume the range is sorted by the same comparison. On an unsorted array the result is meaningless, and nothing warns you.

## Interview variants

| Problem | Approach |
|---|---|
| Search insert position | lower bound |
| First and last position of an element | lower bound and upper bound minus one |
| Find peak element | compare `a[mid]` with `a[mid + 1]`: if rising, a peak is to the right |
| Search a sorted 2D matrix | treat it as one array of `m * n`; index `i` is row `i / n`, column `i % n` |
| Search a 2D matrix II (rows and columns sorted) | staircase from the top-right corner, O(m + n) |
| Find minimum in rotated array | first index with `a[i] <= a[n-1]` |
| K-th smallest in a sorted matrix | binary search on the value, count entries `<= mid` with a staircase walk |
| Median of two sorted arrays | binary search on how many elements to take from the shorter array |
| Square root with decimals | loop a fixed 100 times on `double`s instead of `lo < hi` |

Whenever you see "sorted", "minimum value such that" or "maximum value such that", or input sizes near 10⁹ that rule out a linear scan over the values, think binary search. For the theory behind O(log n), see [Big-O & complexity](/learn/big-o).
