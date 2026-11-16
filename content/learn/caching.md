---
title: Caching
summary: Where caches live, cache-aside and write-through, LRU and LFU eviction, invalidation, stampedes and hot keys, Redis vs Memcached, and HTTP caching with Cache-Control and ETags.
related: databases, system-design, networking, distributed-systems
terms:
  - cache-aside #cache-aside
  - read-through cache #read-through
  - write-through #write-through-write-back-and-write-around
  - write-back #write-through-write-back-and-write-around
  - cache hit ratio #why-cache
  - LRU #lru
  - LFU #lfu-fifo-and-ttl
  - eviction policy #eviction
  - cache invalidation #invalidation-and-consistency
  - cache stampede #cache-stampedes
  - thundering herd #cache-stampedes
  - hot key #hot-keys
  - Cache-Control #cache-control
  - ETag #etags-and-304-not-modified
  - CDN #cdns
---

## Why cache

A **cache** keeps a copy of data somewhere faster or closer than its source, so repeated requests skip the slow part. Reading memory takes about 100 ns, a Redis lookup in the same data centre about half a millisecond, a database query one to tens of milliseconds, and a round trip to another continent over 100 ms. Caching moves reads up that ladder.

It works because real traffic is skewed: a small fraction of items (the front page, popular products, the logged-in user's profile) gets most of the requests. The share of lookups served from the cache is the **cache hit ratio**, and it dominates everything:

```text
Cache hit: 1 ms.  Miss: 1 ms (check) + 20 ms (database) = 21 ms.
Hit ratio 95%:  0.95 × 1 + 0.05 × 21 = 2.0 ms average, 5% of reads reach the database
Hit ratio 99%:  0.99 × 1 + 0.01 × 21 = 1.2 ms average, 1% of reads reach the database
```

Going from 95% to 99% barely changes the average latency but cuts database load by a factor of five.

Caching isn't free. Cached data can be **stale**, the cache is one more system to run and to fail, and a cold or flushed cache can send the full load to a database that was sized for 5% of it.

## Where caches live

A single request can pass through several caches, each closer to the user than the next:

```diagram
{"type":"flow","nodes":[{"id":"b","label":"Browser","sub":"HTTP cache","kind":"client","col":0},{"id":"cdn","label":"CDN edge","sub":"near the user","kind":"cache","col":1},{"id":"rp","label":"Reverse proxy","sub":"Nginx, Varnish","kind":"lb","col":2},{"id":"app","label":"App server","sub":"in-process cache","kind":"service","col":3},{"id":"r","label":"Redis","sub":"shared cache","kind":"cache","col":4,"row":0},{"id":"db","label":"Database","sub":"buffer pool","kind":"db","col":4,"row":1}],"edges":[{"from":"b","to":"cdn"},{"from":"cdn","to":"rp","label":"on miss"},{"from":"rp","to":"app","label":"on miss"},{"from":"app","to":"r"},{"from":"app","to":"db","label":"on miss"}]}
```

| Layer | Caches | Notes |
|---|---|---|
| Browser | Static files, API responses for this user | Controlled by HTTP headers; a hit costs no network at all |
| CDN | Images, scripts, public pages, video | Servers in hundreds of cities; offloads the origin |
| Reverse proxy | Whole HTTP responses | Shared by all users of the site |
| Application | Query results, rendered fragments, sessions | In-process (a map with TTLs, Caffeine) is fastest but per instance; Redis or Memcached is shared |
| Database | Hot pages in memory (buffer pool, OS page cache) | Automatic; give it enough RAM |

The closer to the user, the bigger the saving, but the harder it is to invalidate: you can delete a Redis key instantly, but you can't reach into a browser.

## Caching patterns

### Cache-aside

**Cache-aside** (lazy loading) is the default. The application talks to both the cache and the database:

```text
read(key):
    value = cache.get(key)
    if value is missing:
        value = db.query(key)
        cache.set(key, value, ttl = 10 minutes)
    return value

write(key, value):
    db.update(key, value)
    cache.delete(key)          # the next read reloads it
```

```diagram
{"type":"flow","nodes":[{"id":"r","label":"App: read path","kind":"service","col":0,"row":0},{"id":"w","label":"App: write path","kind":"service","col":0,"row":1},{"id":"c","label":"Redis","kind":"cache","col":1,"row":0},{"id":"d","label":"Database","kind":"db","col":1,"row":1}],"edges":[{"from":"r","to":"c","label":"1 GET, 3 SET on miss","both":true},{"from":"r","to":"d","label":"2 on miss: SELECT"},{"from":"w","to":"d","label":"1 UPDATE"},{"from":"w","to":"c","label":"2 DELETE key","dashed":true}]}
```

Only data that's actually read gets cached, and if the cache dies the app still works (slowly). Two details matter:

- **Delete the key on write; don't set it.** Two concurrent writers that each `SET` the new value can finish in the opposite order and leave the older value cached indefinitely. A delete is idempotent: the next read loads whatever the database has.
- **Update the database first, then delete.** Delete first, and a reader can slip in, load the old row and cache it before your write commits.

### Read-through

A **read-through cache** looks the same from the outside, but the cache itself loads missing values, using a loader function you register (Caffeine's `LoadingCache`, or DynamoDB Accelerator in front of DynamoDB). The application only ever talks to the cache. It's cache-aside with the logic moved into a library, which also makes it easy for the library to coalesce concurrent misses.

### Write-through, write-back and write-around

| Pattern | On write | Good | Bad |
|---|---|---|---|
| **Write-through** | Write the cache and the database together, synchronously | Cache is always fresh; reads after writes hit | Every write pays both latencies; caches data nobody may read |
| **Write-back** (write-behind) | Write the cache, acknowledge, flush to the database later | Fastest writes; many updates to one key become one database write | Data is lost if the cache dies before flushing (those entries are *dirty*) |
| **Write-around** | Write the database only; the cache fills on read | Write-once data (logs, uploads) doesn't evict useful entries | The first read after a write misses |

Write-back is how CPU caches and the database's own buffer pool work. For application data it's rare, because a Redis node losing unflushed orders is unacceptable; it fits counters and metrics, where losing a few seconds of increments is fine.

## Eviction

A cache has limited memory, so when it's full, adding an entry means removing one. The rule for choosing the victim is the **eviction policy**.

### LRU

**LRU** (least recently used) evicts the entry that hasn't been touched for the longest time. It bets that recently used data will be used again soon, which holds for most workloads.

```diagram
{"type":"array","rows":[{"label":"get A (miss)","values":["A"]},{"label":"get B (miss)","values":["B","A"]},{"label":"get C (miss)","values":["C","B","A"]},{"label":"get B (hit)","values":["B","C","A"],"highlight":[0]},{"label":"get D (miss)","values":["D","B","C","A"],"dim":[3]}],"indices":false,"caption":"Capacity 3, most recent on the left. The hit moves B to the front, so when D arrives the least recently used entry, A, is evicted."}
```

An LRU cache with O(1) `get` and `put` is a classic interview question. The trick is a **hash map** for lookup plus a **doubly linked list** in recency order: a hit moves the node to the front, and eviction removes the tail. Python's `OrderedDict` and Java's `LinkedHashMap` already combine the two; the C++ version shows the structure explicitly.

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()          # least recent first, most recent last

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)         # now the most recently used
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)  # evict the least recently used
```

```java
class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int capacity;

    LRUCache(int capacity) {
        super(16, 0.75f, true);            // accessOrder = true: reads move entries to the end
        this.capacity = capacity;
    }

    public int get(int key) {
        return getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        super.put(key, value);
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;          // evict the least recently used
    }
}
```

```cpp
class LRUCache {
    int capacity;
    list<pair<int, int>> items;                              // most recent at the front
    unordered_map<int, list<pair<int, int>>::iterator> pos;  // key -> its node in the list

public:
    LRUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        items.splice(items.begin(), items, it->second);      // move to the front in O(1)
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = pos.find(key);
        if (it != pos.end()) {
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        items.emplace_front(key, value);
        pos[key] = items.begin();
        if ((int)items.size() > capacity) {
            pos.erase(items.back().first);                   // evict the least recently used
            items.pop_back();
        }
    }
};
```

LRU's weakness is a **scan**: one pass over a million cold items (a batch job, a crawler) flushes every hot entry. Production caches use scan-resistant variants: segmented LRU, or Caffeine's W-TinyLFU, which only admits a new entry if it's likely to be used more than the one it would evict.

### LFU, FIFO and TTL

- **LFU** (least frequently used) evicts the entry with the fewest hits. It keeps long-term favourites through a scan, but an item that was popular last week can linger, so real LFU caches decay old counts.
- **FIFO** and **random** eviction are cheap and sometimes good enough.
- **TTL** (time to live) isn't an eviction policy so much as an expiry: each entry is deleted after a fixed time, whether or not memory is full. TTLs bound staleness, and nearly every cache entry should have one.

Redis applies its policy only once it reaches `maxmemory`. The default policy, `noeviction`, rejects writes when full; caches usually set `allkeys-lru` or `allkeys-lfu`, while `volatile-*` policies only evict keys that have a TTL. Redis's LRU and LFU are approximations: it samples a few keys and evicts the best candidate among them, which saves memory.

## Invalidation and consistency

**Cache invalidation** is removing or replacing cached data when the source changes. It's famously hard because the cache and the database are two systems with no shared transaction: a cache is, at best, eventually consistent with its source. Strategies, from simple to thorough:

| Strategy | How | Staleness |
|---|---|---|
| TTL only | Entries expire; nothing reacts to writes | Up to the TTL |
| Delete on write | The writer deletes the key after committing | Short race windows |
| Change events | A consumer of the database's change stream (CDC) deletes keys, even for writes made by other services | Event lag |
| Versioned keys | Put a version in the key (`product:42:v7`); writes bump the version, old keys just expire | None for readers who know the version |

Even delete-on-write has a race. It needs a slow reader, so it's rare, but it happens at scale:

```text
Reader: cache miss for user:42
Reader: SELECT name ... → "Ana"            (old value)
Writer: UPDATE users SET name = 'Anna'; then DELETE user:42
Reader: SET user:42 = "Ana"                (stale, cached until the TTL)
```

That's why a TTL is a safety net even with explicit invalidation. Where staleness is unacceptable (balances, stock at checkout), read from the database, or at least re-check there before acting. And if a user must see their own change right away, skip or bypass the cache for that user's next read.

## Cache stampedes

A popular key expires, and in the same instant thousands of requests miss, all query the database for the same value, and all write it back. That's a **cache stampede** (also called a **thundering herd** or dogpile), and it can take the database down, which makes the rebuild even slower. Fixes:

- **Lock per key.** The first request to miss takes a short lock (`SET lock:key <token> NX PX 5000` in Redis) and rebuilds; the others wait briefly and re-read the cache, or serve the stale value.
- **Request coalescing.** Within one process, concurrent misses for the same key share a single in-flight load (Go's `singleflight`, Caffeine's async loading). CDNs do the same at the edge (collapsed forwarding).
- **Serve stale while refreshing.** Keep a soft expiry inside the value: once it passes, one request refreshes in the background while everyone else gets the slightly old value.
- **Refresh early, probabilistically.** Each read near expiry refreshes with a probability that rises as expiry approaches, so one request usually renews the key before it expires.
- **Jitter the TTLs.** Keys cached at the same moment (after a deploy or cache restart) with the same TTL expire at the same moment. A TTL of `600 s ± 10%` spreads them out.

```diagram
{"type":"flow","nodes":[{"id":"q1","label":"Request 1","kind":"client","col":0,"row":0},{"id":"q2","label":"Request 2","kind":"client","col":0,"row":1},{"id":"q3","label":"Request 3","kind":"client","col":0,"row":2},{"id":"sf","label":"Single flight","sub":"one load per key","kind":"service","col":1,"row":1,"highlight":true},{"id":"db","label":"Database","kind":"db","col":2,"row":1},{"id":"c","label":"Cache","kind":"cache","col":2,"row":0}],"edges":[{"from":"q1","to":"sf"},{"from":"q2","to":"sf","dashed":true,"label":"waits"},{"from":"q3","to":"sf","dashed":true,"label":"waits"},{"from":"sf","to":"db","label":"1 query"},{"from":"sf","to":"c","label":"SET"}],"caption":"Request coalescing: three misses for the same key cause one database query; the other two wait for its result."}
```

## Hot keys

A **hot key** is one key so popular that the single cache node holding it runs out of CPU or network: a celebrity's profile, a flash-sale product, a shared config blob. Adding nodes doesn't help, because the key still lives on one of them. Fixes:

- **A small in-process cache** in front of Redis with a TTL of a few seconds. Each app server then asks Redis for that key a few times a minute, not thousands of times a second.
- **Replicate the key**: store copies as `product:42#0` … `product:42#9` on different shards and read a random one. Writes must update every copy.
- **Read replicas** of the cache node.

Two related failure modes: **cache penetration**, where requests for keys that don't exist always miss and hit the database (cache the "not found" result briefly, or check a Bloom filter first), and **big keys**, where one huge value (a 50 MB list) blocks a single-threaded Redis while it's serialised.

## Redis vs Memcached

| | Redis | Memcached |
|---|---|---|
| Values | Strings, hashes, lists, sets, sorted sets, streams and more | Opaque strings (bytes) |
| Persistence | Optional snapshots (RDB) and append-only log (AOF) | None: memory only |
| Scaling and failover | Replicas, Sentinel, Redis Cluster (sharded) | No replication; clients shard keys with consistent hashing |
| Threads | Commands run one at a time on a main thread (I/O threads since 6.0) | Multi-threaded |
| Eviction | Configurable (default `noeviction`) | LRU per slab class |
| Extras | Atomic counters, pub/sub, Lua scripts, per-key TTLs | Very simple; compare-and-set |
| Largest value | 512 MB | 1 MB by default |

Choose **Memcached** for a plain, multi-threaded, memory-only cache of blobs. Choose **Redis** when you also want data structures (a sorted set for leaderboards, counters for rate limiting), persistence or replication; that's why it's the more common pick. Since 2024 Redis has been released under source-available licences (Redis 8 added AGPLv3 as an option), and **Valkey** is a BSD-licensed fork that works the same way.

## HTTP caching

Browsers, proxies and CDNs cache HTTP responses according to headers that the server sends. Getting them right is the cheapest performance win on the web.

### Cache-Control

The **Cache-Control** response header says who may cache a response and for how long:

| Directive | Meaning |
|---|---|
| `max-age=600` | Fresh for 600 seconds; reuse without asking the server |
| `s-maxage=600` | Overrides `max-age` for shared caches (CDNs, proxies) |
| `public` / `private` | Any cache may store it / only the user's browser may (per-user data) |
| `no-cache` | May be stored, but must be **revalidated** with the server before every use |
| `no-store` | Must not be stored anywhere (sensitive data) |
| `immutable` | Won't change while fresh, so don't revalidate even on reload |
| `stale-while-revalidate=60` | After expiry, may serve the stale copy for 60 s while refreshing in the background |

A common trap: `no-cache` does not mean "don't cache"; `no-store` does. Another: a response with no caching headers isn't uncacheable. Browsers apply heuristic freshness based on `Last-Modified`, so always send an explicit policy.

The standard setup for a web app:

- **Fingerprinted assets** (`app.3f9a1c.js`, whose name changes whenever its content does): `Cache-Control: public, max-age=31536000, immutable`. Cached for a year, never stale, because a new version gets a new URL.
- **HTML pages**: `Cache-Control: no-cache`, so every load checks for a new page, which then references the new asset names.

`Vary` lists request headers that change the response (`Vary: Accept-Encoding`), so caches keep separate copies per value.

### ETags and 304 Not Modified

When a cached response goes stale, the cache doesn't have to download it again. It can **revalidate**: ask the server whether its copy is still current. The server labels each version with an **ETag** (a validator, often a hash of the content):

```http
GET /api/products/42 HTTP/1.1
Host: shop.example

HTTP/1.1 200 OK
Cache-Control: private, max-age=60
ETag: "a7f3c9"
Content-Type: application/json

{"id": 42, "name": "Desk lamp", "price_cents": 3900}
```

After 60 seconds the browser sends the ETag back in `If-None-Match`. If nothing changed, the server replies `304 Not Modified` with no body, and the browser reuses its copy:

```http
GET /api/products/42 HTTP/1.1
Host: shop.example
If-None-Match: "a7f3c9"

HTTP/1.1 304 Not Modified
ETag: "a7f3c9"
Cache-Control: private, max-age=60
```

A 304 still costs a round trip, but no body, and often no database work if the server can compute the ETag cheaply. `Last-Modified` with `If-Modified-Since` does the same with a timestamp (one-second resolution). The same ETag in `If-Match` makes writes conditional, which is optimistic locking over HTTP (see [API design](/learn/api-design)).

### CDNs

A **CDN** (content delivery network) runs caching servers in many cities (points of presence) and routes each user to a nearby one, usually with DNS or anycast. A hit at the edge saves the long trip to the origin: tens of milliseconds instead of a hundred or more, and no load on your servers.

- **What to cache**: static assets and media always; public pages and API responses for seconds to minutes (even a 5-second TTL on a hot page absorbs most of a traffic spike).
- **Cache key**: by default the URL. Including cookies or many headers in it fragments the cache and drops the hit ratio.
- **Invalidation**: wait for the TTL, use versioned URLs, or call the CDN's purge API (by URL or by tag).
- **Origin shield**: a middle tier of cache that all edges go through, so a miss in 200 cities becomes one request to the origin.

CDNs also terminate TLS close to the user and absorb denial-of-service traffic. Where a CDN fits in a whole architecture is covered in [System design basics](/learn/system-design).

## Interview questions and pitfalls

- **"LRU cache with capacity 3; access A, B, C, A, D. What's evicted?"** B: after the second A, B is the least recently used.
- **"Write-through vs write-back?"** Write-through updates the cache and store together; write-back acknowledges after the cache and flushes later, risking loss of dirty entries.
- **"Popular key expires and the database falls over."** A stampede: per-key lock or coalescing, serve stale while refreshing, jittered TTLs.
- **"Why delete the key instead of updating it on write?"** Concurrent `SET`s can leave an old value; delete is idempotent.
- **"How do you deploy new JavaScript without users getting stale files?"** Fingerprinted file names with long `max-age`, and `no-cache` on the HTML.
- **Pitfalls:** caching without a TTL; caching per-user data in a shared cache under a key that doesn't include the user; treating the cache as the source of truth; sizing the database for the hit ratio and forgetting the cold start.
