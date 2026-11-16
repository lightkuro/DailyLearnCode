# Writing Learn pages

Learn pages are crash courses on the concepts behind the questions. Each topic in
`src/content/topics.ts` has one page: `content/learn/<topic-id>.md`. The build copies them to
`public/learn/`; the site renders them at `/learn/<topic-id>`.

Check your pages with:

```bash
npx tsx scripts/validate-learn.ts <topic-id> [<topic-id> ...]
```

## File format

```markdown
---
title: Binary trees & traversals
summary: One sentence (max 220 characters) for the index card.
related: graphs, recursion-backtracking, heaps
terms:
  - binary tree
  - inorder traversal #depth-first-preorder-inorder-postorder
  - BST #binary-search-trees
---

## First section
...
```

- **title**: at most 60 characters. Don't repeat it as a `#` heading; start the body at `##`.
- **related**: other topic ids, comma separated.
- **terms**: phrases that should link to this page wherever they appear in Explore-topic panels
  and on other Learn pages. Add `#anchor` to jump to a section; the anchor is the section's heading
  slugified (lowercase, `&` and punctuation dropped, runs of other characters become `-`; e.g.
  `## Depth-first: preorder, inorder, postorder` → `#depth-first-preorder-inorder-postorder`).
  A term belongs to one page only, so only claim phrases that are this page's own subject.
  Include common plural/short forms as separate terms (`BST`, `BSTs`). 5–15 terms per page.

## Body

- At least three `##` sections; `###` for subsections. Aim for 1,200–2,500 words of prose plus
  code, tables and diagrams: enough to learn the topic from scratch, short enough to read in 10–15
  minutes.
- Plain, direct sentences. Bold the key terms where they're defined. Prefer short paragraphs,
  bullet lists and tables over walls of text.
- Markdown only: GFM tables, lists, `inline code`, fenced code. No raw HTML, no images.
- Link to other Learn pages with `[text](/learn/<topic-id>)`.
- Facts must be correct and current: complexity bounds, API names, default behaviours.

### Code

Put the same snippet in Python, Java and C++ as three fences in a row (`python`, `java`, `cpp`)
with only blank lines between them. The site merges them into one block that shows the reader's
language with tabs for the others. LeetCode style: a function or small class, standard library
only. Other languages (`sql`, `http`, `bash`, `text`, `json`) can be used as normal single fences.

### Diagrams

A ```` ```diagram ```` fence holds one JSON object, drawn as a themed SVG. Every type takes an
optional `caption` (max 200 characters). Keep them small and make sure they match the text exactly
(check traversal orders, distances and indices by hand or with a quick script).

**tree**: binary tree in LeetCode level order (`null` = missing child; children of a missing node
are skipped). `highlight`: node values in the accent colour. `order`: node values in visit order
(numbered badges). `notes`: `{value: "short note"}` under nodes.

```json
{"type":"tree","values":[1,2,3,4,5,null,6],"order":[4,2,5,1,3,6],"caption":"Inorder"}
```

**graph**: `nodes` are names (max 10 chars) or `{"id","x","y"}` to place them by hand (any units,
scaled to fit; all or none). `edges`: `[from,to]` or `[from,to,weight]`. `directed`: arrows.
`layout`: `circle` (default) or `layers` (BFS layers from the first node, left to right; good for
DAGs and BFS). `highlight`: nodes. `path`: a walk whose edges are highlighted. `order`: visit
badges. `notes`: `{node: "d=3"}`.

```json
{"type":"graph","nodes":["A","B","C","D"],"edges":[["A","B",4],["A","C",1],["C","B",2],["B","D",5]],"directed":true,"layout":"layers","path":["A","C","B","D"],"notes":{"A":"0","C":"1","B":"3","D":"8"}}
```

**array**: one row (`values`) or several (`rows`: `[{label, values, highlight, dim, pointers, window}]`).
`highlight` / `dim`: indices. `pointers`: `{"L":0,"R":5}` arrows under cells. `window`: `[lo,hi]`
bracket (inclusive). `indices`: show index numbers (default true). `vertical: true` draws one row
as a stack: the last value is the top (values in push order). Max 24 cells per row, 8 rows.

```json
{"type":"array","rows":[{"label":"start","values":[1,3,5,7,9],"pointers":{"L":0,"R":4}},{"label":"step 1","values":[1,3,5,7,9],"pointers":{"L":1,"R":4},"dim":[0]}]}
```

**list**: linked list; same fields as array rows (`values` or `rows`), plus `cycleTo`: the index the
last node points back to. Max 12 nodes.

```json
{"type":"list","values":[3,2,0,-4],"cycleTo":1,"pointers":{"slow":1,"fast":3}}
```

**grid**: `cells` rows (use `""` for empty), `highlight` / `dim`: `[[r,c],...]`, `path`: cells to
connect with a line in order, `rowLabels` / `colLabels` (lengths must match). Good for DP tables,
matrices and grid BFS. Max 12×16.

```json
{"type":"grid","cells":[["","","a","b"],["","0","1","2"],["a","1","0","1"]],"highlight":[[2,2]]}
```

**buckets**: a hash table; bucket `i` holds a chain of up to 5 entries. `highlight`: `[[bucket,pos]]`.

```json
{"type":"buckets","buckets":[["apple"],[],["kiwi","pear"],["fig"]],"highlight":[[2,1]]}
```

**flow**: boxes and arrows for architectures and pipelines. `nodes`: `{id, label (max 28 chars),
sub?, kind?, col (0–6, left to right), row? (order within the column), highlight?}` where `kind` is
`client`, `lb`, `service`, `cache`, `db`, `queue`, `external` or `box` (changes the shape/icon).
`edges`: `{from, to, label?, dashed?, both?}`.

```json
{"type":"flow","nodes":[{"id":"c","label":"Browser","kind":"client","col":0},{"id":"lb","label":"Load balancer","kind":"lb","col":1},{"id":"a1","label":"App 1","kind":"service","col":2,"row":0},{"id":"a2","label":"App 2","kind":"service","col":2,"row":1},{"id":"r","label":"Redis","sub":"cache","kind":"cache","col":3,"row":0},{"id":"db","label":"Postgres","kind":"db","col":3,"row":1}],"edges":[{"from":"c","to":"lb"},{"from":"lb","to":"a1"},{"from":"lb","to":"a2"},{"from":"a1","to":"r","dashed":true},{"from":"a2","to":"db"}]}
```

**complexity**: growth curves, chosen from `1`, `log n`, `n`, `n log n`, `n^2`, `2^n`, `n!`;
`highlight` picks curves to emphasise.

```json
{"type":"complexity","curves":["1","log n","n","n log n","n^2","2^n"],"highlight":["n log n"]}
```

## Language crash courses

Besides one page per topic, the Learn index has a **Language crash courses** section: `content/learn/lang-python.md`,
`lang-java.md`, `lang-cpp.md`, `lang-web.md` (JavaScript, TypeScript, HTML & React) and `lang-sql.md` (SQL & SQLite).
They're listed in `GUIDES` in `src/content/topics.ts` (no tags, no stats) and written for programmers who already know
another language: syntax, idioms, the standard library, tooling and gotchas, never what a loop is.

- Same front matter and validator as topic pages; diagrams are optional and the word count can run longer (3,000–6,000).
- Each page uses its own language's fences. Fences tagged `js`/`ts`/`tsx`, `sql` and `bash` get light highlighting.
- Never put a `python`, `java` and `cpp` fence back to back with only blank lines between: they would merge into one
  tabbed group. Put a line of prose between them, or compare languages in a table.

## How readers get around

Headings are the navigation, so write them to be scanned:

- Every `##` and `###` heading appears in the contents list (beside the article on wide screens, in the sheet
  opened from the bar under the header on phones). The bar shows the heading the reader is at, in one line: keep
  headings short (under about 40 characters) and specific ("Running median with two heaps", not "Another example").
- Pages with more than 14 headings fold their `###` entries under the `##` being read, so a `##` heading has to
  say what its sub-sections cover.
- Two headings on one page must not slugify to the same id.
- A new topic or guide needs no index work: the index is built from `TOPICS` and `GUIDES` (`LEARN_SECTIONS` in
  `src/content/learnNav.ts`). Give a guide with a long label a `short` one for the compact tiles.
