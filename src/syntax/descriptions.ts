import type { Lang } from "../runner/harness/types";

/** One-line "what it does / what the parameters mean" for each snippet, keyed by label. */
export const DESCRIPTIONS: Record<Lang, Record<string, string>> = {
  python3: {
    "Numbers & booleans":
      "int has unlimited precision (no overflow); float is a 64-bit double; bool is True or False.",
    "Strings & chars":
      "There is no separate char type: one character is a string of length 1.",
    "Lists (arrays)":
      "[v] * n makes a list of n copies of v; list(iterable) builds a list from anything iterable.",
    "2-D list":
      "Build each row separately with a comprehension; multiplying the outer list repeats the same row object.",
    Tuple:
      "Immutable and hashable, so tuples work as dict keys and set members. A one-element tuple needs a trailing comma.",
    "Dict & set":
      "Hash map and hash set. Use set() for an empty set, because {} creates an empty dict.",
    "defaultdict & Counter":
      "defaultdict(factory) creates missing values on first access; Counter counts items from any iterable.",
    "Deque & heap":
      "deque(iterable) starts a queue; a heap is a plain list kept in heap order by heapq functions.",
    Variables:
      "No declarations or types: a name is created on first assignment. `a, b = b, a` swaps in one step.",
    List: "Dynamic array. append(x) adds to the end in O(1); len(nums) is the item count.",
    "Loop with index":
      "enumerate(iterable, start=0) yields (index, value) pairs, so you get both without range(len(...)).",
    "Range loop":
      "range(start, stop, step): stop is exclusive; a negative step counts down.",
    "Dict counting":
      "get(key, default) returns default when key is missing. Counter(iterable) counts everything at once.",
    Sort: "sort() sorts in place; sorted() returns a new list. key= maps each item to what you compare; reverse=True sorts descending.",
    "Stack & queue":
      "A list is a stack (append/pop at the end, O(1)). Use deque for a queue: popleft() is O(1), list.pop(0) is O(n).",
    "Heap (min)":
      "heapq keeps a plain list as a min-heap: heappush/heappop are O(log n) and always pop the smallest item.",
    Infinity:
      'float("inf") is larger than every number: a handy starting value for minimums.',
    "String basics":
      'Strings are immutable. s[::-1] reverses, " ".join(words) glues a list, s.split() splits on whitespace.',
    "Variables & multiple assignment":
      "Assign several names at once from any iterable of the same length.",
    "Types & casting":
      'int(), float(), str(), bool() convert between types; int("x") raises ValueError on bad input.',
    "None checks": "Compare to None with `is` / `is not` (identity), not ==.",
    Ternary:
      "`a if condition else b`: an expression that picks one of two values.",
    "Print / debug":
      "print(*values) separates with spaces; f-strings embed expressions with {…}.",
    Comments:
      "# starts a comment. Triple-quoted strings are often used as docstrings.",
    "Integer division & modulo":
      "// floors toward −∞ (−7 // 2 == −4) and % takes the sign of the divisor.",
    Truthiness:
      'Empty containers, 0, "" and None are falsy, so `if not stack:` tests for empty.',
    "Index, slice, length":
      "s[i:j] is the substring from i up to (not including) j; negative indexes count from the end.",
    "Reverse / palindrome":
      "s[::-1] builds the reversed string (slice with step −1).",
    "Split & join":
      "split(sep=None) splits on runs of whitespace by default; sep.join(parts) joins with sep between.",
    "Find & replace":
      "find(sub) returns the first index or −1; replace(old, new) returns a new string.",
    "Case & checks":
      "lower()/upper() return new strings; isdigit/isalpha/isalnum test every character.",
    "Char ↔ code":
      'ord(c) gives the Unicode code point; chr(n) goes back. ord(c) − ord("a") maps a–z to 0–25.',
    "Build efficiently":
      "Repeated s += piece can be O(n²); collect pieces in a list and join once.",
    "Strip & format":
      "strip() trims whitespace at both ends. Format specs: :.2f (2 decimals), :>5 (right-align, width 5).",
    "Count & startswith":
      "count(sub) counts non-overlapping matches; startswith/endswith test prefixes and suffixes.",
    "Sorted chars (anagram key)":
      "Anagrams sort to the same string, which makes a good dictionary key.",
    Create:
      "[0] * n makes n zeros. For a grid use a comprehension: [[0]*cols]*rows shares one row object.",
    "Add & remove":
      "insert(i, x) and pop(0) shift elements (O(n)); append/pop() at the end are O(1). remove(x) deletes the first match.",
    "Slicing & copy": "Slices always make a new list; a[:] is a shallow copy.",
    Comprehensions:
      "[expr for x in iterable if condition]: build a list in one expression; nested fors read left to right.",
    Search:
      "`x in list` and index(x) scan linearly (O(n)); use a set for O(1) membership.",
    Reverse:
      "reverse() flips in place and returns None; a[::-1] returns a reversed copy.",
    "Zip & enumerate":
      "zip(a, b) pairs items position by position, stopping at the shorter one.",
    "Prefix sums":
      "pre[i] is the sum of the first i items, so any range sum is pre[j] − pre[i] in O(1).",
    "Matrix dims": "Rows first, then columns (assumes a non-empty grid).",
    "Dict basics":
      "m[k] raises KeyError if missing; m.get(k, default) does not. `k in m` checks keys in O(1).",
    defaultdict:
      "defaultdict(factory) creates a missing key with factory() on first access, e.g. list → [].",
    Counter:
      "Counter counts hashable items; most_common(k) returns the k most frequent (item, count) pairs.",
    Iterate:
      "items() yields (key, value); iterating a dict directly yields keys in insertion order.",
    "Set basics":
      "Unordered, unique items; add/discard/in are O(1) on average. discard ignores missing items.",
    "Set algebra":
      "| union, & intersection, − difference, ^ symmetric difference.",
    "Tuple keys":
      "Tuples are hashable, so (r, c) pairs work as set items and dict keys.",
    "Dict comprehension":
      "{key_expr: value_expr for ...} builds a dict, e.g. value → index.",
    "Stack (list)":
      "stack[-1] peeks without removing; pop() removes and returns the last item.",
    "Queue / deque": "deque supports O(1) appends and pops at both ends.",
    "BFS template":
      "Mark nodes as seen when you enqueue them so nothing is queued twice.",
    "Min-heap":
      "h[0] is always the smallest item; heapify(list) turns a list into a heap in O(n).",
    "Max-heap":
      "heapq is min-only: push negated values and negate again when popping.",
    "Heap of tuples":
      "Tuples compare item by item; add a unique index so ties never compare the payload.",
    "k largest / smallest":
      "nlargest/nsmallest(k, iterable, key=None) are O(n log k): good when k is small.",
    "Monotonic stack":
      'Keep indexes with decreasing values; each pop finds the "next greater" element. O(n) total.',
    "Sort in place / copy":
      "sort() works on lists only and returns None; sorted() accepts any iterable.",
    "Sort by key":
      "key is called once per item; return a tuple to sort by several fields (negate numbers for descending).",
    "Custom comparator":
      "cmp_to_key wraps an old-style compare(a, b) returning <0, 0 or >0.",
    "Binary search (bisect)":
      "bisect_left returns the first index with a[i] ≥ x, bisect_right the first with a[i] > x. Needs a sorted list.",
    "Binary search (manual)":
      "Shrink [lo, hi] by half each step: O(log n). Write the loop condition to match your bounds.",
    "Min / max with key":
      "key= picks what to compare; max(..., default=v) avoids errors on empty input.",
    While: "Loops while the condition is true.",
    "Break / continue / else":
      "A loop’s else runs only when the loop finished without break.",
    "Two pointers":
      "Move two indexes toward each other on sorted data: O(n) instead of checking every pair.",
    "Sliding window":
      "Grow the right edge each step and shrink the left edge while the window is invalid: O(n).",
    "Grid neighbours":
      "The four directions (down, up, right, left) with a bounds check.",
    "any / all":
      "any() is True if one item is truthy; all() if every item is. Both stop early.",
    "Helper function":
      "Nested helpers can read outer variables; type hints are optional.",
    Memoization:
      "@cache stores results by arguments, so each distinct call is computed once.",
    Lambda: "A one-expression anonymous function, mostly used as key=.",
    "Modify outer variable":
      "nonlocal lets a nested function rebind a variable of the enclosing function.",
    "Recursion limit":
      "Python allows ~1000 nested calls by default; deep recursion is better rewritten as a loop.",
    Backtracking:
      "Choose, recurse, un-choose. Append a copy (path[:]) because path keeps changing.",
    "Linked list walk": "Follow .next until None.",
    "Dummy head":
      "A placeholder node before the real head avoids special cases; return dummy.next.",
    "Tree node": "TreeNode(val, left, right): children are nodes or None.",
    "Small class": "__init__ sets fields; self is the instance.",
    "Named tuple / dataclass":
      "@dataclass generates __init__, __repr__ and __eq__ from annotated fields.",
    "Power & modulo":
      "pow(base, exp, mod) computes (base**exp) % mod quickly, without huge intermediate numbers.",
    "Ceil division": "−(−a // b) rounds up using floor division (positive b).",
    "gcd / lcm / sqrt":
      "math.gcd/lcm for integers; isqrt(n) is the exact integer square root.",
    "Bit ops": "x & (x − 1) clears the lowest set bit; 1 << k is 2^k.",
    "Count bits": "bit_count() counts 1-bits (Python 3.10+).",
    "Big ints": "Python integers have arbitrary precision: no overflow.",
    "abs / divmod": "divmod(a, b) returns (a // b, a % b).",
    "Floor / ceil / round":
      "floor and ceil return ints. round() sends halves to the even neighbour (banker's rounding); int() just drops the fraction.",
    "Single bits":
      "Test, set, clear or flip bit k; x & -x keeps only the lowest 1-bit.",
    "Logs & powers of two":
      "math.log* return floats (can be off by a hair for big ints); bit_length gives an exact floor(log2 n) + 1.",
    "Bases (binary, hex)":
      "bin/hex return strings with a 0b / 0x prefix; int(s, base) parses any base from 2 to 36.",
    "Digits":
      "Peel off the last digit with % 10 and // 10, or go through the decimal string.",
    "Clamp, min / max of many":
      "max and min take several arguments or one iterable; there is no built-in clamp.",
    "Floats":
      "float is a 64-bit double: compare with a tolerance, not ==.",
    "Combinatorics":
      "math.comb is n choose k; itertools (pre-imported) yields permutations, combinations and products lazily.",
    "f-string formatting":
      "Inside the braces: .2f fixes decimals, 05d pads with zeros, a comma groups thousands, and > < ^ align within a width.",
    "Split variations":
      "split() with no argument drops empty strings; with a separator it keeps them. maxsplit limits the number of cuts.",
    "Letter counts (26)":
      "A fixed array of 26 counts is faster than a dict for lowercase letters; turn it into a tuple to use it as a key.",
    "Partition & pad":
      "partition splits once into (before, separator, after); zfill / ljust / rjust / center pad to a width.",
    "Letter & digit sets":
      "Ready-made strings of letters and digits, handy for building alphabets or checking membership.",
    "Insert, extend, delete":
      "insert and del in the middle are O(n); extend appends every item of another iterable.",
    "Count & index":
      "Linear scans over the list. Use a set or dict when you test membership often.",
    "Flatten":
      "Nested comprehension reads left to right like the loops it replaces.",
    "Transpose & rotate":
      "zip(*grid) pairs up the rows column by column; reverse the rows first to rotate clockwise.",
    "Copy a grid":
      "grid[:] copies only the outer list; copy each row (or deepcopy) so edits don't leak back.",
    "Index of the max":
      "Sort or compare indexes by the values they point to (argmax / argsort).",
    "setdefault & pop":
      "setdefault inserts a default only when the key is missing and returns the stored value.",
    "Sort a dict":
      "Dicts keep insertion order but don't sort themselves: sort items() or the keys by value.",
    "Counter math":
      "Counters add and subtract like multisets; - drops counts that reach zero, & keeps the minimum.",
    "OrderedDict (LRU)":
      "move_to_end and popitem(last=False) are O(1): the standard way to build an LRU cache in Python.",
    "Merge & invert":
      "| merges two dicts into a new one (later values win); a comprehension swaps keys and values.",
    "deque extras":
      "appendleft / popleft are O(1); maxlen drops items from the other end automatically.",
    "heapify & replace":
      "heapify turns a list into a heap in linear time; the combined calls are faster than two separate ones.",
    "Heap ties":
      "Tuples compare item by item, so ties fall through to the next field; a counter stops it reaching objects.",
    "Window max (deque)":
      "A monotonic deque keeps the best candidate at the front: each window's max in O(n) total.",
    "Sort by several keys":
      "Return a tuple: Python compares the fields in order. Negate numbers to reverse just that field.",
    "itemgetter":
      "itemgetter(1, 0) is a fast key that picks index 1, then index 0.",
    "Binary search on the answer":
      "When \"is x enough?\" flips from no to yes once, binary search the answer itself instead of an array.",
    "bisect with key":
      "key= lets bisect search a list of records sorted by one field.",
    "Range steps & reverse":
      "range(start, stop, step) excludes stop; reversed() walks a sequence backwards without copying.",
    "Neighbouring pairs":
      "pairwise yields (a[0], a[1]), (a[1], a[2]), …",
    "enumerate & zip options":
      "enumerate can start at any number; zip(strict=True) raises if the lengths differ (3.10+).",
    "Memo inside a method":
      "Define the cached helper inside the method so each test case gets a fresh cache.",
    "lru_cache & clearing":
      "lru_cache(maxsize=None) is the same as @cache; a module-level cache must be cleared between inputs.",
    "reduce & prod":
      "reduce folds a list into one value with a two-argument function.",
    "Unpacking & *args":
      "* collects or spreads positional values, ** keyword ones.",
    "Generators":
      "yield produces values lazily; a generator expression feeds sum/max/any without building a list.",
    "Order objects (__lt__)":
      "__lt__ lets heapq and sorted compare your objects directly.",
    "Hashable value class":
      "frozen=True makes instances immutable and generates __eq__ and __hash__, so they work in sets and as keys.",
    "Type hints":
      "LeetCode signatures use typing names; Optional[X] means \"X or None\". They are pre-imported here.",
    "Adjacency list":
      "Build the graph once, then walk g[u] for the neighbours of u.",
    "DFS (recursive)":
      "Mark before recursing so cycles don't loop. Deep graphs need setrecursionlimit or the iterative version.",
    "DFS (iterative)":
      "Same visit order idea with an explicit stack: no recursion limit.",
    "Grid DFS (islands)":
      "Flood fill: check bounds, check the cell, mark it, then spread to the four neighbours.",
    "Dijkstra":
      "Shortest paths with non-negative weights: always expand the closest node next. O((V + E) log V).",
    "Topological sort":
      "Kahn's algorithm: repeatedly take nodes with no remaining prerequisites.",
    "Union-find":
      "Groups that merge: find returns a group's root (halving paths as it goes), union joins two groups.",
    "Trie (dict of dicts)":
      "Each level maps a character to the next node; a marker key flags where a word ends.",
    "Bitmask subsets":
      "Each number from 0 to 2^n − 1 is one subset: bit i says whether a[i] is in it.",
    "Running totals & runs":
      "accumulate folds as it goes; groupby splits consecutive equal items (run-length encoding).",
  },
  java: {
    Primitives:
      "int is 32-bit and silently overflows past about ±2.1 billion; long is 64-bit (note the L suffix); char is one UTF-16 unit.",
    "Wrapper types":
      "Collections hold objects (Integer, Long, Character, Boolean). Compare wrappers with equals(), not ==.",
    Arrays:
      "Fixed length set at creation; numbers start at 0, booleans at false, objects at null.",
    "2-D array":
      "An array of arrays: grid.length is the row count, grid[0].length the column count.",
    "String & builder":
      "Strings are immutable; build them in a loop with StringBuilder and call toString() at the end.",
    Lists:
      "ArrayList is the resizable array. List.of(...) is read-only. Store pairs as int[] or a small record.",
    "Maps & sets":
      "HashMap/HashSet are O(1) average; TreeMap/TreeSet keep keys sorted with O(log n) operations.",
    "Queues & heaps":
      "ArrayDeque is the stack/queue of choice; PriorityQueue is a min-heap unless you pass a comparator.",
    Variables:
      "Types are declared up front; var infers a local variable’s type. 1L marks a long literal.",
    Array:
      "Fixed length (a.length, no parentheses); new int[n] starts as all zeros.",
    ArrayList:
      "Resizable list of objects: add(x) appends, get(i) reads, size() counts. Holds Integer, not int.",
    "HashMap counting":
      "merge(k, 1, Integer::sum) inserts 1 or adds 1; getOrDefault(k, d) reads with a default.",
    Loops:
      "Classic index loop or the enhanced for-each loop over arrays and collections.",
    Sort: "Arrays.sort sorts arrays in place; list.sort(comparator) takes (a, b) → negative/0/positive.",
    "Stack & queue":
      "ArrayDeque is the go-to stack (push/pop/peek) and queue (offer/poll). Avoid the old Stack class.",
    "Heap (min)":
      "PriorityQueue is a min-heap by default; pass a comparator to order arrays/objects. offer/poll are O(log n).",
    Limits:
      "Integer.MAX_VALUE is 2³¹−1; overflow wraps silently, so use long when values can grow.",
    "String basics":
      "charAt(i) gets a char; substring(i, j) runs from i up to (not including) j.",
    "Primitive types":
      "int (32-bit), long (64-bit), double, boolean, char (16-bit). Primitives can’t be null.",
    "Boxed types":
      "Collections hold boxed Integer/Long; auto-unboxing a null Integer throws NullPointerException.",
    Casting:
      "(int) truncates toward zero; cast one operand to long before multiplying to avoid overflow.",
    "Parse & toString":
      "Integer.parseInt throws NumberFormatException on bad input; String.valueOf works for any type.",
    Ternary: "condition ? a : b picks one of two values.",
    "Print / debug":
      "Arrays.toString(a) prints array contents (plain println prints a type@hash).",
    "Comparing objects":
      "== compares references; use equals() for String/Integer values.",
    "Integer division & modulo":
      "/ truncates toward zero and % keeps the sign of the dividend; Math.floorMod is always ≥ 0 for a positive divisor.",
    "Index, slice, length":
      "length() is a method for String, but a field (length) for arrays.",
    StringBuilder:
      "A mutable string: append in amortised O(1); reverse() and toString() when done.",
    "Split & join":
      "split takes a regex (escape . and |); String.join(sep, items) joins.",
    "Find & replace":
      "indexOf returns −1 when absent; replace returns a new string (Strings are immutable).",
    "Char helpers":
      "Character.isDigit/isLetter/toLowerCase; c − 'a' maps a–z to 0–25.",
    "char[] round trip":
      "Sort a word’s characters to build an anagram key, then new String(cs).",
    Compare:
      "equals for content; compareTo returns negative/0/positive in dictionary order.",
    "Case & trim":
      "Return new strings; trim() removes leading/trailing whitespace.",
    "Repeat & format":
      "repeat(n) copies a string n times; String.format uses %d, %s, %.2f placeholders.",
    "2D array": "An array of rows; grid[0].length is the column count.",
    "Fill & copy":
      "Arrays.fill sets every slot; copyOf/copyOfRange(from, to) make new arrays (to is exclusive).",
    "List ops":
      "add(i, x) inserts and shifts (O(n)); set(i, x) replaces; contains is a linear scan.",
    "remove(int) vs remove(Object)":
      "With List<Integer>, remove(0) removes by index; wrap in Integer.valueOf to remove a value.",
    "Array ↔ list":
      "List.of is immutable: wrap it in new ArrayList<> to modify. Streams convert to int[].",
    "List of lists":
      "Add a copy (new ArrayList<>(path)), otherwise later changes show up in the result.",
    Reverse: "Collections.reverse flips a List in place.",
    "Sum / max (streams)":
      "Arrays.stream(a) gives an IntStream with sum(), max(), average()…",
    "Prefix sums":
      "pre[i] is the sum of the first i items; a range sum is pre[j] − pre[i]. Use long to avoid overflow.",
    "HashMap basics":
      "get returns null for missing keys; containsKey/remove are O(1) on average.",
    "Defaults & merge":
      "merge(key, value, fn) stores value, or fn(old, value) if the key exists.",
    "Group into lists":
      "computeIfAbsent creates the list the first time a key is seen, then returns it.",
    Iterate:
      "entrySet() gives key and value together; keySet()/values() give one side.",
    HashSet:
      "add returns false if the item was already present; contains is O(1) on average.",
    "Sorted map / set":
      "TreeMap/TreeSet keep keys sorted: floorKey(x) ≤ x, ceilingKey(x) ≥ x, in O(log n).",
    "Pair-like keys":
      'Java has no tuple type: use a "r,c" string, an encoded long, or a record as the key.',
    "Stack (ArrayDeque)":
      "push/pop/peek work on the front of the deque; isEmpty() before popping.",
    Queue:
      "offer adds to the back, poll removes from the front (returns null when empty).",
    "Deque both ends":
      "offerFirst/offerLast and pollFirst/pollLast: O(1) at both ends.",
    "Min-heap / max-heap":
      "Collections.reverseOrder() flips the default min-heap into a max-heap.",
    "Heap with comparator":
      "The comparator decides priority; Integer.compare avoids overflow from subtraction.",
    "BFS template": "Mark visited when enqueuing so nothing is queued twice.",
    Note: "ArrayDeque rejects null elements.",
    "Sort primitives":
      "Arrays.sort(a, from, to) sorts a sub-range; to is exclusive.",
    "Sort descending":
      "reverseOrder needs boxed arrays (Integer[]); for int[] sort and read backwards.",
    "Sort 2D / objects": "Comparator lambdas or Comparator.comparingInt(key).",
    "Chained comparator": "thenComparing breaks ties with a second key.",
    "Binary search":
      "Returns the index if found, else −(insertion point) − 1. Needs a sorted array.",
    "Binary search (manual)":
      "lo + (hi − lo) / 2 avoids int overflow of (lo + hi).",
    "Reverse loop": "Count down from the last index.",
    "While / do-while": "do-while runs its body at least once.",
    "Labeled break":
      "break label exits the labelled outer loop, not just the inner one.",
    "Grid neighbours": "A direction table plus a bounds check.",
    Switch: "Arrow-style cases don’t fall through, so no break is needed.",
    "Helper method":
      "Private methods on Solution can call each other and recurse.",
    Memoization: "Cache results in a map (or an array) keyed by the arguments.",
    "Fields as shared state":
      "Instance fields act as globals shared by your helper methods.",
    Lambdas:
      "(params) -> expression creates a functional-interface instance (Comparator, Runnable…).",
    Backtracking:
      "Choose, recurse, un-choose; store a copy of path, not the live list.",
    "Linked list walk": "Follow next until null.",
    "Dummy head":
      "A placeholder node before the head removes edge cases; return dummy.next.",
    "Tree node": "new TreeNode(val, left, right); children may be null.",
    "Record (Java 16+)":
      "An immutable data class with equals/hashCode generated: great as a map key.",
    "Nested helper class":
      "A static nested class for small structs (e.g. heap entries).",
    "Math helpers":
      "Math.pow returns a double: cast or use repeated multiplication for integers.",
    "Overflow-safe":
      "Widen to long before multiplying; Math.addExact throws instead of wrapping.",
    "Modulo arithmetic": "Take % MOD after each step so values stay small.",
    "Bit ops":
      ">> keeps the sign bit, >>> shifts in zeros; x & (x − 1) clears the lowest set bit.",
    "Count bits": "Integer.bitCount counts 1-bits; toBinaryString shows them.",
    gcd: "Euclid’s algorithm: gcd(a, b) = gcd(b, a % b).",
    "Ceil division": "For positive a and b, (a + b − 1) / b rounds up.",
    "Floor / ceil / round":
      "floor and ceil return doubles (cast to int); Math.round returns a long (int for a float) and rounds .5 up; a cast just drops the fraction.",
    "floorDiv / floorMod":
      "Like / and %, but rounding down instead of toward zero, so negative inputs behave like Python's // and %.",
    "Single bits":
      "Test, set, clear or flip bit k (use 1L << k past bit 30); x & -x keeps only the lowest 1-bit.",
    "Logs & powers of two":
      "Math.log is the natural log (double); numberOfLeadingZeros gives an exact floor(log2 n) for n > 0.",
    "Bases (binary, hex)":
      "toBinaryString / toHexString print without leading zeros; parseInt(s, radix) parses any base from 2 to 36.",
    "Digits":
      "Peel off the last digit with % 10 and / 10, or count characters in the decimal string.",
    "Clamp, min / max of many":
      "Math.max and Math.min take two arguments; Math.clamp (Java 21) limits a value to [lo, hi].",
    "Doubles":
      "double is 64-bit floating point: compare with a tolerance, not ==.",
    "Split variations":
      "split takes a regular expression; \\s+ means any run of whitespace. A negative limit keeps trailing empty strings.",
    "StringBuilder edits":
      "StringBuilder changes text in place; insert at 0 and deleteCharAt in the middle are O(n).",
    "Letter counts (26)":
      "Counting into a fixed array is the usual anagram trick; Arrays.toString makes a hashable key.",
    "char ↔ int":
      "chars are numbers: subtract '0' or 'a' to get an index, add and cast back to get a char.",
    "chars() stream":
      "s.chars() is an IntStream of the characters, handy for one-line counts and checks.",
    "Print arrays (debug)":
      "Printing an array directly shows a hash like [I@1b6d3586; use Arrays.toString / deepToString.",
    "Collections helpers":
      "Static helpers for any List; sort and max use natural order unless you pass a Comparator.",
    "List ↔ int[]":
      "Boxed lists and primitive arrays don't convert implicitly; streams bridge them.",
    "Fixed vs editable lists":
      "List.of can't change at all and Arrays.asList can't grow; copy into an ArrayList to edit.",
    "Remove while iterating":
      "Removing inside a for-each throws ConcurrentModificationException; use removeIf or the iterator.",
    "Sort a range / compare":
      "Sort or fill part of an array; Arrays.equals compares contents (== compares references).",
    "putIfAbsent & compute":
      "compute rewrites one entry from its old value; returning null removes the key.",
    "TreeMap navigation":
      "A sorted map: every lookup is O(log n), and missing neighbours come back as null.",
    "TreeSet navigation":
      "A sorted set with the same neighbour queries as TreeMap; results are null when nothing qualifies.",
    "Sort entries by value":
      "Copy the entries into a list and sort that; a HashMap itself has no order.",
    "LinkedHashMap (LRU)":
      "accessOrder = true moves an entry to the end on every get; removeEldestEntry evicts the oldest.",
    "Set operations":
      "These change set a in place; copy it first (new HashSet<>(a)) to keep the original.",
    "Count with streams":
      "groupingBy + counting builds a frequency map in one expression (values are Long).",
    "Heap of int[]":
      "Integer.compare avoids the overflow that a[0] - b[0] hits with large or negative values.",
    "Max-heap shortcuts":
      "reverseOrder flips the natural order safely; b - a overflows for values far apart.",
    "Window max (deque)":
      "A monotonic deque keeps the current window's max at the front: O(n) for all windows.",
    "Monotonic stack (Java)":
      "Each index waits on the stack until a bigger value arrives: its \"next greater element\".",
    "Sort strings by length":
      "comparingInt avoids boxing; thenComparing breaks ties.",
    "Binary search on the answer":
      "When \"is x enough?\" flips from no to yes once, search the answer range instead of an array.",
    "for-each variants":
      "for-each works on arrays and anything Iterable; it can't change the array slots themselves.",
    "IntStream ranges":
      "range excludes the end, rangeClosed includes it.",
    "Memo arrays":
      "An array memo is faster than a HashMap; fill with a value that can't be a real answer.",
    "var (Java 10+)":
      "var infers a local variable's type from its initializer; the type is still fixed.",
    "Return two values":
      "Java returns one value: wrap several in an array or (clearer) a small record.",
    "Comparable class":
      "compareTo gives objects a natural order for Collections.sort, TreeSet and PriorityQueue.",
    "Trie node":
      "One slot per letter; a null slot means no word continues with that letter.",
    "Records as keys":
      "Records get equals and hashCode for free, so they work as set members and map keys.",
    "Adjacency list":
      "One list of neighbours per node; drop the second add for a directed graph.",
    "DFS (recursive)":
      "Mark before recursing so cycles don't loop. Very deep graphs may need an explicit stack.",
    "Dijkstra":
      "Shortest paths with non-negative weights: always expand the closest node next. O((V + E) log V).",
    "Topological sort":
      "Kahn's algorithm: repeatedly take nodes with no remaining prerequisites.",
    "Union-find":
      "find returns a group's root (halving the path as it goes); union joins two groups.",
    "Grid DFS (islands)":
      "Flood fill: check bounds, check the cell, mark it, then spread to the four neighbours.",
    "Bitmask subsets":
      "Each number from 0 to 2^n − 1 is one subset: bit i says whether a[i] is in it.",
  },
  cpp: {
    Primitives:
      "int is usually 32-bit and signed overflow is undefined behaviour: use long long (LL suffix) for big values.",
    Strings:
      "std::string is mutable; string(n, ch) repeats a character n times.",
    Vectors:
      "vector(n) value-initialises n elements; vector(n, v) fills them with v.",
    "2-D vector":
      "A vector of rows, each its own vector. size() returns an unsigned size_t.",
    "Pairs & tuples":
      "pair has .first/.second and compares lexicographically, so pairs sort and work in sets and heaps.",
    "Maps & sets":
      "unordered_* are hash tables (O(1) average); map/set are balanced trees with keys in order.",
    "Queues & heaps":
      "priority_queue is a max-heap by default; greater<int> turns it into a min-heap.",
    "C array & std::array":
      "C arrays and std::array have a compile-time size; {} zero-initialises.",
    Variables:
      "Types are fixed at compile time; auto deduces them. 1LL makes a long long literal.",
    Vector:
      "Resizable array: push_back appends (amortised O(1)); size() returns an unsigned count.",
    "2D vector":
      "vector<vector<int>> grid(rows, vector<int>(cols, 0)) builds rows × cols zeros.",
    "Hash map counting":
      "operator[] inserts a zero-initialised value for a missing key; count(k) checks without inserting.",
    Loops:
      "Range-for copies each element unless you use a reference (auto&); structured bindings unpack pairs.",
    Sort: "sort(first, last) is O(n log n); reverse iterators (rbegin/rend) sort descending.",
    "Stack & queue":
      "stack: push/top/pop. queue: push/front/pop. pop() returns nothing, so read top/front first.",
    Heap: "priority_queue is a max-heap; greater<int> makes it a min-heap. push/pop are O(log n).",
    Limits:
      "INT_MAX ≈ 2.1e9; signed overflow is undefined behaviour, so use long long when values can grow.",
    "String basics": "substr(pos, len) takes a length, not an end index.",
    Types: "int is 32-bit; long long (and long, as on LeetCode) is 64-bit; char is 8-bit.",
    Casting:
      "static_cast is the explicit C++ cast; (int) truncates toward zero.",
    "Parse & to_string":
      "stoi/stoll parse integers; to_string formats numbers. (Exceptions are disabled here, so validate input first.)",
    "Print / debug":
      '"\\n" is faster than endl (which also flushes). cerr goes to stderr.',
    References:
      "Pass containers by reference (&) to avoid copies; const & when you won’t modify them.",
    nullptr: "The null pointer; !node is the same check.",
    "Integer division & modulo":
      "/ truncates toward zero and % keeps the dividend’s sign; add m then % m to normalise.",
    "No exceptions here":
      "The in-browser compiler uses -fno-exceptions: throw/try won’t compile.",
    "Index, slice, length":
      "s.back() is the last char; substr copies (O(len)).",
    "Build & append":
      "+= and push_back append in amortised O(1); strings are mutable.",
    "Reverse & sort":
      "Algorithms from <algorithm> work on any iterator range, including strings.",
    Find: "find returns string::npos when absent.",
    "Char helpers":
      "isdigit/isalpha/tolower from <cctype>; c − 'a' maps a–z to 0–25.",
    "Split by spaces":
      "stringstream >> word reads whitespace-separated tokens.",
    Compare: "Strings compare lexicographically with == and <.",
    "Repeat char": "string(count, ch) builds a run of one character.",
    Create:
      "vector<T>(n) holds n default values (0 for numbers); (n, v) fills with v.",
    "Add & remove":
      "insert/erase in the middle shift elements (O(n)); back operations are O(1).",
    Access:
      "v[i] is unchecked: out-of-range indexes are undefined behaviour. empty() before front()/back().",
    "Fill & copy":
      "Assigning a vector copies it; the iterator-range constructor copies a slice [i, j).",
    Reverse: "reverse(first, last) flips any range in place.",
    "Sum / max":
      "accumulate’s start value sets the result type: use 0LL for long long sums. max_element returns an iterator.",
    "Prefix sums":
      "pre[i] is the sum of the first i items; a range sum is pre[j] − pre[i].",
    Pairs:
      "pair<A, B> compares by .first, then .second; auto [x, y] unpacks it.",
    "Fixed-size array":
      "array<int, 26> lives on the stack; {} zero-initialises it.",
    unordered_map:
      "Hash map with average O(1) operations; m[k] inserts k if missing.",
    "find without inserting":
      "find returns end() when absent; it->second is the value.",
    "Group into vectors":
      "operator[] creates the empty vector the first time a key appears.",
    Iterate:
      "Structured bindings give key and value; iteration order is unspecified for unordered_map.",
    unordered_set: "insert/count/erase are O(1) on average; count is 0 or 1.",
    "Ordered map / set":
      "map/set are sorted trees (O(log n)); lower_bound(x) finds the first element ≥ x.",
    "Pair as key":
      "set<pair> works out of the box; unordered containers need a hash for pairs.",
    stack: "LIFO adapter: top() reads, pop() removes.",
    queue: "FIFO adapter: front() reads, pop() removes.",
    deque: "O(1) push and pop at both ends.",
    "Min-heap of pairs":
      "greater<> orders by .first, then .second; top() is the smallest.",
    "Custom comparator heap":
      "The comparator returns true when a has *lower* priority than b (the opposite of sort).",
    "BFS template":
      "Mark visited when you push so each node enters the queue once.",
    "Sort with lambda":
      "The comparator must return true when a goes before b (strict weak ordering).",
    "Stable sort": "Keeps equal elements in their original order.",
    "Binary search":
      "lower_bound → first ≥ x, upper_bound → first > x (O(log n) on sorted data).",
    "Binary search (manual)": "lo + (hi − lo) / 2 avoids overflow.",
    "Min / max":
      "max({a, b, c}) takes an initializer list; min_element returns an iterator.",
    Unique:
      "unique moves duplicates to the end of a sorted range; erase removes them.",
    "Reverse loop":
      "Use int indexes when counting down (size_t never goes below 0).",
    "Careful with size()":
      "size() is unsigned: v.size() − 1 wraps around when v is empty.",
    While: "Loops while the condition holds.",
    "Grid neighbours": "A direction table plus a bounds check.",
    Switch: "Cases fall through unless you break.",
    "Member helper": "Helper methods inside class Solution can recurse.",
    "Recursive lambda":
      "std::function lets a lambda call itself by name; [&] captures locals by reference.",
    Memoization:
      'Use −1 (or another impossible value) to mark "not computed yet".',
    "Capture by reference": "[&] captures by reference, [=] by value.",
    Backtracking: "Choose, recurse, un-choose with push_back/pop_back.",
    "Linked list walk": "Follow ->next until nullptr.",
    "Dummy head":
      "A stack-allocated placeholder node avoids head special cases; return dummy.next.",
    "Tree node": "new TreeNode(val, left, right); children may be nullptr.",
    Struct: "An aggregate type; brace-initialise fields in declaration order.",
    Tuple: "tuple groups several values; structured bindings unpack them.",
    "Math helpers":
      "pow works on doubles: use loops or repeated squaring for integer powers.",
    "Overflow-safe": "1LL * a * b promotes to 64-bit before multiplying.",
    "Modulo arithmetic": "Reduce % MOD after each operation.",
    "Bit ops":
      "1LL << 40 when shifting past 31 bits; x & (x − 1) clears the lowest set bit.",
    "Count bits":
      "__builtin_popcount (GCC/Clang) or std::popcount (C++20, unsigned only).",
    "gcd / lcm": "std::gcd / std::lcm from <numeric> (C++17).",
    "Ceil division": "For positive a and b, (a + b − 1) / b rounds up.",
    "Floor / ceil / round":
      "floor, ceil, round and trunc take and return doubles; round sends .5 away from zero; a cast just drops the fraction.",
    "Single bits":
      "Test, set, clear or flip bit k (use 1LL << k past bit 30); __builtin_ctz(0) is undefined.",
    "Logs & powers of two":
      "<cmath> logs are doubles; __lg (a GCC extension LeetCode has, provided here too) gives an exact floor(log2 n).",
    "Bases (binary, hex)":
      "bitset<N> prints exactly N binary digits; stoi / stoll take the base as the third argument.",
    "Digits":
      "Peel off the last digit with % 10 and / 10, or count the characters of to_string(n).",
    "Clamp, min / max of many":
      "max and min take two values of the same type, or a braced list {…}; clamp (C++17) limits a value to [lo, hi].",
    "Doubles":
      "double is 64-bit floating point: compare with a tolerance, not ==. INFINITY is a double; numbers::pi is in <numbers> (C++20).",
    "Permutations":
      "next_permutation rearranges to the next order and returns false after the last one, so start from sorted.",
    "k-th smallest (nth_element)":
      "Partially sorts so v[k] is what a full sort would put there, smaller items before it and larger after. O(n) on average.",
    "Split by a delimiter":
      "getline with a third argument reads up to that character; empty fields come back as \"\".",
    "Find variations":
      "Every find returns an index or string::npos; compare with npos, never with -1 in an int.",
    "Edit in place":
      "insert / erase / replace take a start index and a length; all are O(n) in the middle.",
    "starts_with / contains":
      "Prefix, suffix and substring checks without find.",
    "Letter counts (26)":
      "A zero-initialised array of 26 counts; std::array supports == and works as a map key.",
    "Join words":
      "There is no join in the standard library before C++23 ranges; build it with +=.",
    "Insert & erase in the middle":
      "Positions are iterators: v.begin() + index. Both are O(n) because later elements shift.",
    "Remove matching values":
      "std::erase / erase_if remove every match in one pass; before C++20 use the erase-remove idiom.",
    "resize, assign, iota":
      "resize keeps existing values; assign replaces everything; iota fills increasing numbers.",
    "find, count, any_of":
      "Linear algorithms from <algorithm>; iterator minus begin gives an index.",
    "Ranges (C++20)":
      "The ranges versions take the whole container instead of begin/end pairs.",
    "rotate & swap":
      "rotate makes v[k] the first element; reverse works on any sub-range.",
    "map bounds":
      "Ordered maps and sets answer neighbour queries in O(log n); check against end() / begin() first.",
    "multiset":
      "A sorted bag with duplicates; erasing by value removes all of them, erasing an iterator just one.",
    "contains, insert, emplace":
      "insert/emplace keep an existing value and tell you whether they added; m[k] = v always writes.",
    "Hash for pairs":
      "unordered containers need a hash for pairs; pack both ints into one 64-bit number.",
    "Count into a map":
      "operator[] inserts a zero for a missing key, so counting needs no check.",
    "Heaps of ints":
      "priority_queue is a max-heap; greater<int> as the third argument makes it a min-heap.",
    "Window max (deque)":
      "A monotonic deque keeps the current window's max at the front: O(n) for all windows.",
    "Next greater (stack)":
      "Each index waits on the stack until a bigger value arrives: its next greater element.",
    "Sort descending":
      "Sorting the reversed range, or with greater<>, puts the largest first.",
    "Sort by several keys":
      "tie compares field by field; swapping a and b for a field reverses just that field.",
    "Binary search on the answer":
      "When \"is x enough?\" flips from no to yes once, search the answer range instead of an array.",
    "equal_range":
      "Both bounds at once on a sorted range.",
    "Range-for by reference":
      "Without &, the loop variable is a copy: changes don't stick and big elements are copied.",
    "Structured bindings":
      "Unpack pairs, tuples and simple structs into named variables (C++17).",
    "Recursive lambda (auto self)":
      "Faster than std::function: the lambda receives itself as an argument.",
    "Recursive lambda (C++23)":
      "C++23 \"deducing this\": the lambda can call itself directly. Works here and on LeetCode.",
    "Parameters: copy or reference":
      "Pass containers by reference; a by-value parameter copies the whole vector on every call.",
    "2-D memo":
      "Fill with a value that can't be a real answer, then check it before recursing.",
    "Struct with operator<":
      "operator< gives a natural order for sort, set and map (priority_queue then puts the largest on top).",
    "Trie node":
      "One child pointer per letter, all null to start.",
    "new vs smart pointers":
      "LeetCode uses raw pointers; in your own code, unique_ptr frees memory automatically.",
    "Adjacency list":
      "One vector of neighbours per node; drop the second push for a directed graph.",
    "Dijkstra":
      "Shortest paths with non-negative weights: always expand the closest node next. O((V + E) log V).",
    "Topological sort":
      "Kahn's algorithm: repeatedly take nodes with no remaining prerequisites.",
    "Union-find":
      "find returns a group's root (halving the path as it goes); unite joins two groups.",
    "Grid DFS (islands)":
      "Flood fill: check bounds, check the cell, mark it, then spread to the four neighbours.",
    "Bitmask subsets":
      "Each number from 0 to 2^n − 1 is one subset: bit i says whether a[i] is in it.",
  },
};
