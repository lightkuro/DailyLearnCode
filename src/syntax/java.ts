import type { SyntaxSheet } from "./types";

export const java: SyntaxSheet = {
  lang: "java",
  common: [
    {
      label: "Variables",
      code: 'int x = 5;\nlong big = 1L << 40;\nvar name = "Ada";',
    },
    {
      label: "Array",
      code: "int[] a = new int[n];\nint[] b = {1, 2, 3};\nint len = a.length;",
    },
    {
      label: "ArrayList",
      code: "List<Integer> list = new ArrayList<>();\nlist.add(x); list.get(i); list.size();",
    },
    {
      label: "HashMap counting",
      code: "Map<String, Integer> cnt = new HashMap<>();\ncnt.merge(k, 1, Integer::sum);\ncnt.getOrDefault(k, 0);",
    },
    {
      label: "Loops",
      code: "for (int i = 0; i < n; i++) { }\nfor (int x : a) { }",
    },
    {
      label: "Sort",
      code: "Arrays.sort(a);\nlist.sort((p, q) -> Integer.compare(q, p));",
    },
    {
      label: "Stack & queue",
      code: "Deque<Integer> st = new ArrayDeque<>();\nst.push(x); st.peek(); st.pop();\nQueue<Integer> q = new ArrayDeque<>();\nq.offer(x); q.poll();",
    },
    {
      label: "Heap (min)",
      code: "PriorityQueue<int[]> pq =\n    new PriorityQueue<>((p, q) -> p[0] - q[0]);\npq.offer(new int[]{d, v}); pq.poll();",
    },
    {
      label: "Limits",
      code: "Integer.MAX_VALUE  Integer.MIN_VALUE\nLong.MAX_VALUE",
    },
    {
      label: "String basics",
      code: "s.charAt(i)  s.length()\ns.substring(i, j)  // [i, j)",
    },
  ],
  categories: [
    {
      id: "basics",
      title: "Basics",
      icon: "🧱",
      items: [
        {
          label: "Primitive types",
          code: "int i; long l; double d; boolean b; char c;",
        },
        {
          label: "Boxed types",
          code: "Integer n = 5;  // null-able, use in collections\nint k = n;      // unboxing",
        },
        {
          label: "Casting",
          code: "int i = (int) 3.9;      // 3\nlong l = (long) a * b;  // avoid overflow\ndouble d = (double) x / y;",
        },
        {
          label: "Parse & toString",
          code: 'Integer.parseInt("42")\nString.valueOf(7)  Integer.toString(7)',
        },
        { label: "Ternary", code: "int sign = x >= 0 ? 1 : -1;" },
        {
          label: "Print / debug",
          code: "System.out.println(x);\nSystem.out.println(Arrays.toString(a));",
        },
        {
          label: "Comparing objects",
          code: "a.equals(b)          // Strings, Integers\nObjects.equals(a, b) // null-safe",
        },
        {
          label: "Integer division & modulo",
          code: "7 / 2   // 3\n-7 / 2  // -3 (truncates)\nMath.floorMod(-7, 3) // 2",
        },
      ],
    },
    {
      id: "create",
      title: "Creating values",
      icon: "🧪",
      items: [
        {
          label: "Primitives",
          code: "int i = 0;\nlong big = 1L << 40;\ndouble d = 3.5;\nboolean ok = true;\nchar c = 'a';",
        },
        {
          label: "Wrapper types",
          code: "Integer boxed = 5;      // for generics\nint back = boxed;\nInteger.MAX_VALUE",
        },
        {
          label: "Arrays",
          code: "int[] a = new int[n];      // all zeros\nint[] b = {1, 2, 3};\nArrays.fill(a, -1);",
        },
        {
          label: "2-D array",
          code: "int[][] grid = new int[rows][cols];\nboolean[][] seen = new boolean[r][c];\nint rows = grid.length, cols = grid[0].length;",
        },
        {
          label: "String & builder",
          code: 'String s = "abc";\nchar c = s.charAt(0);\nStringBuilder sb = new StringBuilder();',
        },
        {
          label: "Lists",
          code: "List<Integer> list = new ArrayList<>();\nList<Integer> fixed = List.of(1, 2, 3); // immutable\nList<int[]> pairs = new ArrayList<>();",
        },
        {
          label: "Maps & sets",
          code: "Map<String, Integer> m = new HashMap<>();\nSet<Integer> seen = new HashSet<>();\nTreeMap<Integer, Integer> sorted = new TreeMap<>();",
        },
        {
          label: "Queues & heaps",
          code: "Deque<Integer> q = new ArrayDeque<>();\nPriorityQueue<Integer> min = new PriorityQueue<>();\nPriorityQueue<Integer> max = new PriorityQueue<>(Collections.reverseOrder());",
        },
      ],
    },
    {
      id: "strings",
      title: "Strings",
      icon: "🔤",
      items: [
        {
          label: "Index, slice, length",
          code: "s.charAt(i)  s.length()\ns.substring(i)  s.substring(i, j)",
        },
        {
          label: "StringBuilder",
          code: 'StringBuilder sb = new StringBuilder();\nsb.append(c).append("x");\nsb.reverse(); sb.toString();',
        },
        {
          label: "Split & join",
          code: 'String[] parts = s.split(" ");\nString.join(",", list)',
        },
        {
          label: "Find & replace",
          code: 's.indexOf("ab")  // -1 if absent\ns.contains("ab")  s.replace("a", "b")',
        },
        {
          label: "Char helpers",
          code: "Character.isDigit(c)  Character.isLetter(c)\nCharacter.toLowerCase(c)\nint idx = c - 'a';",
        },
        {
          label: "char[] round trip",
          code: "char[] cs = s.toCharArray();\nArrays.sort(cs);\nString key = new String(cs);",
        },
        {
          label: "Compare",
          code: "s.equals(t)  s.compareTo(t)\ns.equalsIgnoreCase(t)",
        },
        {
          label: "Case & trim",
          code: "s.toLowerCase()  s.toUpperCase()  s.trim()",
        },
        {
          label: "Repeat & format",
          code: '"ab".repeat(3)\nString.format("%d:%s", n, s)',
        },
        {
          label: "Split variations",
          code: "s.split(\" \")       // \"\" parts on double spaces\ns.trim().split(\"\\\\s+\")\ns.split(\",\", -1)   // keep trailing empties\nString.join(\",\", parts)",
        },
        {
          label: "StringBuilder edits",
          code: "sb.insert(0, 'x');\nsb.deleteCharAt(sb.length() - 1);\nsb.setCharAt(i, 'z');\nsb.reverse().toString()",
        },
        {
          label: "Letter counts (26)",
          code: "int[] cnt = new int[26];\nfor (char c : s.toCharArray()) cnt[c - 'a']++;\nString key = Arrays.toString(cnt);",
        },
        {
          label: "char ↔ int",
          code: "int d = c - '0';           // '7' becomes 7\nchar ch = (char) ('a' + i);\nString one = String.valueOf(c);",
        },
        {
          label: "chars() stream",
          code: "long digits = s.chars().filter(Character::isDigit).count();\nboolean allLower = s.chars().allMatch(Character::isLowerCase);",
        },
      ],
    },
    {
      id: "lists",
      title: "Arrays & lists",
      icon: "📚",
      items: [
        {
          label: "2D array",
          code: "int[][] grid = new int[rows][cols];\nint rows = grid.length, cols = grid[0].length;",
        },
        {
          label: "Fill & copy",
          code: "Arrays.fill(a, -1);\nint[] b = Arrays.copyOf(a, a.length);\nint[] c = Arrays.copyOfRange(a, i, j);",
        },
        {
          label: "List ops",
          code: "list.add(i, x);   // insert\nlist.remove(list.size() - 1);\nlist.set(i, x);  list.contains(x);",
        },
        {
          label: "remove(int) vs remove(Object)",
          code: "list.remove(0);                  // by index\nlist.remove(Integer.valueOf(7)); // by value",
        },
        {
          label: "Array ↔ list",
          code: "List<Integer> l = new ArrayList<>(List.of(1, 2, 3));\nint[] arr = l.stream().mapToInt(Integer::intValue).toArray();",
        },
        {
          label: "List of lists",
          code: "List<List<Integer>> res = new ArrayList<>();\nres.add(new ArrayList<>(path));",
        },
        { label: "Reverse", code: "Collections.reverse(list);" },
        {
          label: "Sum / max (streams)",
          code: "int sum = Arrays.stream(a).sum();\nint mx = Arrays.stream(a).max().getAsInt();",
        },
        {
          label: "Prefix sums",
          code: "long[] pre = new long[n + 1];\nfor (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];",
        },
        {
          label: "Print arrays (debug)",
          code: "Arrays.toString(a)      // [1, 2, 3]\nArrays.deepToString(grid)\nSystem.out.println(list);  // lists print fine",
        },
        {
          label: "Collections helpers",
          code: "Collections.sort(list);\nCollections.reverse(list);\nCollections.swap(list, i, j);\nCollections.max(list);\nCollections.frequency(list, x)",
        },
        {
          label: "List ↔ int[]",
          code: "int[] arr = list.stream().mapToInt(Integer::intValue).toArray();\nList<Integer> back = Arrays.stream(arr).boxed().toList();\nint[][] res = pairs.toArray(new int[0][]);",
        },
        {
          label: "Fixed vs editable lists",
          code: "List.of(1, 2, 3)              // immutable\nArrays.asList(1, 2, 3)        // fixed size\nnew ArrayList<>(List.of(1, 2))  // editable",
        },
        {
          label: "Remove while iterating",
          code: "list.removeIf(x -> x < 0);\nIterator<Integer> it = list.iterator();\nwhile (it.hasNext())\n    if (it.next() == 0) it.remove();",
        },
        {
          label: "Sort a range / compare",
          code: "Arrays.sort(a, from, to);  // [from, to)\nArrays.equals(a, b)\nArrays.fill(row, -1);",
        },
      ],
    },
    {
      id: "maps",
      title: "Maps & sets",
      icon: "🗂️",
      items: [
        {
          label: "HashMap basics",
          code: "map.put(k, v);  map.get(k);  // null if missing\nmap.containsKey(k);  map.remove(k);",
        },
        {
          label: "Defaults & merge",
          code: "map.getOrDefault(k, 0)          // value, or 0 if k is missing\nmap.merge(k, 1, Integer::sum);  // add 1 to k's count",
        },
        {
          label: "Group into lists",
          code: "map.computeIfAbsent(key, z -> new ArrayList<>()).add(x);",
        },
        {
          label: "Iterate",
          code: "for (Map.Entry<String, Integer> e : map.entrySet())\n    use(e.getKey(), e.getValue());\nfor (var k : map.keySet()) { }",
        },
        {
          label: "HashSet",
          code: "Set<Integer> seen = new HashSet<>();\nseen.add(x);  // false if already there\nseen.contains(x);  seen.remove(x);",
        },
        {
          label: "Sorted map / set",
          code: "TreeMap<Integer, Integer> tm = new TreeMap<>();\ntm.floorKey(x)  tm.ceilingKey(x)\ntm.firstKey()  tm.lastKey()",
        },
        {
          label: "Pair-like keys",
          code: 'Set<String> seen = new HashSet<>();\nseen.add(r + "," + c);\n// or encode: r * cols + c',
        },
        {
          label: "putIfAbsent & compute",
          code: "m.putIfAbsent(k, 0);\nm.compute(k, (key, v) -> v == null ? 1 : v + 1);\nm.computeIfPresent(k, (key, v) -> v > 1 ? v - 1 : null);",
        },
        {
          label: "TreeMap navigation",
          code: "tm.firstKey()   tm.lastKey()\ntm.floorKey(x)    // ≤ x, or null\ntm.ceilingKey(x)  // ≥ x\ntm.higherKey(x)   tm.lowerKey(x)\ntm.pollFirstEntry()\ntm.headMap(x)     // keys < x",
        },
        {
          label: "TreeSet navigation",
          code: "ts.first()   ts.last()\nts.floor(x)  ts.ceiling(x)\nts.lower(x)  ts.higher(x)\nts.pollFirst()",
        },
        {
          label: "Sort entries by value",
          code: "var es = new ArrayList<>(m.entrySet());\nes.sort((a, b) -> b.getValue() - a.getValue());\nes.get(0).getKey()   // most frequent",
        },
        {
          label: "LinkedHashMap (LRU)",
          code: "Map<Integer, Integer> lru = new LinkedHashMap<>(16, 0.75f, true) {\n    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> e) {\n        return size() > cap;\n    }\n};",
        },
        {
          label: "Set operations",
          code: "a.retainAll(b);   // a ∩ b\na.addAll(b);      // a ∪ b\na.removeAll(b);   // a − b",
        },
        {
          label: "Count with streams",
          code: "Map<Character, Long> freq = s.chars()\n    .mapToObj(c -> (char) c)\n    .collect(Collectors.groupingBy(c -> c, Collectors.counting()));",
        },
      ],
    },
    {
      id: "stacks",
      title: "Stacks, queues & heaps",
      icon: "🥞",
      items: [
        {
          label: "Stack (ArrayDeque)",
          code: "Deque<Integer> st = new ArrayDeque<>();\nst.push(x);  st.peek();  st.pop();  st.isEmpty();",
        },
        {
          label: "Queue",
          code: "Queue<int[]> q = new ArrayDeque<>();\nq.offer(new int[]{r, c});\nint[] cur = q.poll();",
        },
        {
          label: "Deque both ends",
          code: "dq.offerFirst(x); dq.offerLast(x);\ndq.pollFirst(); dq.pollLast(); dq.peekFirst();",
        },
        {
          label: "Min-heap / max-heap",
          code: "PriorityQueue<Integer> min = new PriorityQueue<>();\nPriorityQueue<Integer> max =\n    new PriorityQueue<>(Collections.reverseOrder());",
        },
        {
          label: "Heap with comparator",
          code: "new PriorityQueue<int[]>((a, b) -> a[1] != b[1]\n    ? Integer.compare(a[1], b[1]) : a[0] - b[0]);",
        },
        {
          label: "BFS template",
          code: "Queue<Integer> q = new ArrayDeque<>(List.of(start));\nboolean[] seen = new boolean[n]; seen[start] = true;\nwhile (!q.isEmpty()) {\n    int u = q.poll();\n    for (int v : adj.get(u)) if (!seen[v]) { seen[v] = true; q.offer(v); }\n}",
        },
        {
          label: "Note",
          code: "// ArrayDeque cannot hold null; use LinkedList if you need nulls",
        },
        {
          label: "Heap of int[]",
          code: "PriorityQueue<int[]> pq =\n    new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));\npq.offer(new int[]{dist, node});\nint[] top = pq.poll();",
        },
        {
          label: "Max-heap shortcuts",
          code: "new PriorityQueue<Integer>(Collections.reverseOrder())\nnew PriorityQueue<Integer>((a, b) -> b - a)  // overflow risk",
        },
        {
          label: "Window max (deque)",
          code: "Deque<Integer> dq = new ArrayDeque<>();  // indexes\nfor (int i = 0; i < a.length; i++) {\n    while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();\n    dq.offerLast(i);\n    if (dq.peekFirst() <= i - k) dq.pollFirst();\n    if (i >= k - 1) res.add(a[dq.peekFirst()]);\n}",
        },
        {
          label: "Monotonic stack (Java)",
          code: "int[] next = new int[n];\nArrays.fill(next, -1);\nDeque<Integer> st = new ArrayDeque<>();\nfor (int i = 0; i < n; i++) {\n    while (!st.isEmpty() && a[st.peek()] < a[i])\n        next[st.pop()] = a[i];\n    st.push(i);\n}",
        },
      ],
    },
    {
      id: "sorting",
      title: "Sorting & searching",
      icon: "🔎",
      items: [
        {
          label: "Sort primitives",
          code: "Arrays.sort(a);\nArrays.sort(a, from, to);",
        },
        {
          label: "Sort descending",
          code: "Integer[] b = {3, 1, 2};\nArrays.sort(b, Collections.reverseOrder());",
        },
        {
          label: "Sort 2D / objects",
          code: "Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));\nlist.sort(Comparator.comparingInt(p -> p.score));",
        },
        {
          label: "Chained comparator",
          code: "list.sort(Comparator.comparing(String::length)\n    .thenComparing(Comparator.reverseOrder()));",
        },
        {
          label: "Binary search",
          code: "int i = Arrays.binarySearch(a, x);\n// i < 0 means insertion point is -i - 1",
        },
        {
          label: "Binary search (manual)",
          code: "int lo = 0, hi = n - 1;\nwhile (lo <= hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (a[mid] < x) lo = mid + 1; else hi = mid - 1;\n}",
        },
        {
          label: "Sort strings by length",
          code: "words.sort(Comparator.comparingInt(String::length)\n    .thenComparing(Comparator.naturalOrder()));",
        },
        {
          label: "Binary search on the answer",
          code: "int lo = 1, hi = maxPile;\nwhile (lo < hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (ok(mid)) hi = mid;\n    else lo = mid + 1;\n}\nreturn lo;  // smallest that works",
        },
      ],
    },
    {
      id: "loops",
      title: "Loops & control flow",
      icon: "🔁",
      items: [
        { label: "Reverse loop", code: "for (int i = n - 1; i >= 0; i--) { }" },
        {
          label: "While / do-while",
          code: "while (l < r) { l++; }\ndo { x /= 2; } while (x > 0);",
        },
        {
          label: "Labeled break",
          code: "outer:\nfor (int i = 0; i < n; i++)\n    for (int j = 0; j < m; j++)\n        if (g[i][j] == 0) break outer;",
        },
        {
          label: "Grid neighbours",
          code: "int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};\nfor (int[] d : dirs) {\n    int nr = r + d[0], nc = c + d[1];\n    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n}",
        },
        {
          label: "Switch",
          code: "switch (c) {\n    case '(' -> open++;\n    case ')' -> open--;\n    default -> { }\n}",
        },
        {
          label: "for-each variants",
          code: "for (int x : nums) { }\nfor (int[] row : grid) { }\nfor (char c : s.toCharArray()) { }\nfor (var e : map.entrySet()) { }",
        },
        {
          label: "IntStream ranges",
          code: "IntStream.range(0, n).forEach(i -> { });\nint total = IntStream.of(a).sum();\nint[] sq = IntStream.rangeClosed(1, n).map(i -> i * i).toArray();",
        },
      ],
    },
    {
      id: "functions",
      title: "Methods & recursion",
      icon: "🧩",
      items: [
        {
          label: "Helper method",
          code: "private int depth(TreeNode node) {\n    if (node == null) return 0;\n    return 1 + Math.max(depth(node.left), depth(node.right));\n}",
        },
        {
          label: "Memoization",
          code: "Map<Integer, Long> memo = new HashMap<>();\nlong f(int i) {\n    if (i <= 1) return 1;\n    if (memo.containsKey(i)) return memo.get(i);\n    long v = f(i - 1) + f(i - 2);\n    memo.put(i, v);\n    return v;\n}",
        },
        {
          label: "Fields as shared state",
          code: "class Solution {\n    private int best = 0;\n    void visit(int x) { best = Math.max(best, x); }\n}",
        },
        {
          label: "Lambdas",
          code: "Comparator<int[]> byEnd = (x, y) -> x[1] - y[1];\nlist.forEach(x -> System.out.println(x));",
        },
        {
          label: "Backtracking",
          code: "void bt(List<Integer> path) {\n    if (done(path)) { out.add(new ArrayList<>(path)); return; }\n    for (int c : choices) { path.add(c); bt(path); path.remove(path.size() - 1); }\n}",
        },
        {
          label: "Memo arrays",
          code: "int[][] memo = new int[n][m];\nfor (int[] row : memo) Arrays.fill(row, -1);\n// if (memo[i][j] != -1) return memo[i][j];",
        },
        {
          label: "var (Java 10+)",
          code: "var map = new HashMap<String, List<Integer>>();\nfor (var e : map.entrySet()) { }",
        },
        {
          label: "Return two values",
          code: "return new int[]{lo, hi};\n// or a record:\nrecord Range(int lo, int hi) {}\nreturn new Range(lo, hi);",
        },
      ],
    },
    {
      id: "classes",
      title: "Classes & nodes",
      icon: "🏗️",
      items: [
        {
          label: "Linked list walk",
          code: "for (ListNode cur = head; cur != null; cur = cur.next) { }",
        },
        {
          label: "Dummy head",
          code: "ListNode dummy = new ListNode(0), tail = dummy;\ntail.next = new ListNode(5); tail = tail.next;\nreturn dummy.next;",
        },
        {
          label: "Tree node",
          code: "TreeNode root = new TreeNode(1, new TreeNode(2), null);",
        },
        {
          label: "Record (Java 16+)",
          code: "record Point(int x, int y) {}\nvar p = new Point(1, 2); p.x();",
        },
        {
          label: "Nested helper class",
          code: "static class State {\n    int node, dist;\n    State(int n, int d) { node = n; dist = d; }\n}",
        },
        {
          label: "Comparable class",
          code: "class Job implements Comparable<Job> {\n    int start, end;\n    public int compareTo(Job o) {\n        return Integer.compare(start, o.start);\n    }\n}",
        },
        {
          label: "Trie node",
          code: "class TrieNode {\n    TrieNode[] kids = new TrieNode[26];\n    boolean end;\n}",
        },
        {
          label: "Records as keys",
          code: "record Point(int x, int y) {}\nSet<Point> seen = new HashSet<>();\nseen.add(new Point(r, c));",
        },
      ],
    },
    {
      id: "math",
      title: "Math & bits",
      icon: "🧮",
      items: [
        {
          label: "Math helpers",
          code: "Math.max(a, b)  Math.min(a, b)  Math.abs(x)\nMath.pow(2, 10)  // double!\nMath.sqrt(x)",
        },
        {
          label: "Overflow-safe",
          code: "long prod = (long) a * b;\nint mid = lo + (hi - lo) / 2;\nMath.addExact(a, b)  // throws on overflow",
        },
        {
          label: "Modulo arithmetic",
          code: "final int MOD = 1_000_000_007;\nans = (ans + x) % MOD;",
        },
        {
          label: "Bit ops",
          code: "a & b  a | b  a ^ b  ~a\n1 << k   x >> 1   x >>> 1  // unsigned shift\nx & (x - 1)",
        },
        {
          label: "Count bits",
          code: "Integer.bitCount(x)\nLong.bitCount(y)\nInteger.toBinaryString(x)",
        },
        {
          label: "gcd",
          code: "int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }",
        },
        { label: "Ceil division", code: "(a + b - 1) / b   // a, b > 0" },
        {
          label: "Floor / ceil / round",
          code: "Math.floor(x)    // double\nMath.ceil(x)     // double\nMath.round(2.5)  // 3 (long)\n(int) -2.7       // -2: truncates",
        },
        {
          label: "floorDiv / floorMod",
          code: "Math.floorDiv(-7, 2)  // -4\nMath.floorMod(-7, 2)  // 1\n-7 / 2                // -3",
        },
        {
          label: "Single bits",
          code: "(x >> k) & 1    // bit k set?\nx | (1 << k)    // set bit k\nx & ~(1 << k)   // clear bit k\nx ^ (1 << k)    // flip bit k\nx & -x          // lowest set bit",
        },
        {
          label: "Logs & powers of two",
          code: "Math.log(n) / Math.log(2)\n// floor(log2 n), exact:\n31 - Integer.numberOfLeadingZeros(n)\n(n & (n - 1)) == 0  // power of 2",
        },
        {
          label: "Bases (binary, hex)",
          code: "Integer.toBinaryString(5) // \"101\"\nInteger.toHexString(255)  // \"ff\"\nInteger.parseInt(\"1011\", 2)\nLong.parseLong(\"ff\", 16)",
        },
        {
          label: "Digits",
          code: "while (n > 0) {\n    int d = n % 10;\n    n /= 10;\n}\nString.valueOf(n).length()",
        },
        {
          label: "Clamp, min / max of many",
          code: "Math.max(a, Math.max(b, c))\nMath.clamp(x, lo, hi)  // Java 21\nArrays.stream(a).max().getAsInt()",
        },
        {
          label: "Doubles",
          code: "Double.MAX_VALUE\nDouble.POSITIVE_INFINITY\nMath.abs(a - b) < 1e-9  // a ≈ b\nMath.hypot(dx, dy)  Math.PI",
        },
      ],
    },
    {
      id: "templates",
      title: "Templates",
      icon: "🧩",
      items: [
        {
          label: "Adjacency list",
          code: "List<List<Integer>> g = new ArrayList<>();\nfor (int i = 0; i < n; i++) g.add(new ArrayList<>());\nfor (int[] e : edges) {\n    g.get(e[0]).add(e[1]);\n    g.get(e[1]).add(e[0]);\n}",
        },
        {
          label: "DFS (recursive)",
          code: "void dfs(int u, boolean[] seen) {\n    seen[u] = true;\n    for (int v : g.get(u))\n        if (!seen[v]) dfs(v, seen);\n}",
        },
        {
          label: "Dijkstra",
          code: "int[] dist = new int[n];\nArrays.fill(dist, Integer.MAX_VALUE);\ndist[src] = 0;\nPriorityQueue<int[]> pq = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));\npq.offer(new int[]{0, src});\nwhile (!pq.isEmpty()) {\n    int[] cur = pq.poll();\n    int d = cur[0], u = cur[1];\n    if (d > dist[u]) continue;  // stale\n    for (int[] e : g.get(u)) {   // e = {v, w}\n        if (d + e[1] < dist[e[0]]) {\n            dist[e[0]] = d + e[1];\n            pq.offer(new int[]{dist[e[0]], e[0]});\n        }\n    }\n}",
        },
        {
          label: "Topological sort",
          code: "int[] indeg = new int[n];\nfor (int[] e : edges) {\n    g.get(e[0]).add(e[1]);\n    indeg[e[1]]++;\n}\nDeque<Integer> q = new ArrayDeque<>();\nfor (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);\nList<Integer> order = new ArrayList<>();\nwhile (!q.isEmpty()) {\n    int u = q.poll();\n    order.add(u);\n    for (int v : g.get(u)) if (--indeg[v] == 0) q.offer(v);\n}\n// order.size() < n means a cycle",
        },
        {
          label: "Union-find",
          code: "int[] parent;\n\nint find(int x) {\n    while (parent[x] != x) x = parent[x] = parent[parent[x]];\n    return x;\n}\n\nboolean union(int a, int b) {\n    int ra = find(a), rb = find(b);\n    if (ra == rb) return false;\n    parent[ra] = rb;\n    return true;\n}\n// parent[i] = i for every i to start",
        },
        {
          label: "Grid DFS (islands)",
          code: "void fill(char[][] grid, int r, int c) {\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return;\n    if (grid[r][c] != '1') return;\n    grid[r][c] = '0';  // mark visited\n    fill(grid, r + 1, c);\n    fill(grid, r - 1, c);\n    fill(grid, r, c + 1);\n    fill(grid, r, c - 1);\n}",
        },
        {
          label: "Bitmask subsets",
          code: "for (int mask = 0; mask < (1 << n); mask++)\n    for (int i = 0; i < n; i++)\n        if ((mask >> i & 1) == 1) { /* a[i] is in */ }",
        },
      ],
    },
  ],
};
