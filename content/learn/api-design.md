---
title: API design
summary: REST resources and methods, status codes, idempotency keys, cursor pagination, versioning, error formats, auth and rate-limit headers, gRPC vs GraphQL, webhooks, and changing an API without breaking clients.
related: networking, system-design, distributed-systems, databases, security
terms:
  - REST #rest-resources-and-methods
  - REST API #rest-resources-and-methods
  - idempotency #idempotency
  - idempotent #safe-and-idempotent-methods
  - idempotency key #idempotency-keys
  - cursor pagination #pagination
  - API versioning #versioning
  - Problem Details #error-format
  - API key #authentication-in-brief
  - gRPC #grpc-and-graphql
  - GraphQL #grpc-and-graphql
  - webhook #webhooks
  - webhooks #webhooks
  - backward compatibility #backward-compatible-changes
  - breaking change #backward-compatible-changes
---

## What makes an API good

An API is a contract that other people build on. The code behind it can change daily; the contract can't, without breaking them. So the goals are:

- **Predictable**: once you've seen one endpoint, you can guess the rest (same naming, same pagination, same errors).
- **Hard to misuse**: retries are safe, defaults are sensible, errors say what to fix.
- **Evolvable**: you can add features for years without breaking existing clients.

## REST resources and methods

**REST** (Representational State Transfer) models an API as **resources** (nouns, each with a URL) manipulated through the standard HTTP methods. Requests are stateless, so every request carries everything needed to handle it, including credentials. In practice a **REST API** means JSON over HTTP with resource-shaped URLs:

| Request | Meaning | Success response |
|---|---|---|
| `GET /orders` | List orders (paginated, filterable) | `200 OK` |
| `POST /orders` | Create an order | `201 Created` + `Location: /orders/ord_1043` |
| `GET /orders/ord_1043` | Fetch one order | `200 OK` |
| `PUT /orders/ord_1043` | Replace it entirely | `200 OK` |
| `PATCH /orders/ord_1043` | Change some fields | `200 OK` |
| `DELETE /orders/ord_1043` | Delete it | `204 No Content` |
| `GET /customers/c_7/orders` | Orders belonging to one customer | `200 OK` |

URL conventions:

- **Plural nouns, no verbs**: `/orders`, not `/getOrders` or `/createOrder`. The method is the verb.
- **Nest only for ownership**, and only one level deep. `/customers/c_7/orders` is clear; `/customers/c_7/orders/ord_1043/items/3/notes` isn't. Once an item has its own id, give it a top-level URL.
- **Actions that aren't CRUD** become sub-resources: `POST /orders/ord_1043/cancel`, or a state change: `PATCH` with `{"status": "cancelled"}`. Both are fine; be consistent.
- **Use opaque, prefixed ids** (`ord_1043`) rather than exposing sequential database ids, so you can change storage later and clients can't guess other records.

For `PATCH` bodies, **JSON Merge Patch** (send the fields to change; `null` deletes one) is simpler than **JSON Patch** (a list of operations) and usually enough.

## Status codes in APIs

Clients branch on the status code before they read the body, so use the right one. The full list is on the [Networking](/learn/networking) page; the ones an API uses most:

| Code | Use it when |
|---|---|
| `200 OK` | A read or update succeeded, with a body |
| `201 Created` | A `POST` created something; include `Location` and usually the new resource |
| `202 Accepted` | Work was queued, not done; return a URL where the client can check its status |
| `204 No Content` | Success with nothing to return (often `DELETE`) |
| `400 Bad Request` | The request is malformed: invalid JSON, wrong types |
| `401 Unauthorized` | No credentials, or invalid ones |
| `403 Forbidden` | Valid credentials, but not allowed to do this |
| `404 Not Found` | No such resource (also used to hide resources the caller mustn't know exist) |
| `409 Conflict` | Conflicts with the current state: duplicate, already cancelled, version clash |
| `412 Precondition Failed` | An `If-Match` precondition failed (someone else changed it) |
| `422 Unprocessable Content` | Well-formed but semantically invalid: failed validation |
| `429 Too Many Requests` | Rate limited; include `Retry-After` |
| `500`, `502`, `503`, `504` | Server-side failures; `503` with `Retry-After` for overload or maintenance |

Teams differ on `400` vs `422` for validation errors; pick one and use it everywhere. Never return `200 OK` with `{"error": ...}` in the body: monitoring, caches, retries and client libraries all trust the status code.

## Idempotency

Networks fail in the worst possible place: after the server has done the work but before the client gets the response. The client sees a timeout and doesn't know whether the payment went through. Retrying is only safe if the operation is idempotent. That's the core of **idempotency** in API design.

### Safe and idempotent methods

- A **safe** method doesn't change server state: `GET`, `HEAD`, `OPTIONS`.
- An **idempotent** method has the same effect whether it runs once or ten times: the safe methods plus `PUT` and `DELETE`. Putting the same document twice leaves the same document; deleting twice leaves it deleted (the second call may return `404`, but the state is the same).
- `POST` is neither: two `POST /payments` make two payments. `PATCH` may or may not be, depending on the patch: "set status to shipped" is idempotent, "append an item" isn't.

Clients, proxies and libraries may automatically retry idempotent requests. Keep `GET` free of side effects so that's always safe.

### Idempotency keys

To make a `POST` safe to retry, the client generates a unique **idempotency key** (a UUID) per logical operation and sends it with every attempt of that operation:

```http
POST /payments HTTP/1.1
Host: api.shop.example
Authorization: Bearer sk_live_...
Idempotency-Key: 5f1c9a2e-7b3d-4c8e-9a61-2d4f8b0e6c13
Content-Type: application/json

{"order_id": "ord_1043", "amount_cents": 3900, "currency": "EUR"}
```

```diagram
{"type":"flow","nodes":[{"id":"c","label":"Client","sub":"retries with the same key","kind":"client","col":0,"row":1},{"id":"api","label":"Payments API","kind":"service","col":1,"row":1,"highlight":true},{"id":"k","label":"Idempotency keys","sub":"key → stored response","kind":"db","col":2,"row":0},{"id":"p","label":"Payment processor","kind":"external","col":2,"row":2}],"edges":[{"from":"c","to":"api","label":"POST + Idempotency-Key","both":true},{"from":"api","to":"k","label":"seen this key?"},{"from":"api","to":"p","label":"charge, first time only"}],"caption":"The first request does the work and stores its response under the key; a retry gets the stored response instead of a second charge."}
```

On the server:

1. Look up the key, scoped to the caller (two customers may pick the same UUID).
2. **New key**: record it as in progress along with a fingerprint of the request, do the work, then save the response under the key.
3. **Key with a saved response**: return that response unchanged. The client can't tell it's a replay.
4. **Key still in progress** (a concurrent retry): reply `409 Conflict`. **Same key, different body**: the client has a bug; reply `422`.
5. Expire keys after a while (Stripe keeps them at least 24 hours).

Store the key in the same database transaction as the effect, or enforce it with a unique constraint on `(account_id, idempotency_key)`, so two concurrent requests can't both pass the "is it new?" check. This is the HTTP version of the deduplication described in [Distributed systems](/learn/distributed-systems).

## Pagination

Never return an unbounded list: it works with 50 rows in development and times out with 5 million in production. Every list endpoint takes a `limit`, with a default (say 20) and a maximum (say 100).

**Offset pagination** (`?page=3&limit=20`) is easy and lets users jump to any page, but deep pages get slow and items shift between pages when rows are added. **Cursor pagination** returns an opaque token that encodes where the page ended; the next request passes it back:

```http
GET /orders?limit=20&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0xMS0wMVQwOTozMDowMFoiLCJpZCI6ODEyMzR9 HTTP/1.1
```

```json
{
  "data": [
    {"id": "ord_81233", "status": "paid", "created_at": "2026-11-01T09:29:41Z"},
    {"id": "ord_81230", "status": "shipped", "created_at": "2026-11-01T09:27:02Z"}
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0xMS0wMVQwOToyNzowMloiLCJpZCI6ODEyMzB9",
  "has_more": true
}
```

That cursor is base64 of `{"created_at":"2026-11-01T09:30:00Z","id":81234}`: the sort key and unique tie-breaker of the last row seen. The server turns it into a keyset query (see [Databases & indexing](/learn/databases)) that stays fast on any page and never skips or repeats rows. Document cursors as opaque so you can change their contents. The trade-off: no "jump to page 50" and no cheap total count.

## Filtering and sorting

Use query parameters with one consistent style:

```http
GET /orders?status=shipped&created_after=2026-10-01T00:00:00Z&sort=-created_at&limit=50 HTTP/1.1
```

- **Allowlist** the fields that can be filtered and sorted. Each one needs a database index, so arbitrary filters on a big table are a denial-of-service waiting to happen.
- A common sort convention is `sort=field` ascending and `sort=-field` descending, with multiple fields comma-separated.
- Use **ISO 8601 timestamps with a time zone** (`2026-10-01T00:00:00Z`) everywhere, in and out.
- For complex searches, add `POST /orders/search` with a JSON body rather than encoding a query tree into the URL.

## Versioning

Sooner or later you need a **breaking change**. **API versioning** lets old clients keep the old behaviour while new clients get the new one.

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| URL path | `/v1/orders`, `/v2/orders` | Obvious; easy to route, cache, test in a browser | Bumps the whole API at once; the version isn't really part of the resource |
| Header | `Accept: application/vnd.shop.v2+json`, or `X-GitHub-Api-Version: 2022-11-28` | Clean URLs; can version per resource | Invisible in links and logs; caches need `Vary` |
| Query parameter | `?api-version=2024-10-01` (Azure) | Easy to add | Easy to forget; clutters URLs |
| Date-pinned versions | Each account is pinned to the version current when it signed up; a header overrides it (Stripe) | Small, frequent changes without a big-bang v2 | The server keeps a chain of transformations between versions |

URL versioning is the most common. Whichever you pick: avoid breaking changes so new versions are rare, run old and new side by side, warn clients with `Deprecation` and `Sunset` headers, and switch the old one off only once usage has dropped.

## Error format

Return errors in one consistent, machine-readable shape. **Problem Details** (RFC 9457, which replaced RFC 7807) is the standard one, served as `application/problem+json`:

```json
{
  "type": "https://api.shop.example/errors/validation",
  "title": "Your request is not valid.",
  "status": 422,
  "detail": "2 fields failed validation.",
  "instance": "/orders",
  "request_id": "req_7Hc2x9",
  "errors": [
    {"field": "quantity", "code": "too_small", "message": "Must be at least 1."},
    {"field": "currency", "code": "unsupported", "message": "Use one of EUR, GBP, USD."}
  ]
}
```

- `type` identifies the kind of error (ideally a page documenting it), `title` is a fixed summary, and `detail` explains this occurrence. Extra fields such as `errors` are allowed.
- Give clients a **stable code** to branch on, not a message to parse; messages get reworded.
- Include a **request id** that's also in your logs, so support can find the failure.
- Never leak stack traces, SQL or internal hostnames.

## Authentication in brief

| | API key | OAuth 2.0 access token |
|---|---|---|
| Identifies | A calling application or account | A user who granted an app limited access (scopes) |
| Lifetime | Long-lived until rotated | Short-lived (minutes to hours), renewed with a refresh token |
| Typical use | Server-to-server calls to your own account ("our backend calls the payments API") | Third-party apps acting for a user ("let this app read my calendar") |
| Sent as | `Authorization: Bearer <key>` or a custom header | `Authorization: Bearer <token>` |

An **API key** is simple, but it's a password: send it only in headers (URLs end up in logs), store only a hash on the server, let customers create several with limited permissions, and make rotation easy. OAuth flows, JWTs and session security are covered on the [Security](/learn/security) page.

## Rate-limit headers

Tell clients their limits so well-behaved ones can slow down before they're rejected. Many APIs follow GitHub's style:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1793952030
Content-Type: application/problem+json
```

`Retry-After` (seconds, or an HTTP date) is the standard part; clients should honour it and otherwise back off exponentially with jitter. The `X-RateLimit-*` headers are a convention (here `Reset` is a Unix timestamp), and an IETF draft standardises them as `RateLimit` and `RateLimit-Policy`. The limiting algorithms themselves are on the [System design basics](/learn/system-design) page.

## gRPC and GraphQL

REST isn't the only style. Two others come up constantly:

**gRPC** is remote procedure calls over HTTP/2. You define services and messages in a Protocol Buffers schema, and code generators produce typed clients and servers in most languages:

```text
service Orders {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrders (WatchRequest) returns (stream OrderEvent);   // server streaming
}

message Order {
  string id = 1;
  string status = 2;
  int64 total_cents = 3;
}
```

Messages are compact binary, calls carry deadlines that propagate downstream, and streaming works in either or both directions. The costs: browsers can't call gRPC directly (you need gRPC-Web or a similar proxy), payloads aren't human-readable, HTTP caching doesn't apply, and long-lived HTTP/2 connections need request-level load balancing.

**GraphQL** exposes one endpoint and a typed schema; the client sends a query naming exactly the fields it wants, across related objects, and gets back exactly that shape. One request replaces several REST calls (**under-fetching**) and nothing unneeded comes back (**over-fetching**). The costs move to the server: resolvers cause N+1 database queries unless batched (DataLoader), a single deep query can be very expensive (limit depth and cost, or allow only pre-registered queries), HTTP caching is harder because everything is a `POST` to one URL, and errors usually arrive inside a `200` response.

| | REST | gRPC | GraphQL |
|---|---|---|---|
| Shape | Resources and HTTP methods | Typed procedure calls | Client-written queries over a typed graph |
| Format | JSON (usually) | Protocol Buffers (binary) | JSON |
| Strengths | Simple, universal, HTTP caching, easy to debug | Fast, strongly typed, streaming, codegen | Flexible reads for many different clients; one round trip |
| Weaknesses | Over- and under-fetching; many round trips | Needs a proxy for browsers; opaque on the wire | Server complexity; caching, cost limits and authorisation per field |
| Typical home | Public APIs | Internal service-to-service calls | Frontends with varied data needs (mobile and web) |

A common architecture uses all three: REST or GraphQL at the edge for clients, gRPC between internal services.

```diagram
{"type":"flow","nodes":[{"id":"web","label":"Web app","kind":"client","col":0,"row":0},{"id":"mob","label":"Mobile app","kind":"client","col":0,"row":1},{"id":"partner","label":"Partner integrations","kind":"external","col":0,"row":2},{"id":"gw","label":"API gateway","sub":"auth, rate limits","kind":"lb","col":1,"row":1,"highlight":true},{"id":"o","label":"Orders service","kind":"service","col":2,"row":0},{"id":"p","label":"Payments service","kind":"service","col":2,"row":1},{"id":"u","label":"Users service","kind":"service","col":2,"row":2}],"edges":[{"from":"web","to":"gw","label":"GraphQL"},{"from":"mob","to":"gw","label":"GraphQL"},{"from":"partner","to":"gw","label":"public REST"},{"from":"gw","to":"o","label":"gRPC"},{"from":"gw","to":"p","label":"gRPC"},{"from":"gw","to":"u","label":"gRPC"}]}
```

## Webhooks

Polling `GET /orders?updated_after=...` every minute is wasteful and slow. A **webhook** reverses the direction: the client registers a URL, and your service `POST`s an event to it when something happens.

```diagram
{"type":"flow","nodes":[{"id":"svc","label":"Your service","sub":"order shipped","kind":"service","col":0},{"id":"q","label":"Delivery queue","sub":"retries with backoff","kind":"queue","col":1},{"id":"rcv","label":"Customer endpoint","sub":"verify, store, reply 2xx","kind":"external","col":2,"highlight":true},{"id":"work","label":"Customer worker","sub":"process async","kind":"service","col":3}],"edges":[{"from":"svc","to":"q","label":"event"},{"from":"q","to":"rcv","label":"signed POST"},{"from":"rcv","to":"work"}]}
```

```http
POST /webhooks/shop HTTP/1.1
Host: partner.example
Content-Type: application/json
Webhook-Id: evt_2Zk81f
Webhook-Timestamp: 1793952000
Webhook-Signature: v1,Bol86I7uyBEKjQGjlr15sjpW3z2YCNXg6GScLNFfP8Y=

{"type": "order.shipped", "data": {"order_id": "ord_1043"}}
```

What a well-designed webhook system does:

- **Signs every delivery.** The sender computes an HMAC-SHA256 over the event id, timestamp and raw body with a secret shared with that receiver. The receiver recomputes it over the *raw bytes* (before any JSON parsing), compares in constant time, and rejects timestamps more than a few minutes old so a captured request can't be replayed. (Stripe's `Stripe-Signature` and the Standard Webhooks headers shown above both work this way.)
- **Retries.** Any non-2xx response or timeout is retried with exponential backoff, for hours or days, then the endpoint is flagged or disabled. Offer a way to replay past events.
- **Delivers at least once.** Retries mean duplicates, so receivers deduplicate on the event id.
- **Doesn't promise order.** Events can arrive out of order; include a timestamp or version, or send thin events ("order ord_1043 changed") that make the receiver fetch the current state.
- **Expects a fast 2xx.** Receivers verify, store the event, reply, and process it later.

Letting customers register arbitrary URLs means your servers make requests to wherever they say, so block internal addresses (see SSRF on the [Security](/learn/security) page).

## Backward-compatible changes

**Backward compatibility** means existing clients keep working, unchanged, after you deploy. Know which changes are safe:

| Usually safe (additive) | Breaking |
|---|---|
| Add a new endpoint | Remove or rename an endpoint or field |
| Add a field to a response | Change a field's type or format (number id to string, a date format) |
| Add an optional request field whose default keeps the old behaviour | Make an optional request field required, or tighten validation |
| Make a required request field optional | Change defaults or meaning (prices now include tax) |
| Add a new enum value, *if* clients were told to expect unknown values | Change status codes, error codes or pagination that clients rely on |

Two habits keep this list short. Servers should never break the contract, and clients should be **tolerant readers**: ignore fields they don't know and handle unknown enum values gracefully. In Protocol Buffers, never reuse or renumber a field: mark removed fields `reserved`. And remember Hyrum's law: with enough users, every observable behaviour (field order, error wording, timing) is something someone depends on.

## Interview questions and pitfalls

- **"A client times out on `POST /payments`. Is it safe to retry?"** Only with an idempotency key; otherwise it may pay twice.
- **"Which methods are idempotent?"** `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`. Not `POST`; `PATCH` depends on the patch.
- **"How do you paginate a feed that changes constantly?"** Cursor (keyset) pagination with a unique tie-breaker.
- **"How do you add a field without breaking anyone?"** Make it optional in requests and additive in responses; clients ignore unknown fields.
- **"REST, gRPC or GraphQL?"** Public API: REST. Internal, high-volume, typed: gRPC. Many clients with different data needs: GraphQL.
- **Pitfalls:** verbs in URLs; `200` with an error body; unbounded lists; leaking database ids or stack traces; API keys in query strings; webhooks without signatures or retries; changing behaviour without a version or deprecation notice.
