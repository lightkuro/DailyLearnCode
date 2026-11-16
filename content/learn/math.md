---
title: Math & combinatorics
summary: The number theory and counting that coding problems lean on: overflow and mod 10⁹ + 7, integer division across languages, gcd, primes, fast exponentiation, nCr and reservoir sampling.
related: bit-manipulation, dynamic-programming, big-o, language-gotchas
terms:
  - modular arithmetic #modular-arithmetic
  - modular exponentiation #fast-exponentiation
  - fast exponentiation #fast-exponentiation
  - binary exponentiation #fast-exponentiation
  - gcd #gcd-and-lcm
  - greatest common divisor #gcd-and-lcm
  - lcm #gcd-and-lcm
  - Euclidean algorithm #gcd-and-lcm
  - sieve of Eratosthenes #primes-and-the-sieve
  - prime factorisation #primes-and-the-sieve
  - binomial coefficient #counting-ncr-and-pascal-s-triangle
  - nCr #counting-ncr-and-pascal-s-triangle
  - Pascal's triangle #counting-ncr-and-pascal-s-triangle
  - modular inverse #modular-inverse
  - reservoir sampling #reservoir-sampling
  - Newton's method #integer-square-root-newton-s-method
  - integer square root #integer-square-root-newton-s-method
  - cross product #cross-product-collinear-points-and-turns
  - collinear #cross-product-collinear-points-and-turns
  - BST insertion orders #counting-bst-insertion-orders
  - inclusion-exclusion #inclusion-exclusion-counting-multiples
  - inclusion–exclusion #inclusion-exclusion-counting-multiples
  - inclusion-exclusion principle #inclusion-exclusion-counting-multiples
  - Lagrange's four-square theorem #sums-of-squares-lagrange-and-legendre
  - four-square theorem #sums-of-squares-lagrange-and-legendre
  - Legendre's three-square theorem #sums-of-squares-lagrange-and-legendre
  - three-square theorem #sums-of-squares-lagrange-and-legendre
---

## Overflow and integer sizes

Most math bugs in interviews aren't about math. They're about numbers that silently stop fitting in their type.

| Type | Range | Roughly |
|---|---|---|
| 32-bit (`int` in Java and C++) | -2³¹ to 2³¹ - 1 | ±2.1 × 10⁹ |
| 64-bit (`long` in Java, `long long` in C++) | -2⁶³ to 2⁶³ - 1 | ±9.2 × 10¹⁸ |
| Python `int` | unbounded | as much as memory allows |

What happens when a value doesn't fit:

- **Java** wraps around silently: `46341 * 46341` is `-2147479015`. `Math.multiplyExact` and `Math.addExact` throw instead, if you'd rather find out.
- **C++** signed overflow is undefined behaviour: the compiler may assume it never happens, and the result can be anything. Unsigned types wrap around modulo 2ⁿ, which is defined.
- **Python** never overflows; numbers just get bigger (and slower). Python solutions that "work" can still be wrong when the problem says "return it as a 32-bit integer".

Rules of thumb:

- A product of two values up to 10⁹ needs 64 bits (10¹⁸ < 9.2 × 10¹⁸).
- The multiplication happens in the type of its operands. `long x = a * b;` with `int a, b` overflows *before* the assignment. Write `(long) a * b` in Java or `1LL * a * b` in C++.
- In C++ use `long long`, not `long`: `long` is 64 bits on Linux and macOS but 32 bits on Windows.

## Modular arithmetic

When an answer grows exponentially (the number of paths, ways or strings), problems ask for it **modulo 10⁹ + 7**. **Modular arithmetic** is arithmetic where every result is replaced by its remainder after dividing by the modulus `m`, so numbers wrap around like a clock.

```diagram
{"type":"graph","nodes":["0","1","2","3","4","5","6"],"edges":[["0","1"],["1","2"],["2","3"],["3","4"],["4","5"],["5","6"],["6","0"]],"directed":true,"path":["5","6","0","1","2"],"highlight":["5","2"],"caption":"Mod 7, numbers wrap around like a clock: start at 5, take 4 steps, land on 2. So 5 + 4 = 9 ≡ 2 (mod 7)."}
```

The key fact: you can reduce **at every step** of a sum, difference or product and get the same final remainder.

```text
(a + b) mod m  =  ((a mod m) + (b mod m)) mod m
(a - b) mod m  =  ((a mod m) - (b mod m)) mod m
(a * b) mod m  =  ((a mod m) * (b mod m)) mod m
```

So in a DP that counts ways, write `dp[i] = (dp[i - 1] + dp[i - 2]) % MOD` on every update and the numbers never grow past `MOD`. Why 10⁹ + 7 in particular:

- It's **prime**, which makes division possible (see the modular inverse section below).
- Two reduced values add up to less than 2³¹ - 1, so a sum fits in an `int`.
- Two reduced values multiply to about 10¹⁸, which fits in a 64-bit integer. Multiply in `long` / `long long`, then reduce.

Division is the exception: `(a / b) mod m` is **not** `(a mod m) / (b mod m)`. You multiply by an inverse instead.

The other trap is subtraction. In Java and C++, `(a - b) % MOD` is negative when `a < b`. Add the modulus back: `((a - b) % MOD + MOD) % MOD`.

## Integer division and negative numbers

Python and Java/C++ disagree when negative numbers are divided:

| Expression | Python | Java / C++ |
|---|---|---|
| `7 / 2` | `3.5` (always a float) | `3` |
| `7 // 2` | `3` | no `//` operator |
| integer `-7 / 2` | `-7 // 2 == -4` (rounds **down**) | `-7 / 2 == -3` (rounds **towards zero**) |
| `-7 % 2` | `1` | `-1` |
| `7 % -2` | `-1` | `1` |

Both sides keep the identity `a == (a / b) * b + a % b`; they just round differently. So in Python, `%` takes the sign of the **divisor** (handy: `x % n` is always a valid index into a list of length `n`). In Java and C++, `%` takes the sign of the **dividend** (`-7 % 2` is `-1`, so `x % 2 == 1` misses negative odd numbers; test `x % 2 != 0` instead).

Useful conversions:

- Java has `Math.floorDiv(a, b)` and `Math.floorMod(a, b)` for Python-style results.
- Python truncation towards zero: `int(a / b)` works for small values (it goes through a float, so it loses precision past 2⁵³). For big ints, divide the absolute values and fix the sign.
- Ceiling of `a / b` for positive values: `(a + b - 1) / b` in Java/C++, `-(-a // b)` in Python.

## GCD and LCM

The **greatest common divisor** `gcd(a, b)` is the largest number dividing both. The **Euclidean algorithm** computes it from one fact: any number dividing `a` and `b` also divides `a mod b`, so `gcd(a, b) == gcd(b, a mod b)`, and `gcd(a, 0) == a`. For 48 and 18: `gcd(48, 18) = gcd(18, 12) = gcd(12, 6) = gcd(6, 0) = 6`.

The remainders shrink at least as fast as the Fibonacci numbers, so it takes **O(log min(a, b))** steps.

The **least common multiple** follows from it: `lcm(a, b) = a / gcd(a, b) * b`. Divide before multiplying, so the intermediate value stays small.

```python
def gcd(a, b):
    while b:
        a, b = b, a % b           # gcd(a, b) == gcd(b, a mod b)
    return a

def lcm(a, b):
    return a // gcd(a, b) * b     # divide first to keep numbers small
```

```java
long gcd(long a, long b) {
    while (b != 0) {
        long t = a % b;           // gcd(a, b) == gcd(b, a mod b)
        a = b;
        b = t;
    }
    return a;
}

long lcm(long a, long b) {
    return a / gcd(a, b) * b;     // divide first to keep numbers small
}
```

```cpp
long long gcd(long long a, long long b) {
    while (b != 0) {
        long long t = a % b;      // gcd(a, b) == gcd(b, a mod b)
        a = b;
        b = t;
    }
    return a;
}

long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;     // divide first to keep numbers small
}
```

Built-ins: Python's `math.gcd` and `math.lcm` (3.9+, both take any number of arguments), C++17's `std::gcd` and `std::lcm` in `<numeric>`. Java has only `BigInteger.gcd`, so write the loop. Pass non-negative values to the hand-written versions; the built-ins always return a non-negative result.

GCD shows up in fraction problems (reduce `a/b` by dividing both by the gcd), in "can these jugs measure `x` litres" (yes if `x` is a multiple of `gcd`), and in slopes for "max points on a line" (store `(dy/g, dx/g)` instead of a float).

## Inclusion–exclusion: counting multiples

How many numbers in `1..n` are divisible by `a` or `b`? There are `⌊n/a⌋` multiples of `a` and `⌊n/b⌋` of `b`, but numbers divisible by both were counted twice. Those are exactly the multiples of `lcm(a, b)`, so:

`count(n) = ⌊n/a⌋ + ⌊n/b⌋ - ⌊n/lcm(a, b)⌋`

This is the **inclusion–exclusion principle**: |A ∪ B| = |A| + |B| − |A ∩ B|. For three sets, add the singles, subtract the pairs and add back the triple: |A ∪ B ∪ C| = |A| + |B| + |C| − |A ∩ B| − |A ∩ C| − |B ∩ C| + |A ∩ B ∩ C|. In general a term built from `k` of the sets is added when `k` is odd and subtracted when `k` is even, so `m` conditions give 2ᵐ − 1 terms.

For `1..20` with `a = 4` and `b = 6`: 5 + 3 − 1 = 7 (4, 6, 8, 12, 16, 18, 20), because 12 was counted by both.

In interviews it rarely comes alone. *Nth magical number* (the `n`-th positive integer divisible by `a` or `b`) and *ugly number III* (by `a`, `b` or `c`) pair it with [binary search](/learn/binary-search) on the answer: the count only grows with `x`, so search for the smallest `x` whose count reaches `n`. "How many numbers are divisible by none of these" is the complement, `n` minus the union.

```python
from math import gcd

def nth_magical_number(n, a, b):
    # Multiples of a or b up to x = x/a + x/b - x/lcm (common ones counted twice)
    # Count only grows with x, so binary search smallest x with count >= n
    both = a // gcd(a, b) * b
    # nth multiple of smaller one is always enough
    lo, hi = 1, n * min(a, b)
    while lo < hi:
        mid = (lo + hi) // 2
        if mid // a + mid // b - mid // both >= n:
            # mid could still be answer, so keep it
            hi = mid
        else:
            lo = mid + 1
    return lo % 1_000_000_007
```

```java
int nthMagicalNumber(int n, int a, int b) {
    // Multiples of a or b up to x = x/a + x/b - x/lcm (common ones counted twice)
    // Count only grows with x, so binary search smallest x with count >= n
    long both = (long) a / gcd(a, b) * b;
    // nth multiple of smaller one is always enough (long, up to 4 * 10^13)
    long lo = 1, hi = (long) n * Math.min(a, b);
    while (lo < hi) {
        long mid = lo + (hi - lo) / 2;
        // mid could still be answer, so keep it
        if (mid / a + mid / b - mid / both >= n) hi = mid;
        else lo = mid + 1;
    }
    return (int) (lo % 1_000_000_007);
}

long gcd(long a, long b) {
    return b == 0 ? a : gcd(b, a % b);
}
```

```cpp
int nthMagicalNumber(int n, int a, int b) {
    // Multiples of a or b up to x = x/a + x/b - x/lcm (common ones counted twice)
    // Count only grows with x, so binary search smallest x with count >= n
    long long both = lcm((long long)a, (long long)b);
    // nth multiple of smaller one is always enough (64-bit, up to 4 * 10^13)
    long long lo = 1, hi = (long long)n * min(a, b);
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        // mid could still be answer, so keep it
        if (mid / a + mid / b - mid / both >= n) hi = mid;
        else lo = mid + 1;
    }
    return lo % 1'000'000'007;
}
```

Each count is O(1) after an O(log) gcd, and the search takes O(log(n · min(a, b))) steps. Pitfalls:

- **Using `a · b` instead of the lcm.** They agree only when `gcd(a, b) = 1`. For 4 and 6 the common multiples are 12, 24, …, not 24, 48, ….
- **Overflow.** The search range reaches `n · min(a, b)` (4 × 10¹³ for the limits above), and the lcm of three values near 10⁹ can pass 10¹⁸. Use 64-bit types, divide before multiplying, and cap an lcm that exceeds the search range.
- **Returning the wrong end of the search.** The answer is the *smallest* `x` with `count(x) ≥ n`, which is always a multiple of `a` or `b`; a larger `x` with the same count isn't.

## Primes and the sieve

A **prime** has exactly two divisors, 1 and itself. To test one number, try divisors up to `√n`: if `n = a × b`, one of `a` and `b` is at most `√n`. That's **O(√n)**. The same loop gives the **prime factorisation**: divide out each `d` from 2 upwards while `d * d <= n`; whatever is left above 1 at the end is a prime factor too.

To find **all** primes up to `n`, use the **sieve of Eratosthenes**. Start with every number marked prime. For each `p` that's still marked, cross out its multiples. Start at `p * p`, because smaller multiples like `2p` and `3p` were already crossed out by smaller primes, and stop once `p * p > n`.

```diagram
{"type":"grid","cells":[[1,2,3,4,5,6,7,8,9,10],[11,12,13,14,15,16,17,18,19,20],[21,22,23,24,25,26,27,28,29,30]],"highlight":[[0,1],[0,2],[0,4],[0,6],[1,0],[1,2],[1,6],[1,8],[2,2],[2,8]],"dim":[[0,0]],"caption":"The primes up to 30. Crossing out the multiples of 2, 3 and 5 is enough: the next prime, 7, has 7 × 7 = 49 > 30."}
```

```python
def sieve(n):
    """is_prime[i] for every 0 <= i <= n (n >= 1)."""
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):   # smaller multiples are already out
                is_prime[multiple] = False
        p += 1
    return is_prime
```

```java
boolean[] sieve(int n) {                       // n >= 1
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, 2, n + 1, true);
    for (int p = 2; p * p <= n; p++)
        if (isPrime[p])
            for (int m = p * p; m <= n; m += p) // smaller multiples are already out
                isPrime[m] = false;
    return isPrime;
}
```

```cpp
vector<bool> sieve(int n) {                    // n >= 1
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; p * p <= n; p++)
        if (isPrime[p])
            for (int m = p * p; m <= n; m += p) // smaller multiples are already out
                isPrime[m] = false;
    return isPrime;
}
```

The sieve runs in **O(n log log n)** time, which is nearly linear, and O(n) space. It's practical up to about 10⁷. There are roughly `n / ln n` primes below `n`, so about 78,000 below a million.

## Fast exponentiation

Computing `x^n` by multiplying `n` times is O(n), too slow when `n` is 10⁹ or more. **Fast exponentiation** (also **binary exponentiation**) uses the binary digits of `n`: `x^13 = x^8 · x^4 · x^1` because 13 is `1101` in binary. Square `x` repeatedly to get `x, x², x⁴, x⁸, …` and multiply in the powers whose bit is set. That's **O(log n)** multiplications.

```diagram
{"type":"array","rows":[{"label":"power of x","values":["x⁸","x⁴","x²","x¹"]},{"label":"bit of 13","values":[1,1,0,1],"highlight":[0,1,3]}],"indices":false,"caption":"13 = 1101 in binary, so x¹³ = x⁸ · x⁴ · x¹. Three squarings produce the powers; the set bits pick which ones to multiply in."}
```

With a modulus this is **modular exponentiation**, and you reduce after every multiplication:

```python
def mod_pow(x, n, m):
    """x^n mod m, for n >= 0 and x >= 0."""
    result = 1
    x %= m
    while n > 0:
        if n & 1:                    # this bit of n is set: multiply its power in
            result = result * x % m
        x = x * x % m                # x, x^2, x^4, x^8, ...
        n >>= 1
    return result
```

```java
long modPow(long x, long n, long m) {   // n >= 0, x >= 0, m < 2^31 so x * x fits in a long
    long result = 1;
    x %= m;
    while (n > 0) {
        if ((n & 1) == 1) result = result * x % m;   // this bit is set: multiply it in
        x = x * x % m;                               // x, x^2, x^4, x^8, ...
        n >>= 1;
    }
    return result;
}
```

```cpp
long long modPow(long long x, long long n, long long m) {   // n >= 0, x >= 0, m < 2^31
    long long result = 1;
    x %= m;
    while (n > 0) {
        if (n & 1) result = result * x % m;   // this bit is set: multiply it in
        x = x * x % m;                        // x, x^2, x^4, x^8, ...
        n >>= 1;
    }
    return result;
}
```

Python's built-in `pow(x, n, m)` does exactly this. Java has `BigInteger.modPow`; C++ has nothing built in for integers. Don't use `std::pow` or `Math.pow` for integer powers: they work in floating point and lose exactness above 2⁵³.

For *Pow(x, n)* with a negative exponent, compute `(1/x)^(-n)`. Negating `n` overflows when `n` is the minimum `int`, so copy it into a `long` first.

## Counting: nCr and Pascal's triangle

**Combinatorics** counts arrangements without listing them. The basic tools:

- **Product rule**: `a` choices followed by `b` choices give `a × b` outcomes. A 4-digit PIN has 10⁴ options.
- **Permutations**: ordered arrangements of `k` items out of `n`: `n! / (n - k)!`.
- **Combinations**: unordered choices of `k` out of `n`, the **binomial coefficient** `C(n, k)`, written **nCr**: `n! / (k! (n - k)!)`.

Example: the number of paths from the top-left to the bottom-right of an `m × n` grid moving only right or down is `C(m + n - 2, m - 1)`: every path is `m + n - 2` moves, and you only choose which of them go down.

The factorials overflow quickly (20! is the largest that fits in 64 bits), so don't compute them directly. Two better ways:

**Pascal's triangle.** `C(n, k) = C(n - 1, k - 1) + C(n - 1, k)`: either the last item is chosen or it isn't. Filling the table is O(n²) and needs only additions, so it works with any modulus.

```diagram
{"type":"grid","cells":[[1,"","","","",""],[1,1,"","","",""],[1,2,1,"","",""],[1,3,3,1,"",""],[1,4,6,4,1,""],[1,5,10,10,5,1]],"rowLabels":["n = 0","n = 1","n = 2","n = 3","n = 4","n = 5"],"colLabels":["k = 0","1","2","3","4","5"],"highlight":[[5,2],[4,1],[4,2]],"caption":"Pascal's triangle: each entry is the sum of the one above and the one above-left. C(5, 2) = C(4, 1) + C(4, 2) = 4 + 6 = 10."}
```

**Multiplicative formula.** Build `C(n, k)` one factor at a time: after step `i` the running value is `C(n - k + i, i)`, a whole number, so each division is exact.

```python
def n_choose_k(n, k):
    k = min(k, n - k)                 # C(n, k) == C(n, n - k): fewer steps
    result = 1
    for i in range(1, k + 1):
        result = result * (n - k + i) // i   # exact: result is C(n - k + i, i)
    return result
```

```java
long nChooseK(int n, int k) {
    k = Math.min(k, n - k);           // C(n, k) == C(n, n - k): fewer steps
    long result = 1;
    for (int i = 1; i <= k; i++)
        result = result * (n - k + i) / i;   // exact: result is C(n - k + i, i)
    return result;
}
```

```cpp
long long nChooseK(int n, int k) {
    k = min(k, n - k);                // C(n, k) == C(n, n - k): fewer steps
    long long result = 1;
    for (int i = 1; i <= k; i++)
        result = result * (n - k + i) / i;   // exact: result is C(n - k + i, i)
    return result;
}
```

That's O(k). In Java and C++, `result * (n - k + i)` can overflow even when the final answer fits, so this is for answers comfortably inside 64 bits. Python has `math.comb(n, k)` (3.8+), which is exact at any size.

## Modular inverse

To divide by `b` modulo a prime `p`, multiply by its **modular inverse**: the number `b⁻¹` with `b × b⁻¹ ≡ 1 (mod p)`. It exists whenever `b` isn't a multiple of `p`. **Fermat's little theorem** gives it directly: `b⁻¹ = b^(p-2) mod p`, one fast exponentiation. Python 3.8+ also accepts `pow(b, -1, p)`. For a modulus that isn't prime, the extended Euclidean algorithm finds the inverse when `gcd(b, m) = 1`.

The main use is `C(n, k) mod p` for large `n`: precompute `fact[i] = i! mod p` for every `i`, then `inv_fact[n] = fact[n]^(p-2)`, and fill the rest downwards with `inv_fact[i - 1] = inv_fact[i] × i`. After O(n) setup, every query is O(1):

```text
C(n, k) mod p  =  fact[n] * inv_fact[k] * inv_fact[n - k]  mod p
```

## Counting BST insertion orders

*Number of ways to reorder array to get same BST* gives a permutation of `1..n` and asks how many orderings of it, inserted into an empty BST one by one, build exactly the same tree.

Work it out at the root. The first number inserted becomes the root, so it must stay first. Every later number goes left (smaller) or right (larger), and the two sides never affect each other: only the **relative order within the left side** shapes the left subtree, and likewise on the right. So with `L` numbers on the left and `R` on the right, any interleaving of a valid left order with a valid right order works. Choosing which of the `L + R` positions hold left-side numbers gives **C(L + R, L)** interleavings:

```text
ways(node) = C(L + R, L) × ways(left child) × ways(right child)
```

Unrolled, that's a **product over every node of C(L + R, L)**, where `L` and `R` are the sizes of its two subtrees. For `[3, 4, 5, 1, 2]` the root 3 has `{1, 2}` on the left and `{4, 5}` on the right: C(4, 2) = 6. Nodes 1 and 4 each have one child on one side (C(1, 0) = 1), and the leaves give 1. So 6 orders build the tree; the problem excludes the given one, so the answer is **5**.

```diagram
{"type":"tree","values":[3,1,4,null,2,null,5],"notes":{"3":"C(4,2)=6","1":"C(1,0)=1","4":"C(1,0)=1"},"caption":"The BST built from [3, 4, 5, 1, 2]. Product over nodes: 6 × 1 × 1 = 6 orders, 5 besides the original."}
```

Steps:

1. Build **Pascal's triangle mod 10⁹ + 7** up to `n` (the numbers get huge, and Pascal needs only additions).
2. Insert the numbers into a BST, storing each value's left and right child in arrays.
3. Compute subtree sizes bottom-up and multiply in `C(L + R, L)` at each node. In a BST built by insertion, each node's parent was inserted earlier, so walking the input **in reverse** reaches children before parents, and no recursion is needed.
4. Return `ways - 1`, leaving out the given order.

```python
def num_of_ways(nums):
    # Root comes first; left and right subtree orders interleave freely
    # Orders = product over nodes of C(L + R, L) (L, R = child subtree sizes)
    # Subtract 1 to leave out nums itself
    MOD = 10**9 + 7
    n = len(nums)
    # Pascal's triangle, comb[a][b] = C(a, b) mod MOD
    comb = [[1] * (a + 1) for a in range(n + 1)]
    for a in range(2, n + 1):
        for b in range(1, a):
            comb[a][b] = (comb[a - 1][b - 1] + comb[a - 1][b]) % MOD
    # children of each value (0 = none; values are 1..n)
    left, right = [0] * (n + 1), [0] * (n + 1)
    for v in nums[1:]:
        node = nums[0]
        # walk down from root to empty spot
        while True:
            if v < node:
                if left[node] == 0:
                    left[node] = v
                    break
                node = left[node]
            else:
                if right[node] == 0:
                    right[node] = v
                    break
                node = right[node]
    # size[0] = 0 stands for missing child
    size = [0] * (n + 1)
    ways = 1
    # reverse insertion order reaches children before parents
    for v in reversed(nums):
        l, r = size[left[v]], size[right[v]]
        size[v] = l + r + 1
        ways = ways * comb[l + r][l] % MOD
    return ways - 1
```

```java
int numOfWays(int[] nums) {
    // Root comes first; left and right subtree orders interleave freely
    // Orders = product over nodes of C(L + R, L) (L, R = child subtree sizes)
    // Subtract 1 to leave out nums itself
    final int MOD = 1_000_000_007;
    int n = nums.length;
    // Pascal's triangle, comb[a][b] = C(a, b) mod MOD
    long[][] comb = new long[n + 1][n + 1];
    for (int a = 0; a <= n; a++) {
        comb[a][0] = comb[a][a] = 1;
        for (int b = 1; b < a; b++) comb[a][b] = (comb[a - 1][b - 1] + comb[a - 1][b]) % MOD;
    }
    // children of each value (0 = none; values are 1..n)
    int[] left = new int[n + 1], right = new int[n + 1];
    for (int i = 1; i < n; i++) {
        int v = nums[i], node = nums[0];
        // walk down from root to empty spot
        while (true) {
            if (v < node) {
                if (left[node] == 0) { left[node] = v; break; }
                node = left[node];
            } else {
                if (right[node] == 0) { right[node] = v; break; }
                node = right[node];
            }
        }
    }
    // size[0] = 0 stands for missing child
    int[] size = new int[n + 1];
    long ways = 1;
    // reverse insertion order reaches children before parents
    for (int i = n - 1; i >= 0; i--) {
        int v = nums[i], l = size[left[v]], r = size[right[v]];
        size[v] = l + r + 1;
        ways = ways * comb[l + r][l] % MOD;
    }
    return (int) (ways - 1);
}
```

```cpp
int numOfWays(vector<int>& nums) {
    // Root comes first; left and right subtree orders interleave freely
    // Orders = product over nodes of C(L + R, L) (L, R = child subtree sizes)
    // Subtract 1 to leave out nums itself
    const long long MOD = 1'000'000'007;
    int n = nums.size();
    // Pascal's triangle, comb[a][b] = C(a, b) mod MOD
    vector<vector<long long>> comb(n + 1, vector<long long>(n + 1, 0));
    for (int a = 0; a <= n; a++) {
        comb[a][0] = comb[a][a] = 1;
        for (int b = 1; b < a; b++) comb[a][b] = (comb[a - 1][b - 1] + comb[a - 1][b]) % MOD;
    }
    // children of each value (0 = none; values are 1..n)
    vector<int> left(n + 1, 0), right(n + 1, 0);
    for (int i = 1; i < n; i++) {
        int v = nums[i], node = nums[0];
        // walk down from root to empty spot
        while (true) {
            if (v < node) {
                if (left[node] == 0) { left[node] = v; break; }
                node = left[node];
            } else {
                if (right[node] == 0) { right[node] = v; break; }
                node = right[node];
            }
        }
    }
    // size[0] = 0 stands for missing child
    vector<int> size(n + 1, 0);
    long long ways = 1;
    // reverse insertion order reaches children before parents
    for (int i = n - 1; i >= 0; i--) {
        int v = nums[i], l = size[left[v]], r = size[right[v]];
        size[v] = l + r + 1;
        ways = ways * comb[l + r][l] % MOD;
    }
    return ways - 1;
}
```

**O(n²)** time and space: the Pascal table has about n²/2 entries, and inserting into a BST that degenerates into a chain (sorted input) is O(n) per number. That's fine for the usual `n ≤ 1000`.

Pitfalls:

- **Forgetting the − 1.** The count includes the given order itself, which the problem leaves out. (Every `C(a, b)` with `a < p` is non-zero mod the prime `p`, so the product is at least 1 and `ways - 1` never goes negative.)
- **Computing C(L + R, L) with factorials** or the multiplicative formula overflows long before `n = 1000`. Use the Pascal table mod `p`, or factorials with modular inverses (above).
- **Multiply in 64 bits** and reduce after every product, as in the modular arithmetic section.
- **Recursion on a sorted input** is `n` levels deep. The usual recursive version (split the list into smaller and larger, recurse on both) can hit Python's default limit of 1,000 at `n = 1000`; the reverse-order loop above avoids it.

## Reservoir sampling

**Reservoir sampling** picks an item uniformly at random from a stream whose length you don't know in advance (a huge file, a linked list you may traverse only once), using O(1) memory.

Keep one chosen item. When the `i`-th item arrives (counting from 1), replace the chosen item with it with probability `1/i`. The first item is always taken; the second replaces it half the time; and so on.

Why it's fair: item `i` is picked when it arrives (probability `1/i`) and then survives every later step (`i/(i+1)`, `(i+1)/(i+2)`, …, `(n-1)/n`). The product telescopes to `1/n`, the same for every item.

```python
import random

def reservoir_sample(stream):
    """One item chosen uniformly at random, in a single pass."""
    chosen = None
    for i, item in enumerate(stream, start=1):
        if random.randrange(i) == 0:              # probability 1/i
            chosen = item
    return chosen
```

```java
int reservoirSample(Iterable<Integer> stream, Random rnd) {   // a single pass
    int chosen = 0, i = 0;
    for (int item : stream) {
        i++;
        if (rnd.nextInt(i) == 0) chosen = item;   // probability 1/i
    }
    return chosen;
}
```

```cpp
int reservoirSample(const vector<int>& stream, mt19937& rng) {   // a single pass
    int chosen = 0, i = 0;
    for (int item : stream) {
        i++;
        if (uniform_int_distribution<int>(0, i - 1)(rng) == 0) chosen = item;   // probability 1/i
    }
    return chosen;
}
```

To keep `k` items: fill the reservoir with the first `k`, then for the `i`-th item (from 1) pick a random `j` in `[1, i]` and, if `j ≤ k`, replace slot `j`. Interview problems: *Linked list random node* and *Random pick index*.

A close relative is the **Fisher-Yates shuffle** (*Shuffle an array*): for `i` from `n - 1` down to 1, swap `a[i]` with `a[j]` for a random `j` in `[0, i]`. Every permutation comes out equally likely; picking `j` from the whole array instead does not.

## Integer square root: Newton's method

*Sqrt(x)* asks for `⌊√n⌋` without a built-in, and *valid perfect square* asks whether `n` is one. [Binary search](/learn/binary-search) on the answer works in O(log n) steps. **Newton's method** is the other standard answer, and it converges much faster.

Newton's method finds a root of `f(x) = x² − n` by repeatedly sliding down the tangent line. For square roots the step simplifies to averaging a guess with `n` divided by it:

```text
x  ←  (x + n / x) / 2
```

If `x` is too big, `n / x` is too small, and their average lands closer to `√n`. With **integer division** everywhere:

1. Start with `x = n`, which is at least `⌊√n⌋`.
2. While `x * x > n`, set `x = (x + n // x) // 2`.
3. Return `x`.

Two facts make this exact. While `x * x > n`, the step strictly lowers `x`. And it never drops below `⌊√n⌋`: by the AM-GM inequality the average of `x` and `n / x` is at least `√n`, and flooring keeps it at least `⌊√n⌋`. So `x` falls until it reaches `⌊√n⌋`, where the loop stops. For `n = 30`: 30, 15, 8, 5, and 5 × 5 = 25 ≤ 30.

```python
def my_sqrt(n):
    # Newton step x = (x + n // x) // 2 moves x toward sqrt(n)
    # Starting at n (too big), x falls every step and never skips floor(sqrt(n))
    # Stop at first x with x * x <= n
    x = n
    while x * x > n:
        x = (x + n // x) // 2
    return x
```

```java
int mySqrt(int n) {
    // Newton step x = (x + n / x) / 2 moves x toward sqrt(n)
    // Starting at n (too big), x falls every step and never skips floor(sqrt(n))
    // Stop at first x with x * x <= n
    // long, so x * x can't overflow
    long x = n;
    while (x * x > n) x = (x + n / x) / 2;
    return (int) x;
}
```

```cpp
int mySqrt(int n) {
    // Newton step x = (x + n / x) / 2 moves x toward sqrt(n)
    // Starting at n (too big), x falls every step and never skips floor(sqrt(n))
    // Stop at first x with x * x <= n
    // long long, so x * x can't overflow
    long long x = n;
    while (x * x > n) x = (x + n / x) / 2;
    return x;
}
```

From a far-off start, each step roughly halves `x` until it gets close; after that the number of correct digits doubles every step (**quadratic convergence**). That's **O(log n)** steps in the worst case, and only about 20 for any 32-bit `n`. For a perfect-square test, check `r * r == n` with `r = my_sqrt(n)`.

The pitfalls: `x * x` overflows a 32-bit `int` as soon as `x` passes 46,340, so do it in 64 bits; and the floating-point `sqrt` can be off by one for large values, so if you use it, correct the result with an `r * r <= n` check. Python has `math.isqrt(n)`, which is exact for any size.

## Sums of squares: Lagrange and Legendre

Two classical theorems turn *perfect squares* (the fewest squares that add up to `n`) from an O(n√n) [DP](/learn/dynamic-programming#perfect-squares) into an O(√n) check:

- **Lagrange's four-square theorem**: every natural number is a sum of four squares (0 allowed). So the answer is never more than 4.
- **Legendre's three-square theorem**: `n` is a sum of three squares exactly when it is **not** of the form 4ᵃ(8b + 7). Those numbers (7, 15, 23, 28, 31, …) need exactly 4; everything else needs at most 3.

That leaves a short decision:

1. If `n` is a perfect square, the answer is 1.
2. Divide out factors of 4. If what's left is 7 mod 8, the answer is 4.
3. If `n = i² + j²` for some `i`, the answer is 2: try each `i ≤ √n` and test whether `n - i²` is a square.
4. Otherwise it's 3.

For 12: not a square, 12 / 4 = 3 isn't 7 mod 8, and no two squares make 12, so 3 (4 + 4 + 4). 13 = 4 + 9 needs 2. 28 = 4 · 7 needs 4 (25 + 1 + 1 + 1).

```python
from math import isqrt

def num_squares(n):
    # Lagrange caps answer at 4; Legendre says 4 exactly when n = 4^a (8b + 7)
    # Test 1 and 2 directly; anything left needs 3
    def is_square(x):
        r = isqrt(x)
        return r * r == x

    if is_square(n):
        return 1
    # strip 4^a (n and n / 4 need same count)
    m = n
    while m % 4 == 0:
        m //= 4
    if m % 8 == 7:
        return 4
    # first square i*i, rest must be one square
    i = 1
    while i * i <= n:
        if is_square(n - i * i):
            return 2
        i += 1
    return 3
```

```java
int numSquares(int n) {
    // Lagrange caps answer at 4; Legendre says 4 exactly when n = 4^a (8b + 7)
    // Test 1 and 2 directly; anything left needs 3
    if (isSquare(n)) return 1;
    // strip 4^a (n and n / 4 need same count)
    int m = n;
    while (m % 4 == 0) m /= 4;
    if (m % 8 == 7) return 4;
    // first square i*i, rest must be one square
    for (int i = 1; i * i <= n; i++)
        if (isSquare(n - i * i)) return 2;
    return 3;
}

boolean isSquare(int x) {
    // floating sqrt can be off by one, so correct it
    long r = (long) Math.sqrt(x);
    while (r * r > x) r--;
    while ((r + 1) * (r + 1) <= x) r++;
    return r * r == x;
}
```

```cpp
bool isSquare(int x) {
    // floating sqrt can be off by one, so correct it
    long long r = sqrt((double)x);
    while (r * r > x) r--;
    while ((r + 1) * (r + 1) <= x) r++;
    return r * r == x;
}

int numSquares(int n) {
    // Lagrange caps answer at 4; Legendre says 4 exactly when n = 4^a (8b + 7)
    // Test 1 and 2 directly; anything left needs 3
    if (isSquare(n)) return 1;
    // strip 4^a (n and n / 4 need same count)
    int m = n;
    while (m % 4 == 0) m /= 4;
    if (m % 8 == 7) return 4;
    // first square i*i, rest must be one square
    for (int i = 1; i * i <= n; i++)
        if (isSquare(n - i * i)) return 2;
    return 3;
}
```

**O(√n) time, O(1) space.** Pitfalls:

- **Testing mod 8 before dividing out the 4s.** 28 is 4 mod 8 but still needs four squares.
- **Trusting a floating-point square root** for large values. A `double` can round `√x` to the wrong side once `x` is large; use `math.isqrt` in Python or correct the root with integer checks, as the Java and C++ code does (see [integer square root](/learn/math#integer-square-root-newton-s-method)).
- In an interview, give the DP first. The theorems are the follow-up, and nobody expects you to prove them.

## Cross product: collinear points and turns

Given three points `a`, `b` and `c`, the **cross product** of the vectors `b − a` and `c − a` is

```text
cross(a, b, c) = (b.x − a.x) · (c.y − a.y) − (b.y − a.y) · (c.x − a.x)
```

Its sign is the **orientation** of the three points:

| `cross(a, b, c)` | Meaning |
|---|---|
| `> 0` | `a → b → c` turns left (counter-clockwise) |
| `< 0` | turns right (clockwise) |
| `= 0` | **collinear**: all three on one line |

Its absolute value is twice the area of the triangle `abc`, which is why it's zero exactly when the triangle is flat.

```diagram
{"type":"graph","nodes":[{"id":"a","x":0,"y":3},{"id":"b","x":2,"y":2},{"id":"c","x":4,"y":1},{"id":"d","x":3,"y":0}],"edges":[["a","b"],["b","c"],["b","d"]],"directed":true,"highlight":["c"],"caption":"a(0,0), b(2,1), c(4,2) are collinear: cross = 2·2 − 1·4 = 0. For d(3,3) instead of c, cross = 2·3 − 1·3 = 3 > 0, a left turn."}
```

It shows up in *check if it is a straight line* (every point must be collinear with the first two), *valid boomerang* (three points that are *not* collinear), *largest triangle area* (`|cross| / 2`) and *erect the fence* (convex hull, which keeps only left turns).

Why not compare slopes? `dy / dx` divides by zero on vertical lines, and floating-point slopes that should be equal can differ in the last digit. The cross product is the slope comparison `dy₁ / dx₁ = dy₂ / dx₂` with both sides multiplied out: only integer multiplications, no special cases.

```python
def cross(a, b, c):
    # > 0 = left turn, < 0 = right turn, 0 = collinear
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

def check_straight_line(points):
    # Every point collinear with first two
    return all(cross(points[0], points[1], p) == 0 for p in points[2:])
```

```java
long cross(int[] a, int[] b, int[] c) {
    // > 0 = left turn, < 0 = right turn, 0 = collinear
    return (long) (b[0] - a[0]) * (c[1] - a[1]) - (long) (b[1] - a[1]) * (c[0] - a[0]);
}

boolean checkStraightLine(int[][] points) {
    // Every point collinear with first two
    for (int i = 2; i < points.length; i++)
        if (cross(points[0], points[1], points[i]) != 0) return false;
    return true;
}
```

```cpp
long long cross(const vector<int>& a, const vector<int>& b, const vector<int>& c) {
    // > 0 = left turn, < 0 = right turn, 0 = collinear
    return 1LL * (b[0] - a[0]) * (c[1] - a[1]) - 1LL * (b[1] - a[1]) * (c[0] - a[0]);
}

bool checkStraightLine(vector<vector<int>>& points) {
    // Every point collinear with first two
    for (int i = 2; i < (int)points.size(); i++)
        if (cross(points[0], points[1], points[i]) != 0) return false;
    return true;
}
```

Each test is **O(1)**, so checking `n` points is O(n). The pitfalls: multiply in 64 bits once coordinates go past about 10⁴ (each product is a difference times a difference), keep the same anchor point `a` for every test, and remember the first two points must be distinct for "collinear with them" to mean anything.

## Interview problems and pitfalls

| Problem | Idea |
|---|---|
| Pow(x, n) | fast exponentiation; watch `n = INT_MIN` |
| Count primes | sieve of Eratosthenes |
| Unique paths | `C(m + n - 2, m - 1)`, or a DP |
| Factorial trailing zeroes | count factors of 5: `n/5 + n/25 + n/125 + …` |
| Reverse integer | check for overflow before multiplying by 10 |
| Excel sheet column number | base 26 with digits 1 to 26 |
| Fraction to recurring decimal | long division; a repeated remainder starts the cycle |
| Happy number | the digit-square sequence loops; detect the cycle |
| Max points on a line | slope as a reduced pair `(dy/g, dx/g)` |
| Sqrt(x) | Newton's method on integers (or binary search) |
| Check if it is a straight line | cross product with the first two points is 0 |
| Reorder array to get same BST | product of `C(L + R, L)` over nodes, mod 10⁹ + 7 |
| Multiply strings | grade-school multiplication on digit arrays |
| Random pick with weight | prefix sums, then [binary search](/learn/binary-search) |
| Perfect squares | at most 4 (Lagrange); 4 exactly for 4ᵃ(8b + 7) (Legendre) |
| Nth magical number | count `x/a + x/b - x/lcm`, binary search on `x` |

- **Reduce after every operation** in modular problems, and multiply in 64 bits.
- **Negative remainders**: in Java and C++ add the modulus back after subtracting.
- **Floating point** for integer math (`pow`, `sqrt`, `log`) can be off by one at the edges. Prefer integer loops, `math.isqrt` in Python, or check `r * r <= n` after taking a square root.
- **`int` in C++ and Java** silently breaks around 2.1 × 10⁹. When values or counts can get near that, use 64-bit types from the start. For more traps like these, see [language gotchas](/learn/language-gotchas).
