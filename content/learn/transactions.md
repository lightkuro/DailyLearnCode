---
title: Transactions & isolation
summary: ACID, the isolation levels and the anomalies each one allows, MVCC, pessimistic and optimistic locking, deadlocks, and what to do when a transaction spans several services.
related: databases, distributed-systems, concurrency, api-design
terms:
  - ACID #acid
  - isolation level #isolation-levels
  - dirty read #anomalies
  - non-repeatable read #anomalies
  - phantom read #anomalies
  - lost update #lost-update
  - write skew #write-skew
  - snapshot isolation #isolation-levels
  - MVCC #mvcc
  - pessimistic locking #pessimistic-select-for-update
  - optimistic locking #optimistic-version-columns
  - write-ahead log #acid
  - two-phase commit #two-phase-commit
  - saga pattern #sagas
  - transactional outbox #transactional-outbox
---

## What a transaction is

A **transaction** groups several reads and writes into one unit that either happens completely or not at all. The classic example is a transfer:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- or ROLLBACK to undo both
```

If the server crashes between the two updates, neither survives. Without `BEGIN`, most databases run in **autocommit** mode: each statement is its own transaction, so a crash between two statements leaves the first one applied.

Transactions solve two different problems, and it helps to keep them apart: surviving **failures** halfway through (atomicity, durability) and running **concurrently** with other transactions without seeing a mess (isolation).

## ACID

| Letter | Promise | How databases deliver it |
|---|---|---|
| **Atomicity** | All of the transaction's writes happen, or none do | After a crash or `ROLLBACK`, uncommitted changes are undone or never become visible |
| **Consistency** | Constraints and invariants hold before and after | `NOT NULL`, `UNIQUE`, foreign keys, `CHECK`; the rest is your code's job |
| **Isolation** | Concurrent transactions don't see each other's half-done work | Locks and/or MVCC, to the degree the isolation level says |
| **Durability** | Once `COMMIT` returns, the data survives a crash | A write-ahead log flushed to disk |

**Durability** comes from the **write-ahead log** (WAL; InnoDB calls it the redo log). Before changing data pages, the database appends a record of the change to a sequential log and `fsync`s it to disk; `COMMIT` returns only after that flush. Data pages are written later, in the background. After a crash, the database replays the log. Sequential appends are much cheaper than rewriting scattered pages, which is why this design is fast as well as safe. Durability on one disk doesn't survive losing the machine; that takes replication (see [Distributed systems](/learn/distributed-systems)).

The C in ACID is not the C in CAP. ACID consistency means "invariants hold"; CAP consistency means "every replica answers like a single copy".

## Anomalies

Running transactions one after another (serially) is always correct but slow. Running them concurrently is fast but lets these **anomalies** appear:

| Anomaly | What happens |
|---|---|
| **Dirty read** | T1 reads T2's uncommitted change; T2 then rolls back, so T1 used data that never existed |
| **Non-repeatable read** | T1 reads a row twice and gets different values, because T2 committed an update in between |
| **Phantom read** | T1 runs the same `WHERE` query twice and gets a different *set* of rows, because T2 inserted or deleted a matching row |
| **Lost update** | Two transactions read, modify and write the same value; one write silently overwrites the other |
| **Write skew** | Two transactions read the same data, decide based on it, then write *different* rows, breaking an invariant together |

### Lost update

```text
T1: SELECT stock FROM items WHERE id = 1;          -- 10
T2: SELECT stock FROM items WHERE id = 1;          -- 10
T1: UPDATE items SET stock = 9 WHERE id = 1; COMMIT;
T2: UPDATE items SET stock = 9 WHERE id = 1; COMMIT;
-- Two sales, but stock only dropped by one.
```

The read-modify-write cycle happened in application code, where the database can't see it. The simplest fix is to let the database do the arithmetic in one atomic statement:

```sql
UPDATE items SET stock = stock - 1 WHERE id = 1 AND stock > 0;
-- 0 rows updated means sold out
```

When the logic is too complex for one statement, use a lock or a version check (below).

### Write skew

A hospital rule: at least one doctor must be on call. Alice and Bob are both on call, and both feel ill:

```text
T1 (Alice): SELECT count(*) FROM doctors WHERE on_call;            -- 2, fine to leave
T2 (Bob):   SELECT count(*) FROM doctors WHERE on_call;            -- 2, fine to leave
T1: UPDATE doctors SET on_call = false WHERE name = 'Alice'; COMMIT;
T2: UPDATE doctors SET on_call = false WHERE name = 'Bob';   COMMIT;
-- Nobody is on call.
```

No row was written twice, so there's no write conflict to detect. Double-booking a meeting room and two users claiming the same username (checked by a `SELECT` first) are the same shape. Only serializable isolation, explicit locks on the rows that were read, or a constraint the database can enforce will stop it.

## Isolation levels

An **isolation level** is how much of that the database promises to prevent. Weaker levels allow more anomalies and run faster with less blocking. The SQL standard defines four, in terms of three anomalies:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read uncommitted | Possible | Possible | Possible |
| Read committed | Prevented | Possible | Possible |
| Repeatable read | Prevented | Prevented | Possible |
| Serializable | Prevented | Prevented | Prevented |

**Serializable** means the result equals *some* one-at-a-time ordering of the transactions. It's the only level that rules out every anomaly, including write skew.

Real engines implement the levels differently, and the differences come up in interviews:

| | PostgreSQL | MySQL (InnoDB) |
|---|---|---|
| Default | **Read committed** | **Repeatable read** |
| Read uncommitted | Behaves as read committed: no dirty reads, ever | Dirty reads possible |
| Read committed | Each *statement* sees data committed before it began | Same idea |
| Repeatable read | Snapshot isolation: no phantoms either; if two transactions update the same row, the second fails with a serialization error, so lost updates are caught | Plain `SELECT`s read a snapshot, but `UPDATE` and locking reads see the latest data; lost updates are *not* detected |
| Serializable | Serializable snapshot isolation: tracks read/write dependencies and aborts one transaction of a dangerous pair | Lock-based: plain `SELECT`s act like `SELECT … FOR SHARE` inside transactions |

SQL Server and Oracle also default to read committed. Oracle's "serializable" is really snapshot isolation.

**Snapshot isolation** gives each transaction a consistent view of the data as committed when it started. Reads never block and never see other transactions' later changes, which prevents dirty reads, non-repeatable reads and phantoms. But it still allows write skew, because each transaction checks its invariant against its own snapshot.

At serializable (and PostgreSQL's repeatable read), the database may abort a transaction with a **serialization failure** (SQLSTATE `40001`). That's normal, not a bug: the application must retry the *whole* transaction, so wrap it in a retry loop.

## MVCC

Most databases (PostgreSQL, InnoDB, Oracle, SQL Server's snapshot modes) implement isolation with **MVCC** (multi-version concurrency control). An update doesn't overwrite a row in place; it creates a new **version** stamped with the writing transaction's id. Each transaction reads the newest version that was committed before its snapshot was taken.

```diagram
{"type":"list","values":["100 (tx 90)","80 (tx 95)","50 (tx 99)"],"highlight":[1],"pointers":{"tx 92":0,"tx 97":1,"tx 99":2},"caption":"Three versions of one balance. tx 92 started before tx 95 committed, so it still sees 100; tx 97 sees 80; only tx 99, not yet committed, sees its own 50."}
```

The big win: **readers don't block writers and writers don't block readers.** A long report can read a stable snapshot while updates continue. Writers still conflict with each other on the same row: the second waits for the first to commit or roll back.

Old versions must be cleaned up once no snapshot needs them: PostgreSQL's `VACUUM` removes dead row versions, and InnoDB purges its undo log. A transaction left open for hours keeps every version since it started alive, so tables and undo logs bloat. Keep transactions short.

## Locking: pessimistic vs optimistic

When application code must read, think, then write, you need to stop someone else changing the data in between. There are two strategies.

### Pessimistic: SELECT … FOR UPDATE

**Pessimistic locking** assumes a conflict will happen and locks the rows first:

```sql
BEGIN;
SELECT stock FROM items WHERE id = 1 FOR UPDATE;   -- other FOR UPDATE / UPDATE on this row now wait
-- ... application logic ...
UPDATE items SET stock = stock - 1 WHERE id = 1;
COMMIT;                                            -- lock released
```

Plain `SELECT`s are not blocked (MVCC still serves them a snapshot). `FOR SHARE` takes a shared lock that blocks writers but not other sharers. Two useful modifiers: `NOWAIT` fails immediately instead of waiting, and `SKIP LOCKED` skips rows someone else holds, which turns a table into a simple job queue:

```sql
SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED;
```

### Optimistic: version columns

**Optimistic locking** assumes conflicts are rare. Nothing is locked; instead, each row carries a `version` and the write succeeds only if the version is unchanged:

```sql
SELECT id, body, version FROM docs WHERE id = 42;   -- version = 7

UPDATE docs
SET body = 'new text', version = version + 1
WHERE id = 42 AND version = 7;
-- 1 row updated: saved.  0 rows: someone saved first, so reload and retry (or show a conflict).
```

ORMs build this in (JPA's `@Version`, Rails' `lock_version`), and HTTP has the same idea with `ETag` and `If-Match` (see [API design](/learn/api-design)).

| | Pessimistic | Optimistic |
|---|---|---|
| Mechanism | Lock rows before changing them | Check a version when writing |
| On conflict | The other transaction waits | The loser retries |
| Best when | Conflicts are frequent and transactions are short | Conflicts are rare, or a human edits for minutes (you can't hold a lock across HTTP requests) |
| Risks | Lock waits, deadlocks | Many retries under heavy contention |

The general theory of locks and races is on the [Concurrency](/learn/concurrency) page.

## Deadlocks

Two transactions that lock the same rows in opposite orders can wait for each other forever:

```sql
-- T1                                    -- T2
UPDATE accounts ... WHERE id = 1;        UPDATE accounts ... WHERE id = 2;
UPDATE accounts ... WHERE id = 2;        UPDATE accounts ... WHERE id = 1;
-- waits for T2                          -- waits for T1
```

```diagram
{"type":"graph","nodes":["T1","row 2","T2","row 1"],"edges":[["T1","row 2","waits"],["row 2","T2","held by"],["T2","row 1","waits"],["row 1","T1","held by"]],"directed":true,"path":["T1","row 2","T2","row 1","T1"],"caption":"A wait-for cycle: T1 holds row 1 and waits for row 2; T2 holds row 2 and waits for row 1."}
```

Databases detect the cycle and abort one transaction (the victim) with an error: PostgreSQL checks after `deadlock_timeout` (1 second by default) and reports SQLSTATE `40P01`; InnoDB detects immediately and returns error 1213. To keep them rare:

- **Lock in a consistent order**, for example by sorting ids before updating several rows.
- **Keep transactions short**, and never wait on a network call while holding locks.
- **Retry** the aborted transaction; a deadlock is a normal, recoverable error.

## Distributed transactions

Everything above happens inside one database. Once an operation spans two databases or services (charge a card *and* reserve stock *and* create the order), there's no single log to commit to.

### Two-phase commit

**Two-phase commit** (2PC) adds a coordinator:

```text
Phase 1, prepare:  coordinator → every participant: PREPARE
                   each participant makes its changes durable, keeps its locks, votes YES or NO
Phase 2, commit:   all YES → coordinator logs COMMIT and tells everyone to commit
                   any NO  → coordinator logs ABORT and tells everyone to roll back
```

```diagram
{"type":"flow","nodes":[{"id":"app","label":"Application","kind":"client","col":0,"row":1},{"id":"co","label":"Coordinator","sub":"logs the decision","kind":"service","col":1,"row":1,"highlight":true},{"id":"p1","label":"Orders DB","sub":"prepared, holding locks","kind":"db","col":2,"row":0},{"id":"p2","label":"Payments DB","sub":"prepared, holding locks","kind":"db","col":2,"row":1},{"id":"p3","label":"Inventory DB","sub":"prepared, holding locks","kind":"db","col":2,"row":2}],"edges":[{"from":"app","to":"co","label":"commit"},{"from":"co","to":"p1","label":"prepare, then commit","both":true},{"from":"co","to":"p2","label":"prepare, then commit","both":true},{"from":"co","to":"p3","label":"prepare, then commit","both":true}],"caption":"Once a participant votes YES it can't decide alone: it must wait for the coordinator's decision."}
```

2PC gives real atomicity, but its weakness is **blocking**: a participant that voted YES is *in doubt* and must keep its locks until it hears the decision. If the coordinator crashes at that point, those rows stay locked until it recovers. Every transaction also waits for the slowest participant. 2PC (the XA standard) is used inside some databases and transaction managers, but rarely between microservices.

### Sagas

A **saga** splits the work into a sequence of local transactions, each committed on its own. If a step fails, the saga runs **compensating transactions** that semantically undo the earlier steps.

```diagram
{"type":"flow","nodes":[{"id":"o","label":"Create order","sub":"status PENDING","kind":"service","col":0,"row":0},{"id":"p","label":"Charge payment","sub":"local transaction","kind":"service","col":1,"row":0},{"id":"i","label":"Reserve stock","sub":"fails: out of stock","kind":"service","col":2,"row":0,"highlight":true},{"id":"r","label":"Refund payment","sub":"compensation","kind":"box","col":1,"row":1},{"id":"c","label":"Cancel order","sub":"compensation","kind":"box","col":0,"row":1}],"edges":[{"from":"o","to":"p"},{"from":"p","to":"i"},{"from":"i","to":"r","dashed":true},{"from":"r","to":"c","dashed":true}],"caption":"Forward steps along the top; when one fails, compensations undo the completed steps in reverse order."}
```

- **Orchestration**: a central orchestrator tells each service what to do next. Easier to follow and monitor.
- **Choreography**: each service reacts to the previous service's events. Looser coupling, but the flow is spread across services.
- **No isolation.** Other requests can see intermediate states (an order that's `PENDING`, money charged but stock not reserved). Model those states explicitly.
- **Compensations must be idempotent and retryable**, and some steps can't be undone (an email already sent), so the compensation is a correction instead.

### Transactional outbox

A service saves an order and then publishes `OrderCreated` to a message broker. If it crashes between the two, the order exists but nobody hears about it; publish first and you may announce an order that was never saved. This is the **dual-write** problem.

The **transactional outbox** fixes it: write the event into an `outbox` table *in the same local transaction* as the order. A separate relay reads new outbox rows (by polling, or by following the database's log with change data capture such as Debezium) and publishes them.

```diagram
{"type":"flow","nodes":[{"id":"s","label":"Order service","kind":"service","col":0},{"id":"db","label":"Database","sub":"orders + outbox, one commit","kind":"db","col":1,"highlight":true},{"id":"r","label":"Outbox relay","sub":"polling or CDC","kind":"service","col":2},{"id":"b","label":"Message broker","kind":"queue","col":3},{"id":"c","label":"Consumers","sub":"dedupe by event id","kind":"service","col":4}],"edges":[{"from":"s","to":"db","label":"INSERT both"},{"from":"db","to":"r","label":"new rows"},{"from":"r","to":"b","label":"publish"},{"from":"b","to":"c"}]}
```

The relay can crash after publishing but before marking the row as sent, so it may publish twice: delivery is **at-least-once**, and consumers must deduplicate by event id. Sagas usually use an outbox for each step's events.

## Interview questions and pitfalls

- **"Two customers buy the last item at once."** An atomic conditional `UPDATE ... WHERE stock > 0`, a `SELECT … FOR UPDATE`, or an optimistic version check; a `CHECK (stock >= 0)` constraint as a backstop.
- **"Default isolation in PostgreSQL? MySQL?"** Read committed; repeatable read.
- **"Repeatable read vs serializable?"** In the standard, phantoms. In snapshot-based engines, write skew.
- **"My serializable transaction failed with 40001."** Expected under contention: retry the whole transaction.
- **"Save to the database, then publish an event."** Transactional outbox, with idempotent consumers.
- **"Weakness of 2PC?"** Participants block, holding locks, if the coordinator fails after they vote YES.
- **Pitfalls:** calling slow external APIs inside a transaction (locks and connections held for seconds); long-running transactions blocking `VACUUM`; read-modify-write in application code at read committed; no retry for serialization failures and deadlocks.
