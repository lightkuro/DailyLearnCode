---
title: SQL & SQLite crash course
summary: SQL for programmers who already know another language: thinking in sets, SQLite's quirks, joins, NULLs, grouping, CTEs, window functions, the classic interview queries and how Postgres and MySQL differ.
related: databases, transactions, security, language-gotchas, hashing
terms:
  - SQLite #getting-started-with-sqlite
  - type affinity #types-and-type-affinity
  - STRICT table #types-and-type-affinity
  - three-valued logic #null-and-three-valued-logic
  - upsert #insert-and-upsert
  - anti-join #anti-joins-and-the-not-in-trap
  - self-join #inner-left-and-self-joins
  - common table expression #subqueries-and-ctes
  - recursive CTE #recursive-ctes
  - window function #window-functions
  - window functions #window-functions
  - EXPLAIN QUERY PLAN #indexes-and-explain-query-plan
---

## The mental model

SQL is **declarative**. You describe the table you want back; the database's query planner decides which loops to run, which indexes to use and in what order to join. That has three consequences that trip up programmers from imperative languages:

- **A table is an unordered bag of rows.** There is no "first row" and no stable order unless you write `ORDER BY`. Two runs of the same query may return rows in different orders, and usually won't until the day it matters.
- **Every query returns a table**, so queries compose: you can select from a subquery, join to it, or name it with `WITH` and use it like a variable.
- **You think about the whole set at once.** Instead of "for each order, look up its customer", you write "orders joined to customers on the id". Writing row-by-row logic (cursors, or a loop in your app that runs one query per row) is almost always slower and longer.

Most loops you'd write in Python or Java have a direct set-based equivalent:

| In imperative code you'd write | In SQL you write |
|---|---|
| a loop with an `if` that skips items | `WHERE` |
| `map` over items to compute fields | expressions in `SELECT` |
| nested loops matching ids | `JOIN` |
| a dict of lists, or a `Counter` | `GROUP BY` with `COUNT`, `SUM`, `MAX`… |
| sort, then slice the first k | `ORDER BY … LIMIT k` |
| "the previous item" while looping | `LAG(x) OVER (ORDER BY …)` |
| a running-sum variable | `SUM(x) OVER (ORDER BY …)` |
| recursion or BFS over a tree | `WITH RECURSIVE` |
| `None` / `null` | `NULL`, with very different comparison rules |

Keywords are case-insensitive (`select` works); the convention is uppercase keywords and snake_case names. Strings use **single quotes** (`'Ada'`); double quotes are for identifiers (`"order"`, a column named after a keyword). Comments are `--` to end of line or `/* … */`. Statements end with `;`.

### Logical order of evaluation

A `SELECT` is written in one order but evaluated, logically, in another:

```text
FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  DISTINCT  →  ORDER BY  →  LIMIT / OFFSET
```

Read queries in that order and most of SQL's rules stop looking arbitrary:

- `WHERE` runs before grouping, so it can't use aggregates (`WHERE COUNT(*) > 1` is an error). Filtering groups is what `HAVING` is for.
- `WHERE` runs before `SELECT`, so in standard SQL it can't see a column alias defined in `SELECT`. PostgreSQL and MySQL reject `SELECT price * qty AS total … WHERE total > 100`. SQLite accepts it as an extension, which is a good reason not to rely on it: repeat the expression or wrap the query in a subquery.
- `ORDER BY` runs after `SELECT`, so it *can* use aliases.
- **Window functions** are computed in the `SELECT` step, after `WHERE` and `HAVING`, so to filter on one you need an outer query (shown in [window functions](#window-functions)).

The real execution plan can look nothing like this; the planner is free to reorder anything as long as the result is the same.

## Getting started with SQLite

**SQLite** is an embedded SQL database: a C library linked into your program, with the whole database (tables, indexes, schema) in **one ordinary file**. There is no server, no user accounts and no network port. It ships inside Python, Android, iOS, every major browser and most phones, so it's the most widely deployed database there is. This page assumes SQLite 3.40 or newer and marks features that need something newer. Check yours with `sqlite3 --version`, or from Python with `sqlite3.sqlite_version`.

### The sqlite3 CLI

The `sqlite3` shell opens (or creates) a database file and gives you a prompt. If it isn't installed, Python 3.12+ has a basic one built in: `python3 -m sqlite3 app.db`.

```bash
sqlite3 app.db                       # interactive shell on app.db
sqlite3 app.db "SELECT count(*) FROM users;"
sqlite3 app.db .dump > backup.sql    # schema and data as SQL text
sqlite3 :memory:                     # throwaway in-memory database
```

Lines starting with a dot are shell commands, not SQL, and take no semicolon:

| Command | Does |
|---|---|
| `.tables` | list tables |
| `.schema users` | show the `CREATE` statements for a table |
| `.mode box` (or `.mode column` plus `.headers on`) | readable result tables |
| `.read schema.sql` | run a file of SQL |
| `.import --csv people.csv people` | load a CSV into a table |
| `.timer on` | print each query's run time |
| `.quit` | leave |

### Using it from Python

The standard library's `sqlite3` module is all you need. A **connection** is one open database; `execute` runs one statement and returns a cursor you can iterate.

```python
import sqlite3

# creates app.db if missing
conn = sqlite3.connect("app.db")
# rows readable by column name as well as index
conn.row_factory = sqlite3.Row
# per connection, and off by default
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")

# commits on success, rolls back on exception (does not close)
with conn:
    conn.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))
    conn.executemany("INSERT INTO users (name) VALUES (?)", [("Linus",), ("Grace",)])

for row in conn.execute("SELECT id, name FROM users WHERE name LIKE ?", ("%a%",)):
    print(row["id"], row["name"])
conn.close()
```

Two Python-specific surprises. First, by default the module silently opens a transaction before any `INSERT`, `UPDATE` or `DELETE`, and nothing is saved until you call `conn.commit()` (or leave a `with conn:` block). Forgetting it is the classic "my data vanished" bug. Python 3.12 added `sqlite3.connect(..., autocommit=False)`, which makes this explicit and is the documented recommendation for new code. Second, `execute` runs exactly one statement; `executescript` runs several, but it commits any pending transaction first and takes no parameters.

### When SQLite is the right choice

SQLite is a great fit for: application file formats and local storage, desktop and mobile apps, tests and prototypes, small-to-medium websites (it handles plenty of read traffic), data analysis on a single machine, and caches. It's the wrong fit when **many processes on many machines write concurrently** (there is one writer at a time per database file), when the database must be shared over a network filesystem (file locking there is unreliable), or when you need users, roles and remote access. That's when you reach for PostgreSQL or MySQL; almost everything on this page carries over, and the [dialect table](#dialect-differences) covers what doesn't.

## Creating tables

```sql
CREATE TABLE users (
  -- alias for rowid, filled in automatically
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT NOT NULL,
  age        INTEGER CHECK (age >= 0),
  -- parentheses needed when default is expression
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id      INTEGER PRIMARY KEY,
  -- deleting a user deletes their posts
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  -- table-level constraint over two columns
  UNIQUE (user_id, title)
);
```

`DROP TABLE IF EXISTS posts;` removes a table. `ALTER TABLE` in SQLite is limited to renaming tables and columns, adding a column, and (since 3.35) dropping one; bigger changes mean creating a new table, copying rows and renaming.

### Types and type affinity

Most databases enforce column types. Classic SQLite doesn't: types belong to **values**, and a column's declared type only gives it a **type affinity**, a preference SQLite applies when it can convert a value without loss. The rules look at the declared type name: anything containing `INT` gets INTEGER affinity, `CHAR`, `CLOB` or `TEXT` gives TEXT, `REAL`, `FLOA` or `DOUB` gives REAL, `BLOB` or no type gives BLOB, and everything else gets NUMERIC. Lengths are ignored:

```sql
CREATE TABLE loose (n INTEGER, s VARCHAR(3));
INSERT INTO loose VALUES ('42', 'far too long'), ('abc', 7);
SELECT n, typeof(n), s, typeof(s) FROM loose;
-- 42  | integer | far too long | text
-- abc | text    | 7            | text
```

The text `'42'` became the integer 42, `'abc'` was stored as text in an "integer" column, and `VARCHAR(3)` held twelve characters. SQLite has only five storage classes: `NULL`, `INTEGER` (up to 64-bit), `REAL` (64-bit float), `TEXT` and `BLOB`. There's no separate boolean type (`TRUE` and `FALSE` are just 1 and 0) and no date type (store ISO-8601 text such as `'2026-03-01 14:30:00'`, which sorts correctly, or Unix seconds as an integer).

A **STRICT table** (SQLite 3.37+) turns on real type checking. Column types must be `INT`, `INTEGER`, `REAL`, `TEXT`, `BLOB` or `ANY`, and a value that can't be converted losslessly is rejected:

```sql
CREATE TABLE scores (
  id    INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  score INTEGER NOT NULL
) STRICT;

-- fine ('42' converts losslessly)
INSERT INTO scores (label, score) VALUES ('a', '42');
-- deliberate error (cannot store TEXT value in INTEGER column scores.score)
INSERT INTO scores (label, score) VALUES ('b', 'lots');
```

Use `STRICT` for new tables unless you need old SQLite versions to read the file.

### Primary keys and rowid

Every ordinary SQLite table has a hidden 64-bit integer key called the **rowid**, and rows are stored in a B-tree ordered by it. A column declared exactly `INTEGER PRIMARY KEY` becomes an alias for the rowid: insert `NULL` (or leave it out) and SQLite picks `max(rowid) + 1`. That's the idiomatic auto-increment id.

- **`AUTOINCREMENT`** (`INTEGER PRIMARY KEY AUTOINCREMENT`) only changes one thing: ids are never reused, even after the row with the largest id is deleted. It costs an extra internal table write per insert, and SQLite's own docs advise against it unless you need that guarantee.
- **Only `INTEGER` counts.** `INT PRIMARY KEY` or `BIGINT PRIMARY KEY` makes a separate unique index and leaves the rowid hidden.
- A non-integer `PRIMARY KEY` in a non-STRICT table allows `NULL` for historical reasons, so write `NOT NULL` explicitly.

### Constraints and foreign keys

| Constraint | Effect |
|---|---|
| `NOT NULL` | rejects `NULL` |
| `UNIQUE` | no two rows equal (multiple `NULL`s are allowed, as in PostgreSQL) |
| `CHECK (expr)` | rejects a row when `expr` is false (`NULL` passes) |
| `DEFAULT value` | used when the insert omits the column |
| `REFERENCES t (col)` | foreign key; optional `ON DELETE CASCADE / SET NULL / RESTRICT` |
| `COLLATE NOCASE` | comparisons and uniqueness ignore ASCII case |

The big SQLite surprise: **foreign keys are not enforced unless you run `PRAGMA foreign_keys = ON` on each connection.** It isn't stored in the file. Without it, a `REFERENCES` clause is documentation:

```sql
CREATE TABLE parents (id INTEGER PRIMARY KEY);
CREATE TABLE children (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parents (id));

-- succeeds, though parent 99 doesn't exist
INSERT INTO children (parent_id) VALUES (99);

PRAGMA foreign_keys = ON;
-- deliberate error (FOREIGN KEY constraint failed)
INSERT INTO children (parent_id) VALUES (98);
```

Also index your foreign key columns yourself: neither SQLite nor PostgreSQL does it for you, and without one every parent delete scans the child table.

## Writing data

### INSERT and upsert

Name the columns, and insert many rows with one statement:

```sql
INSERT INTO users (email, name, age) VALUES
  ('ada@example.com', 'Ada', 36),
  ('linus@example.com', 'Linus', 28);

-- copy rows from query
INSERT INTO posts (user_id, title)
SELECT id, name || '''s first post' FROM users;
```

(Inside a string, a quote is written twice: `'Ada''s'`.)

An **upsert** inserts a row or, if it would violate a unique constraint, updates the existing one instead. In the `DO UPDATE` part, `excluded` is the row you tried to insert:

```sql
INSERT INTO users (email, name, age) VALUES ('ADA@example.com', 'Ada Lovelace', 37)
ON CONFLICT (email) DO UPDATE SET name = excluded.name, age = excluded.age;
-- updates Ada's row (email is UNIQUE COLLATE NOCASE)

CREATE TABLE word_counts (word TEXT PRIMARY KEY, n INTEGER NOT NULL);
-- counter idiom; run it twice and n = 2
INSERT INTO word_counts (word, n) VALUES ('sql', 1)
ON CONFLICT (word) DO UPDATE SET n = n + 1;
INSERT INTO word_counts (word, n) VALUES ('sql', 1)
ON CONFLICT (word) DO UPDATE SET n = n + 1;
```

`ON CONFLICT DO NOTHING` (or SQLite's older `INSERT OR IGNORE`) skips the row. Be wary of `INSERT OR REPLACE` / `REPLACE INTO`: it **deletes** the conflicting row and inserts a new one, so columns you didn't supply reset to their defaults, the row may get a new rowid, and `ON DELETE CASCADE` fires on its children.

### UPDATE, DELETE and RETURNING

```sql
UPDATE users SET age = age + 1 WHERE email = 'linus@example.com'
RETURNING id, age;

DELETE FROM users WHERE age IS NULL
RETURNING email;
```

`RETURNING` (SQLite 3.35+, PostgreSQL; not MySQL) hands back the affected rows, which saves a second query to fetch a generated id or a new value. From Python, `cursor.lastrowid` and `cursor.rowcount` give the last inserted id and the number of rows changed.

An `UPDATE` or `DELETE` without `WHERE` touches **every row**. When working by hand, run the same `WHERE` as a `SELECT` first, or do it inside a transaction you can roll back.

## Querying

The rest of the page uses this small company schema. Legal has no staff, Eve has no department, two people share 180 as a salary, and Bob reused Ada's email: each is there to make a query interesting.

```sql
CREATE TABLE departments (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER REFERENCES departments (id),
  manager_id INTEGER REFERENCES employees (id),
  salary     INTEGER NOT NULL,
  email      TEXT
);
INSERT INTO departments VALUES (1, 'Eng'), (2, 'Sales'), (3, 'Legal');
INSERT INTO employees VALUES
  (1, 'Ada',   1,    NULL, 250, 'ada@x.io'),
  (2, 'Linus', 1,    1,    180, 'linus@x.io'),
  (3, 'Grace', 1,    1,    180, 'grace@x.io'),
  (4, 'Alan',  1,    2,    120, NULL),
  (5, 'Mary',  2,    1,    150, 'mary@x.io'),
  (6, 'Bob',   2,    5,     90, 'ada@x.io'),
  (7, 'Eve',   NULL, 1,    100, NULL);
```

### NULL and three-valued logic

`NULL` means "unknown", not "nothing". Any comparison with an unknown is itself unknown, so SQL uses **three-valued logic**: TRUE, FALSE and NULL (unknown). `WHERE` and `HAVING` keep a row only when the condition is TRUE, and an unknown is quietly treated like FALSE.

```sql
SELECT NULL = NULL, NULL <> 1, NULL AND 0, NULL OR 1, NULL IS NULL, 1 IS NOT NULL;
-- NULL | NULL | 0 | 1 | 1 | 1
```

- `x = NULL` is never true. Test with `x IS NULL` / `x IS NOT NULL`.
- `WHERE email <> 'ada@x.io'` does **not** return Alan or Eve: their emails are NULL, so the comparison is unknown. Write `WHERE email IS NOT 'ada@x.io'` in SQLite, or `IS DISTINCT FROM` (standard; PostgreSQL, SQLite 3.39+) for null-safe comparison.
- Arithmetic and string concatenation with NULL give NULL: `salary + NULL`, `'a' || NULL`.
- `COALESCE(a, b, c)` returns the first non-NULL argument; `NULLIF(a, b)` returns NULL when `a = b` (handy as `x / NULLIF(y, 0)` to avoid dividing by zero; SQLite already returns NULL for that, PostgreSQL raises an error).
- Aggregates skip NULLs, `UNIQUE` lets several NULLs through, and `GROUP BY` puts all NULLs in one group.

### Filtering

```sql
SELECT name, salary
FROM employees
-- BETWEEN includes both ends
WHERE salary BETWEEN 100 AND 200
  AND dept_id IN (1, 2)
  -- % = any run of characters, _ = exactly one
  AND name LIKE 'a%';
-- Alan | 120
```

In SQLite `LIKE` ignores case for ASCII letters, so `'a%'` matched `Alan`; in PostgreSQL `LIKE` is case-sensitive and `ILIKE` isn't. SQLite's `GLOB` is the case-sensitive alternative, with shell wildcards (`'A*'`, `'?'`, `'[a-c]*'`). Plain `=` on text is case-sensitive in SQLite and PostgreSQL unless the column has `COLLATE NOCASE`, but case-insensitive under MySQL's default collation.

Watch the integer arithmetic: `7 / 2` is `3` in SQLite and PostgreSQL (both operands are integers), so averages and ratios need `7 * 1.0 / 2` or `CAST(x AS REAL)`. `AVG` already returns a float.

### CASE, COALESCE and ORDER BY

`CASE` is SQL's if/else expression and works anywhere an expression does:

```sql
SELECT name,
       CASE WHEN salary >= 200 THEN 'senior'
            WHEN salary >= 120 THEN 'mid'
            ELSE 'junior'
       END AS band,
       COALESCE(email, '(none)') AS contact
FROM employees
ORDER BY salary DESC, name
LIMIT 3 OFFSET 1;
-- Grace | mid | grace@x.io
-- Linus | mid | linus@x.io
-- Mary  | mid | mary@x.io
```

- `ORDER BY` takes several keys, each with its own `ASC` (default) or `DESC`. Add a unique tie-breaker (here `name`; often `id`) whenever you page through results, or rows with equal keys can shuffle between pages.
- SQLite and MySQL sort NULLs **first** in ascending order; PostgreSQL sorts them **last**. Say what you mean with `ORDER BY dept_id NULLS LAST` (SQLite 3.30+, PostgreSQL; MySQL lacks it, so use `ORDER BY dept_id IS NULL, dept_id`).
- `LIMIT n OFFSET m` skips m rows and returns n. Large offsets still read and discard the skipped rows; [keyset pagination](/learn/databases#pagination-offset-vs-keyset) scales better.
- `SELECT DISTINCT` removes duplicate result rows.

## Joins

A join pairs rows from two tables using a condition. The [databases page](/learn/databases#joins) covers the join types and the planner's join algorithms; this section is about writing them.

### Inner, left and self-joins

```sql
-- inner join drops Eve (no matching department)
SELECT e.name, d.name AS dept
FROM employees e
JOIN departments d ON d.id = e.dept_id;

-- left join keeps every employee (dept NULL for Eve)
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;
```

A **self-join** joins a table to itself under two aliases. Employees with their manager's name:

```sql
SELECT e.name, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY e.id;
-- Ada | NULL
-- Linus | Ada
-- Grace | Ada
-- Alan | Linus
-- Mary | Ada
-- Bob | Mary
-- Eve | Ada
```

Self-joins also answer "pairs" questions: `FROM employees a JOIN employees b ON a.dept_id = b.dept_id AND a.id < b.id` lists each pair of colleagues once (`<` rather than `<>` avoids both orders and self-pairs).

Writing tips:

- Give every table a short alias and prefix every column (`e.name`); unprefixed names break as soon as a second table has a column of the same name.
- Put the join condition in `ON` and row filters in `WHERE`. With a `LEFT JOIN` the difference matters: a condition on the right table in `WHERE` throws away the NULL rows and turns it into an inner join.
- `JOIN … USING (col)` is shorthand when both sides name the column the same.
- `RIGHT JOIN` and `FULL OUTER JOIN` work in SQLite 3.39+ and PostgreSQL. MySQL has `RIGHT` but no `FULL`. You rarely need `RIGHT`: swap the tables and use `LEFT`.
- A join on a non-unique key multiplies rows. Join a department to 4 employees and 3 projects at once and you get 12 rows, and `SUM(salary)` counts each salary 3 times. Aggregate in a subquery first, then join.

### Anti-joins and the NOT IN trap

"Rows in A with no match in B" is an **anti-join**. Two correct ways to find departments with nobody in them:

```sql
SELECT d.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;
-- Legal

SELECT d.name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
-- Legal
```

The one that looks most natural is wrong:

```sql
SELECT name FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees);
-- (no rows)
```

Eve's `dept_id` is NULL, so the list is `(1, 1, 1, 1, 2, 2, NULL)`. For Legal, `3 NOT IN (…, NULL)` means `3 <> 1 AND … AND 3 <> NULL`, and the last part is unknown, so the whole condition is unknown and the row is dropped. One NULL in the subquery empties the result. Prefer `NOT EXISTS`, or add `WHERE dept_id IS NOT NULL` inside the subquery. The positive forms (`IN`, `EXISTS`, a **semi-join**) don't have this problem.

## Aggregation

`GROUP BY` collapses rows into one per group; aggregate functions summarise each group. `HAVING` filters the groups.

```sql
SELECT d.name,
       COUNT(*)         AS staff,
       COUNT(e.email)   AS with_email,
       SUM(e.salary)    AS payroll,
       ROUND(AVG(e.salary), 1) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
HAVING COUNT(*) >= 2
ORDER BY payroll DESC;
-- Eng   | 4 | 3 | 730 | 182.5
-- Sales | 2 | 2 | 240 | 120.0
```

- `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of `col`; `COUNT(DISTINCT col)` counts distinct non-NULL values.
- Combined with a `LEFT JOIN`, `COUNT(*)` counts the padding row, so an empty group reports 1. Count a column from the right table instead:

```sql
SELECT d.name, COUNT(*) AS wrong, COUNT(e.id) AS staff
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name;
-- Eng   | 4 | 4
-- Sales | 2 | 2
-- Legal | 1 | 0
```

- `SUM` over no rows (or only NULLs) is NULL, not 0: wrap it as `COALESCE(SUM(x), 0)`. SQLite's `total(x)` returns `0.0` instead.
- **Every selected column must be grouped or aggregated.** PostgreSQL and MySQL (in its default `ONLY_FULL_GROUP_BY` mode) reject `SELECT dept_id, name … GROUP BY dept_id`. SQLite allows such "bare columns" and fills them from an arbitrary row of the group, except with a single `MIN` or `MAX`, where they come from the row holding that value. Handy, but not portable.
- **Conditional aggregation** counts several things in one pass. SQLite and PostgreSQL support `COUNT(*) FILTER (WHERE salary > 150)`; the portable form is `SUM(CASE WHEN salary > 150 THEN 1 ELSE 0 END)`.
- String aggregation: `group_concat(name, ', ')` in SQLite and MySQL (`GROUP_CONCAT(name SEPARATOR ', ')`), `string_agg(name, ', ')` in PostgreSQL and SQLite 3.44+. SQLite 3.44+ also accepts `ORDER BY` inside the call: `string_agg(name, ', ' ORDER BY name)`.

## Subqueries and CTEs

A subquery is a query in parentheses used as a value, a list or a table:

```sql
-- scalar subquery (one row, one column)
SELECT name, salary FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- correlated subquery: re-evaluated per outer row (e)
SELECT e.name, e.salary FROM employees e
WHERE e.salary > (SELECT AVG(salary) FROM employees x WHERE x.dept_id = e.dept_id);
-- Ada | 250
-- Mary | 150
```

A **common table expression** (CTE) names a subquery up front with `WITH`, so a query reads top to bottom like a sequence of assignments. It's the single best tool for keeping SQL readable:

```sql
WITH dept_avg AS (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY dept_id
)
SELECT e.name, e.salary, a.avg_salary
FROM employees e
JOIN dept_avg a ON a.dept_id = e.dept_id
WHERE e.salary > a.avg_salary;
-- Ada  | 250 | 182.5
-- Mary | 150 | 120.0
```

Separate several CTEs with commas (`WITH a AS (…), b AS (… FROM a …)`); later ones can use earlier ones. A CTE is visible only to its own statement. Modern planners (SQLite, PostgreSQL 12+, MySQL 8) usually inline a CTE like a subquery, so splitting a query this way costs nothing.

### Recursive CTEs

`WITH RECURSIVE` lets a CTE refer to itself. It has a base query, `UNION ALL`, then a recursive query that reads the rows produced in the previous step; it stops when a step produces no rows. The simplest one generates numbers:

```sql
WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 5
)
SELECT i FROM n;
-- 1, 2, 3, 4, 5 (one per row)
```

The useful ones walk trees and graphs, like a BFS one level per step. The whole reporting chain from the top:

```sql
WITH RECURSIVE chain(id, name, depth, path) AS (
  -- base case (people with no manager)
  SELECT id, name, 0, name FROM employees WHERE manager_id IS NULL
  UNION ALL
  -- each step adds direct reports of previous level
  SELECT e.id, e.name, c.depth + 1, c.path || ' / ' || e.name
  FROM employees e
  JOIN chain c ON e.manager_id = c.id
)
SELECT depth, path FROM chain ORDER BY path;
-- 0 | Ada
-- 1 | Ada / Eve
-- 1 | Ada / Grace
-- 1 | Ada / Linus
-- 2 | Ada / Linus / Alan
-- 1 | Ada / Mary
-- 2 | Ada / Mary / Bob
```

If the data can contain a cycle, `UNION ALL` loops forever. Use `UNION` (which discards rows already produced; enough when the row doesn't carry a growing path or depth), add a depth limit such as `WHERE c.depth < 20`, or keep a visited path and test `instr(path, …)`.

## Window functions

A **window function** computes a value for each row from a set of related rows (its window) **without collapsing them** the way `GROUP BY` does. The syntax is `function() OVER (PARTITION BY … ORDER BY … frame)`:

- `PARTITION BY` splits rows into independent groups (like `GROUP BY`, but rows stay).
- `ORDER BY` orders rows inside each partition, for ranking and running values.
- the **frame** picks which rows around the current one an aggregate sees.

SQLite has had them since 3.25, PostgreSQL for years, MySQL since 8.0.

### Ranking

```sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC, name) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense
FROM employees
ORDER BY salary DESC, name;
-- Ada   | 250 | 1 | 1 | 1
-- Grace | 180 | 2 | 2 | 2
-- Linus | 180 | 3 | 2 | 2
-- Mary  | 150 | 4 | 4 | 3
-- Alan  | 120 | 5 | 5 | 4
-- Eve   | 100 | 6 | 6 | 5
-- Bob   |  90 | 7 | 7 | 6
```

| Function | Gives | Ties |
|---|---|---|
| `ROW_NUMBER()` | 1, 2, 3, … | arbitrary order unless `ORDER BY` breaks ties |
| `RANK()` | 1, 2, 2, 4 | share a rank, then skip |
| `DENSE_RANK()` | 1, 2, 2, 3 | share a rank, no gap |
| `NTILE(k)` | bucket 1…k | splits rows into k near-equal groups |
| `LAG(x, n, default)` / `LEAD(…)` | `x` from n rows before / after | default 1 row; NULL past the edge |
| `FIRST_VALUE(x)` / `LAST_VALUE(x)` | first / last `x` in the frame | see frames below |
| `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` | aggregate over the frame | |

### Partitions and LAG

`PARTITION BY` restarts the calculation per group. Each employee next to their department's average, and how far each is above the previous person in salary order (`name` breaks the tie at 180):

```sql
SELECT name, dept_id, salary,
       AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg,
       salary - LAG(salary) OVER (PARTITION BY dept_id ORDER BY salary, name) AS above_prev
FROM employees
WHERE dept_id IS NOT NULL
ORDER BY dept_id, salary, name;
-- Alan  | 1 | 120 | 182.5 | NULL
-- Grace | 1 | 180 | 182.5 | 60
-- Linus | 1 | 180 | 182.5 | 0
-- Ada   | 1 | 250 | 182.5 | 70
-- Bob   | 2 |  90 | 120.0 | NULL
-- Mary  | 2 | 150 | 120.0 | 60
```

When several window calls share a definition, name it once: `… OVER w … WINDOW w AS (PARTITION BY dept_id ORDER BY salary)`.

### Frames

Without `ORDER BY` in the window, an aggregate sees the whole partition. **With** `ORDER BY`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: everything from the start of the partition up to the current row *and every row tied with it*. That's a running total, but tied rows all get the same total. Two consequences:

- For a strict row-by-row running total over a key with duplicates, write `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (or add a tie-breaker to `ORDER BY`).
- `LAST_VALUE(x) OVER (ORDER BY …)` returns the current row's value (the frame ends there). Use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, or `FIRST_VALUE` with the order reversed.

`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` gives a moving window of three rows.

You can't filter on a window function in `WHERE` (it doesn't exist yet at that step), so compute it in a CTE or subquery and filter outside. The next section does that repeatedly.

## Classic interview queries

LeetCode's database problems run on MySQL, PostgreSQL, SQL Server or Oracle, not SQLite. Everything below is standard SQL and runs on SQLite, PostgreSQL and MySQL 8 unless noted, so pick MySQL or PostgreSQL there and it should carry over.

### Second highest salary

Distinct values matter (two people on 180 shouldn't make 180 both first and second), and "no second salary" should give NULL rather than no rows. Wrapping the query in a scalar subquery handles the second point:

```sql
SELECT (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS second_highest;
-- 180

-- same answer without LIMIT
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```

For the Nth highest, use `OFFSET n - 1`, or `DENSE_RANK() … = n` as in the next query.

### Top N per group

Rank inside each partition, then filter in an outer query. `DENSE_RANK` keeps ties ("top 2 salaries" includes both people on 180); `ROW_NUMBER` would pick exactly two people.

```sql
WITH ranked AS (
  SELECT d.name AS dept, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS r
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
)
SELECT dept, name, salary
FROM ranked
WHERE r <= 2
ORDER BY dept, salary DESC, name;
-- Eng   | Ada   | 250
-- Eng   | Grace | 180
-- Eng   | Linus | 180
-- Sales | Mary  | 150
-- Sales | Bob   | 90
```

`ROW_NUMBER() … = 1` is the standard "latest row per user" query.

### Duplicates

Find values that appear more than once with `GROUP BY` and `HAVING`, and delete all but the lowest id with a correlated `EXISTS`:

```sql
SELECT email, COUNT(*) AS n
FROM employees
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
-- ada@x.io | 2

-- delete row when older row has same email
DELETE FROM employees
WHERE EXISTS (
  SELECT 1 FROM employees older
  WHERE older.email = employees.email AND older.id < employees.id
);
-- removes Bob (id 6)
```

MySQL refuses a subquery that reads the table being deleted from (error 1093); there you write it as a join: `DELETE e FROM employees e JOIN employees older ON older.email = e.email AND older.id < e.id`.

### Consecutive days (gaps and islands)

"Users who logged in three days in a row" is the **gaps and islands** pattern. Number each user's distinct days in order; within a run of consecutive days, date minus row number is constant, so it labels the run:

```sql
CREATE TABLE logins (user_id INTEGER, day TEXT);
INSERT INTO logins VALUES
  (1, '2026-03-01'), (1, '2026-03-02'), (1, '2026-03-02'),
  (1, '2026-03-03'), (1, '2026-03-05'),
  (2, '2026-03-01'), (2, '2026-03-03');

WITH numbered AS (
  SELECT user_id, day,
         -- constant within run of consecutive days
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS run_id
  FROM (SELECT DISTINCT user_id, day FROM logins)
)
SELECT user_id, MIN(day) AS first_day, MAX(day) AS last_day, COUNT(*) AS streak
FROM numbered
GROUP BY user_id, run_id
HAVING COUNT(*) >= 3;
-- 1 | 2026-03-01 | 2026-03-03 | 3
```

The `DISTINCT` matters: two logins on the same day would otherwise break the arithmetic. In PostgreSQL write `day - ROW_NUMBER() … * INTERVAL '1 day'` with a `date` column; in MySQL, `DATE_SUB(day, INTERVAL ROW_NUMBER() … DAY)`. For "compared with yesterday" problems (rising temperature), `LAG(x) OVER (ORDER BY day)` plus a check that the previous day really is one day earlier is simpler.

### Running totals and moving averages

```sql
CREATE TABLE sales (day TEXT PRIMARY KEY, amount INTEGER NOT NULL);
INSERT INTO sales VALUES
  ('2026-01-01', 100), ('2026-01-02', 50), ('2026-01-03', 75), ('2026-01-04', 25);

SELECT day, amount,
       SUM(amount) OVER (ORDER BY day) AS running_total,
       AVG(amount) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_3day
FROM sales;
-- 2026-01-01 | 100 | 100 | 100.0
-- 2026-01-02 |  50 | 150 | 75.0
-- 2026-01-03 |  75 | 225 | 75.0
-- 2026-01-04 |  25 | 250 | 50.0
```

`day` is unique here, so the default `RANGE` frame and `ROWS` agree. The pre-window way (a self-join summing all earlier rows) is O(n²); the window version is a single pass. The same idea in application code is a [prefix sum](/learn/prefix-sums).

## Indexes and EXPLAIN QUERY PLAN

An index is a separate B-tree keyed on some columns that lets the database find rows without reading the whole table. The [databases page](/learn/databases#indexes) explains how they work, composite-index column order and covering indexes. In SQLite:

```sql
CREATE INDEX idx_employees_dept_salary ON employees (dept_id, salary);
-- unique index (also how UNIQUE constraints are implemented)
CREATE UNIQUE INDEX idx_employees_email ON employees (email);
-- partial index (only rows matching WHERE)
CREATE INDEX idx_employees_no_email ON employees (id) WHERE email IS NULL;
-- expression index, used by queries on lower(name)
CREATE INDEX idx_employees_lower_name ON employees (lower(name));
DROP INDEX IF EXISTS idx_employees_lower_name;
```

(The unique index fails on the sample data until Bob's duplicate email is removed; that's the point of it.)

Prefix any query with `EXPLAIN QUERY PLAN` to see how SQLite will run it. `SCAN` means reading every row; `SEARCH … USING INDEX` means a B-tree lookup:

```sql
EXPLAIN QUERY PLAN
SELECT name FROM employees WHERE dept_id = 1 AND salary > 150;
```

```text
-- without the index
SCAN employees
-- with idx_employees_dept_salary
SEARCH employees USING INDEX idx_employees_dept_salary (dept_id=? AND salary>?)
```

Other things you'll see: `USING COVERING INDEX` (the index alone answered the query), `USE TEMP B-TREE FOR ORDER BY` (a sort that a matching index could remove), and `SEARCH … USING INTEGER PRIMARY KEY (rowid=?)` (direct rowid lookup, the fastest access there is). `EXPLAIN` without `QUERY PLAN` dumps SQLite's bytecode, which is rarely what you want. Run `ANALYZE` (or `PRAGMA optimize` before closing long-lived connections) so the planner has statistics to choose between indexes.

Indexes speed up reads and slow down every write to the table, so add them for the queries you actually run: columns in `WHERE`, `JOIN … ON` and `ORDER BY`, starting with foreign keys.

## Transactions and locking

A transaction groups statements so they all take effect or none do. Outside an explicit transaction, each statement is its own transaction (**autocommit**).

```sql
CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 500), (2, 0);

BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- or ROLLBACK to undo both
COMMIT;

-- savepoints nest inside a transaction
BEGIN;
SAVEPOINT before_bonus;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
ROLLBACK TO before_bonus;
COMMIT;
```

When a statement fails inside a transaction (say the `CHECK` rejects a negative balance), SQLite undoes that statement but leaves the transaction open; your code decides whether to `ROLLBACK`. PostgreSQL instead marks the whole transaction failed until you roll back.

Wrapping bulk work in one transaction is also the biggest SQLite performance tip: each autocommit statement waits for a disk sync, so 10,000 separate inserts can take seconds where one transaction takes milliseconds.

**SQLite's locking model** is simple: many connections can read at once, but only **one can write to the database file at a time**, and transactions are serializable. In the default rollback-journal mode, a committing writer also blocks readers briefly. **WAL mode** (`PRAGMA journal_mode = WAL;`, which is stored in the file) appends changes to a write-ahead log instead, so readers keep reading a consistent snapshot while a writer works and commits are cheaper; there's still one writer at a time. A second writer gets `SQLITE_BUSY` ("database is locked"). Set `PRAGMA busy_timeout = 5000` so it waits instead of failing at once (Python's `sqlite3.connect` already waits 5 seconds by default), keep write transactions short, and start transactions that will write with `BEGIN IMMEDIATE`, which takes the write lock up front rather than failing halfway through when a read transaction tries to upgrade. Isolation levels, MVCC, lost updates and deadlocks in multi-writer databases are on the [transactions page](/learn/transactions).

## Using SQL safely from code

Never build SQL by pasting values into a string. Pass them as **parameters**: the driver sends the SQL and the values separately, so a value can never be parsed as SQL. This is the whole defence against [SQL injection](/learn/security), and it also handles quoting, types and NULLs for you.

```python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
conn.executemany("INSERT INTO users (name) VALUES (?)", [("Ada",), ("Linus",)])
name = "x' OR '1'='1"

# injectable (input becomes SQL, returns every user)
rows = conn.execute(f"SELECT * FROM users WHERE name = '{name}'").fetchall()
# safe, positional placeholder
rows = conn.execute("SELECT * FROM users WHERE name = ?", (name,)).fetchall()
# safe, named placeholder
rows = conn.execute("SELECT * FROM users WHERE name = :name", {"name": name}).fetchall()

# IN list needs one placeholder per value
ids = [1, 2]
marks = ", ".join("?" * len(ids))
rows = conn.execute(f"SELECT name FROM users WHERE id IN ({marks})", ids).fetchall()

# identifiers can't be parameters, so map input onto fixed whitelist
sort_key = "newest"
order_by = {"name": "name", "newest": "id DESC"}[sort_key]
rows = conn.execute(f"SELECT name FROM users ORDER BY {order_by}").fetchall()
```

Placeholders stand for **values only**: not table or column names, not `ASC`/`DESC`. For those, choose from a fixed set in code, as in the last example. The syntax varies by driver: `?` and `:name` in Python's sqlite3 and in SQLite generally, `%s` in psycopg and most MySQL drivers for Python, `$1` in node-postgres, `?` in JDBC's `PreparedStatement`. ORMs and query builders parameterise for you, until you drop into a raw-SQL escape hatch with an f-string.

Two more habits: run independent queries in a loop as one set-based query where you can (the [N+1 query problem](/learn/databases#the-n-1-query-problem)), and keep schema changes in versioned migration files rather than ad-hoc `ALTER`s.

## Dialect differences

The core (`SELECT`, joins, `GROUP BY`, CTEs, window functions) is the same everywhere. These are the places SQLite, PostgreSQL and MySQL 8 disagree:

| | SQLite | PostgreSQL | MySQL 8 |
|---|---|---|---|
| Typing | per value, by affinity; `STRICT` to enforce | strict | strict (in default strict mode) |
| Auto-increment id | `INTEGER PRIMARY KEY` | `GENERATED ALWAYS AS IDENTITY` (older: `SERIAL`) | `AUTO_INCREMENT` |
| Boolean | integers 0 / 1 (`TRUE` = 1) | real `boolean` type | `BOOLEAN` = `TINYINT(1)` |
| String concat | `a \|\| b`, `concat()` (3.44+) | `a \|\| b`, `concat()` | `CONCAT(a, b)` (`\|\|` means OR) |
| `7 / 2` | 3 | 3 | 3.5000 (`7 DIV 2` = 3) |
| Case-insensitive match | `LIKE` (ASCII) | `ILIKE` | `LIKE` / `=` under default collation |
| Date and time types | none: TEXT or INTEGER | `date`, `timestamptz`, `interval` | `DATE`, `DATETIME`, `TIMESTAMP` |
| Now minus 7 days | `datetime('now', '-7 days')` | `now() - interval '7 days'` | `NOW() - INTERVAL 7 DAY` |
| Date parts | `strftime('%Y', d)` | `extract(year FROM d)`, `date_trunc` | `YEAR(d)`, `DATE_FORMAT` |
| Limit | `LIMIT n OFFSET m` | `LIMIT n OFFSET m` or `FETCH FIRST n ROWS ONLY` | `LIMIT n OFFSET m` or `LIMIT m, n` |
| Upsert | `ON CONFLICT (k) DO UPDATE SET c = excluded.c` | same | `ON DUPLICATE KEY UPDATE c = VALUES(c)` |
| `RETURNING` | yes (3.35+) | yes | no |
| NULLs in ascending sort | first | last | first |
| Null-safe equality | `IS`, `IS NOT` | `IS NOT DISTINCT FROM` | `<=>` |
| `FULL OUTER JOIN` | yes (3.39+) | yes | no |
| String aggregation | `group_concat`, `string_agg` (3.44+) | `string_agg` | `GROUP_CONCAT` |
| `SELECT` alias in `WHERE` | allowed (non-standard) | error | error |
| Non-grouped columns in `SELECT` | allowed | error | error (`ONLY_FULL_GROUP_BY`) |

A few more that bite when moving code between them:

- **Identifier quoting**: standard and PostgreSQL use `"double quotes"`, MySQL uses `` `backticks` `` (SQLite accepts both, and even accepts a double-quoted string as a string literal if no such column exists, which hides typos). PostgreSQL folds unquoted names to lowercase, so `CREATE TABLE "Users"` must then always be quoted.
- **Date arithmetic** is the least portable area; SQLite's modifiers also have edge cases (`date('2024-01-31', '+1 month')` is `'2024-03-02'`, because February 31 normalises forward).
- **Functions differ in name and meaning**: `IFNULL` (SQLite, MySQL) vs the standard `COALESCE` (all three); `LENGTH` counts characters in SQLite and PostgreSQL but bytes in MySQL (`CHAR_LENGTH` counts characters).
- **MySQL's `VALUES(c)`** in `ON DUPLICATE KEY UPDATE` is deprecated since 8.0.20 in favour of a row alias: `INSERT … VALUES (…) AS new ON DUPLICATE KEY UPDATE c = new.c`.

When in doubt, write the standard form (`COALESCE`, `CASE`, `CAST`, `||` or `concat`, `JOIN … ON`, CTEs and window functions), and test against the database you'll actually deploy on.
