import type { Glossary } from "../glossary";

export const java: Glossary = {
  add: {
    sig: "list.add(e) / list.add(i, e) / set.add(e)",
    desc: "Appends e (or inserts at index i). Set.add returns false if e was already there.",
    cost: "O(1) amortised append, O(n) insert",
    params: [
      { name: "i", type: "int", desc: "index to insert at (list overload only; omit to append)" },
      { name: "e", type: "E", desc: "element to add" },
    ],
    returns: { type: "boolean", desc: "true if the collection changed (false if a set already had e); insert at i is void" },
  },
  get: {
    sig: "list.get(i) / map.get(key)",
    desc: "Element at index i; for maps the value or null if the key is missing.",
    cost: "O(1)",
    params: [
      { name: "i / key", type: "int / K", desc: "list index, or map key" },
    ],
    returns: { type: "E / V", desc: "the element, or for maps the value (null if missing); bad list index throws" },
  },
  size: {
    sig: "collection.size()",
    desc: "Number of elements.",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "int", desc: "number of elements" },
  },
  put: {
    sig: "map.put(key, value)",
    desc: "Stores value under key; returns the previous value or null.",
    cost: "O(1) average",
    params: [
      { name: "key", type: "K", desc: "key to store under" },
      { name: "value", type: "V", desc: "value to store" },
    ],
    returns: { type: "V", desc: "previous value for key, or null if none" },
  },
  getOrDefault: {
    sig: "map.getOrDefault(key, defaultValue)",
    desc: "Value for key, or defaultValue if the key is absent.",
    cost: "O(1) average (HashMap)",
    params: [
      { name: "key", type: "K", desc: "the key to look up" },
      { name: "defaultValue", type: "V", desc: "what to return when key is missing (it is not stored)" },
    ],
    returns: { type: "V", desc: "the stored value, or defaultValue" },
  },
  merge: {
    sig: "map.merge(key, value, remapping)",
    desc: "If key is absent stores value; otherwise stores remapping(old, value). merge(k, 1, Integer::sum) counts.",
    cost: "O(1) average (HashMap)",
    params: [
      { name: "key", type: "K", desc: "the key to update" },
      { name: "value", type: "V", desc: "stored as-is if key is new, else combined with the old value" },
      { name: "remapping", type: "(V, V) -> V", desc: "how to combine old and value, e.g. Integer::sum" },
    ],
    returns: { type: "V", desc: "the new value (null if remapping returned null, which removes key)" },
  },
  computeIfAbsent: {
    sig: "map.computeIfAbsent(key, k -> newValue)",
    desc: "Returns the value for key, creating it with the function first if missing.",
    params: [
      { name: "key", type: "K", desc: "key to look up" },
      { name: "mappingFn", type: "Function<K, V>", desc: "builds the value from key when it is missing" },
    ],
    returns: { type: "V", desc: "existing or newly created value" },
  },
  containsKey: {
    sig: "map.containsKey(key)",
    desc: "True if the key is present.",
    cost: "O(1) average (HashMap)",
    params: [
      { name: "key", type: "Object", desc: "key to look for" },
    ],
    returns: { type: "boolean", desc: "true if key is present" },
  },
  contains: {
    sig: "collection.contains(o) / str.contains(s)",
    desc: "True if present. O(1) for HashSet, O(n) for lists and strings.",
    params: [
      { name: "o", type: "Object / CharSequence", desc: "element to find, or substring for a String" },
    ],
    returns: { type: "boolean", desc: "true if found" },
  },
  remove: {
    sig: "list.remove(int index) / remove(Object o)",
    desc: "Removes by index or by value (watch out with List<Integer>). Map.remove(key) deletes a key.",
    params: [
      { name: "index / o", type: "int / Object", desc: "position (int) or the value to delete; maps take a key" },
    ],
    returns: { type: "E / boolean / V", desc: "list by index: removed element; by value: true if found; map: old value or null" },
  },
  entrySet: {
    sig: "map.entrySet()",
    desc: "Set of Map.Entry (getKey/getValue) for iterating keys and values together.",
    params: [
    ],
    returns: { type: "Set<Map.Entry<K, V>>", desc: "live view of the key-value pairs" },
  },
  keySet: {
    sig: "map.keySet()",
    desc: "Set view of the keys.",
    params: [
    ],
    returns: { type: "Set<K>", desc: "live view of the keys" },
  },
  push: {
    sig: "deque.push(e)",
    desc: "Pushes onto the front (stack top).",
    cost: "O(1)",
    params: [
      { name: "e", type: "E", desc: "element to put on top" },
    ],
    returns: { type: "void", desc: "deque gets e at its front, in place" },
  },
  pop: {
    sig: "deque.pop()",
    desc: "Removes and returns the front (stack top); throws if empty.",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "E", desc: "removed front element; throws NoSuchElementException if empty" },
  },
  peek: {
    sig: "deque.peek() / pq.peek()",
    desc: "Returns the front/top without removing it, or null if empty.",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "E", desc: "front element, left in place; null if empty" },
  },
  offer: {
    sig: "queue.offer(e)",
    desc: "Adds e at the back (PriorityQueue: by priority).",
    cost: "O(1) deque, O(log n) heap",
    params: [
      { name: "e", type: "E", desc: "element to add" },
    ],
    returns: { type: "boolean", desc: "true if added" },
  },
  poll: {
    sig: "queue.poll()",
    desc: "Removes and returns the head, or null if empty.",
    cost: "O(1) deque, O(log n) heap",
    params: [
    ],
    returns: { type: "E", desc: "removed head element, or null if empty" },
  },
  isEmpty: {
    sig: "collection.isEmpty()",
    desc: "True if there are no elements.",
    params: [
    ],
    returns: { type: "boolean", desc: "true if no elements" },
  },
  offerFirst: {
    sig: "deque.offerFirst(e)",
    desc: "Adds at the front.",
    cost: "O(1)",
    params: [
      { name: "e", type: "E", desc: "element to add at the front" },
    ],
    returns: { type: "boolean", desc: "true if added" },
  },
  offerLast: {
    sig: "deque.offerLast(e)",
    desc: "Adds at the back.",
    cost: "O(1)",
    params: [
      { name: "e", type: "E", desc: "element to add at the back" },
    ],
    returns: { type: "boolean", desc: "true if added" },
  },
  pollFirst: {
    sig: "deque.pollFirst()",
    desc: "Removes the front, or null.",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "E", desc: "removed front element, or null if empty" },
  },
  pollLast: {
    sig: "deque.pollLast()",
    desc: "Removes the back, or null.",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "E", desc: "removed back element, or null if empty" },
  },
  peekFirst: {
    sig: "deque.peekFirst()",
    desc: "Reads the front without removing it.",
    params: [
    ],
    returns: { type: "E", desc: "front element, left in place; null if empty" },
  },
  PriorityQueue: {
    sig: "new PriorityQueue<>(comparator?)",
    desc: "Binary heap; smallest element first by natural order or the given comparator.",
    params: [
      { name: "comparator", type: "Comparator<E>", desc: "optional ordering; also accepts a capacity or collection first" },
    ],
    returns: { type: "PriorityQueue<E>", desc: "new empty heap" },
  },
  ArrayDeque: {
    sig: "new ArrayDeque<>()",
    desc: "Resizable double-ended queue: fast stack and queue. No nulls.",
    params: [
    ],
    returns: { type: "ArrayDeque<E>", desc: "new empty deque (optional initial capacity or collection)" },
  },
  HashMap: {
    sig: "new HashMap<>()",
    desc: "Hash table map; no ordering.",
    params: [
    ],
    returns: { type: "HashMap<K, V>", desc: "new empty map (optional capacity or map to copy)" },
  },
  HashSet: {
    sig: "new HashSet<>()",
    desc: "Hash table set; no ordering.",
    params: [
    ],
    returns: { type: "HashSet<E>", desc: "new empty set (optional capacity or collection to copy)" },
  },
  ArrayList: {
    sig: "new ArrayList<>(collection?)",
    desc: "Resizable array list; optionally copies another collection.",
    params: [
      { name: "collection", type: "Collection<E>", desc: "optional elements to copy; an int gives initial capacity" },
    ],
    returns: { type: "ArrayList<E>", desc: "new list" },
  },
  TreeMap: {
    sig: "new TreeMap<>()",
    desc: "Sorted map (red-black tree).",
    cost: "O(log n) operations",
    params: [
    ],
    returns: { type: "TreeMap<K, V>", desc: "new empty sorted map (optional comparator or map to copy)" },
  },
  floorKey: {
    sig: "treeMap.floorKey(x)",
    desc: "Greatest key ≤ x, or null.",
    cost: "O(log n)",
    params: [
      { name: "x", type: "K", desc: "key to compare against" },
    ],
    returns: { type: "K", desc: "greatest key at most x, or null" },
  },
  ceilingKey: {
    sig: "treeMap.ceilingKey(x)",
    desc: "Smallest key ≥ x, or null.",
    cost: "O(log n)",
    params: [
      { name: "x", type: "K", desc: "key to compare against" },
    ],
    returns: { type: "K", desc: "smallest key at least x, or null" },
  },
  sort: {
    sig: "Arrays.sort(a[, from, to][, cmp]) / Collections.sort(list) / list.sort(cmp)",
    desc: "Sorts in place. from/to bound a sub-range (to exclusive); cmp(a, b) < 0 puts a first.",
    cost: "O(n log n)",
    params: [
      { name: "a", type: "T[] / int[] / List<T>", desc: "array or list to sort" },
      { name: "from, to", type: "int", desc: "optional sub-range (to exclusive), arrays only" },
      { name: "cmp", type: "Comparator<T>", desc: "optional ordering; needs object elements, not int[]" },
    ],
    returns: { type: "void", desc: "a is sorted in place" },
  },
  binarySearch: {
    sig: "Arrays.binarySearch(a, key)",
    desc: "Index of key in a sorted array, else −(insertion point) − 1.",
    cost: "O(log n)",
    params: [
      { name: "a", type: "int[]", desc: "array, already sorted" },
      { name: "key", type: "int", desc: "value to find" },
    ],
    returns: { type: "int", desc: "index of key, or negative if absent (-(insertion point) - 1)" },
  },
  fill: {
    sig: "Arrays.fill(a, value)",
    desc: "Sets every element to value.",
    cost: "O(n)",
    params: [
      { name: "a", type: "int[]", desc: "array to overwrite" },
      { name: "value", type: "int", desc: "value for every slot" },
    ],
    returns: { type: "void", desc: "a filled in place" },
  },
  copyOf: {
    sig: "Arrays.copyOf(a, newLength)",
    desc: "New array copying a, truncated or padded with zeros.",
    params: [
      { name: "a", type: "int[]", desc: "source array" },
      { name: "newLength", type: "int", desc: "length of the copy" },
    ],
    returns: { type: "int[]", desc: "new array; extra slots are 0 (false, null)" },
  },
  copyOfRange: {
    sig: "Arrays.copyOfRange(a, from, to)",
    desc: "New array with a[from..to) (to exclusive).",
    params: [
      { name: "a", type: "int[]", desc: "source array" },
      { name: "from", type: "int", desc: "first index, included" },
      { name: "to", type: "int", desc: "end index, excluded (may exceed length)" },
    ],
    returns: { type: "int[]", desc: "new array of length to - from" },
  },
  charAt: {
    sig: "str.charAt(i)",
    desc: "The char at index i.",
    cost: "O(1)",
    params: [
      { name: "i", type: "int", desc: "index, 0-based" },
    ],
    returns: { type: "char", desc: "character there; throws if out of range" },
  },
  length: {
    sig: "str.length() / array.length",
    desc: "String length (method) or array length (field).",
    params: [
    ],
    returns: { type: "int", desc: "characters in the string, or slots in the array" },
  },
  substring: {
    sig: "str.substring(begin[, end])",
    desc: "Characters from begin up to (not including) end.",
    cost: "O(length)",
    params: [
      { name: "begin", type: "int", desc: "first index, included" },
      { name: "end", type: "int", desc: "optional end index, excluded (default: string end)" },
    ],
    returns: { type: "String", desc: "new string of that slice" },
  },
  indexOf: {
    sig: "str.indexOf(s) / list.indexOf(o)",
    desc: "First index of s/o, or −1.",
    cost: "O(n)",
    params: [
      { name: "s / o", type: "String / Object", desc: "text or element to find (String also takes a char)" },
    ],
    returns: { type: "int", desc: "first index, or -1 if absent" },
  },
  toCharArray: {
    sig: "str.toCharArray()",
    desc: "New char[] copy of the string.",
    params: [
    ],
    returns: { type: "char[]", desc: "new array of the characters" },
  },
  append: {
    sig: "sb.append(x)",
    desc: "Appends x’s text to the StringBuilder; returns the builder so calls chain.",
    cost: "O(1) amortised",
    params: [
      { name: "x", type: "Object", desc: "any value: String, char, int, ... its text is added" },
    ],
    returns: { type: "StringBuilder", desc: "same builder, so calls chain" },
  },
  reverse: {
    sig: "sb.reverse() / Collections.reverse(list)",
    desc: "Reverses in place.",
    cost: "O(n)",
    params: [
      { name: "list", type: "List<?>", desc: "list to reverse (Collections form; sb.reverse() takes none)" },
    ],
    returns: { type: "void / StringBuilder", desc: "Collections: void, list reversed in place; sb: the same builder" },
  },
  toString: {
    sig: "x.toString() / Arrays.toString(a)",
    desc: "Text form; Arrays.toString prints array contents.",
    params: [
      { name: "a", type: "int[]", desc: "array to print (Arrays form; x.toString() takes none)" },
    ],
    returns: { type: "String", desc: "text form" },
  },
  split: {
    sig: "str.split(regex)",
    desc: "Splits around matches of a regular expression (escape . | etc.).",
    params: [
      { name: "regex", type: "String", desc: "pattern to split on; escape . | + etc." },
      { name: "limit", type: "int", desc: "optional cap on number of pieces" },
    ],
    returns: { type: "String[]", desc: "pieces; trailing empty strings are dropped" },
  },
  join: {
    sig: "String.join(delimiter, elements)",
    desc: "Joins strings with the delimiter between them.",
    params: [
      { name: "delimiter", type: "CharSequence", desc: "text placed between items" },
      { name: "elements", type: "Iterable<String> / String...", desc: "strings to join" },
    ],
    returns: { type: "String", desc: "joined text" },
  },
  equals: {
    sig: "a.equals(b) / Arrays.equals(a, b) / Objects.equals(a, b)",
    desc: "Content equality (use instead of == for objects).",
    params: [
      { name: "b", type: "Object", desc: "value to compare with (Arrays/Objects forms take both a and b)" },
    ],
    returns: { type: "boolean", desc: "true if contents are equal" },
  },
  compareTo: {
    sig: "a.compareTo(b)",
    desc: "Negative if a < b, 0 if equal, positive if a > b.",
    params: [
      { name: "b", type: "T", desc: "value to compare with" },
    ],
    returns: { type: "int", desc: "negative, 0 or positive (a before, equal, after b)" },
  },
  parseInt: {
    sig: "Integer.parseInt(s)",
    desc: "Parses a decimal int; throws NumberFormatException on bad input.",
    params: [
      { name: "s", type: "String", desc: "decimal digits, optional leading sign" },
      { name: "radix", type: "int", desc: "optional base (default 10)" },
    ],
    returns: { type: "int", desc: "parsed value; throws NumberFormatException on bad input" },
  },
  valueOf: {
    sig: "String.valueOf(x) / Integer.valueOf(i)",
    desc: "String form of x / boxed Integer (cached for −128..127).",
    params: [
      { name: "x", type: "Object / int / char", desc: "value to convert (Integer.valueOf also takes a String)" },
    ],
    returns: { type: "String / Integer", desc: "String form, or the boxed Integer" },
  },
  max: {
    sig: "Math.max(a, b) / Collections.max(c)",
    desc: "Larger of two values.",
    params: [
      { name: "a, b", type: "int / long / double", desc: "two values (Collections.max takes one collection)" },
    ],
    returns: { type: "int / long / double", desc: "larger value (same type as inputs)" },
  },
  min: {
    sig: "Math.min(a, b)",
    desc: "Smaller of two values.",
    params: [
      { name: "a, b", type: "int / long / double", desc: "two values" },
    ],
    returns: { type: "int / long / double", desc: "smaller value (same type as inputs)" },
  },
  abs: {
    sig: "Math.abs(x)",
    desc: "Absolute value (Math.abs(Integer.MIN_VALUE) overflows).",
    params: [
      { name: "x", type: "int / long / double", desc: "value" },
    ],
    returns: { type: "int / long / double", desc: "absolute value, same type as x" },
  },
  pow: {
    sig: "Math.pow(a, b)",
    desc: "a^b as a double.",
    params: [
      { name: "a", type: "double", desc: "base" },
      { name: "b", type: "double", desc: "exponent" },
    ],
    returns: { type: "double", desc: "a to the power b" },
  },
  sqrt: {
    sig: "Math.sqrt(x)",
    desc: "Square root as a double.",
    params: [
      { name: "x", type: "double", desc: "value, should be 0 or more" },
    ],
    returns: { type: "double", desc: "square root (NaN if x < 0)" },
  },
  bitCount: {
    sig: "Integer.bitCount(i) / Long.bitCount(l)",
    desc: "Number of 1-bits.",
    params: [
      { name: "i", type: "int / long", desc: "value to inspect" },
    ],
    returns: { type: "int", desc: "number of 1-bits" },
  },
  floorMod: {
    sig: "Math.floorMod(a, b)",
    desc: "Modulo with the sign of b (non-negative for positive b).",
    params: [
      { name: "a", type: "int / long", desc: "dividend" },
      { name: "b", type: "int / long", desc: "divisor, not 0" },
    ],
    returns: { type: "int / long", desc: "a mod b, sign of b" },
  },
  addExact: {
    sig: "Math.addExact(a, b)",
    desc: "a + b, throwing ArithmeticException on overflow.",
    params: [
      { name: "a", type: "int / long", desc: "first value" },
      { name: "b", type: "int / long", desc: "second value" },
    ],
    returns: { type: "int / long", desc: "a + b; throws ArithmeticException on overflow" },
  },
  stream: {
    sig: "Arrays.stream(a) / list.stream()",
    desc: "A stream for map/filter/sum-style pipelines.",
    params: [
      { name: "a", type: "T[]", desc: "array to stream (the list form takes none)" },
    ],
    returns: { type: "Stream<T>", desc: "new stream (IntStream for int[])" },
  },
  repeat: {
    sig: "str.repeat(n)",
    desc: "The string repeated n times (Java 11+).",
    params: [
      { name: "n", type: "int", desc: "times to repeat, 0 or more" },
    ],
    returns: { type: "String", desc: "new string, n copies joined" },
  },
  format: {
    sig: "String.format(fmt, args...)",
    desc: "printf-style formatting: %d int, %s string, %.2f two decimals.",
    params: [
      { name: "fmt", type: "String", desc: "pattern with %d, %s, %.2f ..." },
      { name: "args", type: "Object...", desc: "values for the placeholders, in order" },
    ],
    returns: { type: "String", desc: "formatted text" },
  },
  reverseOrder: {
    sig: "Collections.reverseOrder()",
    desc: "Comparator for descending natural order.",
    params: [
    ],
    returns: { type: "Comparator<T>", desc: "comparator giving descending natural order" },
  },
  comparingInt: {
    sig: "Comparator.comparingInt(keyFn)",
    desc: "Comparator that compares by an int key.",
    params: [
      { name: "keyFn", type: "ToIntFunction<T>", desc: "pulls an int key from each element" },
    ],
    returns: { type: "Comparator<T>", desc: "comparator ordering by that key, ascending" },
  },
  thenComparing: {
    sig: "cmp.thenComparing(other)",
    desc: "Uses other to break ties.",
    params: [
      { name: "other", type: "Comparator<T>", desc: "tie-breaker; a key function also works" },
    ],
    returns: { type: "Comparator<T>", desc: "new comparator: this one, then other on ties" },
  },
  compare: {
    sig: "Integer.compare(a, b)",
    desc: "Negative/0/positive without the overflow risk of a − b.",
    params: [
      { name: "a", type: "int", desc: "first value" },
      { name: "b", type: "int", desc: "second value" },
    ],
    returns: { type: "int", desc: "negative, 0 or positive (a less, equal, greater)" },
  },
  println: {
    sig: "System.out.println(x)",
    desc: "Prints x and a newline.",
    params: [
      { name: "x", type: "Object", desc: "anything printable (String, int, char[], ...)" },
    ],
    returns: { type: "void", desc: "x and a newline are printed" },
  },
  mapToInt: {
    sig: "stream.mapToInt(fn)",
    desc: "Converts a Stream<T> to an IntStream (e.g. Integer::intValue).",
    params: [
      { name: "fn", type: "ToIntFunction<T>", desc: "turns each element into an int, e.g. Integer::intValue" },
    ],
    returns: { type: "IntStream", desc: "stream of the ints" },
  },
  toArray: {
    sig: "stream.toArray()",
    desc: "Collects the stream into an array.",
    params: [
    ],
    returns: { type: "int[] / Object[]", desc: "new array of the stream's elements (IntStream gives int[])" },
  },
  forEach: {
    sig: "iterable.forEach(action)",
    desc: "Runs action on every element.",
    params: [
      { name: "action", type: "Consumer<T>", desc: "runs on each element, e.g. System.out::println" },
    ],
    returns: { type: "void", desc: "nothing changes unless action does" },
  },
  floor: {
    sig: "Math.floor(x) / treeSet.floor(x)",
    desc: "Math.floor: largest whole number ≤ x, as a double. TreeSet.floor: largest element ≤ x, or null (O(log n); ceiling is the ≥ version).",
    params: [
      { name: "x", type: "double / E", desc: "number (Math), or element to compare (TreeSet)" },
    ],
    returns: { type: "double / E", desc: "Math: whole number as double; TreeSet: largest element at most x or null" },
  },
  ceil: {
    sig: "Math.ceil(x)",
    desc: "Smallest whole number ≥ x, as a double.",
    params: [
      { name: "x", type: "double", desc: "value to round up" },
    ],
    returns: { type: "double", desc: "smallest whole number at least x, as a double" },
  },
  round: {
    sig: "Math.round(x)",
    desc: "Nearest whole number, .5 rounding up: a long for a double, an int for a float.",
    params: [
      { name: "x", type: "double / float", desc: "value to round" },
    ],
    returns: { type: "long / int", desc: "nearest whole number (long for double, int for float)" },
  },
  floorDiv: {
    sig: "Math.floorDiv(a, b)",
    desc: "a / b rounded down (toward negative infinity), unlike / which truncates toward zero.",
    params: [
      { name: "a", type: "int / long", desc: "dividend" },
      { name: "b", type: "int / long", desc: "divisor, not 0" },
    ],
    returns: { type: "int / long", desc: "a / b rounded toward negative infinity" },
  },
  numberOfLeadingZeros: {
    sig: "Integer.numberOfLeadingZeros(i)",
    desc: "Zero bits above the highest 1-bit (32 for 0). 31 minus it is floor(log2 i).",
    params: [
      { name: "i", type: "int", desc: "value to inspect" },
    ],
    returns: { type: "int", desc: "count of zero bits above the top 1-bit (32 for 0)" },
  },
  numberOfTrailingZeros: {
    sig: "Integer.numberOfTrailingZeros(i)",
    desc: "Zero bits below the lowest 1-bit (32 for 0): the index of the lowest set bit.",
    params: [
      { name: "i", type: "int", desc: "value to inspect" },
    ],
    returns: { type: "int", desc: "count of zero bits below the lowest 1-bit (32 for 0)" },
  },
  toBinaryString: {
    sig: "Integer.toBinaryString(i)",
    desc: "Binary digits as a string, no leading zeros (two's complement for negatives).",
    params: [
      { name: "i", type: "int", desc: "value to convert" },
    ],
    returns: { type: "String", desc: "binary digits, no leading zeros" },
  },
  toHexString: {
    sig: "Integer.toHexString(i)",
    desc: "Hex digits as a string, no leading zeros.",
    params: [
      { name: "i", type: "int", desc: "value to convert" },
    ],
    returns: { type: "String", desc: "hex digits, no leading zeros" },
  },
  parseLong: {
    sig: "Long.parseLong(s[, radix])",
    desc: "Parses a long in the given base (2–36).",
    params: [
      { name: "s", type: "String", desc: "digits, optional leading sign" },
      { name: "radix", type: "int", desc: "optional base 2-36 (default 10)" },
    ],
    returns: { type: "long", desc: "parsed value; throws NumberFormatException on bad input" },
  },
  clamp: {
    sig: "Math.clamp(value, min, max)",
    desc: "value limited to [min, max] (Java 21).",
    params: [
      { name: "value", type: "long / double", desc: "number to limit" },
      { name: "min", type: "int / long / double", desc: "lower bound" },
      { name: "max", type: "int / long / double", desc: "upper bound" },
    ],
    returns: { type: "int / long / double", desc: "value limited to min..max" },
  },
  log: {
    sig: "Math.log(x)",
    desc: "Natural logarithm as a double. Divide by Math.log(2) for log2.",
    params: [
      { name: "x", type: "double", desc: "value, should be above 0" },
    ],
    returns: { type: "double", desc: "natural log (NaN if x < 0, -Infinity at 0)" },
  },
  log10: {
    sig: "Math.log10(x)",
    desc: "Base-10 logarithm as a double.",
    params: [
      { name: "x", type: "double", desc: "value, should be above 0" },
    ],
    returns: { type: "double", desc: "base-10 log" },
  },
  hypot: {
    sig: "Math.hypot(x, y)",
    desc: "sqrt(x² + y²) without intermediate overflow.",
    params: [
      { name: "x", type: "double", desc: "first side" },
      { name: "y", type: "double", desc: "second side" },
    ],
    returns: { type: "double", desc: "sqrt(x*x + y*y)" },
  },
  putIfAbsent: {
    sig: "map.putIfAbsent(k, v)",
    desc: "Stores v only if k has no value; returns the existing value or null.",
    params: [
      { name: "k", type: "K", desc: "key to check" },
      { name: "v", type: "V", desc: "value to store if k has none" },
    ],
    returns: { type: "V", desc: "existing value, or null if v was stored" },
  },
  compute: {
    sig: "map.compute(k, (key, old) -> newValue)",
    desc: "Replaces k's value with the function's result (old is null if absent); null removes k.",
    params: [
      { name: "k", type: "K", desc: "key to update" },
      { name: "fn", type: "BiFunction<K, V, V>", desc: "gets key and old value (null if absent); gives the new value" },
    ],
    returns: { type: "V", desc: "new value, or null if k was removed" },
  },
  computeIfPresent: {
    sig: "map.computeIfPresent(k, (key, old) -> newValue)",
    desc: "Like compute, but only when k is present.",
    params: [
      { name: "k", type: "K", desc: "key to update" },
      { name: "fn", type: "BiFunction<K, V, V>", desc: "gets key and old value; gives the new value" },
    ],
    returns: { type: "V", desc: "new value, or null if k is absent or was removed" },
  },
  firstKey: {
    sig: "treeMap.firstKey() / lastKey()",
    desc: "Smallest / largest key (throws if empty).",
    cost: "O(log n)",
    params: [
    ],
    returns: { type: "K", desc: "smallest key (lastKey: largest); throws NoSuchElementException if empty" },
  },
  higherKey: {
    sig: "treeMap.higherKey(x) / lowerKey(x)",
    desc: "Smallest key > x / largest key < x, or null.",
    cost: "O(log n)",
    params: [
      { name: "x", type: "K", desc: "key to compare against" },
    ],
    returns: { type: "K", desc: "smallest key above x (lowerKey: largest below), or null" },
  },
  pollFirstEntry: {
    sig: "treeMap.pollFirstEntry()",
    desc: "Removes and returns the smallest entry (null if empty).",
    cost: "O(log n)",
    params: [
    ],
    returns: { type: "Map.Entry<K, V>", desc: "removed smallest entry, or null if empty" },
  },
  headMap: {
    sig: "treeMap.headMap(x) / tailMap(x)",
    desc: "A live view of keys < x / ≥ x.",
    params: [
      { name: "x", type: "K", desc: "boundary key; tailMap takes the same" },
    ],
    returns: { type: "SortedMap<K, V>", desc: "live view of keys below x (tailMap: x and above)" },
  },
  higher: {
    sig: "treeSet.higher(x) / lower(x)",
    desc: "Smallest element > x / largest < x, or null.",
    cost: "O(log n)",
    params: [
      { name: "x", type: "E", desc: "element to compare against" },
    ],
    returns: { type: "E", desc: "smallest element above x (lower: largest below), or null" },
  },
  retainAll: {
    sig: "set.retainAll(other)",
    desc: "Keeps only elements also in other (intersection, in place).",
    params: [
      { name: "other", type: "Collection<?>", desc: "elements to keep" },
    ],
    returns: { type: "boolean", desc: "true if the set changed" },
  },
  removeAll: {
    sig: "set.removeAll(other)",
    desc: "Removes every element that is in other (difference, in place).",
    params: [
      { name: "other", type: "Collection<?>", desc: "elements to delete" },
    ],
    returns: { type: "boolean", desc: "true if the set changed" },
  },
  removeIf: {
    sig: "collection.removeIf(predicate)",
    desc: "Removes every element matching the predicate.",
    cost: "O(n)",
    params: [
      { name: "predicate", type: "Predicate<E>", desc: "true for elements to delete" },
    ],
    returns: { type: "boolean", desc: "true if anything was removed" },
  },
  deepToString: {
    sig: "Arrays.deepToString(array)",
    desc: "Readable text for nested arrays like int[][].",
    params: [
      { name: "array", type: "Object[]", desc: "array, possibly nested, e.g. int[][]" },
    ],
    returns: { type: "String", desc: "text like [[1, 2], [3, 4]]" },
  },
  asList: {
    sig: "Arrays.asList(a, b, …)",
    desc: "A fixed-size list view backed by an array (set works, add/remove throw).",
    params: [
      { name: "a, b, ...", type: "T...", desc: "elements, or one T[] array" },
    ],
    returns: { type: "List<T>", desc: "fixed-size list backed by the array" },
  },
  swap: {
    sig: "Collections.swap(list, i, j)",
    desc: "Swaps two positions in a list.",
    params: [
      { name: "list", type: "List<?>", desc: "list to change" },
      { name: "i", type: "int", desc: "first index" },
      { name: "j", type: "int", desc: "second index" },
    ],
    returns: { type: "void", desc: "elements at i and j swapped in place" },
  },
  frequency: {
    sig: "Collections.frequency(collection, x)",
    desc: "How many elements equal x.",
    cost: "O(n)",
    params: [
      { name: "collection", type: "Collection<?>", desc: "where to count" },
      { name: "x", type: "Object", desc: "value to count" },
    ],
    returns: { type: "int", desc: "number of elements equal to x" },
  },
  insert: {
    sig: "sb.insert(index, value)",
    desc: "Inserts text at index.",
    cost: "O(n)",
    params: [
      { name: "index", type: "int", desc: "position to insert at" },
      { name: "value", type: "Object", desc: "text, char, int, ... to insert" },
    ],
    returns: { type: "StringBuilder", desc: "same builder, so calls chain" },
  },
  deleteCharAt: {
    sig: "sb.deleteCharAt(index)",
    desc: "Removes one character.",
    cost: "O(n)",
    params: [
      { name: "index", type: "int", desc: "position to delete" },
    ],
    returns: { type: "StringBuilder", desc: "same builder; throws if index out of range" },
  },
  setCharAt: {
    sig: "sb.setCharAt(index, c)",
    desc: "Replaces one character.",
    cost: "O(1)",
    params: [
      { name: "index", type: "int", desc: "position to replace" },
      { name: "c", type: "char", desc: "new character" },
    ],
    returns: { type: "void", desc: "builder changed in place" },
  },
  chars: {
    sig: "str.chars()",
    desc: "An IntStream of the characters.",
    params: [
    ],
    returns: { type: "IntStream", desc: "characters as int codes (cast to char when needed)" },
  },
  removeEldestEntry: {
    sig: "LinkedHashMap.removeEldestEntry(eldest)",
    desc: "Override to return true when the oldest entry should be evicted after a put.",
    params: [
      { name: "eldest", type: "Map.Entry<K, V>", desc: "oldest entry, checked after each put" },
    ],
    returns: { type: "boolean", desc: "true to evict eldest; default is false" },
  },
  groupingBy: {
    sig: "Collectors.groupingBy(keyFn, downstream)",
    desc: "Builds a map from key to a collected group (a list, a count, …).",
    params: [
      { name: "keyFn", type: "Function<T, K>", desc: "picks each element's group key" },
      { name: "downstream", type: "Collector<T, ?, D>", desc: "optional; how to collect each group (default: a list)" },
    ],
    returns: { type: "Collector<T, ?, Map<K, D>>", desc: "collector for stream.collect(...), gives a map" },
  },
  range: {
    sig: "IntStream.range(a, b) / rangeClosed(a, b)",
    desc: "The ints from a up to b (excluded / included).",
    params: [
      { name: "a", type: "int", desc: "first value, included" },
      { name: "b", type: "int", desc: "end value (excluded for range, included for rangeClosed)" },
    ],
    returns: { type: "IntStream", desc: "ints in the range" },
  },
  peekLast: {
    sig: "deque.peekLast() / peekFirst()",
    desc: "Looks at the last / first element without removing it (null if empty).",
    cost: "O(1)",
    params: [
    ],
    returns: { type: "E", desc: "last element, left in place; null if empty (peekFirst: first)" },
  },
};
