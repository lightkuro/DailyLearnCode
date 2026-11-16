---
title: Security
summary: Injection, XSS and CSRF, password storage, sessions and JWTs, OAuth and OpenID Connect, secrets, least privilege and SSRF: the web security basics every engineer is expected to know.
related: networking, api-design, databases, devops
terms:
  - SQL injection #injection-and-parameterized-queries
  - parameterized queries #injection-and-parameterized-queries
  - parameterised queries #injection-and-parameterized-queries
  - XSS #cross-site-scripting-xss
  - Content Security Policy #cross-site-scripting-xss
  - CSRF #cross-site-request-forgery-csrf
  - password hashing #storing-passwords
  - bcrypt #storing-passwords
  - JWT #sessions-vs-jwts
  - JWTs #sessions-vs-jwts
  - OAuth 2.0 #oauth-2-0-and-openid-connect
  - OpenID Connect #oauth-2-0-and-openid-connect
  - PKCE #oauth-2-0-and-openid-connect
  - least privilege #least-privilege-and-secrets
  - SSRF #server-side-request-forgery-ssrf
  - clickjacking #clickjacking
  - frame-ancestors #clickjacking
  - X-Frame-Options #clickjacking
  - timing attack #timing-attacks-and-constant-time-comparison
  - timing attacks #timing-attacks-and-constant-time-comparison
  - constant-time comparison #timing-attacks-and-constant-time-comparison
  - open redirect #open-redirects
  - open redirects #open-redirects
---

## Thinking like an attacker

Most vulnerabilities come from **trusting input you don't control**. Anything that crosses a **trust boundary** (a form field, a URL, a header, an upload, a webhook) can be crafted by an attacker. Three habits cover a lot of ground:

- **Treat data as data.** Never let user input be interpreted as code: SQL, HTML, JavaScript, shell commands, file paths.
- **Defense in depth.** Assume any one layer can fail, so stack several (input validation, output encoding, a strict CSP, least-privilege credentials).
- **Deny by default.** Grant access explicitly; anything not allowed is refused.

Interviewers rarely want exotic attacks: they want the common ones below, why they work, and the standard fix for each.

## Injection and parameterized queries

**Injection** happens when untrusted input is pasted into a string that something else parses as code. The classic case is **SQL injection**:

```sql
-- The code builds:  "SELECT * FROM users WHERE email = '" + email + "'"
-- The attacker submits:  x' OR '1'='1
SELECT * FROM users WHERE email = 'x' OR '1'='1';   -- matches every row
```

The quote in the input closes the string literal, and the rest becomes SQL. With other payloads the attacker can read other tables (`UNION SELECT`), or modify and delete data.

The fix is a **parameterized query** (also called a **prepared statement**): the SQL text contains placeholders, and the values travel to the database separately. The database parses the query first and only then plugs the values in, so a value can never change the query's structure.

```python
import sqlite3

def find_user(conn, email):
    # The driver sends the SQL and the value separately: the value is never parsed as SQL.
    cur = conn.execute("SELECT id, name FROM users WHERE email = ?", (email,))
    return cur.fetchone()      # find_user(conn, "x' OR '1'='1") returns None
```

```java
static String findUser(Connection conn, String email) throws SQLException {
    String sql = "SELECT id, name FROM users WHERE email = ?";
    try (PreparedStatement st = conn.prepareStatement(sql)) {
        st.setString(1, email);                  // bound as data, never parsed as SQL
        try (ResultSet rs = st.executeQuery()) {
            return rs.next() ? rs.getString("name") : null;
        }
    }
}
```

```cpp
// SQLite's C API (link with -lsqlite3); other database client libraries work the same way.
string findUser(sqlite3* db, const string& email) {
    sqlite3_stmt* st = nullptr;
    sqlite3_prepare_v2(db, "SELECT id, name FROM users WHERE email = ?", -1, &st, nullptr);
    sqlite3_bind_text(st, 1, email.c_str(), -1, SQLITE_TRANSIENT);  // bound as data
    string name;
    if (sqlite3_step(st) == SQLITE_ROW)
        name = reinterpret_cast<const char*>(sqlite3_column_text(st, 1));
    sqlite3_finalize(st);
    return name;
}
```

Things to know beyond the basic case:

- **Escaping by hand is not a fix.** Escaping rules differ between databases and character sets, and it's easy to forget one call. Placeholders are always right.
- **Placeholders only work for values**, not table names, column names or `ORDER BY` directions. For those, pick from an **allowlist** of known names.
- **ORMs are safe by default** but usually offer a raw-SQL escape hatch, and string-building inside it reintroduces the bug.
- The same bug appears elsewhere. **Command injection**: pass arguments as a list (`subprocess.run(["convert", path])`), not a shell string. **Path traversal**: for a filename like `../../etc/passwd`, resolve the full path and check it's still inside the allowed directory.

## Cross-site scripting (XSS)

**Cross-site scripting (XSS)** is injection into a web page: attacker-controlled text ends up in the HTML as script, and runs in other users' browsers with the site's privileges. It can read the page, make requests as the user, and steal any token that JavaScript can reach.

| Kind | Where the payload lives | Example |
|---|---|---|
| Stored | Saved on the server and shown to others | A comment containing `<script>…</script>` |
| Reflected | Bounced off the request, often a URL parameter | `/search?q=<script>…</script>` echoed into the results page |
| DOM-based | Entirely in client-side JavaScript | `el.innerHTML = location.hash.slice(1)` |

Defenses, from most to least important:

1. **Output encoding for the context.** When inserting data into HTML, encode `<`, `>`, `&`, `"` and `'` so the browser shows the text instead of parsing it. Attributes, URLs and JavaScript strings each need their own encoding. Templating engines and frameworks (Jinja, Thymeleaf, React) escape by default; the danger is the opt-out (`|safe`, `dangerouslySetInnerHTML`, `innerHTML`).
2. **Sanitize HTML you must render.** For rich text, run it through a well-maintained sanitizer such as DOMPurify that keeps an allowlist of tags and attributes. Never write your own blocklist: `<img src=x onerror=…>` and odd casing get past it.
3. **Content Security Policy.** A **Content Security Policy (CSP)** is a response header that tells the browser which scripts may run. A strict policy blocks inline scripts unless they carry a per-response nonce, so an injected `<script>` tag does nothing.
4. **Limit the damage.** Mark session cookies `HttpOnly` so scripts can't read them, and don't keep long-lived tokens in `localStorage`.

```http
Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'
```

Input validation is still useful, but it isn't an XSS defense on its own: the same string can be harmless in one context and dangerous in another, so encoding has to happen at output time.

## Cross-site request forgery (CSRF)

Browsers attach a site's cookies to every request to that site, no matter which page started the request. **Cross-site request forgery (CSRF)** abuses this: a malicious page makes the victim's browser send a state-changing request to a site where the victim is logged in.

```diagram
{"type":"flow","nodes":[{"id":"evil","label":"evil.example","sub":"attacker's page","kind":"external","col":0},{"id":"b","label":"Victim's browser","sub":"logged in to the bank","kind":"client","col":1},{"id":"bank","label":"bank.example","sub":"POST /transfer","kind":"service","col":2,"highlight":true}],"edges":[{"from":"evil","to":"b","label":"hidden auto-submit form"},{"from":"b","to":"bank","label":"POST + session cookie"}],"caption":"The browser attaches the bank's cookie to a request the attacker's page started. SameSite cookies and CSRF tokens break this chain."}
```

The attacker can't read the response (the same-origin policy stops that), but they don't need to: the transfer already happened. Defenses:

- **SameSite cookies.** `SameSite=Lax` stops the cookie being sent on cross-site POSTs and background requests, while still sending it when the user follows a link to your site. `Strict` never sends it cross-site. Chrome treats cookies without the attribute as `Lax`, but other browsers don't, so set it explicitly.
- **Anti-CSRF tokens.** Put a random token in each form (or a header) and check it on the server. The attacker's page can't read it, so it can't include it.
- **Check `Origin`** (or `Referer`) on state-changing requests.
- **Never change state on GET.** Lax cookies are sent on top-level GET navigations, and links and image tags make GET requests trivially.

CSRF only affects credentials the browser sends automatically (cookies, HTTP basic auth). An API that requires an `Authorization: Bearer` header set by JavaScript isn't vulnerable to it. **CORS is not a CSRF defense**: it controls who may *read* cross-origin responses, and simple form POSTs are sent without asking.

### Cookie flags

| Attribute | Effect |
|---|---|
| `HttpOnly` | JavaScript can't read it (`document.cookie`); limits XSS damage |
| `Secure` | Sent only over HTTPS |
| `SameSite=Lax` / `Strict` / `None` | Whether it's sent on cross-site requests (`None` requires `Secure`) |
| `Domain`, `Path` | Which hosts and paths receive it; omit `Domain` to keep it on one host |
| `Max-Age` / `Expires` | Lifetime; without one it's a session cookie |

## Clickjacking

**Clickjacking** (UI redressing) loads your site in an invisible `iframe` on the attacker's page and lines up something tempting ("Claim your prize") over a real button on your site ("Delete account", "Transfer", "Allow camera"). The victim thinks they're clicking the attacker's page, but the click lands in the frame, where they're logged in, so the action runs with their cookies. Like CSRF, it borrows the victim's session; unlike CSRF, the request comes from your own page, so CSRF tokens don't stop it.

The defence is to tell the browser who may frame your pages, with a response header:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

- **`frame-ancestors`** is the modern control and part of CSP: `'none'` forbids all framing, `'self'` allows only your own origin, and you can list trusted origins (`frame-ancestors 'self' https://partner.example`).
- **`X-Frame-Options`** is the older header (`DENY` or `SAMEORIGIN`). When both are sent, browsers that support `frame-ancestors` ignore it; send it anyway for older clients. Its `ALLOW-FROM` option is obsolete.
- Send them on **every HTML response**, error pages included, not just the login page. A `<meta>` tag doesn't work: browsers ignore `frame-ancestors` and `X-Frame-Options` there.
- JavaScript "frame-busting" (`if (top !== self) top.location = self.location`) is unreliable: a sandboxed iframe can block it.
- `SameSite=Lax` or `Strict` cookies help too, because a cross-site frame then loads your site logged out, but they don't replace the header.

Pages meant to be embedded (widgets, video players) need a deliberate `frame-ancestors` list, and any sensitive action on them should ask for confirmation in a way that a single hijacked click can't complete.

## Authentication vs authorization

- **Authentication (authn)**: *who are you?* Passwords, passkeys, one-time codes, client certificates.
- **Authorization (authz)**: *what may you do?* Checked on every request, after authentication.

HTTP mixes the names up: `401 Unauthorized` really means "not authenticated", and `403 Forbidden` means "authenticated, but not allowed".

**Broken access control** is the top entry in the OWASP Top 10. The typical bug is an **IDOR** (insecure direct object reference): `GET /invoices/1042` returns invoice 1042 to anyone logged in, because the handler checks that a user is signed in but not that the invoice belongs to them. Fix it by checking ownership or permission on the server for every object, ideally in one shared place, and denying by default. Hiding a button in the UI is not access control.

Common models are **RBAC** (roles carry permissions) and **ABAC** (rules over attributes such as owner or department). For authentication, **multi-factor authentication** combines something you know, have or are; passkeys (WebAuthn) are phishing-resistant, and SMS codes are the weakest second factor.

## Storing passwords

Never store passwords in plain text, and don't *encrypt* them either: anyone with the key (or a stolen copy of it) gets every password back. Store a **password hash**: a one-way function of the password, then hash the login attempt the same way and compare.

The hash must be:

- **Salted.** A **salt** is a random value stored next to each hash and mixed into it. Two users with the same password get different hashes, and precomputed tables (rainbow tables) become useless.
- **Slow on purpose.** SHA-256 is designed to be fast; a single GPU computes billions per second, so a leaked table of SHA-256 hashes falls to a dictionary attack quickly, salt or not. **Password hashing** functions have a tunable cost that makes each guess expensive.
- **Memory-hard**, ideally, so attackers can't cheaply parallelize guesses on GPUs or custom chips.

| Algorithm | Notes |
|---|---|
| **Argon2id** | First choice today. Memory-hard; OWASP suggests at least 19 MiB of memory and 2 iterations |
| **scrypt** | Memory-hard; good when Argon2 isn't available |
| **bcrypt** | Decades of use, widely supported; cost 10 or more; only the first 72 bytes of input count |
| PBKDF2 | Use when FIPS compliance is required; needs hundreds of thousands of iterations (OWASP: 600,000 with HMAC-SHA256) |
| SHA-256, MD5 | Not for passwords: fast, and MD5 is broken anyway |

The stored string records the algorithm, parameters and salt, so you can raise the cost later and rehash each user at their next login:

```text
$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
```

Use a library (`argon2-cffi`, `bcrypt`, Spring Security's encoders, libsodium) rather than assembling this yourself, and compare hashes in constant time.

A related quiz favorite: **encoding** (Base64, URL encoding) is reversible by anyone and protects nothing; **encryption** (AES-GCM) is reversible with a key; **hashing** (SHA-256) is one-way; a **MAC or signature** (HMAC, Ed25519) proves who produced data and that it wasn't changed.

## Timing attacks and constant-time comparison

A **timing attack** learns a secret from how long your code takes. The classic target is comparing a secret with attacker input using `==`. A normal string or byte comparison stops at the first byte that differs, so a guess whose first 5 bytes are right takes slightly longer to reject than one whose first byte is wrong.

That turns guessing the whole secret at once (256ⁿ tries for n bytes) into guessing it one byte at a time (about 256 × n tries, each repeated many times to average out noise):

1. Send many requests with each possible first byte; the value that's rejected slowest on average is probably right.
2. Fix that byte and repeat for the next one.

The differences are nanoseconds, but statistics over thousands of requests, especially from a machine in the same data centre, make them measurable. It shows up in interviews whenever you verify something secret that the caller supplies: webhook and API signatures (HMACs), password-reset and session tokens, API keys, CSRF tokens.

The fix is a **constant-time comparison**: always examine every byte and combine the differences, so the time depends only on the length, never on where the first mismatch is. It's still O(n), just without the early exit:

```python
def leaky_equals(a: bytes, b: bytes) -> bool:
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        # early exit, so time reveals length of matching prefix
        if x != y:
            return False
    return True

def constant_time_equals(a: bytes, b: bytes) -> bool:
    if len(a) != len(b):
        return False
    diff = 0
    # visit every byte; OR keeps any differing bit
    for x, y in zip(a, b):
        diff |= x ^ y
    return diff == 0
```

That shows the idea; in real code use the library function, which is written to resist compiler and interpreter shortcuts: `hmac.compare_digest` in Python, `MessageDigest.isEqual` in Java, `crypto.timingSafeEqual` in Node.js, `subtle.ConstantTimeCompare` in Go. Verifying a webhook signature:

```python
import hashlib, hmac

def verify_webhook(secret: bytes, body: bytes, signature_hex: str) -> bool:
    expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
    # time depends only on length, not on where first mismatch is
    return hmac.compare_digest(expected, signature_hex)
```

Pitfalls:

- **`==` on a secret**, including `expected_sig == request.headers["X-Signature"]`. It's the default way to write the check, which is why it's so common.
- **Length checks and lengths.** Returning early on a length mismatch leaks only the length, which is public for an HMAC or a fixed-size token. Node's `timingSafeEqual` throws on unequal lengths, so check them first.
- **Looking tokens up in a database** by their value: the index lookup itself can leak timing. Store a token as an ID part for the lookup plus a secret part (or its hash) that you compare in constant time.
- Timing also leaks through behaviour: answering "unknown user" faster than "wrong password" (because the slow password hash only runs for real users) reveals which accounts exist. See [Brute-force protection](/learn/security#brute-force-protection).

## Sessions vs JWTs

After login, the server has to recognize the user on later requests. There are two main designs.

A **server-side session** gives the browser a random session ID (at least 128 bits from a secure random generator) in a cookie, and keeps the session data on the server, often in Redis. Logging out or banning a user deletes the record and takes effect immediately. Issue a new ID at login so an attacker can't plant one beforehand (**session fixation**).

A **JWT** (JSON Web Token) puts the data in the token itself: `header.payload.signature`, each part base64url-encoded. The server signs it, and any service with the key can verify it without a database lookup.

```json
{"iss": "https://auth.example.com", "sub": "user_8412", "aud": "orders-api", "exp": 1767225600, "scope": "orders:read"}
```

| | Server-side session | JWT |
|---|---|---|
| Where the state lives | Server (database or cache) | In the token |
| Revoking | Delete the record | Hard: valid until `exp` unless you keep a denylist |
| Verification | A lookup per request | Signature check, no lookup |
| Size | A short ID | Hundreds of bytes or more, sent on every request |
| Good fit | Traditional web apps | Short-lived access tokens between services, OAuth |

**JWT pitfalls** that come up in interviews:

- **The payload is readable.** Signed is not encrypted; anyone can base64-decode it. Never put secrets in it.
- **Validate everything**: the signature, `exp`, `iss` and `aud`. Pin the expected algorithm; never accept `alg: none`, and don't let the token's header choose between HMAC and RSA (attackers have signed HMAC tokens using a server's *public* RSA key as the secret).
- **Revocation is the hard part.** Keep access tokens short-lived (minutes) and pair them with a **refresh token** that is stored server-side, can be revoked, and is rotated on each use.
- **Storage.** `localStorage` is readable by any XSS payload. An `HttpOnly`, `Secure`, `SameSite` cookie is safer, but then you need CSRF protection again.

## OAuth 2.0 and OpenID Connect

**OAuth 2.0** is a protocol for *delegated authorization*: a user (the **resource owner**) lets an app (the **client**) access their data at an API (the **resource server**) without giving the app their password. An **authorization server** issues the app an **access token** scoped to what the user approved. **OpenID Connect (OIDC)** adds *authentication* on top: the app also receives an **ID token**, a JWT saying who the user is. "Sign in with Google" is OIDC.

The flow to use for almost every app is the **authorization code flow with PKCE** (Proof Key for Code Exchange, pronounced "pixie"):

```diagram
{"type":"flow","nodes":[{"id":"b","label":"Browser","sub":"the user","kind":"client","col":0,"row":1},{"id":"app","label":"Your app","sub":"OAuth client","kind":"service","col":2,"row":0},{"id":"as","label":"Authorization server","sub":"e.g. Google, Okta","kind":"external","col":2,"row":2},{"id":"api","label":"API","sub":"resource server","kind":"service","col":4,"row":0}],"edges":[{"from":"b","to":"as","label":"1. sign in (+ challenge)"},{"from":"b","to":"app","label":"2. code (via redirect)"},{"from":"app","to":"as","label":"3. code + verifier","both":true},{"from":"app","to":"api","label":"4. access token"}]}
```

1. The app makes a random secret, the **code verifier**, and sends the browser to the authorization server with its `client_id`, `redirect_uri`, requested `scope`, a random `state`, and the **code challenge**: `BASE64URL(SHA-256(verifier))`. The user signs in and consents.
2. The authorization server redirects the browser back to the registered `redirect_uri` with a short-lived, single-use **authorization code**. The app checks that `state` matches what it sent (this blocks CSRF on the callback).
3. The app sends the code *and the original verifier* to the token endpoint. The server hashes the verifier, checks it matches the challenge, and returns an access token (plus, optionally, a refresh token and an OIDC ID token).
4. The app calls the API with `Authorization: Bearer <access token>`.

**What PKCE protects against:** an attacker who intercepts the code (a malicious app registered for the same redirect scheme, logs, a leaky redirect) can't exchange it, because they never saw the verifier. Current guidance (RFC 9700) is PKCE for every client. The **implicit flow** (tokens straight in the redirect URL) and the **password grant** (the app collects the user's password) are deprecated. For service-to-service calls with no user, use the **client credentials** grant.

## TLS in brief

**TLS** puts the S in HTTPS. It gives *confidentiality* (encryption), *integrity* (tampering is detected) and *server authentication*: the server presents a certificate for its domain, signed by a certificate authority the client trusts. TLS 1.3 always uses ephemeral key exchange, so stealing the server's key later doesn't decrypt recorded traffic (**forward secrecy**); TLS 1.0 and 1.1 are deprecated.

In practice: redirect HTTP to HTTPS and send **HSTS** (`Strict-Transport-Security`); automate certificate renewal with ACME (Let's Encrypt), since public certificate lifetimes are being cut in steps to 47 days by 2029; and consider **mutual TLS** between internal services. The handshake itself is covered in [Networking & HTTP](/learn/networking).

## Least privilege and secrets

**Least privilege** means every user, service and credential gets the minimum access it needs. A service that only reads one storage bucket gets read-only access to that bucket, not an admin key; the app's database user can't drop tables. When something is compromised, least privilege decides how bad the day is.

**Secrets** (API keys, database passwords, signing keys) need the same care:

- **Never in source code**, images or logs. Git history is forever, and public repositories are scanned for keys within minutes of a push.
- Load them at runtime from a **secrets manager** (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager), injected as environment variables or files.
- **Prefer short-lived credentials** (cloud workload identity, OIDC federation from CI) to long-lived keys, and automate rotation.
- **If a key leaks, revoke it first**, then clean up. Removing it from the repository doesn't help: it's already been copied.

## Server-side request forgery (SSRF)

**SSRF** is when an attacker makes *your server* send a request to a URL they choose: a link-preview feature, a webhook URL, an "import from URL" button, a PDF renderer that loads images. Your server sits inside the network, so it can reach things the attacker can't.

```diagram
{"type":"flow","nodes":[{"id":"att","label":"Attacker","kind":"client","col":0,"row":1},{"id":"app","label":"Your server","sub":"fetches URL for a preview","kind":"service","col":2,"row":1},{"id":"meta","label":"169.254.169.254","sub":"cloud metadata: credentials","kind":"external","col":4,"row":0,"highlight":true},{"id":"admin","label":"Internal admin API","sub":"no auth on private network","kind":"service","col":4,"row":1},{"id":"site","label":"Public website","sub":"the intended use","kind":"external","col":4,"row":2}],"edges":[{"from":"att","to":"app","label":"url=http://169.254…"},{"from":"app","to":"meta","dashed":true},{"from":"app","to":"admin","dashed":true},{"from":"app","to":"site"}],"caption":"The server sits inside the trust boundary, so a fetch it makes on the attacker's behalf can reach internal services and cloud credentials."}
```

The classic prize is the cloud **metadata endpoint** at `169.254.169.254`, which hands out the machine's credentials; an SSRF of this kind was at the heart of the 2019 Capital One breach. Defenses:

- **Allowlist** destination hosts when you can.
- Otherwise resolve the hostname and **block private, loopback and link-local addresses**, then connect to the IP you checked (re-resolving lets an attacker switch DNS answers in between). Re-check every redirect, or don't follow redirects.
- Use AWS's **IMDSv2**, which requires a session token fetched with a `PUT` request that most SSRF bugs can't send.
- Restrict outbound traffic at the network level, and give the fetching service least-privilege credentials.

## Open redirects

Login pages and link trackers often redirect to a URL taken from the request: `/login?next=/orders`, `/out?url=...`. If the server redirects to *any* value, it's an **open redirect**: an attacker sends victims `https://bank.example/login?next=https://evil.example/login`. The link really is on the bank's domain, so it passes a glance, a spam filter or an allowlist of "trusted" domains; after a genuine login the victim lands on a look-alike page that asks them to "re-enter" their password. Open redirects also turn smaller bugs into big ones: they let an OAuth authorization code or token leak to the attacker if the provider's `redirect_uri` check allows any path on your site, and they let SSRF filters be bypassed by a URL that redirects elsewhere.

The fix is to **validate redirect targets** before using them:

1. **Prefer relative paths only.** Accept a target that starts with a single `/` and has no scheme or host. The traps: `//evil.example` is a *protocol-relative* URL to another host, browsers treat `\` like `/` (so `/\evil.example` is too), and they strip tabs and newlines (`/<tab>/evil.example`). Parse with a real URL parser after normalizing, rather than checking the string's first character.
2. **Otherwise use an allowlist** of exact hosts (and `https`). Compare the parsed host for equality; `startswith` or "contains" checks lose to `shop.example.evil.example` and `shop.example@evil.example` (everything before `@` is a username).
3. **Better still, don't pass URLs at all**: pass an ID (`?next=orders`) and map it to a path on the server, or keep the target in the session.
4. Fall back to a safe default (the home page) when validation fails, and never put `javascript:` URLs into a link.

```python
from urllib.parse import urlsplit

ALLOWED_HOSTS = {"shop.example", "help.shop.example"}

def safe_redirect(target: str, default: str = "/") -> str:
    # browsers treat backslash as slash, so normalise before checking
    url = urlsplit(target.replace("\\", "/"))
    # relative path on this site (no scheme, no host)
    if not url.scheme and not url.netloc and url.path.startswith("/"):
        return target
    # absolute URL only to known hosts over https
    if url.scheme == "https" and url.hostname in ALLOWED_HOSTS:
        return target
    return default

# "/orders?id=3" and "https://shop.example/cart" pass; "//evil.example",
# "/\\evil.example", "https:evil.example", "https://shop.example@evil.example/"
# and "javascript:alert(1)" all fall back to "/"
```

Python's `urlsplit` drops tabs and newlines the way browsers do, which is why `/<tab>/evil.example` is rejected too. For links to outside sites that users supply, an interstitial page ("You're leaving shop.example") is a reasonable alternative to a silent redirect.

## Brute-force protection

Login forms face **brute-force** guessing (many passwords for one account), **password spraying** (one common password across many accounts) and **credential stuffing** (username and password pairs leaked from other sites). Layer the defenses:

- **Rate limit** by account and by IP, with growing delays after failures. Full lockout is a trade-off: it lets an attacker lock real users out on purpose. (Rate limiters are covered in [System design basics](/learn/system-design).)
- **MFA** makes a correct password insufficient on its own.
- **Reject breached passwords** at signup (Have I Been Pwned has a k-anonymity API for this) and favor length over composition rules; current NIST guidance also drops forced periodic changes.
- **Don't reveal which part was wrong.** "Invalid email or password" for both cases, with similar response times, so attackers can't enumerate accounts. The same goes for signup and password-reset pages.
- Add **CAPTCHAs** or bot detection after suspicious activity, not for everyone.

## Interview questions and pitfalls

- *"Does HTTPS stop XSS or CSRF?"* No. It protects data in transit; the malicious script or request travels over it just fine.
- *"Sessions or JWTs?"* Sessions are simpler and revocable; JWTs avoid lookups but need short lifetimes and refresh tokens. Neither is automatically more secure.
- *"You pushed an API key to GitHub. What now?"* Revoke and rotate it first, check logs for use, then clean the history.
- *"Why not SHA-256 for passwords?"* Too fast. Use Argon2id, scrypt or bcrypt with a per-user salt.
- Pitfalls: authorization checked only in the UI, escaping by hand instead of placeholders, stack traces shown to users, JWTs accepted without checking `aud`, and server-side fetches that follow redirects.
