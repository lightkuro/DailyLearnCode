---
title: Distributed systems
summary: Partial failure, partitions and unreliable clocks, CAP and PACELC, replication and quorums, consistency models, Raft, exactly-once as at-least-once plus dedup, logical clocks and consistent hashing.
related: system-design, databases, transactions, caching, api-design
terms:
  - network partition #unreliable-networks
  - fencing token #failover-and-split-brain
  - CAP theorem #cap-and-pacelc
  - PACELC #cap-and-pacelc
  - leader-follower replication #leader-follower
  - replication lag #leader-follower
  - quorum #leaderless-quorums
  - linearizability #consistency-models
  - eventual consistency #consistency-models
  - read-your-writes #consistency-models
  - Raft #consensus-and-raft
  - exactly-once #idempotency-and-exactly-once
  - Lamport clock #lamport-clocks
  - vector clock #vector-clocks
  - consistent hashing #consistent-hashing
---

## Why distributed systems are hard

A **distributed system** is a set of machines that cooperate over a network to act as one service: to scale beyond one machine, survive machine failures, or sit close to users worldwide. The price is a class of problems a single process never has.

### Partial failure

On one machine, things mostly either work or crash. Across machines, **partial failure** is normal: some parts work while others don't, and you often can't tell which. You send a request and hear nothing back. Any of these could have happened:

1. The request was lost on the way.
2. The remote node crashed before processing it.
3. It processed the request, then crashed before replying.
4. The reply was lost on the way back.
5. Everything is fine, just slow.

From the sender's side these look identical. The only tool is a **timeout**, and when it fires, you still don't know whether the operation happened. Retrying is safe only if the operation is idempotent (covered below). Retry with exponential backoff and jitter; the patterns for that live in [Git, deploys & reliability](/learn/devops).

### Unreliable networks

The "fallacies of distributed computing" are assumptions that fail in production: the network is reliable, latency is zero, bandwidth is infinite, the network is secure, and topology doesn't change.

A **network partition** is the extreme case: the network splits into groups of nodes that are all alive but can't reach each other. Each side sees the other as dead. Partitions are rare but do happen (a switch fails, a cable is cut, a misconfigured firewall), and the system's behaviour during one is what CAP is about.

### Unreliable clocks

Each machine has its own clock, and they disagree. Clocks drift, NTP corrects them in steps (so a clock can jump **backwards**), and virtual machines can pause for seconds. So:

- **Don't order events from different machines by wall-clock timestamps.** A later event can carry an earlier timestamp. "Last write wins" by timestamp silently drops the write that really came last.
- **Measure durations with a monotonic clock** (`time.monotonic()`, `System.nanoTime()`, `std::chrono::steady_clock`), never with the time of day.
- **When order matters, use logical clocks** (below), or bounded clock uncertainty like Google Spanner's TrueTime, which waits out the uncertainty before committing.

A node can also pause (a long garbage collection, a VM migration) and wake up believing it still holds a lock that expired meanwhile. That's why distributed locks need fencing tokens (below).

## CAP and PACELC

The **CAP theorem** says that when a network partition happens, a replicated system must choose between:

- **Consistency** (C): every read sees the latest write, as if there were a single copy (this is linearizability, not the C in ACID).
- **Availability** (A): every request to a working node gets a non-error answer.

Picture two data centres with the link between them cut. A user in data centre 2 reads a key that was just updated in data centre 1. Data centre 2 can refuse or wait until the link heals (**CP**: consistent, not available), or answer with the value it has, which may be old (**AP**: available, not consistent).

"Pick two of three" is misleading: partitions aren't optional, so the real choice is C or A *during a partition*, often made per operation.

**PACELC** extends CAP to the normal case: if there's a **P**artition, choose **A** or **C**; **E**lse, choose **L**atency or **C**onsistency. Even with a healthy network, waiting for replicas to confirm a write costs time.

| System | During a partition | Normally | Label |
|---|---|---|---|
| Cassandra, Riak, DynamoDB (default settings) | Stay available | Answer fast, possibly stale | PA/EL |
| Spanner, etcd, ZooKeeper | Stay consistent | Pay latency for consistency | PC/EC |

Many are tunable: Cassandra with `QUORUM` reads and writes is far more consistent than with `ONE`.

## Replication

**Replication** keeps copies of the same data on several nodes, so the data survives a node failure and reads can spread across copies. All the difficulty is in handling *changes*.

### Leader-follower

In **leader-follower replication** (primary-replica), one node, the leader, accepts all writes and streams a log of changes to the followers, which apply it in the same order. Reads can go to any node. This is how PostgreSQL, MySQL and MongoDB replicate by default.

```diagram
{"type":"flow","nodes":[{"id":"w","label":"Writes","kind":"client","col":0,"row":0},{"id":"r","label":"Reads","kind":"client","col":0,"row":2},{"id":"l","label":"Leader","sub":"accepts all writes","kind":"db","col":1,"row":0,"highlight":true},{"id":"f1","label":"Follower 1","sub":"read replica","kind":"db","col":2,"row":1},{"id":"f2","label":"Follower 2","sub":"read replica","kind":"db","col":2,"row":2}],"edges":[{"from":"w","to":"l"},{"from":"l","to":"f1","label":"replication log"},{"from":"l","to":"f2","label":"replication log"},{"from":"r","to":"f2","label":"may lag","dashed":true}]}
```

- **Synchronous**: the leader waits for followers before confirming. No loss on failover, but slower, and writes stall if a follower is down.
- **Asynchronous**: the leader confirms immediately. Fast, but writes not yet shipped are lost if the leader dies.
- **Semi-synchronous**: wait for one follower only. A common compromise.

With asynchronous followers, reads from a replica can be stale. The delay is the **replication lag**: usually milliseconds, but seconds or minutes under heavy load. Lag is what breaks the session guarantees described under consistency models.

### Failover and split brain

When the leader dies, a follower is promoted: detect the failure (by timeout), pick the most up-to-date follower, point writes at it. A too-short timeout causes needless failovers when the leader is merely slow.

The worst case is **split brain**: the old leader was only cut off, not dead, and keeps accepting writes while the new leader does too. The defence is a **fencing token**: every time leadership (or a lock) is granted, it comes with a number higher than any before. Storage remembers the highest token it has seen and rejects writes carrying a lower one, so a stale leader waking from a pause is refused. Raft's term numbers play the same role.

### Multi-leader

**Multi-leader** replication lets several nodes accept writes, typically one per data centre, replicating to each other asynchronously. Writes are fast locally and each region survives the others going down; offline-capable apps work the same way, with each device as a leader. The cost is **write conflicts** (one record edited in two places), resolved by last write wins (loses data), merging (CRDTs: counters and sets designed to merge automatically), or keeping both versions for the application to reconcile.

### Leaderless quorums

In **leaderless** replication (Dynamo-style: Cassandra, Riak, ScyllaDB), the client or a coordinator sends each write to all **N** replicas and treats it as successful after **W** acknowledge. Reads ask **R** replicas and keep the newest version. A **quorum** is that minimum number of replicas that must take part.

If **R + W > N**, every set of R replicas overlaps every set of W replicas, so a read always reaches at least one replica holding the latest acknowledged write. With N = 3, the usual choice is W = 2 and R = 2.

```diagram
{"type":"grid","cells":[["v2","v2","v1"],["","v2","v1"]],"rowLabels":["write W=2","read R=2"],"colLabels":["replica 1","replica 2","replica 3"],"highlight":[[0,0],[0,1],[1,1]],"dim":[[0,2],[1,2]],"caption":"N = 3. The write of v2 reached replicas 1 and 2; replica 3 still has v1. The read asks replicas 2 and 3, and replica 2 guarantees it sees v2."}
```

W = N, R = 1 gives fast reads but writes fail if any replica is down; W = 1, R = N is the reverse. Stale replicas catch up through **read repair** (a read that sees an old version writes back the new one) and background **anti-entropy**. Even with R + W > N, concurrent and partially failed writes mean quorums alone aren't linearizable.

## Consistency models

A **consistency model** is the contract for what reads may return while replicas are catching up. From strongest to weakest:

| Model | Guarantee | Typical cost or technique |
|---|---|---|
| **Linearizability** (strong) | The system behaves like a single copy: once a write completes, every later read sees it | A single leader or consensus; a round trip to a majority per operation; unavailable during partitions |
| Causal | Effects never appear before their causes: nobody sees a reply before the comment it answers | Track dependencies between writes |
| **Read-your-writes** | A user always sees their own updates | Read from the leader for a short time after writing, or from a replica that has caught up to the user's last write |
| Monotonic reads | A user never sees data go backwards in time | Pin each user's reads to one replica |
| **Eventual consistency** | If writes stop, all replicas eventually agree | Cheapest; any read may be stale |

The middle three fix specific glitches cheaply. A user edits their profile, reloads, and sees the old name: read-your-writes is missing. A comment disappears on refresh, then reappears: monotonic reads is missing (the second read hit a more-lagged replica).

## Consensus and Raft

**Consensus** is getting several nodes to agree on a value, or a sequence of values, even when some crash. It underpins leader election, distributed locks, configuration stores and strongly consistent replication; etcd (used by Kubernetes), ZooKeeper and Consul provide it as a service.

Consensus needs a **majority**: a cluster of 2f + 1 nodes survives f failures. Three nodes tolerate one failure, five tolerate two. Four nodes still tolerate only one, so clusters have odd sizes. Any two majorities overlap, which is what stops two halves of a partitioned cluster from both making progress.

**Raft** is the consensus algorithm most systems use today (etcd, Consul, CockroachDB, TiKV, Kafka's KRaft mode). It was designed to be understandable, as an alternative to the notoriously subtle Paxos.

### Leader election

Each node is a **follower**, a **candidate** or the **leader**. Time is divided into numbered **terms**, each with at most one leader.

```diagram
{"type":"graph","nodes":["Follower","Candidate","Leader"],"edges":[["Follower","Candidate","timeout"],["Candidate","Leader","majority"],["Candidate","Follower","lost"],["Leader","Follower","higher term"]],"directed":true,"layout":"layers","caption":"Raft roles. A follower that hears nothing becomes a candidate; a majority of votes makes it leader; seeing a higher term sends anyone back to follower."}
```

- The leader sends regular heartbeats. A follower that hears nothing for its **election timeout** (randomised, for example 150 to 300 ms) becomes a candidate: it increments the term, votes for itself and requests votes.
- Each node votes once per term, and only for a candidate whose log is at least as up to date as its own, so a new leader always has every committed entry.
- A majority makes the candidate leader. After a split vote, the randomised timeouts make a repeat unlikely.

### Log replication

1. A client sends a command (say `SET x = 5`) to the leader.
2. The leader appends it to its log and sends it to the followers (`AppendEntries`).
3. Once a majority of nodes, the leader included, have stored the entry, it's **committed**.
4. The leader applies it to its state machine and replies to the client; followers apply it once they learn it's committed.

Every node applies the same commands in the same order and so reaches the same state: a **replicated state machine**. A follower that missed entries is caught up by the leader.

## Idempotency and exactly-once

Messages between services come with one of three delivery guarantees:

| Guarantee | How | Risk |
|---|---|---|
| At-most-once | Send once, never retry | Messages can be lost |
| At-least-once | Retry until acknowledged | Messages can arrive twice |
| Exactly-once | ? | Not achievable as *delivery* |

The sender can't tell "message lost" from "acknowledgement lost", so it either retries (risking a duplicate) or doesn't (risking a loss). What systems call **exactly-once** is an exactly-once *effect*: **at-least-once delivery plus idempotent processing**. An operation is **idempotent** if doing it twice has the same effect as doing it once: `SET balance = 100` is, `balance = balance + 100` isn't.

To make a non-idempotent handler safe, record each message's unique id in the same transaction as its effect:

```sql
BEGIN;
INSERT INTO processed_messages (message_id) VALUES ('evt_81f2');   -- primary key: a duplicate fails here
UPDATE accounts SET balance = balance + 100 WHERE id = 7;
COMMIT;
-- On a duplicate-key error: roll back and acknowledge the message; it was already applied.
```

Kafka's "exactly-once semantics" covers reading from and writing to Kafka; side effects outside it still need deduplication. For HTTP APIs the same idea is the idempotency key (see [API design](/learn/api-design)).

## Logical clocks

Since wall clocks can't order events across machines, **logical clocks** order them by causality instead. Event a **happened before** b if they're on the same node in that order, or a is sending a message that b receives, or there's a chain of such steps between them.

### Lamport clocks

A **Lamport clock** is a single counter per node:

1. Before each local event, increment the counter.
2. Attach the counter to every message sent.
3. On receiving a message, set the counter to `max(local, received) + 1`.

If a happened before b, then `L(a) < L(b)`. Ties between nodes are broken by node id, giving a total order that never contradicts causality. The converse doesn't hold: `L(a) < L(b)` doesn't mean a caused b, so Lamport clocks can't tell you whether two events were **concurrent**.

### Vector clocks

A **vector clock** keeps one counter per node. A node increments its own entry on each event, attaches the whole vector to messages, and on receipt takes the element-wise maximum before incrementing its own entry. Comparing two vectors:

- every entry of A ≤ the matching entry of B (and they differ): A happened before B;
- some entries bigger on each side: A and B are **concurrent**.

Example with two replicas, X and Y, as `[X, Y]`: Alice writes on X, giving `[1, 0]`, which replicates to Y. Bob, having seen it, writes on Y: `[1, 1]`, a descendant, so it can safely replace Alice's version. Meanwhile Carol writes on X without seeing Bob's write: `[2, 0]`. Neither `[2, 0]` nor `[1, 1]` dominates, so the two writes conflict and both are kept for merging. Dynamo-style stores use this to detect conflicts instead of silently dropping one write.

## Consistent hashing

To spread keys over N servers, `hash(key) % N` is the obvious choice, but changing N moves almost every key: going from 3 to 4 servers reassigns about 75% of them, which for a cache means a near-total miss storm.

**Consistent hashing** places both servers and keys on a ring of hash values (say 0 to 2³² − 1). Each key belongs to the first server clockwise from it. Adding a server only takes over the keys between it and its predecessor; removing one hands its keys to its successor. About 1/N of the keys move, and only to or from the changed server.

```diagram
{"type":"graph","nodes":[{"id":"A","x":0.5,"y":-0.87},{"id":"B","x":0.5,"y":0.87},{"id":"C","x":-0.98,"y":0.17},{"id":"k1","x":1.38,"y":-0.24},{"id":"k2","x":1.21,"y":0.7},{"id":"k3","x":-0.48,"y":1.32},{"id":"k4","x":-1.21,"y":-0.7},{"id":"k5","x":-0.24,"y":-1.38}],"edges":[["k1","B"],["k2","B"],["k3","C"],["k4","A"],["k5","A"]],"directed":true,"highlight":["A","B","C"],"caption":"Servers A, B, C and keys k1 to k5 hashed onto a ring; each key belongs to the next server clockwise. Adding a server between B and C would take only k3."}
```

With only three points on the ring, the arcs are uneven. **Virtual nodes** fix that: each server is hashed onto the ring many times (`A#0`, `A#1`, …), which evens out the load and spreads a failed server's keys across all the others instead of dumping them on one neighbour.

```python
import bisect

def hash32(s: str) -> int:                 # FNV-1a, then a final mix to spread the bits
    h = 2166136261
    for b in s.encode():
        h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    h = ((h ^ (h >> 16)) * 0x85EBCA6B) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 0xC2B2AE35) & 0xFFFFFFFF
    return h ^ (h >> 16)

class HashRing:
    def __init__(self, vnodes: int = 100):
        self.vnodes = vnodes
        self.ring = []                     # sorted virtual-node hashes
        self.owner = {}                    # virtual-node hash -> server

    def add(self, server: str) -> None:
        for i in range(self.vnodes):
            h = hash32(f"{server}#{i}")
            bisect.insort(self.ring, h)
            self.owner[h] = server

    def remove(self, server: str) -> None:
        for i in range(self.vnodes):
            h = hash32(f"{server}#{i}")
            self.ring.remove(h)
            del self.owner[h]

    def get(self, key: str) -> str:
        i = bisect.bisect_left(self.ring, hash32(key))   # first virtual node clockwise
        return self.owner[self.ring[i % len(self.ring)]]  # wrap around past the top
```

```java
class HashRing {
    private final TreeMap<Long, String> ring = new TreeMap<>();  // virtual-node hash -> server
    private final int vnodes;

    HashRing(int vnodes) { this.vnodes = vnodes; }

    static long hash32(String s) {                 // FNV-1a, then a final mix to spread the bits
        long h = 2166136261L;
        for (byte b : s.getBytes(StandardCharsets.UTF_8))
            h = ((h ^ (b & 0xff)) * 16777619L) & 0xFFFFFFFFL;
        h = ((h ^ (h >>> 16)) * 0x85EBCA6BL) & 0xFFFFFFFFL;
        h = ((h ^ (h >>> 13)) * 0xC2B2AE35L) & 0xFFFFFFFFL;
        return h ^ (h >>> 16);
    }

    void add(String server) {
        for (int i = 0; i < vnodes; i++) ring.put(hash32(server + "#" + i), server);
    }

    void remove(String server) {
        for (int i = 0; i < vnodes; i++) ring.remove(hash32(server + "#" + i));
    }

    String get(String key) {
        Map.Entry<Long, String> e = ring.ceilingEntry(hash32(key));  // first virtual node clockwise
        return (e != null ? e : ring.firstEntry()).getValue();      // wrap around past the top
    }
}
```

```cpp
class HashRing {
    map<uint32_t, string> ring;                    // virtual-node hash -> server
    int vnodes;

    static uint32_t hash32(const string& s) {      // FNV-1a, then a final mix to spread the bits
        uint32_t h = 2166136261u;
        for (unsigned char b : s) h = (h ^ b) * 16777619u;   // wraps mod 2^32
        h = (h ^ (h >> 16)) * 0x85EBCA6Bu;
        h = (h ^ (h >> 13)) * 0xC2B2AE35u;
        return h ^ (h >> 16);
    }

public:
    HashRing(int vnodes) : vnodes(vnodes) {}

    void add(const string& server) {
        for (int i = 0; i < vnodes; i++) ring[hash32(server + "#" + to_string(i))] = server;
    }

    void remove(const string& server) {
        for (int i = 0; i < vnodes; i++) ring.erase(hash32(server + "#" + to_string(i)));
    }

    string get(const string& key) const {
        auto it = ring.lower_bound(hash32(key));    // first virtual node clockwise
        return (it != ring.end() ? it : ring.begin())->second;   // wrap around past the top
    }
};
```

With A, B and C at 100 virtual nodes each, 10,000 keys split roughly 3,500 / 3,250 / 3,250. Adding D moves 2,489 keys, all to D; with `hash % N`, going from 3 to 4 servers moves 7,525. Lookups are O(log V) for V virtual nodes. Cassandra, Riak and many cache clients use this scheme, and it comes up in [sharding](/learn/system-design).

## Interview questions and pitfalls

- **"N = 3, W = 2, R = 2: why does a read see the latest acknowledged write?"** R + W > N, so the read set and the write set share at least one replica.
- **"A user updates their profile, reloads, and sees the old value."** Replication lag breaking read-your-writes: read from the leader briefly after a write, or track the user's last write position.
- **"Explain CAP."** During a partition, choose between answering (possibly stale) and staying consistent (refusing). Not "pick any two".
- **"How do you get exactly-once processing?"** At-least-once delivery plus idempotent handlers or deduplication by message id in the same transaction as the effect.
- **"Why not sort events by timestamp?"** Clock skew and jumps. Use a single sequencer or logical clocks.
- **"Why five nodes rather than four?"** A majority of four is three, so four tolerates only one failure, the same as three.
- **Pitfalls:** assuming no reply means "not done"; retrying non-idempotent operations; distributed locks without fencing tokens; even-sized consensus clusters; "last write wins" on skewed clocks.
