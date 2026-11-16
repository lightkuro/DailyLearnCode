---
title: Sliding window
summary: Keep a contiguous range and slide it across an array or string, updating its state as elements enter and leave, to solve subarray and substring problems in O(n).
related: two-pointers, hashing, prefix-sums, stacks-queues, arrays-strings
terms:
  - sliding window
  - sliding windows
  - fixed-size window #fixed-size-windows
  - variable-size window #variable-size-windows
  - longest substring without repeating characters #longest-substring-without-repeating-characters
  - minimum window substring #minimum-window-substring
  - sliding window maximum #window-maximum-with-a-monotonic-deque
  - longest repeating character replacement #longest-repeating-character-replacement
  - substring with concatenation of all words #substring-with-concatenation-of-all-words
---

## The idea

Subarray and substring questions ("the longest substring with...", "the shortest subarray whose sum...", "how many windows of size k...") have O(n²) candidate ranges, and recomputing each one from scratch makes it O(n³). A **sliding window** keeps one range `[l, r]` and some state about it (a sum, a count of characters). Moving `r` right adds one element to the state; moving `l` right removes one. Neither pointer ever moves backwards, so each element enters the window once and leaves at most once: O(n) in total, even though the code has a loop inside a loop.

Sliding window is a same-direction case of [two pointers](/learn/two-pointers). What makes it a pattern of its own is the state carried between the pointers and the rule for when to shrink.

## Fixed-size windows

When the window size `k` is given, slide it one step at a time: add the element entering on the right and subtract the one leaving on the left. For the largest sum of `k` consecutive values:

```diagram
{"type":"array","rows":[{"label":"sum 8","values":[2,1,5,1,3,2],"window":[0,2]},{"label":"sum 7","values":[2,1,5,1,3,2],"window":[1,3]},{"label":"sum 9 (best)","values":[2,1,5,1,3,2],"window":[2,4],"highlight":[2,3,4]},{"label":"sum 6","values":[2,1,5,1,3,2],"window":[3,5]}],"caption":"k = 3. Each slide is one addition and one subtraction: 8 − 2 + 1 = 7, then 7 − 1 + 3 = 9, then 9 − 5 + 2 = 6."}
```

```python
def max_sum_fixed(nums, k):              # best sum of k consecutive values
    window = sum(nums[:k])
    best = window
    for r in range(k, len(nums)):
        window += nums[r] - nums[r - k]  # add the new value, drop the oldest
        best = max(best, window)
    return best
```

```java
int maxSumFixed(int[] nums, int k) {         // best sum of k consecutive values
    int window = 0;
    for (int i = 0; i < k; i++) window += nums[i];
    int best = window;
    for (int r = k; r < nums.length; r++) {
        window += nums[r] - nums[r - k];     // add the new value, drop the oldest
        best = Math.max(best, window);
    }
    return best;
}
```

```cpp
int maxSumFixed(const vector<int>& nums, int k) {   // best sum of k consecutive values
    int window = accumulate(nums.begin(), nums.begin() + k, 0);
    int best = window;
    for (int r = k; r < (int)nums.size(); r++) {
        window += nums[r] - nums[r - k];     // add the new value, drop the oldest
        best = max(best, window);
    }
    return best;
}
```

The state doesn't have to be a sum. "Find all anagrams of `p` in `s`" slides a window of size `len(p)` and keeps 26 letter counts; "maximum vowels in a substring of length k" keeps a vowel count.

## Variable-size windows

When the size isn't fixed, the window grows and shrinks to satisfy a condition. Grow by moving `r` every step; whenever the window breaks the condition, shrink it from the left until it's valid again.

```text
l = 0
for r in 0 .. n-1:
    add a[r] to the window state
    while the window is invalid:
        remove a[l] from the window state
        l += 1
    the window [l, r] is valid: update the answer (for "longest", r - l + 1)
```

That form finds the **longest** valid window. To find the **shortest**, flip it: shrink *while the window is still valid*, recording the answer inside the loop before each shrink.

This only works if the condition is **monotone**: shrinking a valid window must keep it valid ("at most two distinct characters"), or growing a valid window must keep it valid ("sum at least target", with positive numbers). If neither holds, the pointers can't know which way to move.

Shortest subarray with sum at least `target` (all values positive):

```python
def min_subarray_len(target, nums):      # shortest subarray with sum >= target
    l, total, best = 0, 0, float("inf")
    for r, x in enumerate(nums):
        total += x
        while total >= target:           # valid: record it, then try shorter
            best = min(best, r - l + 1)
            total -= nums[l]
            l += 1
    return 0 if best == float("inf") else best
```

```java
int minSubArrayLen(int target, int[] nums) { // shortest subarray with sum >= target
    int l = 0, total = 0, best = Integer.MAX_VALUE;
    for (int r = 0; r < nums.length; r++) {
        total += nums[r];
        while (total >= target) {            // valid: record it, then try shorter
            best = Math.min(best, r - l + 1);
            total -= nums[l++];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}
```

```cpp
int minSubArrayLen(int target, const vector<int>& nums) {   // shortest with sum >= target
    int l = 0, total = 0, best = INT_MAX;
    for (int r = 0; r < (int)nums.size(); r++) {
        total += nums[r];
        while (total >= target) {            // valid: record it, then try shorter
            best = min(best, r - l + 1);
            total -= nums[l++];
        }
    }
    return best == INT_MAX ? 0 : best;
}
```

For target 7 and `[2, 3, 1, 2, 4, 3]` the answer is 2 (the subarray `[4, 3]`).

## Window counts with a hash map

For strings, the window state is usually a count of each character in the window, kept in a hash map (or a 26- or 128-slot array when the alphabet is known; see [hash maps & sets](/learn/hashing)). Two habits keep it correct:

- Add on the right, subtract on the left, and nothing else touches the counts.
- If you need "number of distinct characters", either delete keys whose count reaches 0 and use the map's size, or keep a separate counter that changes when a count moves between 0 and 1.

### Longest substring without repeating characters

The window is valid while no character appears twice. When the new character `c` makes its count 2, shrink from the left until it's back to 1.

```diagram
{"type":"array","rows":[{"label":"r = 3: 'a' twice","values":["a","b","c","a","b","c","b","b"],"window":[0,3],"highlight":[0,3],"pointers":{"l":0,"r":3}},{"label":"shrink: l = 1","values":["a","b","c","a","b","c","b","b"],"window":[1,3],"dim":[0],"pointers":{"l":1,"r":3}}],"caption":"\"abcabcbb\": adding the second 'a' breaks the window, so l moves past the first 'a'. The best length stays 3."}
```

```python
def length_of_longest_substring(s):
    count = {}                           # char -> occurrences in the window
    best = l = 0
    for r, c in enumerate(s):
        count[c] = count.get(c, 0) + 1
        while count[c] > 1:              # c repeats: shrink until it doesn't
            count[s[l]] -= 1
            l += 1
        best = max(best, r - l + 1)
    return best
```

```java
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> count = new HashMap<>();   // char -> occurrences in the window
    int best = 0, l = 0;
    for (int r = 0; r < s.length(); r++) {
        char c = s.charAt(r);
        count.merge(c, 1, Integer::sum);
        while (count.get(c) > 1) {                     // c repeats: shrink until it doesn't
            count.merge(s.charAt(l), -1, Integer::sum);
            l++;
        }
        best = Math.max(best, r - l + 1);
    }
    return best;
}
```

```cpp
int lengthOfLongestSubstring(const string& s) {
    unordered_map<char, int> count;                    // char -> occurrences in the window
    int best = 0, l = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        char c = s[r];
        count[c]++;
        while (count[c] > 1) {                         // c repeats: shrink until it doesn't
            count[s[l]]--;
            l++;
        }
        best = max(best, r - l + 1);
    }
    return best;
}
```

A common shortcut stores each character's last index instead of a count and jumps `l` straight to `last[c] + 1` (taking the max with the current `l`, so it never moves backwards). Same O(n), fewer steps.

### Minimum window substring

Find the shortest substring of `s` that contains every character of `t`, with multiplicity. Keep `need[c]`, how many more of `c` the window still needs (it goes negative when the window has extras), and `missing`, the total still needed. When `missing` hits 0, the window is valid: record it, then shrink while it stays valid.

```python
from collections import Counter

def min_window(s, t):
    need = Counter(t)                    # how many of each char the window still needs
    missing = len(t)                     # total chars still needed
    best_l, best_len = 0, float("inf")
    l = 0
    for r, c in enumerate(s):
        if need[c] > 0:                  # c was still needed
            missing -= 1
        need[c] -= 1                     # below 0 means a surplus
        while missing == 0:              # valid: record it, then try shorter
            if r - l + 1 < best_len:
                best_l, best_len = l, r - l + 1
            need[s[l]] += 1
            if need[s[l]] > 0:           # dropped a char the window needed
                missing += 1
            l += 1
    return "" if best_len == float("inf") else s[best_l:best_l + best_len]
```

```java
String minWindow(String s, String t) {
    int[] need = new int[128];               // how many of each char the window still needs
    for (char c : t.toCharArray()) need[c]++;
    int missing = t.length(), bestL = 0, bestLen = Integer.MAX_VALUE, l = 0;
    for (int r = 0; r < s.length(); r++) {
        if (need[s.charAt(r)]-- > 0) missing--;          // it was still needed
        while (missing == 0) {                           // valid: record, then try shorter
            if (r - l + 1 < bestLen) { bestL = l; bestLen = r - l + 1; }
            if (++need[s.charAt(l)] > 0) missing++;      // dropped a needed char
            l++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestL, bestL + bestLen);
}
```

```cpp
string minWindow(const string& s, const string& t) {
    vector<int> need(128, 0);                // how many of each char the window still needs
    for (char c : t) need[c]++;
    int missing = t.size(), bestL = 0, bestLen = INT_MAX, l = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[s[r]]-- > 0) missing--;                 // it was still needed
        while (missing == 0) {                           // valid: record, then try shorter
            if (r - l + 1 < bestLen) { bestL = l; bestLen = r - l + 1; }
            if (++need[s[l]] > 0) missing++;             // dropped a needed char
            l++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
}
```

For `s = "ADOBECODEBANC"` and `t = "ABC"` the answer is `"BANC"`. Each pointer moves at most `|s|` times, so it's O(|s| + |t|).

### Longest repeating character replacement

*Longest repeating character replacement*: you may change at most `k` characters of `s`; what's the longest run of a single repeated letter you can make? Turn it into a window condition. The cheapest way to make a window uniform is to change everything except its most common character, so a window is valid when

`window length − count of its most common character ≤ k`

That's monotone (shrinking a valid window keeps it valid), so the usual template works, recomputing the most common count over the 26 letters as you shrink: O(26 · n).

A well-known trick removes the recount. Keep `max_count`, the highest count seen in **any** window so far, and never decrease it:

- A window of length `L` can only be valid if some letter appears `L − k` times in it. So the answer can only grow when some count beats `max_count`, which is exactly when `max_count` goes up.
- A stale, too-large `max_count` can make the current window look valid when it isn't, but only at a length already reached by a genuinely valid window earlier. It never inflates the answer.
- So the window never needs to shrink. When it's invalid, **slide** it instead: move `l` once with an `if`, not a `while`. Its length is always the best found so far, and at the end the answer is `len(s) - l`.

For `"AABABBA"` with `k = 1` the answer is 4 (`"AABA"` becomes `"AAAA"`).

```python
def character_replacement(s, k):
    count = {}                           # char -> occurrences in the window
    max_count = l = 0                    # max_count: best count seen in any window so far
    for r, c in enumerate(s):
        count[c] = count.get(c, 0) + 1
        max_count = max(max_count, count[c])
        if (r - l + 1) - max_count > k:  # too many cells to change: slide, don't grow
            count[s[l]] -= 1
            l += 1
    return len(s) - l                    # the window never shrank, so its size is the answer
```

```java
int characterReplacement(String s, int k) {      // s is uppercase letters
    int[] count = new int[26];                   // occurrences in the window
    int maxCount = 0, l = 0;                     // maxCount: best seen in any window so far
    for (int r = 0; r < s.length(); r++) {
        maxCount = Math.max(maxCount, ++count[s.charAt(r) - 'A']);
        if ((r - l + 1) - maxCount > k) {        // too many to change: slide, don't grow
            count[s.charAt(l) - 'A']--;
            l++;
        }
    }
    return s.length() - l;                       // the window never shrank
}
```

```cpp
int characterReplacement(const string& s, int k) {   // s is uppercase letters
    int count[26] = {};                          // occurrences in the window
    int maxCount = 0, l = 0;                     // maxCount: best seen in any window so far
    for (int r = 0; r < (int)s.size(); r++) {
        maxCount = max(maxCount, ++count[s[r] - 'A']);
        if ((r - l + 1) - maxCount > k) {        // too many to change: slide, don't grow
            count[s[l] - 'A']--;
            l++;
        }
    }
    return s.size() - l;                         // the window never shrank
}
```

**O(n) time, O(26) space.** The pitfall is copying the trick to problems where the max can't be stale: it works here because the answer depends only on the largest count ever seen. If you'd rather not argue about it in an interview, the version that recounts is O(26 · n) and obviously correct.

### Substring with concatenation of all words

*Substring with concatenation of all words*: given `s` and a list of `k` words that all have the **same length** `w`, find every index where some ordering of all the words appears back to back, each used exactly once. For `s = "barfoothefoobarman"` and words `["foo", "bar"]` the answer is `[0, 9]`.

The trick is to slide over **word slots** instead of characters. A match starting at index `start` reads the words at `start`, `start + w`, `start + 2w`, …, so it lives on the grid of positions with the same remainder `start mod w`. Run one sliding window per **offset** `0..w−1`; within an offset, the window grows and shrinks by a whole word at a time, and its state is a count map of the words inside it:

1. Read the word at `right`. If it isn't in the list, no match can contain it: clear the window and restart just after it.
2. Otherwise add it. If that makes its count exceed the list's count, drop words from the left until it doesn't.
3. If the window now holds `k` words, none over its count, the counts match the list exactly: record `left`.

```diagram
{"type":"array","rows":[{"label":"offset 0","values":["bar","foo","the","foo","bar","man"],"window":[0,1],"highlight":[0,1]},{"label":"later","values":["bar","foo","the","foo","bar","man"],"window":[3,4],"highlight":[3,4],"dim":[2]}],"indices":false,"caption":"s = \"barfoothefoobarman\" cut into 3-letter slots from offset 0. \"barfoo\" matches at index 0; \"the\" isn't a word, so the window restarts after it and later matches \"foobar\" at index 9."}
```

```python
from collections import Counter

def find_substring(s, words):
    # All words have length w, so match starts sit on slots offset + w * t
    # Per offset 0..w-1, slide window over whole-word slots with counts
    w, k = len(words[0]), len(words)
    need = Counter(words)
    ans = []
    for offset in range(w):
        # have (word counts in window s[left:right + w])
        have = Counter()
        left = offset
        # each word slot from this offset
        for right in range(offset, len(s) - w + 1, w):
            word = s[right:right + w]
            # unlisted word, so no match crosses it; restart after it
            if word not in need:
                have.clear()
                left = right + w
                continue
            have[word] += 1
            # one copy too many, so drop words from left until it fits
            while have[word] > need[word]:
                have[s[left:left + w]] -= 1
                left += w
            # k words, none over its count, so counts match exactly
            if right + w - left == k * w:
                ans.append(left)
    return ans
```

```java
List<Integer> findSubstring(String s, String[] words) {
    // All words have length w, so match starts sit on slots offset + w * t
    // Per offset 0..w-1, slide window over whole-word slots with counts
    int w = words[0].length(), k = words.length;
    Map<String, Integer> need = new HashMap<>();
    for (String word : words) need.merge(word, 1, Integer::sum);
    List<Integer> ans = new ArrayList<>();
    for (int offset = 0; offset < w; offset++) {
        // have (word counts in window s[left, right + w))
        Map<String, Integer> have = new HashMap<>();
        int left = offset;
        // each word slot from this offset
        for (int right = offset; right + w <= s.length(); right += w) {
            String word = s.substring(right, right + w);
            // unlisted word, so no match crosses it; restart after it
            if (!need.containsKey(word)) {
                have.clear();
                left = right + w;
                continue;
            }
            have.merge(word, 1, Integer::sum);
            // one copy too many, so drop words from left until it fits
            while (have.get(word) > need.get(word)) {
                have.merge(s.substring(left, left + w), -1, Integer::sum);
                left += w;
            }
            // k words, none over its count, so counts match exactly
            if (right + w - left == k * w) ans.add(left);
        }
    }
    return ans;
}
```

```cpp
vector<int> findSubstring(const string& s, const vector<string>& words) {
    // All words have length w, so match starts sit on slots offset + w * t
    // Per offset 0..w-1, slide window over whole-word slots with counts
    int w = words[0].size(), k = words.size(), n = s.size();
    unordered_map<string, int> need;
    for (const string& word : words) need[word]++;
    vector<int> ans;
    for (int offset = 0; offset < w; offset++) {
        // have (word counts in window s[left, right + w))
        unordered_map<string, int> have;
        int left = offset;
        // each word slot from this offset
        for (int right = offset; right + w <= n; right += w) {
            string word = s.substr(right, w);
            // unlisted word, so no match crosses it; restart after it
            if (!need.count(word)) {
                have.clear();
                left = right + w;
                continue;
            }
            have[word]++;
            // one copy too many, so drop words from left until it fits
            while (have[word] > need[word]) {
                have[s.substr(left, w)]--;
                left += w;
            }
            // k words, none over its count, so counts match exactly
            if (right + w - left == k * w) ans.push_back(left);
        }
    }
    return ans;
}
```

Each offset reads about `n / w` slots, and each slot is added and removed once, so the window does O(n / w) steps per offset, O(n) in total. Building each slot's string and hashing it costs O(w), so the whole thing is **O(n · w) time** and O(k · w) space for the maps. Pitfalls:

- **Stepping one character at a time** and recounting `k` words at every index. That's O(n · k · w); the per-offset window reuses the counts instead.
- **Forgetting some offsets.** A match can start at any index, so you need all `w` of them, not just 0.
- **Duplicate words.** The list can repeat a word (`["foo", "foo"]`), so compare counts, not sets.
- **Unknown words.** A word that isn't in the list can't be part of any match, so clear the counts and restart after it; left in the window, it breaks the `k`-word test.

## Exactly k: at most k minus at most k − 1

"Count subarrays with **exactly** k distinct values" doesn't fit the template directly: shrinking a window with exactly k distinct values might keep it at k or drop it to k − 1, so there's no single rule for moving `l`. But **at most k** is monotone, and counting is easy: once the window `[l, r]` has at most k distinct values, so does every window that ends at `r` and starts at or after `l`. That's `r - l + 1` subarrays ending at `r`.

Then subtract: exactly k = (at most k) − (at most k − 1).

```python
def subarrays_with_k_distinct(nums, k):
    def at_most(k):                      # subarrays with at most k distinct values
        count = {}
        l = total = 0
        for r, x in enumerate(nums):
            count[x] = count.get(x, 0) + 1
            while len(count) > k:
                count[nums[l]] -= 1
                if count[nums[l]] == 0:
                    del count[nums[l]]   # so len(count) = distinct values
                l += 1
            total += r - l + 1           # windows [l..r], [l+1..r], ..., [r..r]
        return total

    return at_most(k) - at_most(k - 1)
```

```java
int subarraysWithKDistinct(int[] nums, int k) {
    return atMost(nums, k) - atMost(nums, k - 1);
}

int atMost(int[] nums, int k) {              // subarrays with at most k distinct values
    Map<Integer, Integer> count = new HashMap<>();
    int l = 0, total = 0;
    for (int r = 0; r < nums.length; r++) {
        count.merge(nums[r], 1, Integer::sum);
        while (count.size() > k) {
            if (count.merge(nums[l], -1, Integer::sum) == 0) count.remove(nums[l]);
            l++;
        }
        total += r - l + 1;                  // windows [l..r], [l+1..r], ..., [r..r]
    }
    return total;
}
```

```cpp
int atMost(const vector<int>& nums, int k) {     // subarrays with at most k distinct values
    unordered_map<int, int> count;
    int l = 0, total = 0;
    for (int r = 0; r < (int)nums.size(); r++) {
        count[nums[r]]++;
        while ((int)count.size() > k) {
            if (--count[nums[l]] == 0) count.erase(nums[l]);
            l++;
        }
        total += r - l + 1;                      // windows [l..r], [l+1..r], ..., [r..r]
    }
    return total;
}

int subarraysWithKDistinct(const vector<int>& nums, int k) {
    return atMost(nums, k) - atMost(nums, k - 1);
}
```

For `[1, 2, 1, 2, 3]` and k = 2: at most 2 gives 12, at most 1 gives 5, so 7 subarrays have exactly 2. The same trick counts binary subarrays with sum exactly `goal` and "nice" subarrays with exactly k odd numbers.

## Window maximum with a monotonic deque

"Maximum of every window of size k" can't be done with a running sum: when the maximum leaves the window, you need the next largest, and recomputing costs O(k). Instead keep a **deque of indices whose values decrease from front to back**:

1. Before adding index `i`, pop from the back every index whose value is ≤ `nums[i]`. Those elements are older *and* no larger, so they can never be a window's maximum again.
2. Push `i` on the back.
3. If the front index has slid out of the window (`≤ i - k`), pop it from the front.
4. The front is the maximum of the current window.

```diagram
{"type":"array","rows":[{"label":"i = 3","values":[1,3,-1,-3,5,3,6,7],"window":[1,3],"highlight":[1,2,3],"pointers":{"max":1}},{"label":"i = 4","values":[1,3,-1,-3,5,3,6,7],"window":[2,4],"highlight":[4],"pointers":{"max":4}}],"caption":"Highlighted cells are the deque. At i = 3 it holds indices 1, 2, 3 (values 3, -1, -3), so the max is 3. Then 5 arrives and pops all three."}
```

```python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()                         # indices; their values decrease front to back
    out = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()                     # can never be a window max again
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()                 # the front slid out of the window
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
```

```java
int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> dq = new ArrayDeque<>();  // indices; their values decrease front to back
    int[] out = new int[nums.length - k + 1];
    for (int i = 0; i < nums.length; i++) {
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i])
            dq.pollLast();                   // can never be a window max again
        dq.offerLast(i);
        if (dq.peekFirst() <= i - k) dq.pollFirst();   // the front slid out
        if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()];
    }
    return out;
}
```

```cpp
vector<int> maxSlidingWindow(const vector<int>& nums, int k) {
    deque<int> dq;                           // indices; their values decrease front to back
    vector<int> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] <= nums[i])
            dq.pop_back();                   // can never be a window max again
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();       // the front slid out
        if (i >= k - 1) out.push_back(nums[dq.front()]);
    }
    return out;
}
```

For `[1, 3, -1, -3, 5, 3, 6, 7]` and k = 3 the output is `[3, 3, 5, 5, 6, 7]`. Every index is pushed once and popped at most once, so it's O(n) total. More on monotonic stacks and queues in [stacks & queues](/learn/stacks-queues).

## Why negative numbers break it

The sum-based windows above rely on positives: adding an element raises the sum and removing one lowers it, so "too big" always means "shrink". With negative numbers that's no longer true. A window whose sum is too big might become exactly right after a *later* negative number arrives, but by then the window has already thrown away its left end.

Try "is there a subarray with sum exactly 3?" on `[5, -3, 1]`. The window takes 5, sees 5 > 3, and shrinks it away. It then sees -3, then -2, and never finds `[5, -3, 1]`, which sums to 3.

For sums over arrays that may contain negatives, use [prefix sums](/learn/prefix-sums) with a hash map (subarray sum equals k), or prefix sums with a monotonic deque ([shortest subarray with sum at least k](/learn/prefix-sums#shortest-subarray-with-sum-at-least-k)).

## Recognizing sliding window problems

The signals:

- The answer is a **contiguous** subarray or substring.
- You want the **longest**, **shortest**, or **number of** such ranges under a constraint.
- The constraint is **monotone** in window size: "at most k distinct", "no repeats", "sum at least target" with positive values.

Pitfalls:

- **Recording the answer in the wrong place.** Longest: after the shrink loop. Shortest: inside it, before each shrink.
- **Window length is `r - l + 1`**, not `r - l`.
- **Stale keys.** If you use the map's size as the distinct count, delete keys whose count hits 0.
- **Counting subarrays**: add `r - l + 1` per `r`, not 1.
- **Negative numbers** with sum constraints: not a sliding window problem.
