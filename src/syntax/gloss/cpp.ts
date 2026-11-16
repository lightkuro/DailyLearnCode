import type { Glossary } from "../glossary";

export const cpp: Glossary = {
  push_back: {
    sig: "v.push_back(x)",
    desc: "Appends x at the end.",
    cost: "O(1) amortised",
    params: [
      { name: "x", type: "T", desc: "value to append (copied or moved in)" },
    ],
    returns: { type: "void", desc: "vector gets one more element at the end, in place" },
  },
  pop_back: {
    sig: "v.pop_back()",
    desc: "Removes the last element (undefined if empty).",
    cost: "O(1)",
    params: [],    returns: { type: "void", desc: "last element removed in place; undefined if empty" },
  },
  size: {
    sig: "c.size()",
    desc: "Element count, as an unsigned size_t.",
    cost: "O(1)",
    params: [],    returns: { type: "size_t", desc: "number of elements; unsigned, so size() - 1 wraps on empty" },
  },
  empty: {
    sig: "c.empty()",
    desc: "True if the container has no elements.",
    params: [],    returns: { type: "bool", desc: "true if no elements" },
  },
  back: {
    sig: "c.back()",
    desc: "Reference to the last element.",
    params: [],    returns: { type: "T&", desc: "reference to last element; undefined if empty" },
  },
  front: {
    sig: "c.front()",
    desc: "Reference to the first element (queue: the next to pop).",
    params: [],    returns: { type: "T&", desc: "reference to first element (queue: next to pop); undefined if empty" },
  },
  insert: {
    sig: "v.insert(pos, x) / s.insert(x)",
    desc: "Inserts before iterator pos (vector, O(n)); for sets/maps adds the element.",
    params: [
      { name: "pos", type: "iterator", desc: "vector: insert before this position" },
      { name: "x", type: "T", desc: "value to insert (set/map: element or pair)" },
    ],
    returns: { type: "iterator", desc: "vector: points at new element; set/map: pair of iterator and bool (inserted)" },
  },
  erase: {
    sig: "c.erase(pos | key | first, last)",
    desc: "Removes by iterator, key or iterator range.",
    params: [
      { name: "pos | key | first, last", type: "iterator | Key | iterators", desc: "what to remove: one position, a key (set/map), or a range" },
    ],
    returns: { type: "iterator", desc: "after the removed element(s); key form gives count removed (size_t)" },
  },
  sort: {
    sig: "sort(first, last, comp = less)",
    desc: "Sorts [first, last). comp(a, b) must return true when a goes before b.",
    cost: "O(n log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to sort; needs random access (vector, array)" },
      { name: "comp", type: "comparator", desc: "optional; comp(a, b) true when a goes before b; default less" },
    ],
    returns: { type: "void", desc: "range sorted in place" },
  },
  stable_sort: {
    sig: "stable_sort(first, last, comp)",
    desc: "Like sort but keeps equal elements in order.",
    cost: "O(n log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to sort" },
      { name: "comp", type: "comparator", desc: "optional; comp(a, b) true when a goes before b" },
    ],
    returns: { type: "void", desc: "range sorted in place; equal elements keep their order" },
  },
  reverse: {
    sig: "reverse(first, last)",
    desc: "Reverses the range in place.",
    cost: "O(n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to reverse" },
    ],
    returns: { type: "void", desc: "range reversed in place" },
  },
  lower_bound: {
    sig: "lower_bound(first, last, x)",
    desc: "Iterator to the first element ≥ x in a sorted range.",
    cost: "O(log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "a sorted range [first, last), e.g. v.begin(), v.end()" },
      { name: "x", type: "T", desc: "the value to look for" },
    ],
    returns: { type: "iterator", desc: "first element ≥ x, or last if there is none; it - v.begin() is its index" },
  },
  upper_bound: {
    sig: "upper_bound(first, last, x)",
    desc: "Iterator to the first element > x in a sorted range.",
    cost: "O(log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "a sorted range [first, last)" },
      { name: "x", type: "T", desc: "the value to compare with" },
    ],
    returns: { type: "iterator", desc: "first element > x, or last; upper - lower = how many equal x" },
  },
  binary_search: {
    sig: "binary_search(first, last, x)",
    desc: "True if x is in the sorted range.",
    cost: "O(log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "a sorted range [first, last)" },
      { name: "x", type: "T", desc: "value to look for" },
    ],
    returns: { type: "bool", desc: "true if x is in the range" },
  },
  accumulate: {
    sig: "accumulate(first, last, init)",
    desc: "init + sum of the range; init’s type is the result type (use 0LL for long long).",
    cost: "O(n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to add up" },
      { name: "init", type: "T", desc: "start value; its type is the result type (0LL for long long)" },
    ],
    returns: { type: "T", desc: "init plus every element, same type as init" },
  },
  max_element: {
    sig: "max_element(first, last)",
    desc: "Iterator to the largest element (dereference with *).",
    cost: "O(n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to scan" },
    ],
    returns: { type: "iterator", desc: "points at largest element; last if range empty; use * to read it" },
  },
  min_element: {
    sig: "min_element(first, last)",
    desc: "Iterator to the smallest element.",
    cost: "O(n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to scan" },
    ],
    returns: { type: "iterator", desc: "points at smallest element; last if range empty" },
  },
  fill: {
    sig: "fill(first, last, value)",
    desc: "Assigns value to every element in the range.",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to overwrite" },
      { name: "value", type: "T", desc: "value to store in each slot" },
    ],
    returns: { type: "void", desc: "every element set to value in place" },
  },
  unique: {
    sig: "unique(first, last)",
    desc: "Moves consecutive duplicates to the end and returns the new logical end.",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last), sorted so duplicates are adjacent" },
    ],
    returns: { type: "iterator", desc: "new logical end; erase from here to last to really shrink" },
  },
  iota: {
    sig: "iota(first, last, start)",
    desc: "Fills the range with start, start+1, start+2…",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to fill" },
      { name: "start", type: "T", desc: "first value; each next slot gets one more" },
    ],
    returns: { type: "void", desc: "range filled with start, start+1, ... in place" },
  },
  push: {
    sig: "stack/queue/pq.push(x)",
    desc: "Adds x (top of stack, back of queue, by priority in a heap).",
    cost: "O(1) / O(log n) heap",
    params: [
      { name: "x", type: "T", desc: "value to add" },
    ],
    returns: { type: "void", desc: "x added to the stack, queue or heap in place" },
  },
  pop: {
    sig: "stack/queue/pq.pop()",
    desc: "Removes the top/front element and returns nothing: read top()/front() first.",
    params: [],    returns: { type: "void", desc: "top/front removed in place; value not returned; undefined if empty" },
  },
  top: {
    sig: "stack.top() / pq.top()",
    desc: "The top element (largest for a default priority_queue).",
    cost: "O(1)",
    params: [],    returns: { type: "T&", desc: "top element (largest for default priority_queue); undefined if empty" },
  },
  push_front: {
    sig: "dq.push_front(x)",
    desc: "Adds at the front of a deque.",
    cost: "O(1)",
    params: [
      { name: "x", type: "T", desc: "value to add at the front" },
    ],
    returns: { type: "void", desc: "deque gets x at its front in place" },
  },
  pop_front: {
    sig: "dq.pop_front()",
    desc: "Removes the first element of a deque.",
    cost: "O(1)",
    params: [],    returns: { type: "void", desc: "first element of deque removed in place; undefined if empty" },
  },
  find: {
    sig: "find(first, last, x)",
    desc: "Iterator to the first element equal to x, or last if absent (linear search).",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to search" },
      { name: "x", type: "T", desc: "value to look for" },
    ],
    returns: { type: "iterator", desc: "first element equal to x, or last if absent" },
  },
  count: {
    sig: "count(first, last, x)",
    desc: "How many elements in the range equal x.",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to scan" },
      { name: "x", type: "T", desc: "value to count" },
    ],
    returns: { type: "ptrdiff_t", desc: "number of elements equal to x" },
  },
  substr: {
    sig: "s.substr(pos, len = npos)",
    desc: "Copy of len characters starting at pos.",
    cost: "O(len)",
    params: [
      { name: "pos", type: "size_t", desc: "start index; error if pos > size" },
      { name: "len", type: "size_t", desc: "optional; characters to copy, default to the end" },
    ],
    returns: { type: "string", desc: "new string copy of the slice" },
  },
  to_string: {
    sig: "to_string(number)",
    desc: "Decimal string of a number.",
    params: [
      { name: "number", type: "int | long long | double", desc: "value to convert" },
    ],
    returns: { type: "string", desc: "decimal text of the number" },
  },
  stoi: {
    sig: "stoi(s)",
    desc: "Parses an int from a string.",
    params: [
      { name: "s", type: "string", desc: "text holding an int, e.g. \"42\"; throws if not a number" },
    ],
    returns: { type: "int", desc: "parsed value" },
  },
  stoll: {
    sig: "stoll(s)",
    desc: "Parses a long long from a string.",
    params: [
      { name: "s", type: "string", desc: "text holding an integer; throws if not a number" },
    ],
    returns: { type: "long long", desc: "parsed value" },
  },
  isdigit: {
    sig: "isdigit(c)",
    desc: "Non-zero if c is 0–9.",
    params: [
      { name: "c", type: "int", desc: "character, usually a char (cast to unsigned char if negative)" },
    ],
    returns: { type: "int", desc: "non-zero if c is 0-9, else 0" },
  },
  isalpha: {
    sig: "isalpha(c)",
    desc: "Non-zero if c is a letter.",
    params: [
      { name: "c", type: "int", desc: "character, usually a char" },
    ],
    returns: { type: "int", desc: "non-zero if c is a letter, else 0" },
  },
  isalnum: {
    sig: "isalnum(c)",
    desc: "Non-zero if c is a letter or digit.",
    params: [
      { name: "c", type: "int", desc: "character, usually a char" },
    ],
    returns: { type: "int", desc: "non-zero if c is a letter or digit, else 0" },
  },
  tolower: {
    sig: "tolower(c)",
    desc: "Lower-case version of c (returns int; cast to char).",
    params: [
      { name: "c", type: "int", desc: "character to convert" },
    ],
    returns: { type: "int", desc: "lower-case c; cast to char before appending to a string" },
  },
  toupper: {
    sig: "toupper(c)",
    desc: "Upper-case version of c.",
    params: [
      { name: "c", type: "int", desc: "character to convert" },
    ],
    returns: { type: "int", desc: "upper-case c; cast to char before appending to a string" },
  },
  vector: {
    sig: "vector<T>(n = 0, value = T())",
    desc: "Dynamic array; (n, value) creates n copies of value.",
    params: [
      { name: "n", type: "size_t", desc: "optional; number of elements, default 0" },
      { name: "value", type: "T", desc: "optional; initial value of each, default T()" },
    ],
    returns: { type: "vector<T>", desc: "new vector; also vector<T>{a, b, c} or a copy" },
  },
  string: {
    sig: "string(count, ch) / string s",
    desc: "Mutable byte string.",
    params: [
      { name: "count, ch", type: "size_t, char", desc: "optional; count copies of ch; or a string literal / another string" },
    ],
    returns: { type: "string", desc: "new mutable string" },
  },
  priority_queue: {
    sig: "priority_queue<T, Container, Compare>",
    desc: "Max-heap by default; pass greater<T> for a min-heap or a custom comparator type.",
    params: [
      { name: "T", type: "type", desc: "element type" },
      { name: "Container", type: "type", desc: "optional; storage, default vector<T>" },
      { name: "Compare", type: "comparator", desc: "optional; default less<T> gives max-heap" },
    ],
    returns: { type: "priority_queue<T>", desc: "new empty heap; top() is the largest by Compare" },
  },
  unordered_map: {
    sig: "unordered_map<K, V>",
    desc: "Hash map; operator[] inserts missing keys.",
    cost: "O(1) average",
    params: [
      { name: "K", type: "type", desc: "key type; needs a hash" },
      { name: "V", type: "type", desc: "value type" },
    ],
    returns: { type: "unordered_map<K, V>", desc: "new empty hash map" },
  },
  unordered_set: {
    sig: "unordered_set<T>",
    desc: "Hash set.",
    cost: "O(1) average",
    params: [
      { name: "T", type: "type", desc: "element type; needs a hash" },
    ],
    returns: { type: "unordered_set<T>", desc: "new empty hash set" },
  },
  map: {
    sig: "map<K, V>",
    desc: "Sorted map (red-black tree).",
    cost: "O(log n)",
    params: [
      { name: "K", type: "type", desc: "key type; needs operator<" },
      { name: "V", type: "type", desc: "value type" },
    ],
    returns: { type: "map<K, V>", desc: "new empty map, sorted by key" },
  },
  set: {
    sig: "set<T>",
    desc: "Sorted unique elements.",
    cost: "O(log n)",
    params: [
      { name: "T", type: "type", desc: "element type; needs operator<" },
    ],
    returns: { type: "set<T>", desc: "new empty set, sorted and unique" },
  },
  deque: {
    sig: "deque<T>",
    desc: "Double-ended queue with O(1) ends.",
    params: [
      { name: "T", type: "type", desc: "element type" },
    ],
    returns: { type: "deque<T>", desc: "new empty double-ended queue" },
  },
  stack: {
    sig: "stack<T>",
    desc: "LIFO adapter over deque.",
    params: [
      { name: "T", type: "type", desc: "element type" },
    ],
    returns: { type: "stack<T>", desc: "new empty LIFO stack" },
  },
  queue: {
    sig: "queue<T>",
    desc: "FIFO adapter over deque.",
    params: [
      { name: "T", type: "type", desc: "element type" },
    ],
    returns: { type: "queue<T>", desc: "new empty FIFO queue" },
  },
  pair: {
    sig: "pair<A, B>",
    desc: "Two values .first and .second; compared lexicographically.",
    params: [
      { name: "A", type: "type", desc: "type of .first" },
      { name: "B", type: "type", desc: "type of .second" },
    ],
    returns: { type: "pair<A, B>", desc: "new pair; make with {a, b} or make_pair(a, b)" },
  },
  greater: {
    sig: "greater<T>",
    desc: 'Comparator for "a > b": turns priority_queue into a min-heap, sort into descending.',
    params: [
      { name: "T", type: "type", desc: "type being compared" },
    ],
    returns: { type: "greater<T>", desc: "comparator object: true when a > b" },
  },
  __builtin_popcount: {
    sig: "__builtin_popcount(unsigned x)",
    desc: "Number of 1-bits (GCC/Clang builtin; …ll for 64-bit).",
    params: [
      { name: "x", type: "unsigned", desc: "value to inspect; use __builtin_popcountll for 64-bit" },
    ],
    returns: { type: "int", desc: "count of 1 bits" },
  },
  popcount: {
    sig: "std::popcount(unsigned x)",
    desc: "Number of 1-bits (C++20, <bit>).",
    params: [
      { name: "x", type: "unsigned", desc: "unsigned integer to inspect" },
    ],
    returns: { type: "int", desc: "count of 1 bits" },
  },
  gcd: {
    sig: "gcd(a, b)",
    desc: "Greatest common divisor (<numeric>, C++17).",
    params: [
      { name: "a, b", type: "int | long long", desc: "two integers (same type)" },
    ],
    returns: { type: "T", desc: "greatest common divisor; gcd(0, b) is b" },
  },
  lcm: {
    sig: "lcm(a, b)",
    desc: "Least common multiple (<numeric>, C++17).",
    params: [
      { name: "a, b", type: "int | long long", desc: "two integers (same type)" },
    ],
    returns: { type: "T", desc: "least common multiple; can overflow int" },
  },
  max: {
    sig: "max(a, b) / max({a, b, c})",
    desc: "Larger value; both arguments must have the same type.",
    params: [
      { name: "a, b", type: "T", desc: "two values of the same type, or {a, b, c} list" },
    ],
    returns: { type: "T", desc: "the larger value (const reference for two values)" },
  },
  min: {
    sig: "min(a, b) / min({…})",
    desc: "Smaller value; same-type arguments.",
    params: [
      { name: "a, b", type: "T", desc: "two values of the same type, or {a, b, c} list" },
    ],
    returns: { type: "T", desc: "the smaller value (const reference for two values)" },
  },
  abs: {
    sig: "abs(x) / llabs(x)",
    desc: "Absolute value (llabs for long long).",
    params: [
      { name: "x", type: "int | long long | double", desc: "number; use llabs for long long in C" },
    ],
    returns: { type: "same as x", desc: "absolute value" },
  },
  sqrt: {
    sig: "sqrt(x)",
    desc: "Square root as a double.",
    params: [
      { name: "x", type: "double", desc: "non-negative number" },
    ],
    returns: { type: "double", desc: "square root; NaN for negative x" },
  },
  pow: {
    sig: "pow(base, exp)",
    desc: "base^exp as a double (imprecise for big integers).",
    params: [
      { name: "base, exp", type: "double", desc: "base and exponent" },
    ],
    returns: { type: "double", desc: "base to the power exp; imprecise for big integers" },
  },
  function: {
    sig: "function<R(Args...)>",
    desc: "Type-erased callable; lets a lambda refer to itself for recursion.",
    params: [
      { name: "R(Args...)", type: "signature", desc: "return type and argument types, e.g. function<int(int)>" },
    ],
    returns: { type: "function<R(Args...)>", desc: "object holding any matching callable (lambda, function pointer)" },
  },
  numeric_limits: {
    sig: "numeric_limits<T>::max()",
    desc: "Largest value of type T (also ::min(), ::lowest()).",
    params: [
      { name: "T", type: "type", desc: "number type, e.g. int, long long, double" },
    ],
    returns: { type: "T", desc: "max(), min(), lowest() give that type's limits (call as T::max())" },
  },
  floor: {
    sig: "floor(x)",
    desc: "Largest whole number ≤ x, as a double.",
    params: [
      { name: "x", type: "double", desc: "number to round down" },
    ],
    returns: { type: "double", desc: "largest whole number <= x" },
  },
  ceil: {
    sig: "ceil(x)",
    desc: "Smallest whole number ≥ x, as a double.",
    params: [
      { name: "x", type: "double", desc: "number to round up" },
    ],
    returns: { type: "double", desc: "smallest whole number >= x" },
  },
  round: {
    sig: "round(x)",
    desc: "Nearest whole number as a double; halves go away from zero.",
    params: [
      { name: "x", type: "double", desc: "number to round" },
    ],
    returns: { type: "double", desc: "nearest whole number; halves go away from zero" },
  },
  trunc: {
    sig: "trunc(x)",
    desc: "Drops the fraction (rounds toward zero), as a double.",
    params: [
      { name: "x", type: "double", desc: "number to cut" },
    ],
    returns: { type: "double", desc: "x with the fraction dropped (toward zero)" },
  },
  llround: {
    sig: "llround(x)",
    desc: "Nearest whole number as a long long; halves go away from zero.",
    params: [
      { name: "x", type: "double", desc: "number to round" },
    ],
    returns: { type: "long long", desc: "nearest whole number; halves go away from zero" },
  },
  log2: {
    sig: "log2(x)",
    desc: "Base-2 logarithm as a double.",
    params: [
      { name: "x", type: "double", desc: "positive number" },
    ],
    returns: { type: "double", desc: "base-2 logarithm; -inf for 0, NaN for negative" },
  },
  log10: {
    sig: "log10(x)",
    desc: "Base-10 logarithm as a double.",
    params: [
      { name: "x", type: "double", desc: "positive number" },
    ],
    returns: { type: "double", desc: "base-10 logarithm; -inf for 0, NaN for negative" },
  },
  log: {
    sig: "log(x)",
    desc: "Natural logarithm as a double.",
    params: [
      { name: "x", type: "double", desc: "positive number" },
    ],
    returns: { type: "double", desc: "natural logarithm; -inf for 0, NaN for negative" },
  },
  __lg: {
    sig: "__lg(n)",
    desc: "floor(log2 n) as an int for n > 0. A GCC extension LeetCode has; provided here too.",
    params: [
      { name: "n", type: "int | long long", desc: "positive integer; 0 is undefined" },
    ],
    returns: { type: "int", desc: "floor(log2 n): index of highest set bit" },
  },
  has_single_bit: {
    sig: "has_single_bit(x)",
    desc: "True if the unsigned x is a power of two (C++20, <bit>).",
    params: [
      { name: "x", type: "unsigned", desc: "unsigned integer to test" },
    ],
    returns: { type: "bool", desc: "true if x is a power of two (0 gives false)" },
  },
  __builtin_ctz: {
    sig: "__builtin_ctz(x) / __builtin_ctzll(x)",
    desc: "Trailing zero bits: the index of the lowest set bit. Undefined for 0.",
    params: [
      { name: "x", type: "unsigned", desc: "non-zero value; use ctzll for 64-bit" },
    ],
    returns: { type: "int", desc: "number of trailing zero bits; undefined for 0" },
  },
  __builtin_clz: {
    sig: "__builtin_clz(x) / __builtin_clzll(x)",
    desc: "Leading zero bits of an unsigned int (31 − clz is floor(log2 x)). Undefined for 0.",
    params: [
      { name: "x", type: "unsigned", desc: "non-zero value; use clzll for 64-bit" },
    ],
    returns: { type: "int", desc: "number of leading zero bits; undefined for 0" },
  },
  bitset: {
    sig: "bitset<N>(x)",
    desc: "N bits; .to_string() prints them, .count() counts the 1s, b[i] reads bit i.",
    params: [
      { name: "N", type: "size_t", desc: "number of bits, a compile-time constant" },
      { name: "x", type: "unsigned long long | string", desc: "optional; initial bits" },
    ],
    returns: { type: "bitset<N>", desc: "new bit set; b[i] reads bit i, b.count() counts 1s" },
  },
  clamp: {
    sig: "clamp(v, lo, hi)",
    desc: "v limited to [lo, hi] (C++17); all three must have the same type.",
    params: [
      { name: "v, lo, hi", type: "T", desc: "value and the allowed range [lo, hi], same type; lo <= hi" },
    ],
    returns: { type: "T", desc: "lo if v < lo, hi if v > hi, else v" },
  },
  hypot: {
    sig: "hypot(x, y)",
    desc: "sqrt(x² + y²) without intermediate overflow.",
    params: [
      { name: "x, y", type: "double", desc: "the two side lengths" },
    ],
    returns: { type: "double", desc: "sqrt(x*x + y*y), safe from overflow" },
  },
  next_permutation: {
    sig: "next_permutation(first, last)",
    desc: "Rearranges into the next lexicographic order; returns false (and wraps to sorted) after the last.",
    cost: "O(n) per step",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last), start sorted to see all orders" },
    ],
    returns: { type: "bool", desc: "true if rearranged to the next order; false after the last (range is then sorted)" },
  },
  nth_element: {
    sig: "nth_element(first, nth, last)",
    desc: "Puts the element a full sort would place at nth there, with smaller ones before and larger after.",
    cost: "O(n) average",
    params: [
      { name: "first, nth, last", type: "iterators", desc: "range [first, last) and the position nth to fix" },
    ],
    returns: { type: "void", desc: "range partly ordered in place: *nth is the sorted one, smaller before, larger after" },
  },
  getline: {
    sig: "getline(stream, str, delim = '\\n')",
    desc: "Reads up to delim into str; false when the stream is exhausted.",
    params: [
      { name: "stream", type: "istream&", desc: "input, e.g. cin or a stringstream" },
      { name: "str", type: "string&", desc: "where the text is stored" },
      { name: "delim", type: "char", desc: "optional; stop character, default '\\n'" },
    ],
    returns: { type: "istream&", desc: "the stream; false in a condition once nothing could be read" },
  },
  rfind: {
    sig: "s.rfind(x, pos = npos)",
    desc: "Index of the last occurrence, or string::npos.",
    cost: "O(n·m)",
    params: [
      { name: "x", type: "string | char", desc: "text to look for" },
      { name: "pos", type: "size_t", desc: "optional; last index to start at, default end" },
    ],
    returns: { type: "size_t", desc: "index of last match, or string::npos" },
  },
  replace: {
    sig: "s.replace(pos, len, str)",
    desc: "Replaces len characters starting at pos.",
    params: [
      { name: "pos", type: "size_t", desc: "start index" },
      { name: "len", type: "size_t", desc: "characters to remove" },
      { name: "str", type: "string", desc: "text put in their place" },
    ],
    returns: { type: "string&", desc: "the same string, changed in place" },
  },
  starts_with: {
    sig: "s.starts_with(x) / ends_with(x)",
    desc: "Prefix / suffix check (C++20).",
    params: [
      { name: "x", type: "string | char", desc: "prefix (or suffix for ends_with) to test" },
    ],
    returns: { type: "bool", desc: "true if s begins (ends_with: ends) with x" },
  },
  contains: {
    sig: "s.contains(x) / m.contains(key)",
    desc: "Substring check (C++23) / key check for maps and sets (C++20).",
    params: [
      { name: "x", type: "string | char | Key", desc: "substring or char for strings, key for maps and sets" },
    ],
    returns: { type: "bool", desc: "true if present" },
  },
  erase_if: {
    sig: "erase_if(container, predicate)",
    desc: "Removes every element matching the predicate (C++20).",
    cost: "O(n)",
    params: [
      { name: "container", type: "container&", desc: "vector, string, map, set and so on" },
      { name: "predicate", type: "predicate", desc: "pred(elem) true for elements to remove" },
    ],
    returns: { type: "size_t", desc: "number of elements removed; container changed in place" },
  },
  resize: {
    sig: "v.resize(n, value = T())",
    desc: "Grows (filling with value) or shrinks to n elements.",
    params: [
      { name: "n", type: "size_t", desc: "new element count" },
      { name: "value", type: "T", desc: "optional; fill for new slots, default T()" },
    ],
    returns: { type: "void", desc: "vector grown or cut to n elements in place" },
  },
  assign: {
    sig: "v.assign(n, value)",
    desc: "Replaces the contents with n copies of value.",
    params: [
      { name: "n", type: "size_t", desc: "number of elements" },
      { name: "value", type: "T", desc: "value for each" },
    ],
    returns: { type: "void", desc: "old contents replaced by n copies of value in place" },
  },
  any_of: {
    sig: "any_of(first, last, pred) / all_of / none_of",
    desc: "Whether any / all / none of the elements match.",
    cost: "O(n)",
    params: [
      { name: "first, last", type: "iterators", desc: "range [first, last) to test" },
      { name: "pred", type: "predicate", desc: "pred(elem) gives bool" },
    ],
    returns: { type: "bool", desc: "any_of: some match; all_of: every one (true if empty); none_of: no match" },
  },
  rotate: {
    sig: "rotate(first, middle, last)",
    desc: "Rotates the range so middle becomes the first element.",
    cost: "O(n)",
    params: [
      { name: "first, middle, last", type: "iterators", desc: "range [first, last); middle becomes the new first" },
    ],
    returns: { type: "iterator", desc: "where the old first element now sits; range rotated in place" },
  },
  equal_range: {
    sig: "equal_range(first, last, x)",
    desc: "Pair of lower_bound and upper_bound on a sorted range.",
    cost: "O(log n)",
    params: [
      { name: "first, last", type: "iterators", desc: "a sorted range [first, last)" },
      { name: "x", type: "T", desc: "value to look for" },
    ],
    returns: { type: "pair<iterator, iterator>", desc: "lower_bound and upper_bound; second - first = copies of x" },
  },
  prev: {
    sig: "prev(it, n = 1)",
    desc: "The iterator n steps before it.",
    params: [
      { name: "it", type: "iterator", desc: "starting position" },
      { name: "n", type: "int", desc: "optional; steps back, default 1" },
    ],
    returns: { type: "iterator", desc: "iterator n steps before it; it must not go before begin()" },
  },
  multiset: {
    sig: "multiset<T>",
    desc: "Sorted container that keeps duplicates; erase(value) removes all copies.",
    cost: "O(log n) per operation",
    params: [
      { name: "T", type: "type", desc: "element type; needs operator<" },
    ],
    returns: { type: "multiset<T>", desc: "new empty sorted container allowing duplicates" },
  },
  emplace: {
    sig: "m.emplace(key, value)",
    desc: "Inserts if the key is absent (never overwrites); returns {iterator, inserted}.",
    params: [
      { name: "key", type: "Key", desc: "key to insert" },
      { name: "value", type: "V", desc: "value to build for it" },
    ],
    returns: { type: "pair<iterator, bool>", desc: "iterator to the entry, and true if new (existing value is kept)" },
  },
  insert_or_assign: {
    sig: "m.insert_or_assign(key, value)",
    desc: "Inserts or overwrites (C++17).",
    params: [
      { name: "key", type: "Key", desc: "key to set" },
      { name: "value", type: "V", desc: "value to store, replacing any old one" },
    ],
    returns: { type: "pair<iterator, bool>", desc: "iterator to the entry; bool true if inserted, false if overwritten" },
  },
  tie: {
    sig: "tie(a, b, …)",
    desc: "A tuple of references; compare tuples to order by several fields.",
    params: [
      { name: "a, b, ...", type: "T&", desc: "variables to bundle by reference" },
    ],
    returns: { type: "tuple<T&...>", desc: "tuple of references; compare two ties to order by several fields" },
  },
  make_unique: {
    sig: "make_unique<T>(args…)",
    desc: "Creates a T owned by a unique_ptr, freed automatically.",
    params: [
      { name: "args...", type: "Args", desc: "constructor arguments for T" },
    ],
    returns: { type: "unique_ptr<T>", desc: "owning pointer to a new T; freed when it goes out of scope" },
  },
  array: {
    sig: "array<T, N>",
    desc: "Fixed-size array that knows its size and supports ==, < and copying.",
    params: [
      { name: "T", type: "type", desc: "element type" },
      { name: "N", type: "size_t", desc: "fixed length, a compile-time constant" },
    ],
    returns: { type: "array<T, N>", desc: "new array of N elements (zeroed if written array<T, N> a{})" },
  },
  stringstream: {
    sig: "stringstream ss(str)",
    desc: "Reads words (>>) or fields (getline) from a string.",
    params: [
      { name: "str", type: "string", desc: "text to read from" },
    ],
    returns: { type: "stringstream", desc: "stream over str: ss >> x reads a word, getline(ss, f, ',') a field" },
  },
  ".lower_bound": {
    sig: "s.lower_bound(x)",
    desc: "Iterator to the first element >= x in a set/map (by key).",
    cost: "O(log n)",
    params: [
      { name: "x", type: "Key", desc: "value to look for" },
    ],
    returns: { type: "iterator", desc: "first element >= x, or end() if none" },
  },
  ".upper_bound": {
    sig: "s.upper_bound(x)",
    desc: "Iterator to the first element > x in a set/map (by key).",
    cost: "O(log n)",
    params: [
      { name: "x", type: "Key", desc: "value to compare with" },
    ],
    returns: { type: "iterator", desc: "first element > x, or end() if none" },
  },
  ".equal_range": {
    sig: "s.equal_range(x)",
    desc: "Pair of iterators spanning the elements equal to x in a set/map.",
    cost: "O(log n)",
    params: [
      { name: "x", type: "Key", desc: "value to look for" },
    ],
    returns: { type: "pair<iterator, iterator>", desc: "lower_bound and upper_bound of x; equal when x is absent" },
  },
  ".find": {
    sig: "s.find(sub) / m.find(key)",
    desc: "string: index or string::npos. map/set: iterator or end().",
    cost: "O(1) hash, O(log n) tree",
    params: [
      { name: "x", type: "string | char | Key", desc: "string: text or char to find; map/set: key" },
      { name: "pos", type: "size_t", desc: "string only, optional; index to start at, default 0" },
    ],
    returns: { type: "size_t | iterator", desc: "string: index or string::npos; map/set: iterator, or end() if absent" },
  },
  ".count": {
    sig: "m.count(key)",
    desc: "0 or 1 for maps/sets (whether the key exists), without inserting.",
    cost: "O(log n) tree, O(1) hash",
    params: [
      { name: "key", type: "Key", desc: "key to test (multiset: counts all copies)" },
    ],
    returns: { type: "size_t", desc: "0 or 1 for map/set/unordered; copies for multiset" },
  },
};
