---
title: Python crash course
summary: Python 3 for programmers who already know another language: tooling, syntax, the core collections and their costs, functions, classes, idioms, interview patterns and the traps that catch Java, C++ and JS developers.
related: language-gotchas, hashing, heaps, stacks-queues, sorting, concurrency, big-o
terms:
  - list comprehension #comprehensions-and-generators
  - generator expression #comprehensions-and-generators
  - venv #running-python
  - f-string #strings-and-f-strings
  - f-strings #strings-and-f-strings
  - slicing #slicing
  - defaultdict #the-collections-module
  - dataclass #dataclasses
  - EAFP #errors-and-context-managers
  - context manager #with-and-context-managers
  - walrus operator #control-flow
---

## What kind of language Python is

Python is a dynamically typed, garbage-collected language where **everything is an object** (ints, functions, classes, modules) and **every variable is a reference**. Names have no declared type; objects do. Assignment binds a name to an object and never copies it.

What matters most when you arrive from Java, C++ or JavaScript:

- **Blocks are indentation.** No braces, no semicolons. Four spaces per level is the universal convention.
- **Batteries included.** The standard library has a heap, a deque, a counter, binary search, combinatorics and arbitrary-precision integers. In interviews you rarely write a data structure from scratch.
- **Readable beats clever.** There's usually one idiomatic way to do something, and reviewers notice when you write Java in Python (index loops, getters, manual counters).
- **It's slow per operation.** CPython (the standard interpreter) runs roughly 10 to 100 times slower than C++ or Java for tight loops. Built-ins written in C (`sorted`, `sum`, `dict`, `str.join`) are fast, so idiomatic code that leans on them is also the fastest Python.

This page assumes Python **3.12 or newer**. Python 2 has been dead since 2020; ignore any tutorial that uses `print "x"`.

## Running Python

```bash
python3                          # interactive REPL (exit with Ctrl-D)
python3 script.py arg1 arg2      # run a file; args in sys.argv
python3 -m http.server 8000      # run a module as a script
python3 -c 'print(2 ** 100)'     # one-liner
```

`python3 -m <module>` runs a module from the import path. It's the reliable way to run tools that belong to a particular interpreter: `python3 -m pip`, `python3 -m venv`, `python3 -m pytest`, `python3 -m cProfile script.py`.

### Virtual environments and packages

Never `pip install` into the system Python. Make a **venv** (virtual environment) per project: a folder with its own interpreter link and its own `site-packages`.

```bash
python3 -m venv .venv            # create once per project
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install requests   # installs into .venv only
deactivate
```

Projects describe themselves in **`pyproject.toml`** (name, version, dependencies, tool settings); `requirements.txt` is the older, still-common flat list of pinned packages. **uv** is a fast all-in-one replacement for pip, venv and version management (`uv init`, `uv add requests`, `uv run script.py`) and is now a popular default for new projects.

Tooling names you'll meet:

| Job | Tools |
| --- | --- |
| Format | `ruff format`, `black` |
| Lint | `ruff`, `pylint`, `flake8` |
| Type check | `mypy`, `pyright` |
| Test | `pytest` (de facto standard), `unittest` (stdlib) |
| Debug | `breakpoint()` drops into `pdb`; IDE debuggers |

## Syntax for C-family programmers

### Blocks, truthiness and None

```python
def classify(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    else:
        return "positive"

# ternary is value-if-condition-else-value
label = "even" if 10 % 2 == 0 else "odd"

# chained comparison means 0 <= x and x < 10
x = 5
print(0 <= x < 10)
```

- `True`, `False` and `None` are capitalised. `None` is the single "no value" object; test it with `is None`, not `== None`.
- Boolean operators are words: `and`, `or`, `not`. `&&` and `||` are syntax errors; `&`, `|`, `^`, `~` are bitwise.
- **Truthiness**: `False`, `None`, `0`, `0.0`, `""`, and empty containers (`[]`, `{}`, `set()`, `()`) are falsy; almost everything else is truthy. Idiomatic code writes `if items:` rather than `if len(items) > 0:`.
- `and` / `or` return one of their operands, not a bool: `name or "anonymous"` gives a default when `name` is empty or `None`. Careful when `0` is a valid value.
- There's no `++` or `--`. Use `i += 1`. (`++i` parses as `+(+i)` and silently does nothing.)
- Scope is **per function**, not per block. A variable assigned inside an `if` or `for` is visible after it, including the loop variable.

### Control flow

```python
# for walks any iterable; range(start, stop, step) excludes stop
for i in range(10, 0, -3):
    print(i)          # 10 7 4 1

# while with break; else runs only if loop wasn't broken
n = 7
d = 2
while d * d <= n:
    if n % d == 0:
        print("composite")
        break
    d += 1
else:
    print("prime")
```

`pass` is the empty statement (a body that does nothing). The `else` on loops is rare and confuses readers; use it sparingly.

The **walrus operator** `:=` (3.8) assigns inside an expression, handy in `while` loops and comprehensions:

```python
import re

line = "order 42 shipped"
if (m := re.search(r"\d+", line)) is not None:
    print(int(m.group()))    # 42
```

**Structural pattern matching** (`match`, 3.10) is more than a switch: it destructures sequences, mappings and objects. Cases don't fall through.

```python
def describe(cmd):
    match cmd.split():
        case ["go", direction]:
            return f"moving {direction}"
        case ["pick", "up", *items]:
            return f"picking {len(items)} items"
        case ["quit" | "exit"]:
            return "bye"
        case _:
            return "unknown"

print(describe("go north"))         # moving north
print(describe("pick up key coin")) # picking 2 items
```

### Numbers and division

| Expression | Result | Note |
| --- | --- | --- |
| `7 / 2` | `3.5` | `/` is always true division, even for ints |
| `7 // 2` | `3` | floor division |
| `-7 // 2` | `-4` | floors toward −∞ (C++/Java/JS truncate to `-3`) |
| `-7 % 2` | `1` | sign follows the divisor (C++/Java give `-1`) |
| `int(-7 / 2)` | `-3` | truncation, if you need C behaviour (fine for small ints) |
| `2 ** 100` | `1267650600228229401496703205376` | ints are arbitrary precision, never overflow |
| `pow(3, 200, 10**9 + 7)` | `136318165` | fast modular exponent; `pow(a, -1, m)` is a modular inverse (3.8) |
| `round(2.5)` | `2` | rounds half to even ("banker's rounding") |
| `0.1 + 0.2 == 0.3` | `False` | floats are IEEE doubles; use `math.isclose` |

Ints never overflow, which removes a whole class of bugs, but it also means bit tricks that rely on 32-bit wraparound need an explicit mask (`x & 0xFFFFFFFF`). Big ints also get slower as they grow. `math.inf` or `float('inf')` is the usual "infinity" sentinel, and it compares correctly against ints. `int.bit_count()` (3.10) counts set bits.

### Strings and f-strings

Strings are **immutable Unicode** sequences. There's no `char` type: `s[0]` is a string of length 1. Single and double quotes are interchangeable; triple quotes span lines.

```python
name, score = "Ada", 97.456
# f-strings evaluate expressions inside braces
print(f"{name} scored {score:.1f}")     # Ada scored 97.5
print(f"{name!r:>8}|{score:08.2f}")     #    'Ada'|00097.46
# = shows expression and value, handy for debugging
print(f"{score=}")                      # score=97.456

s = "  Hello, World  "
print(s.strip().lower().split(", "))    # ['hello', 'world']
print(", ".join(["a", "b", "c"]))       # a, b, c
print(ord("a"), chr(98))                # 97 b
print("ell" in "hello", "hello".find("z"))  # True -1
print(r"C:\new")                        # raw string, no escapes
```

**f-strings** (`f"..."`) are the idiomatic way to format; `%` formatting and `.format()` are older styles you'll still read. Since 3.12, f-strings can reuse the same quote type inside the braces.

Because strings are immutable, building one with `+=` in a loop can be O(n²) in general (CPython sometimes optimises it, but don't rely on that). Collect pieces in a list and `"".join(parts)` at the end. To edit characters, convert to a list: `chars = list(s)`, modify, then `"".join(chars)`.

`bytes` is the separate type for raw binary data; `s.encode()` and `b.decode()` convert (UTF-8 by default).

## Core collections

### Cheat sheet

| Type | Literal / constructor | Ordered | Mutable | Key costs (average) |
| --- | --- | --- | --- | --- |
| `list` | `[1, 2]`, `list(it)` | yes | yes | index O(1), `append`/`pop()` O(1) amortised, `insert(0, x)`/`pop(0)` O(n), `x in lst` O(n) |
| `tuple` | `(1, 2)`, `1, 2`, `(1,)` | yes | no | like list reads; hashable if its items are, so usable as dict keys |
| `dict` | `{"a": 1}`, `dict(a=1)` | insertion order (3.7+) | yes | get/set/`in`/`del` O(1) |
| `set` | `{1, 2}`, `set()` | no | yes | `add`/`in`/`remove` O(1); `a & b`, `a \| b`, `a - b` |
| `frozenset` | `frozenset(it)` | no | no | hashable set (a set of sets needs this) |
| `collections.deque` | `deque(it)` | yes | yes | `append`/`appendleft`/`pop`/`popleft` O(1); index in middle O(n) |
| `collections.defaultdict` | `defaultdict(list)` | insertion | yes | like dict; missing key creates a default |
| `collections.Counter` | `Counter(it)` | insertion | yes | like dict of counts; `most_common(k)` |
| `heapq` on a list | `heapq.heapify(lst)` | heap order | yes | `heappush`/`heappop` O(log n), `heapify` O(n), min at `lst[0]` |
| `bisect` on a sorted list | `bisect_left(lst, x)` | sorted | yes | search O(log n); `insort` O(n) because of the shift |

Notes that surprise newcomers:

- `{}` is an empty **dict**, not a set. An empty set is `set()`.
- A one-element tuple needs a trailing comma: `(1,)`. The comma makes the tuple, not the parentheses.
- Only hashable (in practice: immutable) values can be dict keys or set members. Lists can't; convert to a tuple first: `seen.add(tuple(path))`.
- `dict[key]` raises `KeyError` for a missing key; `dict.get(key, default)` doesn't.
- `len(x)` is O(1) for all built-in collections.

Hash-based containers work as described in [Hash maps & sets](/learn/hashing); a dict iterates in insertion order, which is now part of the language, not an accident.

```python
ages = {"ann": 31, "bob": 25}
ages["cy"] = 40
for name, age in ages.items():      # also .keys(), .values()
    print(name, age)
print(ages.get("dan", 0))           # 0
# setdefault returns existing value or inserts default
ages.setdefault("dan", 18)
# dict union (3.9)
merged = ages | {"eve": 22}
print(sorted(merged, key=merged.get))  # names by age

a, b = {1, 2, 3}, {2, 3, 4}
print(a & b, a | b, a - b, a ^ b)   # {2, 3} {1, 2, 3, 4} {1} {1, 4}
```

### Slicing

Sequences (lists, tuples, strings) support `seq[start:stop:step]`. `stop` is excluded, any part can be omitted, and negative indices count from the end. **Slicing** always returns a new object (a shallow copy for lists).

```python
a = [0, 1, 2, 3, 4, 5]
print(a[-1], a[-2])     # 5 4
print(a[1:4])           # [1, 2, 3]
print(a[:2], a[4:])     # [0, 1] [4, 5]
print(a[::2])           # [0, 2, 4]
print(a[::-1])          # [5, 4, 3, 2, 1, 0] (reversed copy)
# out-of-range slices clamp instead of raising
print(a[4:100])         # [4, 5]
b = a[:]                # shallow copy
# slice assignment replaces a range in place
a[1:3] = ["x"]
print(a)                # [0, 'x', 3, 4, 5]
```

A slice costs O(k) for k elements copied, so `s[1:]` inside recursion quietly turns O(n) into O(n²). Pass indices instead when it matters.

### The collections module

```python
from collections import Counter, defaultdict, deque

# group words by first letter
groups = defaultdict(list)
for w in ["apple", "avocado", "banana"]:
    groups[w[0]].append(w)
print(dict(groups))     # {'a': ['apple', 'avocado'], 'b': ['banana']}

counts = Counter("mississippi")
print(counts["s"], counts["z"])   # 4 0 (missing = 0, no KeyError)
print(counts.most_common(2))      # [('i', 4), ('s', 4)]
# anagram check
print(Counter("listen") == Counter("silent"))  # True

# BFS queue; list.pop(0) would be O(n)
q = deque([1])
q.append(2)
q.appendleft(0)
print(q.popleft(), q.pop(), list(q))  # 0 2 [1]
# maxlen keeps last n items
recent = deque(range(10), maxlen=3)
print(list(recent))     # [7, 8, 9]
```

`defaultdict(int)` is a counter, `defaultdict(list)` groups, `defaultdict(set)` builds an adjacency set. Reading a missing key *inserts* it, so use `in` or `.get` if you only want to look.

### heapq and bisect

`heapq` turns a plain list into a binary **min-heap** (see [Heaps](/learn/heaps)). There's no heap class and, before 3.14, no max-heap API, so the classic trick is to push negated keys. Tuples compare element by element, so `(priority, item)` pairs work as long as ties never reach an incomparable item; add a counter as a tiebreaker if they might.

```python
import heapq
from bisect import bisect_left, bisect_right, insort

nums = [5, 1, 8, 3]
heapq.heapify(nums)
heapq.heappush(nums, 0)
print(heapq.heappop(nums), nums[0])    # 0 1 (nums[0] is current min)
print(heapq.nlargest(2, [5, 1, 8, 3])) # [8, 5]

# max-heap by negating
max_heap = []
for x in [5, 1, 8]:
    heapq.heappush(max_heap, -x)
print(-max_heap[0])                    # 8

# (distance, node) pairs, ordered by distance first
pq = [(4, "b"), (1, "a"), (7, "c")]
heapq.heapify(pq)
print(heapq.heappop(pq))               # (1, 'a')

s = [1, 3, 3, 7]
# first index with s[i] >= 3, first with s[i] > 3
print(bisect_left(s, 3), bisect_right(s, 3))   # 1 3
insort(s, 5)
print(s)                               # [1, 3, 3, 5, 7]
```

Python 3.14 added `heapq.heappush_max`, `heappop_max` and `heapify_max`, but online judges and older codebases may not have them yet, so negation remains the portable idiom.

## Comprehensions and generators

A **list comprehension** builds a list from an iterable in one expression. It's the idiomatic replacement for most map/filter loops and is faster than the equivalent `append` loop.

```python
nums = [3, 1, 4, 1, 5, 9, 2, 6]
squares = [n * n for n in nums]
evens = [n for n in nums if n % 2 == 0]
# conditional expression goes before for
labels = ["big" if n > 4 else "small" for n in nums]
# nested loops read left to right, like nested for statements
pairs = [(r, c) for r in range(2) for c in range(3)]
grid = [[0] * 3 for _ in range(2)]

index_of = {v: i for i, v in enumerate("abc")}   # dict comprehension
unique_lengths = {len(w) for w in ["hi", "yo", "hey"]}  # set comprehension
print(evens, pairs[:2], index_of, unique_lengths)
```

Use `_` as the name for a value you don't need. If a comprehension needs more than one condition and one nested loop, a plain loop is usually clearer.

A **generator expression** uses parentheses instead of brackets and produces values lazily, one at a time, without building a list. Pass it straight into a function that consumes an iterable:

```python
nums = range(1_000_000)
# no million-element list is ever built
total = sum(n * n for n in nums)
has_big = any(n > 999_998 for n in nums)   # stops at first match
print(total, has_big)
```

A function that contains `yield` is a **generator function**: calling it returns an iterator that runs the body up to each `yield` on demand. Generators are single-use: once exhausted, iterating again yields nothing.

```python
def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

from itertools import islice
print(list(islice(fib(), 8)))    # [0, 1, 1, 2, 3, 5, 8, 13]

def walk(tree):
    # yield from delegates to another iterator
    if tree:
        yield from walk(tree[0])
        yield tree[1]
        yield from walk(tree[2])

print(list(walk(((None, 1, None), 2, (None, 3, None)))))  # [1, 2, 3]
```

`range`, `zip`, `map`, `filter`, `enumerate`, `reversed` and dict views are all lazy too. Wrap them in `list(...)` when you need to index, reuse or print them.

## Functions

```python
def area(width, height=1.0, *, unit="m"):
    return f"{width * height}{unit}²"

print(area(3))                    # 3.0m²
print(area(3, 2, unit="cm"))      # 6cm²
print(area(height=2, width=5))    # 10m²
```

- Arguments can be passed by position or by name. Parameters after a bare `*` are **keyword-only** (`unit` above must be named); parameters before a `/` are positional-only.
- There's no overloading. A second `def` with the same name replaces the first; use default values instead.
- A function without `return` returns `None`.
- Multiple return values are really one tuple, unpacked by the caller: `q, r = divmod(17, 5)`.

### Default arguments are evaluated once

Defaults are computed when the `def` runs, not per call, so a mutable default is shared between calls. This is the most famous Python bug (details in [Language gotchas](/learn/language-gotchas#mutable-default-arguments)):

```python
# bug: one shared list for every call
def append_bad(x, acc=[]):
    acc.append(x)
    return acc

print(append_bad(1), append_bad(2))   # [1, 2] [1, 2]

# fix: None means "make a new one"
def append_good(x, acc=None):
    if acc is None:
        acc = []
    acc.append(x)
    return acc

print(append_good(1), append_good(2))  # [1] [2]
```

### *args, **kwargs and unpacking

```python
def log(level, *args, **kwargs):
    # args is a tuple, kwargs a dict
    print(level, args, kwargs)

log("info", 1, 2, user="ann")     # info (1, 2) {'user': 'ann'}

point = (3, 4)
opts = {"sep": " | "}
# * and ** unpack at the call site
print(*point, **opts)             # 3 | 4

first, *rest = [1, 2, 3, 4]
print(first, rest)                # 1 [2, 3, 4]
# swap without temp
a, b = 1, 2
a, b = b, a
```

### Lambdas, closures and nonlocal

`lambda args: expr` is a one-expression anonymous function, mostly used for `key=` arguments. Anything longer should be a `def` (functions can be nested anywhere).

Inner functions capture variables from enclosing functions. Reading works automatically; **assigning** to an outer variable needs `nonlocal` (or `global` for module level), otherwise Python creates a new local:

```python
def make_counter():
    count = 0
    def inc():
        # without nonlocal, count += 1 raises UnboundLocalError
        nonlocal count
        count += 1
        return count
    return inc

c = make_counter()
c(); c()
print(c())    # 3
```

Mutating an outer list or dict (`seen.add(x)`) needs no declaration, because that isn't rebinding the name. This is why recursive helpers in interview code often use a list or `nonlocal` for their running answer.

Closures capture variables, not values: lambdas created in a loop all see the loop variable's final value. See [late-binding closures](/learn/language-gotchas#late-binding-closures).

### Decorators

A decorator is a function that takes a function and returns a replacement. `@dec` above a `def` is shorthand for `f = dec(f)`. You'll mostly *use* them: `@functools.cache`, `@property`, `@staticmethod`, `@classmethod`, `@dataclass`, test-framework fixtures. Writing one looks like this:

```python
import functools
import time

def timed(fn):
    # wraps copies name and docstring onto wrapper
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.4f}s")
        return result
    return wrapper

@timed
def slow_sum(n):
    return sum(range(n))

slow_sum(100_000)
```

## Classes

```python
class Account:
    # class attribute, shared by all instances
    bank = "Example Bank"

    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    @property
    def balance(self):
        return self._balance

    def __repr__(self):
        return f"Account({self.owner!r}, {self._balance})"

class Savings(Account):
    def __init__(self, owner, rate):
        super().__init__(owner)
        self.rate = rate

acct = Savings("ann", 0.02)
acct.deposit(100)
print(acct, acct.balance, isinstance(acct, Account))   # Account('ann', 100) 100 True
```

- `self` is explicit: every method takes it as its first parameter, and fields are always accessed as `self.x`. There are no field declarations; `__init__` simply assigns attributes.
- **No access modifiers.** `_name` means "internal, please don't touch" by convention only. `__name` triggers name mangling (to `_Class__name`), meant to avoid clashes in subclasses, not for privacy.
- **`@property`** makes a method look like an attribute, so start with plain public fields and add a property later if you need validation. Don't write `get_x()`/`set_x()` pairs.
- `@staticmethod` has no `self`; `@classmethod` receives the class (`cls`) and is the usual way to write alternative constructors.
- Multiple inheritance is allowed; `super()` follows the method resolution order (MRO). Duck typing is more common than deep hierarchies: if an object has the method you call, it works.
- `abc.ABC` and `@abstractmethod` give you abstract classes; `typing.Protocol` gives structural interfaces for type checkers.

### Dunder methods

Operators and built-ins call "double underscore" (**dunder**) methods, so your classes can plug into the language:

| You write | Python calls |
| --- | --- |
| `repr(x)`, REPL echo; `str(x)`, `print(x)` | `__repr__`, `__str__` (falls back to `__repr__`) |
| `a == b`, `a < b` | `__eq__`, `__lt__` (`functools.total_ordering` fills in the rest) |
| `hash(x)`, dict key, set member | `__hash__` |
| `len(x)`, `x[i]`, `x in c`, `for v in x` | `__len__`, `__getitem__`, `__contains__`, `__iter__` |
| `a + b` | `__add__` |
| `with x:` | `__enter__`, `__exit__` |
| `x()` | `__call__` |

`__eq__` and `__hash__` go together: objects that compare equal must hash equally. If you define `__eq__` without `__hash__`, Python sets `__hash__` to `None` and instances become unhashable (can't go in a set or be a dict key). Without either, equality is identity, like Java's default `equals`.

### Dataclasses

For classes that mostly hold data, `@dataclass` generates `__init__`, `__repr__` and `__eq__` from annotated fields. `frozen=True` makes instances immutable and hashable; `order=True` adds comparisons by field order.

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Point:
    x: int
    y: int

@dataclass
class Route:
    name: str
    # mutable default needs default_factory
    stops: list[Point] = field(default_factory=list)

p = Point(1, 2)
print(p, p == Point(1, 2), {p, Point(1, 2)})   # Point(x=1, y=2) True {Point(x=1, y=2)}
r = Route("loop")
r.stops.append(p)
print(r)
```

For quick immutable records, a `typing.NamedTuple` or even a plain tuple is also common.

## Errors and context managers

Python leans on exceptions for control flow more than Java or C++ do. The idiom is **EAFP**, "easier to ask forgiveness than permission": try the operation and handle the failure, instead of checking every precondition first (LBYL, "look before you leap").

```python
def parse_port(text):
    try:
        port = int(text)
    except ValueError as e:
        print(f"bad port: {e}")
        return None
    else:
        # runs only if try raised nothing
        return port
    finally:
        # always runs, even after return
        print("checked", repr(text))

print(parse_port("8080"))
print(parse_port("http"))
```

- Catch specific exceptions (`except (KeyError, IndexError):`). Bare `except:` also catches `KeyboardInterrupt` and `SystemExit`; `except Exception:` is the widest catch that's usually reasonable.
- `raise ValueError("msg")` raises; a bare `raise` inside `except` re-raises the current exception; `raise NewError(...) from e` chains the cause.
- Custom exceptions subclass `Exception`: `class InsufficientFunds(Exception): pass`.
- There are no checked exceptions. Nothing forces callers to handle anything.
- `assert cond, "msg"` is for internal sanity checks and is stripped when running with `python -O`.

### with and context managers

`with` guarantees cleanup, like try-with-resources in Java or RAII in C++. A **context manager** is any object with `__enter__`/`__exit__`; files, locks, database connections and temporary directories all are.

```python
import os
import tempfile
from contextlib import contextmanager

path = os.path.join(tempfile.mkdtemp(), "notes.txt")
# file closed on exit, even if body raises
with open(path, "w", encoding="utf-8") as f:
    f.write("line one\nline two\n")

with open(path, encoding="utf-8") as f:
    # iterating a file yields lines lazily
    for line in f:
        print(line.rstrip("\n"))

@contextmanager
def section(title):
    print(f"[{title}]")
    try:
        yield
    finally:
        print(f"[/{title}]")

with section("report"):
    print("body")
```

Always pass `encoding="utf-8"` when opening text files; the default depends on the platform. `pathlib.Path` is the modern API for paths (`Path("data") / "x.txt"`, `.read_text()`, `.glob("*.md")`).

## Iteration idioms

Python loops over **items**, not indices. Index loops (`for i in range(len(a))`) are a code smell unless you really need the index arithmetic.

```python
names = ["ann", "bob", "cy"]
scores = [90, 72, 85]

for i, name in enumerate(names, start=1):
    print(i, name)
# zip stops at shortest; strict=True (3.10) raises on length mismatch
for name, score in zip(names, scores, strict=True):
    print(name, score)
for name in reversed(names):
    print(name)

# sort by score descending, then name
ranked = sorted(zip(names, scores), key=lambda p: (-p[1], p[0]))
print(ranked)
print(max(names, key=len), min(scores), sum(scores))
print(any(s > 88 for s in scores), all(s > 70 for s in scores))
# empty input needs default, else ValueError
print(max([], default=0))
```

- `sorted(it)` returns a new list; `lst.sort()` sorts in place and returns `None` (so `x = lst.sort()` is a bug). Both are **stable** and take `key=` and `reverse=True`.
- Sort by several fields with a tuple key. Negate numbers to flip one field's direction. For a custom comparator, wrap it: `key=functools.cmp_to_key(cmp)`.
- `dict(zip(keys, values))` builds a dict; `zip(*matrix)` transposes.

### itertools highlights

| Function | Gives |
| --- | --- |
| `accumulate([1, 2, 3])` | running totals `1, 3, 6` (prefix sums; see [Prefix sums](/learn/prefix-sums)) |
| `product("ab", repeat=2)` | `aa ab ba bb` (nested loops) |
| `permutations([1, 2, 3], 2)` | ordered pairs |
| `combinations([1, 2, 3], 2)` | `(1,2) (1,3) (2,3)` |
| `pairwise([1, 2, 3])` | `(1,2) (2,3)` (3.10) |
| `groupby(sorted_data, key)` | runs of equal keys (sort first) |
| `chain(a, b)`, `chain.from_iterable(lists)` | concatenation / flattening |
| `islice(it, n)` | first `n` items of any iterator |
| `batched(it, 3)` | chunks of 3 (3.12) |
| `count()`, `cycle()`, `repeat()` | infinite iterators |

```python
from itertools import accumulate, combinations, groupby, pairwise

print(list(accumulate([3, 1, 4])))                       # [3, 4, 8]
print([a + b for a, b in combinations([1, 2, 3], 2)])    # [3, 4, 5]
print([b - a for a, b in pairwise([1, 4, 9, 16])])       # [3, 5, 7]
print([(k, len(list(g))) for k, g in groupby("aaabcc")]) # [('a', 3), ('b', 1), ('c', 2)]
```

## Type hints

Type hints are **annotations only**: the interpreter stores them and ignores them at runtime. Passing a string to a function annotated `int` runs fine until something breaks. Their value comes from static checkers (**mypy**, **pyright**) and IDEs, which catch mismatches before running.

```python
from collections.abc import Iterable

def top_k(words: Iterable[str], k: int = 3) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return sorted(counts.items(), key=lambda kv: -kv[1])[:k]

def find(items: list[int], target: int) -> int | None:
    return items.index(target) if target in items else None

# generic function syntax (3.12)
def first[T](xs: list[T]) -> T:
    return xs[0]

print(top_k("a b a c a b".split(), 2), find([4, 5], 5), first(["x"]))
```

- Use built-in generics (`list[int]`, `dict[str, int]`, 3.9+) and `X | None` (3.10+). Older code uses `typing.List`, `Optional[int]` and `Union`; they still work.
- `typing.Any` opts out of checking; `typing.Callable`, `TypedDict`, `Protocol` and `Literal` cover the rest of everyday needs.
- LeetCode's templates use `List[int]` and `Optional[TreeNode]` from `typing`; the judge pre-imports them, so you'll see both styles.

## Modules and imports

Every `.py` file is a **module**; a folder of modules is a **package** (traditionally with an `__init__.py`). Importing runs the module's top-level code once and caches it in `sys.modules`.

```python
import math                         # use as math.sqrt
from collections import Counter     # import one name
import datetime as dt               # alias
from os.path import join as join_path

print(math.sqrt(16), Counter("aab")["a"], dt.date(2026, 1, 1).year, join_path("a", "b"))
```

Inside a package, `from .utils import helper` is a relative import. Third-party packages are conventionally aliased (`import numpy as np`, `import pandas as pd`). Avoid `from module import *`: it hides where names come from.

A file can be both an importable module and a script. Top-level code runs on import, so guard the script part:

```python
def main():
    print("running as a script")

# true only when run directly, not when imported
if __name__ == "__main__":
    main()
```

There's no `main` function by convention or requirement; the guard is the convention. Names starting with `_` are treated as module-private by `import *` and by readers, not enforced.

## Interview and LeetCode idioms

A typical solution is a method on `class Solution`, with type hints from the problem template:

```python
from collections import deque
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # BFS from each unseen land cell; each BFS = one island
        rows, cols = len(grid), len(grid[0])
        seen = set()
        islands = 0
        for r in range(rows):
            for c in range(cols):
                # unseen land = start of new island
                if grid[r][c] == "1" and (r, c) not in seen:
                    islands += 1
                    seen.add((r, c))
                    queue = deque([(r, c)])
                    while queue:
                        cr, cc = queue.popleft()
                        # four neighbours of cell
                        for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                                # mark on push, ensuring no cell is queued twice
                                seen.add((nr, nc))
                                queue.append((nr, nc))
        return islands

print(Solution().numIslands([["1", "1", "0"], ["0", "0", "1"]]))   # 2
```

Habits that make Python solutions short and correct:

- **Sentinels**: `float("inf")` / `math.inf` and `-math.inf` for best-so-far values. There's no `INT_MAX`; `sys.maxsize` exists but is rarely needed.
- **Memoised recursion**: `@functools.cache` (3.9; `@lru_cache(maxsize=None)` before that) on a nested function turns recursion into top-down DP. Arguments must be hashable, so pass tuples, not lists. See [Dynamic programming](/learn/dynamic-programming).
- **Recursion depth**: the default limit is about 1000 frames, so a DFS down a 10⁵-node path raises `RecursionError`. `sys.setrecursionlimit(10**6)` raises the limit but deep native recursion can still crash the process; an explicit stack is safer.
- **Heaps** are min-heaps: negate for max, push tuples for priority (see above).
- **Counting**: `Counter(s)`, `defaultdict(int)`, or `cnt[x] = cnt.get(x, 0) + 1`.
- **Grids**: build with `[[0] * cols for _ in range(rows)]`, never `[[0] * cols] * rows`.
- **Strings**: build with a list and `"".join`; `s[::-1]` reverses; `s.isdigit()`, `s.isalpha()`, `s.isalnum()` classify characters.
- **Sorting**: `intervals.sort(key=lambda iv: iv[0])`, or rely on tuple order with `sort()` alone.
- **Matrix copy**: `[row[:] for row in grid]` (shallow per row) or `copy.deepcopy`.

```python
from functools import cache

def min_coins(coins: list[int], amount: int) -> int:
    @cache
    def best(rest: int) -> float:
        # 0 left = done; negative = overshot
        if rest == 0:
            return 0
        if rest < 0:
            return float("inf")
        return 1 + min(best(rest - c) for c in coins)
    ans = best(amount)
    # inf = unreachable amount
    return -1 if ans == float("inf") else ans

print(min_coins([1, 5, 11], 15), min_coins([2], 3))   # 3 -1
```

## Performance and the GIL

- **Lean on built-ins.** `sum(xs)`, `max`, `sorted`, `set` operations, `str.join`, `collections` and comprehensions run in C. A hand-written loop doing the same work can be several times slower.
- **Mind hidden costs**: `x in list` is O(n) (use a set), `list.pop(0)` and `insert(0, x)` are O(n) (use a deque), slicing copies, and `s += t` on strings may copy.
- **Local names are faster** than globals or attribute lookups in hot loops; that's why judges' fast solutions sometimes do `append = out.append`.
- **Fast input** for competitive programming: `import sys; data = sys.stdin.buffer.read().split()` instead of calling `input()` per line.
- **Profile** with `python3 -m cProfile -s cumtime script.py` or `timeit` before optimising.
- For numeric work, use **NumPy** (vectorised C), and PyPy (a JIT-compiled interpreter) for pure-Python speed-ups.

CPython has a **Global Interpreter Lock (GIL)**: only one thread executes Python bytecode at a time. Threads still help for I/O-bound work (network calls, disk), since the lock is released while waiting, but CPU-bound work needs `multiprocessing` or `concurrent.futures.ProcessPoolExecutor` to use several cores. `asyncio` gives single-threaded concurrency for many simultaneous I/O tasks. A free-threaded build without the GIL became experimental in 3.13 and officially supported (still optional, not the default) in 3.14. More in [Concurrency](/learn/concurrency).

## Coming from Java, C++ or JavaScript

| You expect (from) | Python does | Do this |
| --- | --- | --- |
| `b = a` copies a value or struct (C++) | binds another name to the same object | `a.copy()`, `a[:]`, `copy.deepcopy(a)` |
| `==` compares references (Java objects) | `==` compares values; `is` compares identity | `==` for values, `is` only for `None` and other singletons |
| `[[0]*n]*m` / `new int[m][n]` makes a grid | `*` repeats a reference to one inner list | `[[0] * n for _ in range(m)]` |
| `-7 / 2 == -3` (Java/C++ ints) and `-7 % 2 == -1` (all three) | `/` gives `-3.5`, `//` floors to `-4`, `%` gives `1` | `int(a / b)` or `math.fmod` for C semantics |
| ints overflow at 32/64 bits | ints are unbounded | mask with `& 0xFFFFFFFF` if a problem expects wraparound |
| block scope (`let`, C++ braces) | function scope; loop variables survive the loop | keep functions small; don't reuse names |
| closures in a loop capture the current value (JS `let`) | closures see the variable's last value | bind with a default arg: `lambda i=i: i` |
| `x is y` is like `===` (JS) | `is` checks identity; small ints (−5 to 256) are cached, so equal ints above 256 may not be `is`-identical | never use `is` for numbers or strings |
| `sort()` returns the array (JS) | `list.sort()` returns `None` | `sorted(lst)` for a new list |
| `arr.length`, `.size()` | `len(x)` is a built-in function | `len(x)` |
| `null` / `undefined` | one `None` | `if x is None:` |
| empty array is truthy (JS) | empty containers are falsy | `if items:` |
| `for (int i = 0; ...)` | iterate items directly | `enumerate`, `zip`, `range` |
| `list`, `sum`, `max` are free names | they're built-ins you can shadow (`list = [...]` breaks `list()` later) | name variables `nums`, `total`, `best` |
| `private` fields | conventions only (`_x`) | trust the convention; use `@property` when needed |
| `switch` falls through | `match` (3.10) never falls through and destructures | `case "a" \| "b":` for shared cases |
| method overloading | one function per name | default and keyword arguments |
| `const` | no constants; `UPPER_CASE` names are a convention | `typing.Final` for type checkers |
| string `charAt` returns a char | indexing returns a 1-character string | `ord(c)` / `chr(n)` for code points |

Two more that bite in practice:

- **Modifying a list or dict while iterating it** skips elements or raises `RuntimeError`. Iterate over a copy (`for k in list(d):`) or build a new collection.
- **Mutable objects as default values or class attributes** are shared. `class C: items = []` gives every instance the same list; create per-instance state in `__init__`.

For the full set of traps, with explanations, see [Language gotchas](/learn/language-gotchas).
