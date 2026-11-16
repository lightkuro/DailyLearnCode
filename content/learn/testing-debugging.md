---
title: Testing & debugging
summary: The test pyramid, good unit tests, mocks versus fakes, TDD, property-based testing, flaky tests, what coverage means, a systematic debugging process with git bisect, and code review.
related: oop-design, devops, language-gotchas, concurrency
terms:
  - test pyramid #the-test-pyramid
  - unit test #the-test-pyramid
  - integration test #the-test-pyramid
  - end-to-end test #the-test-pyramid
  - test doubles #test-doubles-mocks-stubs-and-fakes
  - TDD #test-driven-development
  - test-driven development #test-driven-development
  - property-based testing #property-based-testing
  - flaky test #flaky-tests
  - flaky tests #flaky-tests
  - code coverage #what-coverage-tells-you
  - mutation testing #what-coverage-tells-you
  - git bisect #bisecting-with-git
  - regression test #regression-tests
  - code review #code-review
  - boundary value analysis #boundary-value-analysis
  - equivalence partitioning #boundary-value-analysis
  - contract testing #consumer-driven-contract-tests
  - consumer-driven contract tests #consumer-driven-contract-tests
  - snapshot testing #snapshot-and-golden-tests
  - golden file #snapshot-and-golden-tests
---

## Why automated tests

Automated tests are code that runs your code and checks the result. They earn their keep in three ways:

- **They catch regressions**: a change that breaks something that used to work fails a test in minutes instead of reaching users.
- **They make change safe.** Without tests, nobody dares refactor; with good ones, you restructure freely and let the suite tell you if behaviour changed.
- **They document behaviour.** A well-named test (`expired_coupon_is_rejected`) is an example of how the code is meant to be used, and it can't go out of date without failing.

Tests can show the presence of bugs, never their absence. The goal is confidence per minute spent, not a perfect proof.

## The test pyramid

The **test pyramid** describes a healthy mix: many small, fast tests at the bottom and a few broad, slow ones at the top.

```diagram
{"type":"grid","cells":[["","","E2E","",""],["","integ.","integ.","integ.",""],["unit","unit","unit","unit","unit"]],"rowLabels":["few","some","many"],"highlight":[[2,0],[2,1],[2,2],[2,3],[2,4]],"caption":"Many fast unit tests at the base, fewer integration tests, and a handful of end-to-end tests on top."}
```

| | Unit | Integration | End-to-end |
|---|---|---|---|
| Scope | One function or class, dependencies replaced | Several real components: code plus a database, a queue, an HTTP layer | The whole deployed system, driven like a user (browser or public API) |
| Speed | Milliseconds | Seconds | Seconds to minutes |
| How many | Thousands | Hundreds | Dozens |
| A failure tells you | Exactly which unit broke | Which boundary broke | That *something* is broken somewhere |
| Flakiness | Very low | Moderate | Highest (timing, environments, networks) |

- A **unit test** checks one small piece in isolation, so it's fast and pinpoints the failure.
- An **integration test** checks that pieces work together: your SQL against a real database (often in a container), your HTTP handler with real serialisation.
- An **end-to-end test** exercises a real user journey through the deployed system: sign up, add to cart, pay.

The inverted version, the **ice-cream cone** (mostly manual and end-to-end tests), gives slow feedback and failures nobody can locate. Some teams prefer a "testing trophy" with more integration tests, since those catch the bugs that live at boundaries; the shared lesson is to push each check to the cheapest level that can catch it.

## What makes a good unit test

Good unit tests are **FIRST**: **F**ast, **I**ndependent (no shared state or order dependence), **R**epeatable (same result on every machine, every run), **S**elf-validating (pass or fail, no reading logs) and **T**imely (written with the code, not months later).

Structure each one as **arrange, act, assert**: set up inputs, call the code once, check the outcome. Test behaviour through the public interface, not private details, so a refactor that keeps behaviour doesn't break tests. Name tests after the behaviour they check, and cover the edges: empty input, one element, boundaries (0, 1, max), duplicates, negative numbers, very large inputs, unusual text.

The biggest enemy of repeatability is hidden input: the current time, randomness, the network, the file system. Make those **dependencies** you pass in, so tests can control them. Here a cache takes its clock as a parameter, and the test moves time forward instead of sleeping:

```python
import time

class TtlCache:
    def __init__(self, ttl_seconds, clock=time.monotonic):    # the clock is a dependency
        self.ttl, self.clock, self.data = ttl_seconds, clock, {}

    def put(self, key, value):
        self.data[key] = (value, self.clock() + self.ttl)

    def get(self, key):
        value, expires = self.data.get(key, (None, 0))
        return value if self.clock() < expires else None

def test_entry_expires_after_ttl():                           # pytest finds test_* functions
    now = [0.0]
    cache = TtlCache(ttl_seconds=60, clock=lambda: now[0])   # arrange: a fake clock
    cache.put("k", "v")
    now[0] = 59                                               # act: no sleeping
    assert cache.get("k") == "v"                              # assert
    now[0] = 60
    assert cache.get("k") is None
```

```java
class TtlCache {
    private record Entry(String value, long expiresAt) {}
    private final Map<String, Entry> data = new HashMap<>();
    private final long ttlMillis;
    private final LongSupplier clock;                     // the clock is a dependency

    TtlCache(long ttlMillis, LongSupplier clock) { this.ttlMillis = ttlMillis; this.clock = clock; }

    void put(String key, String value) { data.put(key, new Entry(value, clock.getAsLong() + ttlMillis)); }

    String get(String key) {
        Entry e = data.get(key);
        return e != null && clock.getAsLong() < e.expiresAt() ? e.value() : null;
    }
}

class TtlCacheTest {                                      // JUnit 5
    @Test
    void entryExpiresAfterTtl() {
        long[] now = {0};
        TtlCache cache = new TtlCache(60_000, () -> now[0]);  // arrange: a fake clock
        cache.put("k", "v");
        now[0] = 59_000;                                      // act: no sleeping
        assertEquals("v", cache.get("k"));                    // assert
        now[0] = 60_000;
        assertNull(cache.get("k"));
    }
}
```

```cpp
class TtlCache {
    long long ttlMs;
    function<long long()> clock;                              // the clock is a dependency
    unordered_map<string, pair<string, long long>> data;      // value, expiresAt
public:
    TtlCache(long long ttl, function<long long()> c) : ttlMs(ttl), clock(move(c)) {}
    void put(const string& k, const string& v) { data[k] = {v, clock() + ttlMs}; }
    optional<string> get(const string& k) {
        auto it = data.find(k);
        if (it == data.end() || clock() >= it->second.second) return nullopt;
        return it->second.first;
    }
};

void testEntryExpiresAfterTtl() {                             // GoogleTest or Catch2 in a real project
    long long now = 0;
    TtlCache cache(60000, [&] { return now; });               // arrange: a fake clock
    cache.put("k", "v");
    now = 59000;                                              // act: no sleeping
    assert(cache.get("k") == "v");                            // assert
    now = 60000;
    assert(!cache.get("k"));
}
```

The test runs in microseconds and checks the exact boundary (59 seconds alive, 60 expired), which a `sleep(60)` test could never do reliably. Passing collaborators in like this is dependency injection (see [OOP & design patterns](/learn/oop-design)).

### Boundary value analysis

You can't test every input, so pick the ones most likely to break. **Equivalence partitioning** splits the inputs into classes the code should treat the same way (valid weights 1 to 20, valid weights 21 to 50, too small, too big) and tests one value from each. **Boundary value analysis** adds the values at and next to each edge, because that's where off-by-one bugs live: `<` written instead of `<=`, a loop that stops one early, a range that excludes its end.

How to apply it:

1. List each input's ranges and the points where behaviour changes.
2. For each boundary, test the value on it and the value just past it on the other side (some teams also test just inside: `min`, `min + 1`, `max − 1`, `max`).
3. Add the special values for the type: 0, empty string or list, one element, the maximum size, negative numbers, `null`.

For a fee of 5 for 1 to 20 kg, 12 for 21 to 50 kg, and an error otherwise, that's six tests instead of fifty:

```python
import pytest

def shipping_fee(weight_kg: int) -> int:
    # 1-20 kg standard, 21-50 kg heavy, anything else rejected
    if weight_kg < 1 or weight_kg > 50:
        raise ValueError("weight out of range")
    return 5 if weight_kg <= 20 else 12

# both sides of each edge where fee changes
@pytest.mark.parametrize("weight, fee", [(1, 5), (20, 5), (21, 12), (50, 12)])
def test_fee_at_boundaries(weight, fee):
    assert shipping_fee(weight) == fee

# just outside valid range
@pytest.mark.parametrize("weight", [0, 51])
def test_rejects_just_outside(weight):
    with pytest.raises(ValueError):
        shipping_fee(weight)
```

It shows up in interviews as "how would you test this function?": name the partitions, then the edges. The common pitfall is testing only comfortable middle values (10 kg, 30 kg), which pass even if `<= 20` were `< 20`. The same thinking finds the edge cases in algorithm problems: empty input, one element, all equal, the largest `n`.

## Test doubles: mocks, stubs and fakes

A **test double** stands in for a real dependency in a test, the way a stunt double stands in for an actor. The names are often used loosely, but they mean different things:

| Double | What it does | Example |
|---|---|---|
| Dummy | Fills a parameter; never used | A `null` logger |
| Stub | Returns canned answers | A price service that always returns 100 |
| Spy | A stub that also records how it was called | Counts emails "sent" |
| Mock | Pre-programmed with expected calls and fails the test if they don't happen | "Expect `charge(5000)` exactly once" |
| Fake | A working, simplified implementation | An in-memory repository, a fake clock |

Stubs and fakes support **state verification** (check the result); mocks do **behaviour verification** (check the calls). Mocking libraries (`unittest.mock`, Mockito, GoogleMock) make all of them easy to create, which makes them easy to overuse.

The main risk of mocking too much: tests end up asserting *how* the code works rather than *what* it does. They break on harmless refactors and can pass while the real integration is broken, because the mock behaves the way you assumed the dependency does, not the way it actually does. Guidelines:

- Mock at **boundaries you own**: wrap a third-party SDK in your own small interface (an adapter), mock that in unit tests, and cover the adapter with a few integration tests against the real thing.
- Prefer **fakes** for rich dependencies like storage: an in-memory repository behaves like a real one across many tests.
- Don't mock value objects or simple data structures; use the real ones.

### Consumer-driven contract tests

Between services, the mocking risk gets worse. The checkout service's tests stub the orders API, the orders team renames `status` to `state`, every test on both sides still passes, and production breaks. End-to-end tests across all services would catch it, but they're slow, flaky and need everything deployed together.

A **contract test** checks the agreement between two services, each side on its own. In **consumer-driven contract tests** (the usual tool is Pact), the consumer writes down what it needs:

1. The **consumer's** tests run against a mock provider and record each interaction they rely on: "given order 42 exists, `GET /orders/42` returns 200 with a numeric `id` and a string `status`". The recording is the **contract** (a JSON file), published to a shared broker.
2. The **provider's** CI downloads the contracts of all its consumers and replays each request against the real provider code, setting up the named **provider state** ("order 42 exists") first. If a response no longer satisfies a contract, the provider's build fails, before deploy.
3. Before either side deploys, a check (Pact's `can-i-deploy`) confirms that the versions in production have verified contracts with each other.

```json
{
  "consumer": {"name": "checkout-web"},
  "provider": {"name": "orders-api"},
  "interactions": [{
    "description": "a request for order 42",
    "providerStates": [{"name": "order 42 exists"}],
    "request": {"method": "GET", "path": "/orders/42"},
    "response": {"status": 200, "body": {"id": 42, "status": "paid"}}
  }]
}
```

(A real Pact file also holds metadata and matching rules, such as "any integer" instead of exactly 42.)

It shows up in interviews about microservices: "how do you stop one team's change breaking another team's service without a huge end-to-end suite?" The provider learns exactly which fields are in use, so it can remove one nobody reads with confidence. Pitfalls: contracts check the *shape* of the conversation, not business rules, so they don't replace the provider's own tests; consumers should list only the fields they actually use, or every addition looks like a breaking change; and they only help if provider verification really gates the provider's deploys. An OpenAPI schema check is the provider-driven alternative: lighter, but it can't tell which parts consumers rely on.

## Test-driven development

**Test-driven development** (**TDD**) writes the test *before* the code, in a short loop:

```diagram
{"type":"graph","nodes":["red","green","refactor"],"edges":[["red","green"],["green","refactor"],["refactor","red"]],"directed":true,"notes":{"red":"failing test","green":"make it pass","refactor":"clean up"},"caption":"Red: write a small test that fails. Green: write just enough code to pass it. Refactor: clean up with the tests as a safety net. Repeat."}
```

Watching the test fail first proves it can fail; a test that passes before the feature exists is testing nothing. TDD's benefits are mostly about design: code written to be tested first tends to have small units and explicit dependencies, and every feature arrives with tests. Its critics point out that it's awkward for exploratory work where you don't yet know the shape of the solution, and that it can produce many tests tied to implementation details. Even teams that don't practise TDD use its bug-fixing form: write a failing test that reproduces the bug, then fix it.

## Property-based testing

Example-based tests check the inputs you thought of. **Property-based testing** states a rule that must hold for *all* inputs, then lets a library generate hundreds of random cases. When one fails, the library **shrinks** it to a minimal counterexample (for example, the empty list, or `[0, -1]`).

Useful kinds of property:

- **Oracle**: agrees with a slow but obviously correct implementation.
- **Round trip**: `decode(encode(x)) == x`, `parse(format(x)) == x`.
- **Invariants**: a sort's output is ordered and is a permutation of its input.
- **Idempotence**: `normalise(normalise(x)) == normalise(x)`.

You can get much of the benefit with a seeded random loop and an oracle:

```python
import random

def binary_search(a, target):            # code under test: index of target in sorted a, or -1
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

def test_binary_search_agrees_with_linear_scan():
    rng = random.Random(42)                          # fixed seed: a failure is reproducible
    for _ in range(10_000):
        a = sorted(rng.randint(-20, 20) for _ in range(rng.randint(0, 12)))
        target = rng.randint(-25, 25)
        i = binary_search(a, target)
        if target in a:                              # the slow, obviously correct oracle
            assert i >= 0 and a[i] == target, (a, target, i)
        else:
            assert i == -1, (a, target, i)
```

```java
static void binarySearchAgreesWithLinearScan() {
    Random rng = new Random(42);                       // fixed seed: a failure is reproducible
    for (int run = 0; run < 10_000; run++) {
        int[] a = rng.ints(rng.nextInt(13), -20, 21).sorted().toArray();
        int target = rng.nextInt(-25, 26);
        int i = binarySearch(a, target);
        boolean present = Arrays.stream(a).anyMatch(x -> x == target);   // the oracle
        boolean ok = present ? i >= 0 && a[i] == target : i == -1;
        if (!ok)
            throw new AssertionError(Arrays.toString(a) + " target=" + target + " got " + i);
    }
}
```

```cpp
void binarySearchAgreesWithLinearScan() {
    mt19937 rng(42);                                       // fixed seed: a failure is reproducible
    auto between = [&](int lo, int hi) { return uniform_int_distribution<int>(lo, hi)(rng); };
    for (int run = 0; run < 10000; run++) {
        vector<int> a(between(0, 12));
        for (int& x : a) x = between(-20, 20);
        sort(a.begin(), a.end());
        int target = between(-25, 25);
        int i = binarySearch(a, target);
        bool present = find(a.begin(), a.end(), target) != a.end();   // the oracle
        assert(present ? i >= 0 && a[i] == target : i == -1);
    }
}
```

Small arrays and a narrow value range make duplicates, empty arrays and edge targets common, which is where bugs live. Note the `i >= 0` check: in Python, `a[-1]` is a valid index, so a buggy `-1` could otherwise pass. Real libraries (Hypothesis for Python, jqwik for Java, RapidCheck for C++) add smarter generators and shrinking. **Fuzzing** (libFuzzer, AFL++) is the same idea aimed at crashes, guided by which code paths each input reaches.

## Snapshot and golden tests

A **snapshot test** (or **golden file** test) doesn't spell out the expected output by hand. The first run saves the actual output to a file; every later run compares against that file and fails on any difference. It suits output that's large, exact and tedious to write: rendered HTML or React components (Jest's `toMatchSnapshot`), compiler or formatter output, generated SQL, API responses, reports.

```python
import os, pathlib

GOLDEN = pathlib.Path(__file__).parent / "golden" / "invoice.txt"

def test_invoice_matches_golden():
    order = {"items": [{"name": "lamp", "qty": 2, "price": 19.5},
                       {"name": "bulb", "qty": 4, "price": 2.25}]}
    actual = render_invoice(order)
    # UPDATE_GOLDEN=1 rewrites file; review its diff before committing
    if os.environ.get("UPDATE_GOLDEN"):
        GOLDEN.parent.mkdir(exist_ok=True)
        GOLDEN.write_text(actual)
    assert actual == GOLDEN.read_text()
```

Step by step: run once with the update flag to create the file, read it and check it's right, commit it next to the test. From then on a change in output fails the test with a diff; if the change is intended, rerun with the flag and commit the new file. Most tools work this way: `jest -u`, Go tests with an `-update` flag, syrupy's `--snapshot-update` for pytest, Rust's `insta`.

The big risk is **blindly updating**. When forty snapshots fail after a change, it's tempting to run `-u` and move on, and if one of those diffs was a real regression, it has just become the expected output. The test then *protects* the bug. Habits that keep snapshots honest:

- **Review snapshot diffs like code** in every pull request; a reviewer who skips `.snap` files has approved whatever is in them.
- **Keep snapshots small and focused**: snapshot one component or one field, not a whole page, so a diff is readable and the reason it changed is obvious. Inline snapshots (stored in the test file) help.
- **Make output deterministic**: fixed clocks, seeds and IDs, sorted keys; otherwise snapshots churn and people learn to update without looking.
- **Don't write snapshots in CI**: Jest's `--ci` flag fails on a missing snapshot instead of silently creating it.
- Prefer a few explicit assertions for the behaviour that matters (the total is 48.00) alongside, or instead of, a snapshot of everything.

## Flaky tests

A **flaky test** passes and fails on the same code. Flaky tests are corrosive: people learn to hit "retry", and then real failures get retried away too.

| Cause | Typical symptom | Fix |
|---|---|---|
| Timing and `sleep` | Passes locally, fails on a busy CI machine | Wait for a condition with a timeout, or use a fake clock |
| Shared state, test order | Fails only when run with other tests | Fresh fixtures per test; run in random order to expose it |
| Real time and dates | Fails at midnight, at month end, on DST days, in another time zone | Inject the clock; fix the time zone in tests |
| Unseeded randomness | Fails once in 200 runs | Seed the generator and log the seed |
| Network and external services | Fails when a sandbox API is slow | Fakes, or hermetic containers for integration tests |
| Unordered results | A set or map iterates in a different order | Sort before comparing, or compare as sets |
| A real race in the code | Fails under load, rarely | Fix the code: this flake is a genuine bug |

Treat flakiness as a bug with an owner: quarantine the test so it stops blocking others, track it, and fix or delete it. Automatic retries are at most a temporary bandage, and the last row of the table is why.

## What coverage tells you

**Code coverage** measures which code ran during the tests: **line coverage** counts executed lines, **branch coverage** checks that each `if` went both ways. It's useful for one thing: finding code that *no* test exercises.

What it doesn't tell you is whether the tests check anything. A test that calls every function and asserts nothing gets 100% coverage. Coverage targets also invite low-value tests written to move a number, and the last few percent (defensive error branches, generated code) are often the least valuable. Treat a drop in coverage on new code as a prompt to look, not a failure in itself.

**Mutation testing** measures test *strength* instead: a tool makes small changes to your code (flipping `<` to `<=`, deleting a line, replacing a return value) and checks that some test fails for each "mutant". Surviving mutants show behaviour nobody checks. Tools include PIT for Java, mutmut for Python and Stryker for JavaScript and .NET.

For example, `is_adult(age)` returns `age >= 18`, and the tests check ages 30 and 5. They give 100% coverage, yet the mutant `age > 18` passes them too, so it **survives**: no test pins down the boundary. Adding a test for 18 **kills** it (that's [boundary value analysis](/learn/testing-debugging#boundary-value-analysis) again). The **mutation score** is killed mutants divided by all mutants. Two costs to know: the test suite runs once per mutant, so tools test only changed code or sample mutants in CI; and some mutants are **equivalent** (they don't change behaviour at all, like swapping the order of two independent assignments), so 100% is rarely reachable and survivors need a human look.

## A debugging process

Debugging goes fastest as a disciplined search, not random changes:

```diagram
{"type":"flow","nodes":[{"id":"rep","label":"Reproduce","sub":"reliably, minimally","kind":"box","col":0},{"id":"read","label":"Read the evidence","sub":"error, stack trace, logs","kind":"box","col":1},{"id":"hyp","label":"Form a hypothesis","kind":"box","col":2},{"id":"iso","label":"Test it / isolate","sub":"bisect input, code, history","kind":"box","col":3,"highlight":true},{"id":"fix","label":"Fix the root cause","kind":"box","col":4},{"id":"reg","label":"Add a regression test","kind":"box","col":5}],"edges":[{"from":"rep","to":"read"},{"from":"read","to":"hyp"},{"from":"hyp","to":"iso"},{"from":"iso","to":"hyp","dashed":true,"label":"wrong: new idea"},{"from":"iso","to":"fix"},{"from":"fix","to":"reg"}]}
```

1. **Reproduce it reliably.** Same input, same version, same configuration. Then shrink the reproduction: the smaller the failing case, the fewer places the bug can hide. If you can't reproduce it, add logging so the next occurrence tells you more.
2. **Read the evidence.** The whole error and stack trace, and the *first* error in the logs, not the last one (later errors are often consequences).
3. **Form a hypothesis** that explains all the symptoms, and **check your assumptions** by looking at actual values rather than reasoning about what they "must" be.
4. **Isolate** by halving the search space: shrink the input until it stops failing, disable half the code path, compare a working environment with a broken one (versions, config, data), or binary-search the history with `git bisect`.
5. **Fix the root cause**, not the symptom. A `null` check that hides why the value was `null` just moves the bug.
6. **Add a regression test**, and look for the same mistake elsewhere.

Tools: a **debugger** (breakpoints, conditional breakpoints, stepping, watching variables; `breakpoint()` in Python, your IDE for Java, `gdb`/`lldb` for C++) shows the state at a moment; **logs** show behaviour over time and are the only option in production; quick print statements are fine for local work, just remove them. Sanitizers, `strace` and profilers each answer narrower questions. And explaining the problem out loud, even to a rubber duck, often exposes the wrong assumption.

### Bisecting with git

When something used to work and now doesn't, **git bisect** binary-searches the commit history for the first bad commit. Between a known-good and a known-bad commit, each test halves the range, so 1,000 commits need about 10 steps.

```diagram
{"type":"array","rows":[{"label":"test c5","values":["c1","c2","c3","c4","c5","c6","c7","c8","c9"],"pointers":{"good":0,"bad":8},"highlight":[4]},{"label":"c5 bad: test c3","values":["c1","c2","c3","c4","c5","c6","c7","c8","c9"],"pointers":{"good":0,"bad":4},"highlight":[2],"dim":[5,6,7,8]},{"label":"c3 good: test c4","values":["c1","c2","c3","c4","c5","c6","c7","c8","c9"],"pointers":{"good":2,"bad":4},"highlight":[3],"dim":[0,1,5,6,7,8]},{"label":"c4 bad: found it","values":["c1","c2","c3","c4","c5","c6","c7","c8","c9"],"pointers":{"good":2,"bad":3},"highlight":[3],"dim":[0,1,4,5,6,7,8]}],"indices":false,"caption":"Nine commits, three tests: c4 is the first bad commit because c3 is good and c4 is bad."}
```

```bash
git bisect start
git bisect bad                  # the current commit is broken
git bisect good v2.3.0          # this release was fine
# git checks out a commit in the middle: test it, then mark it
git bisect good                 # or: git bisect bad
# ...repeat until git prints "<sha> is the first bad commit"
git bisect reset                # go back to where you started

git bisect run ./check.sh       # automate: exit 0 = good, 125 = skip, other 1-127 = bad
```

Bisect works best when every commit builds and passes its tests, which is one more reason to keep commits small and self-contained.

## Regression tests

A **regression test** pins down a bug that was fixed so it can't silently come back. Write it *before* the fix and watch it fail: if it passes on the buggy code, it doesn't test the bug. Then fix the code and watch it pass. Name it after the behaviour (and link the issue), so whoever breaks it later understands why it exists. Bugs cluster, so a regression test is also a good moment to check nearby cases.

## Code review

**Code review** catches defects, but its bigger value is shared understanding: at least two people know every change, and conventions spread through the team.

For **authors**:

- Keep changes **small and focused**; review quality drops sharply on large diffs. Separate refactoring from behaviour changes.
- Write a description: what changed, why, and how you tested it.
- Review your own diff first, and let tooling (formatters, linters, CI) settle style before a human looks.

For **reviewers**:

- Check, in rough priority order: correctness and edge cases, tests, security (input handling, access checks), design and readability, performance where it matters.
- Comment on the code, not the person, and explain *why*. Ask questions when unsure ("what happens if the list is empty?").
- Mark what blocks approval versus optional nits, and respond quickly; a review that waits two days stalls the author's work.

## Interview questions and pitfalls

- *"What does the test pyramid recommend?"* Many fast unit tests, fewer integration tests, few end-to-end tests.
- *"Mock vs stub vs fake?"* Canned answers (stub), expectations on calls (mock), a working lightweight implementation (fake).
- *"A test fails 1 run in 20 in CI. Likely causes?"* Timing, shared state, real clocks, unseeded randomness, external services, or a real race.
- *"Does 100% coverage mean the code is correct?"* No: it only shows every line ran. Mutation testing checks whether the tests would notice a change.
- *"How would you find which commit introduced a bug?"* `git bisect`, ideally automated with `git bisect run`.
- Pitfalls: tests that sleep, tests that depend on each other, asserting on private details, mocking everything, fixing a bug without a test, and retrying flaky tests forever.
