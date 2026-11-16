import type { Glossary } from "../glossary";

export const python: Glossary = {
  append: {
    sig: "list.append(x)",
    desc: "Adds x to the end of the list (deque.append: right end).",
    cost: "O(1) amortised",
    params: [
      { name: "x", type: "any", desc: "item to add" },
    ],
    returns: { type: "None", desc: "list changed in place" },
  },
  pop: {
    sig: "list.pop(i=-1) / dict.pop(key, default)",
    desc: "Removes and returns list item at index i (default: last), or dict value for key. deque.pop() takes from the right.",
    cost: "O(1) at the end, O(n) elsewhere; dict O(1)",
    params: [
      { name: "i / key", type: "int / any", desc: "list or deque: index, default -1; dict: key to remove" },
      { name: "default", type: "any", desc: "dict only: returned if key is missing (default none: KeyError)" },
    ],
    returns: { type: "any", desc: "item removed; IndexError if list empty, KeyError if dict key missing" },
  },
  len: {
    sig: "len(x)",
    desc: "Number of items in a list, string, dict, set…",
    cost: "O(1)",
    params: [
      { name: "x", type: "sized", desc: "list, str, dict, set, tuple, deque..." },
    ],
    returns: { type: "int", desc: "number of items" },
  },
  enumerate: {
    sig: "enumerate(iterable, start=0)",
    desc: "Yields (index, item) pairs; start sets the first index.",
    params: [
      { name: "iterable", type: "iterable", desc: "anything you can loop over" },
      { name: "start", type: "int", desc: "default 0 = index given to the first item" },
    ],
    returns: { type: "iterator", desc: "(index, item) tuples, made lazily" },
  },
  range: {
    sig: "range(stop) / range(start, stop, step=1)",
    desc: "Integers from start up to (not including) stop, moving by step (negative steps count down).",
    params: [
      { name: "start", type: "int", desc: "default 0 = first number (optional)" },
      { name: "stop", type: "int", desc: "end, not included" },
      { name: "step", type: "int", desc: "default 1 = gap between numbers; negative counts down" },
    ],
    returns: { type: "range", desc: "sequence of ints; loop over it or wrap in list()" },
  },
  get: {
    sig: "dict.get(key, default=None)",
    desc: "Value for key, or default when key is missing (never raises).",
    cost: "O(1) average",
    params: [
      { name: "key", type: "any", desc: "key to look up" },
      { name: "default", type: "any", desc: "default None = returned if key is missing" },
    ],
    returns: { type: "any", desc: "value for key, or default; never raises" },
  },
  Counter: {
    sig: "Counter(iterable)",
    desc: "Dict subclass mapping item to count; missing items count as 0.",
    cost: "O(n) to build",
    params: [
      { name: "iterable", type: "iterable", desc: "default empty = items to count" },
    ],
    returns: { type: "Counter", desc: "dict of item to count; missing items give 0" },
  },
  most_common: {
    sig: "Counter.most_common(k=None)",
    desc: "The k most frequent (item, count) pairs, most common first.",
    params: [
      { name: "k", type: "int", desc: "default None = how many pairs; None gives all" },
    ],
    returns: { type: "list", desc: "(item, count) tuples, highest count first" },
  },
  sort: {
    sig: "list.sort(*, key=None, reverse=False)",
    desc: "Sorts in place. key: function giving each item’s sort value. reverse=True: descending. Stable.",
    cost: "O(n log n)",
    params: [
      { name: "key", type: "function", desc: "default None = maps each item to its sort value" },
      { name: "reverse", type: "bool", desc: "default False; True = descending" },
    ],
    returns: { type: "None", desc: "list reordered in place" },
  },
  sorted: {
    sig: "sorted(iterable, *, key=None, reverse=False)",
    desc: "Returns a new sorted list; same key/reverse meaning as list.sort.",
    cost: "O(n log n)",
    params: [
      { name: "iterable", type: "iterable", desc: "items to sort; not changed" },
      { name: "key", type: "function", desc: "default None = maps each item to its sort value" },
      { name: "reverse", type: "bool", desc: "default False; True = descending" },
    ],
    returns: { type: "list", desc: "new sorted list" },
  },
  deque: {
    sig: "deque(iterable=(), maxlen=None)",
    desc: "Double-ended queue with fast appends/pops at both ends. maxlen caps the size.",
    params: [
      { name: "iterable", type: "iterable", desc: "default empty = starting items" },
      { name: "maxlen", type: "int", desc: "default None = no limit; else oldest items drop off when full" },
    ],
    returns: { type: "deque", desc: "new double-ended queue" },
  },
  popleft: {
    sig: "deque.popleft()",
    desc: "Removes and returns the leftmost item.",
    cost: "O(1)",
    params: [],
    returns: { type: "any", desc: "leftmost item, removed; IndexError if empty" },
  },
  appendleft: {
    sig: "deque.appendleft(x)",
    desc: "Adds x at the left end.",
    cost: "O(1)",
    params: [
      { name: "x", type: "any", desc: "item to add" },
    ],
    returns: { type: "None", desc: "deque changed in place" },
  },
  heappush: {
    sig: "heappush(heap, item)",
    desc: "Pushes item onto the list `heap`, keeping the min-heap property.",
    cost: "O(log n)",
    params: [
      { name: "heap", type: "list", desc: "a list kept in heap order (start from [] or a heapify-ed list)" },
      { name: "item", type: "any comparable", desc: "number, string or tuple; tuples compare element by element" },
    ],
    returns: { type: "None", desc: "heap is changed in place" },
  },
  heappop: {
    sig: "heappop(heap)",
    desc: "Removes and returns the smallest item.",
    cost: "O(log n)",
    params: [
      { name: "heap", type: "list", desc: "a non-empty heap (IndexError if empty)" },
    ],
    returns: { type: "item", desc: "the smallest item, now removed" },
  },
  heapify: {
    sig: "heapify(x)",
    desc: "Rearranges list x into a min-heap in place.",
    cost: "O(n)",
    params: [
      { name: "x", type: "list", desc: "any list of comparable items" },
    ],
    returns: { type: "None", desc: "x itself is rearranged; x[0] is now the smallest" },
  },
  nlargest: {
    sig: "nlargest(k, iterable, key=None)",
    desc: "The k largest items, largest first.",
    cost: "O(n log k)",
    params: [
      { name: "k", type: "int", desc: "how many items" },
      { name: "iterable", type: "iterable", desc: "items to pick from" },
      { name: "key", type: "function", desc: "default None = maps each item to the value compared" },
    ],
    returns: { type: "list", desc: "k largest items, largest first" },
  },
  nsmallest: {
    sig: "nsmallest(k, iterable, key=None)",
    desc: "The k smallest items, smallest first.",
    cost: "O(n log k)",
    params: [
      { name: "k", type: "int", desc: "how many items" },
      { name: "iterable", type: "iterable", desc: "items to pick from" },
      { name: "key", type: "function", desc: "default None = maps each item to the value compared" },
    ],
    returns: { type: "list", desc: "k smallest items, smallest first" },
  },
  join: {
    sig: "sep.join(iterable)",
    desc: "Concatenates strings with sep between them.",
    cost: "O(total length)",
    params: [
      { name: "sep", type: "str", desc: "string put between items (the str before the dot)" },
      { name: "iterable", type: "iterable", desc: "strings to join; non-strings give TypeError" },
    ],
    returns: { type: "str", desc: "one new string" },
  },
  split: {
    sig: "str.split(sep=None, maxsplit=-1)",
    desc: "List of parts. sep=None splits on runs of whitespace and drops empties; maxsplit limits the splits.",
    params: [
      { name: "sep", type: "str", desc: "default None = split on runs of whitespace" },
      { name: "maxsplit", type: "int", desc: "default -1 = no limit on number of splits" },
    ],
    returns: { type: "list", desc: "list of str parts" },
  },
  ".find": {
    sig: "str.find(sub, start=0, end=len)",
    desc: "Index of the first occurrence of sub, or -1. Called on a string.",
    cost: "O(n·m) worst case",
    params: [
      { name: "sub", type: "str", desc: "text to look for" },
      { name: "start", type: "int", desc: "default 0 = where to begin" },
      { name: "end", type: "int", desc: "default len = where to stop" },
    ],
    returns: { type: "int", desc: "index of first match, or -1 if none" },
  },
  replace: {
    sig: "str.replace(old, new, count=-1)",
    desc: "New string with old replaced by new (at most count times).",
    params: [
      { name: "old", type: "str", desc: "text to look for" },
      { name: "new", type: "str", desc: "text to put instead" },
      { name: "count", type: "int", desc: "default -1 = replace every match" },
    ],
    returns: { type: "str", desc: "new string; original unchanged" },
  },
  ord: {
    sig: "ord(c)",
    desc: "Unicode code point of a one-character string (ord(\"a\") == 97).",
    params: [
      { name: "c", type: "str", desc: "exactly one character" },
    ],
    returns: { type: "int", desc: "Unicode code point" },
  },
  chr: {
    sig: "chr(i)",
    desc: "One-character string for code point i.",
    params: [
      { name: "i", type: "int", desc: "code point" },
    ],
    returns: { type: "str", desc: "one-character string" },
  },
  strip: {
    sig: "str.strip(chars=None)",
    desc: "Removes leading/trailing chars (default: whitespace).",
    params: [
      { name: "chars", type: "str", desc: "default None = whitespace; set of characters to remove" },
    ],
    returns: { type: "str", desc: "new string without those chars at both ends" },
  },
  startswith: {
    sig: "str.startswith(prefix)",
    desc: "True if the string starts with prefix (or any prefix in a tuple).",
    params: [
      { name: "prefix", type: "str / tuple", desc: "text to check; a tuple means any of them" },
    ],
    returns: { type: "bool", desc: "True if the string starts with it" },
  },
  endswith: {
    sig: "str.endswith(suffix)",
    desc: "True if the string ends with suffix.",
    params: [
      { name: "suffix", type: "str / tuple", desc: "text to check; a tuple means any of them" },
    ],
    returns: { type: "bool", desc: "True if the string ends with it" },
  },
  count: {
    sig: "seq.count(x)",
    desc: "Number of (non-overlapping, for strings) occurrences of x.",
    cost: "O(n)",
    params: [
      { name: "x", type: "any", desc: "item (list) or substring (str) to count" },
    ],
    returns: { type: "int", desc: "number of occurrences" },
  },
  isdigit: {
    sig: "str.isdigit()",
    desc: "True if non-empty and every character is a digit.",
    params: [],
    returns: { type: "bool", desc: "True if non-empty and all digits" },
  },
  isalpha: {
    sig: "str.isalpha()",
    desc: "True if non-empty and every character is a letter.",
    params: [],
    returns: { type: "bool", desc: "True if non-empty and all letters" },
  },
  isalnum: {
    sig: "str.isalnum()",
    desc: "True if non-empty and every character is a letter or digit.",
    params: [],
    returns: { type: "bool", desc: "True if non-empty and all letters or digits" },
  },
  lower: {
    sig: "str.lower()",
    desc: "Lower-cased copy.",
    params: [],
    returns: { type: "str", desc: "new lower-case string" },
  },
  upper: {
    sig: "str.upper()",
    desc: "Upper-cased copy.",
    params: [],
    returns: { type: "str", desc: "new upper-case string" },
  },
  insert: {
    sig: "list.insert(i, x)",
    desc: "Inserts x before index i, shifting later items right.",
    cost: "O(n)",
    params: [
      { name: "i", type: "int", desc: "index to insert before; past the end means append" },
      { name: "x", type: "any", desc: "item to insert" },
    ],
    returns: { type: "None", desc: "list changed in place" },
  },
  remove: {
    sig: "list.remove(x)",
    desc: "Removes the first item equal to x (ValueError if absent).",
    cost: "O(n)",
    params: [
      { name: "x", type: "any", desc: "value to remove" },
    ],
    returns: { type: "None", desc: "first match removed in place; ValueError if absent" },
  },
  index: {
    sig: "list.index(x)",
    desc: "Index of the first item equal to x (ValueError if absent).",
    cost: "O(n)",
    params: [
      { name: "x", type: "any", desc: "value to look for" },
    ],
    returns: { type: "int", desc: "index of first match; ValueError if absent" },
  },
  reverse: {
    sig: "list.reverse()",
    desc: "Reverses the list in place and returns None.",
    cost: "O(n)",
    params: [],
    returns: { type: "None", desc: "list reversed in place" },
  },
  zip: {
    sig: "zip(*iterables)",
    desc: "Tuples of items taken position by position; stops at the shortest input.",
    params: [
      { name: "*iterables", type: "iterable", desc: "two or more things to pair up" },
    ],
    returns: { type: "iterator", desc: "tuples, one item from each; stops at the shortest" },
  },
  defaultdict: {
    sig: "defaultdict(default_factory)",
    desc: "Dict that calls default_factory() (e.g. list, int, set) to create missing keys.",
    params: [
      { name: "default_factory", type: "function", desc: "called with no args to make a missing value (list, int, set)" },
    ],
    returns: { type: "defaultdict", desc: "new dict that fills in missing keys" },
  },
  items: {
    sig: "dict.items()",
    desc: "View of (key, value) pairs in insertion order.",
    params: [],
    returns: { type: "view", desc: "(key, value) pairs in insertion order" },
  },
  values: {
    sig: "dict.values()",
    desc: "View of the values.",
    params: [],
    returns: { type: "view", desc: "the values in insertion order" },
  },
  add: {
    sig: "set.add(x)",
    desc: "Adds x (no effect if already present).",
    cost: "O(1) average",
    params: [
      { name: "x", type: "any", desc: "hashable item to add" },
    ],
    returns: { type: "None", desc: "set changed in place; no effect if present" },
  },
  discard: {
    sig: "set.discard(x)",
    desc: "Removes x if present; no error if missing (unlike remove).",
    cost: "O(1) average",
    params: [
      { name: "x", type: "any", desc: "item to remove" },
    ],
    returns: { type: "None", desc: "set changed in place; no error if missing" },
  },
  bisect_left: {
    sig: "bisect_left(a, x, lo=0, hi=len(a), key=None)",
    desc: "First index where x could be inserted keeping a sorted (first a[i] ≥ x).",
    cost: "O(log n)",
    params: [
      { name: "a", type: "list", desc: "sorted list" },
      { name: "x", type: "any comparable", desc: "value to place" },
      { name: "lo", type: "int", desc: "default 0 = start of range searched" },
      { name: "hi", type: "int", desc: "default len(a) = end of range searched" },
      { name: "key", type: "function", desc: "default None = applied to items of a (not x)" },
    ],
    returns: { type: "int", desc: "first index where x fits; a[i] >= x from there on" },
  },
  bisect_right: {
    sig: "bisect_right(a, x, lo=0, hi=len(a))",
    desc: "Insertion point after any existing x (first a[i] > x).",
    cost: "O(log n)",
    params: [
      { name: "a", type: "list", desc: "sorted list" },
      { name: "x", type: "any comparable", desc: "value to place" },
      { name: "lo", type: "int", desc: "default 0 = start of range searched" },
      { name: "hi", type: "int", desc: "default len(a) = end of range searched" },
    ],
    returns: { type: "int", desc: "index after any existing x; a[i] > x from there on" },
  },
  insort: {
    sig: "insort(a, x)",
    desc: "Inserts x into sorted list a, keeping it sorted.",
    cost: "O(n) (the shift)",
    params: [
      { name: "a", type: "list", desc: "sorted list" },
      { name: "x", type: "any comparable", desc: "value to insert" },
    ],
    returns: { type: "None", desc: "x inserted into a in place, order kept" },
  },
  cmp_to_key: {
    sig: "cmp_to_key(cmp)",
    desc: "Turns cmp(a, b) (negative, 0 or positive) into a key function for sort.",
    params: [
      { name: "cmp", type: "function", desc: "cmp(a, b) gives negative, 0 or positive" },
    ],
    returns: { type: "function", desc: "key function to pass to sort / sorted" },
  },
  max: {
    sig: "max(iterable, *, key=None, default)",
    desc: "Largest item; key picks what to compare; default is returned for an empty iterable.",
    cost: "O(n)",
    params: [
      { name: "iterable", type: "iterable", desc: "items to compare (or pass several values directly)" },
      { name: "key", type: "function", desc: "default None = maps each item to the value compared" },
      { name: "default", type: "any", desc: "returned if iterable is empty (else ValueError)" },
    ],
    returns: { type: "any", desc: "largest item" },
  },
  min: {
    sig: "min(iterable, *, key=None, default)",
    desc: "Smallest item; same key/default options as max.",
    cost: "O(n)",
    params: [
      { name: "iterable", type: "iterable", desc: "items to compare (or pass several values directly)" },
      { name: "key", type: "function", desc: "default None = maps each item to the value compared" },
      { name: "default", type: "any", desc: "returned if iterable is empty (else ValueError)" },
    ],
    returns: { type: "any", desc: "smallest item" },
  },
  sum: {
    sig: "sum(iterable, start=0)",
    desc: "Adds the items to start.",
    cost: "O(n)",
    params: [
      { name: "iterable", type: "iterable", desc: "numbers to add" },
      { name: "start", type: "number", desc: "default 0 = value added to first" },
    ],
    returns: { type: "number", desc: "total" },
  },
  any: {
    sig: "any(iterable)",
    desc: "True if any item is truthy; stops at the first one.",
    params: [
      { name: "iterable", type: "iterable", desc: "items tested for truthiness" },
    ],
    returns: { type: "bool", desc: "True if at least one is truthy; False if empty" },
  },
  all: {
    sig: "all(iterable)",
    desc: "True if every item is truthy (True for empty); stops at the first falsy one.",
    params: [
      { name: "iterable", type: "iterable", desc: "items tested for truthiness" },
    ],
    returns: { type: "bool", desc: "True if all are truthy; True if empty" },
  },
  cache: {
    sig: "@cache",
    desc: "Memoises a function: results are stored per argument tuple (arguments must be hashable).",
    params: [
      { name: "function", type: "function", desc: "the function underneath the @ (set automatically)" },
    ],
    returns: { type: "function", desc: "same function, now remembering results" },
  },
  pow: {
    sig: "pow(base, exp, mod=None)",
    desc: "base**exp; with mod, computes (base**exp) % mod efficiently.",
    cost: "O(log exp)",
    params: [
      { name: "base", type: "number", desc: "number to raise" },
      { name: "exp", type: "int", desc: "power" },
      { name: "mod", type: "int", desc: "default None = take the result % mod" },
    ],
    returns: { type: "number", desc: "base**exp, or (base**exp) % mod" },
  },
  isqrt: {
    sig: "math.isqrt(n)",
    desc: "Exact floor of the square root of a non-negative int.",
    params: [
      { name: "n", type: "int", desc: "non-negative; negative gives ValueError" },
    ],
    returns: { type: "int", desc: "floor of square root" },
  },
  gcd: {
    sig: "math.gcd(*ints)",
    desc: "Greatest common divisor.",
    params: [
      { name: "*ints", type: "int", desc: "two or more integers" },
    ],
    returns: { type: "int", desc: "greatest common divisor" },
  },
  lcm: {
    sig: "math.lcm(*ints)",
    desc: "Least common multiple (Python 3.9+).",
    params: [
      { name: "*ints", type: "int", desc: "two or more integers" },
    ],
    returns: { type: "int", desc: "least common multiple" },
  },
  ceil: {
    sig: "math.ceil(x)",
    desc: "Smallest integer ≥ x.",
    params: [
      { name: "x", type: "number", desc: "int or float" },
    ],
    returns: { type: "int", desc: "smallest integer >= x" },
  },
  divmod: {
    sig: "divmod(a, b)",
    desc: "Returns (a // b, a % b).",
    params: [
      { name: "a", type: "number", desc: "dividend" },
      { name: "b", type: "number", desc: "divisor; 0 gives ZeroDivisionError" },
    ],
    returns: { type: "tuple", desc: "(a // b, a % b)" },
  },
  bit_count: {
    sig: "int.bit_count()",
    desc: "Number of 1-bits in the absolute value (Python 3.10+).",
    params: [],
    returns: { type: "int", desc: "number of 1-bits in abs(n)" },
  },
  abs: {
    sig: "abs(x)",
    desc: "Absolute value.",
    params: [
      { name: "x", type: "number", desc: "int or float" },
    ],
    returns: { type: "number", desc: "absolute value" },
  },
  print: {
    sig: "print(*objects, sep=\" \", end=\"\\n\")",
    desc: "Writes the objects separated by sep, followed by end.",
    params: [
      { name: "*objects", type: "any", desc: "things to show" },
      { name: "sep", type: "str", desc: "default \" \" = put between objects" },
      { name: "end", type: "str", desc: "default \"\\n\" = put after the last object" },
    ],
    returns: { type: "None", desc: "text written to output" },
  },
  setrecursionlimit: {
    sig: "sys.setrecursionlimit(n)",
    desc: "Maximum Python call depth (default ~1000). Very deep recursion may still overflow the stack.",
    params: [
      { name: "n", type: "int", desc: "new maximum call depth" },
    ],
    returns: { type: "None", desc: "limit changed for the program" },
  },
  dataclass: {
    sig: "@dataclass",
    desc: "Generates __init__, __repr__ and __eq__ from annotated class fields.",
    params: [
      { name: "cls", type: "class", desc: "the class underneath the @ (set automatically)" },
    ],
    returns: { type: "class", desc: "same class with generated methods" },
  },
  float: {
    sig: "float(x)",
    desc: "Converts to float; float(\"inf\") is positive infinity.",
    params: [
      { name: "x", type: "number / str", desc: "number or text such as \"3.5\" or \"inf\"" },
    ],
    returns: { type: "float", desc: "float value" },
  },
  int: {
    sig: "int(x, base=10)",
    desc: "Converts to int (truncates floats toward zero).",
    params: [
      { name: "x", type: "number / str", desc: "number or text; floats are truncated" },
      { name: "base", type: "int", desc: "default 10 = base used when x is a str" },
    ],
    returns: { type: "int", desc: "int value; ValueError if text is not a number" },
  },
  str: {
    sig: "str(x)",
    desc: "String form of x.",
    params: [
      { name: "x", type: "any", desc: "object to convert" },
    ],
    returns: { type: "str", desc: "text form of x" },
  },
  list: {
    sig: "list(iterable)",
    desc: "New list from any iterable (also a shallow copy).",
    params: [
      { name: "iterable", type: "iterable", desc: "default empty = items to copy in" },
    ],
    returns: { type: "list", desc: "new list; also a shallow copy" },
  },
  set: {
    sig: "set(iterable)",
    desc: "New set with the unique items.",
    params: [
      { name: "iterable", type: "iterable", desc: "default empty = items; duplicates dropped" },
    ],
    returns: { type: "set", desc: "new set of the unique items" },
  },
  bin: {
    sig: "bin(n)",
    desc: "Binary string such as \"0b101\".",
    params: [
      { name: "n", type: "int", desc: "integer to convert" },
    ],
    returns: { type: "str", desc: "binary text such as \"0b101\"" },
  },
  floor: {
    sig: "math.floor(x)",
    desc: "Largest integer ≤ x, as an int.",
    params: [
      { name: "x", type: "number", desc: "int or float" },
    ],
    returns: { type: "int", desc: "largest integer <= x" },
  },
  round: {
    sig: "round(x, ndigits=None)",
    desc: "Nearest integer (or ndigits decimals). Ties go to the even neighbour: round(0.5) == 0, round(1.5) == 2.",
    params: [
      { name: "x", type: "number", desc: "number to round" },
      { name: "ndigits", type: "int", desc: "default None = round to an int; else decimals kept" },
    ],
    returns: { type: "number", desc: "rounded value; int if ndigits is None" },
  },
  log2: {
    sig: "math.log2(x)",
    desc: "Base-2 logarithm as a float.",
    params: [
      { name: "x", type: "number", desc: "must be > 0" },
    ],
    returns: { type: "float", desc: "base-2 logarithm" },
  },
  log10: {
    sig: "math.log10(x)",
    desc: "Base-10 logarithm as a float.",
    params: [
      { name: "x", type: "number", desc: "must be > 0" },
    ],
    returns: { type: "float", desc: "base-10 logarithm" },
  },
  log: {
    sig: "math.log(x, base=e)",
    desc: "Natural logarithm, or log in the given base, as a float.",
    params: [
      { name: "x", type: "number", desc: "must be > 0" },
      { name: "base", type: "number", desc: "default e = base of the logarithm" },
    ],
    returns: { type: "float", desc: "logarithm of x" },
  },
  bit_length: {
    sig: "int.bit_length()",
    desc: "Number of bits needed for abs(n), without sign or leading zeros: floor(log2 n) + 1 for n > 0.",
    params: [],
    returns: { type: "int", desc: "bits needed for abs(n); 0 for 0" },
  },
  hex: {
    sig: "hex(x)",
    desc: "Hexadecimal string with a 0x prefix.",
    params: [
      { name: "x", type: "int", desc: "integer to convert" },
    ],
    returns: { type: "str", desc: "hex text such as \"0xff\"" },
  },
  format: {
    sig: "format(value, spec)",
    desc: "Formats one value: format(5, \"08b\") gives \"00000101\", format(x, \".2f\").",
    params: [
      { name: "value", type: "any", desc: "thing to format" },
      { name: "spec", type: "str", desc: "format code such as \".2f\" or \"08b\"" },
    ],
    returns: { type: "str", desc: "formatted text" },
  },
  comb: {
    sig: "math.comb(n, k)",
    desc: "n choose k: ways to pick k items from n, order ignored.",
    params: [
      { name: "n", type: "int", desc: "items available" },
      { name: "k", type: "int", desc: "items chosen" },
    ],
    returns: { type: "int", desc: "number of ways, order ignored" },
  },
  perm: {
    sig: "math.perm(n, k)",
    desc: "Ordered selections of k items from n.",
    params: [
      { name: "n", type: "int", desc: "items available" },
      { name: "k", type: "int", desc: "items chosen" },
    ],
    returns: { type: "int", desc: "number of ordered selections" },
  },
  factorial: {
    sig: "math.factorial(n)",
    desc: "n! as an exact int.",
    params: [
      { name: "n", type: "int", desc: "non-negative" },
    ],
    returns: { type: "int", desc: "n!" },
  },
  permutations: {
    sig: "itertools.permutations(iterable, r=None)",
    desc: "Every ordering of r items (default: all), lazily, as tuples.",
    cost: "n! results",
    params: [
      { name: "iterable", type: "iterable", desc: "items to arrange" },
      { name: "r", type: "int", desc: "default None = length of iterable" },
    ],
    returns: { type: "iterator", desc: "tuples of r items, in every order" },
  },
  combinations: {
    sig: "itertools.combinations(iterable, r)",
    desc: "Every choice of r items in input order, as tuples.",
    cost: "C(n, r) results",
    params: [
      { name: "iterable", type: "iterable", desc: "items to choose from" },
      { name: "r", type: "int", desc: "how many items per choice" },
    ],
    returns: { type: "iterator", desc: "tuples of r items, in input order" },
  },
  product: {
    sig: "itertools.product(*iterables, repeat=1)",
    desc: "Cartesian product: like nested for-loops, as tuples.",
    params: [
      { name: "*iterables", type: "iterable", desc: "one or more things to combine" },
      { name: "repeat", type: "int", desc: "default 1 = use the inputs this many times" },
    ],
    returns: { type: "iterator", desc: "tuples, like nested for-loops" },
  },
  hypot: {
    sig: "math.hypot(*coords)",
    desc: "Euclidean length: sqrt(x² + y² + …) without overflow.",
    params: [
      { name: "*coords", type: "number", desc: "one or more coordinates" },
    ],
    returns: { type: "float", desc: "Euclidean length" },
  },
  setdefault: {
    sig: "dict.setdefault(key, default)",
    desc: "Returns d[key]; if missing, first stores default there.",
    params: [
      { name: "key", type: "any", desc: "key to look up" },
      { name: "default", type: "any", desc: "value stored if key is missing" },
    ],
    returns: { type: "any", desc: "value now stored at key" },
  },
  partition: {
    sig: "str.partition(sep)",
    desc: "Splits once at the first sep into (before, sep, after).",
    params: [
      { name: "sep", type: "str", desc: "text to split at" },
    ],
    returns: { type: "tuple", desc: "(before, sep, after); (s, \"\", \"\") if sep absent" },
  },
  zfill: {
    sig: "str.zfill(width)",
    desc: "Pads with leading zeros to width.",
    params: [
      { name: "width", type: "int", desc: "total length wanted" },
    ],
    returns: { type: "str", desc: "new string padded with leading zeros" },
  },
  deepcopy: {
    sig: "copy.deepcopy(x)",
    desc: "Copies x and everything inside it, recursively.",
    params: [
      { name: "x", type: "any", desc: "object to copy" },
    ],
    returns: { type: "any", desc: "fully independent copy" },
  },
  move_to_end: {
    sig: "OrderedDict.move_to_end(key, last=True)",
    desc: "Moves a key to the end (or the front with last=False).",
    cost: "O(1)",
    params: [
      { name: "key", type: "any", desc: "key already in the dict" },
      { name: "last", type: "bool", desc: "default True = move to end; False = to front" },
    ],
    returns: { type: "None", desc: "OrderedDict changed in place; KeyError if missing" },
  },
  popitem: {
    sig: "dict.popitem() / OrderedDict.popitem(last=True)",
    desc: "Removes and returns the last (or, for OrderedDict with last=False, the first) item.",
    cost: "O(1)",
    params: [
      { name: "last", type: "bool", desc: "OrderedDict only, default True = take last; False = first" },
    ],
    returns: { type: "tuple", desc: "(key, value) removed; KeyError if empty" },
  },
  heapreplace: {
    sig: "heapq.heapreplace(heap, x)",
    desc: "Pops the smallest, then pushes x (heap must be non-empty).",
    cost: "O(log n)",
    params: [
      { name: "heap", type: "list", desc: "non-empty heap" },
      { name: "x", type: "any comparable", desc: "item to push" },
    ],
    returns: { type: "any", desc: "old smallest item, removed" },
  },
  heappushpop: {
    sig: "heapq.heappushpop(heap, x)",
    desc: "Pushes x, then pops the smallest; returns x straight away if it is the smallest.",
    cost: "O(log n)",
    params: [
      { name: "heap", type: "list", desc: "heap" },
      { name: "x", type: "any comparable", desc: "item to push" },
    ],
    returns: { type: "any", desc: "smallest of heap and x, removed" },
  },
  rotate: {
    sig: "deque.rotate(n=1)",
    desc: "Shifts items n steps to the right (negative: left).",
    cost: "O(k)",
    params: [
      { name: "n", type: "int", desc: "default 1 = steps right; negative goes left" },
    ],
    returns: { type: "None", desc: "deque changed in place" },
  },
  pairwise: {
    sig: "itertools.pairwise(iterable)",
    desc: "Consecutive overlapping pairs: (a0, a1), (a1, a2), … (3.10+).",
    params: [
      { name: "iterable", type: "iterable", desc: "items to pair up" },
    ],
    returns: { type: "iterator", desc: "overlapping (a, b) tuples" },
  },
  accumulate: {
    sig: "itertools.accumulate(iterable, func=add, initial=None)",
    desc: "Running totals (or running max/min with func).",
    params: [
      { name: "iterable", type: "iterable", desc: "items to combine" },
      { name: "func", type: "function", desc: "default add = two-argument function, e.g. max" },
      { name: "initial", type: "any", desc: "default None = value placed first" },
    ],
    returns: { type: "iterator", desc: "running results, one per item" },
  },
  groupby: {
    sig: "itertools.groupby(iterable, key=None)",
    desc: "Groups consecutive equal items; sort first to group all equal items.",
    params: [
      { name: "iterable", type: "iterable", desc: "items; sort first to group all equal ones" },
      { name: "key", type: "function", desc: "default None = maps each item to its group key" },
    ],
    returns: { type: "iterator", desc: "(key, group) pairs; group is a one-pass iterator" },
  },
  chain: {
    sig: "itertools.chain(*iterables) / chain.from_iterable(it)",
    desc: "Iterates several iterables one after another.",
    params: [
      { name: "*iterables", type: "iterable", desc: "things to join end to end" },
    ],
    returns: { type: "iterator", desc: "all items in turn; chain.from_iterable takes one iterable of iterables" },
  },
  reduce: {
    sig: "functools.reduce(function, iterable, initial)",
    desc: "Folds the items into one value, left to right.",
    params: [
      { name: "function", type: "function", desc: "takes (total, item), gives new total" },
      { name: "iterable", type: "iterable", desc: "items to fold" },
      { name: "initial", type: "any", desc: "optional = starting total; else first item" },
    ],
    returns: { type: "any", desc: "final value; TypeError if empty and no initial" },
  },
  prod: {
    sig: "math.prod(iterable, start=1)",
    desc: "Product of the numbers.",
    params: [
      { name: "iterable", type: "iterable", desc: "numbers to multiply" },
      { name: "start", type: "number", desc: "default 1 = value multiplied first" },
    ],
    returns: { type: "number", desc: "product" },
  },
  itemgetter: {
    sig: "operator.itemgetter(*indexes)",
    desc: "A function that picks those indexes from its argument; fast sort key.",
    params: [
      { name: "*indexes", type: "any", desc: "one or more indexes or keys to pick" },
    ],
    returns: { type: "function", desc: "function returning item (or tuple of items) at those indexes" },
  },
  lru_cache: {
    sig: "functools.lru_cache(maxsize=128)",
    desc: "Memoizes a function; maxsize=None keeps every result (same as @cache).",
    params: [
      { name: "maxsize", type: "int", desc: "default 128 = results kept; None = keep all" },
    ],
    returns: { type: "function", desc: "decorator that adds a memo cache" },
  },
  cache_clear: {
    sig: "f.cache_clear()",
    desc: "Empties a cached function's memo.",
    params: [],
    returns: { type: "None", desc: "memo emptied" },
  },
  reversed: {
    sig: "reversed(sequence)",
    desc: "Iterates backwards without copying.",
    params: [
      { name: "sequence", type: "sequence", desc: "list, str, range, tuple; not a set" },
    ],
    returns: { type: "iterator", desc: "items from last to first" },
  },
  extend: {
    sig: "list.extend(iterable)",
    desc: "Appends every item of the iterable.",
    cost: "O(k)",
    params: [
      { name: "iterable", type: "iterable", desc: "items to add one by one" },
    ],
    returns: { type: "None", desc: "list changed in place" },
  },
  splitlines: {
    sig: "str.splitlines()",
    desc: "Splits on line breaks, dropping them.",
    params: [],
    returns: { type: "list", desc: "lines without their line breaks" },
  },
  rsplit: {
    sig: "str.rsplit(sep=None, maxsplit=-1)",
    desc: "Like split, but cuts from the right.",
    params: [
      { name: "sep", type: "str", desc: "default None = split on runs of whitespace" },
      { name: "maxsplit", type: "int", desc: "default -1 = no limit; splits happen from the right" },
    ],
    returns: { type: "list", desc: "list of str parts" },
  },
  ljust: {
    sig: "str.ljust(width, fill=\" \")",
    desc: "Pads on the right to width (rjust pads on the left, center both sides).",
    params: [
      { name: "width", type: "int", desc: "total length wanted" },
      { name: "fill", type: "str", desc: "default \" \" = one padding character" },
    ],
    returns: { type: "str", desc: "new padded string" },
  },
};
