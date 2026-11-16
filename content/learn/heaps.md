---
title: Heaps & priority queues
summary: A complete binary tree stored in an array that always knows its smallest (or largest) item: sift up and down, O(n) heapify, the API in each language, and the top-k, k-way merge and running-median patterns.
related: trees, sorting, greedy-intervals, shortest-paths, linked-lists
terms:
  - binary heap #what-a-heap-is
  - min-heap #what-a-heap-is
  - max-heap #what-a-heap-is
  - priority queue
  - priority queues
  - heapify #building-a-heap-in-on
  - sift up #sift-up-and-sift-down
  - sift down #sift-up-and-sift-down
  - heapq #min-and-max-heaps-in-each-language
  - top-k #top-k-with-a-size-k-heap
  - k-way merge #k-way-merge
  - running median #running-median-with-two-heaps
  - offline queries #offline-queries-with-a-sweep
  - offline query #offline-queries-with-a-sweep
  - lazy removal #offline-queries-with-a-sweep
  - IPO #unlock-by-threshold-then-take-the-best
  - retroactive greedy #retroactive-greedy
  - connect ropes #merging-the-two-smallest
  - Huffman coding #merging-the-two-smallest
  - skyline problem #the-skyline-problem
---

## What a heap is

A **priority queue** is a collection where you can add items and always take out the one with the highest priority: the smallest number, the earliest deadline, the closest node. Unlike a [queue](/learn/stacks-queues), arrival order doesn't matter.

The usual implementation is a **binary heap**: a complete binary tree (every level full except possibly the last, which fills left to right) that obeys the **heap property**:

- In a **min-heap**, every parent is less than or equal to its children, so the smallest item is at the root.
- In a **max-heap**, every parent is greater than or equal to its children, so the largest is at the root.

```diagram
{"type":"tree","values":[1,3,2,6,5,4,8],"highlight":[1],"caption":"A min-heap. Each parent is at most its children, so the root holds the minimum. Siblings and cousins are in no particular order."}
```

A heap is **not sorted**. The property only relates parents to children: 3 and 2 are siblings in either order, and 6 sits below 3 even though it's bigger than 4 on the other side. That looseness is what makes it cheap to maintain: you never pay to keep everything in order, only to keep the minimum on top.

### Stored in an array

Because the tree is complete, it fits in an array with no gaps, level by level. No pointers are needed: for the node at index `i` (counting from 0),

- its children are at `2i + 1` and `2i + 2`,
- its parent is at `(i - 1) / 2`, rounded down.

```diagram
{"type":"array","values":[1,3,2,6,5,4,8],"highlight":[1],"pointers":{"i":1,"2i+1":3,"2i+2":4},"caption":"The same heap as an array, level by level. The node at index 1 (value 3) has its children at indices 3 and 4 (values 6 and 5)."}
```

Some textbooks start at index 1 instead, which makes the children `2i` and `2i + 1` and the parent `i / 2`. Pick one and stay consistent.

**Where is the maximum of a min-heap?** In a leaf. Every parent is at most its children, so any node with a child has something at least as large below it, and the largest value always has a copy with no children. The leaves are the second half of the array, indices `n/2` to `n - 1` (rounded down), so finding the maximum still means a linear scan, just over about half the items. In the heap above it's 8, at index 6.

## Sift up and sift down

Every change happens at the end of the array (to keep the tree complete), followed by a repair walk along one root-to-leaf path:

- **Push**: append the new item as the last leaf, then **sift up**: while it's smaller than its parent, swap them.
- **Pop**: remember the root, move the last leaf into the root's place, then **sift down**: while it's larger than its smaller child, swap with that child. Swapping with the *smaller* child is what keeps the property true for the other child.
- **Peek**: read the root.

```diagram
{"type":"tree","values":[0,1,2,3,5,4,8,6],"highlight":[0,1,3,6],"caption":"Pushing 0 into the heap above: it starts as a new leaf under 6, then swaps with 6, 3 and 1 on its way up to the root."}
```

A complete tree with `n` nodes has height about `log₂ n`, so push and pop are **O(log n)** and peek is **O(1)**. Here's the whole thing, sized for interviews where you're asked to implement it yourself:

```python
class MinHeap:
    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)                                # new last leaf
        i = len(a) - 1
        while i > 0 and a[(i - 1) // 2] > a[i]:    # smaller than its parent: swap up
            p = (i - 1) // 2
            a[i], a[p] = a[p], a[i]
            i = p

    def pop(self):
        a = self.a
        top = a[0]
        last = a.pop()                             # take the last leaf off
        if a:
            a[0] = last                            # put it at the root and sift down
            i, n = 0, len(a)
            while True:
                smallest, l, r = i, 2 * i + 1, 2 * i + 2
                if l < n and a[l] < a[smallest]:
                    smallest = l
                if r < n and a[r] < a[smallest]:
                    smallest = r
                if smallest == i:                  # no child is smaller: done
                    break
                a[i], a[smallest] = a[smallest], a[i]
                i = smallest
        return top

    def peek(self):
        return self.a[0]
```

```java
class MinHeap {
    private int[] a = new int[16];
    private int size = 0;

    public void push(int x) {
        if (size == a.length) a = Arrays.copyOf(a, size * 2);
        a[size] = x;                               // new last leaf
        int i = size++;
        while (i > 0 && a[(i - 1) / 2] > a[i]) {   // smaller than its parent: swap up
            int p = (i - 1) / 2;
            swap(i, p);
            i = p;
        }
    }

    public int pop() {
        int top = a[0];
        a[0] = a[--size];                          // move the last leaf to the root
        int i = 0;
        while (true) {
            int smallest = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < size && a[l] < a[smallest]) smallest = l;
            if (r < size && a[r] < a[smallest]) smallest = r;
            if (smallest == i) break;              // no child is smaller: done
            swap(i, smallest);
            i = smallest;
        }
        return top;
    }

    public int peek() { return a[0]; }

    private void swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}
```

```cpp
class MinHeap {
    vector<int> a;
public:
    void push(int x) {
        a.push_back(x);                            // new last leaf
        int i = a.size() - 1;
        while (i > 0 && a[(i - 1) / 2] > a[i]) {   // smaller than its parent: swap up
            swap(a[i], a[(i - 1) / 2]);
            i = (i - 1) / 2;
        }
    }

    int pop() {
        int top = a[0];
        a[0] = a.back();                           // move the last leaf to the root
        a.pop_back();
        int i = 0, n = a.size();
        while (true) {
            int smallest = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && a[l] < a[smallest]) smallest = l;
            if (r < n && a[r] < a[smallest]) smallest = r;
            if (smallest == i) break;              // no child is smaller: done
            swap(a[i], a[smallest]);
            i = smallest;
        }
        return top;
    }

    int peek() const { return a[0]; }
};
```

For a max-heap, flip every comparison.

## Building a heap in O(n)

Pushing `n` items one by one costs O(n log n). **Heapify** builds a heap from an existing array faster: run sift-down on every non-leaf node, from the last one (index `n/2 - 1`) back to the root. Each subtree becomes a heap before its parent is processed.

It's **O(n)**, which surprises most people. Half the nodes are leaves and don't move at all; a quarter can sift down at most one level; an eighth at most two; and so on. The sum `n/4 · 1 + n/8 · 2 + n/16 · 3 + …` is less than `n`. The work is dominated by the many nodes near the bottom, which move very little.

Library versions: Python's `heapq.heapify(list)`, C++'s `std::make_heap` (also used by `priority_queue`'s range constructor), and Java's `new PriorityQueue<>(collection)`.

### Operation costs

| Operation | Binary heap |
|---|---|
| Peek at the min (or max) | O(1) |
| Push | O(log n) |
| Pop the min (or max) | O(log n) |
| Build from `n` items (heapify) | O(n) |
| Find or delete an arbitrary item | O(n) to find it |
| Change an item's priority | not supported by the libraries: push a new entry and skip stale ones when popped |

The last row matters for Dijkstra's algorithm and similar problems. Instead of a "decrease key" operation, push a new `(distance, node)` pair, and when you pop an entry whose distance is worse than the best one recorded, ignore it. This is called **lazy deletion**. See [shortest paths](/learn/shortest-paths).

## Min and max heaps in each language

| | Python | Java | C++ |
|---|---|---|---|
| Type | `heapq` functions on a plain `list` | `PriorityQueue<E>` | `std::priority_queue<T>` |
| Default | **min**-heap | **min**-heap | **max**-heap |
| Push | `heappush(h, x)` | `offer(x)` / `add(x)` | `push(x)` |
| Pop | `heappop(h)` returns it | `poll()` returns it (`null` if empty) | `pop()` returns `void`; read `top()` first |
| Peek | `h[0]` | `peek()` | `top()` |
| Opposite order | push `-x` | `new PriorityQueue<>(Collections.reverseOrder())` | `priority_queue<int, vector<int>, greater<int>>` |

```python
import heapq

nums = [5, 1, 8, 3]
heap = []
for x in nums:
    heapq.heappush(heap, x)
smallest = heap[0]                  # 1: peek
first = heapq.heappop(heap)         # 1

max_heap = [-x for x in nums]       # max-heap: store negated values
heapq.heapify(max_heap)             # O(n)
largest = -heapq.heappop(max_heap)  # 8: negate again on the way out

tasks = [(2, "write"), (1, "plan"), (3, "ship")]
heapq.heapify(tasks)                # tuples compare by their first element first
next_task = heapq.heappop(tasks)    # (1, "plan")
```

```java
int[] nums = {5, 1, 8, 3};
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
for (int x : nums) minHeap.offer(x);
int smallest = minHeap.peek();      // 1
int first = minHeap.poll();         // 1

PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
for (int x : nums) maxHeap.offer(x);
int largest = maxHeap.poll();       // 8

PriorityQueue<int[]> tasks = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
tasks.offer(new int[]{2, 102});     // {priority, task id}
tasks.offer(new int[]{1, 101});
int[] nextTask = tasks.poll();      // {1, 101}
```

```cpp
vector<int> nums = {5, 1, 8, 3};
priority_queue<int, vector<int>, greater<int>> minHeap(nums.begin(), nums.end());   // O(n) build
int smallest = minHeap.top();       // 1
minHeap.pop();                      // pop() returns void: read top() first

priority_queue<int> maxHeap(nums.begin(), nums.end());   // the default is a MAX-heap
int largest = maxHeap.top();        // 8

auto later = [](const pair<int, string>& a, const pair<int, string>& b) {
    return a.first > b.first;       // true means "a ranks below b": smallest priority on top
};
priority_queue<pair<int, string>, vector<pair<int, string>>, decltype(later)> tasks(later);
tasks.push({2, "write"});
tasks.push({1, "plan"});
string nextTask = tasks.top().second;   // "plan"
```

Things that trip people up:

- **Python** has only a min-heap. Negate numbers for a max-heap; for things you can't negate (strings), wrap them in a class with a reversed `__lt__`. Python 3.14 added `heappush_max`, `heappop_max` and friends, but many judges run older versions. When you push tuples like `(priority, item)` and two priorities tie, Python compares the items, which fails if they're not comparable (dicts, custom nodes). Add a counter as a tie-breaker: `(priority, count, item)`.
- **Java**: don't write the comparator as `(a, b) -> a - b`; it overflows for large or negative values. Use `Integer.compare` or `Comparator.comparingInt`. `remove(Object)` and `contains` are O(n).
- **C++**: the comparator answers "does `a` rank below `b`?", so `less` (the default) gives a max-heap and `greater` gives a min-heap. It feels backwards; remember "greater for min".
- **All three**: iterating over a heap (or printing it) does *not* give sorted order. Only repeated pops do.

## Top-k with a size-k heap

To find the **k largest** items out of `n` (or the k-th largest), keep a **min-heap of size k**. Push each item; whenever the heap grows past `k`, pop the smallest. The heap always holds the k largest items seen so far, and its root, the smallest of them, is the bar a new item has to beat. At the end the root is the k-th largest.

```diagram
{"type":"array","rows":[{"label":"after 5","values":[3,1,5,12,2,11],"highlight":[0,1,2],"dim":[3,4,5],"pointers":{"root":1}},{"label":"after 12","values":[3,1,5,12,2,11],"highlight":[0,2,3],"dim":[4,5],"pointers":{"root":0}},{"label":"after 2","values":[3,1,5,12,2,11],"highlight":[0,2,3],"dim":[5],"pointers":{"root":0}},{"label":"after 11","values":[3,1,5,12,2,11],"highlight":[2,3,5],"pointers":{"root":2}}],"caption":"k = 3. Highlighted: what the min-heap holds. 12 evicts 1; 2 can't beat the root 3, so it's pushed and popped straight away; 11 evicts 3. The root, 5, is the 3rd largest."}
```

It sounds backwards (the k *largest* need a *min*-heap) until you see that the heap's job is to throw away the smallest candidate quickly.

```python
import heapq

def find_kth_largest(nums, k):
    heap = []                          # min-heap of the k largest seen so far
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)        # drop the smallest of the k + 1
    return heap[0]                     # the smallest of the k largest
```

```java
int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap of the k largest so far
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();                   // drop the smallest of the k + 1
    }
    return heap.peek();                                     // the smallest of the k largest
}
```

```cpp
int findKthLargest(const vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;    // min-heap of the k largest so far
    for (int x : nums) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();               // drop the smallest of the k + 1
    }
    return heap.top();                                      // the smallest of the k largest
}
```

**O(n log k) time, O(k) space**, and it works on a stream where you never see all the data at once. The alternatives:

| Approach | Time | Notes |
|---|---|---|
| Sort, take the last `k` | O(n log n) | simplest; fine when `n` is small |
| Size-k min-heap | O(n log k) | streams; best when `k` is much smaller than `n` |
| Heapify all, pop `k` times | O(n + k log n) | needs all the data up front |
| Quickselect | O(n) average, O(n²) worst | in place; see [sorting](/learn/sorting) |

Python's `heapq.nlargest(k, items)` and `heapq.nsmallest(k, items)` do the heap version for you. Variants: *Top k frequent elements* (count with a hash map, then a size-k heap keyed by count), *K closest points to origin* (a max-heap of size k keyed by distance, since you're keeping the k *smallest*), and *Kth largest element in a stream* (keep the heap between calls).

## K-way merge

To merge `k` sorted lists, put the first element of each list into a min-heap, along with which list it came from. Pop the smallest, append it to the output, and push the next element from the same list. The heap never holds more than `k` items, so with `N` elements in total this is **O(N log k)**.

```python
import heapq

def merge_k_sorted(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]   # (value, list, index)
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):                  # the next value from the same list
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
```

```java
List<Integer> mergeKSorted(int[][] lists) {
    PriorityQueue<int[]> heap = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));
    for (int i = 0; i < lists.length; i++)
        if (lists[i].length > 0) heap.offer(new int[]{lists[i][0], i, 0});   // {value, list, index}
    List<Integer> out = new ArrayList<>();
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int i = top[1], j = top[2];
        out.add(top[0]);
        if (j + 1 < lists[i].length)                // the next value from the same list
            heap.offer(new int[]{lists[i][j + 1], i, j + 1});
    }
    return out;
}
```

```cpp
vector<int> mergeKSorted(const vector<vector<int>>& lists) {
    using T = tuple<int, int, int>;                 // (value, list, index)
    priority_queue<T, vector<T>, greater<T>> heap;  // min-heap
    for (int i = 0; i < (int)lists.size(); i++)
        if (!lists[i].empty()) heap.push({lists[i][0], i, 0});
    vector<int> out;
    while (!heap.empty()) {
        auto [val, i, j] = heap.top();
        heap.pop();
        out.push_back(val);
        if (j + 1 < (int)lists[i].size())           // the next value from the same list
            heap.push({lists[i][j + 1], i, j + 1});
    }
    return out;
}
```

The list index in each entry does two jobs: it says where to fetch the next value, and it breaks ties so equal values never fall through to comparing something incomparable. The same pattern solves *Merge k sorted lists* (push list nodes; see [linked lists](/learn/linked-lists)), *Kth smallest element in a sorted matrix* (each row is a list), *Smallest range covering elements from k lists*, and external sorting of files too big for memory.

## Running median with two heaps

*Find median from data stream*: numbers arrive one at a time, and at any moment you must report the median. Sorting after every insert is O(n log n) each time. Instead, split the numbers into two halves:

- **low**: a max-heap holding the smaller half. Its top is the largest of the small numbers.
- **high**: a min-heap holding the larger half. Its top is the smallest of the large numbers.

Keep the sizes equal, or let `low` have one extra. Then the median is `low`'s top (odd count) or the average of the two tops (even count).

```diagram
{"type":"array","rows":[{"label":"low (max-heap)","values":[1,2,3],"highlight":[2]},{"label":"high (min-heap)","values":[5,8],"highlight":[0]}],"indices":false,"caption":"After 5, 2, 8, 1, 3 (shown in sorted order). low has one extra element, so the median is its top: 3. Adding one more number would make it the average of the two tops."}
```

To add a number without working out which half it belongs to: push it into `low`, move `low`'s largest into `high` (this puts it on the correct side), and if `high` is now bigger, move its smallest back.

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []                  # max-heap via negation: the smaller half
        self.high = []                 # min-heap: the larger half

    def add_num(self, num):
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))   # low's largest moves up
        if len(self.high) > len(self.low):                    # keep len(low) >= len(high)
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def find_median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2
```

```java
class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());  // smaller half
    private final PriorityQueue<Integer> high = new PriorityQueue<>();                           // larger half

    public void addNum(int num) {
        low.offer(num);
        high.offer(low.poll());                                 // low's largest moves up
        if (high.size() > low.size()) low.offer(high.poll());   // keep low.size() >= high.size()
    }

    public double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return (low.peek() + (long) high.peek()) / 2.0;         // long: the sum can overflow an int
    }
}
```

```cpp
class MedianFinder {
    priority_queue<int> low;                                // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> high;    // min-heap: larger half
public:
    void addNum(int num) {
        low.push(num);
        high.push(low.top()); low.pop();                    // low's largest moves up
        if (high.size() > low.size()) { low.push(high.top()); high.pop(); }   // keep low >= high
    }

    double findMedian() {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;   // the sum can overflow an int
    }
};
```

Adding is **O(log n)** and reading the median is **O(1)**. *Sliding window median* needs deletions too: either add lazy deletion to both heaps, or use an ordered multiset (`std::multiset`, Python's `sortedcontainers.SortedList`).

## Offline queries with a sweep

Answering queries **online** means answering each one as it arrives, before seeing the next. When every query is given up front, you can answer them **offline**: in whatever order is convenient, writing each answer back at the query's original index. Sorting the queries often turns a hard data-structure problem into a sweep where each item enters and leaves a heap once.

*Minimum interval to include each query*: given intervals `[l, r]` and query points, return for each query the size `r - l + 1` of the smallest interval containing it, or −1. Checking every interval per query is O(n · q).

1. Sort the intervals by `l`, and sort the query **indices** by query value.
2. Sweep the queries in increasing order. For query `x`, push every interval with `l <= x` that hasn't been pushed yet onto a min-heap keyed by size (store `r` with it).
3. While the top interval has `r < x`, pop it. It doesn't contain `x`, and since later queries are larger, it never will again.
4. The top, if any, is the smallest interval containing `x`.

Step 3 is **lazy removal**. Expired intervals deeper in the heap stay there until they reach the top, which is harmless because only the top is ever read. It's only safe because "expired" is permanent, and that's exactly what sorting the queries buys.

```python
import heapq

def min_interval(intervals, queries):
    intervals.sort()                                   # by left end
    order = sorted(range(len(queries)), key=lambda q: queries[q])
    ans = [-1] * len(queries)
    heap, i = [], 0                                    # (size, right end)
    for q in order:                                    # queries from smallest to largest
        x = queries[q]
        while i < len(intervals) and intervals[i][0] <= x:   # add every interval that has started
            l, r = intervals[i]
            heapq.heappush(heap, (r - l + 1, r))
            i += 1
        while heap and heap[0][1] < x:                 # expired: ends before x, and before every later query
            heapq.heappop(heap)
        if heap:
            ans[q] = heap[0][0]
    return ans
```

```java
int[] minInterval(int[][] intervals, int[] queries) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));   // by left end
    Integer[] order = new Integer[queries.length];
    for (int q = 0; q < order.length; q++) order[q] = q;
    Arrays.sort(order, (a, b) -> Integer.compare(queries[a], queries[b]));
    int[] ans = new int[queries.length];
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));  // {size, right}
    int i = 0;
    for (int q : order) {                                // queries from smallest to largest
        int x = queries[q];
        while (i < intervals.length && intervals[i][0] <= x) {   // add every interval that has started
            int[] iv = intervals[i++];
            heap.add(new int[]{iv[1] - iv[0] + 1, iv[1]});
        }
        while (!heap.isEmpty() && heap.peek()[1] < x) heap.poll();   // expired for good
        ans[q] = heap.isEmpty() ? -1 : heap.peek()[0];
    }
    return ans;
}
```

```cpp
vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
    sort(intervals.begin(), intervals.end());            // by left end
    vector<int> order(queries.size());
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) { return queries[a] < queries[b]; });
    vector<int> ans(queries.size(), -1);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap;   // {size, right}
    size_t i = 0;
    for (int q : order) {                                // queries from smallest to largest
        int x = queries[q];
        while (i < intervals.size() && intervals[i][0] <= x) {   // add every interval that has started
            heap.push({intervals[i][1] - intervals[i][0] + 1, intervals[i][1]});
            i++;
        }
        while (!heap.empty() && heap.top().second < x) heap.pop();   // expired for good
        if (!heap.empty()) ans[q] = heap.top().first;
    }
    return ans;
}
```

Each interval is pushed and popped at most once: **O(n log n + q log q)** time, O(n + q) space. Pitfalls:

- **Losing the original order.** Sort indices (or `(value, index)` pairs), not the query values, or the answers come out in sorted order.
- **Searching the heap for expired entries.** That's O(n) per query; check only the top.
- **Removal conditions that aren't permanent.** If an item could become valid again, lazy removal throws away answers.

The same offline idea appears elsewhere: Dijkstra skips stale heap entries ([lazy deletion](/learn/shortest-paths#lazy-deletion)), and *checking existence of edge length limited paths* sorts both edges and queries by limit and sweeps with [union-find](/learn/union-find).

## The skyline problem

*The skyline problem*: buildings are `[left, right, height]` rectangles standing on the ground. Return the outline as **key points** `[x, height]`: the x-coordinates where the outline's height changes, with the new height.

The outline can only change at a building's left or right edge, so sweep those x-coordinates in order. At each `x`, the height is the **tallest building that covers `x`**, meaning `left <= x < right` (the right edge belongs to whatever is next). A max-heap of active buildings gives the tallest in O(1):

1. Sort the buildings by `left`, and collect every distinct edge x-coordinate, sorted.
2. At each `x`, push every building with `left <= x` as `(height, right)`.
3. Pop from the top while the top's `right <= x`: it has ended. Ended buildings below the top stay until they surface, which is **lazy removal**, exactly as in the [offline sweep](/learn/heaps#offline-queries-with-a-sweep) above. Only the top is read, so buried dead entries do no harm.
4. The height at `x` is the top's height, or 0 for an empty heap. If it differs from the last key point's height, record `[x, height]`.

| x | Heap after pushes and pops (height, right) | Height | Key point |
|---|---|---|---|
| 2 | (10, 9) | 10 | [2, 10] |
| 3 | (15, 7) (10, 9) | 15 | [3, 15] |
| 5 | (15, 7) (12, 12) (10, 9) | 15 | |
| 7 | (12, 12) (10, 9) | 12 | [7, 12] |
| 9 | (12, 12) (10, 9) | 12 | |
| 12 | (empty) | 0 | [12, 0] |
| 15 | (10, 20) | 10 | [15, 10] |
| 19 | (10, 20) (8, 24) | 10 | |
| 20 | (8, 24) | 8 | [20, 8] |
| 24 | (empty) | 0 | [24, 0] |

That's buildings `[2,9,10]`, `[3,7,15]`, `[5,12,12]`, `[15,20,10]`, `[19,24,8]`. At `x = 9` the building `[2,9,10]` has ended but stays buried under 12: harmless, since it's only removed when it reaches the top at `x = 12`.

```python
import heapq

def get_skyline(buildings):
    # Outline only changes at building edges, so visit each edge x once
    # Max-heap of (height, right end) holds buildings that have started
    # Ended buildings leave lazily, only once they reach top
    # Record x whenever tallest active height differs from last point
    buildings = sorted(buildings)
    xs = sorted({x for left, right, _ in buildings for x in (left, right)})
    # (-height, right), so tallest is on top
    heap = []
    result = []
    i = 0
    for x in xs:
        # every building starting at or before x
        while i < len(buildings) and buildings[i][0] <= x:
            heapq.heappush(heap, (-buildings[i][2], buildings[i][1]))
            i += 1
        # right end <= x = no longer covers x (right edge excluded)
        while heap and heap[0][1] <= x:
            heapq.heappop(heap)
        # empty heap = ground
        height = -heap[0][0] if heap else 0
        if not result or result[-1][1] != height:
            result.append([x, height])
    return result
```

```java
List<List<Integer>> getSkyline(int[][] buildings) {
    // Outline only changes at building edges, so visit each edge x once
    // Max-heap of (height, right end) holds buildings that have started
    // Ended buildings leave lazily, only once they reach top
    // Record x whenever tallest active height differs from last point
    Arrays.sort(buildings, (a, b) -> Integer.compare(a[0], b[0]));
    TreeSet<Integer> xs = new TreeSet<>();
    for (int[] b : buildings) {
        xs.add(b[0]);
        xs.add(b[1]);
    }
    // {height, right}, tallest on top
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0]));
    List<List<Integer>> result = new ArrayList<>();
    int i = 0;
    for (int x : xs) {
        // every building starting at or before x
        while (i < buildings.length && buildings[i][0] <= x) {
            heap.add(new int[]{buildings[i][2], buildings[i][1]});
            i++;
        }
        // right end <= x = no longer covers x (right edge excluded)
        while (!heap.isEmpty() && heap.peek()[1] <= x) heap.poll();
        // empty heap = ground
        int height = heap.isEmpty() ? 0 : heap.peek()[0];
        if (result.isEmpty() || result.get(result.size() - 1).get(1) != height) {
            result.add(List.of(x, height));
        }
    }
    return result;
}
```

```cpp
vector<vector<int>> getSkyline(vector<vector<int>>& buildings) {
    // Outline only changes at building edges, so visit each edge x once
    // Max-heap of (height, right end) holds buildings that have started
    // Ended buildings leave lazily, only once they reach top
    // Record x whenever tallest active height differs from last point
    sort(buildings.begin(), buildings.end());
    set<int> xs;
    for (auto& b : buildings) {
        xs.insert(b[0]);
        xs.insert(b[1]);
    }
    // {height, right}; default max-heap puts tallest on top
    priority_queue<pair<int, int>> heap;
    vector<vector<int>> result;
    size_t i = 0;
    for (int x : xs) {
        // every building starting at or before x
        while (i < buildings.size() && buildings[i][0] <= x) {
            heap.push({buildings[i][2], buildings[i][1]});
            i++;
        }
        // right end <= x = no longer covers x (right edge excluded)
        while (!heap.empty() && heap.top().second <= x) heap.pop();
        // empty heap = ground
        int height = heap.empty() ? 0 : heap.top().first;
        if (result.empty() || result.back()[1] != height) result.push_back({x, height});
    }
    return result;
}
```

Each building is pushed and popped once: **O(n log n)** time, O(n) space. Pitfalls:

- **Emitting a point per event** instead of per x. Several buildings can start or end at the same x; handle all of them, then compare heights once, so you never output two points at one x.
- **Repeated heights.** Two touching buildings of the same height make one flat line; skip a key point whose height equals the previous one.
- **Treating the right edge as covered.** At `x = right` the building is gone, so pop on `right <= x`, not `<`.
- **Searching the heap to delete** a finished building. That's O(n) per removal; lazy removal keeps it O(log n). A multiset (C++ `multiset`, Java `TreeMap` of counts) can delete directly, which is the other common solution.

## Greedy with a heap

Many [greedy](/learn/greedy-intervals) problems have two keys per item: one that decides *when* an item becomes usable, and one that decides *how good* it is. The fix is the same each time: sort by the first key, sweep, and keep a heap over the second key so the best usable item is always one pop away. Four shapes cover most of them.

### Unlock by threshold, then take the best

*IPO*: you start with capital `w` and may finish at most `k` projects. Project `i` needs `capital[i]` to start and adds `profits[i]` to your capital when it's done. What's the most capital you can end with?

Of the projects you can afford right now, take the most profitable. Profit never lowers `w`, so the biggest gain also unlocks the most projects for later rounds. Rescanning every project each round is O(n · k); the heap version is:

1. Sort the projects by capital needed.
2. Each round, walk a pointer along the sorted list and push the profit of every project with `capital <= w` onto a max-heap. Projects unlocked earlier stay in the heap.
3. Pop the largest profit and add it to `w`. If the heap is empty, nothing is affordable now and nothing ever will be, so stop.

```python
import heapq

def find_maximized_capital(k, w, profits, capital):
    # (capital needed, profit), cheapest first
    projects = sorted(zip(capital, profits))
    # max-heap (negated) of profits now affordable
    ready = []
    i = 0
    for _ in range(k):
        # unlock every project that w now covers
        while i < len(projects) and projects[i][0] <= w:
            heapq.heappush(ready, -projects[i][1])
            i += 1
        # nothing affordable, so w can't grow
        if not ready:
            break
        w -= heapq.heappop(ready)
    return w
```

```java
int findMaximizedCapital(int k, int w, int[] profits, int[] capital) {
    int n = profits.length;
    // project indexes, cheapest first
    Integer[] order = new Integer[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Arrays.sort(order, (a, b) -> Integer.compare(capital[a], capital[b]));
    // max-heap of profits now affordable
    PriorityQueue<Integer> ready = new PriorityQueue<>(Collections.reverseOrder());
    int i = 0;
    for (int round = 0; round < k; round++) {
        // unlock every project that w now covers
        while (i < n && capital[order[i]] <= w) ready.offer(profits[order[i++]]);
        // nothing affordable, so w can't grow
        if (ready.isEmpty()) break;
        w += ready.poll();
    }
    return w;
}
```

```cpp
int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
    // (capital needed, profit), cheapest first
    vector<pair<int, int>> projects;
    for (int i = 0; i < (int)profits.size(); i++) projects.push_back({capital[i], profits[i]});
    sort(projects.begin(), projects.end());
    // max-heap of profits now affordable
    priority_queue<int> ready;
    size_t i = 0;
    for (int round = 0; round < k; round++) {
        // unlock every project that w now covers
        while (i < projects.size() && projects[i].first <= w) ready.push(projects[i++].second);
        // nothing affordable, so w can't grow
        if (ready.empty()) break;
        w += ready.top();
        ready.pop();
    }
    return w;
}
```

Each project is pushed and popped at most once: **O(n log n + k log n)** time, O(n) space. The pitfalls are clearing the heap between rounds (projects you could afford stay affordable, since `w` only grows) and re-sorting or rescanning every round.

### Sort by ratio, keep the k smallest

*Minimum cost to hire K workers*: worker `i` has a `quality[i]` and a minimum `wage[i]`. You must hire exactly `k` workers, pay each in proportion to their quality, and pay each at least their minimum. What's the cheapest group?

Everyone in a group is paid the same rate per unit of quality, and that rate must cover the pickiest member, the one with the highest `wage / quality`. So a group costs **its highest ratio × the sum of its qualities**.

1. Sort the workers by `wage / quality`.
2. Sweep. When you reach worker `i`, treat them as the one who sets the rate: everyone before them has a lower ratio, so any of them can join at this rate.
3. To make the group cheap, keep the `k` smallest qualities seen so far: push each quality onto a **max-heap** with a running sum, and pop the largest whenever the heap holds more than `k`.
4. When the heap holds exactly `k`, `sum × ratio(i)` is a candidate answer.

If the quality popped in step 3 is worker `i`'s own, the heap holds the same group as one step earlier, now priced at a higher rate. That candidate is never the best, so it does no harm.

```python
import heapq

def mincost_to_hire_workers(quality, wage, k):
    # by wage per unit of quality, lowest first
    workers = sorted(zip(quality, wage), key=lambda qw: qw[1] / qw[0])
    # max-heap (negated) of k smallest qualities so far
    heap = []
    total = 0
    best = float('inf')
    for q, w in workers:
        heapq.heappush(heap, -q)
        total += q
        # drop largest quality, keeping k cheapest
        if len(heap) > k:
            total += heapq.heappop(heap)
        # this worker has highest rate so far, so sets pay for group
        if len(heap) == k:
            best = min(best, total * w / q)
    return best
```

```java
double mincostToHireWorkers(int[] quality, int[] wage, int k) {
    int n = quality.length;
    // by wage per unit of quality (compared by cross-multiplying), lowest first
    Integer[] order = new Integer[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Arrays.sort(order, (a, b) -> Long.compare((long) wage[a] * quality[b], (long) wage[b] * quality[a]));
    // max-heap of k smallest qualities so far
    PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder());
    long total = 0;
    double best = Double.MAX_VALUE;
    for (int i : order) {
        heap.offer(quality[i]);
        total += quality[i];
        // drop largest quality, keeping k cheapest
        if (heap.size() > k) total -= heap.poll();
        // worker i has highest rate so far, so sets pay for group
        if (heap.size() == k) best = Math.min(best, total * (double) wage[i] / quality[i]);
    }
    return best;
}
```

```cpp
double mincostToHireWorkers(vector<int>& quality, vector<int>& wage, int k) {
    int n = quality.size();
    // by wage per unit of quality (compared by cross-multiplying), lowest first
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) {
        return (long long)wage[a] * quality[b] < (long long)wage[b] * quality[a];
    });
    // max-heap of k smallest qualities so far
    priority_queue<int> heap;
    long long total = 0;
    double best = DBL_MAX;
    for (int i : order) {
        heap.push(quality[i]);
        total += quality[i];
        // drop largest quality, keeping k cheapest
        if ((int)heap.size() > k) { total -= heap.top(); heap.pop(); }
        // worker i has highest rate so far, so sets pay for group
        if ((int)heap.size() == k) best = min(best, total * (double)wage[i] / quality[i]);
    }
    return best;
}
```

**O(n log n)** for the sort plus O(n log k) for the sweep. The pitfall is sorting ratios as floating-point numbers: two ratios that are equal on paper can compare unequal. Compare `wage[a] · quality[b]` with `wage[b] · quality[a]` in integers instead, as the Java and C++ versions do. *Maximum performance of a team* is the same shape: sort by efficiency from high to low, and keep the `k` largest speeds in a min-heap.

### Retroactive greedy

*Furthest building you can reach*: you walk past buildings of height `heights[i]`. Going down is free; each climb up needs either that many bricks or one ladder. With `bricks` and `ladders`, what's the furthest index you can reach?

You can't know in advance which climbs deserve the ladders. A **retroactive greedy** makes a provisional choice at each step, keeps the choices in a heap, and revises the worst one when it runs short, as if it had chosen differently back then. Ladders are worth most on the biggest climbs, so:

1. Give every climb a ladder, and push its height onto a min-heap of laddered climbs.
2. When the heap holds more climbs than you have ladders, take the ladder back from the smallest climb (pop it) and pay for that climb in bricks.
3. If bricks drop below zero, you can't make the next climb: the answer is the current index.

The heap always holds the largest `ladders` climbs so far, which is the best way to split them. It's the size-k heap from top-k, used as a log of decisions.

```diagram
{"type":"array","rows":[{"label":"heights","values":[4,2,7,6,9,14,12],"highlight":[4],"pointers":{"stop":4}},{"label":"climb","values":["","",5,"",3,5,""],"highlight":[5]}],"caption":"bricks = 5, ladders = 1. The ladder takes the climb of 5 and bricks pay the 3 (2 left). The next climb of 5 needs the ladder or 5 bricks; only one 5 can get it, so you stop at index 4."}
```

```python
import heapq

def furthest_building(heights, bricks, ladders):
    # min-heap of climbs that got ladders
    laddered = []
    for i in range(len(heights) - 1):
        climb = heights[i + 1] - heights[i]
        # downhill or flat is free
        if climb <= 0:
            continue
        heapq.heappush(laddered, climb)
        # one ladder short, so smallest laddered climb pays bricks instead
        if len(laddered) > ladders:
            bricks -= heapq.heappop(laddered)
        # can't pay even smallest climb, so stuck at i
        if bricks < 0:
            return i
    return len(heights) - 1
```

```java
int furthestBuilding(int[] heights, int bricks, int ladders) {
    // min-heap of climbs that got ladders
    PriorityQueue<Integer> laddered = new PriorityQueue<>();
    for (int i = 0; i + 1 < heights.length; i++) {
        int climb = heights[i + 1] - heights[i];
        // downhill or flat is free
        if (climb <= 0) continue;
        laddered.offer(climb);
        // one ladder short, so smallest laddered climb pays bricks instead
        if (laddered.size() > ladders) bricks -= laddered.poll();
        // can't pay even smallest climb, so stuck at i
        if (bricks < 0) return i;
    }
    return heights.length - 1;
}
```

```cpp
int furthestBuilding(vector<int>& heights, int bricks, int ladders) {
    // min-heap of climbs that got ladders
    priority_queue<int, vector<int>, greater<int>> laddered;
    for (int i = 0; i + 1 < (int)heights.size(); i++) {
        int climb = heights[i + 1] - heights[i];
        // downhill or flat is free
        if (climb <= 0) continue;
        laddered.push(climb);
        // one ladder short, so smallest laddered climb pays bricks instead
        if ((int)laddered.size() > ladders) { bricks -= laddered.top(); laddered.pop(); }
        // can't pay even smallest climb, so stuck at i
        if (bricks < 0) return i;
    }
    return heights.size() - 1;
}
```

**O(n log L)** time and O(L) space, with `L` the number of ladders. The pitfall is deciding each climb on the spot. With heights `[0, 1, 11, 12]`, 10 bricks and 1 ladder, putting the ladder on the first climb leaves 10 bricks for the climb of 10 and nothing for the last 1. The heap moves the ladder to the 10 and reaches the end.

*Minimum number of refueling stops* is the same idea with a max-heap. Drive as far as your fuel allows, and push the fuel of every station you pass onto a max-heap without stopping. When you can't reach the next station or the target, pretend you stopped at the best station already behind you: pop the largest fuel and count one stop. If the heap is empty, the trip is impossible. Each stop you count is the one that buys the most distance, so the count is the minimum.

### Merging the two smallest

*Minimum cost to connect sticks* (also called **connect ropes**): joining two ropes of lengths `a` and `b` costs `a + b`. What's the cheapest way to join them all into one?

Each rope's length is paid once for every join it takes part in, which is its depth in the tree of joins. Long ropes should be joined as few times as possible, so always join the **two shortest** ropes, and put the result back, because the joined rope competes like any other.

```diagram
{"type":"tree","values":[15,6,9,null,null,4,5,null,null,2,3],"highlight":[15,9,5],"caption":"Ropes 2, 3, 4, 6. Join 2 + 3 = 5, then 4 + 5 = 9, then 6 + 9 = 15. Cost 5 + 9 + 15 = 29: each rope times its depth (2·3 + 3·3 + 4·2 + 6·1)."}
```

```python
import heapq

def connect_sticks(sticks):
    heap = list(sticks)
    heapq.heapify(heap)
    cost = 0
    while len(heap) > 1:
        # two shortest join first, so long ropes are paid for fewest times
        joined = heapq.heappop(heap) + heapq.heappop(heap)
        cost += joined
        # joined rope competes again
        heapq.heappush(heap, joined)
    return cost
```

```java
long connectSticks(int[] sticks) {
    PriorityQueue<Long> heap = new PriorityQueue<>();
    for (int s : sticks) heap.offer((long) s);
    long cost = 0;
    while (heap.size() > 1) {
        // two shortest join first, so long ropes are paid for fewest times
        long joined = heap.poll() + heap.poll();
        cost += joined;
        // joined rope competes again
        heap.offer(joined);
    }
    return cost;
}
```

```cpp
long long connectSticks(const vector<int>& sticks) {
    priority_queue<long long, vector<long long>, greater<long long>> heap(sticks.begin(), sticks.end());
    long long cost = 0;
    while (heap.size() > 1) {
        // two shortest join first, so long ropes are paid for fewest times
        long long joined = heap.top();
        heap.pop();
        joined += heap.top();
        heap.pop();
        cost += joined;
        // joined rope competes again
        heap.push(joined);
    }
    return cost;
}
```

**O(n log n)**. Two pitfalls: sorting once and joining left to right (with `[1, 1, 1, 1]` that costs 2 + 3 + 4 = 9, while pairing costs 2 + 2 + 4 = 8), and overflow, since the total grows much faster than any one rope, so use `long` / `long long`.

**Huffman coding** is the same algorithm on character frequencies. Each join creates a parent node; at the end every character is a leaf, and its depth is the length of its code (left edge = 0, right edge = 1). The total cost is the total number of bits, and no prefix-free code does better.

## Heap vs sorted array vs balanced BST

**Heap sort** is the heap applied to sorting: heapify the array as a max-heap, then repeatedly swap the root to the end and sift down the shrinking prefix. It's O(n log n) in place but not stable; the details are in [sorting](/learn/sorting).

When should you reach for a heap rather than another ordered structure?

| Operation | Binary heap | Sorted array | Balanced BST (`TreeMap`, `std::set`) |
|---|---|---|---|
| Find the min | O(1) | O(1) | O(log n) |
| Find the max too | O(n) | O(1) | O(log n) |
| Insert | O(log n) | O(n) | O(log n) |
| Remove the min | O(log n) | O(n), or O(1) if stored in reverse | O(log n) |
| Remove an arbitrary item | O(n) | O(n) | O(log n) |
| Search for a value | O(n) | O(log n) | O(log n) |
| Build from `n` items | **O(n)** | O(n log n) | O(n log n) |
| Memory | one array, compact | one array, compact | a node per item with pointers |

- Use a **heap** when you repeatedly need only the smallest (or only the largest) item: scheduling, Dijkstra, top-k, merging, event simulation. It's the simplest and fastest option for that job.
- Use a **sorted array** when the data barely changes and you mostly search it ([binary search](/learn/binary-search)).
- Use a **balanced BST** (see [binary trees](/learn/trees)) when you need both ends, arbitrary deletions, or "the next item above `x`" queries.

## Common problems and pitfalls

| Problem | Heap idea |
|---|---|
| Kth largest element | size-k min-heap |
| Top k frequent elements | count, then a size-k min-heap by count |
| K closest points to origin | size-k max-heap by distance |
| Merge k sorted lists | k-way merge |
| Find median from data stream | two heaps |
| Meeting rooms II | min-heap of end times ([greedy & intervals](/learn/greedy-intervals)) |
| Task scheduler, reorganise string | max-heap of remaining counts; take the most frequent that's allowed (task scheduler also has a [counting formula](/learn/greedy-intervals#task-scheduler)) |
| IPO, maximum performance of a team | sort by one key, keep a heap of the other ([greedy with a heap](/learn/heaps#greedy-with-a-heap)) |
| Minimum cost to hire K workers | sort by wage / quality, max-heap keeps the k smallest qualities |
| Furthest building you can reach, minimum refueling stops | retroactive greedy: a heap of the choices already passed |
| Connect sticks, Huffman coding | repeatedly merge the two smallest |
| Course schedule III | max-heap of durations; drop the longest when over the deadline ([greedy & intervals](/learn/greedy-intervals#deadlines-with-a-max-heap)) |
| Network delay time, path with minimum effort | Dijkstra with a min-heap |
| Minimum interval to include each query | offline: sort the queries, sweep with a min-heap by size |

- **Wrong direction.** Python and Java default to a min-heap, C++ to a max-heap. Check which one you need, especially for top-k (largest needs a min-heap).
- **Comparator overflow** in Java (`a - b`) and the reversed comparator meaning in C++.
- **Changing priorities in place** breaks the heap property silently. Push a new entry and skip stale ones.
- **Expecting sorted iteration.** Only pops come out in order.
- **Empty heap.** Check before `peek`, `top` or `pop`: Python raises `IndexError`, Java's `peek` and `poll` return `null` (and unboxing that `null` into an `int` throws), and C++ is undefined behaviour.
