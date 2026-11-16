---
title: System design basics
summary: How to run a design interview, quick capacity estimates, load balancers, stateless scaling, sharding, queues, rate limiting and CDNs, then a URL shortener designed end to end.
related: distributed-systems, caching, databases, networking, api-design
terms:
  - system design interview #a-framework-for-the-interview
  - back-of-the-envelope #back-of-the-envelope-estimates
  - load balancer #load-balancers
  - load balancing #load-balancers
  - stateless service #stateless-services-and-scaling
  - horizontal scaling #vertical-vs-horizontal-scaling
  - vertical scaling #vertical-vs-horizontal-scaling
  - sharding #sharding
  - partition key #choosing-a-partition-key
  - hot partition #choosing-a-partition-key
  - message queue #message-queues-and-async-work
  - dead-letter queue #message-queues-and-async-work
  - rate limiting #rate-limiting
  - token bucket #token-bucket
  - URL shortener #worked-example-a-url-shortener
  - consumer group #consumer-groups-and-partitions
  - consumer groups #consumer-groups-and-partitions
---

## A framework for the interview

A **system design interview** gives you a vague prompt ("design a URL shortener", "design a news feed") and 45 to 60 minutes. There's no single right answer. The interviewer is watching how you turn ambiguity into requirements, make decisions with numbers, and explain trade-offs. A fixed structure keeps you from drawing boxes before you know what they're for:

| Step | Time | What you do |
|---|---|---|
| 1. Requirements | ~5 min | **Functional**: what the system does (create link, redirect). **Non-functional**: scale, latency, availability, consistency. Ask; then state your assumptions |
| 2. Estimates | ~5 min | Requests per second, read/write ratio, storage, bandwidth. Only as precise as the decisions need |
| 3. API | ~5 min | The main endpoints with inputs and outputs |
| 4. Data model | ~5 min | Entities, keys, access patterns; which kind of database fits |
| 5. High-level design | ~10 min | Boxes and arrows for the main request paths, end to end |
| 6. Deep dives | ~15 min | The hardest parts: the bottleneck, the hot path, failures, scaling the data |
| 7. Trade-offs and wrap-up | ~5 min | What you'd monitor, what breaks first at 10× scale, what you'd do with more time |

Think out loud, prefer the simplest design that meets the numbers, and when you choose something, name the alternative you rejected.

## Back-of-the-envelope estimates

**Back-of-the-envelope** estimates are rough calculations that decide the architecture: is one database enough, does the data fit in memory? Round aggressively.

| Fact | Handy approximation |
|---|---|
| Seconds in a day | 86,400 ≈ 10⁵ |
| 1 million requests per day | ≈ 12 per second |
| 100 million requests per day | ≈ 1,200 per second |
| Peak traffic | 2 to 3 × the average (more for spiky products) |
| Powers of two | 2¹⁰ ≈ thousand (KB), 2²⁰ ≈ million (MB), 2³⁰ ≈ billion (GB), 2⁴⁰ ≈ trillion (TB) |
| A typical database row | 100 bytes to 1 KB |
| A photo | 100 KB to a few MB |

Rough single-machine capacities, as orders of magnitude only: an app server handles thousands of simple requests per second, a well-indexed relational database thousands to tens of thousands of simple queries per second, and a Redis node around a hundred thousand operations per second. Latencies (memory vs disk vs network) are listed on the [Networking](/learn/networking) page.

**Example.** A photo app with 10 million daily users who each upload 2 photos a day of 2 MB:

```text
Uploads:  10M × 2 = 20M per day  ≈ 230 per second (peak ~700)
Storage:  20M × 2 MB = 40 TB per day  ≈ 15 PB per year
```

Fifteen petabytes a year rules out storing images in a database: they go to object storage (S3 or similar) behind a CDN, and the database stores only metadata.

## The building blocks

Most designs are variations of this picture:

```diagram
{"type":"flow","nodes":[{"id":"u","label":"Clients","kind":"client","col":0,"row":1},{"id":"cdn","label":"CDN","sub":"static files, media","kind":"cache","col":1,"row":0},{"id":"lb","label":"Load balancer","kind":"lb","col":1,"row":1},{"id":"a1","label":"API servers","sub":"stateless, autoscaled","kind":"service","col":2,"row":1},{"id":"q","label":"Message queue","kind":"queue","col":3,"row":2},{"id":"w","label":"Workers","sub":"emails, thumbnails","kind":"service","col":4,"row":2},{"id":"c","label":"Cache","sub":"Redis","kind":"cache","col":3,"row":0},{"id":"db","label":"Database","sub":"primary + replicas","kind":"db","col":3,"row":1},{"id":"s3","label":"Object storage","kind":"db","col":4,"row":0}],"edges":[{"from":"u","to":"cdn"},{"from":"u","to":"lb"},{"from":"cdn","to":"s3","label":"on miss"},{"from":"lb","to":"a1"},{"from":"a1","to":"c"},{"from":"a1","to":"db"},{"from":"a1","to":"q","label":"enqueue jobs"},{"from":"q","to":"w"},{"from":"w","to":"db"}]}
```

The rest of this page goes through each box. Caches have their own page: [Caching](/learn/caching).

## Load balancers

A **load balancer** spreads requests across a pool of servers, skips failed ones, and gives clients one stable address. **Load balancing** happens at two levels:

| | Layer 4 (transport) | Layer 7 (application) |
|---|---|---|
| Sees | IP addresses, ports, TCP/UDP connections | Full HTTP requests: path, host, headers, cookies |
| Can do | Forward connections, very fast and cheap | Route `/api` and `/static` to different pools, terminate TLS, retry, rewrite, compress, rate-limit |
| Examples | AWS NLB, Linux IPVS, HAProxy in TCP mode | Nginx, Envoy, HAProxy, AWS ALB |

### Balancing algorithms

- **Round robin**: each server in turn (**weighted** for unequal servers). Fine when requests cost about the same.
- **Least connections**: the server with the fewest open connections. Better when request lengths vary (uploads, WebSockets).
- **Power of two choices**: pick two servers at random, use the less loaded. Nearly as good as checking all.
- **Hashing** on client IP or a key: the same client always reaches the same server, which helps local caches but evens load less well.

### Health checks

The balancer **actively** probes each server (`GET /healthz` every few seconds; remove it after a few failures, restore it after a few successes) and **passively** watches real traffic for errors. On deploys it **drains** a server: no new requests, in-flight ones finish. Probes are covered in [Git, deploys & reliability](/learn/devops). The balancer itself must be redundant (a pair, or a managed service).

## Stateless services and scaling

A **stateless service** keeps nothing about a user in its own memory or disk between requests. Sessions live in Redis or the database (or in a signed token; see [Security](/learn/security)), and uploads go to object storage. Then any instance can serve any request, so you can add instances under load, replace crashed ones, and deploy by rolling through them. State still exists; it's pushed into systems built to hold it (databases, caches, queues), which you scale separately.

**Sticky sessions** (pinning a user to one server) are a workaround: a crash loses those users' state, and load can't be evened out.

### Vertical vs horizontal scaling

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| How | A bigger machine: more CPU, RAM, faster disks | More machines behind a balancer or partitioned data |
| Pros | No code changes; no distributed-systems problems | Almost no ceiling; survives machine failure; grows in small steps |
| Cons | Hard ceiling; one machine is one point of failure; price rises steeply | Needs stateless services or partitioned data; network and consistency problems |
| Typical use | Databases, for as long as possible | App servers, caches, workers |

**Vertical scaling** is underrated: one large database server goes a long way and is far simpler than a sharded one. **Horizontal scaling** is the default for stateless tiers.

## Sharding

When data or write traffic outgrows one database server, **sharding** (partitioning) splits the data across several servers, each owning a subset of the rows. Read replicas don't help here: every replica still stores everything and applies every write.

```diagram
{"type":"flow","nodes":[{"id":"app","label":"App servers","kind":"service","col":0,"row":1},{"id":"r","label":"Shard router","sub":"hash(user_id) → shard","kind":"lb","col":1,"row":1,"highlight":true},{"id":"s0","label":"Shard 0","sub":"users with hash range 0","kind":"db","col":2,"row":0},{"id":"s1","label":"Shard 1","sub":"users with hash range 1","kind":"db","col":2,"row":1},{"id":"s2","label":"Shard 2","sub":"users with hash range 2","kind":"db","col":2,"row":2}],"edges":[{"from":"app","to":"r"},{"from":"r","to":"s0"},{"from":"r","to":"s1"},{"from":"r","to":"s2"}],"caption":"The router (a library, proxy or the database itself) maps each key to the shard that owns it."}
```

| Strategy | How | Good | Bad |
|---|---|---|---|
| Range | Key ranges per shard (A to F, G to M, …) | Range scans stay on one shard | Uneven; sequential keys all hit the last shard |
| Hash | `hash(key)` decides the shard | Even spread | Range queries hit every shard |
| Directory | A lookup table maps keys (or tenants) to shards | Total flexibility; move a big tenant on its own | The directory is one more critical service |

Plain `hash(key) % N` moves almost every key when N changes, so real systems use [consistent hashing](/learn/distributed-systems) or a fixed number of virtual partitions spread over the servers.

### Choosing a partition key

The **partition key** (shard key) decides everything. A good one:

1. **Has many distinct values** spread evenly, so no shard gets more than its share.
2. **Appears in the common queries**, so most requests touch one shard. A query without it must ask every shard (scatter-gather), which is slow and fails if any one shard is down.
3. **Keeps data that changes together on one shard.** Sharding by `user_id` puts a user's orders, settings and messages together, so updates to them stay single-shard transactions.

A **hot partition** is one shard getting far more than its share of traffic: a celebrity's user id, or a timestamp key under range sharding where all new writes land on the newest shard. Fixes: hash the key; add a suffix to spread one hot key over several partitions (`user_42#0` to `user_42#9`, at the cost of reading all ten); or split the hot shard.

Sharding costs cross-shard joins and transactions, global unique constraints and resharding work. Postpone it until bigger machines, replicas and caching run out.

## Replication in brief

**Replication** keeps copies of the data on several machines, for availability (a replica takes over if the leader dies) and to spread reads across **read replicas**. Replicas usually lag slightly, so a user may not see their own write at once. Replication schemes, quorums and consistency models are covered in [Distributed systems](/learn/distributed-systems).

## Message queues and async work

Not everything has to happen while the user waits. Sending a welcome email, resizing an uploaded image or generating a report can be put on a **message queue** and done later by workers; the API responds immediately (often `202 Accepted`).

```diagram
{"type":"flow","nodes":[{"id":"api","label":"API server","kind":"service","col":0,"row":1},{"id":"q","label":"Queue","sub":"jobs wait here","kind":"queue","col":1,"row":1,"highlight":true},{"id":"w1","label":"Worker 1","kind":"service","col":2,"row":0},{"id":"w2","label":"Worker 2","kind":"service","col":2,"row":1},{"id":"w3","label":"Worker 3","kind":"service","col":2,"row":2},{"id":"dlq","label":"Dead-letter queue","sub":"failed after N tries","kind":"queue","col":3,"row":2},{"id":"ext","label":"Email provider","kind":"external","col":3,"row":0}],"edges":[{"from":"api","to":"q","label":"enqueue, reply 202"},{"from":"q","to":"w1"},{"from":"q","to":"w2"},{"from":"q","to":"w3"},{"from":"w1","to":"ext"},{"from":"w3","to":"dlq","dashed":true}]}
```

A queue **decouples** producers from consumers, **buffers** spikes (workers drain the backlog at their own pace), lets you **scale workers** independently, and **retries** failed jobs. After a few failures a job moves to a **dead-letter queue** for a human to inspect, instead of blocking everything behind it.

Two families:

| | Work queue | Log / stream |
|---|---|---|
| Examples | RabbitMQ, Amazon SQS | Kafka, Amazon Kinesis, Redpanda |
| Model | Each message goes to one consumer and is deleted once acknowledged | An append-only log split into partitions; consumers track their position (offset) |
| Replay | No | Yes: rewind and reprocess |
| Many readers | Competing consumers share the work | Each consumer group gets every message |
| Ordering | Usually none (FIFO queues exist) | Within a partition, so key messages by entity id |

Delivery is almost always **at-least-once**: a worker can crash after doing a job but before acknowledging it, so the job runs again, and consumers must be **idempotent** (see [Distributed systems](/learn/distributed-systems)). A growing backlog is your early warning.

### Consumer groups and partitions

In Kafka (and Kinesis, Redpanda, Pulsar's failover mode), the unit of parallelism is the **partition**, not the message. The consumers sharing one subscription form a **consumer group**, and the group splits the topic's partitions between its members: **each partition is read by exactly one consumer in the group**, which is how per-partition ordering survives. One consumer may own several partitions, but a partition is never shared.

So **the partition count caps how many consumers in a group get work**:

- 6 partitions, 3 consumers: 2 partitions each.
- 6 partitions, 4 consumers: 2, 2, 1 and 1. Uneven, but all busy.
- 6 partitions, 8 consumers: 6 busy, **2 idle**. They sit as standbys, taking over a partition if a busy consumer dies.

```diagram
{"type":"flow","nodes":[{"id":"p0","label":"Partition 0","kind":"queue","col":0,"row":0},{"id":"p1","label":"Partition 1","kind":"queue","col":0,"row":1},{"id":"p2","label":"Partition 2","kind":"queue","col":0,"row":2},{"id":"p3","label":"Partition 3","kind":"queue","col":0,"row":3},{"id":"c1","label":"Consumer 1","kind":"service","col":2,"row":0},{"id":"c2","label":"Consumer 2","kind":"service","col":2,"row":1},{"id":"c3","label":"Consumer 3","kind":"service","col":2,"row":2},{"id":"c4","label":"Consumer 4","kind":"service","col":2,"row":3},{"id":"c5","label":"Consumer 5","sub":"idle: no partition left","kind":"service","col":2,"row":4,"highlight":true}],"edges":[{"from":"p0","to":"c1"},{"from":"p1","to":"c2"},{"from":"p2","to":"c3"},{"from":"p3","to":"c4"}],"caption":"One consumer group reading a 4-partition topic. The fifth consumer gets no partition, so adding it adds no throughput."}
```

This is the classic interview trap: "the consumers are falling behind, so we scaled from 10 to 30 instances", and lag doesn't move because the topic has 10 partitions. Whenever a member joins or leaves, the group **rebalances** (reassigns partitions), which briefly pauses consumption, so pointless extra members also cost something.

Choosing the count:

- Size it for **peak parallelism you'll need**, with headroom: if one consumer handles 2,000 messages per second and the peak is 50,000, you need at least 25 partitions. Tens of partitions per topic is common.
- **Adding partitions later is possible but changes which partition each key maps to** (`hash(key) % partitions`), so messages for one key can be split across the old and new partition during the change, breaking per-key ordering. The count can't be reduced at all.
- Too many has costs too: more open files and replication work on the brokers, and slower rebalances and failovers.
- A **hot key** still lands on one partition and one consumer, whatever the counts (see [choosing a partition key](/learn/system-design#choosing-a-partition-key)).

If a slow consumer is the bottleneck and repartitioning isn't an option, it can process its partitions' messages with a pool of worker threads, at the price of managing per-key ordering and offset commits itself. Kafka 4.x also adds **share groups** (KIP-932), a queue-like mode where several consumers can read one partition, giving up per-partition ordering. A work queue such as SQS or RabbitMQ has no such cap: any number of competing consumers can pull from one queue.

## Rate limiting

**Rate limiting** caps how many requests a client (user, API key or IP) may make per time window, protecting the service from abuse and runaway clients. It usually runs in the API gateway, and rejected requests get `429 Too Many Requests` with a `Retry-After` header (see [API design](/learn/api-design)).

### Token bucket

The **token bucket** is the most common algorithm. Each client has a bucket that holds up to `capacity` tokens and refills at `rate` tokens per second. Each request spends a token; with no tokens left, it's rejected. The capacity allows short bursts, while the refill rate caps the long-run average.

```python
class TokenBucket:
    def __init__(self, capacity: float, refill_per_sec: float):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.tokens = capacity             # start full
        self.last = 0.0                    # time of the last refill, in seconds

    def allow(self, now: float) -> bool:
        # Add the tokens earned since the last call, never more than the capacity.
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
```

```java
class TokenBucket {
    private final double capacity, rate;
    private double tokens, last = 0;       // last: time of the last refill, in seconds

    TokenBucket(double capacity, double refillPerSec) {
        this.capacity = capacity;
        this.rate = refillPerSec;
        this.tokens = capacity;            // start full
    }

    boolean allow(double now) {
        // Add the tokens earned since the last call, never more than the capacity.
        tokens = Math.min(capacity, tokens + (now - last) * rate);
        last = now;
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }
}
```

```cpp
class TokenBucket {
    double capacity, rate, tokens, last = 0;   // last: time of the last refill, in seconds

public:
    TokenBucket(double capacity, double refillPerSec)
        : capacity(capacity), rate(refillPerSec), tokens(capacity) {}  // start full

    bool allow(double now) {
        // Add the tokens earned since the last call, never more than the capacity.
        tokens = min(capacity, tokens + (now - last) * rate);
        last = now;
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }
};
```

With capacity 3 and 1 token per second, four requests at time 0 give allow, allow, allow, reject; one at 0.5 s is rejected (half a token); one at 1.0 s is allowed. In production pass a monotonic clock's time. Each client costs two numbers, so millions of buckets fit in memory.

### Other algorithms

| Algorithm | Idea | Trade-off |
|---|---|---|
| Leaky bucket | Requests join a queue that drains at a fixed rate | Smooth output, but bursts wait or are dropped |
| Fixed window counter | Count per calendar minute; reset at :00 | Tiny and simple, but 100 requests at 0:59 and 100 at 1:00 means 200 in two seconds |
| Sliding window log | Store each request's timestamp; count those in the last 60 s | Exact, but memory per request |
| Sliding window counter | `current + previous × (fraction of the previous window still in range)` | Close approximation with two counters |

Sliding window counter example: limit 100 per minute; the previous minute had 80 requests, this one has 30, and we're 25% into it. Estimate: `30 + 80 × 0.75 = 90`, under 100, so allow.

Across many gateway instances, keep the counters in Redis (`INCR` with an expiry, or a Lua script for an atomic token bucket), and decide whether the limiter **fails open** (allows traffic) or **fails closed** when Redis is down.

## CDNs

A CDN caches static files, media and some public responses on servers in many cities, close to users. It cuts latency and takes most read traffic off your servers; in a design, put images, video and scripts behind one by default. How they cache and invalidate is on the [Caching](/learn/caching) page.

## Worked example: a URL shortener

Prompt: "Design a service like bit.ly."

### Requirements and estimates

- **Functional:** create a short link for a long URL; visiting the short link redirects; optional custom alias and expiry; click counts.
- **Non-functional:** redirects must be fast and highly available (a broken short link breaks every page it was posted on); creation can be slightly slower; heavily read-dominated.

```text
Writes:   100M new links per month ÷ 2.6M seconds ≈ 40 per second
Reads:    100 reads per write ≈ 4,000 per second (peak ~10,000)
Storage:  100M × 12 months × 5 years = 6 billion links × ~500 bytes ≈ 3 TB
Codes:    base62 (a-z, A-Z, 0-9): 62⁶ ≈ 57 billion, 62⁷ ≈ 3.5 trillion
```

Seven characters leave plenty of headroom. Forty writes per second is nothing; the design is about the read path.

### API and data model

```http
POST /api/links
Content-Type: application/json

{"url": "https://example.com/some/very/long/path?ref=newsletter"}

HTTP/1.1 201 Created
Location: /api/links/aZ3kP9q
Content-Type: application/json

{"code": "aZ3kP9q", "short_url": "https://sho.rt/aZ3kP9q"}
```

```http
GET /aZ3kP9q HTTP/1.1
Host: sho.rt

HTTP/1.1 302 Found
Location: https://example.com/some/very/long/path?ref=newsletter
```

**301 or 302?** A `301 Moved Permanently` is cached by browsers, which saves load, but later clicks never reach you: no click counts, and you can't change or expire the link. A `302 Found` (or `307`) sends every click through the service. With analytics in the requirements, choose 302.

Data model: one table, `links(code PRIMARY KEY, long_url, owner_id, created_at, expires_at)`. Every read is a lookup by `code`, so a key-value store (DynamoDB, Cassandra) or a relational database sharded by `hash(code)` both fit. Three terabytes is a handful of shards.

### Generating short codes

| Approach | How | Pros | Cons |
|---|---|---|---|
| Hash the URL | First 7 base62 characters of SHA-256(long URL) | The same URL gets the same code | Collisions must be detected and resolved; can't give two users separate links to one URL |
| Counter | A unique 64-bit id, encoded in base62 | No collisions; short codes | Needs a distributed id source; sequential codes let anyone enumerate every link |
| Random | 7 random base62 characters; insert with a unique constraint, retry on conflict | Simple; unguessable | A collision check per insert (at 6 billion links, a 0.17% chance) |

For counters, hand each server a block of ids (1,000 at a time from a sequence or Redis `INCRBY`) so it allocates locally. Random codes with a unique constraint are the simplest correct answer.

### High-level design

Write path:

```diagram
{"type":"flow","nodes":[{"id":"c","label":"Client","kind":"client","col":0},{"id":"lb","label":"Load balancer","sub":"rate limit per user/IP","kind":"lb","col":1},{"id":"api","label":"Link API","sub":"validate URL, make code","kind":"service","col":2},{"id":"db","label":"Links store","sub":"sharded by hash(code)","kind":"db","col":3}],"edges":[{"from":"c","to":"lb","label":"POST /api/links"},{"from":"lb","to":"api"},{"from":"api","to":"db","label":"INSERT if code unused"}]}
```

Read path, the one that matters:

```diagram
{"type":"flow","nodes":[{"id":"b","label":"Browser","kind":"client","col":0,"row":1},{"id":"lb","label":"Load balancer","kind":"lb","col":1,"row":1},{"id":"rd","label":"Redirect service","sub":"stateless","kind":"service","col":2,"row":1,"highlight":true},{"id":"cache","label":"Redis","sub":"code → long URL","kind":"cache","col":3,"row":0},{"id":"db","label":"Links store","kind":"db","col":3,"row":1},{"id":"q","label":"Click events","kind":"queue","col":3,"row":2},{"id":"an","label":"Analytics workers","kind":"service","col":4,"row":2}],"edges":[{"from":"b","to":"lb","label":"GET /aZ3kP9q"},{"from":"lb","to":"rd"},{"from":"rd","to":"cache","label":"1 lookup"},{"from":"rd","to":"db","label":"2 on miss"},{"from":"rd","to":"q","label":"async","dashed":true},{"from":"q","to":"an"}],"caption":"The redirect needs one cache lookup; click counting happens off the hot path."}
```

### Deep dives

- **Caching.** Popularity is extremely skewed and links never change, so cache-aside with a long TTL gets a very high hit ratio. Even 100 million hot links at 500 bytes is only 50 GB of RAM.
- **Analytics off the hot path.** The redirect publishes a click event and returns. If analytics is down, redirects still work.
- **Abuse.** Rate-limit creation and check URLs against malware and phishing lists.
- **Expiry.** Check `expires_at` on read (return `410 Gone`) and delete expired rows in a background job.
- **Availability.** Stateless redirect servers in several zones, replicated storage, and for global users, read-only copies of the links in several regions.

## Interview pitfalls

- **Designing before asking.** "Design Twitter" for 1,000 users and for 500 million users are different problems.
- **Numbers without decisions.** Every estimate should change something: one server or many, memory or disk, sync or async.
- **Over-engineering.** Kafka, sharding and microservices for 40 writes per second is a red flag. Start simple; say when you'd add each piece.
- **Single points of failure.** For each box, ask what happens when it dies.
- **No trade-offs.** "I'd use Cassandra" needs a reason and a cost: write throughput and availability, paid for with ad hoc queries and transactions.
