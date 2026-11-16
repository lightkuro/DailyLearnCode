import type { SyntaxSheet } from "./types";

export const cpp: SyntaxSheet = {
  lang: "cpp",
  common: [
    {
      label: "Variables",
      code: "int x = 5;\nlong long big = 1LL << 40;\nauto y = 3.5;",
    },
    {
      label: "Vector",
      code: "vector<int> v = {1, 2, 3};\nv.push_back(4);\nint n = v.size();",
    },
    {
      label: "2D vector",
      code: "vector<vector<int>> grid(m, vector<int>(n, 0));",
    },
    {
      label: "Hash map counting",
      code: "unordered_map<string, int> cnt;\ncnt[k]++;          // missing keys start at 0\ncnt.count(k);     // 0 or 1",
    },
    {
      label: "Loops",
      code: "for (int i = 0; i < n; i++) { }\nfor (int x : v) { }\nfor (auto& [k, val] : cnt) { }",
    },
    {
      label: "Sort",
      code: "sort(v.begin(), v.end());\nsort(v.rbegin(), v.rend());  // descending",
    },
    {
      label: "Stack & queue",
      code: "stack<int> st; st.push(x); st.top(); st.pop();\nqueue<int> q; q.push(x); q.front(); q.pop();",
    },
    {
      label: "Heap",
      code: "priority_queue<int> maxh;\npriority_queue<int, vector<int>, greater<int>> minh;\nminh.push(x); minh.top(); minh.pop();",
    },
    {
      label: "Limits",
      code: "INT_MAX  INT_MIN  LLONG_MAX\n// or numeric_limits<int>::max()",
    },
    {
      label: "String basics",
      code: "s[i]  s.size()  s.substr(i, len)\ns += 'c';",
    },
  ],
  categories: [
    {
      id: "basics",
      title: "Basics",
      icon: "🧱",
      items: [
        {
          label: "Types",
          code: "int i; long long ll; double d; bool b; char c;\nauto x = 0LL;",
        },
        {
          label: "Casting",
          code: "int i = (int) 3.9;            // 3\nlong long p = (long long) a * b;\ndouble r = static_cast<double>(x) / y;",
        },
        {
          label: "Parse & to_string",
          code: 'int n = stoi("42");\nlong long m = stoll(s);\nstring t = to_string(7);',
        },
        {
          label: "Print / debug",
          code: 'cout << x << " " << y << "\\n";\ncerr << "debug " << v.size() << endl;',
        },
        {
          label: "References",
          code: "void f(vector<int>& v)        // no copy, can modify\nvoid g(const string& s)       // no copy, read-only",
        },
        {
          label: "nullptr",
          code: "if (node == nullptr) return 0;\nif (!node) return 0;",
        },
        {
          label: "Integer division & modulo",
          code: "7 / 2   // 3\n-7 / 2  // -3 (truncates)\n((a % m) + m) % m  // always non-negative",
        },
        {
          label: "No exceptions here",
          code: "// The in-browser compiler runs with -fno-exceptions:\n// avoid throw/try; return sentinel values instead.",
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
          code: "int i = 0;\nlong long big = 1LL << 40;\ndouble d = 3.5;\nbool ok = true;\nchar c = 'a';",
        },
        {
          label: "Strings",
          code: 'string s = "abc";\nchar c = s[0];\nstring t(3, \'x\');   // "xxx"',
        },
        {
          label: "Vectors",
          code: "vector<int> a(n);        // n zeros\nvector<int> b = {1, 2, 3};\nvector<int> c(n, -1);    // n copies of -1",
        },
        {
          label: "2-D vector",
          code: "vector<vector<int>> grid(rows, vector<int>(cols, 0));\nint rows = grid.size(), cols = grid[0].size();",
        },
        {
          label: "Pairs & tuples",
          code: "pair<int, int> p = {r, c};\nauto [r2, c2] = p;       // structured binding\ntuple<int, int, int> t = {a, b, c};",
        },
        {
          label: "Maps & sets",
          code: "unordered_map<string, int> m;\nunordered_set<int> seen;\nmap<int, int> sorted;    // ordered by key",
        },
        {
          label: "Queues & heaps",
          code: "queue<int> q;\ndeque<int> dq;\npriority_queue<int> maxh;\npriority_queue<int, vector<int>, greater<int>> minh;",
        },
        {
          label: "C array & std::array",
          code: "int a[5] = {};           // zeros\narray<int, 3> t = {1, 2, 3};",
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
          code: "s[i]  s.size()  s.back()\ns.substr(pos)  s.substr(pos, len)",
        },
        {
          label: "Build & append",
          code: 'string t;\nt += c;  t += "ab";  t.push_back(c);\nt.pop_back();',
        },
        {
          label: "Reverse & sort",
          code: "reverse(s.begin(), s.end());\nsort(s.begin(), s.end());  // anagram key",
        },
        {
          label: "Find",
          code: 'size_t p = s.find("ab");\nif (p == string::npos) { /* not found */ }',
        },
        {
          label: "Char helpers",
          code: "isdigit(c)  isalpha(c)  isalnum(c)\ntolower(c)  toupper(c)\nint idx = c - 'a';",
        },
        {
          label: "Split by spaces",
          code: "stringstream ss(s);\nstring w;\nwhile (ss >> w) words.push_back(w);",
        },
        { label: "Compare", code: "s == t   s < t   s.compare(t)" },
        { label: "Repeat char", code: "string line(5, '-');  // \"-----\"" },
        {
          label: "Split by a delimiter",
          code: "stringstream ss(s);\nstring part;\nwhile (getline(ss, part, ',')) parts.push_back(part);",
        },
        {
          label: "Find variations",
          code: "s.find(\"ab\")     // npos if absent\ns.rfind('x')     // last one\ns.find('x', i)   // from index i\nif (s.find(t) != string::npos) { }",
        },
        {
          label: "Edit in place",
          code: "s.insert(i, \"xy\");\ns.erase(i, len);\ns.replace(i, len, \"new\");\ns.pop_back();   s.back()",
        },
        {
          label: "starts_with / contains",
          code: "s.starts_with(\"ab\")   // C++20\ns.ends_with(\".cpp\")\ns.contains(\"x\")       // C++23",
        },
        {
          label: "Letter counts (26)",
          code: "array<int, 26> cnt{};\nfor (char c : s) cnt[c - 'a']++;\nbool same = cnt == other;  // arrays compare",
        },
        {
          label: "Join words",
          code: "string out;\nfor (const string& w : words) {\n    if (!out.empty()) out += ' ';\n    out += w;\n}",
        },
      ],
    },
    {
      id: "lists",
      title: "Vectors & arrays",
      icon: "📚",
      items: [
        {
          label: "Create",
          code: "vector<int> a(n);          // n zeros\nvector<int> b(n, -1);\nvector<bool> seen(n, false);",
        },
        {
          label: "Add & remove",
          code: "v.push_back(x);  v.pop_back();\nv.insert(v.begin() + i, x);\nv.erase(v.begin() + i);",
        },
        { label: "Access", code: "v[i]  v.front()  v.back()  v.empty()" },
        {
          label: "Fill & copy",
          code: "fill(v.begin(), v.end(), 0);\nvector<int> c = v;           // copies\nvector<int> sub(v.begin() + i, v.begin() + j);",
        },
        { label: "Reverse", code: "reverse(v.begin(), v.end());" },
        {
          label: "Sum / max",
          code: "long long s = accumulate(v.begin(), v.end(), 0LL);\nint mx = *max_element(v.begin(), v.end());",
        },
        {
          label: "Prefix sums",
          code: "vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];",
        },
        {
          label: "Pairs",
          code: "vector<pair<int, int>> ps;\nps.push_back({a, b});\nauto [x, y] = ps[0];",
        },
        {
          label: "Fixed-size array",
          code: "array<int, 26> cnt{};  // zero-initialised\ncnt[c - 'a']++;",
        },
        {
          label: "Insert & erase in the middle",
          code: "v.insert(v.begin() + i, x);\nv.erase(v.begin() + i);\nv.erase(v.begin() + i, v.begin() + j);",
        },
        {
          label: "Remove matching values",
          code: "erase(v, x);    // C++20\nerase_if(v, [](int y) { return y < 0; });\n// older: v.erase(remove(v.begin(), v.end(), x), v.end());",
        },
        {
          label: "resize, assign, iota",
          code: "v.resize(n);         // new slots are 0\nv.assign(n, -1);     // n copies of -1\niota(v.begin(), v.end(), 0);  // 0, 1, 2…",
        },
        {
          label: "find, count, any_of",
          code: "auto it = find(v.begin(), v.end(), x);\nint idx = it - v.begin();  // == size if absent\ncount(v.begin(), v.end(), x)\nany_of(v.begin(), v.end(), [](int y) { return y < 0; })",
        },
        {
          label: "Ranges (C++20)",
          code: "ranges::sort(v);\nranges::reverse(v);\nauto it = ranges::find(v, x);\nranges::max(v)   ranges::count(v, x)",
        },
        {
          label: "rotate & swap",
          code: "rotate(v.begin(), v.begin() + k, v.end());  // left by k\nswap(v[i], v[j]);\nreverse(v.begin() + i, v.end());",
        },
      ],
    },
    {
      id: "maps",
      title: "Maps & sets",
      icon: "🗂️",
      items: [
        {
          label: "unordered_map",
          code: "unordered_map<int, int> m;\nm[k] = v;\nif (m.count(k)) { }\nm.erase(k);",
        },
        {
          label: "find without inserting",
          code: "auto it = m.find(k);\nif (it != m.end()) use(it->second);",
        },
        {
          label: "Group into vectors",
          code: "unordered_map<string, vector<string>> groups;\ngroups[key].push_back(word);",
        },
        { label: "Iterate", code: "for (auto& [key, val] : m) { }" },
        {
          label: "unordered_set",
          code: "unordered_set<int> seen;\nseen.insert(x);\nseen.count(x);  seen.erase(x);",
        },
        {
          label: "Ordered map / set",
          code: "map<int, int> om;  set<int> os;\nauto it = os.lower_bound(x);  // first >= x\n*os.begin()  *os.rbegin()",
        },
        {
          label: "Pair as key",
          code: "set<pair<int, int>> visited;\nvisited.insert({r, c});\n// unordered needs a hash: encode r * cols + c",
        },
        {
          label: "map bounds",
          code: "auto it = m.lower_bound(x);  // first key ≥ x\nauto up = m.upper_bound(x);  // first key > x\nif (up != m.begin()) { auto le = prev(up); }  // last ≤ x\nm.begin()->first   m.rbegin()->first  // min / max",
        },
        {
          label: "multiset",
          code: "multiset<int> ms;\nms.insert(x);\nms.erase(ms.find(x));  // removes one copy\nms.erase(x);           // removes every copy!",
        },
        {
          label: "contains, insert, emplace",
          code: "if (m.contains(k)) { }        // C++20\nauto [it, added] = st.insert(x);\nm.emplace(k, v);   // won't overwrite\nm.insert_or_assign(k, v);",
        },
        {
          label: "Hash for pairs",
          code: "struct PairHash {\n    size_t operator()(const pair<int, int>& p) const {\n        return hash<long long>()(((long long) p.first << 32) ^ (unsigned) p.second);\n    }\n};\nunordered_set<pair<int, int>, PairHash> seen;",
        },
        {
          label: "Count into a map",
          code: "unordered_map<char, int> cnt;\nfor (char c : s) cnt[c]++;   // new keys start at 0\nfor (auto& [ch, n] : cnt) { }",
        },
      ],
    },
    {
      id: "stacks",
      title: "Stacks, queues & heaps",
      icon: "🥞",
      items: [
        {
          label: "stack",
          code: "stack<int> st;\nst.push(x);  st.top();  st.pop();  st.empty();",
        },
        {
          label: "queue",
          code: "queue<pair<int, int>> q;\nq.push({r, c});\nauto [r0, c0] = q.front(); q.pop();",
        },
        {
          label: "deque",
          code: "deque<int> dq;\ndq.push_front(x); dq.push_back(x);\ndq.pop_front(); dq.pop_back();",
        },
        {
          label: "Min-heap of pairs",
          code: "priority_queue<pair<int, int>, vector<pair<int, int>>,\n               greater<pair<int, int>>> pq;\npq.push({dist, node});\nauto [d, u] = pq.top(); pq.pop();",
        },
        {
          label: "Custom comparator heap",
          code: "auto cmp = [](const auto& a, const auto& b) { return a[1] > b[1]; };\npriority_queue<vector<int>, vector<vector<int>>, decltype(cmp)> pq(cmp);",
        },
        {
          label: "BFS template",
          code: "queue<int> q; q.push(start);\nvector<bool> seen(n); seen[start] = true;\nwhile (!q.empty()) {\n    int u = q.front(); q.pop();\n    for (int v : adj[u]) if (!seen[v]) { seen[v] = true; q.push(v); }\n}",
        },
        {
          label: "Heaps of ints",
          code: "priority_queue<int> maxh;\npriority_queue<int, vector<int>, greater<int>> minh;\nmaxh.push(x);  maxh.top();  maxh.pop();",
        },
        {
          label: "Window max (deque)",
          code: "deque<int> dq;  // indexes, values falling\nfor (int i = 0; i < (int) a.size(); i++) {\n    while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n    dq.push_back(i);\n    if (dq.front() <= i - k) dq.pop_front();\n    if (i >= k - 1) res.push_back(a[dq.front()]);\n}",
        },
        {
          label: "Next greater (stack)",
          code: "vector<int> nxt(n, -1);\nstack<int> st;  // indexes\nfor (int i = 0; i < n; i++) {\n    while (!st.empty() && a[st.top()] < a[i]) {\n        nxt[st.top()] = a[i];\n        st.pop();\n    }\n    st.push(i);\n}",
        },
      ],
    },
    {
      id: "sorting",
      title: "Sorting & searching",
      icon: "🔎",
      items: [
        {
          label: "Sort with lambda",
          code: "sort(v.begin(), v.end(), [](const auto& a, const auto& b) {\n    return a[1] < b[1];\n});",
        },
        { label: "Stable sort", code: "stable_sort(v.begin(), v.end(), cmp);" },
        {
          label: "Binary search",
          code: "auto it = lower_bound(v.begin(), v.end(), x);  // iterator to first >= x\nint idx = it - v.begin();  // its index (v.size() if none)\nupper_bound(...)  // iterator to first > x\nbinary_search(v.begin(), v.end(), x)  // true if x is present",
        },
        {
          label: "Binary search (manual)",
          code: "int lo = 0, hi = n - 1;\nwhile (lo <= hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (a[mid] < x) lo = mid + 1; else hi = mid - 1;\n}",
        },
        {
          label: "Min / max",
          code: "min(a, b)  max({a, b, c})\n*min_element(v.begin(), v.end())",
        },
        {
          label: "Unique",
          code: "sort(v.begin(), v.end());\nv.erase(unique(v.begin(), v.end()), v.end());",
        },
        {
          label: "k-th smallest (nth_element)",
          code: "nth_element(v.begin(),\n    v.begin() + k, v.end());\n// v[k]: k-th smallest, O(n)",
        },
        {
          label: "Sort descending",
          code: "sort(v.rbegin(), v.rend());\nsort(v.begin(), v.end(), greater<>());",
        },
        {
          label: "Sort by several keys",
          code: "sort(v.begin(), v.end(), [](const auto& a, const auto& b) {\n    return tie(a.x, b.y) < tie(b.x, a.y);  // x up, y down\n});",
        },
        {
          label: "Binary search on the answer",
          code: "int lo = 1, hi = maxPile;\nwhile (lo < hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (ok(mid)) hi = mid;\n    else lo = mid + 1;\n}\nreturn lo;  // smallest that works",
        },
        {
          label: "equal_range",
          code: "auto [lo, hi] = equal_range(v.begin(), v.end(), x);\nint copies = hi - lo;   // how many x",
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
          label: "Careful with size()",
          code: "// v.size() is unsigned: v.size() - 1 wraps when empty\nfor (int i = 0; i + 1 < (int) v.size(); i++) { }",
        },
        { label: "While", code: "while (l < r) { l++; }" },
        {
          label: "Grid neighbours",
          code: "const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};\nfor (int d = 0; d < 4; d++) {\n    int nr = r + dr[d], nc = c + dc[d];\n    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n}",
        },
        {
          label: "Switch",
          code: "switch (c) {\n    case '(': open++; break;\n    case ')': open--; break;\n}",
        },
        {
          label: "Range-for by reference",
          code: "for (int& x : v) x *= 2;          // edits v\nfor (const auto& row : grid) { }  // no copies\nfor (auto [a, b] : pairs) { }",
        },
        {
          label: "Structured bindings",
          code: "auto [a, b] = p;\nauto [d, u] = pq.top();\nfor (auto& [key, val] : m) { }",
        },
      ],
    },
    {
      id: "functions",
      title: "Functions & recursion",
      icon: "🧩",
      items: [
        {
          label: "Member helper",
          code: "int depth(TreeNode* node) {\n    if (!node) return 0;\n    return 1 + max(depth(node->left), depth(node->right));\n}",
        },
        {
          label: "Recursive lambda",
          code: "function<int(int)> dfs = [&](int u) -> int {\n    int best = 0;\n    for (int v : adj[u]) best = max(best, dfs(v));\n    return best + 1;\n};",
        },
        {
          label: "Memoization",
          code: "vector<long long> memo(n + 1, -1);\n// if (memo[i] != -1) return memo[i];",
        },
        {
          label: "Capture by reference",
          code: "int total = 0;\nauto add = [&](int x) { total += x; };",
        },
        {
          label: "Backtracking",
          code: "void bt(vector<int>& path) {\n    if (done(path)) { out.push_back(path); return; }\n    for (int c : choices) { path.push_back(c); bt(path); path.pop_back(); }\n}",
        },
        {
          label: "Recursive lambda (auto self)",
          code: "auto dfs = [&](auto&& self, int u) -> void {\n    for (int v : g[u]) self(self, v);\n};\ndfs(dfs, 0);",
        },
        {
          label: "Recursive lambda (C++23)",
          code: "auto dfs = [&](this auto&& self, int u) -> void {\n    for (int v : g[u]) self(v);\n};\ndfs(0);",
        },
        {
          label: "Parameters: copy or reference",
          code: "void f(vector<int>& v);        // no copy, can change\nvoid g(const vector<int>& v);  // no copy, read-only\nvoid h(vector<int> v);         // copies everything",
        },
        {
          label: "2-D memo",
          code: "vector<vector<int>> memo(n, vector<int>(m, -1));\n// if (memo[i][j] != -1) return memo[i][j];",
        },
      ],
    },
    {
      id: "classes",
      title: "Structs & nodes",
      icon: "🏗️",
      items: [
        {
          label: "Linked list walk",
          code: "for (ListNode* cur = head; cur; cur = cur->next) { }",
        },
        {
          label: "Dummy head",
          code: "ListNode dummy(0);\nListNode* tail = &dummy;\ntail->next = new ListNode(5); tail = tail->next;\nreturn dummy.next;",
        },
        {
          label: "Tree node",
          code: "TreeNode* root = new TreeNode(1, new TreeNode(2), nullptr);\nroot->left->val;",
        },
        {
          label: "Struct",
          code: "struct Edge { int u, v, w; };\nvector<Edge> edges;\nedges.push_back({0, 1, 5});",
        },
        {
          label: "Tuple",
          code: "tuple<int, int, int> t = {a, b, c};\nauto [x, y, z] = t;",
        },
        {
          label: "Struct with operator<",
          code: "struct Edge {\n    int u, v, w;\n    bool operator<(const Edge& o) const { return w < o.w; }\n};\n// sort(edges.begin(), edges.end());",
        },
        {
          label: "Trie node",
          code: "struct TrieNode {\n    TrieNode* kids[26] = {};\n    bool end = false;\n};",
        },
        {
          label: "new vs smart pointers",
          code: "ListNode* n = new ListNode(5);  // LeetCode style\nauto p = make_unique<TreeNode>(5);  // freed for you",
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
          code: "abs(x)  llabs(y)  sqrt(x)  pow(2.0, 10)\n// pow returns double",
        },
        {
          label: "Overflow-safe",
          code: "long long prod = 1LL * a * b;\nint mid = lo + (hi - lo) / 2;",
        },
        {
          label: "Modulo arithmetic",
          code: "const int MOD = 1e9 + 7;\nans = (ans + x) % MOD;",
        },
        {
          label: "Bit ops",
          code: "a & b  a | b  a ^ b  ~a\n1 << k   1LL << 40   x >> 1\nx & (x - 1)",
        },
        {
          label: "Count bits",
          code: "__builtin_popcount(x)\n__builtin_popcountll(y)\npopcount((unsigned) x)  // C++20 <bit>",
        },
        {
          label: "gcd / lcm",
          code: "gcd(a, b)  lcm(a, b)  // <numeric>, C++17",
        },
        { label: "Ceil division", code: "(a + b - 1) / b   // a, b > 0" },
        {
          label: "Floor / ceil / round",
          code: "floor(x)  ceil(x)   // double\nround(2.5)   // 3 (double)\ntrunc(-2.7)  // -2\nllround(x)   // gives long long\n(int) -2.7   // -2: truncates",
        },
        {
          label: "Single bits",
          code: "(x >> k) & 1    // bit k set?\nx | (1 << k)    // set bit k\nx & ~(1 << k)   // clear bit k\nx ^ (1 << k)    // flip bit k\nx & -x          // lowest set bit\n__builtin_ctz(x) // its index",
        },
        {
          label: "Logs & powers of two",
          code: "log2(x)  log10(x)  log(x)\n__lg(n)   // floor(log2 n), int\nhas_single_bit(unsigned(n))",
        },
        {
          label: "Bases (binary, hex)",
          code: "bitset<8>(5).to_string()\n// \"00000101\"\nstoi(\"1011\", nullptr, 2)  // 11\nstoll(\"ff\", nullptr, 16)  // 255",
        },
        {
          label: "Digits",
          code: "while (n > 0) {\n    int d = n % 10;\n    n /= 10;\n}\nto_string(n).size()",
        },
        {
          label: "Clamp, min / max of many",
          code: "max({a, b, c})  min({a, b, c})\nclamp(x, lo, hi)\n*max_element(v.begin(), v.end())",
        },
        {
          label: "Doubles",
          code: "INFINITY\nabs(a - b) < 1e-9  // a ≈ b\nhypot(dx, dy)  numbers::pi",
        },
        {
          label: "Permutations",
          code: "sort(v.begin(), v.end());\ndo {\n    // use v\n} while (next_permutation(\n    v.begin(), v.end()));",
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
          code: "vector<vector<int>> g(n);\nfor (auto& e : edges) {\n    g[e[0]].push_back(e[1]);\n    g[e[1]].push_back(e[0]);\n}",
        },
        {
          label: "Dijkstra",
          code: "vector<long long> dist(n, LLONG_MAX);\npriority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;\ndist[src] = 0;\npq.push({0, src});\nwhile (!pq.empty()) {\n    auto [d, u] = pq.top();\n    pq.pop();\n    if (d > dist[u]) continue;  // stale\n    for (auto [v, w] : g[u])\n        if (d + w < dist[v]) {\n            dist[v] = d + w;\n            pq.push({dist[v], v});\n        }\n}",
        },
        {
          label: "Topological sort",
          code: "vector<int> indeg(n), order;\nfor (auto& e : edges) {\n    g[e[0]].push_back(e[1]);\n    indeg[e[1]]++;\n}\nqueue<int> q;\nfor (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);\nwhile (!q.empty()) {\n    int u = q.front();\n    q.pop();\n    order.push_back(u);\n    for (int v : g[u]) if (--indeg[v] == 0) q.push(v);\n}\n// order.size() < n means a cycle",
        },
        {
          label: "Union-find",
          code: "struct DSU {\n    vector<int> p;\n    DSU(int n) : p(n) { iota(p.begin(), p.end(), 0); }\n    int find(int x) {\n        while (p[x] != x) x = p[x] = p[p[x]];\n        return x;\n    }\n    bool unite(int a, int b) {\n        a = find(a), b = find(b);\n        if (a == b) return false;\n        p[a] = b;\n        return true;\n    }\n};",
        },
        {
          label: "Grid DFS (islands)",
          code: "auto fill = [&](auto&& self, int r, int c) -> void {\n    if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] != '1') return;\n    grid[r][c] = '0';  // mark visited\n    self(self, r + 1, c);\n    self(self, r - 1, c);\n    self(self, r, c + 1);\n    self(self, r, c - 1);\n};",
        },
        {
          label: "Bitmask subsets",
          code: "for (int mask = 0; mask < (1 << n); mask++)\n    for (int i = 0; i < n; i++)\n        if (mask >> i & 1) { /* a[i] is in */ }",
        },
      ],
    },
  ],
};
