---
title: C++ crash course
summary: Modern C++ for programmers who already know another language: build flags, value semantics, references, RAII and smart pointers, the STL, algorithms, lambdas and the idioms LeetCode solutions use.
related: language-gotchas, os-memory, hashing, heaps, binary-search, sorting, concurrency
terms:
  - value semantics #copies-by-default
  - const reference #references-and-const-references
  - const references #references-and-const-references
  - move semantics #moving-instead-of-copying
  - unique_ptr #uniqueptr-and-sharedptr
  - shared_ptr #uniqueptr-and-sharedptr
  - string_view #strings
  - structured bindings #pair-tuple-and-structured-bindings
  - lambda capture #lambdas-and-captures
  - rule of zero #rule-of-zero
  - AddressSanitizer #compiler-flags-worth-always-using
---

## How C++ differs

C++ looks familiar if you know Java or JavaScript: braces, semicolons, `for (int i = 0; i < n; i++)`, classes. The syntax is the easy part. What actually trips up experienced programmers is the model underneath:

- **Objects are values.** `a = b` copies the whole object, including every element of a vector. Passing an argument by value copies it too. There's no hidden "everything is a reference" layer as in Python, Java and JavaScript.
- **No garbage collector.** Every object has an exact lifetime. Locals die at the closing brace, and their destructors run right then. That's how memory, files and locks get released.
- **Undefined behaviour.** Reading past the end of an array or overflowing an `int` doesn't throw. The program may crash, print garbage or appear to work. You opt into checks with compiler flags.
- **Compiled, ahead of time, with no runtime safety net.** The compiler and its warnings are your first test suite.

This page targets **C++20**, which every current compiler supports well (GCC 13 and Clang 18 are fine). Where a feature needs C++17, C++20 or C++23 the text says so. The snippets assume the usual LeetCode setup: the standard headers are included and `using namespace std;` is in effect. In your own projects, prefer writing `std::` and including just the headers you use.

## Building and running

A complete program has one `main` function. This one reads numbers from standard input, sorts them and prints them:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums;
    int x;
    // reads until end of input or non-number
    while (std::cin >> x) nums.push_back(x);
    std::sort(nums.begin(), nums.end());
    for (int n : nums) std::cout << n << ' ';
    std::cout << '\n';
}
```

Compile and run it with GCC or Clang (`clang++` takes the same flags):

```bash
g++ -std=c++20 -O2 -Wall -Wextra -o sorter sorter.cpp
echo "3 1 2" | ./sorter          # 1 2 3

# while developing: debug info plus runtime checks
g++ -std=c++20 -g -O1 -Wall -Wextra -fsanitize=address,undefined -o sorter sorter.cpp
```

`main` may omit `return 0;`; it's the only function where falling off the end is allowed. Output goes through `std::cout << ...`, input through `std::cin >> ...`. C++20 added `std::format("{} + {}", a, b)` for Python-style formatting, and C++23 adds `std::println` (in GCC 14 and later; GCC 13 doesn't ship `<print>` yet).

### Compiler flags worth always using

| Flag | Why |
| --- | --- |
| `-std=c++20` | Pick the language version explicitly. Older compilers default to C++14 or C++17. |
| `-Wall -Wextra` | Warnings for uninitialised variables, signed/unsigned comparisons, unused results and more. Treat each one as a bug report. |
| `-O2` | Optimise. Unoptimised C++ can be several times slower, and some warnings only fire with optimisation on. |
| `-g` | Debug symbols, so `gdb`/`lldb` and sanitizer reports show file and line. |
| `-fsanitize=address,undefined` | **AddressSanitizer** catches out-of-bounds access, use-after-free and leaks; UBSan catches signed overflow, bad shifts and null dereferences. Roughly 2x slower, so use them in tests, not production builds. |
| `-D_GLIBCXX_DEBUG` | GCC's checked standard library: `v[i]` out of range and invalid iterators abort with a message. Debug only. |

Two habits pay off immediately: compile with sanitizers whenever a program misbehaves, and don't ignore a warning you don't understand.

### Headers, sources and the one-definition rule

C++ compiles each `.cpp` file separately, then links the results. To call a function defined in another file, the compiler only needs its **declaration** (`int area(int w, int h);`), which lives in a header (`.h` or `.hpp`) that you `#include`. `#include` is literal text pasting, which is why headers start with `#pragma once` (or include guards) to avoid being pasted twice.

The **one-definition rule** says each function or global variable is *defined* exactly once across the whole program. Defining a normal function in a header that two `.cpp` files include gives a "multiple definition" link error. Mark it `inline`, or keep only the declaration in the header and the body in one `.cpp`. Templates and class bodies are the exception: they live entirely in headers. C++20 modules (`import std;` in C++23) aim to replace this textual model, but build-tool support is still patchy.

Real projects describe their build with **CMake**, which generates Makefiles or Ninja files and handles headers, libraries and flags. For interview practice and single files, plain `g++` is all you need.

## Values, references and pointers

### Copies by default

C++ has **value semantics**: a variable *is* the object, not a handle to one. Assignment and pass-by-value make an independent copy.

```cpp
vector<int> a = {1, 2, 3};
// full copy (new buffer, 3 elements copied)
vector<int> b = a;
b.push_back(4);
// a still {1, 2, 3}, b is {1, 2, 3, 4}
cout << a.size() << ' ' << b.size() << '\n';   // 3 4
```

The same is true for `string`, `map`, your own structs and everything else. In Python or Java the equivalent code would make `a` and `b` two names for one list. The copy is what you usually want for correctness, and the cost is what you need to watch: passing a `vector<vector<int>>` by value to a recursive function copies the whole grid on every call.

### References and const references

A **reference** (`T&`) is an alias: another name for an existing object. It must be bound when created and can never be re-pointed. Use one to let a function modify the caller's object, or to avoid a copy:

```cpp
// modifies caller's vector
void addOne(vector<int>& v) {
    for (int& x : v) x++;
}

// reads without copying; caller's vector can't be changed
long long total(const vector<int>& v) {
    long long sum = 0;
    for (int x : v) sum += x;
    return sum;
}
```

The rule of thumb for parameters:

- **Small types** (`int`, `double`, `char`, `bool`, pointers, iterators): pass by value.
- **Inputs that are large** (`string`, `vector`, maps, your structs): pass by **const reference**, `const T&`. No copy, and the compiler stops you from modifying it. A `const T&` also binds to temporaries, so `total({1, 2, 3})` works.
- **Outputs or in-place updates**: pass by non-const reference, `T&`.

Return by value. Returning a local `vector` or `string` doesn't copy it: the compiler either builds it straight in the caller's variable (copy elision, guaranteed in many cases since C++17) or moves it. Never return a reference to a local; it dies when the function returns.

### Pointers

A **pointer** (`T*`) holds an address. Unlike a reference it can be null (`nullptr`), can be re-pointed, and needs `*p` or `p->member` to reach the object. `&x` takes the address of `x`.

```cpp
int x = 5;
int* p = &x;
*p = 7;              // x is now 7
p = nullptr;         // re-pointing is fine; references can't do this
```

In modern C++ you still meet raw pointers in three places: optional "may be missing" links in data structures (LeetCode's `TreeNode*` and `ListNode*`), non-owning parameters that may be null, and C APIs. A raw pointer should never *own* memory; that's what the smart pointers below are for.

### auto

`auto` deduces a variable's type from its initialiser, like `var` in Java or `let` in JavaScript, but statically:

```cpp
map<string, vector<int>> index;
auto it = index.find("key");     // map<string, vector<int>>::iterator
auto n = 10;                     // int
auto big = 10LL;                 // long long
```

`auto` drops references and top-level `const`, so `auto x = v[0];` is a copy. Write `auto&` or `const auto&` when you want to refer to the original. Use `auto` for long iterator and lambda types; spell the type out when it says something useful (`long long sum = 0;`).

### Moving instead of copying

C++11 added **move semantics**: an object that's about to die can hand over its internals (a vector's buffer, a string's characters) instead of having them copied. Temporaries are moved from automatically. For a named variable you no longer need, say so with `std::move`:

```cpp
vector<string> names;
string s = "a long name that would be expensive to copy";
// steals s's buffer; s is left valid but unspecified (in practice empty)
names.push_back(std::move(s));
```

`std::move` itself does nothing at runtime. It's a cast that marks the object as safe to steal from. After a move, only assign to the object or destroy it. Moving a `const` object silently copies, and `return std::move(local);` is worse than `return local;` because it blocks copy elision.

## Memory and RAII

### Stack, heap and destructors

Local variables live on the **stack** and are destroyed automatically at the end of their scope, in reverse order of creation. Containers like `vector` and `string` are small objects on the stack that own a buffer on the **heap**; their destructor frees it. There's no garbage collector and no finaliser that runs "eventually": destruction is deterministic. See [the stack and the heap](/learn/os-memory#the-stack-and-the-heap) for the underlying memory model.

That timing guarantee is the basis of **RAII** (resource acquisition is initialisation): wrap every resource in an object whose destructor releases it. Files close, mutexes unlock and memory is freed when the owning object goes out of scope, even if an exception is thrown.

```cpp
struct Tracer {
    string name;
    Tracer(string n) : name(n) { cout << "open " << name << '\n'; }
    ~Tracer() { cout << "close " << name << '\n'; }
};

void work() {
    Tracer a("a");
    {
        Tracer b("b");
    }   // close b
    cout << "working\n";
}   // close a
```

Calling `work()` prints `open a`, `open b`, `close b`, `working`, `close a`. Locks are the classic use: `lock_guard<mutex> g(m);` holds `m` until `g`'s scope ends (see [concurrency](/learn/concurrency)).

### unique_ptr and shared_ptr

When you genuinely need a heap object (a polymorphic type, a node in a tree you build, an object that must outlive its scope), hold it in a smart pointer from `<memory>`:

- **`unique_ptr<T>`**: sole owner. Can't be copied, only moved. Deletes the object when it dies. Zero overhead over a raw pointer. This is the default choice.
- **`shared_ptr<T>`**: shared ownership with a reference count; the last owner deletes the object. Costs an extra allocation and atomic count updates. Use it only when ownership is really shared. Cycles of `shared_ptr` leak; break them with `weak_ptr`.

```cpp
struct Node {
    int val;
    unique_ptr<Node> next;
};

// head owns whole list; destroying head frees every node
auto head = make_unique<Node>(1);
head->next = make_unique<Node>(2);

// counted owners
auto config = make_shared<string>("shared");
auto alias = config;
cout << config.use_count() << '\n';   // 2
```

Rules that keep C++ memory-safe in practice: never write `new` and `delete` yourself (use `make_unique` / `make_shared` or a container), let owners be values or smart pointers, and let everything else take references or raw non-owning pointers. LeetCode problems hand you raw `TreeNode*` and expect you to allocate with `new` and never free; that's a quirk of the judge, not a style to copy. One caveat for very deep `unique_ptr` chains: the destructor recurses once per node, so a million-node list can overflow the stack.

## Undefined behaviour you will hit

**Undefined behaviour** (UB) means the standard places no requirements on what happens. It's covered in depth in [language gotchas](/learn/language-gotchas#undefined-behaviour); these are the cases you'll actually trigger when writing C++ for the first time:

| Mistake | What happens | Fix |
| --- | --- | --- |
| `v[i]` with `i` out of range | No check: reads or corrupts neighbouring memory | `v.at(i)` throws `out_of_range`; or run with sanitizers / `-D_GLIBCXX_DEBUG` |
| `int` overflow (`a * b` near 2^31) | UB, not wraparound; the optimiser may assume it can't happen | Use `long long`, or cast before multiplying: `(long long)a * b` |
| `int x;` read before assignment | Garbage value (and UB) | Always initialise: `int x = 0;` or `int x{};` |
| Reference or pointer into a vector, then `push_back` | The vector may reallocate, leaving it dangling | Store indices, or `reserve` up front |
| Returning a reference to a local | Dangling reference | Return by value |
| `i < v.size() - 1` with an empty `v` | `size()` is unsigned, so `0 - 1` wraps to 2^64 - 1 | `i + 1 < v.size()`, or C++20 `std::ssize(v)` |
| Erasing from a container while iterating it | Iterator invalidation | `it = v.erase(it);`, or C++20 `erase_if(v, pred)` |
| `<=` in a `sort` comparator | Breaks strict weak ordering; `std::sort` can read out of bounds | Use `<` |
| Reading a `string_view` after its string dies | Dangling view | Keep the owning `string` alive |

Unsigned types wrap around by definition, which is why the `size()` bug is silent rather than UB. A loop written `for (int i = 0; i < (int)v.size() - 1; i++)` is the common workaround in contest code.

## Strings

`std::string` is a mutable, owning, contiguous sequence of `char` bytes. It behaves like a `vector<char>` with text methods: `s[i]`, `s.size()`, `s.push_back(c)`, `s += "more"`, `s.substr(pos, len)` (note: length, not end index), `s.find("x")` (returns `string::npos` when missing). Comparison with `==` and `<` compares contents, unlike Java.

```cpp
string s = "hello";
s[0] = 'H';                  // strings are mutable
s += ", world";
string part = s.substr(7, 5);    // "world" (start 7, length 5)
if (s.find("xyz") == string::npos) cout << "missing\n";

// chars are small integers
char c = 'e';
int idx = c - 'a';           // 4
char up = toupper(c);        // 'E' (cctype; arg should be unsigned char range)
char next = 'a' + 2;         // 'c'

// conversions
int n = stoi("42");          // throws invalid_argument if not number
string t = to_string(3.5);   // "3.500000" (6 decimals, before C++26)
cout << part << ' ' << idx << ' ' << up << next << ' ' << n << ' ' << t << '\n';
```

Points that surprise newcomers:

- A string literal like `"hi"` is a C array of `const char`, not a `std::string`. `"a" + "b"` doesn't compile (it's two pointers); `string("a") + "b"` or `"a"s + "b"` (with `using namespace std::literals`) does.
- `s += c` is amortised O(1), but `s = s + c` builds a new string each time, so a loop of them is O(n^2).
- `char` is one byte. UTF-8 text is a sequence of bytes, so `s.size()` counts bytes, not characters.
- C++20 adds `s.starts_with("ab")` and `s.ends_with("yz")`; C++23 adds `s.contains("mid")`.
- Splitting has no one-liner. Use `stringstream` for whitespace-separated words, or `getline(ss, part, ',')` for a delimiter.

**`std::string_view`** (C++17) is a non-owning (pointer, length) view into characters someone else owns. It's cheap to pass and to slice (`sv.substr` doesn't allocate), which makes it a good type for read-only string parameters. Because it doesn't own anything, never return one that points into a local string or a temporary.

## Containers cheat sheet

All of these are in the standard library (the STL). Complexities are for the operations you'll use most.

| Container | Like | Key operations and cost |
| --- | --- | --- |
| `vector<T>` | Python list, `ArrayList` | `push_back`/`pop_back` amortised O(1), `v[i]` O(1), insert/erase in middle O(n) |
| `array<T, N>` | fixed-size array | Size fixed at compile time, lives on the stack, `a[i]` O(1) |
| `deque<T>` | `ArrayDeque`, `collections.deque` | push/pop at both ends O(1), `d[i]` O(1) |
| `list<T>` | `LinkedList` | O(1) insert/erase at a known iterator; slow to traverse. Rarely the right choice |
| `unordered_map<K, V>` / `unordered_set<K>` | `dict`/`set`, `HashMap`/`HashSet` | find/insert/erase average O(1), worst O(n) |
| `map<K, V>` / `set<K>` | `TreeMap`/`TreeSet` | Sorted (red-black tree): find/insert/erase O(log n), ordered iteration, `lower_bound` |
| `multiset<K>` / `multimap<K, V>` | sorted bag | Like `set`/`map` but keeps duplicates |
| `priority_queue<T>` | `heapq`, `PriorityQueue` | **Max**-heap: `push`/`pop` O(log n), `top` O(1) |
| `stack<T>` / `queue<T>` | `Deque` as stack/queue | Adaptors over `deque`: `push`, `pop`, `top`/`front` |
| `pair<A, B>` / `tuple<...>` | tuple | Compared lexicographically; `first`/`second` or `get<i>` |

### vector

`vector` is the default container; reach for something else only when you need its specific operations. A few details matter in practice:

```cpp
vector<int> a(5);            // five zeros
vector<int> b(5, -1);        // five -1s
vector<int> c{5, -1};        // two elements, 5 and -1 (braces = list of values)
vector<vector<int>> grid(3, vector<int>(4, 0));   // 3 x 4 grid of zeros

a.reserve(100);              // capacity only; size stays 5
a.push_back(7);
a.emplace_back(8);           // constructs in place; same result for ints
int last = a.back();         // 8
a.pop_back();                // returns nothing; read back() first
cout << a.size() << ' ' << last << ' ' << c.size() << ' ' << grid[2].size() << '\n';   // 6 8 2 4
```

The `(5)` versus `{5}` difference is a common surprise: parentheses call a constructor with a count, braces list the elements. Also beware `vector<bool>`: it's a packed bit array, so `auto& x = flags[i]` doesn't compile and it's slower than `vector<char>` for hot loops.

### Maps and sets

`unordered_map` is a [hash table](/learn/hashing); `map` is a balanced binary search tree that keeps keys sorted. Prefer `unordered_map` for plain lookup, `map` when you need ordering, the smallest key, or "first key at least x".

```cpp
unordered_map<string, int> count;
for (string w : {"a", "b", "a"}) count[w]++;   // [] inserts 0 first if missing

// lookup without inserting
if (count.contains("c")) cout << "never\n";    // C++20; use count.count(k) or find before
auto it = count.find("a");
if (it != count.end()) cout << it->first << '=' << it->second << '\n';   // a=2

map<int, string> byTime = {{10, "x"}, {20, "y"}, {30, "z"}};
// first key >= 15
auto lb = byTime.lower_bound(15);
cout << lb->first << '\n';                     // 20
// largest key (map is sorted)
cout << byTime.rbegin()->first << '\n';        // 30
```

The big gotcha: **`m[key]` inserts a default-constructed value** when the key is missing. Merely checking `if (m[k] == 0)` grows the map, and `[]` doesn't compile on a `const map`. Use `find`, `count` or `contains` to test, and `at(k)` to read with a bounds check (it throws if missing).

`unordered_map` has no built-in hash for `pair` or `vector` keys. Either combine the parts into one integer (`(long long)r * cols + c`), use a `map` (which only needs `<`), or write a hash functor. Its worst case is O(n) per operation, and some judges include inputs that collide on purpose.

### Heaps, stacks and queues

`priority_queue` is a **max-heap** by default, the opposite of Python's `heapq` and Java's `PriorityQueue`. For a min-heap, pass `greater<>` as the comparator. See [heaps](/learn/heaps) for how they work.

```cpp
priority_queue<int> maxHeap;
// min-heap (third template argument is comparator)
priority_queue<int, vector<int>, greater<int>> minHeap;
for (int x : {5, 1, 8}) { maxHeap.push(x); minHeap.push(x); }
cout << maxHeap.top() << ' ' << minHeap.top() << '\n';   // 8 1

// (dist, node) pairs, smallest dist first (Dijkstra)
priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
pq.push({4, 2});
pq.push({1, 3});
auto [d, node] = pq.top();
pq.pop();
cout << d << ' ' << node << '\n';                         // 1 3
```

In `stack`, `queue` and `priority_queue`, `pop()` returns `void`, so read `top()` or `front()` first. Calling `top()` or `pop()` on an empty one is UB, not an exception.

### pair, tuple and structured bindings

`pair` and `tuple` group values and compare lexicographically, which makes them handy sort keys and heap entries. **Structured bindings** (C++17) unpack them, and also work on structs and map entries:

```cpp
pair<int, string> p = {2, "two"};
auto [num, word] = p;
tuple<int, int, int> t = {1, 2, 3};
auto [x, y, z] = t;

map<string, int> ages = {{"ann", 31}, {"bo", 25}};
// const auto& avoids copying each entry
for (const auto& [name, age] : ages) cout << name << ' ' << age << '\n';
cout << num << word << x + y + z << '\n';                 // 2two6
```

Map entries are `pair<const K, V>`, so you can change `age` through `auto&` but never the key.

## Algorithms

The `<algorithm>` and `<numeric>` headers work on iterator ranges, written `begin(), end()` (a half-open range: `end()` is one past the last element). C++20 adds `ranges::` versions that take the container directly, such as `ranges::sort(v)`.

### Sorting with comparators

`sort` is O(n log n) and not stable (`stable_sort` is). The optional comparator is a function or lambda returning `true` when its first argument must come **before** the second:

```cpp
vector<int> v = {3, 1, 2};
sort(v.begin(), v.end());                          // 1 2 3
sort(v.begin(), v.end(), greater<int>());          // 3 2 1

vector<pair<string, int>> people = {{"bo", 25}, {"ann", 31}, {"cy", 25}};
// age ascending, then name
sort(people.begin(), people.end(), [](const auto& a, const auto& b) {
    if (a.second != b.second) return a.second < b.second;
    return a.first < b.first;
});
cout << people[0].first << ' ' << people[2].first << '\n';   // bo ann
```

The comparator must be a **strict weak ordering**: `comp(a, a)` is false, and it's consistent and transitive. Writing `<=` instead of `<` violates that and is undefined behaviour; `std::sort` can run off the end of the array. To sort by a key, compare keys with `<`, or compare `tie(a.x, a.y) < tie(b.x, b.y)` for several keys at once. See [sorting](/learn/sorting) for the algorithms themselves.

### The everyday toolkit

```cpp
vector<int> v = {4, 1, 4, 2, 9};
// sum; init 0LL makes it accumulate in long long
long long sum = accumulate(v.begin(), v.end(), 0LL);
int biggest = *max_element(v.begin(), v.end());    // returns iterator, so deref
int where = min_element(v.begin(), v.end()) - v.begin();   // index of min
reverse(v.begin(), v.end());                       // 9 2 4 1 4

// dedupe = sort, then unique moves duplicates to back, then erase tail
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());      // 1 2 4 9

// binary search on sorted range (first element >= 3)
auto it = lower_bound(v.begin(), v.end(), 3);
int pos = it - v.begin();                          // 2 (v[2] = 4)
bool has = binary_search(v.begin(), v.end(), 9);

// 0, 1, ..., n-1 (in numeric)
vector<int> ids(5);
iota(ids.begin(), ids.end(), 0);
cout << sum << ' ' << biggest << ' ' << where << ' ' << pos << ' ' << has << ' ' << ids[4] << '\n';   // 20 9 1 2 1 4
```

The most common silent bug here is `accumulate` with an `int` initial value: the result type is the type of the third argument, so `accumulate(v.begin(), v.end(), 0)` sums in `int` and overflows, and summing doubles with `0` truncates each step. Pass `0LL` or `0.0`. `lower_bound` and `upper_bound` are covered in [binary search](/learn/binary-search#lower-bound-and-upper-bound); on a `set` or `map`, call the member `s.lower_bound(x)`, because the free function is O(n) on tree iterators.

Other useful ones: `count`, `find`, `any_of` / `all_of`, `fill`, `swap`, `max({a, b, c})` (initializer-list form), `next_permutation`, `nth_element` (O(n) average selection), `partial_sum`, and `gcd` / `lcm` from `<numeric>` (C++17).

## Loops, lambdas and captures

### Range-for: auto vs auto&

The range-based `for` loop is the everyday way to walk a container. What you write before the colon decides whether you get copies:

```cpp
vector<string> words = {"hi", "there"};
for (auto w : words) w += "!";           // copies; words unchanged
for (auto& w : words) w += "!";          // modifies in place
for (const auto& w : words) cout << w << ' ';   // read-only, no copies
cout << '\n';                            // hi! there!
```

Use `const auto&` by default for anything bigger than a number, `auto&` to modify, and plain `auto` for ints and other small values. Don't add or remove elements of the container inside the loop; that invalidates the hidden iterators. If you need an index, use a counted loop; C++20 has no built-in `enumerate`, though C++23 adds `views::enumerate` (GCC 13 includes it).

### Lambdas and captures

A lambda is an inline function object: `[captures](params) { body }`. The return type is deduced. Unlike Python and JavaScript closures, a C++ lambda must declare which outer variables it uses and how. This **lambda capture** list is the part that needs care:

| Capture | Meaning |
| --- | --- |
| `[]` | Nothing from outside |
| `[x]` | Copy of `x`, taken when the lambda is created |
| `[&x]` | Reference to `x` |
| `[=]` | Copy of everything used |
| `[&]` | Reference to everything used (the usual choice for local helpers) |
| `[this]` | Members of the enclosing object (C++20 deprecates getting it implicitly via `[=]`) |

```cpp
int threshold = 3;
vector<int> v = {1, 5, 2, 8};
int big = count_if(v.begin(), v.end(), [threshold](int x) { return x > threshold; });

int calls = 0;
auto bump = [&calls]() { calls++; };
bump();
bump();
cout << big << ' ' << calls << '\n';     // 2 2
```

Copies are frozen at creation and are `const` inside the lambda unless you add `mutable`. References are live, which also means a lambda capturing by `[&]` must not outlive the variables it refers to (don't store it or return it).

Recursive lambdas, handy for a DFS inside a LeetCode method, need a little help because a lambda can't name itself. Three options:

```cpp
int n = 4;
vector<vector<int>> adj(n);
adj[0] = {1, 2};
adj[2] = {3};
vector<bool> seen(n);

// 1. std::function (simple, slightly slower)
function<void(int)> dfs = [&](int u) {
    seen[u] = true;
    for (int w : adj[u]) if (!seen[w]) dfs(w);
};
dfs(0);

// 2. pass lambda to itself (C++14 generic lambda)
auto depth = [&](auto& self, int u) -> int {
    int best = 0;
    for (int w : adj[u]) best = max(best, 1 + self(self, w));
    return best;
};
cout << seen[3] << ' ' << depth(depth, 0) << '\n';   // 1 2
```

The third option is C++23 "deducing this": `[&](this auto&& self, int u) { ... self(w); }`. It needs GCC 14 or Clang 18, so check your judge's compiler before relying on it.

## Classes and structs

`struct` and `class` are the same thing except for the default access: `struct` members are `public` by default, `class` members `private`. Convention: `struct` for plain data, `class` when there are invariants to protect.

### Constructors and member init lists

```cpp
class Counter {
public:
    // explicit = no silent conversion from string
    explicit Counter(string name, int start = 0) : name_(std::move(name)), count_(start) {}

    void add(int k) { count_ += k; }
    // const = doesn't modify object, so callable on const Counter&
    int value() const { return count_; }
    const string& name() const { return name_; }

private:
    string name_;
    // default member initialiser
    int count_ = 0;
};

struct Point {
    int x = 0, y = 0;
};
```

Things that differ from Java and Python:

- Members are initialised in the **member initializer list** (`: name_(...), count_(start)`) before the body runs. Assigning in the body works for simple types but default-constructs first, and `const` or reference members *must* go in the list. Members are initialised in declaration order, whatever order the list uses.
- A struct with no constructors is an **aggregate**: `Point p{3, 4};` or C++20's designated `Point p{.x = 3, .y = 4};`.
- Objects are values: `Counter c("hits");` creates one on the stack, no `new`. `Counter c2 = c;` copies it.
- A **`const` member function** promises not to modify the object. Only `const` functions can be called through a `const Counter&`, so mark every getter `const`; forgetting is a common compile error when you start passing by const reference.
- Single-argument constructors are implicit conversions unless marked `explicit`. Mark them.
- For inheritance, a base class needs a `virtual ~Base() = default;` destructor, and overriding functions should be marked `override`. Store polymorphic objects through `unique_ptr<Base>`; assigning a `Derived` to a `Base` *value* slices off the derived part.

### Rule of zero

The compiler generates a copy constructor, copy assignment, move constructor, move assignment and destructor for you, and they do the right thing member by member. The **rule of zero**: if every member manages itself (`string`, `vector`, `unique_ptr`, plain numbers), write none of them. Only a class that directly manages a raw resource needs custom ones, and then it usually needs all five (the "rule of five"). In practice that means wrapping the resource in its own small RAII class or smart pointer and going back to zero.

### Operator overloading for sorting

`sort`, `set`, `map` and `priority_queue` use `<` by default. Give your type one and they work unchanged. C++20 can generate all six comparisons from a defaulted `<=>` (the "spaceship" operator), comparing members in declaration order:

```cpp
struct Task {
    int priority;
    string name;
    // C++20 defaults ==, !=, <, <=, >, >= (members in order)
    auto operator<=>(const Task&) const = default;
};

struct Edge {
    int u, v, w;
    // pre-C++20 style, by weight only
    bool operator<(const Edge& other) const { return w < other.w; }
};

vector<Task> tasks = {{2, "b"}, {1, "z"}, {2, "a"}};
sort(tasks.begin(), tasks.end());
cout << tasks[0].name << tasks[1].name << tasks[2].name << '\n';   // zab

vector<Edge> edges = {{0, 1, 5}, {1, 2, 3}};
sort(edges.begin(), edges.end());
cout << edges[0].w << '\n';                                        // 3
```

Printing a custom type with `cout << t` needs an `ostream& operator<<(ostream&, const Task&)` overload; there's no `toString` or `__repr__` fallback.

## Templates in one section

Templates are C++'s generics, but they work by **generating code** for each type you use, at compile time, rather than by type erasure as in Java. That makes them fast and very flexible, and it's why error messages can run for pages.

```cpp
template <typename T>
T clampTo(T x, T lo, T hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}

template <typename T>
struct Stack {
    vector<T> items;
    void push(const T& x) { items.push_back(x); }
    T pop() { T x = items.back(); items.pop_back(); return x; }
};

// C++20 abbreviated template with concept
auto half(integral auto n) { return n / 2; }
```

`clampTo(5, 0, 3)` deduces `T = int`; `clampTo(5, 0.0, 3.0)` fails because `T` can't be both `int` and `double`. `Stack<int>` and `Stack<string>` are two separate generated classes. Template definitions must be visible where they're used, so they live entirely in headers. Since C++17 you can often omit class template arguments (`pair p{1, 2.5};`, `vector v{1, 2, 3};`), and C++20 **concepts** such as `integral` or `std::totally_ordered` constrain what a template accepts, giving much clearer errors. For interviews you'll mostly *use* templates (every STL container is one) rather than write them.

## LeetCode and interview idioms

A typical solution is a method on `class Solution`, taking containers by reference:

```cpp
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Flood-fill each unseen land cell, sinking it to '0'
        int rows = grid.size(), cols = grid[0].size(), islands = 0;
        // four neighbours as (dr, dc)
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++;
                // iterative DFS, ensuring no stack overflow on big grids
                vector<pair<int, int>> todo = {{r, c}};
                grid[r][c] = '0';
                while (!todo.empty()) {
                    auto [cr, cc] = todo.back();
                    todo.pop_back();
                    for (auto& [dr, dc] : dirs) {
                        int nr = cr + dr, nc = cc + dc;
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] != '1') continue;
                        // sink on push, so each cell enters once
                        grid[nr][nc] = '0';
                        todo.push_back({nr, nc});
                    }
                }
            }
        }
        return islands;
    }
};
```

Idioms worth knowing:

- **Parameters are `vector<int>&`** (non-const) in LeetCode signatures. You may modify the input, but you don't have to. Helper functions you write should take `const vector<int>&` unless they modify it; a by-value `vector` parameter in a recursive helper copies it on every call and is a classic time-limit-exceeded cause.
- **Adjacency lists**: `vector<vector<int>> g(n);` then `g[u].push_back(v);`. For weighted graphs, `vector<vector<pair<int, int>>>`.
- **`long long`** is 64-bit; `int` is 32-bit on every mainstream platform (max about 2.1 x 10^9). Products and sums of large values need `long long` *before* the arithmetic: `(long long)a * b`, not `(long long)(a * b)`. Literals need the suffix too: `1LL << 40`.
- **Limits**: `INT_MAX`, `INT_MIN`, `LLONG_MAX` from `<climits>`, or `numeric_limits<int>::max()`. Adding to `INT_MAX` overflows; for "infinity" in shortest-path code, `1e9` or `INT_MAX / 2` leaves headroom.
- **Integer division truncates toward zero** and `%` takes the sign of the dividend: `-7 / 2 == -3`, `-7 % 2 == -1`. That matches Java but not Python. Use `((a % m) + m) % m` for a non-negative modulus.
- **`memset` sets bytes**, not values. `memset(dp, 0, sizeof dp)` and `memset(dp, -1, sizeof dp)` work for `int` arrays because every byte is 0x00 or 0xFF; `memset(dp, 1, sizeof dp)` sets each `int` to 16843009. Prefer `vector<int> dp(n, value)` or `fill`.
- **Fast I/O** on judges that read standard input: put `ios::sync_with_stdio(false); cin.tie(nullptr);` at the start of `main`, and print `'\n'` instead of `endl` (which flushes every time). After that, don't mix `cin`/`cout` with `scanf`/`printf`.
- **`#include <bits/stdc++.h>`** pulls in the whole standard library. It's a GCC (libstdc++) convenience header: fine in contests, not portable (Clang with libc++ and MSVC don't have it), and slow to compile. Name the headers in real code.
- **Memoisation**: `vector<vector<int>> memo(n, vector<int>(m, -1));` for dense states; `unordered_map<long long, int>` with a packed key for sparse ones.
- **Recursion depth**: the default stack is around 8 MB on Linux and 1 MB on Windows, so a DFS on a 10^5-node path graph can crash. Switch to an explicit stack when depth can reach the input size.

## Coming from Python, Java or JavaScript

| You'd write | In C++ | Watch out for |
| --- | --- | --- |
| `b = a` (Python/JS/Java, shares one object) | `auto b = a;` copies | Use `auto& b = a;` for an alias; big copies are slow |
| Passing a list to a function | `const vector<int>&` or `vector<int>&` | By value copies the whole container |
| `len(xs)` / `xs.length` / `.size()` | `xs.size()` (unsigned) | `xs.size() - 1` wraps when empty |
| Python `int` (unbounded) | `int` (32-bit), `long long` (64-bit) | Overflow is UB, not an exception or wraparound |
| `xs[-1]` (Python) | `xs.back()` | Negative indexes are UB |
| `IndexError` / `ArrayIndexOutOfBoundsException` | `v[i]` doesn't check | `v.at(i)` checks; sanitizers catch the rest |
| `d.get(k, 0)` / `getOrDefault` | `m.count(k) ? m.at(k) : 0`, or `m[k]` | `m[k]` inserts the key |
| `heapq` (min) / `PriorityQueue` (min) | `priority_queue` | Max-heap by default; `greater<>` for min |
| `str1 == str2` (Java compares references) | `s1 == s2` compares contents | Comparing two `const char*` literals compares pointers |
| `"a" + 1` (JS gives `"a1"`) | `string("a") + to_string(1)` | `"a" + 1` is pointer arithmetic, giving `""` |
| `null` / `None` / `undefined` | `nullptr` for pointers, `optional<T>` (C++17) for values | References can't be null |
| `try`/`finally`, `with`, try-with-resources | Destructors (RAII) | Never `new`/`delete` by hand |
| Closures capture variables automatically | `[&]`, `[=]`, `[x]` capture lists | `[&]` lambdas must not outlive the locals |
| Generics (Java, TypeScript) | Templates | Generated per type; errors appear at use |
| `a // b` and `%` floor toward minus infinity (Python) | `/` and `%` truncate toward zero | `-7 / 2 == -3`, `-7 % 2 == -1` |
| `s.split(",")` | `stringstream` + `getline(ss, part, ',')` | No built-in split |
| `sorted(xs, key=...)` / `Comparator.comparing` | `sort` with a lambda returning `a < b` | Must be strict (`<`, never `<=`); sorts in place |
| Exceptions for every error | Exceptions exist but are rarer | Most mistakes are UB and never throw |

For the deeper traps behind several of these rows, see [language gotchas](/learn/language-gotchas#c), [the stack and the heap](/learn/os-memory#the-stack-and-the-heap) and [RAII and smart pointers](/learn/os-memory#raii-and-smart-pointers).
