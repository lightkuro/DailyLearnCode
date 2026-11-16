---
title: Stacks & queues
summary: Last in first out and first in first out: which class to use in each language, bracket matching, monotonic stacks and deques for "next greater" and sliding-window problems, and a queue built from two stacks.
related: linked-lists, graphs, sliding-window, heaps, recursion-backtracking
terms:
  - LIFO #stacks-lifo
  - FIFO #queues-fifo
  - deque #deques
  - deques #deques
  - double-ended queue #deques
  - ArrayDeque #which-class-to-use
  - valid parentheses #valid-parentheses
  - monotonic stack #monotonic-stacks
  - next greater element #monotonic-stacks
  - monotonic queue #monotonic-deque-sliding-window-maximum
  - monotonic deque #monotonic-deque-sliding-window-maximum
  - longest valid parentheses #longest-valid-parentheses
  - basic calculator #basic-calculator
  - remove k digits #remove-k-digits
  - min stack #min-stack
  - asteroid collision #asteroid-collision
  - sum of subarray minimums #sum-of-subarray-minimums
  - odd even jump #next-greater-by-value-odd-even-jump
---

## Stacks: LIFO

A **stack** is a pile: you add to the top and take from the top, so the last item in is the first one out (**LIFO**). Think of a stack of plates, or the back button in a browser.

It has three operations, all **O(1)**:

- **push** an item onto the top,
- **pop** the top item off,
- **peek** (or **top**) to look at the top item without removing it.

```diagram
{"type":"array","values":[3,8,5],"vertical":true,"highlight":[2],"caption":"After push 3, push 8, push 5, the stack has 5 on top. The next pop returns 5, then 8, then 3."}
```

Stacks fit any problem where the most recent unfinished thing has to be dealt with first:

- **Nesting**: brackets, HTML tags, nested function calls (the call stack behind [recursion](/learn/recursion-backtracking) is one).
- **Undo**: the last action is the first one undone.
- **Depth-first search** without recursion: push neighbours, pop the next node to visit.
- **Expression evaluation**: reverse Polish notation, basic calculators, decoding `3[a2[c]]`.
- **"Nearest bigger or smaller" questions**, via the monotonic stack below.

## Queues: FIFO

A **queue** is a line at a shop: you join at the back and leave from the front, so the first item in is the first one out (**FIFO**). Its operations, also O(1), are **enqueue** (add at the back), **dequeue** (remove from the front) and peek at the front.

```diagram
{"type":"array","values":[3,8,5,1],"pointers":{"front":0,"back":3},"highlight":[0],"caption":"After enqueueing 3, 8, 5, 1, the front is 3: it leaves first. New items join after 1."}
```

Queues process things in arrival order: breadth-first search, task schedulers, print jobs, buffers between a producer and a consumer, and rate limiters that keep the timestamps of recent requests.

### Deques

A **deque** (pronounced "deck", short for **double-ended queue**) supports push and pop at *both* ends in O(1). It can act as a stack or a queue, and some algorithms need both ends at once, such as the sliding window maximum below and 0-1 BFS in [shortest paths](/learn/shortest-paths). Libraries implement it as a circular array or as a list of fixed-size blocks, so it has no per-element allocation.

## Which class to use

| | Stack | Queue | Deque |
|---|---|---|---|
| **Python** | `list`: `append`, `pop`, `s[-1]` | `collections.deque`: `append`, `popleft`, `q[0]` | `collections.deque`: `append`, `appendleft`, `pop`, `popleft` |
| **Java** | `ArrayDeque`: `push`, `pop`, `peek` | `ArrayDeque` as a `Queue`: `offer`, `poll`, `peek` | `ArrayDeque`: `offerFirst`, `offerLast`, `pollFirst`, `pollLast`, `peekFirst`, `peekLast` |
| **C++** | `std::stack`: `push`, `pop`, `top` | `std::queue`: `push`, `pop`, `front` | `std::deque`: `push_front`, `push_back`, `pop_front`, `pop_back`, `front`, `back` |

Language notes that cause real bugs:

- **Python**: never use `list.pop(0)` or `list.insert(0, x)` as a queue. They shift every element, so they're O(n), and a BFS written that way is O(n²). `queue.Queue` is a thread-safe queue for passing work between threads; it's slower and not meant for algorithms.
- **Java**: don't use the `Stack` class. It's a legacy class built on `Vector`, every method is synchronized, and iterating over it goes bottom to top. Declare `Deque<Integer> stack = new ArrayDeque<>();` instead: `push`, `pop` and `peek` all work on the head. `ArrayDeque` rejects `null`, and it's faster than `LinkedList`, which allocates a node per element. `poll` and `peek` return `null` when empty, while `pop` and `remove` throw.
- **Java again**: the deque stores `Integer` objects, so `stack.peek() == other.peek()` compares references and is only reliably true for values from -128 to 127. Use `.equals`, or unbox into an `int` first.
- **C++**: `pop()` returns `void`, so read `top()` or `front()` first. Calling `top`, `front` or `pop` on an empty container is undefined behaviour, so check `empty()`. `std::stack` and `std::queue` are adapters over `std::deque` by default; a `vector` works well as a stack too (`push_back`, `back`, `pop_back`).

## Valid parentheses

The classic stack problem: given a string of `()[]{}`, is every bracket closed by the right kind, in the right order? `"([]{})"` is valid; `"(]"` and `"([)]"` are not.

The most recently opened bracket must close first, which is exactly LIFO. A neat way to write it is to push the **closer you expect** for each opener. Then each closing bracket must equal the top of the stack, and at the end nothing may be left open.

```python
def is_valid(s):
    closer = {'(': ')', '[': ']', '{': '}'}
    stack = []                                # closers we still expect, innermost on top
    for ch in s:
        if ch in closer:
            stack.append(closer[ch])
        elif not stack or stack.pop() != ch:  # nothing open, or the wrong closer
            return False
    return not stack                          # anything left was never closed
```

```java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();   // closers we still expect
    for (char ch : s.toCharArray()) {
        if (ch == '(') stack.push(')');
        else if (ch == '[') stack.push(']');
        else if (ch == '{') stack.push('}');
        else if (stack.isEmpty() || stack.pop() != ch) return false;   // nothing open, or the wrong closer
    }
    return stack.isEmpty();                        // anything left was never closed
}
```

```cpp
bool isValid(const string& s) {
    stack<char> st;                                // closers we still expect
    for (char ch : s) {
        if (ch == '(') st.push(')');
        else if (ch == '[') st.push(']');
        else if (ch == '{') st.push('}');
        else {
            if (st.empty() || st.top() != ch) return false;   // nothing open, or the wrong closer
            st.pop();
        }
    }
    return st.empty();                             // anything left was never closed
}
```

**O(n) time, O(n) space.** The two easy mistakes are popping an empty stack (input `")"`) and forgetting the final check (input `"(("`). With a single bracket type you don't even need a stack, only a counter that must never go negative and must end at zero.

### Longest valid parentheses

*Longest valid parentheses*: given a string of `(` and `)`, find the length of its longest well-formed substring. For `")()())"` it's 4 (`"()()"`).

Push **indices** instead of characters, and keep a **base** at the bottom of the stack: the index just before where the current valid run starts. Start with `-1` there.

1. On `(`: push its index.
2. On `)`: pop. If the stack is now empty, this `)` had no partner, so push its index as the new base. Otherwise the valid run ending here starts right after the index now on top, and its length is `i - top`.

```diagram
{"type":"array","values":[")","(",")","(",")",")"],"highlight":[1,2,3,4],"dim":[0,5],"pointers":{"base":0,"i":4},"caption":"\")()())\": at i = 4 the stack is [0] after popping, so the run is 4 − 0 = 4 long. The ')' at index 5 has no partner and becomes the new base."}
```

```python
def longest_valid_parentheses(s):
    stack = [-1]                         # bottom: the index just before the current valid run
    best = 0
    for i, ch in enumerate(s):
        if ch == '(':
            stack.append(i)
        else:
            stack.pop()                  # match the latest '(' (or remove the base)
            if not stack:
                stack.append(i)          # unmatched ')': it is the new base
            else:
                best = max(best, i - stack[-1])
    return best
```

```java
int longestValidParentheses(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(-1);                      // bottom: the index just before the current valid run
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) == '(') {
            stack.push(i);
        } else {
            stack.pop();                 // match the latest '(' (or remove the base)
            if (stack.isEmpty()) stack.push(i);  // unmatched ')': it is the new base
            else best = Math.max(best, i - stack.peek());
        }
    }
    return best;
}
```

```cpp
int longestValidParentheses(const string& s) {
    vector<int> stack{-1};               // bottom: the index just before the current valid run
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] == '(') {
            stack.push_back(i);
        } else {
            stack.pop_back();            // match the latest '(' (or remove the base)
            if (stack.empty()) stack.push_back(i);   // unmatched ')': it is the new base
            else best = max(best, i - stack.back());
        }
    }
    return best;
}
```

There's also an **O(1)-space** version with two counters. Scan left to right counting `opened` and `closed`. When they're equal, the run since the last reset is valid and `2 · closed` long. When `closed > opened`, nothing later can fix this prefix, so reset both to 0. That misses runs where `(` stays ahead until the end, like `"(()"`, so scan again right to left with the roles swapped.

```python
def longest_valid_counters(s):           # O(1) space: scan both ways
    best = 0
    for chars, opener in ((s, '('), (s[::-1], ')')):
        opened = closed = 0
        for ch in chars:
            if ch == opener:
                opened += 1
            else:
                closed += 1
            if opened == closed:
                best = max(best, 2 * closed)
            elif closed > opened:        # can't be fixed by anything later: restart
                opened = closed = 0
    return best
```

```java
int longestValidCounters(String s) {     // O(1) space: scan both ways
    int best = 0, n = s.length();
    for (int pass = 0; pass < 2; pass++) {
        char opener = pass == 0 ? '(' : ')';
        int opened = 0, closed = 0;
        for (int k = 0; k < n; k++) {
            char ch = s.charAt(pass == 0 ? k : n - 1 - k);
            if (ch == opener) opened++; else closed++;
            if (opened == closed) best = Math.max(best, 2 * closed);
            else if (closed > opened) opened = closed = 0;   // can't be fixed later: restart
        }
    }
    return best;
}
```

```cpp
int longestValidCounters(const string& s) {   // O(1) space: scan both ways
    int best = 0, n = s.size();
    for (int pass = 0; pass < 2; pass++) {
        char opener = pass == 0 ? '(' : ')';
        int opened = 0, closed = 0;
        for (int k = 0; k < n; k++) {
            char ch = s[pass == 0 ? k : n - 1 - k];
            if (ch == opener) opened++; else closed++;
            if (opened == closed) best = max(best, 2 * closed);
            else if (closed > opened) opened = closed = 0;   // can't be fixed later: restart
        }
    }
    return best;
}
```

Both are **O(n) time**; the stack uses O(n) space, the counters O(1). The usual bug in the stack version is forgetting the `-1` base, which makes the first valid run (or one after an unmatched `)`) measure from the wrong place.

## Basic calculator

*Basic calculator*: evaluate a string like `"(1+(4+5+2)-3)+(6+8)"` holding non-negative integers, `+`, `-`, parentheses and spaces, without `eval`. A `-` can also be **unary**: `"-(2+3)"` or `"1-(-2)"`. It's a stack problem because of the parentheses.

With only `+` and `-`, the whole expression is a sum of signed numbers. Keep three values while you scan:

- `result`: the sum so far inside the current parentheses,
- `sign`: `+1` or `-1`, the sign in front of the number being read,
- `num`: the digits of that number read so far.

Step by step:

1. **Digit**: `num = num · 10 + digit`, so multi-digit numbers build up.
2. **`+` or `-`**: the number has ended, so add `sign · num` to `result`, reset `num`, and set `sign` for the next one.
3. **`(`**: push `(result, sign)` and start fresh with `result = 0`, `sign = 1`. The saved sign is the one in front of the parenthesis.
4. **`)`**: add the last number, pop `(outer, outerSign)`, and set `result = outer + outerSign · result`. The sign in front of the parenthesis applies to everything inside it.
5. **End**: the answer is `result + sign · num`.

Unary minus needs no special case: a `-` at the start or right after `(` adds `sign · 0` and sets `sign` to `-1`. Here's `"1-(-2)"`:

| Read | `result` | `sign` | `num` | Stack |
|---|---|---|---|---|
| `1` | 0 | +1 | 1 | |
| `-` | 1 | −1 | 0 | |
| `(` | 0 | +1 | 0 | (1, −1) |
| `-` | 0 | −1 | 0 | (1, −1) |
| `2` | 0 | −1 | 2 | (1, −1) |
| `)` | 1 − (−2) = 3 | −1 | 0 | |

At the end, `result + sign · num = 3 + 0 = 3`.

```python
def calculate(s):
    # total so far at this paren level
    result = 0
    # sign in front of next number (+1 or -1)
    sign = 1
    num = 0
    # (total, sign) saved at each open paren
    stack = []
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch in '+-':
            # number ended, so add it with its sign
            result += sign * num
            num = 0
            sign = 1 if ch == '+' else -1
        elif ch == '(':
            stack.append((result, sign))
            # fresh level inside paren
            result, sign = 0, 1
        elif ch == ')':
            result += sign * num
            num = 0
            # sign before paren applies to whole inner total
            outer, outer_sign = stack.pop()
            result = outer + outer_sign * result
    return result + sign * num
```

```java
int calculate(String s) {
    // total so far at this paren level
    int result = 0;
    // sign in front of next number (+1 or -1)
    int sign = 1, num = 0;
    // total and sign saved at each open paren
    Deque<Integer> stack = new ArrayDeque<>();
    for (char ch : s.toCharArray()) {
        if (Character.isDigit(ch)) {
            num = num * 10 + (ch - '0');
        } else if (ch == '+' || ch == '-') {
            // number ended, so add it with its sign
            result += sign * num;
            num = 0;
            sign = ch == '+' ? 1 : -1;
        } else if (ch == '(') {
            stack.push(result);
            stack.push(sign);
            // fresh level inside paren
            result = 0;
            sign = 1;
        } else if (ch == ')') {
            result += sign * num;
            num = 0;
            // sign before paren applies to whole inner total
            int outerSign = stack.pop();
            result = stack.pop() + outerSign * result;
        }
    }
    return result + sign * num;
}
```

```cpp
int calculate(const string& s) {
    // total so far at this paren level
    int result = 0;
    // sign in front of next number (+1 or -1)
    int sign = 1, num = 0;
    // (total, sign) saved at each open paren
    vector<pair<int, int>> stack;
    for (char ch : s) {
        if (isdigit(ch)) {
            num = num * 10 + (ch - '0');
        } else if (ch == '+' || ch == '-') {
            // number ended, so add it with its sign
            result += sign * num;
            num = 0;
            sign = ch == '+' ? 1 : -1;
        } else if (ch == '(') {
            stack.push_back({result, sign});
            // fresh level inside paren
            result = 0;
            sign = 1;
        } else if (ch == ')') {
            result += sign * num;
            num = 0;
            // sign before paren applies to whole inner total
            auto [outer, outerSign] = stack.back();
            stack.pop_back();
            result = outer + outerSign * result;
        }
    }
    return result + sign * num;
}
```

**O(n)** time, and O(depth) space for the stack. The bugs are almost always about `num`: forgetting to add the last number at `)` or at the end, or forgetting to reset it, so `"1+2"` reads the second number as 12. *Basic calculator II* has `*` and `/` but no parentheses: keep a stack of terms, push `+num` or `-num`, and for `*` or `/` pop the last term and combine it with `num` first; the answer is the sum of the stack. Division truncates towards zero there, so in Python use `int(a / b)`, not `a // b`, which rounds down for negatives.

## Asteroid collision

*Asteroid collision* gives a row of asteroids as signed sizes: positive ones fly right, negative ones fly left, all at the same speed. When two meet, the smaller one explodes, and equal sizes both explode. What's left at the end?

Only a **right-mover followed by a left-mover** can ever meet. Two asteroids flying the same way never catch up, and a left-mover that's left of a right-mover flies away from it. That's a stack simulation: the stack holds the survivors so far, left to right, and only a new left-mover can disturb its top.

1. A right-mover (or a left-mover with no right-mover on top) is pushed as is.
2. A left-mover fights the right-movers on top, one at a time. If the top is smaller, pop it and keep fighting. If they're equal, pop it and the left-mover dies too. If the top is bigger, the left-mover dies.
3. If the left-mover survives every fight (it reached the bottom or a left-mover), push it.

```diagram
{"type":"array","rows":[{"label":"input","values":[10,2,-5,-12]},{"label":"after -5","values":[10]},{"label":"after -12","values":[-12]}],"caption":"-5 destroys 2, then loses to 10. -12 destroys 10 and reaches the empty bottom, so it survives."}
```

```python
def asteroid_collision(asteroids):
    # Stack holds survivors so far, left to right
    # Only left-mover meeting right-movers on top can collide
    stack = []
    for rock in asteroids:
        alive = True
        # left-mover hits right-movers on top until one side is gone
        while alive and rock < 0 and stack and stack[-1] > 0:
            # top smaller, so it explodes and rock keeps going
            if stack[-1] < -rock:
                stack.pop()
                continue
            # equal sizes, so both explode
            if stack[-1] == -rock:
                stack.pop()
            alive = False
        if alive:
            stack.append(rock)
    return stack
```

```java
int[] asteroidCollision(int[] asteroids) {
    // Stack holds survivors so far, left to right
    // Only left-mover meeting right-movers on top can collide
    Deque<Integer> stack = new ArrayDeque<>();
    for (int rock : asteroids) {
        boolean alive = true;
        // left-mover hits right-movers on top until one side is gone
        while (alive && rock < 0 && !stack.isEmpty() && stack.peek() > 0) {
            // top smaller, so it explodes and rock keeps going
            if (stack.peek() < -rock) {
                stack.pop();
                continue;
            }
            // equal sizes, so both explode
            if (stack.peek() == -rock) stack.pop();
            alive = false;
        }
        if (alive) stack.push(rock);
    }
    // pop order is right to left, so fill from back
    int[] result = new int[stack.size()];
    for (int i = result.length - 1; i >= 0; i--) result[i] = stack.pop();
    return result;
}
```

```cpp
vector<int> asteroidCollision(const vector<int>& asteroids) {
    // Vector used as stack holds survivors so far, left to right
    // Only left-mover meeting right-movers on top can collide
    vector<int> stack;
    for (int rock : asteroids) {
        bool alive = true;
        // left-mover hits right-movers on top until one side is gone
        while (alive && rock < 0 && !stack.empty() && stack.back() > 0) {
            // top smaller, so it explodes and rock keeps going
            if (stack.back() < -rock) {
                stack.pop_back();
                continue;
            }
            // equal sizes, so both explode
            if (stack.back() == -rock) stack.pop_back();
            alive = false;
        }
        if (alive) stack.push_back(rock);
    }
    return stack;
}
```

Each asteroid is pushed once and popped at most once: **O(n)** time, O(n) space for the stack. The pitfalls are the direction rule (a negative asteroid with a negative or empty top is pushed, never fought) and the equal-size case, which must destroy **both**: a `<=` in place of `<` lets the left-mover survive. Java's `Deque` pops from the front, so the survivors come out right to left; fill the result from the back.

## Monotonic stacks

Many problems ask, for each element, about the **next greater element** (or next smaller, previous greater, previous smaller). *Daily temperatures* is the standard example: for each day, how many days until a warmer one? Checking every later day is O(n²).

A **monotonic stack** does it in one pass. The stack holds the indices of days still **waiting** for a warmer day. Their temperatures decrease from bottom to top, because a warmer day would already have answered everything cooler below it. When a new day arrives, pop every waiting day that is cooler; the new day is their answer. Then push the new day, which is now waiting too.

```diagram
{"type":"array","rows":[{"label":"temps","values":[73,74,75,71,69,72,76,73],"highlight":[2,3,4],"pointers":{"i":5}},{"label":"answer","values":[1,1,4,2,1,1,0,0],"highlight":[3,4]}],"caption":"At i = 5 (72) the stack holds days 2, 3, 4 (75, 71, 69: decreasing). 72 pops day 4 (answer 5 - 4 = 1) and day 3 (answer 2); 75 stays."}
```

```python
def daily_temperatures(temps):
    answer = [0] * len(temps)
    stack = []                                  # waiting indices; temps decrease upwards
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:   # day i is the first warmer day for these
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer                               # days still on the stack keep 0
```

```java
int[] dailyTemperatures(int[] temps) {
    int[] answer = new int[temps.length];
    Deque<Integer> stack = new ArrayDeque<>();  // waiting indices; temps decrease upwards
    for (int i = 0; i < temps.length; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int j = stack.pop();                // day i is the first warmer day for j
            answer[j] = i - j;
        }
        stack.push(i);
    }
    return answer;                              // days still on the stack keep 0
}
```

```cpp
vector<int> dailyTemperatures(const vector<int>& temps) {
    vector<int> answer(temps.size(), 0);
    stack<int> st;                              // waiting indices; temps decrease upwards
    for (int i = 0; i < (int)temps.size(); i++) {
        while (!st.empty() && temps[st.top()] < temps[i]) {
            int j = st.top(); st.pop();         // day i is the first warmer day for j
            answer[j] = i - j;
        }
        st.push(i);
    }
    return answer;                              // days still on the stack keep 0
}
```

The `while` inside the `for` looks quadratic, but every index is pushed once and popped at most once, so the total work is **O(n)** (amortised O(1) per element). Store **indices**, not values: you need them for distances, and you can always look the value up.

The same loop answers the whole family. Only the comparison and the moment you read the answer change:

| You want, for each element | Stack order (bottom to top) | Pop while the top is | Answer comes from |
|---|---|---|---|
| Next greater to the right | decreasing | smaller than current | the current element, for each popped one |
| Next smaller to the right | increasing | larger than current | the current element, for each popped one |
| Previous greater to the left | decreasing | smaller or equal | the top left after popping |
| Previous smaller to the left | increasing | larger or equal | the top left after popping |

For a circular array (*Next greater element II*), loop `i` from 0 to `2n - 1` and use `i % n`.

### Remove k digits

*Remove k digits*: remove `k` digits from a number string to leave the smallest possible number. For `"1432219"` and `k = 3` the answer is `"1219"`.

Numbers of the same length compare by their leftmost differing digit, so it pays to make the early digits small. Scanning left to right, if a digit is bigger than the one after it, removing it makes the number smaller, and removing the earliest such digit helps the most. That's a monotonic stack of kept digits, **never decreasing** from bottom to top:

1. For each digit, while you still have removals left and the top of the stack is bigger, pop it (one removal).
2. Push the digit.
3. If removals are left at the end, the stack is non-decreasing, so its largest digits are at the end: cut them from there.
4. Strip leading zeros; if nothing is left, the answer is `"0"`.

```diagram
{"type":"array","values":[1,4,3,2,2,1,9],"highlight":[0,3,5,6],"dim":[1,2,4],"caption":"\"1432219\", k = 3. 3 pops 4, 2 pops 3, and 1 pops the second 2. The kept digits 1, 2, 1, 9 give 1219."}
```

```python
def remove_kdigits(num, k):
    # kept digits, never decreasing bottom to top
    stack = []
    for d in num:
        # bigger digit before smaller one, so dropping it shrinks number most
        while k and stack and stack[-1] > d:
            stack.pop()
            k -= 1
        stack.append(d)
    # removals left over, so cut from end (largest digits)
    stack = stack[:len(stack) - k]
    # strip leading zeros; nothing left = "0"
    return ''.join(stack).lstrip('0') or '0'
```

```java
String removeKdigits(String num, int k) {
    // kept digits, never decreasing bottom to top
    StringBuilder stack = new StringBuilder();
    for (char d : num.toCharArray()) {
        // bigger digit before smaller one, so dropping it shrinks number most
        while (k > 0 && stack.length() > 0 && stack.charAt(stack.length() - 1) > d) {
            stack.deleteCharAt(stack.length() - 1);
            k--;
        }
        stack.append(d);
    }
    // removals left over, so cut from end (largest digits)
    stack.setLength(stack.length() - k);
    // skip leading zeros
    int start = 0;
    while (start < stack.length() && stack.charAt(start) == '0') start++;
    // nothing left = "0"
    return start == stack.length() ? "0" : stack.substring(start);
}
```

```cpp
string removeKdigits(const string& num, int k) {
    // kept digits, never decreasing bottom to top
    string stack;
    for (char d : num) {
        // bigger digit before smaller one, so dropping it shrinks number most
        while (k > 0 && !stack.empty() && stack.back() > d) {
            stack.pop_back();
            k--;
        }
        stack.push_back(d);
    }
    // removals left over, so cut from end (largest digits)
    stack.resize(stack.size() - k);
    // skip leading zeros
    size_t start = stack.find_first_not_of('0');
    // nothing left = "0"
    return start == string::npos ? "0" : stack.substr(start);
}
```

**O(n)** time: each digit is pushed and popped at most once. The three pitfalls are each one of the steps above: removals left over when the digits only rise (`"12345"`, `k = 2` gives `"123"`), leading zeros (`"10200"`, `k = 1` gives `"200"`, not `"0200"`), and an empty result (`"10"`, `k = 2` gives `"0"`). *Remove duplicate letters* uses the same stack, but only pops a letter if it appears again later.

### Largest rectangle in histogram

Bars have width 1 and heights `heights[i]`. The largest rectangle under the histogram uses the full height of some bar, and stretches left and right until it hits a **shorter** bar on each side. So every bar needs its previous-smaller and next-smaller neighbours, which is two monotonic-stack questions answered in one pass.

```diagram
{"type":"grid","cells":[["","","","■","",""],["","","■","■","",""],["","","■","■","",""],["","","■","■","","■"],["■","","■","■","■","■"],["■","■","■","■","■","■"]],"rowLabels":[6,5,4,3,2,1],"colLabels":[2,1,5,6,2,3],"highlight":[[1,2],[1,3],[2,2],[2,3],[3,2],[3,3],[4,2],[4,3],[5,2],[5,3]],"caption":"heights = [2, 1, 5, 6, 2, 3]. The best rectangle has height 5 and spans bars 2 and 3 (between the shorter bars 1 and 2): area 10."}
```

Keep a stack of indices with **increasing** heights. When the current bar is shorter than the top, the top bar can't extend any further right: its right limit is the current index `i`, and its left limit is the new top after popping (its previous smaller bar). A height-0 bar at the end flushes everything left on the stack.

```python
def largest_rectangle_area(heights):
    best = 0
    stack = []                                    # indices; heights increase upwards
    for i in range(len(heights) + 1):
        h = heights[i] if i < len(heights) else 0     # a final 0 flushes the stack
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            left = stack[-1] if stack else -1     # previous smaller bar
            best = max(best, height * (i - left - 1))  # spans left+1 .. i-1
        stack.append(i)
    return best
```

```java
int largestRectangleArea(int[] heights) {
    int n = heights.length, best = 0;
    Deque<Integer> stack = new ArrayDeque<>();    // indices; heights increase upwards
    for (int i = 0; i <= n; i++) {
        int h = i < n ? heights[i] : 0;           // a final 0 flushes the stack
        while (!stack.isEmpty() && heights[stack.peek()] >= h) {
            int height = heights[stack.pop()];
            int left = stack.isEmpty() ? -1 : stack.peek();   // previous smaller bar
            best = Math.max(best, height * (i - left - 1));   // spans left+1 .. i-1
        }
        stack.push(i);
    }
    return best;
}
```

```cpp
int largestRectangleArea(const vector<int>& heights) {
    int n = heights.size(), best = 0;
    stack<int> st;                                // indices; heights increase upwards
    for (int i = 0; i <= n; i++) {
        int h = i < n ? heights[i] : 0;           // a final 0 flushes the stack
        while (!st.empty() && heights[st.top()] >= h) {
            int height = heights[st.top()]; st.pop();
            int left = st.empty() ? -1 : st.top();            // previous smaller bar
            best = max(best, height * (i - left - 1));        // spans left+1 .. i-1
        }
        st.push(i);
    }
    return best;
}
```

The width `i - left - 1` is where off-by-one errors live: the rectangle covers the bars strictly between `left` and `i`. *Maximal rectangle* in a binary matrix runs this once per row, on heights that count consecutive 1s upwards.

### Sum of subarray minimums

*Sum of subarray minimums* asks for the sum of `min(sub)` over every contiguous subarray, modulo 10⁹ + 7. There are O(n²) subarrays, so flip the sum around with the [contribution technique](/learn/prefix-sums#contribution-counting): each value adds itself once for every subarray where it's the minimum.

Value `arr[j]` is the minimum of exactly the subarrays that start after its **previous smaller** element `left` and end before its **next smaller** element `right`. That's `j - left` choices of start and `right - j` choices of end, so it contributes `arr[j] · (j - left) · (right - j)`.

Equal values need care. In `[2, 2]` the subarray `[2, 2]` has two minimums, and if both claim it the answer comes out 8 instead of 6. The fix is to **mix strict and non-strict**: stop at a strictly smaller value on the left and at a smaller-**or-equal** value on the right. Then a subarray with tied minimums belongs only to the rightmost of them, because the others' spans end at it.

```diagram
{"type":"array","values":[3,1,2,4],"highlight":[1],"pointers":{"j":1},"window":[0,3],"caption":"1 at index 1: no smaller value on the left (left = -1) or the right (right = 4), so it's the minimum of 2 · 3 = 6 subarrays. Total 3 + 6 + 2·2 + 4 = 17."}
```

The largest-rectangle loop finds both neighbours in one pass. Keep indices with strictly increasing values; when `arr[i]` is smaller than or equal to the top, `i` is the top's next smaller-or-equal element, and the index below it in the stack is its previous strictly smaller one.

```python
def sum_subarray_mins(arr):
    # Each value adds itself once per subarray where it is minimum
    # Its span runs between previous smaller and next smaller-or-equal
    # Strict on left, non-strict on right, so tied minimums count once
    MOD = 10**9 + 7
    # indices, values strictly increasing upwards
    stack = []
    total = 0
    for i in range(len(arr) + 1):
        # 0 past end pops every remaining value (all values >= 1)
        cur = arr[i] if i < len(arr) else 0
        # i = next smaller-or-equal for each popped index
        while stack and arr[stack[-1]] >= cur:
            j = stack.pop()
            # previous strictly smaller (-1 if none)
            left = stack[-1] if stack else -1
            total += arr[j] * (j - left) * (i - j)
        stack.append(i)
    return total % MOD
```

```java
int sumSubarrayMins(int[] arr) {
    // Each value adds itself once per subarray where it is minimum
    // Its span runs between previous smaller and next smaller-or-equal
    // Strict on left, non-strict on right, so tied minimums count once
    final long MOD = 1_000_000_007L;
    int n = arr.length;
    // indices, values strictly increasing upwards
    Deque<Integer> stack = new ArrayDeque<>();
    long total = 0;
    for (int i = 0; i <= n; i++) {
        // 0 past end pops every remaining value (all values >= 1)
        int cur = i < n ? arr[i] : 0;
        // i = next smaller-or-equal for each popped index
        while (!stack.isEmpty() && arr[stack.peek()] >= cur) {
            int j = stack.pop();
            // previous strictly smaller (-1 if none)
            int left = stack.isEmpty() ? -1 : stack.peek();
            // long product, ensuring no int overflow
            total = (total + (long) arr[j] * (j - left) % MOD * (i - j)) % MOD;
        }
        stack.push(i);
    }
    return (int) total;
}
```

```cpp
int sumSubarrayMins(const vector<int>& arr) {
    // Each value adds itself once per subarray where it is minimum
    // Its span runs between previous smaller and next smaller-or-equal
    // Strict on left, non-strict on right, so tied minimums count once
    const long long MOD = 1'000'000'007;
    int n = arr.size();
    // indices, values strictly increasing upwards
    stack<int> st;
    long long total = 0;
    for (int i = 0; i <= n; i++) {
        // 0 past end pops every remaining value (all values >= 1)
        int cur = i < n ? arr[i] : 0;
        // i = next smaller-or-equal for each popped index
        while (!st.empty() && arr[st.top()] >= cur) {
            int j = st.top(); st.pop();
            // previous strictly smaller (-1 if none)
            int left = st.empty() ? -1 : st.top();
            total = (total + (long long)arr[j] * (j - left) % MOD * (i - j)) % MOD;
        }
        st.push(i);
    }
    return total;
}
```

**O(n)** time and space. Pitfalls: using `>=` on both sides or `>` on both sides (double counting or missed subarrays with duplicates), overflow before the modulo (the product can reach about 3 · 10¹³, so use 64-bit), and forgetting the final flush. *Sum of subarray ranges* is this run twice: the sum of maximums (flip the comparisons) minus the sum of minimums.

### Next greater by value: odd-even jump

Sometimes "next" means next in **sorted order** among the elements to the right, not the next one that's bigger. *Odd even jump*: from index `i`, an odd-numbered jump goes to the index `j > i` with the **smallest value `>= arr[i]`** (the smallest such `j` on ties), and an even-numbered jump to the `j > i` with the **largest value `<= arr[i]`**. Count the start indices from which jumps reach the end.

Sort the indices by `(value, index)`. The odd-jump target of `i` is the first index that comes after `i` in this sorted list and also lies to its right: everything sorted between them is either to the left or not the smallest candidate. "First later item with a bigger index" is a next-greater question, so one monotonic stack pass over the sorted list answers it for every index. Sorting by `(-value, index)` gives the even-jump targets the same way.

Then fill two booleans from right to left: `odd[i]` (the end is reachable when the next jump from `i` is odd) is `even[oddNext[i]]`, and `even[i]` is `odd[evenNext[i]]`. The last index is good both ways. The answer counts the `i` with `odd[i]`, since the first jump is odd.

```diagram
{"type":"array","rows":[{"label":"arr","values":[10,13,12,14,15]},{"label":"odd next","values":[2,3,3,4,"-"]},{"label":"even next","values":["-","2","-","-","-"]},{"label":"odd ok","values":["no","no","no","yes","yes"],"highlight":[3,4]}],"caption":"From 10 the odd jump goes to 12 (smallest value >= 10 to the right), then there's no even jump from 12. Only indices 3 and 4 reach the end."}
```

```python
def odd_even_jumps(arr):
    # Odd jump = smallest value >= current to right (leftmost on ties)
    # Walk indices in value order; next later index in that order is target
    # Monotonic stack over that order finds each one in one pass
    # Fill reachability right to left, alternating odd and even jumps
    n = len(arr)

    def next_in_order(order):
        target = [None] * n
        # indices still waiting for later index (decreasing upwards)
        stack = []
        for i in order:
            # i comes next in value order and lies to their right
            while stack and stack[-1] < i:
                target[stack.pop()] = i
            stack.append(i)
        return target

    # ascending values, ties by index, gives odd-jump targets
    odd_next = next_in_order(sorted(range(n), key=lambda i: (arr[i], i)))
    # descending values, ties by index, gives even-jump targets
    even_next = next_in_order(sorted(range(n), key=lambda i: (-arr[i], i)))
    # odd[i] / even[i] (end reachable from i when next jump is odd / even)
    odd, even = [False] * n, [False] * n
    odd[-1] = even[-1] = True
    for i in range(n - 2, -1, -1):
        if odd_next[i] is not None:
            odd[i] = even[odd_next[i]]
        if even_next[i] is not None:
            even[i] = odd[even_next[i]]
    # first jump is odd
    return sum(odd)
```

```java
int oddEvenJumps(int[] arr) {
    // Odd jump = smallest value >= current to right (leftmost on ties)
    // Walk indices in value order; next later index in that order is target
    // Monotonic stack over that order finds each one in one pass
    // Fill reachability right to left, alternating odd and even jumps
    int n = arr.length;
    Integer[] order = new Integer[n];
    for (int i = 0; i < n; i++) order[i] = i;
    // ascending values, ties by index, gives odd-jump targets
    Arrays.sort(order, (a, b) -> arr[a] != arr[b] ? Integer.compare(arr[a], arr[b]) : a - b);
    int[] oddNext = nextInOrder(order);
    // descending values, ties by index, gives even-jump targets
    Arrays.sort(order, (a, b) -> arr[a] != arr[b] ? Integer.compare(arr[b], arr[a]) : a - b);
    int[] evenNext = nextInOrder(order);
    // odd[i] / even[i] (end reachable from i when next jump is odd / even)
    boolean[] odd = new boolean[n], even = new boolean[n];
    odd[n - 1] = even[n - 1] = true;
    int count = 1;
    for (int i = n - 2; i >= 0; i--) {
        if (oddNext[i] != -1) odd[i] = even[oddNext[i]];
        if (evenNext[i] != -1) even[i] = odd[evenNext[i]];
        // first jump is odd
        if (odd[i]) count++;
    }
    return count;
}

int[] nextInOrder(Integer[] order) {
    // -1 = no jump possible
    int[] target = new int[order.length];
    Arrays.fill(target, -1);
    // indices still waiting for later index (decreasing upwards)
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i : order) {
        // i comes next in value order and lies to their right
        while (!stack.isEmpty() && stack.peek() < i) target[stack.pop()] = i;
        stack.push(i);
    }
    return target;
}
```

```cpp
vector<int> nextInOrder(const vector<int>& order) {
    // -1 = no jump possible
    vector<int> target(order.size(), -1);
    // indices still waiting for later index (decreasing upwards)
    stack<int> st;
    for (int i : order) {
        // i comes next in value order and lies to their right
        while (!st.empty() && st.top() < i) {
            target[st.top()] = i;
            st.pop();
        }
        st.push(i);
    }
    return target;
}

int oddEvenJumps(const vector<int>& arr) {
    // Odd jump = smallest value >= current to right (leftmost on ties)
    // Walk indices in value order; next later index in that order is target
    // Monotonic stack over that order finds each one in one pass
    // Fill reachability right to left, alternating odd and even jumps
    int n = arr.size();
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    // ascending values, ties by index (stable sort keeps index order)
    stable_sort(order.begin(), order.end(), [&](int a, int b) { return arr[a] < arr[b]; });
    vector<int> oddNext = nextInOrder(order);
    // descending values, ties by index
    stable_sort(order.begin(), order.end(), [&](int a, int b) { return arr[a] > arr[b]; });
    vector<int> evenNext = nextInOrder(order);
    // odd[i] / even[i] (end reachable from i when next jump is odd / even)
    vector<bool> odd(n, false), even(n, false);
    odd[n - 1] = even[n - 1] = true;
    int count = 1;
    for (int i = n - 2; i >= 0; i--) {
        if (oddNext[i] != -1) odd[i] = even[oddNext[i]];
        if (evenNext[i] != -1) even[i] = odd[evenNext[i]];
        // first jump is odd
        if (odd[i]) count++;
    }
    return count;
}
```

**O(n log n)** for the two sorts, O(n) for the stack passes and the table. The pitfall is the tie rule: equal values must be ordered by index in **both** sorts (ascending index, not reversed), because each jump picks the leftmost index among equal values. A balanced BST or `TreeMap` with ceiling/floor queries, scanned from the right, is the other standard solution at the same cost.

## Monotonic deque: sliding window maximum

*Sliding window maximum*: for each window of `k` consecutive elements, report the largest. Rescanning each window is O(nk). A heap gives O(n log n). A **monotonic deque** (also called a **monotonic queue**) gives O(n).

The deque holds indices whose values **decrease** from front to back, so the front is always the current maximum. For each new index `i`:

1. If the front has slid out of the window (`front <= i - k`), pop it from the front.
2. Pop from the back every index whose value is `<=` the new value. They're older *and* not larger, so they can never be a maximum again.
3. Push `i` at the back.
4. Once the first window is complete, the front holds the answer.

```diagram
{"type":"array","rows":[{"label":"i=2, max 3","values":[1,3,-1,-3,5,3,6,7],"window":[0,2],"highlight":[1,2]},{"label":"i=3, max 3","values":[1,3,-1,-3,5,3,6,7],"window":[1,3],"highlight":[1,2,3]},{"label":"i=4, max 5","values":[1,3,-1,-3,5,3,6,7],"window":[2,4],"highlight":[4]},{"label":"i=5, max 5","values":[1,3,-1,-3,5,3,6,7],"window":[3,5],"highlight":[4,5]}],"caption":"k = 3. Highlighted: the indices in the deque, values decreasing front to back. At i = 4, 5 is bigger than everything waiting, so it clears the deque."}
```

```python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()                           # indices; values decrease front to back
    result = []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:          # the front slid out of the window
            dq.popleft()
        while dq and nums[dq[-1]] <= x:    # older and not larger: never the max again
            dq.pop()
        dq.append(i)
        if i >= k - 1:                     # the first full window ends at k - 1
            result.append(nums[dq[0]])
    return result
```

```java
int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();        // indices; values decrease front to back
    for (int i = 0; i < n; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();       // slid out
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();   // never the max again
        dq.offerLast(i);
        if (i >= k - 1) result[i - k + 1] = nums[dq.peekFirst()];
    }
    return result;
}
```

```cpp
vector<int> maxSlidingWindow(const vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq;                                 // indices; values decrease front to back
    for (int i = 0; i < (int)nums.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();         // slid out
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();  // never the max again
        dq.push_back(i);
        if (i >= k - 1) result.push_back(nums[dq.front()]);
    }
    return result;
}
```

Each index enters and leaves the deque at most once: **O(n) time, O(k) space**. For the window minimum, flip the comparison. The same structure speeds up DP transitions of the form "best of the last `k` states" (*Jump game VI*, *Constrained subsequence sum*). For more window techniques, see [sliding window](/learn/sliding-window).

## Min stack

*Min stack*: design a stack with `push`, `pop`, `top` and `getMin`, all O(1). A single "current minimum" variable doesn't work: after you pop the minimum, you don't know what the next one is.

Store the answer with each entry instead. Every entry holds its value **and the minimum of itself and everything below it**. `getMin` reads it from the top entry, and `pop` restores the previous minimum for free, because the entry now on top saved it when it was pushed.

```diagram
{"type":"array","rows":[{"label":"value","values":[5,3,7,2,8],"highlight":[4]},{"label":"min so far","values":[5,3,3,2,2],"highlight":[4]}],"caption":"After pushing 5, 3, 7, 2, 8 (top on the right), getMin reads 2 from the top entry. Pop 8 and 2, and the new top entry says 3."}
```

```python
class MinStack:
    def __init__(self):
        # (value, minimum of this entry and all below it)
        self.stack = []

    def push(self, val):
        low = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, low))

    def pop(self):
        self.stack.pop()

    def top(self):
        return self.stack[-1][0]

    def get_min(self):
        return self.stack[-1][1]
```

```java
class MinStack {
    // {value, minimum of this entry and all below it}
    private final Deque<int[]> stack = new ArrayDeque<>();

    public void push(int val) {
        int low = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[]{val, low});
    }

    public void pop() { stack.pop(); }

    public int top() { return stack.peek()[0]; }

    public int getMin() { return stack.peek()[1]; }
}
```

```cpp
class MinStack {
    // {value, minimum of this entry and all below it}
    vector<pair<int, int>> st;
public:
    void push(int val) {
        int low = st.empty() ? val : min(val, st.back().second);
        st.push_back({val, low});
    }

    void pop() { st.pop_back(); }

    int top() { return st.back().first; }

    int getMin() { return st.back().second; }
};
```

Every operation is **O(1)**, and the space is O(n) for the extra minimums. A variant saves space with a second stack that only pushes a value when it's `<=` the current minimum, and pops when the popped value equals it. The `<=` matters: with `<`, pushing the same minimum twice and popping once loses it. A max stack is the same idea with `max`.

## A queue from two stacks

A favourite design question: implement a queue using only stacks. Use two of them:

- **inbox** receives every `push`.
- **outbox** serves `pop` and `peek`. When it's empty, pour the whole inbox into it. Pouring reverses the order, so the oldest item ends up on top.

```python
class MyQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []

    def push(self, x):
        self.inbox.append(x)

    def pop(self):
        self.peek()                            # make sure outbox holds the front
        return self.outbox.pop()

    def peek(self):
        if not self.outbox:                    # refill only when empty
            while self.inbox:                  # pouring reverses the order
                self.outbox.append(self.inbox.pop())
        return self.outbox[-1]

    def empty(self):
        return not self.inbox and not self.outbox
```

```java
class MyQueue {
    private final Deque<Integer> inbox = new ArrayDeque<>();
    private final Deque<Integer> outbox = new ArrayDeque<>();

    public void push(int x) { inbox.push(x); }

    public int pop() {
        peek();                                // make sure outbox holds the front
        return outbox.pop();
    }

    public int peek() {
        if (outbox.isEmpty())                  // refill only when empty
            while (!inbox.isEmpty()) outbox.push(inbox.pop());   // pouring reverses the order
        return outbox.peek();
    }

    public boolean empty() { return inbox.isEmpty() && outbox.isEmpty(); }
}
```

```cpp
class MyQueue {
    stack<int> inbox, outbox;
public:
    void push(int x) { inbox.push(x); }

    int pop() {
        int x = peek();                        // make sure outbox holds the front
        outbox.pop();
        return x;
    }

    int peek() {
        if (outbox.empty())                    // refill only when empty
            while (!inbox.empty()) { outbox.push(inbox.top()); inbox.pop(); }   // pouring reverses the order
        return outbox.top();
    }

    bool empty() { return inbox.empty() && outbox.empty(); }
};
```

A single `pop` can cost O(n) when it triggers a pour, but each element is moved from inbox to outbox **once**, so n operations cost O(n) in total: **amortised O(1)** per operation. The key detail is refilling only when the outbox is empty; pouring on every call would mix up the order.

The reverse (a stack from queues) is less elegant: after each push, rotate the queue by dequeuing and re-enqueuing the older items, which makes push O(n).

## Queues in BFS

Breadth-first search uses a queue so that nodes come out in the order they were discovered, which means in order of distance from the start. Take a node from the front, add its unvisited neighbours at the back, repeat. Swap the queue for a stack and the same loop becomes a depth-first search. [Graphs: BFS & DFS](/learn/graphs) covers both in detail, and level-by-level BFS on trees is in [binary trees](/learn/trees).

Two relatives replace the plain queue when edges have weights: a deque for 0-1 BFS (weight-0 edges go to the front), and a priority queue for Dijkstra's algorithm (see [heaps](/learn/heaps)).

## Costs and pitfalls

| Operation | Stack | Queue | Deque |
|---|---|---|---|
| Push / enqueue | O(1) amortised | O(1) amortised | O(1) at either end |
| Pop / dequeue | O(1) | O(1) | O(1) at either end |
| Peek | O(1) | O(1) | O(1) at either end |
| Search for a value | O(n) | O(n) | O(n) |

"Amortised" because array-backed versions occasionally grow their buffer.

- **Popping an empty stack**: check before every `pop` and `top`. Python raises `IndexError`, Java's `pop` throws, and C++ is undefined behaviour.
- **Python `list.pop(0)`** is O(n). Use `collections.deque`.
- **Java `Stack`** is legacy; use `ArrayDeque`. Compare `Integer`s with `.equals`, not `==`.
- **C++ `pop()` returns nothing**: read `top()` first.
- **Monotonic stack direction**: decide whether you keep increasing or decreasing values and whether ties pop (`<` or `<=`), then check with a small example containing duplicates.
- **Values vs indices**: store indices whenever the answer involves a distance or a width.
