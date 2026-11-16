---
title: Tries
summary: Prefix trees for strings (insert, search, startsWith, autocomplete, word search II, radix trees), plus pattern matching with Rabin-Karp, KMP and the Z-function, and palindrome pairs.
related: trees, hashing, recursion-backtracking, arrays-strings, bit-manipulation
terms:
  - trie
  - tries
  - prefix tree
  - prefix trees
  - startsWith #insert-search-and-startswith
  - autocomplete #autocomplete
  - search suggestions #autocomplete
  - word search II #word-search-ii-trie-backtracking
  - radix tree #compressed-tries-radix-trees
  - radix trees #compressed-tries-radix-trees
  - compressed trie #compressed-tries-radix-trees
  - Patricia trie #compressed-tries-radix-trees
  - binary trie #other-trie-problems
  - Rabin-Karp #rabin-karp-rolling-hash-matching
  - Rabin–Karp #rabin-karp-rolling-hash-matching
  - rolling hash #rabin-karp-rolling-hash-matching
  - rolling hashes #rabin-karp-rolling-hash-matching
  - double hashing #collisions-and-choosing-the-modulus
  - KMP #kmp-the-failure-table
  - Knuth-Morris-Pratt #kmp-the-failure-table
  - failure table #kmp-the-failure-table
  - failure function #kmp-the-failure-table
  - lps array #kmp-the-failure-table
  - prefix function #kmp-the-failure-table
  - Z-function #the-z-function
  - Z-algorithm #the-z-function
  - palindrome pairs #palindrome-pairs
  - short encoding of words #suffixes-with-a-reversed-word-trie
  - reversed trie #suffixes-with-a-reversed-word-trie
---

## What a trie is

A **trie** (pronounced "try", from re*trie*val), also called a **prefix tree**, stores a set of strings by their characters. Each edge is labelled with one character, so every path from the root spells out a prefix. Words that start the same way share the same path for as long as they agree, and split where they differ.

Each node needs two things:

- its **children**, one per next character that some word uses;
- an **end-of-word flag**, because a node can be the end of one word and the middle of another ("car" inside "card").

```diagram
{"type":"graph","nodes":["root","c","d","ca","do","car","cat","dog","card"],"edges":[["root","c","c"],["root","d","d"],["c","ca","a"],["d","do","o"],["ca","car","r"],["ca","cat","t"],["do","dog","g"],["car","card","d"]],"directed":true,"layout":"layers","highlight":["car","card","cat","do","dog"],"path":["root","c","ca","car"],"caption":"A trie for car, card, cat, do and dog. Each node is named by the prefix it spells; highlighted nodes end a word. Looking up \"car\" walks the highlighted path."}
```

The root is the empty prefix. The trie above stores five words in 9 nodes, and "car", "card" and "cat" share the nodes for `c` and `ca`. That sharing is the point: any question about a prefix ("does anything start with `ca`?", "list everything starting with `ca`") becomes a walk down one path.

A trie is a tree (see [binary trees](/learn/trees)), but not a binary one: a node can have as many children as the alphabet has letters.

## Insert, search and startsWith

The three classic operations all walk down from the root one character at a time:

- **insert(word)**: for each character, follow the child if it exists, otherwise create it. Mark the last node as the end of a word.
- **search(word)**: follow the characters. If a child is missing, the word isn't there. If you reach the end, the word is there only if that node's end flag is set ("ca" is a prefix here, not a word).
- **startsWith(prefix)**: the same walk, but succeed as soon as the path exists. The end flag doesn't matter.

```python
class TrieNode:
    def __init__(self):
        self.children = {}                   # char -> TrieNode
        self.is_end = False                  # a word ends here

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def _walk(self, s):                      # the node for prefix s, or None
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_end

    def startsWith(self, prefix):
        return self._walk(prefix) is not None
```

```java
class Trie {
    private static class Node {
        Node[] children = new Node[26];      // children[ch - 'a']
        boolean isEnd;                       // a word ends here
    }

    private final Node root = new Node();

    public void insert(String word) {
        Node node = root;
        for (char ch : word.toCharArray()) {
            int i = ch - 'a';
            if (node.children[i] == null) node.children[i] = new Node();
            node = node.children[i];
        }
        node.isEnd = true;
    }

    private Node walk(String s) {            // the node for prefix s, or null
        Node node = root;
        for (char ch : s.toCharArray()) {
            node = node.children[ch - 'a'];
            if (node == null) return null;
        }
        return node;
    }

    public boolean search(String word) {
        Node node = walk(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }
}
```

```cpp
class Trie {
    struct Node {
        Node* children[26] = {};             // children[ch - 'a'], all null at first
        bool isEnd = false;                  // a word ends here
    };
    Node* root = new Node();

    Node* walk(const string& s) {            // the node for prefix s, or nullptr
        Node* node = root;
        for (char ch : s) {
            node = node->children[ch - 'a'];
            if (!node) return nullptr;
        }
        return node;
    }

public:
    void insert(const string& word) {
        Node* node = root;
        for (char ch : word) {
            int i = ch - 'a';
            if (!node->children[i]) node->children[i] = new Node();
            node = node->children[i];
        }
        node->isEnd = true;
    }

    bool search(const string& word) {
        Node* node = walk(word);
        return node && node->isEnd;
    }

    bool startsWith(const string& prefix) {
        return walk(prefix) != nullptr;
    }
};
```

The Python version stores children in a dictionary; the Java and C++ versions use a fixed array of 26, which assumes lowercase `a` to `z`. Both are standard. The next section is about when to pick which.

## Children: an array of 26 or a hash map

```diagram
{"type":"array","rows":[{"label":"a to m","values":["·","·","·","·","·","·","·","·","·","·","·","·","·"]},{"label":"n to z","values":["·","·","·","·","r","·","t","·","·","·","·","·","·"],"highlight":[4,6]}],"indices":false,"caption":"The children array of node \"ca\" from the trie above: 26 slots, two in use (r and t). A hash map would store just those two entries."}
```

| | Array of 26 (or 128, 256) | Hash map |
|---|---|---|
| Find a child | one index: `children[ch - 'a']` | a hash lookup: O(1) on average, slower in practice |
| Memory per node | always the full array, even with one child | proportional to the children actually present |
| Alphabet | small and known in advance | anything: Unicode, whole words, numbers |
| Iterating children | in alphabetical order for free | unordered (Python dicts keep insertion order; a `TreeMap` or `std::map` keeps sorted order) |

Use the array for lowercase-letter interview problems: it's fast and simple. Use a [hash map](/learn/hashing) when the alphabet is large or unknown, or when most nodes have only one or two children, which is typical of real-world word lists deeper than the first few letters.

In Python, a popular shortcut drops the node class entirely: each node is a `dict`, and a special key such as `"$"` marks the end of a word (or stores the word itself). You'll see that version in word search II below.

## How fast is it?

Every operation walks one node per character, so with `L` the length of the word or prefix:

- **insert, search, startsWith: O(L) time**, no matter how many words are stored. A trie with a million words answers `startsWith("ca")` in two steps.
- **Space: O(total characters inserted)** nodes in the worst case (no shared prefixes), each holding a children array or map. Shared prefixes cut that down.

How does that compare with storing the words in a hash set or a sorted list?

| Question | Hash set | Sorted list | Trie |
|---|---|---|---|
| Is `w` a word? | O(L) average | O(L log n) with binary search | O(L) |
| Does any word start with `p`? | O(n · L): check every word | O(L log n): [binary search](/learn/binary-search) for `p` | O(L) |
| All words starting with `p` | O(n · L) | O(L log n + output) | O(L + size of the subtree) |
| Words added over time | O(L) | O(n) per insert | O(L) |
| Memory | lowest | low | highest |

A hash set wins for plain membership. The trie earns its memory when prefixes matter, or when you're walking a path character by character and want to stop the moment no word can continue (the word search trick below).

## Autocomplete

**Autocomplete** is the textbook trie application: walk down to the node for what the user has typed, then collect the words below it with a DFS. With array children, a DFS that tries `a` to `z` in order returns the completions in alphabetical order for free.

Real systems rarely want *every* completion, just the top few. *Search suggestions system* asks for at most three lexicographically smallest products after each typed character. Rather than running a DFS for every keystroke, store the answer in the nodes: insert the products in sorted order, and let each node keep the first three words that pass through it.

```python
class Node:
    def __init__(self):
        self.children = {}
        self.top = []                        # up to 3 smallest words through this node

def suggested_products(products, search_word):
    root = Node()
    for word in sorted(products):            # sorted, so the first 3 to arrive are the smallest
        node = root
        for ch in word:
            node = node.children.setdefault(ch, Node())
            if len(node.top) < 3:
                node.top.append(word)
    out, node = [], root
    for ch in search_word:
        node = node.children.get(ch) if node else None
        out.append(node.top if node else [])
    return out
```

```java
class Node {
    Node[] children = new Node[26];
    List<String> top = new ArrayList<>();    // up to 3 smallest words through this node
}

List<List<String>> suggestedProducts(String[] products, String searchWord) {
    String[] sorted = products.clone();
    Arrays.sort(sorted);                     // sorted, so the first 3 to arrive are the smallest
    Node root = new Node();
    for (String word : sorted) {
        Node node = root;
        for (char ch : word.toCharArray()) {
            int i = ch - 'a';
            if (node.children[i] == null) node.children[i] = new Node();
            node = node.children[i];
            if (node.top.size() < 3) node.top.add(word);
        }
    }
    List<List<String>> out = new ArrayList<>();
    Node node = root;
    for (char ch : searchWord.toCharArray()) {
        node = node == null ? null : node.children[ch - 'a'];
        out.add(node == null ? new ArrayList<>() : node.top);
    }
    return out;
}
```

```cpp
struct Node {
    Node* children[26] = {};
    vector<string> top;                      // up to 3 smallest words through this node
};

vector<vector<string>> suggestedProducts(vector<string>& products, string searchWord) {
    sort(products.begin(), products.end());  // sorted, so the first 3 to arrive are the smallest
    Node* root = new Node();
    for (auto& word : products) {
        Node* node = root;
        for (char ch : word) {
            if (!node->children[ch - 'a']) node->children[ch - 'a'] = new Node();
            node = node->children[ch - 'a'];
            if (node->top.size() < 3) node->top.push_back(word);
        }
    }
    vector<vector<string>> out;
    Node* node = root;
    for (char ch : searchWord) {
        node = node ? node->children[ch - 'a'] : nullptr;
        out.push_back(node ? node->top : vector<string>{});
    }
    return out;
}
```

For `products = ["mobile", "mouse", "moneypot", "monitor", "mousepad"]` and `searchWord = "mouse"`, the answers are `["mobile", "moneypot", "monitor"]` for "m" and "mo", then `["mouse", "mousepad"]` for "mou", "mous" and "mouse". Each keystroke costs O(1) after the trie is built.

Ranking by popularity instead of alphabet works the same way: keep a count per word and store the top-k by count at each node, updating them on insert.

## Word search II: trie + backtracking

*Word search II* gives a grid of letters and a list of words, and asks which words can be traced through adjacent cells (up, down, left, right) without reusing a cell.

```diagram
{"type":"grid","cells":[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]],"path":[[0,0],[0,1],[1,1],[2,1]],"highlight":[[0,0],[0,1],[1,1],[2,1]],"caption":"Words oath, pea, eat and rain: \"oath\" is traced o → a → t → h, and \"eat\" is also found. Neither \"pea\" nor \"rain\" fits."}
```

The one-word version is a [backtracking](/learn/recursion-backtracking) DFS from every cell. Running it once per word repeats the same grid walks for every word that shares a prefix, and keeps exploring paths that no word could ever match.

Put all the words in a trie and do **one** backtracking search from each cell, moving down the trie as you move across the grid:

- Step from a cell to a neighbour only if the trie node has a child for that neighbour's letter. Paths that can't lead to any word die immediately; this pruning is where all the speed comes from.
- When the current node marks the end of a word, record it, then clear the mark so the same word isn't reported twice.
- Mark the cell as used (`#`) while it's on the current path, and restore it when backtracking.

```python
def find_words(board, words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w                        # "$" marks a word's end and holds the word
    rows, cols = len(board), len(board[0])
    found = []

    def dfs(r, c, parent):
        if not (0 <= r < rows and 0 <= c < cols):
            return
        ch = board[r][c]
        node = parent.get(ch)                # None for "#" or a letter no word continues with
        if node is None:
            return                           # prune
        if "$" in node:
            found.append(node.pop("$"))      # pop: report each word once
        board[r][c] = "#"                    # mark as used on this path
        dfs(r + 1, c, node)
        dfs(r - 1, c, node)
        dfs(r, c + 1, node)
        dfs(r, c - 1, node)
        board[r][c] = ch                     # un-mark when backtracking

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return found
```

```java
class Node {
    Node[] children = new Node[26];
    String word;                             // set on the node where a word ends
}

List<String> findWords(char[][] board, String[] words) {
    Node root = new Node();
    for (String w : words) {
        Node node = root;
        for (char ch : w.toCharArray()) {
            int i = ch - 'a';
            if (node.children[i] == null) node.children[i] = new Node();
            node = node.children[i];
        }
        node.word = w;
    }
    List<String> found = new ArrayList<>();
    for (int r = 0; r < board.length; r++)
        for (int c = 0; c < board[0].length; c++)
            dfs(board, r, c, root, found);
    return found;
}

void dfs(char[][] board, int r, int c, Node parent, List<String> found) {
    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;
    char ch = board[r][c];
    if (ch == '#') return;                   // already on this path
    Node node = parent.children[ch - 'a'];
    if (node == null) return;                // no word continues this way: prune
    if (node.word != null) {
        found.add(node.word);
        node.word = null;                    // report each word once
    }
    board[r][c] = '#';                       // mark as used on this path
    dfs(board, r + 1, c, node, found);
    dfs(board, r - 1, c, node, found);
    dfs(board, r, c + 1, node, found);
    dfs(board, r, c - 1, node, found);
    board[r][c] = ch;                        // un-mark when backtracking
}
```

```cpp
struct Node {
    Node* children[26] = {};
    string word;                             // non-empty on the node where a word ends
};

void dfs(vector<vector<char>>& board, int r, int c, Node* parent, vector<string>& found) {
    if (r < 0 || r >= (int)board.size() || c < 0 || c >= (int)board[0].size()) return;
    char ch = board[r][c];
    if (ch == '#') return;                   // already on this path
    Node* node = parent->children[ch - 'a'];
    if (!node) return;                       // no word continues this way: prune
    if (!node->word.empty()) {
        found.push_back(node->word);
        node->word.clear();                  // report each word once
    }
    board[r][c] = '#';                       // mark as used on this path
    dfs(board, r + 1, c, node, found);
    dfs(board, r - 1, c, node, found);
    dfs(board, r, c + 1, node, found);
    dfs(board, r, c - 1, node, found);
    board[r][c] = ch;                        // un-mark when backtracking
}

vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
    Node* root = new Node();
    for (auto& w : words) {
        Node* node = root;
        for (char ch : w) {
            if (!node->children[ch - 'a']) node->children[ch - 'a'] = new Node();
            node = node->children[ch - 'a'];
        }
        node->word = w;
    }
    vector<string> found;
    for (int r = 0; r < (int)board.size(); r++)
        for (int c = 0; c < (int)board[0].size(); c++)
            dfs(board, r, c, root, found);
    return found;
}
```

Building the trie costs O(total letters). The search is O(cells × 4 · 3^(L-1)) in the worst case, where `L` is the longest word: four directions for the first step, then at most three (you can't step back onto the cell you came from). In practice the trie prunes almost every path early. One more optimisation for big inputs: after a word is found, delete trie nodes that have no children and no word left, so later searches stop even sooner.

## Memory trade-offs

Tries are fast but hungry. Each node is a separate object with its own children array or map, and in the worst case there's one node per character inserted.

A rough worst case: 100,000 words of 8 letters with no shared prefixes is 800,000 nodes. With 26 eight-byte pointers each, that's 800,000 × 26 × 8 ≈ 166 MB for the arrays alone, to store under 1 MB of text. Real word lists share many prefixes, so it's usually much less, but the overhead per character stays large.

Ways to cut it down:

- **Hash-map children** store only the children that exist.
- **One big array of nodes** with integer indices instead of pointers (`children[node][ch]` as an `int` table) avoids per-object overhead and is easy to free all at once. Competitive programmers write tries this way.
- **Compress chains** of single-child nodes (next section).
- **Don't use a trie at all** if you only need membership: a hash set is smaller. If you need prefix queries on a fixed list, a sorted array with binary search is far smaller and nearly as fast.

## Compressed tries (radix trees)

In a plain trie, long words with no branching become long chains of nodes with one child each. A **compressed trie**, also called a **radix tree** (or **Patricia trie**), merges each such chain into a single edge labelled with a whole string. Every internal node then has at least two children (or ends a word), so the number of nodes is at most about twice the number of words, however long they are.

```diagram
{"type":"graph","nodes":["root","r","rom","rube","roman","romulus","rubens","ruber","romane","romanus"],"edges":[["root","r","r"],["r","rom","om"],["r","rube","ube"],["rom","roman","an"],["rom","romulus","ulus"],["rube","rubens","ns"],["rube","ruber","r"],["roman","romane","e"],["roman","romanus","us"]],"directed":true,"layout":"layers","highlight":["romane","romanus","romulus","rubens","ruber"],"caption":"A radix tree for romane, romanus, romulus, rubens and ruber: 10 nodes. The plain trie for the same words needs 19."}
```

Operations still take O(L) character comparisons, but each step compares a chunk of an edge label rather than one character. Inserting can split an edge: adding "rubicon" splits the edge "ube" into "ub", with children "e" and "icon".

Radix trees are what production systems use: IP routers do longest-prefix matching on addresses with them, many web frameworks route URLs with them (Go's httprouter, for one), and Redis stores streams in one. In interviews, knowing they exist and why (memory) is usually enough; implement the plain trie unless asked.

## Suffixes with a reversed-word trie

A trie shares **prefixes**. To share **suffixes**, insert every word **reversed**: words that end the same way then share a path from the root.

*Short encoding of words*: write the words into one string where each word is followed by `#`, and a word may be stored inside another as long as it ends at that word's `#`. What's the shortest encoding? `["time", "me", "bell"]` encodes as `"time#bell#"` (length 10): `"me"` is read from index 2 of `"time#"`.

A word can hide inside another exactly when it's a **suffix** of it. In the reversed trie, a suffix is a **prefix path**, so it ends at an internal node of the longer word's path. Only the words that end at a **leaf** have to be written out, each costing its length plus one for the `#`.

1. Insert each **distinct** word reversed, remembering the node where it ends.
2. Sum `len(word) + 1` over the words whose end node has no children.

```diagram
{"type":"graph","nodes":["root","e","m","l","em","ll","emi","lle","emit","lleb"],"edges":[["root","e","e"],["root","l","l"],["e","em","m"],["l","ll","l"],["em","emi","i"],["ll","lle","e"],["emi","emit","t"],["lle","lleb","b"]],"directed":true,"layout":"layers","highlight":["em","emit","lleb"],"caption":"Reversed time, me and bell. \"me\" ends at the internal node em (on the path to emit), so it costs nothing. The leaves give 4 + 1 + 4 + 1 = 10."}
```

```python
def minimum_length_encoding(words):
    # Word inside encoding only if it's suffix of another word
    # Insert reversed words, so shared suffixes become shared trie paths
    # Words ending at leaf are kept, each costing len + 1 (for "#")
    root = {}
    # (end node, word length) per distinct word
    ends = []
    for word in set(words):
        node = root
        for ch in reversed(word):
            node = node.setdefault(ch, {})
        ends.append((node, len(word)))
    # node with children = suffix of longer word, so it's free
    return sum(length + 1 for node, length in ends if not node)
```

```java
class TrieNode {
    TrieNode[] next = new TrieNode[26];
    // 0 = leaf
    int children;
}

int minimumLengthEncoding(String[] words) {
    // Word inside encoding only if it's suffix of another word
    // Insert reversed words, so shared suffixes become shared trie paths
    // Words ending at leaf are kept, each costing len + 1 (for "#")
    TrieNode root = new TrieNode();
    // end node of each distinct word
    Map<String, TrieNode> ends = new HashMap<>();
    for (String word : words) {
        if (ends.containsKey(word)) continue;
        TrieNode node = root;
        for (int i = word.length() - 1; i >= 0; i--) {
            int c = word.charAt(i) - 'a';
            if (node.next[c] == null) {
                node.next[c] = new TrieNode();
                node.children++;
            }
            node = node.next[c];
        }
        ends.put(word, node);
    }
    int total = 0;
    for (Map.Entry<String, TrieNode> e : ends.entrySet()) {
        // node with children = suffix of longer word, so it's free
        if (e.getValue().children == 0) total += e.getKey().length() + 1;
    }
    return total;
}
```

```cpp
struct TrieNode {
    TrieNode* next[26] = {};
    // 0 = leaf
    int children = 0;
};

int minimumLengthEncoding(const vector<string>& words) {
    // Word inside encoding only if it's suffix of another word
    // Insert reversed words, so shared suffixes become shared trie paths
    // Words ending at leaf are kept, each costing len + 1 (for "#")
    TrieNode root;
    // end node of each distinct word
    unordered_map<string, TrieNode*> ends;
    for (const string& word : words) {
        if (ends.count(word)) continue;
        TrieNode* node = &root;
        for (int i = word.size() - 1; i >= 0; i--) {
            int c = word[i] - 'a';
            if (!node->next[c]) {
                node->next[c] = new TrieNode();
                node->children++;
            }
            node = node->next[c];
        }
        ends[word] = node;
    }
    int total = 0;
    for (auto& [word, node] : ends) {
        // node with children = suffix of longer word, so it's free
        if (node->children == 0) total += word.size() + 1;
    }
    return total;
}
```

**O(total characters)** time and space. Pitfalls: **duplicates** (the same word twice would be counted twice unless you dedupe first), and deciding leaf-ness **after** all inserts (a word that's a leaf now may gain children from a later, longer word). The no-trie alternative: put all words in a set, remove every proper suffix of every word, and sum what's left, which is O(Σ L²) but short to write. The reversed trie is also the trick behind *stream of characters*, where you check whether any word ends at the newest character.

## Other trie problems

- **Add and search word with wildcards**: `.` matches any letter. Walk normally, and at a `.` try every child recursively.
- **Replace words**: replace each word in a sentence by its shortest root from a dictionary. Walk the word down the trie and stop at the first end-of-word node.
- **Counting prefixes**: store a counter in each node, incremented on every insert that passes through. "How many words start with `p`?" becomes O(L).
- **Stream of characters**: insert the words *reversed*, then after each new character, walk the trie backwards over the most recent characters to check whether any word ends here.
- **Maximum XOR of two numbers**: a **binary trie** stores numbers bit by bit from the highest bit. For each number, walk down greedily choosing the opposite bit whenever it exists; that maximises the XOR in O(32) per number (see [bit manipulation](/learn/bit-manipulation)).
- **Longest common prefix**: insert all words and walk from the root while there's exactly one child and no word ends.

## Rabin-Karp: rolling-hash matching

A trie answers questions about many words at once. To find a single pattern in a long text, the classic string tool is **Rabin-Karp**: compare hashes of the text's windows with the pattern's hash, and only compare characters when the hashes agree. Checking every window character by character costs O(n · m) for a text of length `n` and a pattern of length `m`; Rabin-Karp is O(n + m) expected.

The trick is a **rolling hash** that updates in O(1) as the window slides. Treat a string as a number in base `B`, modulo a large prime `M`:

`h(s) = (s[0]·B^(m−1) + s[1]·B^(m−2) + … + s[m−1]) mod M`

Sliding one step right removes the first character's term, shifts everything up one place and adds the new last digit:

`h' = ((h − s[i]·B^(m−1)) · B + s[i+m]) mod M`

1. Hash the pattern and the first window of the text.
2. At each position, if the hashes are equal, compare the characters to confirm.
3. Roll the window hash to the next position.

```diagram
{"type":"array","rows":[{"label":"i = 3","values":["a","b","r","a","c","a","d","a","b","r","a"],"window":[3,5]},{"label":"i = 4","values":["a","b","r","a","c","a","d","a","b","r","a"],"window":[4,6],"highlight":[4,5,6],"dim":[3]}],"caption":"Rolling from \"aca\" to \"cad\": subtract 'a' × B², multiply by B, add 'd'. Three operations, whatever the pattern length."}
```

```python
def str_str(text, pattern):              # first index of pattern in text, or -1
    n, m = len(text), len(pattern)
    if m > n:
        return -1
    B, MOD = 131, 1_000_000_007
    power = pow(B, m - 1, MOD)           # weight of the window's first character
    ph = th = 0
    for i in range(m):
        ph = (ph * B + ord(pattern[i])) % MOD
        th = (th * B + ord(text[i])) % MOD
    for i in range(n - m + 1):
        if th == ph and text[i:i + m] == pattern:   # equal hashes may be a collision: verify
            return i
        if i + m < n:                    # roll: drop text[i], append text[i + m]
            th = ((th - ord(text[i]) * power) * B + ord(text[i + m])) % MOD
    return -1
```

```java
int strStr(String text, String pattern) {    // first index of pattern in text, or -1
    int n = text.length(), m = pattern.length();
    if (m > n) return -1;
    final long B = 131, MOD = 1_000_000_007L;
    long power = 1;                          // weight of the window's first character
    for (int i = 0; i < m - 1; i++) power = power * B % MOD;
    long ph = 0, th = 0;
    for (int i = 0; i < m; i++) {
        ph = (ph * B + pattern.charAt(i)) % MOD;
        th = (th * B + text.charAt(i)) % MOD;
    }
    for (int i = 0; ; i++) {
        if (th == ph && text.regionMatches(i, pattern, 0, m)) return i;   // verify
        if (i + m == n) return -1;
        th = (th - text.charAt(i) * power % MOD + MOD) % MOD;   // drop text[i]; + MOD avoids negatives
        th = (th * B + text.charAt(i + m)) % MOD;              // append text[i + m]
    }
}
```

```cpp
int strStr(const string& text, const string& pattern) {   // first index, or -1
    int n = text.size(), m = pattern.size();
    if (m > n) return -1;
    const long long B = 131, MOD = 1'000'000'007;
    long long power = 1;                     // weight of the window's first character
    for (int i = 0; i < m - 1; i++) power = power * B % MOD;
    long long ph = 0, th = 0;
    for (int i = 0; i < m; i++) {
        ph = (ph * B + (unsigned char)pattern[i]) % MOD;
        th = (th * B + (unsigned char)text[i]) % MOD;
    }
    for (int i = 0; ; i++) {
        if (th == ph && text.compare(i, m, pattern) == 0) return i;      // verify
        if (i + m == n) return -1;
        th = (th - (unsigned char)text[i] * power % MOD + MOD) % MOD;   // drop text[i]
        th = (th * B + (unsigned char)text[i + m]) % MOD;              // append text[i + m]
    }
}
```

### Collisions and choosing the modulus

Different strings can share a hash: a **hash collision** (see [hash maps & sets](/learn/hashing#collisions)). Rabin-Karp stays correct only if you handle them:

- **Always verify a match** character by character. Without the check the algorithm is occasionally wrong. A spurious hit happens with probability about 1/M per window, so the checks add almost nothing on average. The worst case is still O(n · m), for example when the pattern really occurs at almost every position (`"aaa"` in `"aaaa…a"`).
- **Make M a large prime**, around 10⁹ (10⁹ + 7 or 998,244,353), so that `h · B` still fits in a 64-bit integer. A small modulus collides constantly.
- **Comparing many hashes with each other needs more bits.** In *longest duplicate substring* or *repeated DNA sequences* you compare windows against each other, not against one pattern, and by the birthday bound collisions become likely after about √M ≈ 30,000 windows. Use two independent moduli (**double hashing**) or the prime 2⁶¹ − 1 with 128-bit multiplication.
- **Make B larger than the alphabet** (131, 257, or a random value below M). A random base defeats test data built to break a fixed one.
- **Avoid M = 2⁶⁴**, letting unsigned overflow do the reduction. It's fast, but the Thue-Morse strings are known to collide for every base.
- **Negative remainders**: in Java and C++, `%` of a negative number is negative, so add M before reducing, as the code does. Python's `%` is never negative.

When you need a guaranteed O(n + m), [KMP](/learn/tries#kmp-the-failure-table) or the [Z-function](/learn/tries#the-z-function) does it without hashing. Rabin-Karp's advantages are its simplicity and the way the same rolling hash compares *any* two substrings in O(1) after O(n) preprocessing, which makes binary search on a substring length practical.

## KMP: the failure table

**KMP** (Knuth-Morris-Pratt) finds a pattern in a text in **O(n + m)** worst case, with no hashing. The naive search restarts one position to the right after a mismatch and rereads characters it has already matched. KMP never moves backwards in the text: after a mismatch it already knows how much of the pattern still matches, from a table built on the pattern alone.

That table is the **failure table**, also called the **lps array** or **prefix function**. `lps[i]` is the length of the longest **proper prefix** of `pattern[0..i]` that is also a **suffix** of it (a "border"; proper means not the whole string). For `"ababaca"`:

```diagram
{"type":"array","rows":[{"label":"pattern","values":["a","b","a","b","a","c","a"]},{"label":"lps","values":[0,0,1,2,3,0,1],"highlight":[4]}],"caption":"lps[4] = 3: \"aba\" is both a prefix and a suffix of \"ababa\". After matching \"ababa\" and then failing, the search continues as if it had matched \"aba\"."}
```

How the search uses it: keep `k`, the number of pattern characters matched so far. On a mismatch after `k` matches, the last `k` text characters equal `pattern[0..k-1]`, and the longest prefix of the pattern that could still be under way is that piece's border. So set `k = lps[k - 1]` and compare again, repeating until the character matches or `k` is 0. Searching `"ababaca"` in `"abababaca"`: after `"ababa"` the next text character `b` fails against `c`, `k` drops from 5 to `lps[4] = 3`, `b` matches `pattern[3]`, and the match completes at index 2.

Building the table is the same loop with the pattern searched in itself: `k` is the current border length, and each new character either extends it or falls back through `lps`.

```python
def kmp_search(text, pattern):
    # lps[i] (longest proper prefix of pattern[:i + 1] that is also its suffix)
    # On mismatch keep lps of what matched, so text pointer never moves back
    m = len(pattern)
    lps = [0] * m
    # k (length of current prefix-suffix match)
    k = 0
    for i in range(1, m):
        # mismatch, so fall back to next shorter border
        while k > 0 and pattern[i] != pattern[k]:
            k = lps[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        lps[i] = k
    # same walk over text (k = pattern chars matched)
    k = 0
    for i, ch in enumerate(text):
        while k > 0 and ch != pattern[k]:
            k = lps[k - 1]
        if ch == pattern[k]:
            k += 1
        # whole pattern matched, ending at i
        if k == m:
            return i - m + 1
    return -1
```

```java
int kmpSearch(String text, String pattern) {
    // lps[i] (longest proper prefix of pattern[0..i] that is also its suffix)
    // On mismatch keep lps of what matched, so text pointer never moves back
    int m = pattern.length();
    int[] lps = new int[m];
    // k (length of current prefix-suffix match)
    int k = 0;
    for (int i = 1; i < m; i++) {
        // mismatch, so fall back to next shorter border
        while (k > 0 && pattern.charAt(i) != pattern.charAt(k)) k = lps[k - 1];
        if (pattern.charAt(i) == pattern.charAt(k)) k++;
        lps[i] = k;
    }
    // same walk over text (k = pattern chars matched)
    k = 0;
    for (int i = 0; i < text.length(); i++) {
        char ch = text.charAt(i);
        while (k > 0 && ch != pattern.charAt(k)) k = lps[k - 1];
        if (ch == pattern.charAt(k)) k++;
        // whole pattern matched, ending at i
        if (k == m) return i - m + 1;
    }
    return -1;
}
```

```cpp
int kmpSearch(const string& text, const string& pattern) {
    // lps[i] (longest proper prefix of pattern[0..i] that is also its suffix)
    // On mismatch keep lps of what matched, so text pointer never moves back
    int m = pattern.size();
    vector<int> lps(m, 0);
    // k (length of current prefix-suffix match)
    int k = 0;
    for (int i = 1; i < m; i++) {
        // mismatch, so fall back to next shorter border
        while (k > 0 && pattern[i] != pattern[k]) k = lps[k - 1];
        if (pattern[i] == pattern[k]) k++;
        lps[i] = k;
    }
    // same walk over text (k = pattern chars matched)
    k = 0;
    for (int i = 0; i < (int)text.size(); i++) {
        while (k > 0 && text[i] != pattern[k]) k = lps[k - 1];
        if (text[i] == pattern[k]) k++;
        // whole pattern matched, ending at i
        if (k == m) return i - m + 1;
    }
    return -1;
}
```

**Why it's O(n + m).** In each loop, `k` goes up by at most 1 per character and every fallback lowers it by at least 1. It can't drop below 0, so the total number of fallbacks is at most the total number of increases: at most `n` for the search and `m` for the table.

Pitfalls:

- **Using `k = lps[k]`** instead of `lps[k - 1]`. The border belongs to the matched part, which ends at index `k - 1`.
- **Starting the table loop at `i = 0`.** `lps[0]` is always 0: a single character has no proper border.
- **Finding all matches**: after `k == m`, record it and set `k = lps[k - 1]` to keep going; that also finds overlapping matches.

The table is useful beyond searching. `lps[m - 1]` is the longest border of the whole string, which answers *longest happy prefix*; *repeated substring pattern* checks whether `lps[m − 1] > 0` and `m − lps[m − 1]` divides `m`; and *shortest palindrome* runs the table on `s + "#" + reverse(s)`.

## The Z-function

The **Z-function** is another linear-time matcher, often easier to remember. `z[i]` is the length of the longest substring starting at `i` that matches a **prefix** of the string (with `z[0]` set to 0 by convention).

To find a pattern, build `pattern + "#" + text`, with a separator that appears in neither string, and compute its Z-array. Every position with `z[i] = m` is a match, starting at `i − m − 1` in the text. The separator caps every value at `m`, so a match can't run on into the text.

```diagram
{"type":"array","rows":[{"label":"s","values":["a","a","b","#","b","a","a","b","a","a"],"window":[5,7]},{"label":"z","values":[0,1,0,0,0,3,1,0,2,1],"highlight":[5]}],"caption":"Pattern \"aab\", text \"baabaa\". z[5] = 3 = m, so the pattern occurs at text index 5 − 3 − 1 = 1."}
```

Computing it fast relies on the **Z-box** `[l, r)`: the match found so far that reaches furthest right, so `s[l..r)` equals `s[0..r−l)`. For a new `i` inside the box, `s[i..r)` equals `s[i−l..r−l)`, which was already measured: start `z[i]` at `min(r − i, z[i − l])`. Then extend by direct comparison, and if the match passes `r`, it becomes the new box.

```python
def z_function(s):
    # z[i] (length of longest match between s[i:] and s itself)
    # Box [l, r) = rightmost such match found; inside it, copy mirror's answer
    n = len(s)
    z = [0] * n
    l = r = 0
    for i in range(1, n):
        # inside box, so s[i:r] equals s[i - l:r - l]; reuse z[i - l], capped at box end
        if i < r:
            z[i] = min(r - i, z[i - l])
        # extend past what is known by direct comparison
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        # reaches further right, so it becomes new box
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z

def find_all(text, pattern):
    # '#' in neither string, so no z value can pass len(pattern)
    combined = pattern + "#" + text
    m = len(pattern)
    z = z_function(combined)
    # z = m at text position i - m - 1 means full match starts there
    return [i - m - 1 for i in range(m + 1, len(combined)) if z[i] == m]
```

```java
int[] zFunction(String s) {
    // z[i] (length of longest match between s[i..] and s itself)
    // Box [l, r) = rightmost such match found; inside it, copy mirror's answer
    int n = s.length();
    int[] z = new int[n];
    int l = 0, r = 0;
    for (int i = 1; i < n; i++) {
        // inside box, so s[i, r) equals s[i - l, r - l); reuse z[i - l], capped at box end
        if (i < r) z[i] = Math.min(r - i, z[i - l]);
        // extend past what is known by direct comparison
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
        // reaches further right, so it becomes new box
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}

List<Integer> findAll(String text, String pattern) {
    // '#' in neither string, so no z value can pass pattern length
    String combined = pattern + "#" + text;
    int m = pattern.length();
    int[] z = zFunction(combined);
    List<Integer> ans = new ArrayList<>();
    // z = m at text position i - m - 1 means full match starts there
    for (int i = m + 1; i < combined.length(); i++) if (z[i] == m) ans.add(i - m - 1);
    return ans;
}
```

```cpp
vector<int> zFunction(const string& s) {
    // z[i] (length of longest match between s[i..] and s itself)
    // Box [l, r) = rightmost such match found; inside it, copy mirror's answer
    int n = s.size();
    vector<int> z(n, 0);
    int l = 0, r = 0;
    for (int i = 1; i < n; i++) {
        // inside box, so s[i, r) equals s[i - l, r - l); reuse z[i - l], capped at box end
        if (i < r) z[i] = min(r - i, z[i - l]);
        // extend past what is known by direct comparison
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        // reaches further right, so it becomes new box
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}

vector<int> findAll(const string& text, const string& pattern) {
    // '#' in neither string, so no z value can pass pattern length
    string combined = pattern + "#" + text;
    int m = pattern.size();
    vector<int> z = zFunction(combined), ans;
    // z = m at text position i - m - 1 means full match starts there
    for (int i = m + 1; i < (int)combined.size(); i++) if (z[i] == m) ans.push_back(i - m - 1);
    return ans;
}
```

**O(n) time**: every successful comparison in the inner loop moves `r` right, and `r` never exceeds `n`. Pitfalls:

- **No separator, or one that can occur in the input.** Then `z` values can run past `m` into the text and real matches are missed by the `== m` test.
- **Forgetting the cap.** `z[i − l]` can describe a match that runs past the box; only the part inside the box is known, hence `min(r − i, …)`.

KMP and Z solve the same problems in the same time. Use whichever you can write without bugs; Rabin-Karp remains handy when you compare many substrings with each other.

## Palindrome pairs

*Palindrome pairs*: given a list of distinct words, find every ordered pair `(i, j)` with `i ≠ j` where `words[i] + words[j]` is a palindrome. Trying every pair is O(n² · L) for `n` words of length up to `L`.

Instead, split each word in every possible place, `word = left + right`, and look the reversed pieces up in a hash map from word to index:

- If `left` is a palindrome and `reverse(right)` is another word, that word goes **in front**: `reverse(right) + left + right` reads the same both ways, because the outer parts mirror each other and the middle is a palindrome.
- If `right` is a palindrome and `reverse(left)` is another word, that word goes **behind**: `left + right + reverse(left)`.

For `["abcd", "dcba", "lls", "s", "sssll"]`, splitting `"sssll"` into `"ss" | "sll"` finds that `"ss"` is a palindrome and `"sll"` reversed is `"lls"`, a word, so `"lls" + "sssll"` = `"llssssll"`. The full answer is `[1, 0], [0, 1], [3, 2], [2, 4]`.

```python
def palindrome_pairs(words):
    # Split each word into left + right at every cut
    # Left palindrome and reversed right is word, so that word goes in front
    # Right palindrome and reversed left is word, so that word goes behind
    index = {word: i for i, word in enumerate(words)}

    def is_pal(t):
        return t == t[::-1]

    ans = []
    for i, word in enumerate(words):
        for cut in range(len(word) + 1):
            left, right = word[:cut], word[cut:]
            # rev(right) + left + right, palindrome since left is
            j = index.get(right[::-1])
            if is_pal(left) and j is not None and j != i:
                ans.append([j, i])
            # left + right + rev(left); cut < len skips empty right, already found as empty left
            j = index.get(left[::-1])
            if cut < len(word) and is_pal(right) and j is not None and j != i:
                ans.append([i, j])
    return ans
```

```java
List<List<Integer>> palindromePairs(String[] words) {
    // Split each word into left + right at every cut
    // Left palindrome and reversed right is word, so that word goes in front
    // Right palindrome and reversed left is word, so that word goes behind
    Map<String, Integer> index = new HashMap<>();
    for (int i = 0; i < words.length; i++) index.put(words[i], i);
    List<List<Integer>> ans = new ArrayList<>();
    for (int i = 0; i < words.length; i++) {
        String word = words[i];
        for (int cut = 0; cut <= word.length(); cut++) {
            String left = word.substring(0, cut), right = word.substring(cut);
            // rev(right) + left + right, palindrome since left is
            Integer j = index.get(new StringBuilder(right).reverse().toString());
            if (isPal(left) && j != null && j != i) ans.add(List.of(j, i));
            // left + right + rev(left); cut < len skips empty right, already found as empty left
            j = index.get(new StringBuilder(left).reverse().toString());
            if (cut < word.length() && isPal(right) && j != null && j != i) ans.add(List.of(i, j));
        }
    }
    return ans;
}

boolean isPal(String t) {
    for (int l = 0, r = t.length() - 1; l < r; l++, r--)
        if (t.charAt(l) != t.charAt(r)) return false;
    return true;
}
```

```cpp
bool isPal(const string& t) {
    return equal(t.begin(), t.begin() + t.size() / 2, t.rbegin());
}

vector<vector<int>> palindromePairs(const vector<string>& words) {
    // Split each word into left + right at every cut
    // Left palindrome and reversed right is word, so that word goes in front
    // Right palindrome and reversed left is word, so that word goes behind
    unordered_map<string, int> index;
    for (int i = 0; i < (int)words.size(); i++) index[words[i]] = i;
    vector<vector<int>> ans;
    for (int i = 0; i < (int)words.size(); i++) {
        const string& word = words[i];
        for (int cut = 0; cut <= (int)word.size(); cut++) {
            string left = word.substr(0, cut), right = word.substr(cut);
            // rev(right) + left + right, palindrome since left is
            auto it = index.find(string(right.rbegin(), right.rend()));
            if (isPal(left) && it != index.end() && it->second != i) ans.push_back({it->second, i});
            // left + right + rev(left); cut < len skips empty right, already found as empty left
            it = index.find(string(left.rbegin(), left.rend()));
            if (cut < (int)word.size() && isPal(right) && it != index.end() && it->second != i)
                ans.push_back({i, it->second});
        }
    }
    return ans;
}
```

Each word has `L + 1` cuts, and each cut does O(L) work to reverse, hash and check: **O(n · L²) time**, O(n · L) space for the map. Pitfalls:

- **Duplicate pairs.** A cut with an empty `right` and a cut with an empty `left` (on the other word) find the same pair when a word and its reverse are both present. Skip the empty-`right` cut in the second check, as the code does.
- **Pairing a word with itself.** A palindrome's own reverse is itself; check `j != i`.
- **The empty string** pairs with every palindrome in both orders. The split rules handle it without a special case.

A trie of the **reversed** words does the same lookups while walking each word once, which helps when words are long. Either way, the core idea is the split.

## Pitfalls

- **search vs startsWith.** Forgetting the end-of-word check makes `search("ca")` return true when only "car" was inserted.
- **Alphabet assumptions.** `ch - 'a'` breaks on uppercase letters, digits or spaces. Check the constraints, or use a map.
- **Reporting duplicates** in word search II: clear the word at its node once found (or collect results in a set).
- **Restoring state when backtracking.** Put the grid letter back after exploring from a cell, or other paths will see a `#` that shouldn't be there.
- **Memory in C++.** LeetCode-style code never frees its nodes. In real code use `unique_ptr` children or a node pool.
- **Reaching for a trie when a set will do.** If the problem never asks about prefixes, a hash set is simpler and smaller.
- **Trusting a hash match** in Rabin-Karp. Equal hashes can be a collision: compare the characters before reporting a match.
