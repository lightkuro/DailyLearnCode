---
title: Language gotchas
summary: The traps interviewers love: Python defaults and closures, Java equality and overflow, C++ undefined behaviour, floating point, text encoding, time zones and JavaScript coercion.
related: os-memory, concurrency, bit-manipulation, hashing
terms:
  - mutable default argument #mutable-default-arguments
  - late binding #late-binding-closures
  - shallow copy #shallow-vs-deep-copy
  - deep copy #shallow-vs-deep-copy
  - Integer caching #integer-caching
  - integer overflow #integer-overflow
  - hashCode #equals-and-hashcode
  - ConcurrentModificationException #concurrentmodificationexception
  - undefined behaviour #undefined-behaviour
  - undefined behavior #undefined-behaviour
  - iterator invalidation #iterator-invalidation
  - dangling reference #dangling-references
  - floating point #floating-point
  - UTF-8 #text-encoding
  - daylight saving time #time-and-time-zones
  - Rust ownership #rust-ownership-and-moves
  - borrow checker #rust-ownership-and-moves
  - use after move #rust-ownership-and-moves
  - map iteration order #map-iteration-order-is-random
  - full slice expression #append-and-shared-backing-arrays
  - backing array #append-and-shared-backing-arrays
---

## Why gotchas matter

Most language gotchas come from a gap between what code *looks* like it does and what the language actually specifies. They're popular quiz and interview questions because they test whether you know the model underneath: references versus values, when expressions are evaluated, how numbers and text are stored. Each section below gives the trap, why it happens, and the fix.

## Python

### Mutable default arguments

Default values are evaluated **once, when the `def` runs**, not on every call. A mutable default (a list, dict or set) is therefore shared by every call that doesn't pass the argument:

```python
def add_item(item, items=[]):      # the default list is created once, at def time
    items.append(item)
    return items

print(add_item("a"))   # ['a']
print(add_item("b"))   # ['a', 'b']  (same list as last call)

def add_item(item, items=None):    # fix: use None as the "not given" marker
    if items is None:
        items = []
    items.append(item)
    return items
```

The same applies to `def f(when=datetime.now())`: the time is fixed when the module loads.

### Late-binding closures

A closure looks up the variables it uses **when it runs**, not when it's created. Every lambda below shares the comprehension's single `i`, which ends at 2:

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])        # [2, 2, 2]: each lambda looks up i when called

funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])        # [0, 1, 2]: the default captures the current value
```

`functools.partial` also binds the value immediately. JavaScript has the same bug with `var` in a loop (`let` creates a fresh binding per iteration); C++ makes you choose explicitly with `[i]` (copy) or `[&i]` (reference).

### is vs ==

`==` compares **values** (it calls `__eq__`); `is` compares **identity** (the same object in memory). Use `is` only for singletons such as `None`:

```python
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b, a is b)    # True False: equal values, different objects

x = 1000
y = int("1000")
print(x == y, x is y)    # True False (small ints -5..256 are cached, so `is` "works" for them by accident)
```

CPython caches small integers and interns some strings, so `is` can appear to work in a quick test and then fail on real data.

### Shallow vs deep copy

Assignment never copies in Python; it binds another name to the same object. A **shallow copy** (`list(x)`, `x[:]`, `x.copy()`, `copy.copy(x)`) makes a new outer container that holds the *same* inner objects. A **deep copy** (`copy.deepcopy`) recursively copies everything.

The most common version of this bug is building a grid with `*`:

```python
import copy

grid = [[0] * 3] * 2        # two references to ONE inner list
grid[0][0] = 1
print(grid)                 # [[1, 0, 0], [1, 0, 0]]

grid = [[0] * 3 for _ in range(2)]   # a new inner list per row
grid[0][0] = 1
print(grid)                 # [[1, 0, 0], [0, 0, 0]]

orig = {"tags": ["a"]}
shallow = copy.copy(orig)   # new dict, same inner list
deep = copy.deepcopy(orig)  # new dict and new list
orig["tags"].append("b")
print(shallow["tags"], deep["tags"])   # ['a', 'b'] ['a']
```

```diagram
{"type":"flow","nodes":[{"id":"r0","label":"grid[0]","kind":"box","col":0,"row":0},{"id":"r1","label":"grid[1]","kind":"box","col":0,"row":1},{"id":"inner","label":"[1, 0, 0]","sub":"one list object","kind":"box","col":2,"row":0.5,"highlight":true}],"edges":[{"from":"r0","to":"inner"},{"from":"r1","to":"inner"}],"caption":"[[0] * 3] * 2 repeats the reference, not the list: both rows are the same object, so writing grid[0][0] changes both."}
```

`[0] * 3` is fine because integers are immutable; the problem only appears when the repeated element is mutable.

One more Python trap: **don't modify a collection while looping over it**. Removing from a list mid-loop silently skips elements (removing the 2s from `[1, 2, 2, 3]` this way leaves `[1, 2, 3]`), and changing a dict's size raises `RuntimeError`. Build a new list with a comprehension, or loop over a copy.

## Java

### == vs equals

For objects, `==` compares **references** (is it the same object?) and `.equals()` compares **contents**. Strings are objects:

```java
String a = "hello";
String b = new String("hello");
System.out.println(a == b);          // false: different objects
System.out.println(a.equals(b));     // true: same characters
```

Buggy `==` code often passes tests, because identical string literals are interned into one shared object (`"a" == "a"` is `true`). Strings built at runtime, read from input or returned by methods usually aren't. Always use `equals`, or `Objects.equals(a, b)` when either may be `null`.

### Integer caching

Autoboxing turns an `int` into an `Integer` via `Integer.valueOf`, which returns cached objects for values from **-128 to 127**. Outside that range each boxing creates a new object, so `==` suddenly starts failing:

```java
Integer i = 127, j = 127;
System.out.println(i == j);          // true: -128..127 are cached
Integer m = 128, n = 128;
System.out.println(m == n);          // false: two different Integer objects
System.out.println(m.equals(n));     // true
```

This bites in code like `map.get(a) == map.get(b)` on a `Map<String, Integer>`: it works in tests with small counts and fails in production. A related trap: unboxing `null` throws `NullPointerException`, as in `int c = map.get("missing");`.

### Integer overflow

Java's `int` is 32 bits and **wraps around silently**: `Integer.MAX_VALUE + 1` is `-2147483648`. The classic victim is the binary-search midpoint:

```java
int lo = 2_000_000_000, hi = 2_100_000_000;
System.out.println((lo + hi) / 2);       // -97483648: lo + hi overflowed
System.out.println(lo + (hi - lo) / 2);  // 2050000000
long ok = (long) Integer.MAX_VALUE + 1;  // widen *before* the operation
Math.addExact(Integer.MAX_VALUE, 1);     // throws ArithmeticException instead of wrapping
```

Watch for products like `a * b` that exceed 2³¹ (cast one side to `long` first). Python integers never overflow (they grow as needed), though NumPy's fixed-size integers do. In C++, signed overflow is undefined behaviour, which is worse (see below).

### equals and hashCode

The contract: **if `a.equals(b)`, then `a.hashCode() == b.hashCode()`**. Hash-based collections first use the hash to pick a bucket and only then call `equals`. Override `equals` without `hashCode` and two equal objects get different identity-based hashes, so a `HashSet` can't find the one you stored:

```java
static final class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof Point p && x == p.x && y == p.y;
    }
    // Missing: @Override public int hashCode() { return Objects.hash(x, y); }
}

Set<Point> s = new HashSet<>();
s.add(new Point(1, 2));
System.out.println(s.contains(new Point(1, 2)));   // false without hashCode, true with it
```

```diagram
{"type":"buckets","buckets":[[],["Point(1,2)"],[],[]],"highlight":[[1,0]],"caption":"Without hashCode, each Point hashes by identity: the stored point sits in bucket 1, but the equal lookup copy hashes to bucket 3, which is empty."}
```

Records (`record Point(int x, int y) {}`) generate both methods correctly. And never mutate a field that `hashCode` uses while the object is a key in a map: it stays in its old bucket and becomes unreachable. Python has the same rule for `__eq__` and `__hash__` (defining `__eq__` alone makes instances unhashable).

### ConcurrentModificationException

Modifying a collection while iterating over it with a for-each loop usually throws `ConcurrentModificationException`, even with a single thread. The iterator notices the collection changed underneath it:

```java
List<Integer> nums = new ArrayList<>(List.of(1, 2, 3, 4));
for (Integer x : nums) if (x % 2 == 0) nums.remove(x);   // throws ConcurrentModificationException

nums.removeIf(x -> x % 2 == 0);                          // fix 1: removeIf

for (Iterator<Integer> it = nums.iterator(); it.hasNext(); )
    if (it.next() % 2 == 0) it.remove();                 // fix 2: the iterator's own remove()
```

The check is best-effort ("fail-fast"), not a thread-safety mechanism; for sharing between threads use concurrent collections (see [Concurrency](/learn/concurrency)).

## C++

### Undefined behaviour

**Undefined behaviour (UB)** is any operation the C++ standard places no requirements on: signed integer overflow, reading out of bounds, dereferencing null or a dangling pointer, using an uninitialised variable, a data race. The program may crash, appear to work, or do something bizarre, and it can change between compilers and optimisation levels.

The surprising part is that **optimisers assume UB never happens** and reason from that:

```cpp
bool willOverflow(int x) { return x + 1 < x; }   // signed overflow is UB, so the compiler
                                                 // may compile this to "return false"
```

GCC returns `false` for `willOverflow(INT_MAX)`. Check before the operation instead (`x == INT_MAX`), or use `__builtin_add_overflow`. Unsigned arithmetic, by contrast, is defined to wrap. Compile tests with `-Wall -Wextra -fsanitize=address,undefined` to catch most UB at runtime.

### Iterator invalidation

Changing a container can **invalidate** iterators, pointers and references into it. A `vector` that grows past its capacity moves to a new buffer; erasing an element invalidates iterators at and after it. Erasing inside a loop is the classic bug:

```cpp
vector<int> v = {1, 2, 3, 4, 5, 6};
for (auto it = v.begin(); it != v.end(); ) {
    if (*it % 2 == 0) it = v.erase(it);   // erase returns the next valid iterator
    else ++it;
}
// C++20: erase_if(v, [](int x) { return x % 2 == 0; });
```

Rules of thumb: for `vector`, any insertion may invalidate everything if it reallocates (`reserve` up front if you need stable pointers); for `unordered_map`, a rehash invalidates iterators but not references to elements; `list` and `map` iterators stay valid except for erased elements.

### Dangling references

A **dangling reference** (or pointer) refers to an object that no longer exists. Common sources: returning a reference to a local variable, keeping a `string_view` to a temporary string, and holding a reference into a vector across a `push_back`:

```cpp
vector<int> v = {1, 2, 3};
int& first = v[0];        // a reference into the vector's buffer
v.push_back(4);           // may reallocate: the old buffer is freed
cout << first << "\n";    // undefined behaviour: `first` may now dangle
```

AddressSanitizer reports this as a heap-use-after-free. Rust's borrow checker exists largely to rule this class of bug out at compile time.

### Signed and unsigned comparison

`size()` returns an **unsigned** `size_t`. Mixing signed and unsigned values converts the signed one to unsigned, so `-1` becomes a huge positive number:

```cpp
vector<int> empty;
cout << empty.size() - 1 << "\n";      // 18446744073709551615, not -1
int neg = -1;
unsigned int zero = 0;
cout << (neg < zero) << "\n";           // 0 (false): -1 converts to 4294967295
for (size_t i = 0; i < empty.size() - 1; i++) { }   // runs ~forever: the bound is huge
```

Write `i + 1 < v.size()`, cast `size()` to a signed type, or use C++20's `std::ssize` and `std::cmp_less`. Turn on `-Wsign-compare` (part of `-Wall` for C++).

## Floating point

`float` and `double` are binary fractions (IEEE 754). Most decimal fractions, including 0.1, have no exact binary representation, so they're stored as the nearest representable value and small errors accumulate:

```text
0.1 + 0.2          ->  0.30000000000000004   (Python, Java, C++ and JavaScript alike)
0.1 + 0.2 == 0.3   ->  false
```

- **Compare with a tolerance**, not `==`: `math.isclose(a, b)` in Python, or `abs(a - b) <= 1e-9 * max(abs(a), abs(b))` by hand. A relative tolerance scales with the numbers; an absolute one is for values near zero.
- **Money is not a float.** Store integer cents (or the smallest unit), or use a decimal type: Python's `Decimal("0.1")`, Java's `BigDecimal`. Construct decimals from strings: `new BigDecimal(0.1)` captures the binary error (0.1000000000000000055511151231257827…), and `BigDecimal.equals` treats `2.0` and `2.00` as different (use `compareTo`).
- **NaN is not equal to itself**: `NaN == NaN` is false, which breaks sorting and lookups. Test with `math.isnan` / `Double.isNaN`.
- **Large values lose precision.** A `double` has 53 bits of mantissa, so above 2⁵³ (about 9 × 10¹⁵) not every integer is representable. That's why big IDs in JSON should be strings: JavaScript numbers are doubles.

Integer division and rounding also differ between languages:

| Expression | Python | Java | C++ | JavaScript |
|---|---|---|---|---|
| `-7 / 2` (integers) | `-3.5` (`-7 // 2` is `-4`, it floors) | `-3` (truncates) | `-3` (truncates) | `-3.5` |
| `-7 % 2` | `1` | `-1` | `-1` | `-1` |
| round 2.5 | `round(2.5)` is `2` (half to even) | `Math.round` gives `3` | `std::round` gives `3` | `Math.round` gives `3` |
| round -2.5 | `-2` | `-2` (half up) | `-3` (half away from zero) | `-2` |

## Text encoding

Text has three layers that are easy to confuse:

- **Bytes**: what's stored on disk and sent over the network.
- **Code points**: Unicode's numbered characters (U+00E9 is é, U+1F600 is 😀).
- **Grapheme clusters**: what a user sees as one character, which can be several code points (an emoji with a skin tone, or `e` followed by a combining accent).

An **encoding** maps code points to bytes. **UTF-8** is the standard on the web and in most files: 1 byte for ASCII, 2 to 4 bytes for everything else, and plain ASCII text is already valid UTF-8.

```diagram
{"type":"array","rows":[{"label":"characters","values":["h","é","l","l","o"],"highlight":[1]},{"label":"UTF-8 bytes","values":["68","C3","A9","6C","6C","6F"],"highlight":[1,2]}],"indices":false,"caption":"\"héllo\" is 5 characters but 6 bytes in UTF-8: é (U+00E9) takes two bytes, C3 A9."}
```

What "length" means depends on the language:

| | `"é"` | `"😀"` |
|---|---|---|
| Python `len(str)` (code points) | 1 | 1 |
| Java / JavaScript `.length` (UTF-16 units) | 1 | 2 |
| C++ `std::string::size()` (bytes, UTF-8 source) | 2 | 4 |

Gotchas that follow:

- **Always name the encoding** when converting between bytes and text: `open(path, encoding="utf-8")`, `new String(bytes, StandardCharsets.UTF_8)`. Defaults have historically depended on the operating system (Java only switched its default to UTF-8 in JDK 18).
- **Mojibake** is decoding with the wrong encoding: UTF-8 `é` read as Windows-1252 shows up as `Ã©`.
- **Normalise before comparing**: `é` can be one code point or two (`e` + U+0301), which look identical but aren't equal until both are normalised (NFC).
- **Byte limits cut characters.** Truncating a UTF-8 string to N bytes can split a character; a `VARCHAR(10)` may count bytes or characters depending on the database. MySQL's legacy `utf8` stores at most 3 bytes per character and can't hold emoji; use `utf8mb4`.
- Reversing or slicing Java and JavaScript strings by index can split an emoji's surrogate pair.

## Time and time zones

- **Store and compute in UTC.** Record instants (when something happened) as UTC timestamps, and convert to local time only for display. Send ISO 8601 with an offset in APIs: `2026-11-06T14:30:00Z`.
- **A time zone is not an offset.** `America/New_York` is a set of rules: UTC−5 in winter, UTC−4 in summer. For future local events (a meeting at 9:00 New York time next July), store the local time *and* the zone ID, because governments change DST rules.
- **Daylight saving time** creates gaps and overlaps. In New York on 8 March 2026, clocks jump from 02:00 to 03:00, so 02:30 doesn't exist; on 1 November 2026, 01:30 happens twice. A day can be 23 or 25 hours long, so "add one day" and "add 24 hours" differ.
- **Use a monotonic clock for durations and timeouts** (`time.monotonic()`, `System.nanoTime()`, `std::chrono::steady_clock`). The wall clock can jump backwards when NTP corrects it.

Python adds a `timedelta` to an aware datetime on the wall clock, which walks straight into a DST gap:

```python
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ny = ZoneInfo("America/New_York")
start = datetime(2026, 3, 8, 1, 30, tzinfo=ny)    # 30 minutes before clocks jump forward
print(start + timedelta(hours=1))                  # 2026-03-08 02:30:00-05:00: doesn't exist
print((start.astimezone(timezone.utc) + timedelta(hours=1)).astimezone(ny))
                                                   # 2026-03-08 03:30:00-04:00: correct
```

More traps: Python's naive datetimes have no zone at all (and `datetime.utcnow()`, deprecated since 3.12, returns a naive one; use `datetime.now(timezone.utc)`); Java's old `Date` and `Calendar` are mutable and confusing, so use `java.time` (`Instant`, `ZonedDateTime`); JavaScript's `Date` months start at 0, so `new Date(2026, 0, 1)` is 1 January.

## JavaScript: coercion and this

JavaScript's `==` converts operands to a common type before comparing, following rules few people remember. `===` compares without conversion; use it everywhere (the one common exception is `x == null`, which matches both `null` and `undefined`).

```text
0 == ""             // true   ("" converts to 0)
"0" == 0            // true   ("0" converts to 0)
"" == "0"           // false  (both strings, compared as strings)
null == undefined   // true, but null == 0 is false
NaN == NaN          // false  (use Number.isNaN)
[] == false         // true
typeof null         // "object"
[10, 9, 1].sort()   // [1, 10, 9]: the default sort compares as strings
```

`this` is set by **how a function is called**, not where it's defined. Called as `obj.method()`, `this` is `obj`; the same function called on its own loses it:

```text
const counter = {
  count: 0,
  increment() { this.count++; return this.count; },
};
counter.increment();                     // 1: this === counter
const inc = counter.increment;
inc();                                   // TypeError in strict mode (modules, classes): this is undefined
const bound = counter.increment.bind(counter);
bound();                                 // 2
```

This bites when passing methods as callbacks: `setTimeout(this.tick, 1000)` or `button.addEventListener("click", this.onClick)`. Fix it with `.bind(this)` or an arrow function, `() => this.tick()`. **Arrow functions** don't have their own `this`; they use the one from the surrounding code, which is exactly what callbacks inside methods want (and why arrow functions make poor object methods).

## Go

### Map iteration order is random

Ranging over a Go map visits the keys in a different order from run to run, and even between two loops over the same unchanged map in one run. That's **on purpose**: since Go 1.0 the runtime picks a random starting point for every `range` over a map, so code can't quietly depend on an order the implementation never promised. (Python's `dict` keeps insertion order; Java's `HashMap` order is unspecified but usually stable between runs, so bugs that depend on it hide until an upgrade. Go makes them show up at once.)

```go
ages := map[string]int{"ann": 31, "bob": 25, "cy": 40, "dee": 19}

// order changes between runs, e.g. "bob cy dee ann"
for name := range ages {
	fmt.Print(name, " ")
}

// deterministic order: sort keys first (Go 1.23+)
for _, name := range slices.Sorted(maps.Keys(ages)) {
	fmt.Print(name, "=", ages[name], " ")
}
```

Where it bites: tests comparing output built by ranging over a map (flaky, as in [flaky tests](/learn/testing-debugging#flaky-tests)); "first match" logic that picks a different winner each run; and output that must be reproducible, such as generated files, cache keys or signatures. Sort the keys, or keep a slice alongside the map for insertion order. Two things *are* sorted: `fmt.Println` of a map (since Go 1.12) and `encoding/json`'s output, so printing a map can hide the problem.

### append and shared backing arrays

A Go slice is a small header: a pointer into a **backing array**, a length and a capacity. `append` writes into the existing array whenever there's spare capacity, and only allocates a new array (copying the elements) when there isn't. So two slices appended from the same base can share memory and overwrite each other:

```go
base := make([]int, 3, 10)  // len 3, cap 10

// both write index 3 of base's backing array
a := append(base, 1)
b := append(base, 2)
fmt.Println(a[3], b[3])     // 2 2: b's append clobbered a

// full slice expression caps capacity at len, so append must copy
safe := base[:len(base):len(base)]
c := append(safe, 1)
d := append(safe, 2)
fmt.Println(c[3], d[3])     // 1 2
```

Step by step: `a := append(base, 1)` finds capacity 10 > length 3, writes `1` into slot 3 of the shared array and returns a header with length 4. `b := append(base, 2)` starts from the same `base` (still length 3), so it writes `2` into the same slot 3. `a` and `b` now both see 2. With no spare capacity the bug disappears, which is why it's intermittent: it depends on how much capacity the base happened to have after earlier appends (which grow it by roughly doubling).

The fixes:

- The **full slice expression** `s[low:high:max]` sets capacity to `max - low`; `s[:len(s):len(s)]` leaves no spare room, so the next `append` must copy.
- **Copy explicitly**: `slices.Clone(s)` (Go 1.21+) or `append([]int(nil), s...)`, then append to the copy.
- Use `x = append(x, ...)` assigned back to the *same* variable, and never keep using the old slice after appending.

It shows up in backtracking problems written in Go: `res = append(res, path)` stores a slice that later appends and truncations of `path` keep modifying, so every saved answer ends up the same. Save `slices.Clone(path)` instead (the same aliasing bug as `res.append(path)` in Python; see [recursion & backtracking](/learn/recursion-backtracking)).

## Rust: ownership and moves

Rust has no garbage collector and no manual `free`. Instead every value has exactly one **owner**, and the value is dropped (freed) when its owner goes out of scope. The compiler enforces the rules, so use-after-free and double free become compile errors instead of the [dangling references](/learn/language-gotchas#dangling-references) C++ gets.

- **Move**: assigning a heap-owning value (`String`, `Vec`, `Box`) or passing it by value **moves** it. The new variable owns it and the old one can't be used any more. No data is copied, only the pointer, length and capacity. Using the old variable is error E0382, "use of moved value". Python and Java would quietly share one object here; C++ would deep-copy it unless you write `std::move`, and a moved-from C++ object is still usable (in an unspecified state).
- **Copy**: small plain values (integers, `bool`, `char`, tuples of them) implement `Copy` and are duplicated instead of moved, so both variables stay valid.
- **Clone**: when you really need two independent owners, call `.clone()` and pay for the copy explicitly.
- **Borrow**: `&x` lends the value without moving it, and `&mut x` lends it for writing. At any moment you can have **many shared borrows or one mutable borrow**, never both, and no borrow may outlive the owner. That's how the borrow checker rules out iterator invalidation and data races.

```rust
fn total_len(words: &[String]) -> usize {     // borrows: the caller keeps ownership
    words.iter().map(|w| w.len()).sum()
}

fn consume(words: Vec<String>) -> usize {      // takes ownership; freed when it returns
    words.len()
}

fn main() {
    let a = vec![String::from("hi"), String::from("there")];
    let n = total_len(&a);       // lend it: `a` is still usable afterwards
    let b = a;                   // move: `b` owns the vector now, `a` is invalid
    // println!("{}", a.len());  // error[E0382]: borrow of moved value: `a`
    let c = b.clone();           // an explicit deep copy when you need two owners
    println!("{} {} {}", n, consume(b), c.len());
    // consume(b);               // error[E0382]: use of moved value: `b`
}
```

The gotchas: a value moved into a function or a loop body (`for w in words` consumes `words`; iterate `&words` to keep it), a `move` closure that takes ownership of what it captures, and fighting the borrow checker by cloning everything, which compiles but quietly copies data. When ownership really must be shared, use reference counting explicitly: `Rc` (one thread) or `Arc` (several threads).

## Interview questions and pitfalls

- *"What does `[lambda: i for i in range(3)]` return when called?"* `[2, 2, 2]`: late binding. Fix with a default argument.
- *"Why is `Integer a = 128, b = 128; a == b` false?"* Reference comparison outside the -128..127 cache.
- *"What must hold between `equals` and `hashCode`?"* Equal objects must have equal hash codes.
- *"Is `x + 1 < x` a good overflow check in C++?"* No: signed overflow is undefined, so the compiler may delete the check.
- *"How should you store prices?"* Integer cents or a decimal type, never binary floats.
- *"How many bytes is `"é"`?"* One code point, two bytes in UTF-8, one UTF-16 unit.
- *"How should you store timestamps?"* UTC instants; local time plus zone ID only for future local events.
- Pitfalls: `is` for value comparison, `[[0] * n] * m` grids, `==` on Java strings and boxed integers, erasing inside a C++ loop without using the returned iterator, `size() - 1` on an empty vector, and `==` in JavaScript.
