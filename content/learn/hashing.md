---
title: Hash maps & sets
summary: How hash tables give average O(1) lookups, what collisions and load factor do to that, and the counting, complement and grouping patterns behind many interview problems.
related: arrays-strings, big-o, two-pointers, sliding-window, prefix-sums
terms:
  - hash map
  - hash maps
  - hash set
  - hash sets
  - hash table
  - hash tables
  - hash function #the-idea-keys-to-slots
  - hash collision #collisions
  - separate chaining #separate-chaining
  - open addressing #open-addressing
  - load factor #load-factor-and-resizing
  - frequency map #pattern-frequency-counting
  - HashMap #sets-maps-and-their-apis
  - unordered_map #sets-maps-and-their-apis
  - majority element #boyer-moore-majority-vote
  - Boyer-Moore majority vote #boyer-moore-majority-vote
  - Boyer–Moore majority vote #boyer-moore-majority-vote
  - Boyer-Moore voting #boyer-moore-majority-vote
  - hash flooding #worst-case-collisions-and-hash-flooding
  - HashDoS #worst-case-collisions-and-hash-flooding
  - SipHash #worst-case-collisions-and-hash-flooding
---

## The idea: keys to slots

If your keys were small integers, you could store values in an array and look up key `k` at `a[k]` in O(1). A **hash table** extends that to any key (strings, tuples, objects) by first turning the key into an integer:

`slot = hash(key) % capacity`

A **hash function** maps a key to an integer. A good one is:

- **Deterministic**: the same key always gives the same hash, and keys that are equal must hash equally.
- **Fast**: O(length of the key). Hashing a string of length `k` is O(k), which matters when keys are long.
- **Well spread**: similar keys land in different slots. Java's `String.hashCode()`, for example, is the polynomial `s[0]·31^(k−1) + s[1]·31^(k−2) + … + s[k−1]`.

Two different keys can still land in the same slot. That's a **hash collision**, and how the table handles it decides its performance.

## Collisions

### Separate chaining

With **separate chaining**, each slot (a **bucket**) holds a small list of entries. Insert appends to the bucket's list; lookup hashes to the bucket and walks its list comparing keys with `==`/`equals`.

```diagram
{"type":"buckets","buckets":[[20,15],[],[12,7,17],[3],[]],"highlight":[[2,2]],"caption":"Chaining with h(k) = k mod 5 after inserting 12, 7, 20, 3, 17, 15. Looking up 17 goes to bucket 2 and walks 12 → 7 → 17."}
```

Java's `HashMap` and C++'s `unordered_map` use chaining. Java adds a twist: when one bucket grows past 8 entries (and the table has at least 64 buckets), it turns that bucket into a red-black tree, so a bad bucket costs O(log n) instead of O(n).

### Open addressing

With **open addressing**, entries live directly in the array. On a collision, the table **probes** other slots in a fixed sequence until it finds a free one: the next slot (linear probing), slots at growing jumps (quadratic probing), or a step size from a second hash (double hashing). Lookup follows the same sequence until it finds the key or an empty slot.

```diagram
{"type":"array","values":["","","",3,12,20,28,""],"highlight":[4,5,6],"pointers":{"h(28)":4},"caption":"Linear probing with h(k) = k mod 8 after inserting 12, 20, 3, 28. Key 28 hashes to slot 4, finds 4 and 5 taken, and lands in 6."}
```

Python's `dict` and `set` use open addressing with a pseudo-random probe sequence. Deleting is the awkward part: you can't simply empty a slot, or later lookups would stop early, so deleted slots are marked with a "tombstone".

## Load factor and resizing

The **load factor** is `entries / capacity`. As it rises, chains get longer and probe sequences get longer, so tables resize before it gets too high:

| Table | Grows when the load factor passes |
|---|---|
| Java `HashMap` | 0.75 (default capacity 16, doubles) |
| C++ `unordered_map` | `max_load_factor()`, default 1.0 |
| Python `dict` | about 2/3 |

Resizing allocates a bigger array and **rehashes** every entry into it (slots depend on the capacity, so entries can't just be copied across). That's O(n), but it happens after a doubling, so inserts stay **amortized O(1)**, the same argument as for dynamic arrays in [Big-O & complexity](/learn/big-o). If you know the size in advance, pre-size the table (`new HashMap<>(2 * n)`, `m.reserve(n)`) to skip the rehashes.

| Operation | Average | Worst |
|---|---|---|
| Insert, lookup, delete | O(1) | O(n) |
| Iterate over all entries | O(n + capacity) | O(n + capacity) |

The O(1) is an average that assumes the hash function spreads keys well. If many keys collide, every operation degrades toward O(n). That rarely happens by accident, but it can happen on purpose: Python randomizes string hashes per process for exactly this reason, and competitive programmers craft inputs that break `unordered_map`'s default integer hash. State it as "O(1) on average" in interviews.

### Worst-case collisions and hash flooding

If every key lands in the same bucket, a hash table becomes a list: each insert or lookup walks all the colliding entries, so one operation costs O(n) and inserting n keys costs O(n²). With a constant hash, doubling the number of keys quadruples the time:

```python
import time

class Key:
    def __init__(self, v): self.v = v
    # every key collides
    def __hash__(self): return 42
    def __eq__(self, other): return self.v == other.v

for n in (1000, 2000, 4000):
    t = time.perf_counter()
    d = {Key(i): i for i in range(n)}
    print(n, round(time.perf_counter() - t, 3))   # about 0.02, 0.09, 0.36 s
```

Random keys almost never do this. An attacker can, if the hash function is public and fixed: **hash flooding** (or **HashDoS**) means sending input whose keys all collide, such as a POST body with thousands of form fields or a JSON object with thousands of crafted keys, which the server parses into a hash map. In 2011 this was shown to take down PHP, Java, Python, Ruby and ASP.NET servers: a request of a few hundred kilobytes could keep a CPU busy for minutes. It shows up in interviews as "what's the worst case of a hash map, and can it actually happen?", and in competitive programming, where people post inputs that break `unordered_map`.

The defences:

- **Keyed (randomized) hashing.** Mix a secret random seed, chosen when the process starts, into the hash. Without the seed an attacker can't predict which keys collide. **SipHash** is a fast keyed hash designed for exactly this: Python uses it for `str` and `bytes`, and Rust's `HashMap` uses it by default. Go seeds every map randomly. Python's seed changes per process (`PYTHONHASHSEED` fixes it), so `hash("abc")` differs between runs; never store it.
- **Tree bins.** Java kept `String.hashCode()` fixed (code depends on its exact value), so `HashMap` limits the damage instead: a bucket with more than 8 entries becomes a red-black tree, making the worst case O(log n) per operation. It works best when keys are `Comparable` (like `String`); for keys that aren't, the tree can't order equal hashes and lookups can still degrade.
- **Limits.** Cap the number of parameters, JSON keys or headers you'll parse (Tomcat's `maxParameterCount`, PHP's `max_input_vars`), which bounds the damage of any variant.
- **A balanced tree map** (`TreeMap`, `std::map`) when you need a guaranteed O(log n) worst case and can't control the hash.

In C++, `std::hash` of an integer is usually the integer itself, so crafted inputs collide easily. The usual contest fix is a custom hash with a run-time seed:

```cpp
struct SafeHash {
    // splitmix64 mixer (every input bit affects every output bit)
    static uint64_t mix(uint64_t x) {
        x += 0x9e3779b97f4a7c15ULL;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
        x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
        return x ^ (x >> 31);
    }
    size_t operator()(uint64_t key) const {
        // seed chosen at run time, so colliding keys can't be precomputed
        static const uint64_t seed = chrono::steady_clock::now().time_since_epoch().count();
        return mix(key + seed);
    }
};

unordered_map<long long, int, SafeHash> counts;
```

The pitfall is thinking a "good" hash function is enough: a well-spread hash with a public, fixed formula is still easy to attack. The protection comes from the secret seed (or from bounding the worst case with tree bins and input limits).

## Sets, maps and their APIs

A **hash set** stores keys only and answers "have I seen this?". A **hash map** stores key-value pairs and answers "what do I know about this?". Java's `HashSet` is in fact a `HashMap` with dummy values.

| Task | Python | Java | C++ |
|---|---|---|---|
| Create | `d = {}`, `s = set()` | `new HashMap<>()`, `new HashSet<>()` | `unordered_map<K, V> m;`, `unordered_set<K> s;` |
| Insert or overwrite | `d[k] = v`, `s.add(k)` | `put(k, v)`, `add(k)` | `m[k] = v`, `s.insert(k)` |
| Contains | `k in d` | `containsKey(k)`, `contains(k)` | `m.count(k)`, `m.find(k) != m.end()` |
| Read with a default | `d.get(k, 0)` | `getOrDefault(k, 0)` | `find`, then check `end()` |
| Count up | `d[k] = d.get(k, 0) + 1` or `Counter` | `merge(k, 1, Integer::sum)` | `m[k]++` |
| List per key | `defaultdict(list)` | `computeIfAbsent(k, x -> new ArrayList<>())` | `m[k].push_back(v)` |
| Remove | `del d[k]`, `s.discard(k)` | `remove(k)` | `erase(k)` |

Two traps hide in that table. In C++, `m[k]` *inserts* `k` with a default value if it's missing, even when you only meant to read it; use `find` or `count` for lookups. In Java, map values are boxed `Integer`s, so `map.get(a) == map.get(b)` compares references and silently fails above 127; use `equals`.

When keys are small integers or lowercase letters, a plain array of counts is simpler and faster than any hash map (see [arrays & strings](/learn/arrays-strings)).

## Pattern: frequency counting

Count how often each value occurs in one pass, then answer questions from the counts in a second pass. A **frequency map** solves "first unique character", "majority element", "can I build this note from these letters?", and is the first step of "top k frequent" (then a [heap](/learn/heaps) or bucket sort).

```python
from collections import Counter

def first_uniq_char(s):
    count = Counter(s)                   # pass 1: count every character
    for i, c in enumerate(s):            # pass 2: first one seen exactly once
        if count[c] == 1:
            return i
    return -1
```

```java
int firstUniqChar(String s) {
    // pass 1: count every character
    Map<Character, Integer> count = new HashMap<>();
    for (char c : s.toCharArray()) count.merge(c, 1, Integer::sum);
    // pass 2: first one seen exactly once
    for (int i = 0; i < s.length(); i++)
        if (count.get(s.charAt(i)) == 1) return i;
    return -1;
}
```

```cpp
int firstUniqChar(const string& s) {
    unordered_map<char, int> count;
    for (char c : s) count[c]++;         // operator[] starts a missing key at 0
    for (int i = 0; i < (int)s.size(); i++)
        if (count[s[i]] == 1) return i;
    return -1;
}
```

O(n) time, and O(k) space for `k` distinct characters.

### Boyer-Moore majority vote

A frequency map finds the **majority element** (the value that appears more than `n / 2` times) in O(n) time and O(n) space. The usual follow-up asks for O(1) space, and the answer is the **Boyer-Moore majority vote** algorithm.

Think of an election where every vote for someone else cancels one vote for the current leader. Keep a `candidate` and a `count`:

1. If `count` is 0, the current element becomes the candidate.
2. If the element equals the candidate, add 1 to `count`; otherwise subtract 1.
3. After one pass, `candidate` is the majority element, if there is one.

Why it works: every decrement pairs one copy of the candidate with one different value, and both are thrown away. A true majority has more copies than all the other values combined, so it can't be paired off completely. It's the value left standing.

```diagram
{"type":"array","rows":[{"label":"nums","values":[2,2,1,1,1,2,2]},{"label":"candidate","values":[2,2,2,2,1,1,2]},{"label":"count","values":[1,2,1,0,1,0,1],"highlight":[3,5]}],"caption":"Boyer-Moore on [2, 2, 1, 1, 1, 2, 2]. The count hits 0 at indices 3 and 5, so the next element takes over. 2 is left standing, and it is the majority (4 of 7)."}
```

```python
def majority_element(nums):              # assumes a majority exists
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x                # no current leader: x takes over
        count += 1 if x == candidate else -1
    return candidate

def majority_if_any(nums):               # no guarantee: verify with a second pass
    candidate = majority_element(nums)
    if nums.count(candidate) * 2 > len(nums):
        return candidate
    return None
```

```java
int majorityElement(int[] nums) {        // assumes a majority exists
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;   // no current leader: x takes over
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}

Integer majorityIfAny(int[] nums) {      // no guarantee: verify with a second pass
    int candidate = majorityElement(nums), seen = 0;
    for (int x : nums) if (x == candidate) seen++;
    return seen * 2 > nums.length ? candidate : null;
}
```

```cpp
int majorityElement(const vector<int>& nums) {   // assumes a majority exists
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;           // no current leader: x takes over
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}

optional<int> majorityIfAny(const vector<int>& nums) {   // no guarantee: verify
    int candidate = majorityElement(nums);
    long seen = count(nums.begin(), nums.end(), candidate);
    if (seen * 2 > (long)nums.size()) return candidate;
    return nullopt;
}
```

**O(n) time, O(1) extra space.**

The pitfall: **it always returns something.** On `[1, 2, 3]` it returns 3, which isn't a majority. If the problem doesn't promise that a majority exists, count the candidate in a **second pass** and check `count * 2 > n`, as `majority_if_any` does. That's still O(n) and O(1). The same idea handles *majority element II* (values appearing more than `n / 3` times): at most two values can clear that bar, so keep two candidates with two counts, then verify both.

## Pattern: complement lookup

**Two sum**: find two indices whose values add up to `target`. The brute force checks every pair in O(n²). Instead, as you scan, ask "have I already seen the value that would complete this one?" That value is the **complement**, `target - x`, and a map from value to index answers in O(1).

```diagram
{"type":"array","values":[3,8,4,6,1],"highlight":[0,2],"dim":[3,4],"pointers":{"i":2},"caption":"Target 7. At i = 2 the map holds {3: 0, 8: 1}. The complement 7 − 4 = 3 is there, so the answer is [0, 2]."}
```

```python
def two_sum(nums, target):
    seen = {}                            # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:                 # check before inserting x
            return [seen[need], i]
        seen[x] = i
    return []
```

```java
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();   // value -> index
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};      // check before inserting
        seen.put(nums[i], i);
    }
    return new int[0];
}
```

```cpp
vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;                   // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i}; // check before inserting
        seen[nums[i]] = i;
    }
    return {};
}
```

Checking *before* inserting stops an element pairing with itself (`[3]`, target 6) while still handling duplicates (`[3, 3]`, target 6). O(n) time and space. If the array is already sorted, [two pointers](/learn/two-pointers) do it in O(1) space.

The same "look up what would complete me" idea drives [subarray sum equals k](/learn/prefix-sums) (look up earlier prefix sums) and "longest consecutive sequence" (put everything in a set, then only start counting at values whose `x - 1` is absent).

## Pattern: grouping by a key

To group items that are "the same" in some sense, compute a **canonical key** that's identical for every member of a group, and map key → list. For **group anagrams**, two words are anagrams exactly when their sorted letters match:

```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)   # "eat", "tea", "ate" -> "aet"
    return list(groups.values())
```

```java
List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String w : words) {
        char[] chars = w.toCharArray();
        Arrays.sort(chars);                    // "eat", "tea", "ate" -> "aet"
        groups.computeIfAbsent(new String(chars), k -> new ArrayList<>()).add(w);
    }
    return new ArrayList<>(groups.values());
}
```

```cpp
vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (const string& w : words) {
        string key = w;
        sort(key.begin(), key.end());          // "eat", "tea", "ate" -> "aet"
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& entry : groups) out.push_back(move(entry.second));
    return out;
}
```

For `n` words of length up to `k`, sorting each key costs O(n · k log k). A key made of the 26 letter counts (a tuple in Python, or a string like `"1#0#2#…"`) brings it to O(n · k). Other canonical keys: the pattern of first occurrences for isomorphic strings (`"egg"` and `"add"` both become `[0, 1, 1]`), `r - c` to group cells on the same diagonal, and `(r // 3, c // 3)` for Sudoku boxes.

## Hashing composite keys

Many problems need a key made of several values, like a grid cell `(row, col)`. Each language handles this differently:

- **Python**: tuples are hashable, so `(r, c)` works as a key directly. Lists, sets and dicts are not hashable (they're mutable); convert with `tuple(lst)` or `frozenset(s)`.
- **Java**: arrays use *identity* hashing, so two separate `int[]{1, 2}` keys never match. Use a `record` (which generates `equals` and `hashCode`), `List.of(r, c)`, or encode the pair into one `long`. If you write your own class, override **both** `equals` and `hashCode`.
- **C++**: `std::pair` has no `std::hash`, so `unordered_set<pair<int, int>>` doesn't compile. Pass a custom hash, encode the pair as one `long long`, or use the ordered `set`/`map`, which only need `<`.

Example: does a walk of `N`/`S`/`E`/`W` steps ever revisit a point?

```python
def is_path_crossing(path):
    moves = {"N": (0, 1), "S": (0, -1), "E": (1, 0), "W": (-1, 0)}
    x = y = 0
    seen = {(0, 0)}                      # tuples are hashable
    for step in path:
        dx, dy = moves[step]
        x, y = x + dx, y + dy
        if (x, y) in seen:
            return True
        seen.add((x, y))
    return False
```

```java
record Point(int x, int y) {}            // a record generates equals() and hashCode()

boolean isPathCrossing(String path) {
    int x = 0, y = 0;
    Set<Point> seen = new HashSet<>();
    seen.add(new Point(0, 0));
    for (char step : path.toCharArray()) {
        switch (step) {
            case 'N' -> y++;
            case 'S' -> y--;
            case 'E' -> x++;
            default -> x--;
        }
        if (!seen.add(new Point(x, y))) return true;   // add() is false if present
    }
    return false;
}
```

```cpp
struct PairHash {
    size_t operator()(const pair<int, int>& p) const {
        // pack both ints into one 64-bit value, then hash that
        unsigned long long key = (unsigned long long)(unsigned)p.first << 32 | (unsigned)p.second;
        return hash<unsigned long long>()(key);
    }
};

bool isPathCrossing(const string& path) {
    int x = 0, y = 0;
    unordered_set<pair<int, int>, PairHash> seen;
    seen.insert({0, 0});
    for (char step : path) {
        if (step == 'N') y++;
        else if (step == 'S') y--;
        else if (step == 'E') x++;
        else x--;
        if (!seen.insert({x, y}).second) return true;  // second is false if present
    }
    return false;
}
```

A string key like `r + "," + c` works in every language too, but building and hashing strings is several times slower than a tuple, record or packed integer.

## The cost of string keys

"Hash map lookups are O(1)" assumes a key costs O(1) to hash and compare. A string of length `L` doesn't: the hash function reads every character, and when the lookup lands on a matching hash, the table compares the keys character by character to confirm. Both steps are **O(L)**. So a single insert or lookup with a string key is O(L), and **`n` of them cost O(n · L)**, not O(n).

That factor is easy to miss when the keys are built inside the loop:

| Code | Looks like | Really costs |
|---|---|---|
| Count each word in a list of `n` words of length up to `L` | O(n) | O(n · L) |
| Put every length-`k` substring of `s` in a set (`s[i:i+k]`) | O(n) | O(n · k): each slice copies `k` chars, then hashes them |
| Word break: check every `s[i:j]` against a dictionary set | O(n²) | O(n³): O(n²) substrings, each O(n) to build and hash |
| Group anagrams with sorted keys | O(n) | O(n · L log L) |

Caching helps less than you'd think. Java's `String` and Python's `str` remember their hash after computing it once, so looking up the *same* string object again is cheap. But every slice or `substring` makes a new string that pays again, and C++'s `std::hash<string>` recomputes on every call.

When the O(L) factor is too slow:

- **Rolling hash**: update the hash of a sliding window in O(1) as one character enters and one leaves (see [Rabin-Karp](/learn/tries#rabin-karp-rolling-hash-matching)). Collisions are possible, so confirm matches or use two hashes.
- **Encode short keys as integers**: *repeated DNA sequences* packs each 10-letter window over `ACGT` into a 20-bit number, 2 bits per letter, shifted along in O(1) per step.
- **A [trie](/learn/tries)**: walking one character at a time shares the work between keys with common prefixes, as in word break and *word search II*.

In an interview, state the bound with `L` in it ("O(n · L) for n words of length L"). It shows you know where the time goes, and it's the honest answer.

## Ordered vs unordered maps

A hash map gives fast lookups but no useful order. An **ordered map** keeps keys sorted in a balanced binary search tree (a red-black tree in Java and C++), trading O(1) for O(log n) in return for sorted iteration and "nearest key" queries.

| | Hash map | Ordered map |
|---|---|---|
| Python | `dict` (insertion order, not sorted) | none built in: sort the keys, or `bisect` on a sorted list |
| Java | `HashMap` (`LinkedHashMap` for insertion order) | `TreeMap`: `floorKey`, `ceilingKey`, `firstKey`, `headMap` |
| C++ | `unordered_map` | `map`: `lower_bound`, `upper_bound`, `begin()` is the smallest |
| Lookup | O(1) average | O(log n) worst case |
| Iteration | arbitrary order | sorted by key |

Reach for an ordered map when the problem says "smallest key at least x", "all keys in a range", or needs a sliding sorted view (calendar booking, stock price records). Otherwise a hash map is the default. More on the trees underneath in [binary trees](/learn/trees).

## Pitfalls

- **Mutating a key after inserting it.** Its hash changes, so the entry is lost in the wrong bucket. This is why Python refuses lists as keys.
- **Java `equals` without `hashCode`.** Equal objects then hash to different buckets and never match.
- **C++ `operator[]` on a read** inserts a default entry, which also changes the map's size mid-loop.
- **Modifying a map while iterating over it** raises `RuntimeError` in Python and `ConcurrentModificationException` in Java. Collect changes and apply them after the loop.
- **Floating-point keys.** `0.1 + 0.2` is not `0.3`; round or use integers.
- **Relying on iteration order.** Only Python's `dict` and Java's `LinkedHashMap` promise insertion order; `HashMap`, `HashSet` and `unordered_map` don't.
- **Forgetting the key cost.** Hashing a length-`k` string is O(k), so "O(1) lookup" with long string keys is really O(k), and `n` of them cost O(n · k) (see [the cost of string keys](/learn/hashing#the-cost-of-string-keys)).
