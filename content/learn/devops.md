---
title: Git, deploys & reliability
summary: How git really works, merge vs rebase, undoing changes, CI/CD, rolling, blue/green and canary deploys, safe migrations, containers, observability, SLOs, postmortems and dependency versioning.
related: testing-debugging, system-design, distributed-systems, databases
terms:
  - rebase #merge-vs-rebase
  - git revert #undoing-changes-reset-revert-cherry-pick
  - cherry-pick #undoing-changes-reset-revert-cherry-pick
  - trunk-based development #branching-workflows
  - CI/CD #ci-cd-pipelines
  - blue/green deployment #deployment-strategies
  - canary release #deployment-strategies
  - feature flags #deployment-strategies
  - expand/contract #rollbacks-and-database-migrations
  - observability #observability
  - SLO #slis-slos-and-error-budgets
  - error budget #slis-slos-and-error-budgets
  - blameless postmortem #incidents-and-postmortems
  - semantic versioning #dependencies-semver-and-lockfiles
  - lockfile #dependencies-semver-and-lockfiles
  - .gitignore #ignoring-files-and-untracking-them
  - gitignore #ignoring-files-and-untracking-them
  - git rm --cached #ignoring-files-and-untracking-them
---

## The git model

Most git confusion disappears once you know its three building blocks.

- A **commit** is a snapshot of the whole project (not a diff), plus an author, a message and a pointer to its **parent** commit (two parents for a merge). Its ID is a hash of all of that, so changing anything in a commit, or in any of its ancestors, produces a different ID.
- A **branch** is just a movable pointer to a commit. Committing on a branch moves the pointer forward. A **tag** is a pointer that doesn't move.
- **HEAD** is what you have checked out: normally a pointer to a branch, which points to a commit. Checking out a commit directly gives a **detached HEAD**; new commits there belong to no branch and are easy to lose.

```diagram
{"type":"graph","nodes":[{"id":"C1","x":0,"y":0},{"id":"C2","x":1,"y":0},{"id":"C3","x":2,"y":0},{"id":"C4","x":2,"y":1},{"id":"C5","x":3,"y":1}],"edges":[["C2","C1"],["C3","C2"],["C4","C2"],["C5","C4"]],"directed":true,"highlight":["C5"],"notes":{"C3":"main","C5":"HEAD→feature"},"caption":"Each commit points to its parent. main and feature are pointers to C3 and C5; HEAD points to feature, so the next commit moves feature forward."}
```

Changes move through three areas: the **working tree** (your files), the **staging area** or index (`git add` puts changes here) and the **repository** (`git commit` records the staged snapshot). Remotes are other copies of the repository: `git fetch` downloads their commits and updates **remote-tracking branches** like `origin/main`, and `git pull` is a fetch followed by a merge (or a rebase, if configured).

## Merge vs rebase

Your `feature` branch and `main` have diverged. There are two ways to combine them.

**Merge** (`git merge main` on `feature`, or merging `feature` into `main`) creates a **merge commit** with two parents. History records exactly what happened, nothing is rewritten, and it's always safe. If the target hasn't moved since you branched, git just moves the pointer forward (a **fast-forward**) and no merge commit is needed.

**Rebase** (`git rebase main` on `feature`) replays your commits one by one on top of the new `main`. The result is a straight line, but the replayed commits are *new commits* with new IDs: C4 and C5 become C4' and C5'.

```diagram
{"type":"graph","nodes":[{"id":"C1","x":0,"y":0},{"id":"C2","x":1,"y":0},{"id":"C3","x":2,"y":0},{"id":"C4'","x":3,"y":0},{"id":"C5'","x":4,"y":0}],"edges":[["C2","C1"],["C3","C2"],["C4'","C3"],["C5'","C4'"]],"directed":true,"highlight":["C4'","C5'"],"notes":{"C3":"main","C5'":"feature"},"caption":"After rebasing feature onto main: the same changes as C4 and C5, recreated on top of C3 with new hashes."}
```

| | Merge | Rebase |
|---|---|---|
| History | True record, with merge commits | Linear and tidy |
| Rewrites commits | No | Yes (new hashes) |
| Conflicts | Resolved once, in the merge commit | Possibly once per replayed commit |
| Safe on shared branches | Yes | No |

The golden rule: **never rebase commits that others have already pulled**. Their copies still contain the old commits, and the histories diverge in confusing ways. Rebasing your own unpushed (or unshared) branch is fine, and `git rebase -i` is the standard way to squash and reword commits before review. Many teams use **squash merges** for pull requests, turning a branch into a single commit on `main`.

## Undoing changes: reset, revert, cherry-pick

| Command | What it does | Rewrites history? |
|---|---|---|
| `git restore <file>` | Discard uncommitted changes to a file (`--staged` to unstage) | No |
| `git commit --amend` | Replace the last commit | Yes |
| `git reset --soft <commit>` | Move the branch back; keep the changes staged | Yes |
| `git reset <commit>` (`--mixed`) | Move the branch back; keep the changes in the working tree | Yes |
| `git reset --hard <commit>` | Move the branch back and **discard** the changes | Yes |
| `git revert <commit>` | Add a new commit that undoes that commit | No |
| `git cherry-pick <commit>` | Copy that commit's change onto the current branch as a new commit | No |
| `git reflog` | List where HEAD has been, including "lost" commits | No |

The rule of thumb: **reset** for local work nobody else has; **`git revert`** for anything already pushed, because it adds history instead of rewriting it (reverting a merge commit needs `-m 1` to say which parent is the mainline). **Cherry-pick** is for applying one specific commit elsewhere, typically backporting a fix to a release branch. And `git reflog` is the safety net: after a bad `reset --hard`, the old commits are still there for a while, and the reflog shows their IDs.

If you must rewrite shared history (say, to purge a leaked secret, after revoking it), coordinate with the team and push with `--force-with-lease`, which refuses to overwrite commits you haven't seen.

## Ignoring files and untracking them

A **`.gitignore`** file lists patterns (`.env`, `*.log`, `node_modules/`, `build/`) that git should leave out. The rule that trips people up: **`.gitignore` only affects untracked files**. It stops `git status` from listing new files and stops `git add .` from staging them, but a file that's already committed stays tracked, and changes to it keep showing up, whatever the ignore file says.

So adding `.env` to `.gitignore` after committing it does nothing to the committed copy. To stop tracking it:

```bash
echo '.env' >> .gitignore
# remove from index only; file stays on disk
git rm --cached .env
git add .gitignore
git commit -m "Stop tracking .env"
```

Step by step: `git rm --cached` removes the file from the staging area but leaves your working copy alone (plain `git rm` would delete it from disk too). The commit records the file as deleted from the repository, and from then on, being untracked, it's covered by `.gitignore`. Use `git rm -r --cached build/` for a directory. `git check-ignore -v <path>` shows which pattern ignores a file, which helps when a pattern doesn't do what you expect.

Two pitfalls:

- **It stays in history.** Untracking only affects commits from now on; every earlier commit still contains the file, and `git show <old commit>:.env` prints it. If that file held a secret, assume it has leaked (anything pushed has already been cloned and scanned): **revoke and rotate the secret first**, then, if you must, rewrite history with `git filter-repo` and force-push, coordinating with everyone who has a clone.
- **Teammates lose the file.** When others pull the "Stop tracking" commit, git deletes the file from *their* working trees, because the commit removes it. Warn them, or keep a template such as `.env.example` committed.

An ignored file can still be added deliberately with `git add -f`; for files only you want ignored (editor settings), use `.git/info/exclude` instead of the shared `.gitignore`.

## Branching workflows

**Trunk-based development** keeps one main branch (the trunk) that everyone integrates into at least daily, through short-lived branches that last hours or a day or two. Unfinished features are merged but hidden behind **feature flags**, so `main` is always releasable. It depends on fast, reliable CI, and research on delivery performance (the DORA reports) associates it with teams that ship often and safely.

**Git Flow** adds long-lived `develop`, release and hotfix branches. It suits software shipped as numbered versions with maintenance releases, but is heavy for a continuously deployed service, and long-lived branches mean painful merges.

Either way, changes usually land through **pull requests** (merge requests): a branch, a review and passing CI checks before merging. **Branch protection** rules enforce this on `main`: required reviews and status checks, no force pushes. Keep PRs small, since they review faster and break less (see [Testing & debugging](/learn/testing-debugging)).

## CI/CD pipelines

**Continuous integration** (CI) builds and tests every push automatically, so integration problems show up within minutes and `main` stays green. **Continuous delivery** keeps every passing change deployable, with release a button press; **continuous deployment** goes one step further and ships every passing change to production automatically. Together they're **CI/CD**.

```diagram
{"type":"flow","nodes":[{"id":"push","label":"Push / PR","kind":"client","col":0},{"id":"build","label":"Build + unit tests","sub":"fail fast","kind":"service","col":1},{"id":"art","label":"Artifact","sub":"image tagged with commit","kind":"db","col":2,"highlight":true},{"id":"stage","label":"Staging","sub":"integration + e2e tests","kind":"service","col":3},{"id":"canary","label":"Canary","sub":"small % of production","kind":"service","col":4},{"id":"prod","label":"Production","sub":"full rollout","kind":"service","col":5}],"edges":[{"from":"push","to":"build"},{"from":"build","to":"art"},{"from":"art","to":"stage","label":"deploy"},{"from":"stage","to":"canary","label":"promote"},{"from":"canary","to":"prod","label":"metrics OK"}],"caption":"Build once, then promote the same artifact through each environment; configuration differs per environment, the binary doesn't."}
```

Principles that make pipelines trustworthy:

- **Build once, promote the artifact.** The image tested in staging is byte-for-byte what reaches production, tagged with the commit it came from.
- **Fast checks first**: lint, compile and unit tests in a few minutes; slower suites later or in parallel.
- **Pipeline as code**, versioned with the application.
- **Secrets come from the CI system's secret store**, ideally as short-lived cloud credentials (OIDC federation) rather than long-lived keys.
- **A broken `main` is everyone's top priority**: revert first, debug second.

```text
# .github/workflows/ci.yml: run the tests on every push to main and every pull request
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"
      - run: pip install -r requirements.txt
      - run: pytest
```

## Deployment strategies

**Deploying** (putting new code on servers) and **releasing** (letting users see a change) don't have to happen together, and separating them is what makes deploys safe.

| Strategy | How it works | Rollback | Trade-offs |
|---|---|---|---|
| Recreate | Stop the old version, start the new | Redeploy the old one | Downtime; fine for internal tools |
| Rolling | Replace instances a few at a time | Roll back the same way | Old and new versions serve traffic together, so they must be compatible |
| Blue/green | Bring up the full new version (green) beside the old (blue), then switch all traffic | Switch back instantly | Double capacity during the deploy; both share the database |
| Canary | Send a small share of traffic to the new version, compare metrics, then widen | Route the canary's traffic back | Needs good metrics and enough traffic to judge |
| Feature flags | Ship code turned off; enable at runtime per user, group or percentage | Turn the flag off | Old flags pile up; both code paths need tests |

A **blue/green deployment** gives instant cutover and instant rollback. A **canary release** limits the blast radius: if the new version's error rate or latency is worse than the old one's, only a few percent of users saw it.

```diagram
{"type":"flow","nodes":[{"id":"users","label":"Users","kind":"client","col":0,"row":0.5},{"id":"lb","label":"Load balancer","kind":"lb","col":1,"row":0.5},{"id":"stable","label":"v41 (stable)","sub":"95% of traffic","kind":"service","col":2,"row":0},{"id":"canary","label":"v42 (canary)","sub":"5% of traffic","kind":"service","col":2,"row":1,"highlight":true},{"id":"metrics","label":"Metrics","sub":"errors, latency per version","kind":"box","col":3,"row":0.5}],"edges":[{"from":"users","to":"lb"},{"from":"lb","to":"stable","label":"95%"},{"from":"lb","to":"canary","label":"5%"},{"from":"stable","to":"metrics","dashed":true},{"from":"canary","to":"metrics","dashed":true}],"caption":"If the canary's error rate and latency match the stable version's, widen to 25%, 50%, 100%; if not, send its traffic back."}
```

**Feature flags** go further: the code is already everywhere, and a flag decides who sees it. That enables gradual rollouts, quick kill switches and testing in production with internal users first. Delete flags once a feature is fully launched, or they become a maze of untested combinations.

## Rollbacks and database migrations

When a deploy goes wrong, **mitigate first**: roll back to the previous artifact or turn the flag off, then investigate. Rolling back code is easy when artifacts are immutable and versioned. Rolling back *data* isn't, which is why schema changes need the most care.

During a rolling deploy, old and new code run at the same time against the same database, and a rollback runs old code against the new schema. So every migration must work with **both** versions of the code. Renaming a column in one step (`ALTER TABLE users RENAME name TO full_name`) breaks whichever version expects the other name.

The **expand/contract** pattern (also called parallel change) splits a breaking change into compatible steps, each deployed and verified separately:

| Step | Schema | Application |
|---|---|---|
| 1. Expand | Add `full_name` (nullable) | Write both `name` and `full_name`; read `name` |
| 2. Backfill | Copy existing `name` values into `full_name` in batches | No change |
| 3. Switch reads | No change | Read `full_name`; still write both |
| 4. Stop old writes | No change | Write only `full_name` |
| 5. Contract | Drop `name` | No change |

At every step, the previous version of the application still works, so any single deploy can be rolled back. Related habits: run migrations as a separate, versioned step (Flyway, Liquibase, Alembic), avoid operations that lock big tables for a long time (in PostgreSQL, `CREATE INDEX CONCURRENTLY`), and make destructive steps the last ones. More on schemas and indexes in [Databases & indexing](/learn/databases).

## Containers and orchestration

A **container** is an ordinary process isolated by the kernel: **namespaces** control what it can see (filesystem, process IDs, network) and **cgroups** limit what it can use (CPU, memory). Containers share the host's kernel, so they're far lighter than **virtual machines**, which each run a full guest OS (heavier, but stronger isolation).

A container **image** is an immutable, layered filesystem plus start-up settings, built from a `Dockerfile`. The same image runs on a laptop, in CI and in production, which removes most "works on my machine" problems.

An **orchestrator**, almost always Kubernetes, runs containers across many machines. You declare the desired state ("5 replicas of image `app:3f9c2e1`, 512 MiB each") and controllers keep reality matching it: scheduling containers (in **pods**) onto machines, restarting crashed ones, doing rolling updates, giving each service a stable address and load balancing across replicas, and scaling on load. Two health checks matter:

- A failing **readiness probe** takes the pod out of load balancing (it gets no traffic) but leaves it running.
- A failing **liveness probe** makes Kubernetes restart the container.

```bash
docker build -t app:3f9c2e1 .               # tag images with the commit, not just "latest"
kubectl rollout status deployment/app       # watch a rolling update
kubectl rollout undo deployment/app         # roll back to the previous revision
```

Apps that run well this way are stateless (state lives in databases and caches), read configuration from the environment, log to stdout, and shut down gracefully on `SIGTERM`.

## Observability

**Observability** is how well you can understand a system from the telemetry it emits. Monitoring tells you *that* something is wrong; observability lets you ask *why*, including questions you didn't anticipate. Three kinds of telemetry:

| Signal | What it is | Good for | Watch out for |
|---|---|---|---|
| Logs | Timestamped records of events | Details of one request or error | Volume and cost; secrets and personal data in logs |
| Metrics | Numbers aggregated over time: counters, gauges, histograms | Dashboards, alerts, trends | High-cardinality labels (one series per user ID) |
| Traces | One request's path across services, as a tree of timed spans | Finding which hop is slow or failing | Context must be propagated on every call |

- **Logs** should be **structured** (JSON with fields such as `level`, `request_id`, `user_id`), so they can be searched and aggregated, and carry a trace or request ID that ties them together.
- **Metrics**: for each service, track the **RED** signals (rate, errors, duration); for each resource, **USE** (utilisation, saturation, errors). Record latency as a histogram and look at **percentiles**: an average of 50 ms can hide a p99 of 2 seconds, and p99 is what your busiest users feel. Percentiles can't be averaged across servers; histograms can be merged.
- **Traces** follow one request through every service it touches. Each service passes the trace context on in a header (W3C `traceparent`); **OpenTelemetry** is the standard set of libraries for emitting all three signals.

### SLIs, SLOs and error budgets

- A **service level indicator** (SLI) is a measurement of what users experience: "the share of requests that succeed in under 300 ms".
- A **service level objective** (**SLO**) is the target for it over a window: "99.9% over 30 days".
- A **service level agreement** (SLA) is a contract with consequences (credits, refunds), set looser than the internal SLO.

The **error budget** is what the SLO leaves over: with 99.9%, 0.1% of requests may fail, roughly 43 minutes of full downtime in 30 days. Each extra nine cuts the budget tenfold:

| SLO | Allowed downtime per 30 days |
|---|---|
| 99% | 7.2 hours |
| 99.9% | 43.2 minutes |
| 99.99% | 4.3 minutes |
| 99.999% | 26 seconds |

The budget turns reliability into a decision rule: while budget remains, ship features and take risks; when it's spent, slow down and invest in reliability. 100% is the wrong target: users can't tell 99.999% from 100% through their own networks, and it would forbid all change. **Alert on symptoms users feel** (the SLO burning too fast), not on every CPU spike, so a page always means real action.

## Incidents and postmortems

When production breaks, an organised response beats heroics:

1. **Detect** (ideally from alerts, not from customers) and **declare** an incident.
2. **Assign roles**: an **incident commander** coordinates and makes decisions, others investigate, and one person handles communication.
3. **Mitigate first**: roll back, turn off the flag, shift traffic, add capacity. Understanding the root cause can wait until users are no longer affected.
4. **Communicate** regular status updates, internally and on a status page.
5. **Resolve**, then write it up.

A **blameless postmortem** records the timeline, the impact, the root cause and contributing factors, what went well, and action items with owners and dates. Blameless means assuming people acted reasonably with what they knew, and asking what about the *system* allowed the mistake: why could one command delete production data, why didn't an alert fire, why did the rollback take 40 minutes? People who fear blame hide information, and a system that relies on nobody making mistakes will fail again.

## Dependencies: semver and lockfiles

**Semantic versioning** (semver) encodes compatibility in `MAJOR.MINOR.PATCH`:

- **MAJOR** for breaking changes (`2.0.0`),
- **MINOR** for backward-compatible features (`1.5.0`),
- **PATCH** for backward-compatible bug fixes (`1.4.3`).

Versions below `1.0.0` promise nothing: any release may break things. Package managers let you accept ranges of versions:

```text
^1.2.3   ->  >=1.2.3 <2.0.0    (npm default: any compatible minor or patch)
~1.2.3   ->  >=1.2.3 <1.3.0    (patch updates only)
^0.2.3   ->  >=0.2.3 <0.3.0    (below 1.0, the minor version is treated as breaking)
~=1.4.2  ->  >=1.4.2, ==1.4.*  (Python's "compatible release")
```

Ranges alone make builds non-reproducible: the same `package.json` can install different versions next week. A **lockfile** (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `uv.lock`, `Cargo.lock`, `go.sum`) records the exact version, and usually a checksum, of every package in the tree, including transitive dependencies. **Commit lockfiles for applications**, and install from them in CI (`npm ci` fails if the lockfile and manifest disagree). Libraries publish ranges, so the applications using them can share one copy of each dependency.

Dependencies are also an attack surface: typosquatted package names, hijacked maintainer accounts, malicious install scripts, and long-game attacks like the 2024 xz-utils backdoor. Reasonable defences: fewer dependencies, lockfiles with integrity hashes, automated update PRs (Dependabot, Renovate) so updates arrive small and tested, vulnerability scanning (`npm audit`, `pip-audit`, OSV-Scanner), and pinning CI actions to commit hashes.

## Interview questions and pitfalls

- *"A bad commit is on `main` and teammates have pulled it. How do you undo it?"* `git revert`, not `reset` and force-push.
- *"Merge or rebase?"* Rebase private branches for a clean history; merge (or squash-merge) shared ones; never rebase what others have pulled.
- *"Blue/green vs canary?"* All traffic switched at once with instant switch-back, versus a small, growing share judged by metrics.
- *"How do you rename a column with zero downtime?"* Expand/contract: add, dual-write, backfill, switch reads, stop old writes, drop.
- *"Readiness vs liveness probe?"* Out of the load balancer versus restarted.
- *"How much downtime does 99.9% allow?"* About 43 minutes per 30 days.
- *"I added a committed file to `.gitignore` but it still shows changes."* Ignore rules only cover untracked files: `git rm --cached` it (and rotate it if it was a secret, since history keeps it).
- Pitfalls: deploying `latest` instead of a versioned image, migrations that break the previous release, alerts on causes instead of symptoms, flags that never get removed, and not committing the lockfile.
