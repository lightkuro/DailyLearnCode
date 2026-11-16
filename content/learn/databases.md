---
title: Databases & indexing
summary: Tables and SQL, keys and normalisation, how B-tree indexes make queries fast (and when they don't), reading EXPLAIN, N+1 queries, NoSQL families, connection pools and pagination.
related: transactions, caching, system-design, distributed-systems, api-design
terms:
  - relational database #the-relational-model
  - primary key #keys-and-normalisation
  - foreign key #keys-and-normalisation
  - normalisation #keys-and-normalisation
  - database index #indexes
  - B-tree index #how-a-b-tree-lookup-works
  - clustered index #how-a-b-tree-lookup-works
  - composite index #composite-indexes-and-the-leftmost-prefix-rule
  - leftmost prefix #composite-indexes-and-the-leftmost-prefix-rule
  - covering index #covering-indexes
  - query plan #reading-explain
  - N+1 query #the-n-1-query-problem
  - NoSQL #sql-vs-nosql
  - connection pool #connection-pooling
  - keyset pagination #pagination-offset-vs-keyset
---

## The relational model

A **relational database** stores data in **tables**. Each table has a fixed set of typed **columns**, and each **row** is one record. Tables refer to each other through keys, and you query them with **SQL**, a declarative language: you describe *what* you want, and the **query planner** decides *how* to fetch it.

The examples on this page use two tables (PostgreSQL syntax; MySQL differs only in details):

```sql
CREATE TABLE customers (
  id         BIGINT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id          BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers (id),
  status      TEXT NOT NULL,              -- 'pending', 'paid', 'shipped'
  total_cents BIGINT NOT NULL,            -- money as integer cents, never floats
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Relational databases (PostgreSQL, MySQL, SQL Server, SQLite) are the sensible default: ad hoc queries that join anything to anything, constraints the database enforces (`NOT NULL`, `UNIQUE`, foreign keys, `CHECK`), and [transactions](/learn/transactions).

## SQL essentials

A query is written in one order but evaluated, logically, in another:

```text
FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT
```

That's why `WHERE` can't use aggregates like `COUNT(*)` (they don't exist yet) or, in most databases, aliases defined in `SELECT`, while `ORDER BY` can.

### Joins

| Join | Returns |
|---|---|
| `INNER JOIN` | Only rows with a match on both sides |
| `LEFT JOIN` | Every left row; right-side columns are `NULL` when nothing matches |
| `FULL OUTER JOIN` | Every row from both sides (MySQL lacks it; emulate with `UNION`) |
| `CROSS JOIN` | Every combination: m × n rows |

"Find rows with no match" is a `LEFT JOIN` plus a `NULL` check:

```sql
-- Customers who have never ordered
SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

Two traps:

- **Filtering the right table in `WHERE` turns a left join into an inner join.** `LEFT JOIN orders o ON ... WHERE o.status = 'paid'` drops customers with no paid orders, because `NULL = 'paid'` isn't true. Move the condition into `ON`.
- **Join fan-out.** A customer joined to 10 orders and 5 addresses gives 50 rows, and `SUM(total_cents)` counts each order 5 times.

The planner executes a join as a **nested loop** (look up matches for each outer row, ideally through an index), a **hash join** (hash the smaller input, probe with the larger) or a **merge join** (walk two sorted inputs). You'll see these names in `EXPLAIN`.

### GROUP BY and HAVING

`GROUP BY` collapses rows into one per group, and aggregates (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) summarise each group. `WHERE` filters rows *before* grouping; `HAVING` filters groups *after*.

```sql
-- Customers with more than 5 paid orders, biggest spenders first
SELECT customer_id, COUNT(*) AS paid_orders, SUM(total_cents) AS spent
FROM orders
WHERE status = 'paid'            -- row filter
GROUP BY customer_id
HAVING COUNT(*) > 5              -- group filter
ORDER BY spent DESC;
```

- Every column in `SELECT` must be grouped or aggregated.
- `COUNT(*)` counts rows; `COUNT(col)` skips `NULL`s.
- `x = NULL` is never true: use `IS NULL`. `NOT IN (subquery)` returns nothing if the subquery yields a `NULL`; prefer `NOT EXISTS`.

**Window functions** aggregate without collapsing rows. "Latest order per customer":

```sql
SELECT *
FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
  FROM orders o
) ranked
WHERE rn = 1;
```

## Keys and normalisation

- A **primary key** uniquely identifies a row: unique, not null, one per table. Most tables use a **surrogate key** (auto-increment `BIGINT` or a UUID) because natural values like emails change.
- A **foreign key** references another table's primary key, and the database enforces it: no orders for customers who don't exist, and `ON DELETE CASCADE` or `RESTRICT` decides what deleting a customer does. PostgreSQL doesn't index foreign-key columns automatically (InnoDB does), so index `orders.customer_id` yourself.
- A **unique constraint** is the only reliable way to prevent duplicates. Code that checks "does this email exist?" and then inserts can race: two requests both see "no" and both insert. With `UNIQUE`, the second insert fails.

Random UUIDv4 primary keys land all over the index, so inserts cause **page splits** and miss the cache. Sequential keys (auto-increment, or **UUIDv7**, which starts with a timestamp) append near the right edge. This matters most in InnoDB, which stores the table itself in primary-key order.

**Normalisation** means storing each fact once. If every order row repeated the customer's email, changing it means updating thousands of rows, and missing one leaves the data contradicting itself (an *update anomaly*).

| Form | Rule | Violation |
|---|---|---|
| 1NF | Each column holds one atomic value | `tags = 'red,green,blue'` |
| 2NF | No column depends on only *part* of a composite key | `product_name` in `order_items(order_id, product_id)` |
| 3NF | No column depends on another non-key column | `zip_code` and `city` in one customer row |

In short: every non-key column depends on *the key, the whole key, and nothing but the key*. **Denormalisation** copies data on purpose to speed up hot reads (a `comment_count` on each post), at the cost of keeping the copies in sync. Normalise first; denormalise where measurements say joins hurt.

## Indexes

Without an index, `WHERE email = 'ana@example.com'` reads every row: a **full table scan**, O(n). A **database index** is a separate sorted structure mapping column values to row locations, so the database can jump to matches in O(log n), like the index at the back of a book.

Indexes aren't free: every `INSERT`, `UPDATE` and `DELETE` must update every index on the table, and each one costs disk and memory. Index what you filter, join and sort on.

### How a B-tree lookup works

Almost every index is a **B-tree** (strictly a B+ tree): a balanced tree whose nodes are disk pages (8 KB in PostgreSQL, 16 KB in InnoDB) holding hundreds of keys. With a fan-out of about 300, three levels reach 27 million rows and four reach 8 billion. The top levels stay in memory, so a lookup costs one or two disk reads.

```diagram
{"type":"flow","nodes":[{"id":"root","label":"100 | 200","sub":"root page","kind":"box","col":0,"row":1,"highlight":true},{"id":"i1","label":"40 | 70","sub":"keys below 100","kind":"box","col":1,"row":0},{"id":"i2","label":"130 | 160","sub":"keys 100 to 199","kind":"box","col":1,"row":1,"highlight":true},{"id":"i3","label":"250 | 300","sub":"keys 200 and up","kind":"box","col":1,"row":2},{"id":"l1","label":"100 … 129","sub":"leaf page","kind":"box","col":2,"row":0},{"id":"l2","label":"130 … 159","sub":"leaf: 137 → row location","kind":"box","col":2,"row":1,"highlight":true},{"id":"l3","label":"160 … 199","sub":"leaf page","kind":"box","col":2,"row":2},{"id":"t","label":"orders table","sub":"the row itself","kind":"db","col":3,"row":1,"highlight":true}],"edges":[{"from":"root","to":"i1"},{"from":"root","to":"i2"},{"from":"root","to":"i3"},{"from":"i2","to":"l1"},{"from":"i2","to":"l2"},{"from":"i2","to":"l3"},{"from":"l2","to":"t","label":"fetch row"}],"caption":"Looking up id = 137: 137 is between 100 and 200, then between 130 and 160, and the leaf entry points at the row."}
```

Leaf pages are linked to their neighbours in key order, so a range query (`BETWEEN`, `>`, `ORDER BY ... LIMIT`) finds its first key and then walks sideways.

Where the row lives depends on the engine. In **InnoDB** (MySQL) the table *is* a B-tree ordered by primary key, a **clustered index**; secondary indexes store the primary key, so a lookup by email descends two trees. In **PostgreSQL** the table is an unordered heap, and every index points at a physical row location.

Other index types serve other jobs: hash (equality only), GIN (arrays, JSONB, full-text search), BRIN (huge append-only tables). **Partial indexes** (`WHERE status = 'pending'`) index only the rows you query, and **expression indexes** index a computed value like `lower(email)`.

### Composite indexes and the leftmost-prefix rule

A **composite index** on `(customer_id, status, created_at)` is sorted by `customer_id`, then `status` within each customer, then `created_at`: like a phone book sorted by surname, then first name. You can only seek on a **leftmost prefix** of its columns:

| Query condition | Seeks with `(customer_id, status, created_at)`? |
|---|---|
| `customer_id = 7` | Yes: first column |
| `customer_id = 7 AND status = 'paid'` | Yes: first two |
| `customer_id = 7 AND status = 'paid' AND created_at > '2026-01-01'` | Yes: all three |
| `customer_id = 7 AND created_at > '2026-01-01'` | Partly: seeks on `customer_id`, then filters `created_at` |
| `status = 'paid'` | No: the first column is missing |

Choosing the column order:

1. **Equality columns first, then the range or sort column.** A range (`>`, `BETWEEN`) on one column stops the index from narrowing by any column after it.
2. **Match `ORDER BY` to skip a sort.** `(customer_id, created_at)` answers `WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 20` by reading 20 entries backwards.

MySQL 8.0.13+ and PostgreSQL 18+ can sometimes *skip scan* when the leading column has few distinct values. Treat that as a bonus, not a design.

### Covering indexes

If an index holds every column a query needs, the database never visits the table. That's a **covering index**; the plan shows *Index Only Scan* (PostgreSQL) or *Using index* (MySQL).

```sql
-- Answers SELECT SUM(total_cents) FROM orders WHERE customer_id = 7 from the index alone
CREATE INDEX orders_customer_total ON orders (customer_id) INCLUDE (total_cents);
```

`INCLUDE` (PostgreSQL 11+, SQL Server) stores extra columns in the leaves without making them part of the key. In InnoDB every secondary index already carries the primary key.

### When indexes are skipped

You added an index and the plan still says sequential scan. Usual reasons:

- **A function on the column.** `WHERE lower(email) = ...` or `WHERE date(created_at) = '2026-11-06'` can't use a plain index. Index the expression, or rewrite as a range: `created_at >= '2026-11-06' AND created_at < '2026-11-07'`.
- **A leading wildcard.** `LIKE 'ana%'` can use a B-tree; `LIKE '%ana'` can't.
- **A type mismatch.** In MySQL, comparing a `VARCHAR` column with a number converts every row, so the index is ignored.
- **Low selectivity.** If the filter matches most of the table, one sequential read beats many random lookups, and the planner is right to scan.
- **Not a leftmost prefix** of a composite index.
- **Stale statistics.** The planner estimates from sampled statistics; run `ANALYZE` after bulk loads.

## Reading EXPLAIN

`EXPLAIN` shows the **query plan**; `EXPLAIN ANALYZE` actually runs the query and adds real row counts and timings (so wrap an `UPDATE` or `DELETE` in a transaction you roll back).

```text
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

Seq Scan on orders  (cost=0.00..20834.00 rows=50 width=48) (actual time=0.020..61.355 rows=51 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 999949
Planning Time: 0.071 ms
Execution Time: 61.380 ms
```

It read a million rows to return 51. After `CREATE INDEX ON orders (customer_id)`:

```text
Index Scan using orders_customer_id_idx on orders  (cost=0.42..204.31 rows=50 width=48) (actual time=0.019..0.081 rows=51 loops=1)
  Index Cond: (customer_id = 42)
Planning Time: 0.102 ms
Execution Time: 0.097 ms
```

| In the plan | What it tells you |
|---|---|
| `Seq Scan` (MySQL: `type: ALL`) | Whole table read: a red flag for a selective filter |
| `Index Scan`, `Bitmap Heap Scan` | An index found the rows; the table supplied the other columns |
| `Index Only Scan` (MySQL: `Using index`) | A covering index answered alone |
| `Rows Removed by Filter` | Rows read for nothing |
| Estimated vs actual `rows` far apart | Stale statistics; the planner may choose badly |
| `Sort` (MySQL: `Using filesort`) | An index matching `ORDER BY` could remove it |

`cost` is in the planner's abstract units, not milliseconds: compare plans with it, and read `actual time` for real timings.

## The N+1 query problem

The **N+1 query** problem is one query for a list, then one more per item. It usually comes from an ORM loading a relation lazily in a loop or template (`order.customer.name`):

```sql
SELECT * FROM orders WHERE status = 'paid' LIMIT 50;   -- 1 query
SELECT * FROM customers WHERE id = 17;                  -- then 1 per order
SELECT * FROM customers WHERE id = 4;
-- ... 48 more
```

Each query is fast, but each costs a network round trip (about half a millisecond inside a data centre) plus parsing and planning. It grows with the data, so it rarely shows up in tests. Fixes:

- **Join**: `SELECT o.*, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE ...`.
- **Batch**: collect the ids and run `WHERE id IN (17, 4, ...)`: two queries regardless of N.
- **Eager loading** in the ORM: Django's `select_related` / `prefetch_related`, Rails' `includes`, JPA's `JOIN FETCH`.

Catch it by counting queries per request in logs or tests.

## SQL vs NoSQL

**NoSQL** covers non-relational stores. Each gives up some of SQL's generality (joins, multi-row transactions, ad hoc queries) for a model that fits one access pattern well or spreads easily across machines.

| Family | Data model | Examples | Good for | Weak at |
|---|---|---|---|---|
| Document | JSON-like nested documents | MongoDB, Couchbase, Firestore | Data read as a unit (a product with its variants) | Joins, many-to-many |
| Key-value | Opaque value per key | Redis, DynamoDB, etcd | Sessions, carts, caches, lookups by id at huge scale | Any query not by key |
| Wide-column | Rows by partition key, sorted by a clustering key | Cassandra, ScyllaDB, Bigtable | Massive write volume, time series | Ad hoc queries |
| Graph | Nodes and edges | Neo4j, Amazon Neptune | Multi-hop relationships: social graphs, fraud rings | Bulk scans and aggregates |

How to choose:

- **Default to relational** unless a requirement pushes you away. One PostgreSQL or MySQL server with read replicas handles far more than most products need, and it stores JSON too.
- **Choose NoSQL for a known, simple access pattern at very large scale**, data that's naturally a document or graph, or multi-region writes with tunable consistency.
- **"Schemaless" means schema-on-read**: the application still expects a shape, so the schema moves into code.
- **In wide-column and key-value stores, design tables around queries**: list the queries first, then one table per query, denormalised.

Real systems mix them: PostgreSQL for orders, Redis as a [cache](/learn/caching), Elasticsearch for search. Replicas, quorums and CAP are covered in [Distributed systems](/learn/distributed-systems).

## Connection pooling

Opening a database connection costs a TCP handshake, often TLS, authentication and server-side setup (PostgreSQL forks a process per connection). Databases also cap connections: PostgreSQL's default `max_connections` is 100, MySQL's is 151. A **connection pool** keeps some connections open and lends them to requests.

```diagram
{"type":"flow","nodes":[{"id":"a1","label":"App instance 1","sub":"pool of 10","kind":"service","col":0,"row":0},{"id":"a2","label":"App instance 2","sub":"pool of 10","kind":"service","col":0,"row":1},{"id":"a3","label":"App instance 3","sub":"pool of 10","kind":"service","col":0,"row":2},{"id":"pb","label":"PgBouncer","sub":"transaction pooling","kind":"lb","col":1,"row":1},{"id":"db","label":"PostgreSQL","sub":"20 server connections","kind":"db","col":2,"row":1,"highlight":true}],"edges":[{"from":"a1","to":"pb"},{"from":"a2","to":"pb"},{"from":"a3","to":"pb"},{"from":"pb","to":"db"}],"caption":"Each instance keeps a small pool; an external pooler multiplexes 30 client connections onto 20 server connections."}
```

- **Bigger isn't better.** The database has fixed cores and disks; past a point, extra concurrent queries just queue. HikariCP's suggested start is `cores × 2 + effective spindle count`.
- **Count across instances.** Forty instances with pools of 20 want 800 connections. **PgBouncer** (or a managed proxy) multiplexes them onto a few. In *transaction* mode a server connection is lent for one transaction only, so session state (`SET`, session advisory locks) doesn't carry over.
- **Pool exhaustion.** Holding a connection while waiting on a slow HTTP call ties up the pool until new requests queue. Don't hold connections across remote calls, and give checkout a timeout.

## Pagination: offset vs keyset

**Offset pagination** asks for page 501 as `LIMIT 20 OFFSET 10000`:

```sql
SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 10000;
```

The database still produces the first 10,000 rows and throws them away, so deep pages get slower. And when a new order arrives mid-browse, every row shifts down one: the reader sees an item twice (or skips one after a delete).

**Keyset pagination** (the seek method) remembers where the last page ended:

```sql
SELECT * FROM orders
WHERE (created_at, id) < ('2026-11-01 09:30:00+00', 81234)   -- last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

With an index on `(created_at, id)` it seeks straight there: O(log n + limit) on any page, and inserts don't shift anything. The unique `id` tie-breaker stops rows with equal timestamps being skipped or repeated.

```diagram
{"type":"array","rows":[{"label":"OFFSET 6 LIMIT 3","values":[50,49,48,47,46,45,44,43,42,41,40,39],"dim":[0,1,2,3,4,5],"highlight":[6,7,8]},{"label":"WHERE id < 45","values":[50,49,48,47,46,45,44,43,42,41,40,39],"pointers":{"cursor":5},"highlight":[6,7,8]}],"caption":"Both return 44, 43, 42. OFFSET reads and discards the six dimmed rows first; keyset seeks to just after the cursor."}
```

Keyset can't jump to an arbitrary page, and the sort must match an index. For feeds and APIs that's fine; APIs wrap the last key in an opaque cursor (see [API design](/learn/api-design)).

## Interview questions and pitfalls

- **"A query got slow as the table grew."** `EXPLAIN ANALYZE` it. Look for a sequential scan on a selective filter, estimates far from actuals, or a sort an index could provide. Index the `WHERE` columns (equality first), then the `ORDER BY`.
- **"Index on `(a, b)`: does `WHERE b = 5` use it?"** Not for a seek: `b` isn't a leftmost prefix.
- **"Why not index every column?"** Each write updates every index, and most would never be chosen.
- **"How do you stop duplicate sign-ups?"** A `UNIQUE` constraint, and handle the violation.
- **Pitfalls:** `SELECT *` on hot paths (rules out covering indexes); unindexed foreign keys in PostgreSQL; deep `OFFSET` pagination; money as floating point (use integer cents or `NUMERIC`; see [Language gotchas](/learn/language-gotchas)).
