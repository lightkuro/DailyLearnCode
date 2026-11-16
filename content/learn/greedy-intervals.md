---
title: Greedy & intervals
summary: Take the best-looking choice at each step and never undo it. When that's safe, how to argue it, and the interval problems (merge, schedule, meeting rooms) where greedy shines.
related: sorting, dynamic-programming, heaps, two-pointers
terms:
  - greedy
  - greedy algorithm
  - greedy algorithms
  - greedy choice property #when-greedy-works
  - exchange argument #exchange-arguments
  - merge intervals #merge-intervals
  - overlapping intervals #interval-basics
  - interval scheduling #choosing-the-most-intervals
  - activity selection #choosing-the-most-intervals
  - sweep line #meeting-rooms
  - meeting rooms #meeting-rooms
  - insert interval #insert-interval
  - jump game #jump-game-and-gas-station
  - gas station #jump-game-and-gas-station
  - union of intervals #total-length-covered
  - Course Schedule III #deadlines-with-a-max-heap
  - task scheduler #task-scheduler
  - best time to buy and sell stock II #stock-trading-with-unlimited-transactions
  - patching array #patching-array-the-reach-greedy
  - flowers in full bloom #counting-intervals-that-contain-a-point
---

## What greedy means

A **greedy algorithm** builds its answer one step at a time, and at each step takes the choice that looks best right now. It never looks ahead and never goes back to change an earlier choice.

Making change is the everyday example. To pay 63 cents with coins of 25, 10, 5 and 1, take the largest coin that fits until you're done: 25, 25, 10, 1, 1, 1. Six coins, and no combination uses fewer.

Greedy solutions are short and fast: usually a sort followed by one pass, so **O(n log n)**. The hard part is never the code. It's knowing whether the greedy choice is actually safe, because a greedy algorithm that's wrong still produces a plausible-looking answer.

## When greedy works

A greedy algorithm is correct when the problem has two properties:

- **Greedy choice property**: there is an optimal solution that starts with the greedy choice. Taking it can't lock you out of the best answer.
- **Optimal substructure**: after making that choice, what's left is a smaller instance of the same problem, so you can apply the same rule again.

### Exchange arguments

The standard way to show the greedy choice property is an **exchange argument**:

1. Take any optimal solution.
2. If its first choice differs from the greedy one, swap in the greedy choice.
3. Show the result is still valid and no worse.

Repeat the swap for every step and the optimal solution turns into the greedy one without getting worse, so greedy is optimal too. For example, to fit the most meetings into one room, take the meeting that **ends first**. Any optimal schedule starts with some meeting that ends at the same time or later; swapping it for the earliest-ending one keeps the count the same and can only free up more time for the rest.

In an interview you don't need a formal proof, but one sentence of exchange argument ("swapping in the earliest-ending interval can't hurt because it frees the room sooner") is what makes a greedy answer convincing.

### When greedy fails

With coins `{1, 3, 4}` and an amount of 6, "take the biggest coin" picks 4, then 1, then 1: three coins. Two 3s do it in two.

```diagram
{"type":"array","rows":[{"label":"greedy","values":[4,1,1],"dim":[1,2]},{"label":"optimal","values":[3,3],"highlight":[0,1]}],"indices":false,"caption":"Coins {1, 3, 4}, amount 6. Taking the 4 first forces two 1s; the best answer skips the biggest coin."}
```

The greedy choice was locally best but cut off the optimal solution. Coin systems like US coins happen to be "canonical", so greedy works for them, but in general **coin change** needs [dynamic programming](/learn/dynamic-programming). The same goes for 0/1 knapsack: taking items by best value-per-weight fails, although it's optimal for the *fractional* knapsack where you can take part of an item.

Two habits catch a wrong greedy before the interviewer does:

- **Look for a counterexample.** Try three or four small inputs, especially ones where the "obvious" choice is big but blocks two medium ones.
- **If you can't state an exchange argument, suspect DP.** Problems that ask for "the number of ways", or where an early choice changes what's possible much later, usually need it.

## Interval basics

An interval is a pair `[start, end]`. Interval problems hand you a list of them (meetings, bookings, ranges on a number line) and ask you to combine, count or schedule them.

Two intervals `a` and `b` **overlap** when each starts before the other ends:

```text
overlap(a, b)  =  a.start <= b.end  and  b.start <= a.end
               =  max(a.start, b.start) <= min(a.end, b.end)
```

Whether **touching** intervals (`[1, 2]` and `[2, 3]`) count as overlapping depends on the problem: they merge in "merge intervals", but a meeting ending at 2 doesn't clash with one starting at 2. Use `<` instead of `<=` for that version, and ask if the statement doesn't say.

Almost every interval solution starts by sorting, and the key you sort by decides what the greedy pass can do:

| Sort by | Use it when you're | Examples |
|---|---|---|
| **Start** | walking through time and combining what overlaps | merge intervals, insert interval, meeting rooms |
| **End** | choosing as many intervals as possible, or removing as few | activity selection, non-overlapping intervals, minimum arrows to burst balloons |

## Merge intervals

**Merge intervals**: given a list of intervals, merge every group that overlaps. Sort by start. Then each interval either overlaps the last merged one (its start is at or before that one's end), so you extend it, or it starts a new merged interval.

```diagram
{"type":"grid","cells":[["","■","■","","","","","","","","",""],["","","■","■","■","■","","","","","",""],["","","","","","","","","■","■","",""],["","","","","","","","","","■","■","■"],["","■","■","■","■","■","","","■","■","■","■"]],"rowLabels":["[1,3]","[2,6]","[8,10]","[9,12]","merged"],"colLabels":[0,1,2,3,4,5,6,7,8,9,10,11],"highlight":[[4,1],[4,2],[4,3],[4,4],[4,5],[4,8],[4,9],[4,10],[4,11]],"caption":"Sorted by start: [2,6] overlaps [1,3] and [9,12] overlaps [8,10], giving [1,6] and [8,12]. Column t is the time from t to t + 1."}
```

```python
def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])          # by start
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:     # overlaps the last merged interval
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
```

```java
int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));   // by start
    List<int[]> merged = new ArrayList<>();
    for (int[] iv : intervals) {
        if (!merged.isEmpty() && iv[0] <= merged.get(merged.size() - 1)[1]) {
            int[] last = merged.get(merged.size() - 1);
            last[1] = Math.max(last[1], iv[1]);       // overlaps: extend it
        } else {
            merged.add(new int[]{iv[0], iv[1]});
        }
    }
    return merged.toArray(new int[0][]);
}
```

```cpp
vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());     // by start (then end)
    vector<vector<int>> merged;
    for (auto& iv : intervals) {
        if (!merged.empty() && iv[0] <= merged.back()[1])
            merged.back()[1] = max(merged.back()[1], iv[1]);   // overlaps: extend it
        else
            merged.push_back(iv);
    }
    return merged;
}
```

**O(n log n)** for the sort, O(n) for the pass. Note the `max` when extending: `[1, 10]` followed by `[2, 3]` must stay `[1, 10]`, not shrink to `[1, 3]`.

### Insert interval

**Insert interval**: the list is already sorted and non-overlapping, and you add one new interval. No sort needed; one O(n) pass in three phases:

1. Copy every interval that ends before the new one starts.
2. While intervals overlap the new one, absorb them: `new.start = min(...)`, `new.end = max(...)`. Then output the new interval.
3. Copy the rest.

### Total length covered

*What total length do these intervals cover?* (also asked as the size of the **union of intervals**: time with at least one meeting, total painted length). Adding up the lengths counts overlaps twice. Merging first and summing the merged lengths works; you can also do it in the same pass without building the list:

1. Sort by start.
2. Keep `reach`, the rightmost point already counted.
3. For each interval, count only the part past `reach`: `end - max(start, reach)` if `end > reach`, then move `reach` to `end`.

```python
def covered_length(intervals):
    total = 0
    # rightmost point already counted
    reach = float('-inf')
    for start, end in sorted(intervals):
        # count only part past reach
        if end > reach:
            total += end - max(start, reach)
            reach = end
    return total
```

```java
long coveredLength(int[][] intervals) {
    // by start
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    long total = 0;
    // rightmost point already counted
    long reach = Long.MIN_VALUE;
    for (int[] iv : intervals) {
        // count only part past reach
        if (iv[1] > reach) {
            total += iv[1] - Math.max(iv[0], reach);
            reach = iv[1];
        }
    }
    return total;
}
```

```cpp
long long coveredLength(vector<vector<int>>& intervals) {
    // by start
    sort(intervals.begin(), intervals.end());
    long long total = 0;
    // rightmost point already counted
    long long reach = LLONG_MIN;
    for (auto& iv : intervals) {
        // count only part past reach
        if (iv[1] > reach) {
            total += iv[1] - max((long long)iv[0], reach);
            reach = iv[1];
        }
    }
    return total;
}
```

**O(n log n)** for the sort, O(1) extra space. The pitfall is the meaning of an interval. These snippets treat `[start, end]` as a stretch of the number line, so `[1, 3]` has length 2. If intervals list whole cells or days inclusively (`[1, 3]` = days 1, 2 and 3), convert each to `[start, end + 1]` first, or every interval comes out one short.

## Choosing the most intervals

**Activity selection** (also called **interval scheduling**): pick as many non-overlapping intervals as possible. Sort by **end**, then take each interval that starts at or after the end of the last one you took. The exchange argument above is why: the earliest-ending interval leaves the most room for everything after it.

```diagram
{"type":"grid","cells":[["","■","■","","","","","","","","",""],["","","","■","■","","","","","","",""],["■","■","■","■","■","■","","","","","",""],["","","","","■","■","■","","","","",""],["","","","","","■","■","■","","","",""],["","","","","","","","","■","■","■",""],["","","","","","","■","■","■","■","■","■"]],"rowLabels":["[1,3]","[3,5]","[0,6]","[4,7]","[5,8]","[8,11]","[6,12]"],"colLabels":[0,1,2,3,4,5,6,7,8,9,10,11],"highlight":[[0,1],[0,2],[1,3],[1,4],[4,5],[4,6],[4,7],[5,8],[5,9],[5,10]],"dim":[[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,4],[3,5],[3,6],[6,6],[6,7],[6,8],[6,9],[6,10],[6,11]],"caption":"Sorted by end. Take [1,3], then each interval that starts at or after the last end: [3,5], [5,8], [8,11]. Four is the maximum."}
```

Sorting by start fails here: `[0, 6]` comes first and blocks both `[1, 3]` and `[3, 5]`. Sorting by length fails too: a short interval can sit across two long ones that don't overlap each other. And if each interval carries a weight and you want the largest total weight rather than the most intervals, no greedy order works: that's [weighted interval scheduling](/learn/dynamic-programming#weighted-interval-scheduling), a DP.

*Non-overlapping intervals* asks the same question the other way round: remove the fewest intervals so the rest don't overlap. That's `n` minus the most you can keep:

```python
def erase_overlap_intervals(intervals):
    intervals.sort(key=lambda iv: iv[1])          # by end
    kept, last_end = 0, float('-inf')
    for start, end in intervals:
        if start >= last_end:                     # fits after the last kept interval
            kept += 1
            last_end = end
    return len(intervals) - kept                  # everything else is removed
```

```java
int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));   // by end
    int kept = 0;
    long lastEnd = Long.MIN_VALUE;
    for (int[] iv : intervals) {
        if (iv[0] >= lastEnd) {                   // fits after the last kept interval
            kept++;
            lastEnd = iv[1];
        }
    }
    return intervals.length - kept;
}
```

```cpp
int eraseOverlapIntervals(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end(),
         [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });   // by end
    int kept = 0;
    long long lastEnd = LLONG_MIN;
    for (auto& iv : intervals) {
        if (iv[0] >= lastEnd) {                   // fits after the last kept interval
            kept++;
            lastEnd = iv[1];
        }
    }
    return intervals.size() - kept;
}
```

*Minimum arrows to burst balloons* is the same loop with touching counted as overlap (`start > lastEnd` starts a new arrow), and the answer is the number kept.

## Meeting rooms

*Meeting rooms I* asks whether one person can attend every meeting: sort by start and check that no meeting starts before the previous one ends.

*Meeting rooms II* asks how many rooms you need. That's the largest number of meetings in progress at the same moment.

```diagram
{"type":"grid","cells":[["","■","■","■","■","","","","",""],["","","■","■","","","","","",""],["","","","■","■","■","■","","",""],["","","","","","■","■","■","",""],["","","","","","","■","■","■",""],[0,1,2,3,2,2,3,2,1,0]],"rowLabels":["[1,5]","[2,4]","[3,7]","[5,8]","[6,9]","in use"],"colLabels":[0,1,2,3,4,5,6,7,8,9],"highlight":[[5,3],[5,6]],"caption":"Count the meetings in progress at each moment: the peak (3, at times 3 and 6) is the number of rooms needed."}
```

**With a min-heap.** Sort by start. Keep a min-heap of end times, one per room in use. For each meeting, if the room that frees up earliest is free by its start, reuse it (pop); then push this meeting's end. The heap's size at the end is the answer, because it only ever grows by one or stays the same.

```python
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda iv: iv[0])          # by start
    ends = []                                     # min-heap: end time of each room in use
    for start, end in intervals:
        if ends and ends[0] <= start:             # the earliest-free room is free by now
            heapq.heappop(ends)
        heapq.heappush(ends, end)
    return len(ends)
```

```java
int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));   // by start
    PriorityQueue<Integer> ends = new PriorityQueue<>();              // min-heap of end times
    for (int[] iv : intervals) {
        if (!ends.isEmpty() && ends.peek() <= iv[0]) ends.poll();    // reuse that room
        ends.add(iv[1]);
    }
    return ends.size();
}
```

```cpp
int minMeetingRooms(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());                 // by start
    priority_queue<int, vector<int>, greater<int>> ends;      // min-heap of end times
    for (auto& iv : intervals) {
        if (!ends.empty() && ends.top() <= iv[0]) ends.pop(); // reuse that room
        ends.push(iv[1]);
    }
    return ends.size();
}
```

**With a sweep line.** Turn each meeting into two events: `+1` at its start and `-1` at its end. Sort the events by time, putting `-1` before `+1` at equal times (a room freed at 5 can be reused at 5), and walk through them keeping a running count. The maximum count is the answer; the "in use" row in the diagram is exactly that count. An equivalent version sorts the starts and the ends into two arrays and advances two pointers.

Both are O(n log n). The sweep line generalises to "maximum overlap" questions of any kind; the heap version also tells you *which* room each meeting gets. For more on heaps, see [Heaps & priority queues](/learn/heaps).

### Counting intervals that contain a point

The sorted starts and ends also answer point queries. *Number of flowers in full bloom*: flower `i` blooms on days `[start, end]` (inclusive); for each person's arrival day `t`, how many flowers are in bloom? Checking every flower per person is O(n · q).

An interval contains `t` when it **started by `t`** and **hasn't ended before `t`**. Every interval that ended before `t` also started before `t`, so the count is a plain subtraction:

`blooming(t) = #(start ≤ t) − #(end < t)`

Sort the starts and the ends separately (the pairing doesn't matter any more), and each count is one [binary search](/learn/binary-search#lower-bound-and-upper-bound): an upper bound in `starts`, a lower bound in `ends`.

```diagram
{"type":"array","rows":[{"label":"starts","values":[1,3,4,9],"highlight":[0,1,2]},{"label":"ends","values":[6,7,12,13],"highlight":[0]}],"caption":"Flowers [1,6], [3,7], [9,12], [4,13] and t = 7. Three started by day 7 and one ended before it (6), so 3 − 1 = 2 are in bloom."}
```

```python
from bisect import bisect_left, bisect_right

def full_bloom_flowers(flowers, people):
    # Intervals holding t = started by t minus ended before t
    # Every interval that ended before t also started before t, so subtraction is exact
    starts = sorted(s for s, _ in flowers)
    ends = sorted(e for _, e in flowers)
    # starts <= t, minus ends < t (end inclusive, so end == t still blooms)
    return [bisect_right(starts, t) - bisect_left(ends, t) for t in people]
```

```java
int[] fullBloomFlowers(int[][] flowers, int[] people) {
    // Intervals holding t = started by t minus ended before t
    // Every interval that ended before t also started before t, so subtraction is exact
    int n = flowers.length;
    int[] starts = new int[n], ends = new int[n];
    for (int i = 0; i < n; i++) {
        starts[i] = flowers[i][0];
        ends[i] = flowers[i][1];
    }
    Arrays.sort(starts);
    Arrays.sort(ends);
    int[] ans = new int[people.length];
    for (int i = 0; i < people.length; i++) {
        // starts <= t, minus ends < t (end inclusive, so end == t still blooms)
        ans[i] = countBelow(starts, people[i] + 1) - countBelow(ends, people[i]);
    }
    return ans;
}

// count of values < x in sorted array (lower bound)
int countBelow(int[] sorted, int x) {
    int lo = 0, hi = sorted.length;
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (sorted[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

```cpp
vector<int> fullBloomFlowers(const vector<vector<int>>& flowers, const vector<int>& people) {
    // Intervals holding t = started by t minus ended before t
    // Every interval that ended before t also started before t, so subtraction is exact
    vector<int> starts, ends;
    for (auto& f : flowers) {
        starts.push_back(f[0]);
        ends.push_back(f[1]);
    }
    sort(starts.begin(), starts.end());
    sort(ends.begin(), ends.end());
    vector<int> ans;
    for (int t : people) {
        // starts <= t, minus ends < t (end inclusive, so end == t still blooms)
        int started = upper_bound(starts.begin(), starts.end(), t) - starts.begin();
        int ended = lower_bound(ends.begin(), ends.end(), t) - ends.begin();
        ans.push_back(started - ended);
    }
    return ans;
}
```

**O((n + q) log n)** time, O(n) space. The pitfall is the **inclusive end**: a flower ending on day `t` is still in bloom, so count ends **strictly** before `t` (`bisect_left`, `lower_bound`), and starts **up to and including** `t` (`bisect_right`, `upper_bound`). With half-open intervals `[start, end)` both sides change. If the queries are sorted too, two pointers replace the binary searches; if you need the count at every integer point, a [difference array](/learn/prefix-sums#difference-arrays) is simpler.

## Deadlines with a max-heap

*Course Schedule III*: each course takes `duration` days in one go and must finish by day `lastDay`. You take one course at a time, starting on day 0. What's the most courses you can take?

Sort by deadline: if a set of courses fits at all, it fits in deadline order. Then sweep with a **max-heap of the durations taken** and the total `time` they use:

1. Take each course: push its duration and add it to `time`.
2. If `time` is now past this course's deadline, drop the **longest** course taken so far (pop the heap), which may be the one just added.

One drop is always enough. Before this course was added, everything fit by the previous deadline. The longest duration is at least the new one, so after dropping it `time` is no more than it was before, and the new deadline is no earlier. And the drop is the right one: the number of courses stays the same as before, while the time used is as small as it can be, which leaves the most room for later courses. That's an exchange argument with a heap; [heaps](/learn/heaps#retroactive-greedy) calls it a retroactive greedy.

| Course (duration, last day) | `time` after adding | Action | Taken |
|---|---|---|---|
| (100, 200) | 100 | fits | 100 |
| (1000, 1250) | 1100 | fits | 100, 1000 |
| (200, 1300) | 1300 | fits | 100, 1000, 200 |
| (2000, 3200) | 3300 | over: drop 2000 | 100, 1000, 200 |

```python
import heapq

def schedule_course(courses):
    # by deadline
    courses.sort(key=lambda c: c[1])
    # max-heap (negated) of durations taken
    taken = []
    time = 0
    for duration, last_day in courses:
        heapq.heappush(taken, -duration)
        time += duration
        # past deadline, so drop longest course taken (maybe this one)
        if time > last_day:
            time += heapq.heappop(taken)
    return len(taken)
```

```java
int scheduleCourse(int[][] courses) {
    // by deadline
    Arrays.sort(courses, (a, b) -> Integer.compare(a[1], b[1]));
    // max-heap of durations taken
    PriorityQueue<Integer> taken = new PriorityQueue<>(Collections.reverseOrder());
    int time = 0;
    for (int[] c : courses) {
        taken.offer(c[0]);
        time += c[0];
        // past deadline, so drop longest course taken (maybe this one)
        if (time > c[1]) time -= taken.poll();
    }
    return taken.size();
}
```

```cpp
int scheduleCourse(vector<vector<int>>& courses) {
    // by deadline
    sort(courses.begin(), courses.end(),
         [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
    // max-heap of durations taken
    priority_queue<int> taken;
    int time = 0;
    for (auto& c : courses) {
        taken.push(c[0]);
        time += c[0];
        // past deadline, so drop longest course taken (maybe this one)
        if (time > c[1]) { time -= taken.top(); taken.pop(); }
    }
    return taken.size();
}
```

**O(n log n)**. The common mistake is skipping the new course when it doesn't fit, instead of swapping it for the longest one. With `[[5, 5], [4, 6], [2, 6]]`, skipping keeps only the 5-day course; swapping drops it for the 4, then adds the 2, for 2 courses. Sorting by duration instead of deadline fails too.

## Jump game and gas station

Greedy isn't only for intervals. A few classic array problems have one-pass greedy solutions.

**Jump game**: `nums[i]` is the longest jump you can make from index `i`. Can you reach the last index? Keep `farthest`, the farthest index reachable so far. Walk left to right; if you ever stand on an index beyond `farthest`, you're stuck.

```diagram
{"type":"array","rows":[{"label":"nums","values":[2,3,1,1,4]},{"label":"farthest","values":[2,4,4,4,8],"highlight":[1]},{"label":"nums","values":[3,2,1,0,4],"highlight":[3]},{"label":"farthest","values":[3,3,3,3,"✗"],"highlight":[4]}],"caption":"Top: from index 1, farthest reaches 4, the last index. Bottom: every path lands on the 0 at index 3; index 4 is beyond farthest = 3."}
```

```python
def can_jump(nums):
    farthest = 0
    for i, step in enumerate(nums):
        if i > farthest:                  # can't even stand here
            return False
        farthest = max(farthest, i + step)
    return True
```

```java
boolean canJump(int[] nums) {
    int farthest = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > farthest) return false;   // can't even stand here
        farthest = Math.max(farthest, i + nums[i]);
    }
    return true;
}
```

```cpp
bool canJump(const vector<int>& nums) {
    int farthest = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (i > farthest) return false;   // can't even stand here
        farthest = max(farthest, i + nums[i]);
    }
    return true;
}
```

*Jump game II* asks for the fewest jumps. Treat it like BFS by levels: the indices reachable with `k` jumps form a window. Scan the window while tracking `farthest`; when `i` reaches the window's end, take a jump, and the next window ends at `farthest`.

**Gas station**: stations in a circle, `gas[i]` to fill up and `cost[i]` to drive to the next one. Find the start that completes the loop (the problem promises at most one). Two facts give an O(n) answer:

- If total gas is less than total cost, no start works.
- If you start at `s` and run dry on the way to `i + 1`, then no station between `s` and `i` works either: each of them would arrive at `i` with no more fuel than you had. So restart at `i + 1` with an empty tank.

```python
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start, tank = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:                      # can't reach i + 1 from start, or from anything in between
            start, tank = i + 1, 0
    return start
```

```java
int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < gas.length; i++) {
        total += gas[i] - cost[i];
        tank += gas[i] - cost[i];
        if (tank < 0) {                   // can't reach i + 1 from start, or from anything in between
            start = i + 1;
            tank = 0;
        }
    }
    return total < 0 ? -1 : start;
}
```

```cpp
int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        total += gas[i] - cost[i];
        tank += gas[i] - cost[i];
        if (tank < 0) {                   // can't reach i + 1 from start, or from anything in between
            start = i + 1;
            tank = 0;
        }
    }
    return total < 0 ? -1 : start;
}
```

### Stock trading with unlimited transactions

*Best time to buy and sell stock II*: given daily prices, buy and sell as many times as you like, holding at most one share at a time. What's the most profit?

Add up every rise from one day to the next. Any trade from day `i` to day `j` earns `prices[j] - prices[i]`, which is the sum of the daily changes in between. Keeping only the positive changes can't earn less, and each one is a trade of its own: buy the day before, sell that day. Buying and selling on the same day cancels out, so a long climb split into daily trades earns the same as one trade.

```diagram
{"type":"array","rows":[{"label":"price","values":[7,1,5,3,6,4]},{"label":"change","values":["",-6,4,-2,3,-2],"highlight":[2,4]}],"caption":"Only the rises count: 4 (buy at 1, sell at 5) + 3 (buy at 3, sell at 6) = 7."}
```

```python
def max_profit(prices):
    profit = 0
    for i in range(1, len(prices)):
        # bank every rise (buy yesterday, sell today)
        profit += max(0, prices[i] - prices[i - 1])
    return profit
```

```java
int maxProfit(int[] prices) {
    int profit = 0;
    for (int i = 1; i < prices.length; i++)
        // bank every rise (buy yesterday, sell today)
        profit += Math.max(0, prices[i] - prices[i - 1]);
    return profit;
}
```

```cpp
int maxProfit(const vector<int>& prices) {
    int profit = 0;
    for (int i = 1; i < (int)prices.size(); i++)
        // bank every rise (buy yesterday, sell today)
        profit += max(0, prices[i] - prices[i - 1]);
    return profit;
}
```

**O(n)** time, O(1) space. Don't carry this rule over to the other versions. With **one** transaction, track the lowest price so far instead. With a fee, a cooldown, or at most `k` transactions, small rises are no longer free to take, and the problem needs [dynamic programming](/learn/dynamic-programming) with a "holding or not" state.

## Patching array: the reach greedy

*Patching array*: given a sorted array `nums` and a number `n`, add the fewest numbers so that every value in `1..n` is the sum of some subset of the array.

Track **`reach`**: every sum in `1..reach` can be made with the numbers used so far (start at 0, nothing made yet). Now look at the next number `x`:

- If `x <= reach + 1`, adding it extends the range with no gap. Old sums cover `1..reach`, and `x` plus old sums cover `x..x + reach`. Those two ranges touch, so `reach` becomes `reach + x`.
- If `x > reach + 1`, nothing can ever make `reach + 1`: every remaining number is too big, and the used ones sum to at most `reach`. Something must be patched in, and the best patch is **`reach + 1` itself**, the largest number that keeps the range gap-free. It takes `reach` to `2 · reach + 1`.

Stop as soon as `reach >= n`.

| Step | Number | Patched? | reach |
|---|---|---|---|
| start | | | 0 |
| 1 | 1 (from nums) | | 1 |
| 2 | 2 (gap at 2: 5 > 2) | yes | 3 |
| 3 | 4 (gap at 4: 5 > 4) | yes | 7 |
| 4 | 5 (from nums) | | 12 |
| 5 | 10 (from nums) | | 22 ≥ 20 |

That's `nums = [1, 5, 10]`, `n = 20`: two patches.

```python
def min_patches(nums, n):
    # Next number x <= reach + 1 extends reach to reach + x with no gap
    # Bigger x leaves reach + 1 unmakeable, so patch with reach + 1 itself
    # Each patch at least doubles reach, so O(log n) patches
    # reach (every sum 1..reach makeable so far)
    reach, patches, i = 0, 0, 0
    while reach < n:
        if i < len(nums) and nums[i] <= reach + 1:
            reach += nums[i]
            i += 1
        else:
            # gap at reach + 1; adding it covers 1..2 * reach + 1
            reach += reach + 1
            patches += 1
    return patches
```

```java
int minPatches(int[] nums, int n) {
    // Next number x <= reach + 1 extends reach to reach + x with no gap
    // Bigger x leaves reach + 1 unmakeable, so patch with reach + 1 itself
    // Each patch at least doubles reach, so O(log n) patches
    // reach (every sum 1..reach makeable so far)
    // long, since it can pass Integer.MAX_VALUE
    long reach = 0;
    int patches = 0, i = 0;
    while (reach < n) {
        if (i < nums.length && nums[i] <= reach + 1) {
            reach += nums[i++];
        } else {
            // gap at reach + 1; adding it covers 1..2 * reach + 1
            reach += reach + 1;
            patches++;
        }
    }
    return patches;
}
```

```cpp
int minPatches(const vector<int>& nums, int n) {
    // Next number x <= reach + 1 extends reach to reach + x with no gap
    // Bigger x leaves reach + 1 unmakeable, so patch with reach + 1 itself
    // Each patch at least doubles reach, so O(log n) patches
    // reach (every sum 1..reach makeable so far)
    // long long, since it can pass INT_MAX
    long long reach = 0;
    int patches = 0;
    size_t i = 0;
    while (reach < n) {
        if (i < nums.size() && nums[i] <= reach + 1) {
            reach += nums[i++];
        } else {
            // gap at reach + 1; adding it covers 1..2 * reach + 1
            reach += reach + 1;
            patches++;
        }
    }
    return patches;
}
```

Why is patching `reach + 1` optimal? Any patch must be at most `reach + 1` (anything bigger still leaves `reach + 1` unmakeable), and a bigger reach is never worse, so the largest legal patch wins by an exchange argument. Each patch more than doubles `reach`, so there are at most about log₂ n patches: **O(len(nums) + log n)** time, O(1) space. The pitfall is **overflow**: `n` can be 2³¹ − 1, and `reach` can overshoot it, so use a 64-bit `reach` in Java and C++. *Maximum number of consecutive values you can make* is the same loop with no patching: sort the coins and stop at the first gap.

## Task scheduler

*Task scheduler*: tasks are letters, each takes one slot, and two runs of the same letter need at least `n` other slots between them (other tasks or idle). What's the fewest slots to run them all? Simulating with a max-heap of remaining counts works, but a counting formula answers it in O(N).

Let `maxCount` be the count of the most frequent task, and `tied` the number of tasks with that count.

1. The most frequent task needs `maxCount - 1` gaps of at least `n` slots after each run except the last. That makes `maxCount - 1` **frames** of `n + 1` slots, each starting with that task.
2. The last frame holds only the tasks tied for the top count: `tied` slots.
3. Every other task fits in the frames' empty slots, because it appears fewer than `maxCount` times and so never lands twice in one frame. Total: `(maxCount - 1) · (n + 1) + tied`.
4. If there are more tasks than empty slots, no idle slot is needed at all, and the answer is simply the number of tasks. So take the larger of the two.

```diagram
{"type":"array","values":["A","B","idle","A","B","idle","A","B"],"dim":[2,5],"window":[0,2],"caption":"AAABBB with n = 2: maxCount = 3 and tied = 2 (A and B), so (3 − 1) · 3 + 2 = 8 slots. The bracket marks the first frame of n + 1 = 3."}
```

```python
from collections import Counter

def least_interval(tasks, n):
    counts = Counter(tasks).values()
    max_count = max(counts)
    # tasks tied for most frequent share last frame
    tied = sum(1 for c in counts if c == max_count)
    # max_count - 1 full frames of n + 1 slots, then last frame
    return max(len(tasks), (max_count - 1) * (n + 1) + tied)
```

```java
int leastInterval(char[] tasks, int n) {
    int[] count = new int[26];
    for (char t : tasks) count[t - 'A']++;
    int maxCount = 0, tied = 0;
    for (int c : count) {
        // new top count, so restart tie count
        if (c > maxCount) { maxCount = c; tied = 1; }
        else if (c == maxCount) tied++;
    }
    // maxCount - 1 full frames of n + 1 slots, then last frame
    return Math.max(tasks.length, (maxCount - 1) * (n + 1) + tied);
}
```

```cpp
int leastInterval(const vector<char>& tasks, int n) {
    int count[26] = {};
    for (char t : tasks) count[t - 'A']++;
    int maxCount = 0, tied = 0;
    for (int c : count) {
        // new top count, so restart tie count
        if (c > maxCount) { maxCount = c; tied = 1; }
        else if (c == maxCount) tied++;
    }
    // maxCount - 1 full frames of n + 1 slots, then last frame
    return max((int)tasks.size(), (maxCount - 1) * (n + 1) + tied);
}
```

**O(N)** time for `N` tasks and O(1) space. The usual bug is forgetting the `max` with the task count: `AAABBBCCDDEE` with `n = 2` gives `(3 − 1) · 3 + 2 = 8` from the formula, but there are 12 tasks and they need 12 slots. When the problem asks for the order itself (*Reorganize string*), use the max-heap simulation from [heaps](/learn/heaps).

## Common problems and pitfalls

| Problem | Greedy rule | Time |
|---|---|---|
| Merge intervals | sort by start, extend the last merged | O(n log n) |
| Insert interval | copy before, absorb overlaps, copy after | O(n) |
| Non-overlapping intervals | sort by end, keep if `start >= lastEnd` | O(n log n) |
| Minimum arrows to burst balloons | sort by end, new arrow if `start > lastEnd` | O(n log n) |
| Meeting rooms II | min-heap of end times, or a sweep line | O(n log n) |
| Total length covered | sort by start, count only the part past `reach` | O(n log n) |
| Course schedule III | sort by deadline, drop the longest when over | O(n log n) |
| Task scheduler | `max(tasks, (maxCount − 1) · (n + 1) + tied)` | O(n) |
| Interval list intersections | two pointers; advance the one that ends first | O(n + m) |
| Jump game / Jump game II | track the farthest reach | O(n) |
| Gas station | restart after the tank goes negative | O(n) |
| Best time to buy and sell stock II | sum of the positive day-to-day changes | O(n) |
| Partition labels | cut when `i` reaches the last occurrence of every letter seen | O(n) |
| Assign cookies | sort both, match the smallest cookie that satisfies each child | O(n log n) |

- **Java comparator overflow.** `(a, b) -> a[0] - b[0]` overflows for values near ±2³¹ and sorts wrongly. Use `Integer.compare`.
- **Open or closed ends.** Decide whether touching intervals overlap before writing `<` or `<=`, and keep it consistent between the sort, the check and the update.
- **Sorting the wrong key.** Merging wants start order; maximising the count wants end order.
- **Sorting in place.** All the snippets above reorder the caller's list. Copy first if the input must stay as it was.
- **Trusting a greedy without testing it.** If a small counterexample exists, an interviewer will find it. Check two or three tricky inputs, and fall back to [dynamic programming](/learn/dynamic-programming) when the exchange argument won't come.
