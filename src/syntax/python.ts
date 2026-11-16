import type { SyntaxSheet } from "./types";

export const python: SyntaxSheet = {
  lang: "python3",
  common: [
    { label: "Variables", code: 'x = 5\nname = "Ada"\na, b = b, a  # swap' },
    { label: "List", code: "nums = [1, 2, 3]\nnums.append(4)\nn = len(nums)" },
    {
      label: "Loop with index",
      code: "for i, x in enumerate(nums):\n    print(i, x)",
    },
    {
      label: "Range loop",
      code: "for i in range(n):        # 0..n-1\nfor i in range(n - 1, -1, -1):  # reverse",
    },
    {
      label: "Dict counting",
      code: "count = {}\ncount[k] = count.get(k, 0) + 1\nfreq = Counter(nums)",
    },
    {
      label: "Sort",
      code: "nums.sort()\npairs.sort(key=lambda p: (p[1], -p[0]))\nsorted(nums, reverse=True)",
    },
    {
      label: "Stack & queue",
      code: "stack.append(x); top = stack.pop()\nq = deque([start])\nnode = q.popleft()",
    },
    {
      label: "Heap (min)",
      code: "heap = []\nheappush(heap, (dist, node))\nd, node = heappop(heap)",
    },
    { label: "Infinity", code: 'best = float("inf")\nworst = -float("inf")' },
    {
      label: "String basics",
      code: 's[i]  s[::-1]  len(s)\n" ".join(words)\ns.split()',
    },
  ],
  categories: [
    {
      id: "basics",
      title: "Basics",
      icon: "🧱",
      items: [
        {
          label: "Variables & multiple assignment",
          code: "x = 0\ni, j = 0, len(nums) - 1",
        },
        {
          label: "Types & casting",
          code: 'int("42")  float("3.5")  str(7)\nbool(0)  # False',
        },
        { label: "None checks", code: "if node is None:\n    return 0" },
        { label: "Ternary", code: "sign = 1 if x >= 0 else -1" },
        {
          label: "Print / debug",
          code: 'print(x, y)\nprint(f"i={i} sum={total}")',
        },
        { label: "Comments", code: '# single line\n"""docstring / block"""' },
        {
          label: "Integer division & modulo",
          code: "7 // 2   # 3\n-7 // 2  # -4 (floors)\n-7 % 3   # 2",
        },
        {
          label: "Truthiness",
          code: "if not stack:      # empty\nif nums:           # non-empty",
        },
      ],
    },
    {
      id: "create",
      title: "Creating values",
      icon: "🧪",
      items: [
        {
          label: "Numbers & booleans",
          code: "n = 42\nbig = 10 ** 18     # ints never overflow\nx = 3.5\nok = True",
        },
        {
          label: "Strings & chars",
          code: 's = "abc"\nc = s[0]           # "a": a 1-char string\nempty = ""',
        },
        {
          label: "Lists (arrays)",
          code: "a = [0] * n\nb = [1, 2, 3]\nc = list(range(5))  # [0, 1, 2, 3, 4]",
        },
        {
          label: "2-D list",
          code: "grid = [[0] * cols for _ in range(rows)]\n# not [[0] * cols] * rows: rows would be shared!",
        },
        {
          label: "Tuple",
          code: "p = (r, c)\nr, c = p           # unpack\nsingle = (5,)",
        },
        {
          label: "Dict & set",
          code: 'd = {}\nd = {"a": 1, "b": 2}\ns = set()          # {} is an empty dict\ns = {1, 2, 3}',
        },
        {
          label: "defaultdict & Counter",
          code: 'g = defaultdict(list)\ng[u].append(v)\ncnt = Counter("hello")',
        },
        {
          label: "Deque & heap",
          code: "q = deque()\nq = deque([start])\nh = []\nheapify(nums)      # in place, O(n)",
        },
      ],
    },
    {
      id: "strings",
      title: "Strings",
      icon: "🔤",
      items: [
        { label: "Index, slice, length", code: "s[0]  s[-1]  s[i:j]  len(s)" },
        {
          label: "Reverse / palindrome",
          code: "s[::-1]\nis_pal = s == s[::-1]",
        },
        {
          label: "Split & join",
          code: 'words = s.split()          # on whitespace\nparts = s.split(",")\n"-".join(parts)',
        },
        {
          label: "Find & replace",
          code: 's.find("ab")   # -1 if absent\ns.replace("a", "b")\n"ab" in s',
        },
        {
          label: "Case & checks",
          code: "s.lower()  s.upper()\nc.isdigit()  c.isalpha()  c.isalnum()",
        },
        {
          label: "Char ↔ code",
          code: 'ord("a")   # 97\nchr(97)    # "a"\nidx = ord(c) - ord("a")',
        },
        {
          label: "Build efficiently",
          code: 'parts = []\nparts.append(piece)\nresult = "".join(parts)',
        },
        { label: "Strip & format", code: 's.strip()\nf"{x:.2f}"  f"{n:>5}"' },
        {
          label: "Count & startswith",
          code: 's.count("a")\ns.startswith("pre")  s.endswith("fix")',
        },
        {
          label: "Sorted chars (anagram key)",
          code: 'key = "".join(sorted(word))',
        },
        {
          label: "f-string formatting",
          code: "f\"{x:.2f}\"     # 3.14\nf\"{n:05d}\"     # 00042\nf\"{n:,}\"       # 1,234,567\nf\"{s:>8}\"      # right-align in 8",
        },
        {
          label: "Split variations",
          code: "s.split()         # any whitespace\ns.split(\",\")      # keeps empty parts\ns.split(\",\", 1)   # at most one split\ns.rsplit(\".\", 1)  # from the right\ns.splitlines()",
        },
        {
          label: "Letter counts (26)",
          code: "cnt = [0] * 26\nfor ch in s:\n    cnt[ord(ch) - ord(\"a\")] += 1\nkey = tuple(cnt)  # hashable",
        },
        {
          label: "Partition & pad",
          code: "head, sep, tail = s.partition(\":\")\ns.zfill(5)        # \"00042\"\ns.ljust(8, \".\")   s.rjust(8)\ns.center(9, \"*\")",
        },
        {
          label: "Letter & digit sets",
          code: "import string\nstring.ascii_lowercase  # a..z\nstring.ascii_letters    # a..zA..Z\nstring.digits           # 0..9",
        },
      ],
    },
    {
      id: "lists",
      title: "Lists & arrays",
      icon: "📚",
      items: [
        {
          label: "Create",
          code: "a = [0] * n\ngrid = [[0] * cols for _ in range(rows)]  # not [[0]*cols]*rows!",
        },
        {
          label: "Add & remove",
          code: "a.append(x)\na.insert(i, x)\na.pop()      # last\na.pop(0)     # first (O(n))\na.remove(x)  # first match",
        },
        {
          label: "Slicing & copy",
          code: "a[i:j]  a[:k]  a[k:]\ncopy = a[:]  # or list(a)",
        },
        {
          label: "Comprehensions",
          code: "squares = [x * x for x in nums if x > 0]\npairs = [(i, j) for i in range(n) for j in range(i)]",
        },
        {
          label: "Search",
          code: "x in a           # O(n)\na.index(x)       # first index\nmax(a)  min(a)  sum(a)",
        },
        {
          label: "Reverse",
          code: "a.reverse()      # in place\na[::-1]          # new list",
        },
        {
          label: "Zip & enumerate",
          code: "for x, y in zip(a, b):\nfor i, x in enumerate(a, start=1):",
        },
        {
          label: "Prefix sums",
          code: "pre = [0]\nfor x in nums:\n    pre.append(pre[-1] + x)\n# sum(nums[i:j]) == pre[j] - pre[i]",
        },
        { label: "Matrix dims", code: "rows, cols = len(grid), len(grid[0])" },
        {
          label: "Insert, extend, delete",
          code: "a.insert(i, x)\na.extend([4, 5])\ndel a[i]        # by index\ndel a[i:j]      # a slice\na.remove(x)     # first x (error if none)",
        },
        {
          label: "Count & index",
          code: "a.count(x)\na.index(x)     # first; error if absent\na.index(x, i)  # search from i\nx in a         # O(n) scan",
        },
        {
          label: "Flatten",
          code: "flat = [x for row in grid for x in row]\nlist(chain.from_iterable(grid))",
        },
        {
          label: "Transpose & rotate",
          code: "cols = [list(c) for c in zip(*grid)]\n# rotate 90° clockwise:\nrot = [list(r) for r in\n       zip(*grid[::-1])]",
        },
        {
          label: "Copy a grid",
          code: "g2 = [row[:] for row in grid]\nimport copy\ndeep = copy.deepcopy(board)",
        },
        {
          label: "Index of the max",
          code: "i = max(range(n), key=lambda j: a[j])\norder = sorted(range(n), key=lambda j: a[j])",
        },
      ],
    },
    {
      id: "maps",
      title: "Dicts & sets",
      icon: "🗂️",
      items: [
        {
          label: "Dict basics",
          code: "m = {}\nm[k] = v\nm.get(k, default)\nk in m\ndel m[k]",
        },
        {
          label: "defaultdict",
          code: "groups = defaultdict(list)\ngroups[key].append(x)\nadj = defaultdict(set)",
        },
        {
          label: "Counter",
          code: 'c = Counter(s)\nc.most_common(2)\nc["x"]  # 0 if missing',
        },
        {
          label: "Iterate",
          code: "for k, v in m.items():\nfor k in m:            # keys\nfor v in m.values():",
        },
        {
          label: "Set basics",
          code: "seen = set()\nseen.add(x)\nx in seen\nseen.discard(x)",
        },
        { label: "Set algebra", code: "a | b   a & b   a - b   a ^ b" },
        { label: "Tuple keys", code: "visited = {(r, c)}\nmemo[(i, j)] = ans" },
        {
          label: "Dict comprehension",
          code: "pos = {x: i for i, x in enumerate(nums)}",
        },
        {
          label: "setdefault & pop",
          code: "d.setdefault(k, []).append(v)\nv = d.pop(k, None)   # remove, no error\nk, v = d.popitem()   # last inserted",
        },
        {
          label: "Sort a dict",
          code: "sorted(d.items(), key=lambda kv: kv[1])\nsorted(d, key=d.get, reverse=True)",
        },
        {
          label: "Counter math",
          code: "c = Counter(\"banana\")\nc.most_common(2)  # [(\"a\", 3), (\"n\", 2)]\nc1 - c2   c1 & c2   c1 + c2\nc.total()         # 3.10+",
        },
        {
          label: "OrderedDict (LRU)",
          code: "od = OrderedDict()\nod[k] = v\nod.move_to_end(k)       # most recent\nod.popitem(last=False)  # oldest",
        },
        {
          label: "Merge & invert",
          code: "merged = a | b    # 3.9+, b wins\ninv = {v: k for k, v in d.items()}",
        },
      ],
    },
    {
      id: "stacks",
      title: "Stacks, queues & heaps",
      icon: "🥞",
      items: [
        {
          label: "Stack (list)",
          code: "stack = []\nstack.append(x)\ntop = stack[-1]\nstack.pop()",
        },
        {
          label: "Queue / deque",
          code: "q = deque()\nq.append(x)      # push right\nq.popleft()      # pop left\nq.appendleft(x)  # push left",
        },
        {
          label: "BFS template",
          code: "q = deque([start]); seen = {start}\nwhile q:\n    node = q.popleft()\n    for nxt in adj[node]:\n        if nxt not in seen:\n            seen.add(nxt); q.append(nxt)",
        },
        {
          label: "Min-heap",
          code: "heappush(h, x)     # add x\nsmallest = h[0]    # peek, nothing removed\nheappop(h)         # remove and return the smallest\nheapify(a)         # turn list a into a heap, in place, O(n)",
        },
        { label: "Max-heap", code: "heappush(h, -x)\nlargest = -heappop(h)" },
        {
          label: "Heap of tuples",
          code: "heappush(h, (priority, idx, item))  # idx breaks ties",
        },
        {
          label: "k largest / smallest",
          code: "nlargest(k, nums)\nnsmallest(k, nums, key=len)",
        },
        {
          label: "Monotonic stack",
          code: "for i, x in enumerate(nums):\n    while stack and nums[stack[-1]] < x:\n        j = stack.pop()  # next greater of j is i\n    stack.append(i)",
        },
        {
          label: "deque extras",
          code: "q = deque(maxlen=3)  # keeps the last 3\nq.appendleft(x)\nq.rotate(1)          # shift right by 1\nq[0]   q[-1]         # peek both ends",
        },
        {
          label: "heapify & replace",
          code: "heapify(a)          # in place, O(n)\nheapreplace(h, x)   # pop, then push\nheappushpop(h, x)   # push, then pop",
        },
        {
          label: "Heap ties",
          code: "heappush(h, (-score, name))\n# objects can't compare? add a counter:\nheappush(h, (prio, next(ids), obj))",
        },
        {
          label: "Window max (deque)",
          code: "dq = deque()  # indexes, values falling\nfor i, x in enumerate(a):\n    while dq and a[dq[-1]] <= x:\n        dq.pop()\n    dq.append(i)\n    if dq[0] <= i - k:\n        dq.popleft()\n    if i >= k - 1:\n        res.append(a[dq[0]])",
        },
      ],
    },
    {
      id: "sorting",
      title: "Sorting & searching",
      icon: "🔎",
      items: [
        {
          label: "Sort in place / copy",
          code: "a.sort()\nb = sorted(a)\nsorted(a, reverse=True)",
        },
        {
          label: "Sort by key",
          code: "a.sort(key=lambda x: x[1])\na.sort(key=lambda p: (-p.score, p.name))",
        },
        {
          label: "Custom comparator",
          code: "from functools import cmp_to_key\na.sort(key=cmp_to_key(lambda x, y: x - y))",
        },
        {
          label: "Binary search (bisect)",
          code: "i = bisect_left(a, x)   # first >= x\nj = bisect_right(a, x)  # first > x\ninsort(a, x)",
        },
        {
          label: "Binary search (manual)",
          code: "lo, hi = 0, n - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if a[mid] < x: lo = mid + 1\n    else: hi = mid - 1",
        },
        {
          label: "Min / max with key",
          code: "max(words, key=len)\nmin(points, key=lambda p: p[0] ** 2 + p[1] ** 2)",
        },
        {
          label: "Sort by several keys",
          code: "people.sort(key=lambda p: (-p.age, p.name))\nwords.sort(key=lambda w: (len(w), w))",
        },
        {
          label: "itemgetter",
          code: "from operator import itemgetter\npairs.sort(key=itemgetter(1, 0))",
        },
        {
          label: "Binary search on the answer",
          code: "lo, hi = 1, max(piles)\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if ok(mid):\n        hi = mid\n    else:\n        lo = mid + 1\nreturn lo  # smallest that works",
        },
        {
          label: "bisect with key",
          code: "i = bisect_left(items, 5, key=lambda p: p[0])  # 3.10+",
        },
      ],
    },
    {
      id: "loops",
      title: "Loops & control flow",
      icon: "🔁",
      items: [
        { label: "While", code: "while left < right:\n    left += 1" },
        {
          label: "Break / continue / else",
          code: 'for x in a:\n    if x < 0: continue\n    if x == target: break\nelse:\n    print("no break")',
        },
        {
          label: "Two pointers",
          code: "l, r = 0, len(a) - 1\nwhile l < r:\n    if a[l] + a[r] < t: l += 1\n    else: r -= 1",
        },
        {
          label: "Sliding window",
          code: "l = 0\nfor r, c in enumerate(s):\n    window[c] += 1\n    while invalid():\n        window[s[l]] -= 1; l += 1",
        },
        {
          label: "Grid neighbours",
          code: "for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n    nr, nc = r + dr, c + dc\n    if 0 <= nr < rows and 0 <= nc < cols:",
        },
        {
          label: "any / all",
          code: "any(x < 0 for x in a)\nall(c.isdigit() for c in s)",
        },
        {
          label: "Range steps & reverse",
          code: "for i in range(0, n, 2):     # 0, 2, 4…\nfor i in range(n - 1, -1, -1):\nfor x in reversed(a):",
        },
        {
          label: "Neighbouring pairs",
          code: "for x, y in pairwise(a):  # 3.10+\n    gap = y - x\nfor i in range(1, len(a)):\n    gap = a[i] - a[i - 1]",
        },
        {
          label: "enumerate & zip options",
          code: "for i, x in enumerate(a, 1):  # from 1\nfor x, y in zip(a, b, strict=True):",
        },
      ],
    },
    {
      id: "functions",
      title: "Functions & recursion",
      icon: "🧩",
      items: [
        {
          label: "Helper function",
          code: "def dfs(node: Optional[TreeNode]) -> int:\n    if not node:\n        return 0\n    return 1 + max(dfs(node.left), dfs(node.right))",
        },
        {
          label: "Memoization",
          code: "@cache\ndef ways(i: int) -> int:\n    return 1 if i <= 1 else ways(i - 1) + ways(i - 2)",
        },
        { label: "Lambda", code: "key = lambda x: (x[0], -x[1])" },
        {
          label: "Modify outer variable",
          code: "best = 0\ndef go(n):\n    nonlocal best\n    best = max(best, n)",
        },
        {
          label: "Recursion limit",
          code: "sys.setrecursionlimit(10_000)  # prefer iteration for deep inputs",
        },
        {
          label: "Backtracking",
          code: "def bt(path):\n    if done(path): out.append(path[:]); return\n    for c in choices:\n        path.append(c); bt(path); path.pop()",
        },
        {
          label: "Memo inside a method",
          code: "def solve(self, nums):\n    @cache\n    def dp(i):\n        if i >= len(nums):\n            return 0\n        return max(dp(i + 1), nums[i] + dp(i + 2))\n    return dp(0)",
        },
        {
          label: "lru_cache & clearing",
          code: "@lru_cache(maxsize=None)\ndef f(i, j): ...\nf.cache_clear()  # reuse between inputs",
        },
        {
          label: "reduce & prod",
          code: "from functools import reduce\nreduce(lambda a, b: a * b, nums, 1)\nmath.prod(nums)   # 3.8+",
        },
        {
          label: "Unpacking & *args",
          code: "first, *rest = nums\ndef f(*args, **kwargs): ...\nf(*nums)      # list becomes arguments\nf(**opts)     # dict becomes keywords",
        },
        {
          label: "Generators",
          code: "def evens(n):\n    for i in range(0, n, 2):\n        yield i\nsum(x * x for x in nums)  # no list built",
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
          code: "cur = head\nwhile cur:\n    cur = cur.next",
        },
        {
          label: "Dummy head",
          code: "dummy = ListNode(0, head)\ntail = dummy\ntail.next = ListNode(5); tail = tail.next\nreturn dummy.next",
        },
        {
          label: "Tree node",
          code: "node = TreeNode(1, TreeNode(2), None)\nnode.left.val",
        },
        {
          label: "Small class",
          code: "class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y",
        },
        {
          label: "Named tuple / dataclass",
          code: "from dataclasses import dataclass\n@dataclass\nclass Edge:\n    u: int\n    v: int\n    w: int",
        },
        {
          label: "Order objects (__lt__)",
          code: "class Item:\n    def __init__(self, d, v):\n        self.d, self.v = d, v\n    def __lt__(self, other):\n        return self.d < other.d",
        },
        {
          label: "Hashable value class",
          code: "from dataclasses import dataclass\n@dataclass(frozen=True)\nclass Point:\n    x: int\n    y: int\nseen = {Point(0, 0)}",
        },
        {
          label: "Type hints",
          code: "def f(root: Optional[TreeNode]) -> int:\n    ...\ndef g(nums: List[int]) -> List[List[int]]:\n    ...",
        },
      ],
    },
    {
      id: "math",
      title: "Math & bits",
      icon: "🧮",
      items: [
        {
          label: "Power & modulo",
          code: "pow(2, 10)\npow(b, e, MOD)   # fast modular\nMOD = 10**9 + 7",
        },
        { label: "Ceil division", code: "-(-a // b)\nmath.ceil(a / b)" },
        {
          label: "Floor / ceil / round",
          code: "math.floor(x)   # gives int\nmath.ceil(x)    # gives int\nround(2.5)      # 2: .5 goes to even\nround(x, 2)     # 2 decimals\nint(-2.7)       # -2: truncates",
        },
        {
          label: "gcd / lcm / sqrt",
          code: "math.gcd(a, b)  math.lcm(a, b)\nmath.isqrt(n)   # integer sqrt",
        },
        {
          label: "Bit ops",
          code: "a & b  a | b  a ^ b  ~a\n1 << k   x >> 1\nx & (x - 1)  # drop lowest set bit",
        },
        {
          label: "Count bits",
          code: 'bin(x).count("1")\nx.bit_count()   # 3.10+',
        },
        { label: "Big ints", code: "# Python ints never overflow\n2 ** 100" },
        { label: "abs / divmod", code: "abs(-3)\nq, r = divmod(17, 5)" },
        {
          label: "Single bits",
          code: "(x >> k) & 1    # bit k set?\nx | (1 << k)    # set bit k\nx & ~(1 << k)   # clear bit k\nx ^ (1 << k)    # flip bit k\nx & -x          # lowest set bit",
        },
        {
          label: "Logs & powers of two",
          code: "math.log2(n)  math.log10(n)\nn.bit_length() - 1  # floor(log2)\nn & (n - 1) == 0    # power of 2",
        },
        {
          label: "Bases (binary, hex)",
          code: "bin(5)[2:]        # \"101\"\nhex(255)[2:]      # \"ff\"\nformat(5, \"08b\")  # \"00000101\"\nint(\"1011\", 2)    # 11",
        },
        {
          label: "Digits",
          code: "while n:\n    d = n % 10\n    n //= 10\nsum(map(int, str(n)))",
        },
        {
          label: "Clamp, min / max of many",
          code: "max(a, b, c)   min(nums)\nmin(max(x, lo), hi)  # clamp",
        },
        {
          label: "Floats",
          code: "math.inf   -math.inf\nabs(a - b) < 1e-9   # a ≈ b\nmath.hypot(dx, dy)  math.pi",
        },
        {
          label: "Combinatorics",
          code: "math.comb(n, k)  # n choose k\nmath.perm(n, k)\nmath.factorial(n)\npermutations(nums)\ncombinations(nums, k)\nproduct(range(3), repeat=2)",
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
          code: "g = defaultdict(list)\nfor u, v in edges:\n    g[u].append(v)\n    g[v].append(u)  # undirected",
        },
        {
          label: "DFS (recursive)",
          code: "seen = set()\ndef dfs(u):\n    seen.add(u)\n    for v in g[u]:\n        if v not in seen:\n            dfs(v)",
        },
        {
          label: "DFS (iterative)",
          code: "stack, seen = [start], {start}\nwhile stack:\n    u = stack.pop()\n    for v in g[u]:\n        if v not in seen:\n            seen.add(v)\n            stack.append(v)",
        },
        {
          label: "Grid DFS (islands)",
          code: "def fill(r, c):\n    if not (0 <= r < R and 0 <= c < C):\n        return\n    if grid[r][c] != \"1\":\n        return\n    grid[r][c] = \"0\"  # mark visited\n    for dr, dc in (1, 0), (-1, 0), (0, 1), (0, -1):\n        fill(r + dr, c + dc)",
        },
        {
          label: "Dijkstra",
          code: "dist = {src: 0}\nh = [(0, src)]\nwhile h:\n    d, u = heappop(h)\n    if d > dist.get(u, inf):\n        continue  # stale entry\n    for v, w in g[u]:\n        if d + w < dist.get(v, inf):\n            dist[v] = d + w\n            heappush(h, (d + w, v))",
        },
        {
          label: "Topological sort",
          code: "indeg = [0] * n\nfor u, v in edges:\n    g[u].append(v)\n    indeg[v] += 1\nq = deque(i for i in range(n) if indeg[i] == 0)\norder = []\nwhile q:\n    u = q.popleft()\n    order.append(u)\n    for v in g[u]:\n        indeg[v] -= 1\n        if indeg[v] == 0:\n            q.append(v)\n# len(order) < n means a cycle",
        },
        {
          label: "Union-find",
          code: "parent = list(range(n))\ndef find(x):\n    while parent[x] != x:\n        parent[x] = parent[parent[x]]\n        x = parent[x]\n    return x\ndef union(a, b):\n    ra, rb = find(a), find(b)\n    if ra == rb:\n        return False\n    parent[ra] = rb\n    return True",
        },
        {
          label: "Trie (dict of dicts)",
          code: "root = {}\nfor w in words:\n    node = root\n    for ch in w:\n        node = node.setdefault(ch, {})\n    node[\"$\"] = True  # end of a word",
        },
        {
          label: "Bitmask subsets",
          code: "for mask in range(1 << n):\n    pick = [a[i] for i in range(n)\n            if mask >> i & 1]",
        },
        {
          label: "Running totals & runs",
          code: "list(accumulate(a))       # prefix sums\nlist(accumulate(a, max))  # running max\n[(k, len(list(g))) for k, g in groupby(s)]",
        },
      ],
    },
  ],
};
