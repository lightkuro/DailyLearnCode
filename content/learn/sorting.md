---
title: Sorting
summary: How merge sort, quicksort, heap sort and the linear-time sorts work, what each language's built-in sort really does, and how to sort by custom keys and comparators.
related: big-o, recursion-backtracking, two-pointers, heaps, binary-search, greedy-intervals
terms:
  - sorting
  - merge sort #merge-sort
  - quicksort #quicksort
  - quick sort #quicksort
  - heap sort #heap-sort
  - heapsort #heap-sort
  - stable sort #what-to-know-about-a-sort
  - comparison sort #the-n-log-n-lower-bound
  - counting sort #counting-sort
  - bucket sort #bucket-sort
  - radix sort #radix-sort
  - Timsort #what-the-built-ins-use
  - introsort #what-the-built-ins-use
  - quickselect #quickselect-the-k-th-element
  - custom comparator #custom-keys-and-comparators
  - sorting strings #the-cost-of-one-comparison
  - string comparison #the-cost-of-one-comparison
---

## What to know about a sort

Sorting puts elements in order, and many problems get easier once the input is sorted: duplicates become neighbors, [two pointers](/learn/two-pointers) and [binary search](/learn/binary-search) start working, and greedy interval scheduling becomes a single scan. In practice you'll nearly always call the built-in sort. What interviews test is whether you know its cost, its properties, and how the classic algorithms work underneath.

Four properties describe a sorting algorithm:

- **Time**: best, average and worst case.
- **Extra space**: O(1) means **in-place**.
- **Stability**: a **stable sort** keeps equal elements in their original relative order. If you sort people by age, a stable sort keeps people of the same age in the order they started. That lets you sort by several keys in passes (secondary key first, then primary).
- **Comparison-based or not**: does it only compare pairs, or does it look inside the values (digits, counts)?

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | yes |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) stack | no |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | no |
| Counting sort | O(n + k) | O(n + k) | O(n + k) | O(n + k) | yes |
| Radix sort | O(d(n + b)) | O(d(n + b)) | O(d(n + b)) | O(n + b) | yes |

Here `k` is the range of values, `d` the number of digits and `b` the base. Insertion sort looks bad on paper, but it's the fastest choice for tiny or nearly sorted arrays, which is why real-world sorts use it for small pieces.

### The cost of one comparison

The O(n log n) bounds count **comparisons** and assume each costs O(1). That's true for numbers, not for strings: comparing two strings walks them until the first difference, which takes up to O(L) for strings of length `L`. Sorting `n` strings is therefore **O(L · n log n)** in the worst case, when many strings share long prefixes. The same factor applies to tuples, arrays and comparators that do real work.

Where it shows up:

- *Group anagrams*: sorting each word's letters costs O(k log k) per word; sorting the list of words costs O(k · n log n).
- *Largest number*: the comparator builds `a + b` and `b + a`, so each comparison is O(L) and the sort is O(L · n log n).
- Sorting all suffixes of a string naively: `n` suffixes of length up to `n` give O(n² log n). Suffix arrays exist to do better.
- A comparator that recomputes something expensive each time multiplies the cost too. Compute a **key** once per element instead (Python's `key=`, a precomputed array in Java or C++).

If the comparison cost dominates, a [trie](/learn/tries) or an MSD radix sort orders the strings in time proportional to the total number of characters.

## Merge sort

**Merge sort** is divide and conquer: split the array in half, sort each half recursively, then **merge** the two sorted halves by repeatedly taking the smaller front element. Merging two lists of total length `n` is O(n), and halving gives `log₂ n` levels, so it's O(n log n) on every input.

```diagram
{"type":"array","rows":[{"label":"input","values":[5,2,4,7,1,3,2,6]},{"label":"runs of 2","values":[2,5,4,7,1,3,2,6]},{"label":"runs of 4","values":[2,4,5,7,1,2,3,6]},{"label":"sorted","values":[1,2,2,3,4,5,6,7]}],"caption":"Merge sort seen bottom-up: sorted runs of 1, 2, 4, then 8. Each row is O(n) merging, and there are log₂ 8 = 3 rows of merges."}
```

```python
def merge_sort(a, lo=0, hi=None):        # sorts a[lo:hi] in place
    if hi is None:
        hi = len(a)
    if hi - lo <= 1:
        return
    mid = (lo + hi) // 2
    merge_sort(a, lo, mid)
    merge_sort(a, mid, hi)
    merged, i, j = [], lo, mid
    while i < mid and j < hi:
        if a[i] <= a[j]:                 # <= takes from the left on ties: stable
            merged.append(a[i]); i += 1
        else:
            merged.append(a[j]); j += 1
    merged += a[i:mid] + a[j:hi]         # one side may have leftovers
    a[lo:hi] = merged
```

```java
void mergeSort(int[] a, int lo, int hi) {    // sorts a[lo..hi)
    if (hi - lo <= 1) return;
    int mid = (lo + hi) >>> 1;
    mergeSort(a, lo, mid);
    mergeSort(a, mid, hi);
    int[] merged = new int[hi - lo];
    int i = lo, j = mid, k = 0;
    while (i < mid && j < hi)
        merged[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // <= keeps it stable
    while (i < mid) merged[k++] = a[i++];
    while (j < hi) merged[k++] = a[j++];
    System.arraycopy(merged, 0, a, lo, merged.length);
}
```

```cpp
void mergeSort(vector<int>& a, int lo, int hi) {    // sorts a[lo..hi)
    if (hi - lo <= 1) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid, hi);
    vector<int> merged;
    merged.reserve(hi - lo);
    int i = lo, j = mid;
    while (i < mid && j < hi)
        merged.push_back(a[i] <= a[j] ? a[i++] : a[j++]);   // <= keeps it stable
    while (i < mid) merged.push_back(a[i++]);
    while (j < hi) merged.push_back(a[j++]);
    copy(merged.begin(), merged.end(), a.begin() + lo);
}
```

Merge sort needs O(n) extra memory for merging but is predictable and stable. It's also the natural sort for linked lists (merging needs no extra array there), and its merge step solves interview variants such as counting inversions: while merging, every time you take from the right half, all remaining left elements form an inversion with it.

## Quicksort

**Quicksort** picks a **pivot**, **partitions** the array so that smaller elements come before the pivot and the rest after it, and recurses on the two sides. The pivot is then in its final position, and no merge step is needed.

The **Lomuto partition** is the easiest to write: scan with `j`, and keep a boundary `i` such that everything in `a[lo..i-1]` is smaller than the pivot. At the end, swap the pivot into position `i`.

```diagram
{"type":"array","rows":[{"label":"before","values":[7,2,1,6,8,5,3,4],"pointers":{"pivot":7}},{"label":"after","values":[2,1,3,4,8,5,7,6],"highlight":[3],"pointers":{"i":3},"window":[0,2]}],"caption":"Lomuto partition with pivot 4: 2, 1 and 3 move left, then the pivot is swapped into index 3, its final place. Recurse on [0, 2] and [4, 7]."}
```

Quicksort's speed depends on the pivot. A pivot near the median halves the array each time: O(n log n). A pivot that's always the smallest or largest (the first element of an already sorted array) peels off one element per level: O(n²), with O(n) recursion depth. Choosing the pivot **at random** makes the expected time O(n log n) on every input.

The code below also includes **quickselect**, explained in its own section further down.

```python
import random

def partition(a, lo, hi):                # Lomuto: returns the pivot's final index
    r = random.randint(lo, hi)           # random pivot: expected O(n log n)
    a[r], a[hi] = a[hi], a[r]
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot:                 # grow the "< pivot" block a[lo..i-1]
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    return i

def quicksort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo < hi:
        p = partition(a, lo, hi)
        quicksort(a, lo, p - 1)
        quicksort(a, p + 1, hi)

def kth_largest(nums, k):                # quickselect: average O(n)
    a, target = nums[:], len(nums) - k   # k-th largest sits at index n - k
    lo, hi = 0, len(a) - 1
    while True:
        p = partition(a, lo, hi)
        if p == target:
            return a[p]
        if p < target:
            lo = p + 1                   # answer is right of the pivot
        else:
            hi = p - 1                   # answer is left of the pivot
```

```java
Random rng = new Random();

int partition(int[] a, int lo, int hi) {     // Lomuto: returns the pivot's final index
    swap(a, lo + rng.nextInt(hi - lo + 1), hi);   // random pivot: expected O(n log n)
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a, i++, j);   // grow the "< pivot" block a[lo..i-1]
    swap(a, i, hi);
    return i;
}

void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

void quicksort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quicksort(a, lo, p - 1);
    quicksort(a, p + 1, hi);
}

int kthLargest(int[] nums, int k) {          // quickselect: average O(n)
    int[] a = nums.clone();
    int target = a.length - k, lo = 0, hi = a.length - 1;   // k-th largest sits at n - k
    while (true) {
        int p = partition(a, lo, hi);
        if (p == target) return a[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
}
```

```cpp
mt19937 rng(random_device{}());

int partition(vector<int>& a, int lo, int hi) {   // Lomuto: returns the pivot's final index
    swap(a[uniform_int_distribution<int>(lo, hi)(rng)], a[hi]);   // random pivot
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);    // grow the "< pivot" block a[lo..i-1]
    swap(a[i], a[hi]);
    return i;
}

void quicksort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quicksort(a, lo, p - 1);
    quicksort(a, p + 1, hi);
}

int kthLargest(vector<int> a, int k) {           // quickselect: average O(n); a is a copy
    int target = a.size() - k, lo = 0, hi = a.size() - 1;   // k-th largest sits at n - k
    while (true) {
        int p = partition(a, lo, hi);
        if (p == target) return a[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
}
```

Quicksort is in-place and cache-friendly, which makes it fast in practice, but it isn't stable. One more trap: with many equal keys, a two-way partition degrades to O(n²) (an array of all 7s puts every element on one side). The fix is a **three-way partition** into `< pivot`, `= pivot` and `> pivot`, which is the Dutch national flag algorithm from [two pointers](/learn/two-pointers).

## Heap sort

**Heap sort** builds a max-heap from the array in O(n), then repeatedly swaps the maximum (the root) to the end of the array and restores the heap on the shrunken prefix in O(log n). That's O(n log n) in the worst case with O(1) extra space, a combination neither merge sort nor quicksort offers. It isn't stable, and its jumps around memory are cache-unfriendly, so it's usually slower than quicksort; its main job in practice is to be the safety net inside introsort. The heap itself is covered in [heaps & priority queues](/learn/heaps).

## The n log n lower bound

Can a sort beat O(n log n)? Not if it learns about the input only by comparing pairs. Any **comparison sort** can be drawn as a decision tree: each internal node is a comparison, each leaf is one possible output order. There are `n!` possible orders, so the tree needs at least `n!` leaves, and a binary tree with that many leaves has height at least `log₂(n!)`, which is about `n log₂ n − 1.44n`. So every comparison sort needs Ω(n log n) comparisons in the worst case.

The way around the bound is to stop comparing and use the values themselves as indices. That only works when the keys have structure: small integers, fixed-length digits, or a known distribution.

## Linear-time sorts

### Counting sort

When values are integers in a small range `0..k`, count how many times each value occurs, then write the values back in order. O(n + k) time and O(k) extra space.

```python
def counting_sort(nums, max_value):      # values in 0..max_value
    count = [0] * (max_value + 1)
    for x in nums:
        count[x] += 1
    out = []
    for v, c in enumerate(count):
        out.extend([v] * c)
    return out
```

```java
int[] countingSort(int[] nums, int maxValue) {   // values in 0..maxValue
    int[] count = new int[maxValue + 1];
    for (int x : nums) count[x]++;
    int[] out = new int[nums.length];
    int k = 0;
    for (int v = 0; v <= maxValue; v++)
        while (count[v]-- > 0) out[k++] = v;
    return out;
}
```

```cpp
vector<int> countingSort(const vector<int>& nums, int maxValue) {   // values in 0..maxValue
    vector<int> count(maxValue + 1, 0);
    for (int x : nums) count[x]++;
    vector<int> out;
    out.reserve(nums.size());
    for (int v = 0; v <= maxValue; v++)
        out.insert(out.end(), count[v], v);
    return out;
}
```

This version rewrites plain values. To sort *records* by a small integer key while keeping it stable, turn the counts into prefix sums (`count[v]` becomes the first output index for key `v`), then place each record at `count[key]++` in input order. That stable form is what radix sort builds on.

### Bucket sort

**Bucket sort** spreads values into buckets by range (for floats in `[0, 1)`, bucket `⌊x · n⌋`), sorts each small bucket, and concatenates them. With evenly spread data each bucket holds O(1) items on average, so it's O(n) average; if everything lands in one bucket it's as slow as the inner sort. The interview version uses frequencies as bucket indices: for "top k frequent elements", bucket `c` holds the values that occur `c` times, and reading buckets from high to low gives the answer in O(n) without a heap.

### Radix sort

**Radix sort** sorts integers digit by digit, from the least significant digit to the most, using a stable counting sort for each digit. Stability is what makes it work: after sorting by tens, numbers with equal tens digits stay in the order the ones pass gave them.

```diagram
{"type":"array","rows":[{"label":"input","values":[170,45,75,90,802,24,2,66]},{"label":"by ones","values":[170,90,802,2,24,45,75,66]},{"label":"by tens","values":[802,2,24,45,66,170,75,90]},{"label":"by hundreds","values":[2,24,45,66,75,90,170,802]}],"caption":"LSD radix sort, base 10: one stable pass per digit. After the hundreds pass the array is sorted."}
```

With `d` digits in base `b`, radix sort is O(d · (n + b)). For 32-bit integers in base 256 that's 4 passes, effectively linear. Negative numbers need an offset or a separate pass.

## What the built-ins use

| Language | Call | Algorithm | Stable |
|---|---|---|---|
| Python | `list.sort()`, `sorted()` | Timsort | yes |
| Java | `Arrays.sort(int[])` and other primitives | dual-pivot quicksort | no (equal primitives are indistinguishable anyway) |
| Java | `Arrays.sort(T[])`, `Collections.sort`, `List.sort` | Timsort | yes |
| C++ | `std::sort` | introsort | no |
| C++ | `std::stable_sort` | merge sort | yes |

- **Timsort** is a hybrid of merge sort and insertion sort. It finds runs that are already in order, extends short runs with insertion sort, and merges runs cleverly. It's O(n log n) worst case and O(n) on already sorted input, which is common in real data.
- **Dual-pivot quicksort** partitions around two pivots into three parts. It's fast on primitives, where stability doesn't matter, and current JDKs fall back to heap sort if recursion gets too deep, so it's O(n log n) on every input.
- **Introsort** starts as quicksort, switches to heap sort if the recursion depth passes about `2 log n`, and finishes small ranges with insertion sort. The C++ standard requires `std::sort` to be O(n log n).
- **`std::stable_sort`** is O(n log n) when it can allocate a buffer and O(n log² n) when it can't.

For partial sorting, C++ has `std::nth_element` (quickselect, average O(n)) and `std::partial_sort` (heap-based, O(n log k)). In Python, `heapq.nsmallest(k, xs)` and `heapq.nlargest(k, xs)` are O(n log k).

## Custom keys and comparators

Most real sorts aren't by the plain value. There are two ways to say what order you want:

- A **key function** maps each element to something that already sorts correctly. Python's `key=` works this way, and tuples compare element by element, so `key=lambda p: (p.age, p.name)` sorts by age, then name. Negate a number to reverse just that part.
- A **custom comparator** takes two elements and says which comes first. Java's `Comparator` returns negative, zero or positive; C++'s comparator returns `true` if the first must come before the second.

Example: sort by how often each value occurs (rarest first), breaking ties by larger value first.

```python
from collections import Counter

def frequency_sort(nums):                # [1,1,2,2,2,3] -> [3,1,1,2,2,2]
    count = Counter(nums)
    return sorted(nums, key=lambda x: (count[x], -x))   # count up, then value down
```

```java
int[] frequencySort(int[] nums) {            // [1,1,2,2,2,3] -> [3,1,1,2,2,2]
    Map<Integer, Integer> count = new HashMap<>();
    for (int x : nums) count.merge(x, 1, Integer::sum);
    Integer[] boxed = Arrays.stream(nums).boxed().toArray(Integer[]::new);  // comparators need objects
    Arrays.sort(boxed, (a, b) -> {
        int byCount = Integer.compare(count.get(a), count.get(b));
        return byCount != 0 ? byCount : Integer.compare(b, a);   // ties: larger value first
    });
    return Arrays.stream(boxed).mapToInt(Integer::intValue).toArray();
}
```

```cpp
vector<int> frequencySort(vector<int> nums) {   // [1,1,2,2,2,3] -> [3,1,1,2,2,2]
    unordered_map<int, int> count;
    for (int x : nums) count[x]++;
    sort(nums.begin(), nums.end(), [&](int a, int b) {
        if (count[a] != count[b]) return count[a] < count[b];   // strict <, never <=
        return a > b;                                            // ties: larger value first
    });
    return nums;
}
```

Language notes:

- **Python**: `key` is computed once per element, which is faster than a comparator. When the order is only definable pairwise (for "largest number", `a` goes first if `a + b > b + a` as strings), wrap a comparator with `functools.cmp_to_key`. `list.sort()` sorts in place and returns `None`; `sorted()` returns a new list.
- **Java**: `Arrays.sort` on an `int[]` takes no comparator, so box to `Integer[]` or sort a `List<Integer>`. Arrays of arrays are objects, so `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]))` works directly. Chains read well: `Comparator.comparingInt((int[] a) -> a[0]).thenComparingInt(a -> a[1])`. Never write `(a, b) -> a - b`: the subtraction overflows for values far apart.
- **C++**: the comparator must be a strict weak ordering, so use `<`, never `<=`. A `<=` comparator is undefined behavior and can make `std::sort` read past the end of the array. `sort(v.begin(), v.end(), greater<>())` sorts descending, and pairs and tuples compare element by element like Python tuples.

## Sorting as preprocessing

When a problem looks hard, ask whether it gets easy on sorted input. Paying O(n log n) up front is fine whenever the rest is O(n log n) or slower:

- **Duplicates and grouping**: equal values become adjacent.
- **Pairs and triples with a target sum**: sort, then [two pointers](/learn/two-pointers) (3Sum is O(n²) after an O(n log n) sort).
- **Intervals**: sort by start, then merge overlaps or count rooms in one pass (see [greedy & intervals](/learn/greedy-intervals)).
- **Searching**: sort once, then [binary search](/learn/binary-search) many times.
- **Canonical forms**: sorted letters as the key for anagrams.

Sorting loses the original positions. If the answer needs indices, sort an array of indices by value, or sort `(value, index)` pairs.

## Quickselect: the k-th element

To find the k-th largest element you don't need a full sort. **Quickselect** partitions once, exactly as quicksort does, and the pivot lands at its final index `p`. If `p` is the target index, you're done; otherwise only *one* side can contain the answer, so recurse (or loop) into that side alone. The expected work is `n + n/2 + n/4 + … ≈ 2n`, so O(n) on average, but O(n²) in the worst case, which a random pivot makes very unlikely. The `kth_largest` function in the quicksort code above is the whole algorithm.

The alternatives for "k-th largest" or "top k" are a min-heap of size `k` (O(n log k), see [heaps](/learn/heaps)) and a full sort (O(n log n)). Quickselect is fastest on average but reorders the array; the heap version works on a stream.

## Pitfalls

- **Comparator overflow** with `a - b` in Java, and `<=` comparators in C++.
- **Assuming stability.** `std::sort` isn't stable; use `std::stable_sort` when equal elements must keep their order.
- **`sorted` vs `.sort()`** in Python: `x = x.sort()` sets `x` to `None`.
- **Quicksort on sorted or all-equal input** without a random pivot and three-way partition is O(n²).
- **Sorting inside a loop.** Re-sorting after every insertion costs O(n log n) each time; keep a heap or a balanced tree instead.
- **Forgetting the cost.** Sorting makes the whole solution at least O(n log n), and the sorted copy (or Timsort's merge buffer) takes O(n) space.
- **Treating string comparisons as O(1).** Sorting `n` strings of length `L` is O(L · n log n); say so when you state the complexity.
