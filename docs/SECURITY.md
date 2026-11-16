# Security

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Use GitHub's private reporting instead: the
repository's **Security** tab → **Report a vulnerability**. Include the steps to reproduce and the impact you expect.
You'll get a reply as soon as possible, and credit in the fix if you want it.

## How the site is built to be safe

| Area | Risk | What the code does |
|---|---|---|
| **Running player code** | Code execution and resource abuse, the classic risks of an online judge. | Nothing runs on a server. Code compiles and runs in the visitor's own browser: Web Workers for Python and C++, a same-origin iframe for Java. Workers have no DOM access. Timeouts kill the runtime, and output is capped at 2 MB. Results carry a random per-run nonce, so printed text can't fake a passing result. |
| **XSS via content** | Problem text, explanations and Learn pages are Markdown. | Rendered with `react-markdown` **without raw HTML** (no `rehype-raw`, no `dangerouslySetInnerHTML`). Unsafe URLs are stripped, images are dropped, and links open with `noopener noreferrer`. Illustrations must pass an SVG allow-list (`src/content/svg.ts`), and they render through `<img>`, so they can't run script. |
| **CSP and headers** | Injected scripts, clickjacking, MIME sniffing. | `public/_headers` sets a strict CSP: scripts only from self and the pinned CDNs, plus `'wasm-unsafe-eval'`; no `unsafe-eval`; `object-src 'none'`; `frame-ancestors 'self'`. It also sets `nosniff`, `Referrer-Policy`, `Permissions-Policy` and COOP. CheerpJ's JIT needs `'unsafe-eval'`, so only `/java-runner.html` gets it. Enable HTTPS and HSTS on your host. |
| **Code in CI** | Pull requests can change reference solutions and test generators, and CI executes them. | CI runs with `contents: read`, no secrets and `persist-credentials: false`, and child processes get a minimal environment. Don't switch the workflow to `pull_request_target` or give it secrets. |
| **Supply chain** | A compromised npm package or GitHub Action. | Lockfile plus `npm ci`; Actions pinned to commit SHAs; Dependabot for npm and Actions. The browser runtimes load exact pinned versions (`src/runner/types.ts`). |
| **Client-side answers** | Quiz answers and hidden tests ship to the browser. | Fine for self-practice. **Never build leaderboards on client-reported scores**; that needs server-side judging. |
| **Privacy** | — | No accounts, cookies or trackers in the app; progress stays in `localStorage`. The runtime CDNs (jsDelivr, CheerpJ) see visitors' IP addresses like any CDN. Optional Drive sync talks only to Google, from the browser, with the `drive.file` scope. |

## If you add server features

- **Auth:** don't store passwords. Use OAuth through a maintained library or a managed provider.
- **Sessions:** `HttpOnly; Secure; SameSite=Lax` cookies, short-lived and rotated. Protect state-changing routes
  against CSRF and check `Origin`.
- **Abuse:** a CAPTCHA on sign-up, rate limits, request bodies validated with zod, and payload size caps (saved code!).
- **Data:** collect the minimum. Provide export and account deletion, and publish a privacy policy that matches.
- **Authorisation:** scope every query by the session's user id, never by an id taken from the request.
- **Server-side code execution** (if you ever add it):
  - an isolated sandbox (gVisor or a microVM) with no network
  - CPU, memory, process and output limits, plus a wall-clock kill
  - per-user and per-IP quotas and a queue
  - never on the host that holds the database or secrets
