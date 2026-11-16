---
title: Arrays & strings
summary: How arrays sit in memory, what dynamic arrays and strings really cost in each language, and the matrix and in-place techniques interviews lean on.
related: big-o, hashing, two-pointers, sliding-window, prefix-sums
terms:
  - dynamic array #dynamic-arrays
  - dynamic arrays #dynamic-arrays
  - contiguous memory #arrays-in-memory
  - StringBuilder #immutability-by-language
  - immutable strings #immutability-by-language
  - string concatenation #the-on-concatenation-trap
  - row-major #2d-arrays-and-matrices
  - 2D array #2d-arrays-and-matrices
  - 2D arrays #2d-arrays-and-matrices
  - transpose #transpose-and-rotate
  - rotate the matrix #transpose-and-rotate
  - spiral order #spiral-order
  - island perimeter #perimeter-of-a-grid-shape
  - cyclic placement #cyclic-placement
  - cyclic sort #cyclic-placement
  - first missing positive #cyclic-placement
---

## Arrays in memory

An **array** stores its elements in one **contiguous** block of memory, all the same size, one after another. To find element `i`, the machine computes `base + i × size` and reads that address. That's one multiply and one add whatever `i` is, which is why indexing is **O(1)**.

```diagram
{"type":"array","rows":[{"label":"value","values":[7,2,9,4,5]},{"label":"address","values":[1000,1004,1008,1012,1016]}],"caption":"A 4-byte int array starting at address 1000: element i lives at 1000 + 4 × i, so a[3] is at 1012."}
```

Contiguity has two more consequences:

- **Scanning is fast.** The CPU loads memory in cache lines of 64 bytes, so reading `a[i]` pulls in its neighbors for free. A loop over an array beats the same loop over a linked list by a wide margin, even though both are O(n).
- **Inserting or deleting in the middle is O(n).** Everything after the position has to shift by one slot to keep the block contiguous. Appending and removing at the end don't shift anything.

## Dynamic arrays

A plain array has a fixed size (`int[]` in Java, a C array). A **dynamic array** (Python `list`, Java `ArrayList`, C++ `vector`) hides that by keeping spare **capacity**: it allocates more slots than it needs, and when the slots run out it allocates a larger block, copies everything across, and frees the old one.

That copy is O(n), but because the capacity grows by a constant *factor*, it happens rarely enough that appending is **amortized O(1)** (the argument is in [Big-O & complexity](/learn/big-o)). The factors differ: about 1.125 for CPython lists, 1.5 for Java's `ArrayList`, and 2 for `vector` in GCC's libstdc++ (1.5 in MSVC).

```python
class DynamicArray:
    def __init__(self):
        self.cap, self.size = 1, 0
        self.data = [None] * self.cap

    def append(self, x):                 # amortized O(1)
        if self.size == self.cap:        # full: double and copy, O(n)
            self.cap *= 2
            bigger = [None] * self.cap
            for i in range(self.size):
                bigger[i] = self.data[i]
            self.data = bigger
        self.data[self.size] = x
        self.size += 1

    def get(self, i):                    # O(1)
        if not 0 <= i < self.size:
            raise IndexError(i)
        return self.data[i]
```

```java
class DynamicArray {
    private int[] data = new int[1];
    private int size = 0;

    void append(int x) {                      // amortized O(1)
        if (size == data.length)              // full: double and copy, O(n)
            data = Arrays.copyOf(data, data.length * 2);
        data[size++] = x;
    }

    int get(int i) {                          // O(1)
        if (i < 0 || i >= size) throw new IndexOutOfBoundsException(i);
        return data[i];
    }
}
```

```cpp
class DynamicArray {
    unique_ptr<int[]> data = make_unique<int[]>(1);
    size_t cap = 1, n = 0;
public:
    void append(int x) {                      // amortized O(1)
        if (n == cap) {                       // full: double and copy, O(n)
            auto bigger = make_unique<int[]>(cap * 2);
            copy(data.get(), data.get() + n, bigger.get());
            data = move(bigger);
            cap *= 2;
        }
        data[n++] = x;
    }

    int get(size_t i) const {                 // O(1)
        if (i >= n) throw out_of_range("index");
        return data[i];
    }
};
```

When you know the final size, allocate it up front: `[0] * n`, `new int[n]`, `vector<int> v(n)` or `v.reserve(n)`. In Java, an `ArrayList<Integer>` stores boxed objects, so an `int[]` is several times smaller and faster when the size is fixed.

## Cost of common operations

| Operation | Cost | Python `list` | Java `ArrayList` | C++ `vector` |
|---|---|---|---|---|
| Read or write by index | O(1) | `a[i]` | `get(i)`, `set(i, x)` | `a[i]` |
| Append at the end | O(1) amortized | `append(x)` | `add(x)` | `push_back(x)` |
| Remove from the end | O(1) | `pop()` | `remove(size() - 1)` | `pop_back()` |
| Insert or remove at the front or middle | O(n) | `insert(i, x)`, `pop(i)` | `add(i, x)`, `remove(i)` | `insert(it, x)`, `erase(it)` |
| Search, unsorted | O(n) | `x in a`, `a.index(x)` | `contains(x)`, `indexOf(x)` | `find(a.begin(), a.end(), x)` |
| Search, sorted | O(log n) | `bisect_left(a, x)` | `Collections.binarySearch(a, x)` | `lower_bound(...)` |
| Copy a slice of `k` items | O(k) | `a[i:j]` | `new ArrayList<>(a.subList(i, j))` | `vector<int>(a.begin() + i, a.begin() + j)` |
| Sort | O(n log n) | `a.sort()` | `Collections.sort(a)` | `sort(a.begin(), a.end())` |

If you need fast removal from the front, use a deque (`collections.deque`, `ArrayDeque`, `std::deque`); see [stacks & queues](/learn/stacks-queues). If you need fast "is `x` in here?", use a set; see [hash maps & sets](/learn/hashing).

## Strings

A string is an array of characters with extra rules. The big one is mutability, and it differs by language.

### Immutability by language

| Language | Type | Mutable? | Build a string with |
|---|---|---|---|
| Python | `str` | no | a list of pieces, then `"".join(pieces)` |
| Java | `String` | no | `StringBuilder` (`append`, `reverse`, `setCharAt`) |
| C++ | `std::string` | yes | `s += c` or `push_back` (amortized O(1)) |

With **immutable strings**, every "change" creates a new string. `s[0] = "x"` is an error in Python; in Java there is no setter at all. To edit characters, convert first: `list(s)` in Python, `s.toCharArray()` or a `StringBuilder` in Java. In C++ you can write `s[0] = 'x'` directly.

Other per-language details worth knowing:

- **Java**: compare strings with `equals`, never `==` (which compares references). `s.charAt(i)` is O(1); `substring` copies, so it's O(length).
- **C++**: `s.substr(i, k)` copies `k` characters. Use `std::string_view` (C++17) to look at part of a string without copying. `s.size()` is unsigned, so `s.size() - 1` on an empty string wraps around to a huge number.
- **Python**: slicing `s[i:j]` copies. `s[::-1]` reverses in O(n).

### The O(n²) concatenation trap

Building a string of length `n` one piece at a time with `s = s + piece` copies the whole string on every step: `1 + 2 + … + n`, which is O(n²) total. This applies to Python `str`, Java `String` (the compiler optimizes `+` within one expression, but every loop iteration still builds a brand-new string), and C++ when you write `s = s + c` rather than `s += c`. CPython sometimes optimizes `s += t` in place, but that's an implementation detail you shouldn't rely on.

The fix is to collect pieces and join once. Run-length encoding is a typical example:

```python
def compress(s):                         # "aaabcc" -> "a3b1c2"
    parts = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        parts.append(s[i] + str(j - i))
        i = j
    return "".join(parts)                # one O(n) join instead of n copies
```

```java
String compress(String s) {              // "aaabcc" -> "a3b1c2"
    StringBuilder sb = new StringBuilder();
    int i = 0;
    while (i < s.length()) {
        int j = i;
        while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
        sb.append(s.charAt(i)).append(j - i);
        i = j;
    }
    return sb.toString();
}
```

```cpp
string compress(const string& s) {       // "aaabcc" -> "a3b1c2"
    string out;
    size_t i = 0;
    while (i < s.size()) {
        size_t j = i;
        while (j < s.size() && s[j] == s[i]) j++;
        out += s[i];                     // += appends in place: amortized O(1) per char
        out += to_string(j - i);
        i = j;
    }
    return out;
}
```

### Character counting

When the alphabet is small and known, count characters in a fixed array instead of a hash map: index `c - 'a'` for lowercase letters (26 slots), or the character code itself for ASCII (128 slots). It's O(1) space and faster than hashing. A valid anagram check:

```python
def is_anagram(s, t):
    # different lengths can never be anagrams
    if len(s) != len(t):
        return False
    # count[k] = (times letter k appears in s) - (times it appears in t)
    count = [0] * 26
    # s adds to its letter's slot, t subtracts from its letter's slot
    for a, b in zip(s, t):
        count[ord(a) - ord('a')] += 1
        count[ord(b) - ord('a')] -= 1
    # every slot back at zero means both strings have the same letters
    return all(c == 0 for c in count)
```

```java
boolean isAnagram(String s, String t) {
    // different lengths can never be anagrams
    if (s.length() != t.length()) return false;
    // count[k] = (times letter k appears in s) - (times it appears in t)
    int[] count = new int[26];
    // s adds to its letter's slot, t subtracts from its letter's slot
    for (int i = 0; i < s.length(); i++) {
        count[s.charAt(i) - 'a']++;
        count[t.charAt(i) - 'a']--;
    }
    // any nonzero slot means the letter counts differ
    for (int c : count) if (c != 0) return false;
    return true;
}
```

```cpp
bool isAnagram(const string& s, const string& t) {
    // different lengths can never be anagrams
    if (s.size() != t.size()) return false;
    // count[k] = (times letter k appears in s) - (times it appears in t)
    int count[26] = {};
    // s adds to its letter's slot, t subtracts from its letter's slot
    for (size_t i = 0; i < s.size(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    // any nonzero slot means the letter counts differ
    for (int c : count) if (c != 0) return false;
    return true;
}
```

For arbitrary keys (Unicode, words, numbers) use a hash map or Python's `Counter`. Note that "character" means different things: Python indexes Unicode code points, a Java `char` is a UTF-16 unit (an emoji takes two), and a C++ `char` is one byte.

## 2D arrays and matrices

A grid is an array of rows: `grid[r][c]` is row `r`, column `c`, with `m` rows and `n` columns. Most languages lay it out **row-major**: each row is contiguous, so looping `r` outside and `c` inside is the cache-friendly order. A flattened grid maps `(r, c)` to index `r * n + c`.

- Python: `grid = [[0] * n for _ in range(m)]`. Never `[[0] * n] * m`: that's `m` references to the *same* row, so writing one cell changes every row.
- Java: `int[][] grid = new int[m][n];` (an array of row arrays; rows can have different lengths).
- C++: `vector<vector<int>> grid(m, vector<int>(n));`

To visit the four neighbors of a cell, loop over a direction list `[(1,0), (-1,0), (0,1), (0,-1)]` and skip any `(nr, nc)` outside `0 ≤ nr < m`, `0 ≤ nc < n`. Grid BFS and DFS build on that; see [graphs](/learn/graphs).

### Transpose and rotate

The **transpose** swaps `a[i][j]` with `a[j][i]`, mirroring the matrix across its main diagonal. Rotating an `n × n` matrix 90° clockwise in place is a transpose followed by reversing each row. (Counter-clockwise: transpose, then reverse each column.)

```diagram
{"type":"grid","cells":[[1,2,3,"",1,4,7,"",7,4,1],[4,5,6,"",2,5,8,"",8,5,2],[7,8,9,"",3,6,9,"",9,6,3]],"highlight":[[0,0],[0,1],[0,2],[0,4],[1,4],[2,4],[0,10],[1,10],[2,10]],"caption":"Original, transposed, then each row reversed. The top row 1, 2, 3 becomes the right column: a 90° clockwise rotation."}
```

```python
def rotate(matrix):                      # 90° clockwise, in place, n x n
    n = len(matrix)
    for i in range(n):                   # transpose: swap across the diagonal
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:                   # then reverse each row
        row.reverse()
```

```java
void rotate(int[][] matrix) {            // 90° clockwise, in place, n x n
    int n = matrix.length;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int tmp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = tmp;
        }
    for (int[] row : matrix)
        for (int l = 0, r = n - 1; l < r; l++, r--) {
            int tmp = row[l]; row[l] = row[r]; row[r] = tmp;
        }
}
```

```cpp
void rotate(vector<vector<int>>& matrix) {   // 90° clockwise, in place, n x n
    int n = matrix.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix) reverse(row.begin(), row.end());
}
```

Note `j` starts at `i + 1`: swapping every pair twice would undo the transpose.

### Spiral order

Walk the outer ring, then the next ring in. Keep four boundaries (`top`, `bottom`, `left`, `right`) and shrink one after each side. The two `if` checks stop a single remaining row or column from being read twice.

```diagram
{"type":"grid","cells":[[1,2,3,4],[5,6,7,8],[9,10,11,12]],"path":[[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[2,2],[2,1],[2,0],[1,0],[1,1],[1,2]],"caption":"Spiral order of a 3 × 4 matrix: 1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7."}
```

```python
def spiral_order(matrix):
    out = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):           # top row, left to right
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):           # right column, downwards
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):   # bottom row, right to left
                out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):   # left column, upwards
                out.append(matrix[r][left])
            left += 1
    return out
```

```java
List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> out = new ArrayList<>();
    // the four boundaries of the part of the matrix not yet visited
    int top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        // top row, left to right
        for (int c = left; c <= right; c++) out.add(matrix[top][c]);
        top++;
        // right column, downwards
        for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
        right--;
        // bottom row, right to left (only if a row is left)
        if (top <= bottom) {
            for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
            bottom--;
        }
        // left column, upwards (only if a column is left)
        if (left <= right) {
            for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
            left++;
        }
    }
    return out;
}
```

```cpp
vector<int> spiralOrder(const vector<vector<int>>& matrix) {
    vector<int> out;
    // the four boundaries of the part of the matrix not yet visited
    int top = 0, bottom = matrix.size() - 1, left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        // top row, left to right
        for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
        top++;
        // right column, downwards
        for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
        right--;
        // bottom row, right to left (only if a row is left)
        if (top <= bottom) {
            for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
            bottom--;
        }
        // left column, upwards (only if a column is left)
        if (left <= right) {
            for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
            left++;
        }
    }
    return out;
}
```

In C++, the boundaries are `int`, not `size_t`: `right` and `bottom` can drop to -1, which an unsigned type can't represent.

### Perimeter of a grid shape

*Island perimeter* gives a grid of 1s (land) and 0s (water) holding one connected shape and asks for the length of its outline. It's a common grid warm-up, and the same counting works for any shape made of unit squares. No BFS or DFS is needed: one scan over the cells does it, in either of two equivalent ways.

- **Count exposed sides.** For each land cell, check its four neighbours. Each one that is water or outside the grid adds 1 to the perimeter.
- **Count cells and shared edges.** Every land cell brings 4 sides. Wherever two land cells touch, the edge between them hides one side of each, so **perimeter = 4 · cells − 2 · shared edges**. To count each shared edge once, look only up and left from every cell.

```diagram
{"type":"grid","cells":[[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]],"highlight":[[0,1],[1,0],[1,1],[1,2],[2,1],[3,0],[3,1]],"caption":"7 land cells and 6 shared edges between them: 4 · 7 − 2 · 6 = 16."}
```

```python
def island_perimeter(grid):
    # Each land cell brings 4 sides
    # Each edge shared by two land cells hides 2 of them
    rows, cols = len(grid), len(grid[0])
    cells = shared = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                cells += 1
                # look up and left only, so each shared edge counts once
                if r > 0 and grid[r - 1][c] == 1:
                    shared += 1
                if c > 0 and grid[r][c - 1] == 1:
                    shared += 1
    return 4 * cells - 2 * shared
```

```java
int islandPerimeter(int[][] grid) {
    // Each land cell brings 4 sides
    // Each edge shared by two land cells hides 2 of them
    int cells = 0, shared = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] == 1) {
                cells++;
                // look up and left only, so each shared edge counts once
                if (r > 0 && grid[r - 1][c] == 1) shared++;
                if (c > 0 && grid[r][c - 1] == 1) shared++;
            }
        }
    }
    return 4 * cells - 2 * shared;
}
```

```cpp
int islandPerimeter(const vector<vector<int>>& grid) {
    // Each land cell brings 4 sides
    // Each edge shared by two land cells hides 2 of them
    int cells = 0, shared = 0;
    for (size_t r = 0; r < grid.size(); r++) {
        for (size_t c = 0; c < grid[0].size(); c++) {
            if (grid[r][c] == 1) {
                cells++;
                // look up and left only, so each shared edge counts once
                if (r > 0 && grid[r - 1][c] == 1) shared++;
                if (c > 0 && grid[r][c - 1] == 1) shared++;
            }
        }
    }
    return 4 * cells - 2 * shared;
}
```

**O(m · n) time, O(1) space.** Two pitfalls:

- **Double counting.** If you check all four directions for shared edges, every shared edge is seen from both of its cells. Then subtract 1 per land neighbour, not 2.
- **Lakes.** Water enclosed by land adds its shoreline under both methods. If a problem wants only the outer outline, first flood-fill the water connected to the grid's border, then count only sides that face that water or the edge.

## In-place techniques

"In place" means O(1) extra space: you rearrange the input instead of building a new array. A handful of tricks cover most problems:

- **Swap from both ends.** Two indices moving toward each other reverse an array or string in `n/2` swaps. This is the simplest form of [two pointers](/learn/two-pointers).
- **Read index and write index.** Scan with one index and copy the elements you keep to a second, slower index. That compacts the array in one pass: remove an element, move zeroes to the end, remove duplicates from a sorted array.
- **Work from the back.** When the output is longer than the input but shares its buffer (merging into an array with spare room at the end, expanding characters in a string), fill from the end so you never overwrite something you haven't read yet.
- **Reverse to rotate.** Rotating an array right by `k` is three reversals: the whole array, then the first `k`, then the rest. Use `k % n` first.

```diagram
{"type":"array","rows":[{"label":"start","values":[1,2,3,4,5,6,7]},{"label":"reverse all","values":[7,6,5,4,3,2,1]},{"label":"first k=3","values":[5,6,7,4,3,2,1],"window":[0,2]},{"label":"the rest","values":[5,6,7,1,2,3,4],"window":[3,6]}],"caption":"Rotating right by 3 with three reversals: O(n) time, O(1) extra space."}
```

- **Use the array as its own hash table.** When the values are in `1..n`, mark that `x` was seen by negating `a[x - 1]`. That finds duplicates or the first missing positive with no extra memory. Restore the signs afterwards if the caller needs the input unchanged. Swapping each value into its slot does the same job; see [cyclic placement](/learn/arrays-strings#cyclic-placement) below.

### Cyclic placement

When the values should be the numbers `1..n`, each value `v` has a natural home: index `v - 1`. **Cyclic placement** (often called **cyclic sort**) swaps every value into its home in one pass, then a second pass reads off the slots that are wrong. It's the standard O(n)-time, O(1)-space answer to *first missing positive*, and the same move solves *find all numbers disappeared in an array*, *find the duplicate number* and *set mismatch*.

For first missing positive:

1. For each index `i`: while `nums[i]` is in `1..n` and its home doesn't already hold that value, swap it home. The value that comes back into slot `i` gets the same treatment.
2. Values outside `1..n` (zero, negatives, anything above `n`) have no home; they stay wherever they land.
3. Scan again. The first `i` with `nums[i] != i + 1` means `i + 1` is missing. If every slot is right, the answer is `n + 1`.

```diagram
{"type":"array","rows":[{"label":"start","values":[3,4,-1,1],"pointers":{"i":0}},{"label":"3 home","values":[-1,4,3,1],"highlight":[2],"pointers":{"i":0}},{"label":"4 home","values":[-1,1,3,4],"highlight":[3],"pointers":{"i":1}},{"label":"1 home","values":[1,-1,3,4],"highlight":[0],"pointers":{"i":1}},{"label":"scan","values":[1,-1,3,4],"dim":[1],"pointers":{"i":1}}],"caption":"First missing positive of [3, 4, -1, 1]. After placement, index 1 doesn't hold 2, so the answer is 2."}
```

```python
def first_missing_positive(nums):
    # Value v belongs at index v - 1, so swap each value home
    # First index not holding its own value gives answer
    n = len(nums)
    for i in range(n):
        # stop once slot i holds junk or home already has right value
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            # target slot saved first, since nums[i] changes in swap
            home = nums[i] - 1
            nums[i], nums[home] = nums[home], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    # 1..n all present
    return n + 1
```

```java
int firstMissingPositive(int[] nums) {
    // Value v belongs at index v - 1, so swap each value home
    // First index not holding its own value gives answer
    int n = nums.length;
    for (int i = 0; i < n; i++) {
        // stop once slot i holds junk or home already has right value
        while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
            int home = nums[i] - 1;
            int tmp = nums[home];
            nums[home] = nums[i];
            nums[i] = tmp;
        }
    }
    for (int i = 0; i < n; i++)
        if (nums[i] != i + 1) return i + 1;
    // 1..n all present
    return n + 1;
}
```

```cpp
int firstMissingPositive(vector<int>& nums) {
    // Value v belongs at index v - 1, so swap each value home
    // First index not holding its own value gives answer
    int n = nums.size();
    for (int i = 0; i < n; i++) {
        // stop once slot i holds junk or home already has right value
        while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i])
            swap(nums[i], nums[nums[i] - 1]);
    }
    for (int i = 0; i < n; i++)
        if (nums[i] != i + 1) return i + 1;
    // 1..n all present
    return n + 1;
}
```

The `while` inside the `for` looks quadratic, but every swap puts one value in its home for good, so there are at most `n` swaps in total: **O(n) time, O(1) extra space**. Pitfalls:

- **Duplicates.** Loop on "the home doesn't hold this value yet", not on `nums[i] != i + 1`. With `[1, 1]` the second test swaps two equal values forever.
- **Python's tuple swap.** `nums[i], nums[nums[i] - 1] = nums[nums[i] - 1], nums[i]` is a bug: the targets are assigned left to right, so `nums[i]` has already changed when the second index is computed. Save the home index first.
- **The input is rearranged.** Copy it first if the caller needs it intact.

## Pitfalls

- **Off-by-one errors.** Decide whether ranges are inclusive (`[lo, hi]`) or half-open (`[lo, hi)`) and keep it consistent. The length of `[l, r]` is `r - l + 1`.
- **Shared rows.** `[[0] * n] * m` in Python, or pushing the same `vector` object into a grid by reference.
- **Modifying a list while iterating over it** skips elements in Python and throws `ConcurrentModificationException` in Java. Iterate over a copy or build a new list.
- **Java `List<Integer>.remove(1)`** removes index 1, not the value 1. Use `remove(Integer.valueOf(1))` for the value.
- **Java `Arrays.asList(int[])`** gives a list with one element (the array). It only works with object arrays like `Integer[]`.
- **Overflow.** Summing many `int`s can exceed 2³¹ − 1; use `long` (Java) or `long long` (C++).
- **Empty input.** `matrix[0]` on an empty matrix and `s.size() - 1` on an empty C++ string both fail. Check first.
