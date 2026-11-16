---
title: Networking & HTTP
summary: The network stack from IP up, TCP vs UDP, DNS, HTTP methods and status codes, HTTP/1.1 vs 2 vs 3, TLS, what happens when you type a URL, cookies, CORS, real-time options and latency numbers.
related: api-design, security, caching, system-design, distributed-systems
terms:
  - TCP #tcp-and-udp
  - UDP #udp
  - three-way handshake #the-tcp-handshake
  - congestion control #reliability-flow-control-and-congestion-control
  - DNS #dns
  - HTTP status codes #methods-and-status-codes
  - HTTP/2 #http-1-1-http-2-and-http-3
  - HTTP/3 #http-1-1-http-2-and-http-3
  - QUIC #http-1-1-http-2-and-http-3
  - head-of-line blocking #http-1-1-http-2-and-http-3
  - TLS handshake #tls
  - CORS #cors
  - WebSocket #real-time-websockets-sse-and-long-polling
  - Server-Sent Events #real-time-websockets-sse-and-long-polling
  - long polling #real-time-websockets-sse-and-long-polling
  - Nagle's algorithm #nagle-s-algorithm-and-delayed-acks
  - delayed ACK #nagle-s-algorithm-and-delayed-acks
  - TCP_NODELAY #nagle-s-algorithm-and-delayed-acks
  - TIME_WAIT #timewait-and-ephemeral-ports
  - ephemeral port exhaustion #timewait-and-ephemeral-ports
  - connection refused #diagnosing-connection-failures
---

## The layers

Networking is built in layers. Each uses the one below and hides its details from the one above: HTTP doesn't care whether packets travel over Wi-Fi or fibre.

```diagram
{"type":"array","values":["HTTP, DNS, SMTP","TLS","TCP / UDP","IP","Ethernet, Wi-Fi"],"vertical":true,"indices":false,"highlight":[2],"caption":"Application at the top, physical link at the bottom. Each layer wraps the one above in its own header."}
```

| Layer | Job | Addresses by | "Layer N" in the OSI model |
|---|---|---|---|
| Application | What the programs say: HTTP, DNS, SMTP | URLs, hostnames | 7 |
| Transport | A connection or datagram between two processes | Ports | 4 |
| Internet | Get a packet from one machine to another across networks | IP addresses | 3 |
| Link | Get a frame across one physical hop | MAC addresses | 2 |

The OSI numbers survive in jargon: a "layer 4" load balancer forwards TCP connections; a "layer 7" one understands HTTP.

## IP

**IP** (Internet Protocol) moves **packets** from one address to another through a chain of routers, each forwarding the packet one hop closer. IPv4 addresses are 32 bits (about 4.3 billion, long since exhausted, hence NAT and private ranges like `10.0.0.0/8` and `192.168.0.0/16`); IPv6 addresses are 128 bits.

IP is **best effort**: packets can be dropped, duplicated, delayed or reordered, and nobody tells you. Everything reliable is built on top.

## TCP and UDP

The transport layer adds **ports** (16-bit numbers that pick out a process on the machine: 443 for HTTPS, 53 for DNS) and decides how much reliability to add.

**TCP** (Transmission Control Protocol) turns unreliable packets into a reliable, ordered **byte stream** between two programs.

### The TCP handshake

A connection starts with the **three-way handshake**, which agrees on starting sequence numbers in both directions:

```text
Client                                       Server
  | ---- SYN (seq = x) ----------------------> |
  | <--- SYN-ACK (seq = y, ack = x + 1) ------ |
  | ---- ACK (ack = y + 1) ------------------> |
  | ---- first request bytes ----------------> |   one round trip spent before any data
```

That round trip is overhead paid on every new connection (100 ms or more across an ocean, before TLS adds its own), which is why clients reuse connections. Closing takes a `FIN` and an `ACK` in each direction.

### Reliability, flow control and congestion control

- **Reliability.** Every byte has a sequence number; the receiver acknowledges what it has received. Missing data is retransmitted after a timeout, or sooner when duplicate acknowledgements reveal a gap. Checksums catch corruption, and the application only ever sees bytes in order.
- **Flow control** protects the *receiver*: it advertises a window (how much more it can buffer), and the sender never has more unacknowledged data in flight than that.
- **Congestion control** protects the *network*. The sender keeps a congestion window: it starts small (**slow start**, about 10 packets, then doubling each round trip), grows while all goes well, and cuts back sharply on packet loss. CUBIC is Linux's default; Google's BBR models bandwidth and delay instead of reacting to loss. A side effect: a brand-new connection can't use the full bandwidth straight away, another reason to reuse connections.

The cost of in-order delivery is **head-of-line blocking**: if one packet is lost, all the data behind it waits for the retransmission, even data that has already arrived.

### Nagle's algorithm and delayed ACKs

Two old TCP optimisations each save packets on their own and stall together.

- **Nagle's algorithm** (sender side) stops a program from flooding the network with tiny packets: while any sent data is still unacknowledged, small writes are held back and merged until the ACK arrives or a full-size segment has built up.
- **Delayed ACK** (receiver side) doesn't acknowledge each segment at once; it waits briefly (40 ms minimum on Linux, up to 200 ms on Windows) hoping to piggyback the ACK on a reply, and ACKs at once only after a second full segment arrives.

The stall needs a **write-write-read** pattern: the client sends a small request header in one `write`, the body in a second, then waits for the response.

1. The header goes out immediately (nothing is unacknowledged yet).
2. The body is small and the header isn't acknowledged yet, so Nagle holds it.
3. The server can't answer a half-received request, so it has no reply to piggyback on, and its delayed-ACK timer runs.
4. After 40 to 200 ms the timer fires, the ACK arrives, the body is sent, and the request finally completes.

Every request pays that delay, on any network, even on localhost. Measured on Linux over loopback, 20 such requests took 41.7 ms each with Nagle on and 0.03 ms each with it off. It shows up in interviews as "our RPC p50 is exactly 40 ms" or "small messages are slow, large ones are fine".

Fixes, best first:

- **Write each message in one call**: build the whole request in a buffer (or use `writev`/`sendmsg` with several buffers), so there's nothing for Nagle to hold.
- **Turn Nagle off with `TCP_NODELAY`** on latency-sensitive connections (RPC, games, interactive protocols, anything request/response). Go sets it on every TCP connection by default, and many HTTP and RPC libraries set it for you; check what yours does.
- Leave Nagle on for bulk transfers that write in big chunks anyway; it only affects small writes.

```python
import socket

sock = socket.create_connection(("db.internal", 5432))
# send small writes immediately instead of waiting for ACK of previous one
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
```

In Java it's `socket.setTcpNoDelay(true)`; in Node.js, `socket.setNoDelay(true)`. The pitfall with `TCP_NODELAY` is the opposite problem: a program that now writes one byte per `send` puts one byte in each 40-byte-header packet. Turning Nagle off is right only when you also write whole messages at once.

### TIME_WAIT and ephemeral ports

A TCP connection is identified by four values: client IP, client port, server IP, server port. A client's port is an **ephemeral port** the kernel picks from a range (on Linux `32768–60999`, about 28,000 ports, in `/proc/sys/net/ipv4/ip_local_port_range`).

When a connection closes, the side that closed first (sent the first `FIN`) keeps it in **TIME_WAIT** for twice the maximum segment lifetime: 60 seconds on Linux. That's on purpose: it lets the final ACK be resent if it's lost, and makes sure stray packets from the old connection can't be mistaken for a new one with the same four values. While it's in TIME_WAIT, that four-value combination can't be reused.

**Ephemeral port exhaustion** follows when a client opens a new connection for every request to the same server, and closes it itself:

- Each request leaves one port in TIME_WAIT for 60 seconds.
- 28,000 ports / 60 s ≈ **470 new connections per second** to one server IP and port, sustained.
- Beyond that, `connect` fails with `EADDRNOTAVAIL` ("Cannot assign requested address"), often only under peak load, and through a proxy or NAT gateway that funnels many clients to few destinations it comes even sooner.

`ss -tan state time-wait | wc -l` showing tens of thousands of entries is the giveaway. The real fix is to **stop making a connection per request**: HTTP keep-alive and a **connection pool** (a `requests.Session`, a shared `HttpClient` in Java, Node's keep-alive agent, a database pool) reuse a few connections for thousands of requests, and also skip a TCP and TLS handshake each time. HTTP/2 goes further, putting many concurrent requests on one connection.

```python
import requests

# one new connection per call: 200 sockets in TIME_WAIT afterwards
for _ in range(200):
    requests.get("http://127.0.0.1:8765/")

# pooled keep-alive connection reused: none left behind
with requests.Session() as s:
    for _ in range(200):
        s.get("http://127.0.0.1:8765/")
```

Kernel knobs only buy headroom: widen `ip_local_port_range`, or set `net.ipv4.tcp_tw_reuse=1` to let *outgoing* connections reuse TIME_WAIT ports safely (it relies on TCP timestamps). Never shorten TIME_WAIT by other tricks; the old `tcp_tw_recycle` broke clients behind NAT and was removed from Linux. On a *server*, TIME_WAIT sockets don't exhaust anything (they all share its one listening port); the related annoyance there is restarting a server and getting "Address already in use", which `SO_REUSEADDR` on the listening socket fixes.

### UDP

**UDP** (User Datagram Protocol) adds ports and a checksum to IP and nothing else: no connection, no acknowledgements, no ordering, no congestion control. Each datagram arrives whole or not at all.

| | TCP | UDP |
|---|---|---|
| Connection | Handshake first | None: just send |
| Delivery | Reliable, in order | Best effort; may drop, duplicate or reorder |
| Data | A byte stream (no message boundaries) | Separate datagrams |
| Overhead | 20+ byte header, round trips, retransmissions | 8-byte header |
| Used by | HTTP/1.1 and HTTP/2, databases, SSH, email | DNS, video calls, games, QUIC (HTTP/3) |

Pick UDP when late data is worthless (a late video frame is better skipped) or to build your own reliability on top, as QUIC does.

## DNS

**DNS** (Domain Name System) turns names like `www.example.com` into IP addresses. It's a hierarchical, heavily cached distributed database:

```diagram
{"type":"flow","nodes":[{"id":"b","label":"Browser / OS","sub":"stub resolver + cache","kind":"client","col":0,"row":1},{"id":"r","label":"Recursive resolver","sub":"ISP, 1.1.1.1, 8.8.8.8","kind":"service","col":1,"row":1,"highlight":true},{"id":"root","label":"Root servers","sub":"who runs .com?","kind":"external","col":2,"row":0},{"id":"tld","label":".com TLD servers","sub":"who runs example.com?","kind":"external","col":2,"row":1},{"id":"auth","label":"example.com nameserver","sub":"authoritative answer","kind":"external","col":2,"row":2}],"edges":[{"from":"b","to":"r","label":"www.example.com?","both":true},{"from":"r","to":"root","label":"1"},{"from":"r","to":"tld","label":"2"},{"from":"r","to":"auth","label":"3: A 203.0.113.10"}],"caption":"The resolver walks the hierarchy on a cold cache. Every answer is cached for its TTL, so most lookups never leave the resolver."}
```

The browser and OS ask a **recursive resolver**, which on a miss asks a **root server**, then a **TLD server**, then the domain's **authoritative** nameserver. Each answer carries a **TTL**, and every cache along the way keeps it that long (failed lookups too).

| Record | Maps a name to |
|---|---|
| `A` / `AAAA` | An IPv4 / IPv6 address |
| `CNAME` | Another name (an alias); not allowed at the bare domain |
| `MX` | Mail servers |
| `TXT` | Free text: domain verification, SPF |
| `NS` | The nameservers responsible for a zone |

DNS mostly runs over UDP port 53, falling back to TCP for large answers; DNS over HTTPS and over TLS encrypt it. The TTL is the classic migration gotcha: if a record has a 24-hour TTL, resolvers may keep serving the old IP for a day after you change it. Lower the TTL to a few minutes a day *before* the move.

## HTTP

**HTTP** is a request/response protocol: the client sends a method, a path and headers (and maybe a body); the server returns a status code, headers and usually a body. It's stateless: each request stands alone, and cookies or tokens carry state across requests.

```http
GET /products/42 HTTP/1.1
Host: shop.example
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{"id": 42, "name": "Desk lamp"}
```

### Methods and status codes

| Method | Meaning | Safe | Idempotent |
|---|---|---|---|
| `GET` | Read a resource | Yes | Yes |
| `HEAD` | `GET` without the body | Yes | Yes |
| `POST` | Create, or any non-idempotent action | No | No |
| `PUT` | Replace a resource with the body | No | Yes |
| `PATCH` | Partially update a resource | No | Not necessarily |
| `DELETE` | Remove a resource | No | Yes |
| `OPTIONS` | Ask what's allowed (used by CORS) | Yes | Yes |

**Safe** means no change on the server; **idempotent** means repeating it has the same effect as doing it once. How to use them in an API is on the [API design](/learn/api-design) page.

**HTTP status codes** fall into five classes:

| Class | Codes worth knowing |
|---|---|
| 1xx informational | `101 Switching Protocols` (WebSocket upgrade) |
| 2xx success | `200 OK`, `201 Created`, `202 Accepted`, `204 No Content` |
| 3xx redirection | `301` / `308` permanent, `302` / `307` temporary, `304 Not Modified` |
| 4xx client error | `400 Bad Request`, `401 Unauthorized` (not authenticated), `403 Forbidden` (authenticated, not allowed), `404 Not Found`, `409 Conflict`, `422 Unprocessable Content`, `429 Too Many Requests` |
| 5xx server error | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` |

Pairs that interviews like: **401 vs 403** (who are you? vs you can't do that); **502 vs 504** (a proxy got a bad response from the server behind it vs got no response in time); **307/308 vs 302/301** (the newer two guarantee the method and body are kept, so a `POST` stays a `POST`).

### HTTP/1.1, HTTP/2 and HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | **QUIC** over UDP |
| Format | Text | Binary frames | Binary frames |
| Concurrency | One request at a time per connection; browsers open about 6 per origin | Many streams **multiplexed** over one connection | Many independent streams over one connection |
| Head-of-line blocking | Per connection: a slow response blocks the next | Fixed at the HTTP level, but one lost TCP packet still stalls every stream | Gone: a lost packet only stalls its own stream |
| Headers | Plain text, repeated every time | Compressed (HPACK) | Compressed (QPACK) |
| Setup (new connection) | TCP + TLS: 2 round trips with TLS 1.3 | Same | 1 round trip (transport and crypto combined); 0 on resumption |

**HTTP/2** means dozens of small files no longer queue behind each other. (Its server push feature has been dropped by browsers.) **HTTP/3** runs on **QUIC**, a UDP-based transport with TLS 1.3 built in. QUIC tracks streams itself, so a lost packet only delays its own stream, and connections are identified by an ID rather than IP and port, so a phone moving from Wi-Fi to mobile data keeps its connection. Clients fall back to HTTP/2 when UDP is blocked.

## TLS

**TLS** (Transport Layer Security; HTTPS is HTTP over TLS) gives a connection three things: **confidentiality** (eavesdroppers see noise), **integrity** (tampering is detected) and **authentication** (you're talking to the real `bank.example`, not an impostor).

The **TLS handshake** in TLS 1.3 takes one round trip:

1. **ClientHello**: supported ciphers, a key share for key exchange, the server name it wants (SNI) and the protocols it speaks (ALPN, e.g. `h2`).
2. **ServerHello**: the server's key share, its **certificate**, and a signature proving it holds the certificate's private key.
3. The client checks the certificate: signed by a chain leading to a trusted certificate authority, valid for this hostname, not expired.
4. Both sides combine the key shares (ephemeral Diffie-Hellman) into the same symmetric keys, and everything after that is encrypted with a fast cipher such as AES-GCM.

TLS 1.2 needed two round trips. Because the key exchange uses throwaway keys, recorded traffic stays secret even if the server's private key leaks later (**forward secrecy**). Resumed sessions can send 0-RTT data, but it can be replayed, so only idempotent requests should. More on the [Security](/learn/security) page.

## What happens when you type a URL

The classic open-ended question. A good answer walks the layers in order:

```diagram
{"type":"flow","nodes":[{"id":"b","label":"Browser","kind":"client","col":0,"row":1},{"id":"dns","label":"DNS resolver","kind":"service","col":1,"row":0},{"id":"cdn","label":"CDN edge","sub":"static files","kind":"cache","col":1,"row":1},{"id":"lb","label":"Load balancer","sub":"terminates TLS","kind":"lb","col":2,"row":1},{"id":"app","label":"Web / app server","kind":"service","col":3,"row":1},{"id":"db","label":"Database, cache","kind":"db","col":4,"row":1}],"edges":[{"from":"b","to":"dns","label":"1 resolve name"},{"from":"b","to":"cdn","label":"2-4 connect, request"},{"from":"cdn","to":"lb","label":"dynamic content"},{"from":"lb","to":"app"},{"from":"app","to":"db"}]}
```

1. **Parse the URL.** If you typed a bare name, the browser may search instead. If the site is on the HSTS list, it upgrades `http://` to `https://` without asking the network.
2. **DNS lookup** for the host, through the browser, OS and resolver caches.
3. **Connect**: TCP handshake to port 443, then the TLS handshake, which also picks HTTP/2 via ALPN. (Or a single QUIC handshake for HTTP/3.)
4. **Send the request**: `GET /` with `Host`, cookies, `Accept-*` headers.
5. **Server side**: a CDN or load balancer, then a web server, application code, caches and databases; the response comes back with a status, headers and a (usually compressed) body.
6. **Render**: the browser parses HTML into the DOM, fetches CSS, scripts and images (reusing the connection), runs JavaScript, lays out the page and paints it.

## Cookies

HTTP is stateless, so servers hand clients a **cookie** to send back. The server sets it with a response header, and the browser attaches it to later requests to the same site:

```http
Set-Cookie: session=9f8e7d; Path=/; Max-Age=3600; Secure; HttpOnly; SameSite=Lax
```

`Secure` sends it over HTTPS only; `HttpOnly` hides it from JavaScript; `SameSite` controls whether it's sent on requests from other sites (`Lax` is Chromium's default). `Max-Age` or `Expires` make it persist; without them it dies with the browser session. Each cookie holds about 4 KB. The attacks these flags stop are on the [Security](/learn/security) page.

## CORS

Browsers enforce the **same-origin policy**: a page's JavaScript can't read responses from a different **origin** (scheme + host + port; `https://app.example` and `https://api.example` are different origins). **CORS** (Cross-Origin Resource Sharing) is how a server opts in to letting specific other origins read its responses.

For a "simple" request (a `GET`, `HEAD` or form-style `POST` with no custom headers), the browser sends it and checks the response for `Access-Control-Allow-Origin`. Anything else, such as a JSON `POST`, a `DELETE`, or an `Authorization` header, first triggers a **preflight** `OPTIONS` request:

```http
OPTIONS /api/orders HTTP/1.1
Host: api.shop.example
Origin: https://app.shop.example
Access-Control-Request-Method: POST
Access-Control-Request-Headers: authorization, content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.shop.example
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Max-Age: 600
```

- To send cookies cross-origin, the server must reply with `Access-Control-Allow-Credentials: true` and name the exact origin; `*` isn't allowed with credentials.
- `Access-Control-Max-Age` lets the browser cache the preflight, saving a round trip on later requests.
- **CORS is not server-side security.** It's enforced by browsers, to stop other websites reading a user's data. `curl` and server-to-server calls ignore it entirely, so it never replaces authentication.

## Real-time: WebSockets, SSE and long polling

HTTP is request/response, so pushing data from server to browser needs a workaround:

| Technique | How | Direction | Good for | Watch out for |
|---|---|---|---|---|
| Short polling | Request every few seconds | Client asks | Rarely changing data | Wasted requests; latency up to the interval |
| **Long polling** | The server holds each request open until there's news (or ~30 s), then the client asks again | Server to client | Works everywhere, through any proxy | A full request per message |
| **Server-Sent Events** | One long HTTP response streaming `text/event-stream` events | Server to client only | Feeds, notifications, progress, streaming text | Text only; with HTTP/1.1 each stream uses one of the ~6 connections per origin |
| **WebSocket** | An HTTP request upgraded (`101 Switching Protocols`) to a persistent two-way channel | Both ways | Chat, multiplayer games, collaborative editing | Stateful connections: load balancing, reconnects and heartbeats are your job |

Server-Sent Events are plain HTTP, and the browser's `EventSource` reconnects automatically from the last event ID. Choose a WebSocket when the client also sends frequent messages. Either way, a message for a user connected to server 3 must be routed there, usually through a pub/sub layer such as Redis.

## Diagnosing connection failures

"It can't connect" has several distinct causes, and the error tells you which layer failed. Reading it correctly is a common debugging question ("the service is down: what do you check?"), and it decides whether a retry can help.

A connection attempt goes through these steps, and each failure stops at a different one:

1. **Resolve the name.** If DNS fails, no packet is ever sent to the server.
2. **Send a `SYN`** to the IP and port, and wait for an answer.
3. **Exchange data** over the established connection.

| Symptom | What happened | Typical errors | Likely causes |
|---|---|---|---|
| **DNS failure** | The name didn't resolve; no connection attempted | Python `socket.gaierror`, Java `UnknownHostException`, Node `ENOTFOUND` / `EAI_AGAIN`, curl exit 6 "Could not resolve host" | Typo in the hostname, record not created yet or expired, wrong internal DNS or search domain, resolver unreachable (`EAI_AGAIN`, "temporary failure": retryable) |
| **Connection refused** | The host answered the `SYN` with a `RST`: reachable, but nothing is listening on that port. Fast: one round trip | `ECONNREFUSED`, Java `ConnectException: Connection refused`, curl exit 7 | Service down or restarting, wrong port, server listening only on `127.0.0.1` (classic inside Docker), a firewall that rejects |
| **Connect timeout** | The `SYN` got no answer at all | `ETIMEDOUT`, `SocketTimeoutException: connect timed out`, curl exit 28 | Host down or wrong IP, a firewall or security group silently dropping packets, a routing problem |
| **Read timeout** | Connected, but the response didn't arrive in time | `SocketTimeoutException: Read timed out`, HTTP `504` from a proxy | Server overloaded, stuck on a slow query or a lock, or a deadlock |
| **Connection reset** | An established connection got a `RST` | `ECONNRESET`, "Connection reset by peer" | Server crashed or closed abruptly, a load balancer's idle timeout killed the connection, reusing a pooled connection the server already closed |

```python
import socket

def probe(host, port, timeout=2.0):
    try:
        # DNS lookup happens first, before any packet reaches host
        addr = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)[0][4]
    except socket.gaierror as e:
        return f"DNS failure: {e}"
    try:
        with socket.create_connection(addr[:2], timeout=timeout):
            return "connected"
    except ConnectionRefusedError:
        # host answered SYN with RST, nothing listening on port
        return "refused"
    except TimeoutError:
        # no answer at all (host down, packets dropped by firewall)
        return "timed out"

# probe("no-such-host.invalid", 80)  DNS failure: [Errno -2] Name or service not known
# probe("127.0.0.1", 1)              refused
# port behind a DROP firewall rule   timed out (after 2 s)
```

Things to know:

- **Refused is fast, a timeout is slow.** Without your own connect timeout, Linux retries the `SYN` 6 times with doubling gaps, so a dropped connection fails only after about 2 minutes. Always set explicit connect and read timeouts, with the connect timeout short (a second or two inside a data centre).
- **Refused means you reached the host.** The network path and the IP are fine; look at the process and the port (`ss -ltnp` on the server shows what's listening, and on which address).
- **A timeout means look at the path**: is the IP right, is the host up, does a firewall or security group allow the port? `nc -vz host port` or `curl -v` from the same machine as the client separates "my code" from "the network".
- **DNS failures can be cached** too (negative caching), so a freshly created record may stay "not found" for a while.
- **Retries**: refused and connect timeouts are safe to retry with backoff, since nothing reached the application. A read timeout or reset on a non-idempotent request (`POST`) might have been processed already.

## Latency numbers worth knowing

Orders of magnitude, not benchmarks, but enough to sanity-check a design:

| Operation | Approximate time |
|---|---|
| L1 cache reference | 1 ns |
| Main memory reference | 100 ns |
| Random read from an NVMe SSD | 20 to 100 µs |
| Round trip within a data centre | 0.1 to 0.5 ms |
| Redis `GET` from an app server, same data centre | about 0.5 ms |
| Read 1 MB sequentially from SSD | under 1 ms |
| Hard disk seek | 5 to 10 ms |
| Round trip, US east coast to west coast | 60 to 70 ms |
| Round trip, London to New York | about 75 ms |
| Round trip, US west coast to Tokyo or Sydney | 100 to 150 ms |

Light in fibre covers about 200 km per millisecond, so 1,000 km costs at least 10 ms per round trip. A new HTTPS connection over TCP and TLS 1.3 needs three round trips before the first response byte (TCP, TLS, the request): around half a second from another continent. Hence CDNs, connection reuse and HTTP/3.

## Interview questions and pitfalls

- **"TCP or UDP for a video call?"** UDP (or QUIC): a late frame is worthless, so retransmitting it only adds delay.
- **"What does HTTP/2 improve over HTTP/1.1?"** Multiplexing many requests over one connection, plus header compression. **"And HTTP/3?"** No TCP head-of-line blocking, faster setup, connection migration.
- **"You're moving a site to a new IP."** Lower the DNS TTL a day ahead, switch, then raise it again.
- **"401 or 403?"** 401: not authenticated (or bad credentials). 403: authenticated but not allowed.
- **"My frontend gets a CORS error."** The API must return `Access-Control-Allow-Origin` for that origin (and handle the preflight); the request often did reach the server.
- **"Every small RPC takes exactly 40 ms."** Nagle's algorithm plus delayed ACK on a write-write-read pattern: send each message in one write, or set `TCP_NODELAY`.
- **"Connection refused or timeout?"** Refused: the host is up but nothing listens on the port. Timeout: no answer at all, so check the IP, the host and firewalls.
- **Pitfalls:** opening a new connection per request; forgetting that `localhost:3000` and `localhost:8080` are different origins; using `*` with credentials; assuming DNS changes take effect instantly; long-lived WebSockets behind a load balancer with a short idle timeout.
