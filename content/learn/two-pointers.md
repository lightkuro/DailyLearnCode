---
title: Two pointers
summary: Walk two indices through an array or string, from both ends or in the same direction, to turn O(n²) pair searches into single O(n) passes with O(1) extra space.
related: sliding-window, sorting, arrays-strings, linked-lists, hashing, binary-search
terms:
  - two pointers
  - two-pointer
  - two-pointer technique
  - converging pointers #opposite-ends
  - read and write pointers #same-direction
  - Dutch national flag #partitioning-the-dutch-national-flag
  - three-way partition #partitioning-the-dutch-national-flag
  - 3Sum #3sum
  - three sum #3sum
  - container with most water #container-with-most-water
  - expand around center #expand-around-the-centre
  - expand around centre #expand-around-the-centre
  - palindromic substrings #expand-around-the-centre
  - Manacher's algorithm #expand-around-the-centre
  - maximum score of a good subarray #growing-from-a-fixed-index
  - trapping rain water #trapping-rain-water
---

## The idea

Many array problems ask about pairs: two values that sum to a target, two walls that hold the most water, two ends of a palindrome. Checking every pair is O(n²). The **two-pointer technique** keeps two indices into the data and, at each step, moves one of them based on a rule that safely rules out a whole batch of pairs. Each pointer moves at most `n` times, so the scan is O(n) with O(1) extra space.

The pointers come in three shapes:

| Shape | Start | Movement | Typical problems |
|---|---|---|---|
| Opposite ends | `L = 0`, `R = n - 1` | toward each other until they meet | pair sum in a sorted array, container with most water, palindromes, reversing |
| Same direction | both at the start | a fast reader and a slow writer, or fast and slow walkers | remove duplicates, move zeroes, cycle detection, [sliding window](/learn/sliding-window) |
| Two sequences | one pointer per input | advance whichever points at the smaller item | merging sorted arrays, intersections, subsequence checks |
| Outward | both at one index or centre | apart, one step at a time | palindromic substrings, best window containing index `k` |

The hard part is never the code. It's convincing yourself that the move you make can't skip the answer.

## Opposite ends

### Pair sum in a sorted array

Given a sorted array, find two numbers that add up to `target`. Start with the smallest and largest values:

- If `a[L] + a[R] < target`, the sum must grow. `a[L]` paired with anything at or left of `R` is at most `a[L] + a[R]`, still too small, so `a[L]` can't be part of any answer: move `L` right.
- If the sum is too big, `a[R]` can't be part of any answer by the mirror argument: move `R` left.
- If it's equal, you're done.

```diagram
{"type":"array","rows":[{"label":"1+11=12, too big","values":[1,3,4,6,8,11],"pointers":{"L":0,"R":5}},{"label":"1+8=9, too small","values":[1,3,4,6,8,11],"pointers":{"L":0,"R":4},"dim":[5]},{"label":"3+8=11, too big","values":[1,3,4,6,8,11],"pointers":{"L":1,"R":4},"dim":[0,5]},{"label":"3+6=9, too small","values":[1,3,4,6,8,11],"pointers":{"L":1,"R":3},"dim":[0,4,5]},{"label":"4+6=10, found","values":[1,3,4,6,8,11],"pointers":{"L":2,"R":3},"dim":[0,1,4,5],"highlight":[2,3]}],"caption":"Target 10. Every step discards one value for good (faded), so at most n − 1 steps."}
```

```python
def two_sum_sorted(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        if s < target:
            l += 1                       # nums[l] is too small for any partner
        else:
            r -= 1                       # nums[r] is too big for any partner
    return []
```

```java
int[] twoSumSorted(int[] nums, int target) {
    int l = 0, r = nums.length - 1;
    while (l < r) {
        int sum = nums[l] + nums[r];
        if (sum == target) return new int[]{l, r};
        if (sum < target) l++;           // nums[l] is too small for any partner
        else r--;                        // nums[r] is too big for any partner
    }
    return new int[0];
}
```

```cpp
vector<int> twoSumSorted(const vector<int>& nums, int target) {
    int l = 0, r = nums.size() - 1;
    while (l < r) {
        int sum = nums[l] + nums[r];
        if (sum == target) return {l, r};
        if (sum < target) l++;           // nums[l] is too small for any partner
        else r--;                        // nums[r] is too big for any partner
    }
    return {};
}
```

If the array isn't sorted and you need the original indices, use a hash map instead (see [hash maps & sets](/learn/hashing)); sorting first would scramble the indices.

### Container with most water

Given wall heights, pick two walls that hold the most water: `min(h[L], h[R]) × (R − L)`. Start with the widest pair and move the **shorter** wall inward. Why is that safe? Any other container that uses the shorter wall is narrower and still capped by that wall's height, so it can't beat the current one. The shorter wall has nothing left to offer.

```python
def max_area(height):
    l, r, best = 0, len(height) - 1, 0
    while l < r:
        best = max(best, min(height[l], height[r]) * (r - l))
        if height[l] < height[r]:
            l += 1                       # the shorter wall can't do better
        else:
            r -= 1
    return best
```

```java
int maxArea(int[] height) {
    int l = 0, r = height.length - 1, best = 0;
    while (l < r) {
        best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++;  // the shorter wall can't do better
        else r--;
    }
    return best;
}
```

```cpp
int maxArea(const vector<int>& height) {
    int l = 0, r = height.size() - 1, best = 0;
    while (l < r) {
        best = max(best, min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++;  // the shorter wall can't do better
        else r--;
    }
    return best;
}
```

For `[1, 8, 6, 2, 5, 4, 8, 3, 7]` the answer is 49, from the walls of height 8 (index 1) and 7 (index 8).

### Trapping rain water

Bars of width 1 with heights `height[i]`; how much rain water is trapped between them? The water over bar `i` is `min(tallest bar to its left, tallest bar to its right) − height[i]` (both maxima include `i` itself). [Prefix and suffix maxima](/learn/prefix-sums#prefix-and-suffix-products) compute that in O(n) time and O(n) space. Two pointers get it down to **O(1) space**.

Keep `l` and `r` at the ends, with `leftMax` (tallest bar in `0..l`) and `rightMax` (tallest bar in `r..n−1`). At each step, **settle the lower pointer's bar** and move it inward:

- If `height[l] < height[r]`, the water at `l` is `leftMax − height[l]` (after updating `leftMax` with `height[l]`). Then `l += 1`.
- Otherwise do the mirror image at `r`.

Why is moving the smaller side safe? The water at `l` depends on the true maximum to its right, which you haven't fully seen. But you don't need it: the taller of the two pointer bars is always at least as tall as every bar either pointer has passed (a pointer only moves while its bar is the shorter one). So when `height[l] < height[r]`, the right side already has a wall, `height[r]`, at least as tall as `leftMax`. The minimum of the two maxima is therefore `leftMax`, whatever lies between the pointers.

```diagram
{"type":"array","rows":[{"label":"height","values":[0,1,0,2,1,0,1,3,2,1,2,1]},{"label":"water","values":[0,0,1,0,1,2,1,0,0,1,0,0],"highlight":[2,4,5,6,9]}],"caption":"6 units in total. Water at index 5 = min(2, 3) − 0 = 2: the tallest bar on its left is 2, on its right 3."}
```

```python
def trap(height):
    # Water over bar = min(tallest left, tallest right) - bar
    # Lower pointer's side sets limit, as other pointer's wall is at least as tall
    # So settle lower side's bar with its own running max, then move it inward
    l, r = 0, len(height) - 1
    # tallest bar seen from each end so far
    left_max = right_max = 0
    water = 0
    while l < r:
        if height[l] < height[r]:
            left_max = max(left_max, height[l])
            water += left_max - height[l]
            l += 1
        else:
            # right bar no taller, so right side sets limit
            right_max = max(right_max, height[r])
            water += right_max - height[r]
            r -= 1
    return water
```

```java
int trap(int[] height) {
    // Water over bar = min(tallest left, tallest right) - bar
    // Lower pointer's side sets limit, as other pointer's wall is at least as tall
    // So settle lower side's bar with its own running max, then move it inward
    int l = 0, r = height.length - 1;
    // tallest bar seen from each end so far
    int leftMax = 0, rightMax = 0;
    int water = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            leftMax = Math.max(leftMax, height[l]);
            water += leftMax - height[l];
            l++;
        } else {
            // right bar no taller, so right side sets limit
            rightMax = Math.max(rightMax, height[r]);
            water += rightMax - height[r];
            r--;
        }
    }
    return water;
}
```

```cpp
int trap(const vector<int>& height) {
    // Water over bar = min(tallest left, tallest right) - bar
    // Lower pointer's side sets limit, as other pointer's wall is at least as tall
    // So settle lower side's bar with its own running max, then move it inward
    int l = 0, r = (int)height.size() - 1;
    // tallest bar seen from each end so far
    int leftMax = 0, rightMax = 0;
    int water = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            leftMax = max(leftMax, height[l]);
            water += leftMax - height[l];
            l++;
        } else {
            // right bar no taller, so right side sets limit
            rightMax = max(rightMax, height[r]);
            water += rightMax - height[r];
            r--;
        }
    }
    return water;
}
```

**O(n)** time, O(1) space. Pitfalls: settling the **taller** side (its water depends on the other side's unknown maximum), updating the running max **after** adding water (it must include the current bar, or you get negative water), and confusing it with [container with most water](/learn/two-pointers#container-with-most-water), which picks two walls and ignores the bars between them. A [monotonic stack](/learn/stacks-queues#monotonic-stacks) solves it a third way, filling water layer by layer as bars pop. *Trapping rain water II* (a 2D height map) needs a min-heap of boundary cells instead.

### Valid palindrome

Compare characters from both ends, skipping anything that isn't a letter or digit and ignoring case. Each step either skips a character or matches a pair, so it's O(n) with no copy of the string.

```python
def is_palindrome(s):
    # l and r close in from both ends
    l, r = 0, len(s) - 1
    while l < r:
        # skip non-alphanumeric characters on either side
        if not s[l].isalnum():
            l += 1
        elif not s[r].isalnum():
            r -= 1
        # both are real characters: they must match, ignoring case
        elif s[l].lower() != s[r].lower():
            return False
        # a matching pair is done, move both inward
        else:
            l += 1
            r -= 1
    return True
```

```java
boolean isPalindrome(String s) {
    // l and r close in from both ends
    int l = 0, r = s.length() - 1;
    while (l < r) {
        // a and b are the characters under the two pointers
        char a = s.charAt(l), b = s.charAt(r);
        // skip non-alphanumeric characters on either side
        if (!Character.isLetterOrDigit(a)) l++;
        else if (!Character.isLetterOrDigit(b)) r--;
        // both are real characters: they must match, ignoring case
        else if (Character.toLowerCase(a) != Character.toLowerCase(b)) return false;
        // a matching pair is done, move both inward
        else { l++; r--; }
    }
    return true;
}
```

```cpp
bool isPalindrome(const string& s) {
    int l = 0, r = s.size() - 1;
    while (l < r) {
        unsigned char a = s[l], b = s[r];    // cctype functions need unsigned char values
        if (!isalnum(a)) l++;
        else if (!isalnum(b)) r--;
        else if (tolower(a) != tolower(b)) return false;
        else { l++; r--; }
    }
    return true;
}
```

The "valid palindrome II" variant allows deleting one character: on the first mismatch, check whether `s[l+1..r]` or `s[l..r-1]` is a palindrome.

## Same direction

### Remove duplicates in place

Use a **read** pointer that visits every element and a **write** pointer that marks where the next kept element goes. In a sorted array, an element is new exactly when it differs from the last one written.

```diagram
{"type":"array","rows":[{"label":"before","values":[0,0,1,1,1,2,2,3,3,4]},{"label":"after","values":[0,1,2,3,4,2,2,3,3,4],"highlight":[0,1,2,3,4],"dim":[5,6,7,8,9],"pointers":{"w":5}}],"caption":"The first w = 5 slots hold the unique values. What's left after them doesn't matter, so the function returns 5."}
```

```python
def remove_duplicates(nums):             # sorted input; returns the new length
    if not nums:
        return 0
    w = 1                                # nums[:w] holds the unique values so far
    for r in range(1, len(nums)):
        if nums[r] != nums[w - 1]:       # differs from the last kept value
            nums[w] = nums[r]
            w += 1
    return w
```

```java
int removeDuplicates(int[] nums) {           // sorted input; returns the new length
    if (nums.length == 0) return 0;
    int w = 1;                               // nums[0..w) holds the unique values so far
    for (int r = 1; r < nums.length; r++)
        if (nums[r] != nums[w - 1]) nums[w++] = nums[r];
    return w;
}
```

```cpp
int removeDuplicates(vector<int>& nums) {    // sorted input; returns the new length
    if (nums.empty()) return 0;
    int w = 1;                               // nums[0..w) holds the unique values so far
    for (size_t r = 1; r < nums.size(); r++)
        if (nums[r] != nums[w - 1]) nums[w++] = nums[r];
    return w;
}
```

The same reader/writer pair solves "remove element" (keep `x != val`), "move zeroes" (keep non-zeros, then fill the tail with zeros) and "allow each value at most twice" (compare with `nums[w - 2]` instead of `nums[w - 1]`).

### Fast and slow pointers

Another same-direction pattern moves one pointer two steps for every one step of the other. When the fast pointer reaches the end of a linked list, the slow one is in the middle; if the list has a cycle, the fast pointer eventually laps the slow one and they meet. Those problems live in [linked lists](/learn/linked-lists). The same trick works on an array whose values are indices, as in "find the duplicate number".

## Merging two sorted arrays

With one pointer per input, repeatedly take the smaller front element. That's the merge step of merge sort, O(n + m).

A classic twist is merging in place: `nums1` has `m` values followed by `n` empty slots, and `nums2` has `n` values. Filling from the front would overwrite values of `nums1` that haven't been read yet, so fill from the **back**, taking the larger of the two last elements each time.

```python
def merge(nums1, m, nums2, n):           # nums1 has n spare slots at the end
    i, j, w = m - 1, n - 1, m + n - 1    # w: next slot to fill, from the back
    while j >= 0:                        # when nums2 runs out, the rest is in place
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[w] = nums1[i]
            i -= 1
        else:
            nums1[w] = nums2[j]
            j -= 1
        w -= 1
```

```java
void merge(int[] nums1, int m, int[] nums2, int n) {   // nums1 has n spare slots at the end
    int i = m - 1, j = n - 1, w = m + n - 1;           // w: next slot to fill, from the back
    while (j >= 0) {                                   // when nums2 runs out, the rest is in place
        if (i >= 0 && nums1[i] > nums2[j]) nums1[w--] = nums1[i--];
        else nums1[w--] = nums2[j--];
    }
}
```

```cpp
void merge(vector<int>& nums1, int m, const vector<int>& nums2, int n) {   // n spare slots at the end
    int i = m - 1, j = n - 1, w = m + n - 1;           // w: next slot to fill, from the back
    while (j >= 0) {                                   // when nums2 runs out, the rest is in place
        if (i >= 0 && nums1[i] > nums2[j]) nums1[w--] = nums1[i--];
        else nums1[w--] = nums2[j--];
    }
}
```

The same pointer pair finds the intersection of two sorted arrays (advance the smaller; on a match, record and advance both) and checks whether `s` is a subsequence of `t` (advance in `s` only on a match).

## Partitioning: the Dutch national flag

Sort an array of 0s, 1s and 2s in one pass (the "sort colors" problem). Three pointers split the array into four regions:

- `[0, lo)`: all 0s
- `[lo, mid)`: all 1s
- `[mid, hi]`: not yet examined
- `(hi, n - 1]`: all 2s

Look at `nums[mid]`. A 0 is swapped to `lo` and both advance. A 1 is already in place, so `mid` advances. A 2 is swapped to `hi` and `hi` retreats, but `mid` stays put because the value just swapped in hasn't been examined yet.

```diagram
{"type":"array","rows":[{"label":"start","values":[1,2,0,1,2,0,1,0,2],"pointers":{"lo":0,"mid":0,"hi":8}},{"label":"after 6 steps","values":[0,0,1,1,2,0,1,2,2],"pointers":{"lo":2,"mid":4,"hi":6},"window":[4,6]},{"label":"done","values":[0,0,0,1,1,1,2,2,2]}],"caption":"Mid-run: 0s in [0, lo), 1s in [lo, mid), 2s after hi, and the bracket [mid, hi] is still unexamined."}
```

```python
def sort_colors(nums):                   # Dutch national flag: 0s, 1s, 2s
    lo, mid, hi = 0, 0, len(nums) - 1
    while mid <= hi:
        if nums[mid] == 0:
            nums[lo], nums[mid] = nums[mid], nums[lo]
            lo += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:                            # a 2: send it to the back. Don't advance
            nums[mid], nums[hi] = nums[hi], nums[mid]
            hi -= 1                      # mid: the swapped-in value is unexamined
```

```java
void sortColors(int[] nums) {                // Dutch national flag: 0s, 1s, 2s
    int lo = 0, mid = 0, hi = nums.length - 1;
    while (mid <= hi) {
        if (nums[mid] == 0) swap(nums, lo++, mid++);
        else if (nums[mid] == 1) mid++;
        else swap(nums, mid, hi--);          // don't advance mid: the swapped-in value is unexamined
    }
}

void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
```

```cpp
void sortColors(vector<int>& nums) {         // Dutch national flag: 0s, 1s, 2s
    int lo = 0, mid = 0, hi = nums.size() - 1;
    while (mid <= hi) {
        if (nums[mid] == 0) swap(nums[lo++], nums[mid++]);
        else if (nums[mid] == 1) mid++;
        else swap(nums[mid], nums[hi--]);    // don't advance mid: the swapped-in value is unexamined
    }
}
```

Replace "0, 1, 2" with "less than, equal to, greater than a pivot" and you have the **three-way partition** that keeps quicksort fast on inputs with many duplicates (see [sorting](/learn/sorting)). A two-region version (evens before odds, negatives before positives) needs only one boundary pointer.

## 3Sum

Find all unique triples that sum to 0. Sort the array, fix the first element `nums[i]`, then run the sorted pair-sum on the rest looking for `-nums[i]`. That's O(n) per `i`, so O(n²) overall, down from O(n³).

The fiddly part is avoiding duplicate triples: skip an `i` whose value equals the previous `i`'s, and after recording a triple, move `L` past equal values.

```python
def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                     # same first value gives the same triples
        if nums[i] > 0:
            break                        # smallest value is positive: no more zeros
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                l += 1
                r -= 1
                while l < r and nums[l] == nums[l - 1]:
                    l += 1               # skip repeats of the second value
    return res
```

```java
List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    for (int i = 0; i + 2 < nums.length; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;   // same first value, same triples
        if (nums[i] > 0) break;                          // no more zeros possible
        int l = i + 1, r = nums.length - 1;
        while (l < r) {
            int sum = nums[i] + nums[l] + nums[r];
            if (sum < 0) l++;
            else if (sum > 0) r--;
            else {
                res.add(List.of(nums[i], nums[l], nums[r]));
                l++;
                r--;
                while (l < r && nums[l] == nums[l - 1]) l++;   // skip repeats
            }
        }
    }
    return res;
}
```

```cpp
vector<vector<int>> threeSum(vector<int> nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> res;
    for (int i = 0; i + 2 < (int)nums.size(); i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;   // same first value, same triples
        if (nums[i] > 0) break;                          // no more zeros possible
        int l = i + 1, r = nums.size() - 1;
        while (l < r) {
            int sum = nums[i] + nums[l] + nums[r];
            if (sum < 0) l++;
            else if (sum > 0) r--;
            else {
                res.push_back({nums[i], nums[l], nums[r]});
                l++;
                r--;
                while (l < r && nums[l] == nums[l - 1]) l++;   // skip repeats
            }
        }
    }
    return res;
}
```

For `[-1, 0, 1, 2, -1, -4]` this returns `[[-1, -1, 2], [-1, 0, 1]]`. Variants: "3Sum closest" tracks the sum nearest the target instead of exact matches; 4Sum adds one more fixed loop for O(n³). In general, k-sum is O(n^(k−1)).

## Expanding outward

The pointers can also start together in the middle and move **apart**. Each step makes the span one element wider, so a span can grow at most `n` times from any one start.

### Expand around the centre

*Palindromic substrings* (count every palindromic substring) and *longest palindromic substring* are the usual questions. Every palindrome is symmetric about its centre, which is either one character (odd length, `aba`) or the gap between two characters (even length, `abba`). A string of length `n` has `2n − 1` centres: `n` characters and `n − 1` gaps.

1. For each centre, set `L` and `R` on it: both on character `i`, or on `i` and `i + 1` for a gap.
2. While `L` and `R` are inside the string and `s[L] == s[R]`, the span `[L, R]` is a palindrome: count it (or record it if it's the longest so far), then move `L` left and `R` right.
3. The first mismatch ends this centre: any wider span around it has the same mismatched pair inside.

```python
def count_substrings(s):
    # Every palindrome grows out of centre (one char or gap between two)
    # Expand each of 2n - 1 centres while both ends match
    n = len(s)
    count = 0
    for centre in range(2 * n - 1):
        # even centre = char centre // 2, odd = gap after it
        l = centre // 2
        r = l + centre % 2
        # each matching step is one more palindrome
        while l >= 0 and r < n and s[l] == s[r]:
            count += 1
            l -= 1
            r += 1
    return count
```

```java
int countSubstrings(String s) {
    // Every palindrome grows out of centre (one char or gap between two)
    // Expand each of 2n - 1 centres while both ends match
    int n = s.length(), count = 0;
    for (int centre = 0; centre < 2 * n - 1; centre++) {
        // even centre = char centre / 2, odd = gap after it
        int l = centre / 2, r = l + centre % 2;
        // each matching step is one more palindrome
        while (l >= 0 && r < n && s.charAt(l) == s.charAt(r)) {
            count++;
            l--;
            r++;
        }
    }
    return count;
}
```

```cpp
int countSubstrings(const string& s) {
    // Every palindrome grows out of centre (one char or gap between two)
    // Expand each of 2n - 1 centres while both ends match
    int n = s.size(), count = 0;
    for (int centre = 0; centre < 2 * n - 1; centre++) {
        // even centre = char centre / 2, odd = gap after it
        int l = centre / 2, r = l + centre % 2;
        // each matching step is one more palindrome
        while (l >= 0 && r < n && s[l] == s[r]) {
            count++;
            l--;
            r++;
        }
    }
    return count;
}
```

**O(n²) time, O(1) space.** A string of one repeated letter is the worst case: every centre expands until it reaches the nearer edge. That matches a `dp[l][r]` table of "is `s[l..r]` a palindrome" (see [dynamic programming](/learn/dynamic-programming)) without its O(n²) memory. The common bug is expanding only from characters, which misses every even-length palindrome. **Manacher's algorithm** gets the longest palindrome around every centre in O(n) by starting each expansion from the radius of its mirror centre inside the rightmost palindrome found so far; it's worth naming, but interviews rarely expect it.

### Growing from a fixed index

*Maximum score of a good subarray*: the score of `nums[i..j]` is `min(nums[i..j]) × (j − i + 1)`, and a good subarray must contain index `k`. Return the best score. Start with the window `[k, k]` and grow it by one element per step, always toward the **larger** neighbour (a side past the edge counts as 0, since values are at least 1).

Why the greedy choice is safe: the window's minimum can only fall as it grows, and taking the smaller neighbour first would only pull it down sooner. Taking the larger one keeps, for every width from 1 to `n`, the largest minimum any window of that width containing `k` can have. Scoring after every step therefore checks the best window of each width, and one of those is the answer.

```diagram
{"type":"array","rows":[{"label":"7 × 1 = 7","values":[1,4,3,7,4,5],"window":[3,3]},{"label":"4 > 3: 4 × 2 = 8","values":[1,4,3,7,4,5],"window":[3,4]},{"label":"5 > 3: 4 × 3 = 12","values":[1,4,3,7,4,5],"window":[3,5]},{"label":"edge: 3 × 4 = 12","values":[1,4,3,7,4,5],"window":[2,5]},{"label":"3 × 5 = 15, best","values":[1,4,3,7,4,5],"window":[1,5],"highlight":[1,2,3,4,5]},{"label":"1 × 6 = 6","values":[1,4,3,7,4,5],"window":[0,5]}],"caption":"k = 3. Each step adds the larger of the two neighbours; once the right side hits the edge, only the left can grow. Best score 15."}
```

```python
def maximum_score(nums, k):
    # Window starts at [k, k] and grows by one each step
    # Always extend toward larger neighbour, keeping min as high as possible
    # So each width gets its best min, and every width is tried
    n = len(nums)
    lo = hi = k
    low = best = nums[k]
    while lo > 0 or hi < n - 1:
        # past edge = 0 (vals >= 1), so other side wins
        left = nums[lo - 1] if lo > 0 else 0
        right = nums[hi + 1] if hi < n - 1 else 0
        if left > right:
            lo -= 1
            low = min(low, left)
        else:
            hi += 1
            low = min(low, right)
        best = max(best, low * (hi - lo + 1))
    return best
```

```java
int maximumScore(int[] nums, int k) {
    // Window starts at [k, k] and grows by one each step
    // Always extend toward larger neighbour, keeping min as high as possible
    // So each width gets its best min, and every width is tried
    int n = nums.length, lo = k, hi = k;
    int low = nums[k], best = nums[k];
    while (lo > 0 || hi < n - 1) {
        // past edge = 0 (vals >= 1), so other side wins
        int left = lo > 0 ? nums[lo - 1] : 0;
        int right = hi < n - 1 ? nums[hi + 1] : 0;
        if (left > right) {
            lo--;
            low = Math.min(low, left);
        } else {
            hi++;
            low = Math.min(low, right);
        }
        best = Math.max(best, low * (hi - lo + 1));
    }
    return best;
}
```

```cpp
int maximumScore(const vector<int>& nums, int k) {
    // Window starts at [k, k] and grows by one each step
    // Always extend toward larger neighbour, keeping min as high as possible
    // So each width gets its best min, and every width is tried
    int n = nums.size(), lo = k, hi = k;
    int low = nums[k], best = nums[k];
    while (lo > 0 || hi < n - 1) {
        // past edge = 0 (vals >= 1), so other side wins
        int left = lo > 0 ? nums[lo - 1] : 0;
        int right = hi < n - 1 ? nums[hi + 1] : 0;
        if (left > right) {
            lo--;
            low = min(low, left);
        } else {
            hi++;
            low = min(low, right);
        }
        best = max(best, low * (hi - lo + 1));
    }
    return best;
}
```

**O(n) time, O(1) space.** Pitfalls: stopping when one side reaches the edge (the other side must keep growing), and growing both sides at once, which skips widths. Without the "must contain `k`" rule this is the *largest rectangle in a histogram* problem, which needs a monotonic stack instead (see [stacks & queues](/learn/stacks-queues)).

## Recognizing two-pointer problems

Reach for two pointers when you see:

- **Sorted input**, or input you're allowed to sort, plus a question about pairs or triples with a target sum or difference.
- **Symmetry**: palindromes, reversing, comparing a string with itself from both ends.
- **"In place" with O(1) extra space**: remove, compact, partition, or deduplicate an array.
- **Two sorted sequences** to merge, intersect or compare.
- **A centre or a fixed index**: palindromes inside a string, or a window that must contain index `k`. Start both pointers there and expand.

And reach for something else when:

- The array is **unsorted and you need original indices**: a hash map gives O(n) without sorting.
- The question is about a **contiguous subarray or substring** with a constraint: that's a [sliding window](/learn/sliding-window), which is same-direction pointers with state in between.
- The target involves sums over subarrays with **negative numbers**: the pointer rules stop being safe; use [prefix sums](/learn/prefix-sums).

## Pitfalls

- **Prove the move.** Before writing `l += 1`, be able to say why no answer uses the element you're leaving behind. If you can't, the pointer rule is probably wrong.
- **`l < r` vs `l <= r`.** Pairs need two distinct indices, so use `l < r`. Dutch national flag uses `mid <= hi` because the element at `hi` is still unexamined.
- **Every loop iteration must move a pointer**, or the loop never ends.
- **Duplicate results.** Skip equal neighbors at every level where a value is chosen, as in 3Sum.
- **Overflow.** `nums[l] + nums[r]` can overflow a 32-bit int in Java and C++ when values are near 2³¹; use `long` or `long long`.
- **Sorting costs.** If you sort to enable two pointers, the total is O(n log n), and you lose the original order.
