---
title: Bit manipulation
summary: How integers look in binary, two's complement, the bitwise operators in each language, and the handful of tricks (x & (x - 1), XOR, bitmasks) that interview problems keep reusing.
related: math, dynamic-programming, recursion-backtracking, tries
terms:
  - bit manipulation
  - bitwise #bitwise-operators
  - bitwise operators #bitwise-operators
  - two's complement #binary-and-two-s-complement
  - XOR #xor
  - exclusive or #xor
  - unsigned right shift #bitwise-operators
  - lowest set bit #bit-tricks
  - popcount #counting-bits
  - Hamming weight #counting-bits
  - bitmask #enumerating-subsets-with-bitmasks
  - bitmasks #enumerating-subsets-with-bitmasks
  - single number II #single-number-ii-ones-and-twos
  - add binary #adding-binary-strings
  - binary addition #adding-binary-strings
  - subset XOR sum #sum-of-all-subset-xors
  - sum of all subset XOR totals #sum-of-all-subset-xors
---

## Binary and two's complement

Computers store integers in binary. Bit `i` (counting from 0 on the right) is worth `2^i`, so a number is the sum of the powers of two whose bits are 1.

```diagram
{"type":"array","rows":[{"label":"bit i","values":[7,6,5,4,3,2,1,0]},{"label":"worth 2^i","values":[128,64,32,16,8,4,2,1]},{"label":"13","values":[0,0,0,0,1,1,0,1],"highlight":[4,5,7]}],"indices":false,"caption":"13 = 8 + 4 + 1 = 1101 in binary. Bit 0 (on the right) is the least significant."}
```

Two consequences you'll use constantly:

- Shifting left by `k` (`x << k`) appends `k` zeros, which multiplies by `2^k`.
- Shifting right by `k` (`x >> k`) drops the last `k` bits, which divides by `2^k` and rounds down for non-negative `x`.

### Negative numbers

Fixed-width integers (32 bits for `int` in Java and C++, 64 for `long` / `long long`) store negative numbers in **two's complement**. With `w` bits, a negative `-x` is stored as the bit pattern of `2^w - x`. The useful facts:

- The top bit is the **sign bit**: 1 means negative.
- `-1` is all ones.
- **`-x == ~x + 1`**: flip every bit, then add one.
- A 32-bit `int` holds -2³¹ to 2³¹ - 1. The minimum has no positive partner, so `-Integer.MIN_VALUE` is still `Integer.MIN_VALUE` in Java, and `abs(INT_MIN)` is undefined behaviour in C++.

```diagram
{"type":"array","rows":[{"label":"5","values":[0,0,0,0,0,1,0,1]},{"label":"~5 (= -6)","values":[1,1,1,1,1,0,1,0],"highlight":[0]},{"label":"-5 = ~5 + 1","values":[1,1,1,1,1,0,1,1],"highlight":[0]}],"indices":false,"caption":"Two's complement in 8 bits. Flipping every bit of 5 gives -6; adding one gives -5. The sign bit (highlighted) is 1 for both negatives."}
```

The point of the scheme is that addition works the same for signed and unsigned values: `5 + (-5)` in binary carries out of the top and leaves all zeros.

**Python is different.** Its integers have no fixed width. Conceptually a negative number has infinitely many 1s on the left, so `~5 == -6` and `-5 >> 1 == -3` behave as above, but `bin(-5)` prints `'-0b101'` (a minus sign, not the bit pattern), and nothing ever overflows. To see or simulate a 32-bit value, mask it: `x & 0xFFFFFFFF`. To turn a 32-bit pattern back into a signed value, subtract `2**32` if it's at least `2**31`.

## Bitwise operators

| Operator | Name | Each result bit is 1 when | Example (`12 = 1100`, `10 = 1010`) |
|---|---|---|---|
| `a & b` | AND | both bits are 1 | `1000` = 8 |
| `a \| b` | OR | either bit is 1 | `1110` = 14 |
| `a ^ b` | XOR | the bits differ | `0110` = 6 |
| `~a` | NOT | the bit was 0 | `~12` = -13 |
| `a << k` | left shift | bits move up `k` places, zeros fill in | `12 << 1` = 24 |
| `a >> k` | right shift | bits move down `k` places | `12 >> 2` = 3 |

The operators look the same in all three languages, but shifts behave differently:

| | Python | Java | C++ |
|---|---|---|---|
| Integer width | unbounded | `int` 32, `long` 64 | `int` usually 32, `long long` 64 |
| `>>` on negatives | arithmetic (copies the sign bit): `-5 >> 1 == -3` | arithmetic: `-5 >> 1 == -3` | arithmetic since C++20; implementation-defined before (arithmetic in practice) |
| Logical right shift (fills zeros) | mask first: `(x & 0xFFFFFFFF) >> k` | `>>>`: `-5 >>> 1 == 2147483645` | shift an `unsigned` value |
| Shifting by ≥ the width | fine (`1 << 100` is a big int) | the distance is taken mod 32 (mod 64 for `long`): `1 << 32 == 1` | undefined behaviour |
| `1 << 40` | fine | wrong: write `1L << 40` | undefined: write `1LL << 40` |

Java's `>>>` is the **unsigned right shift**: it treats the value as unsigned and shifts in zeros, which is what you want when processing the bits of a negative `int` one by one. C++ has no `>>>`; convert to `unsigned` (or use `uint32_t`) for that kind of work, since unsigned arithmetic is always well defined.

**Precedence trap.** In Java and C++, `==` binds tighter than `&`, so `x & 1 == 0` means `x & (1 == 0)`. Java rejects it at compile time; C++ compiles it and always gets 0. Python happens to parse it as `(x & 1) == 0`. In every language, write the parentheses.

## Bit tricks

These come up so often that it's worth knowing them by sight. `i` is a bit position and `1 << i` is a number with only that bit set (a **mask**).

| Goal | Expression |
|---|---|
| Is bit `i` set? | `(x >> i) & 1` |
| Set bit `i` | `x \| (1 << i)` |
| Clear bit `i` | `x & ~(1 << i)` |
| Toggle bit `i` | `x ^ (1 << i)` |
| Is `x` odd? | `x & 1` |
| Clear the lowest set bit | `x & (x - 1)` |
| Keep only the lowest set bit | `x & -x` |
| Is `x` a power of two? | `x > 0 and (x & (x - 1)) == 0` |
| Mask of the low `k` bits | `(1 << k) - 1` |

The two lowest-bit tricks deserve a picture. Subtracting 1 turns the lowest 1 into a 0 and every 0 below it into a 1. AND that with `x` and the lowest 1 disappears. Meanwhile `-x = ~x + 1` flips everything above the lowest 1 but leaves that bit and the zeros below it alone, so `x & -x` keeps just that bit.

```diagram
{"type":"array","rows":[{"label":"x = 88","values":[0,1,0,1,1,0,0,0],"highlight":[4]},{"label":"x - 1","values":[0,1,0,1,0,1,1,1]},{"label":"x & (x - 1)","values":[0,1,0,1,0,0,0,0],"highlight":[4]},{"label":"-x","values":[1,0,1,0,1,0,0,0]},{"label":"x & -x","values":[0,0,0,0,1,0,0,0],"highlight":[4]}],"indices":false,"caption":"88 = 01011000. Its lowest set bit is worth 8. x & (x - 1) clears it (80); x & -x isolates it (8)."}
```

`x & -x` is the **lowest set bit**, and it's also the step size in a Fenwick tree (binary indexed tree). A power of two has exactly one set bit, which is why clearing it leaves zero.

## XOR

**XOR** (exclusive or) has three properties that make it the most useful operator in interviews:

- `x ^ 0 == x`
- `x ^ x == 0`
- It's commutative and associative, so order doesn't matter.

Put together: XOR a list of numbers and every value that appears twice cancels out. *Single number* ("every element appears twice except one") is one loop. A cousin, *missing number* (0 to `n` with one missing), XORs all the indices and all the values: everything present cancels and the missing one remains.

When **two** values appear once, XOR everything to get `a ^ b`. It's non-zero because `a != b`, so it has some set bit where `a` and `b` differ. Split the numbers into two groups by that bit (`x & -x` picks one): `a` and `b` land in different groups, every pair lands in the same group, and XORing each group gives one answer each.

```python
def single_number(nums):
    """Every value appears twice except one."""
    x = 0
    for v in nums:
        x ^= v                    # pairs cancel
    return x

def single_number_iii(nums):
    """Exactly two values appear once; return them."""
    xy = 0
    for v in nums:
        xy ^= v                   # a ^ b, non-zero because a != b
    low = xy & -xy                # a bit where a and b differ
    a = 0
    for v in nums:
        if v & low:               # only the group with that bit set
            a ^= v
    return [a, xy ^ a]
```

```java
int singleNumber(int[] nums) {
    int x = 0;
    for (int v : nums) x ^= v;    // pairs cancel
    return x;
}

int[] singleNumberIII(int[] nums) {
    int xy = 0;
    for (int v : nums) xy ^= v;   // a ^ b, non-zero because a != b
    int low = xy & -xy;           // a bit where a and b differ
    int a = 0;
    for (int v : nums) if ((v & low) != 0) a ^= v;
    return new int[]{a, xy ^ a};
}
```

```cpp
int singleNumber(const vector<int>& nums) {
    int x = 0;
    for (int v : nums) x ^= v;    // pairs cancel
    return x;
}

vector<int> singleNumberIII(const vector<int>& nums) {
    unsigned xy = 0;              // unsigned, so -xy can't overflow
    for (int v : nums) xy ^= v;   // a ^ b, non-zero because a != b
    unsigned low = xy & -xy;      // a bit where a and b differ
    int a = 0;
    for (int v : nums) if (v & low) a ^= v;
    return {a, (int)(xy ^ a)};
}
```

The C++ version uses `unsigned` on purpose: if `a ^ b` happened to be `INT_MIN`, negating it as an `int` would overflow, which is undefined behaviour. Java's `int` wraps around safely, and Python's never overflows.

XOR also reads as "addition without carries", which is the idea behind *sum of two integers without `+`*: `a ^ b` is the sum ignoring carries, `(a & b) << 1` is the carries, and you repeat until there are none.

### Single number II: ones and twos

*Single number II*: every value appears **three** times except one, which appears once. Pairs cancel under XOR, but triples don't (`x ^ x ^ x == x`), so plain XOR fails. Two O(1)-space answers:

**Count each bit mod 3.** For each of the 32 bit positions, add up that bit over all numbers. Each tripled value adds 0 or 3, so the total mod 3 is exactly the single value's bit. That's 32 passes, O(32 · n). It generalises to "every value appears `k` times": count mod `k`.

**Two masks, `ones` and `twos`.** Do all 32 counters at once. Each bit position only needs to count 0, 1, 2, 0, 1, 2, … as it keeps appearing, and two bits can store that: `ones` holds the positions seen once (mod 3), `twos` the positions seen twice. For each number `x`:

1. `ones = (ones ^ x) & ~twos`: flip `x`'s bits into `ones`, except where `twos` is set (that's the third sighting, which must go back to 0).
2. `twos = (twos ^ x) & ~ones`: flip `x`'s bits into `twos`, except where they just landed in `ones` (first sighting).

After a third sighting, a bit is cleared from both masks. At the end, `ones` holds exactly the bits of the single value.

```diagram
{"type":"array","rows":[{"label":"x","values":["10","10","11","10"]},{"label":"ones","values":["10","00","01","11"],"highlight":[3]},{"label":"twos","values":["00","10","00","00"]}],"indices":false,"caption":"[2, 2, 3, 2] in binary. Bit 1 moves to ones, then twos, then is cleared by its third sighting (in 3); the last 2 starts it again. Bit 0 is seen once. Answer: ones = 11 = 3."}
```

```python
def single_number_ii_counts(nums):
    # Sum each bit position over nums; triples add 0 mod 3
    # Leftover bit count mod 3 = that bit of answer
    ans = 0
    for bit in range(32):
        total = sum((x >> bit) & 1 for x in nums)
        if total % 3:
            ans |= 1 << bit
    # bit 31 set = negative 32-bit value
    return ans - (1 << 32) if ans >= 1 << 31 else ans

def single_number_ii(nums):
    # ones = bits seen 1 time mod 3, twos = bits seen 2 times mod 3
    # Each bit steps 0, 1, 2, 0 as it reappears
    ones = twos = 0
    for x in nums:
        # flip into ones unless bit already in twos (third sighting)
        ones = (ones ^ x) & ~twos
        # flip into twos unless bit just landed in ones
        twos = (twos ^ x) & ~ones
    return ones
```

```java
int singleNumberIICounts(int[] nums) {
    // Sum each bit position over nums; triples add 0 mod 3
    // Leftover bit count mod 3 = that bit of answer
    int ans = 0;
    for (int bit = 0; bit < 32; bit++) {
        int total = 0;
        for (int x : nums) total += (x >> bit) & 1;
        // bit 31 lands on sign bit, so negatives come out right
        if (total % 3 != 0) ans |= 1 << bit;
    }
    return ans;
}

int singleNumberII(int[] nums) {
    // ones = bits seen 1 time mod 3, twos = bits seen 2 times mod 3
    // Each bit steps 0, 1, 2, 0 as it reappears
    int ones = 0, twos = 0;
    for (int x : nums) {
        // flip into ones unless bit already in twos (third sighting)
        ones = (ones ^ x) & ~twos;
        // flip into twos unless bit just landed in ones
        twos = (twos ^ x) & ~ones;
    }
    return ones;
}
```

```cpp
int singleNumberIICounts(vector<int>& nums) {
    // Sum each bit position over nums; triples add 0 mod 3
    // Leftover bit count mod 3 = that bit of answer
    // unsigned, so setting bit 31 is defined
    unsigned ans = 0;
    for (int bit = 0; bit < 32; bit++) {
        int total = 0;
        for (int x : nums) total += ((unsigned)x >> bit) & 1;
        if (total % 3 != 0) ans |= 1u << bit;
    }
    return (int)ans;
}

int singleNumberII(vector<int>& nums) {
    // ones = bits seen 1 time mod 3, twos = bits seen 2 times mod 3
    // Each bit steps 0, 1, 2, 0 as it reappears
    int ones = 0, twos = 0;
    for (int x : nums) {
        // flip into ones unless bit already in twos (third sighting)
        ones = (ones ^ x) & ~twos;
        // flip into twos unless bit just landed in ones
        twos = (twos ^ x) & ~ones;
    }
    return ones;
}
```

Both are **O(n) time and O(1) space**; the two-mask version does one pass instead of 32. Interviewers usually accept the bit count and ask for the masks as a follow-up.

The pitfalls:

- **Update order matters.** `twos` must use the *new* `ones`. Computing both from the old values (or swapping the two lines) breaks the 0, 1, 2 cycle.
- **Negative numbers in the bit-count version.** Python's bit 31 just makes a big positive number, so convert back by subtracting 2³². In C++ build the answer as `unsigned`, since `1 << 31` on an `int` overflows. The two-mask version needs no fix in any language: it works bit by bit, sign bits included.

## Adding binary strings

*Add binary*: given two binary strings such as `"1011"` and `"11"`, return their sum as a binary string (`"1110"`). Converting to integers breaks in Java and C++ once a string passes 63 bits (inputs go up to 10⁴ digits), so add the way you would on paper.

Walk both strings from the right end. In each column, add the two bits (0 once a string has run out) and the **carry** from the column to the right. The total is 0 to 3: its low bit (`total & 1`) is this column's digit, and its high bit (`total >> 1`) carries into the next column. Keep going while either string has digits left **or** a carry remains.

```diagram
{"type":"array","rows":[{"label":"carry in","values":[0,1,1,0]},{"label":"a","values":[1,0,1,1]},{"label":"b","values":[0,0,1,1]},{"label":"sum","values":[1,1,1,0],"highlight":[0,1,2,3]}],"indices":false,"caption":"1011 + 11 = 1110, read right to left. The last column totals 2 (digit 0, carry 1), the next 3 (digit 1, carry 1), then 1 and 1."}
```

```python
def add_binary(a, b):
    # Grade-school addition from right end, one column at a time
    # Column total = bit of a + bit of b + carry (0 to 3)
    i, j = len(a) - 1, len(b) - 1
    carry = 0
    out = []
    # until both strings and carry run out
    while i >= 0 or j >= 0 or carry:
        total = carry
        if i >= 0:
            total += int(a[i])
            i -= 1
        if j >= 0:
            total += int(b[j])
            j -= 1
        # low bit stays in column, high bit carries left
        out.append(str(total & 1))
        carry = total >> 1
    # bits came out lowest first
    return "".join(reversed(out))
```

```java
String addBinary(String a, String b) {
    // Grade-school addition from right end, one column at a time
    // Column total = bit of a + bit of b + carry (0 to 3)
    int i = a.length() - 1, j = b.length() - 1, carry = 0;
    StringBuilder out = new StringBuilder();
    // until both strings and carry run out
    while (i >= 0 || j >= 0 || carry > 0) {
        int total = carry;
        if (i >= 0) total += a.charAt(i--) - '0';
        if (j >= 0) total += b.charAt(j--) - '0';
        // low bit stays in column, high bit carries left
        out.append(total & 1);
        carry = total >> 1;
    }
    // bits came out lowest first
    return out.reverse().toString();
}
```

```cpp
string addBinary(const string& a, const string& b) {
    // Grade-school addition from right end, one column at a time
    // Column total = bit of a + bit of b + carry (0 to 3)
    int i = a.size() - 1, j = b.size() - 1, carry = 0;
    string out;
    // until both strings and carry run out
    while (i >= 0 || j >= 0 || carry > 0) {
        int total = carry;
        if (i >= 0) total += a[i--] - '0';
        if (j >= 0) total += b[j--] - '0';
        // low bit stays in column, high bit carries left
        out += char('0' + (total & 1));
        carry = total >> 1;
    }
    // bits came out lowest first
    reverse(out.begin(), out.end());
    return out;
}
```

**O(max(m, n)) time**, plus the output. Pitfalls:

- **Dropping the final carry.** `"1" + "1"` must be `"10"`, which is why the loop also runs while `carry` is set.
- **Prepending to the result.** Building the string front-first copies it every time, O(n²); append and reverse once.
- **Converting the whole string.** In Python `bin(int(a, 2) + int(b, 2))[2:]` is correct (integers are unbounded) and fine if you say why; `Integer.parseInt(a, 2)` and `stoi(a, nullptr, 2)` overflow past 31 bits.

The same loop adds decimal strings (*add strings*: digit `total % 10`, carry `total / 10`) and numbers stored as linked lists (*add two numbers*). Without strings, the bit-level version is the `a ^ b` plus `(a & b) << 1` loop from the XOR section.

## Counting bits

The number of 1 bits in `x` is its **popcount** (also called its **Hamming weight**). The loop below, often credited to Brian Kernighan, runs once per set bit rather than once per bit, because each `x & (x - 1)` clears one.

To count bits for every number from 0 to `n`, reuse smaller answers: `i >> 1` is `i` without its last bit, so `bits[i] = bits[i >> 1] + (i & 1)`. That's O(n) for the whole table.

```python
def hamming_weight(n):
    """Set bits in n >= 0. For a negative 32-bit value, pass n & 0xFFFFFFFF."""
    count = 0
    while n:
        n &= n - 1                # clear the lowest set bit
        count += 1
    return count

def count_bits(n):
    """bits[i] = number of set bits in i, for every i in 0..n."""
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
```

```java
int hammingWeight(int n) {        // works for negative n: the int is exactly 32 bits
    int count = 0;
    while (n != 0) {
        n &= n - 1;               // clear the lowest set bit
        count++;
    }
    return count;
}

int[] countBits(int n) {
    int[] bits = new int[n + 1];
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
    return bits;
}
```

```cpp
int hammingWeight(uint32_t n) {
    int count = 0;
    while (n) {
        n &= n - 1;               // clear the lowest set bit
        count++;
    }
    return count;
}

vector<int> countBits(int n) {
    vector<int> bits(n + 1, 0);
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
    return bits;
}
```

In Python, `hamming_weight(-1)` would loop forever: `-1` has infinitely many 1s. Mask to the width you mean first.

In practice, use the built-ins. They usually compile to a single CPU instruction.

| | Python | Java | C++ |
|---|---|---|---|
| Popcount | `x.bit_count()` (3.10+), `bin(x).count('1')` | `Integer.bitCount(x)`, `Long.bitCount(x)` | `__builtin_popcount(x)`, `__builtin_popcountll(x)`; C++20 `std::popcount` |
| Trailing zeros | `(x & -x).bit_length() - 1` | `Integer.numberOfTrailingZeros(x)` | `__builtin_ctz(x)` (undefined for 0); C++20 `std::countr_zero` |
| Bit length | `x.bit_length()` | `32 - Integer.numberOfLeadingZeros(x)` | C++20 `std::bit_width` |
| Binary string | `bin(x)`, `format(x, '08b')` | `Integer.toBinaryString(x)` | `bitset<32>(x).to_string()` |

The C++20 functions in `<bit>` take unsigned types only. `bitset<N>` is also handy for fixed-size sets of flags: `count()`, `test(i)`, `set(i)` and `flip(i)`.

## Enumerating subsets with bitmasks

A set of `n` items fits in an `n`-bit integer: bit `i` is 1 when item `i` is in the set. Such an integer is a **bitmask**. Every number from `0` to `2^n - 1` is a different subset, so counting from 0 up enumerates all of them.

```diagram
{"type":"grid","cells":[[0,"000","{ }"],[1,"001","{a}"],[2,"010","{b}"],[3,"011","{a, b}"],[4,"100","{c}"],[5,"101","{a, c}"],[6,"110","{b, c}"],[7,"111","{a, b, c}"]],"colLabels":["mask","bits c b a","subset"],"highlight":[[5,0],[5,1],[5,2]],"caption":"Items a, b, c are bits 0, 1, 2. Mask 5 = 101 has bits 0 and 2 set, so it means {a, c}."}
```

Set operations become single instructions: union is `a | b`, intersection is `a & b`, "is `i` in the set" is `(mask >> i) & 1`, and the size is the popcount.

```python
def subsets(nums):
    n = len(nums)
    result = []
    for mask in range(1 << n):                    # 0 .. 2^n - 1
        result.append([nums[i] for i in range(n) if (mask >> i) & 1])
    return result
```

```java
List<List<Integer>> subsets(int[] nums) {
    int n = nums.length;
    List<List<Integer>> result = new ArrayList<>();
    for (int mask = 0; mask < (1 << n); mask++) {     // 0 .. 2^n - 1
        List<Integer> subset = new ArrayList<>();
        for (int i = 0; i < n; i++)
            if (((mask >> i) & 1) == 1) subset.add(nums[i]);
        result.add(subset);
    }
    return result;
}
```

```cpp
vector<vector<int>> subsets(const vector<int>& nums) {
    int n = nums.size();
    vector<vector<int>> result;
    for (int mask = 0; mask < (1 << n); mask++) {     // 0 .. 2^n - 1
        vector<int> subset;
        for (int i = 0; i < n; i++)
            if ((mask >> i) & 1) subset.push_back(nums[i]);
        result.push_back(subset);
    }
    return result;
}
```

That's **O(n · 2^n)**, the same as the recursive version in [recursion & backtracking](/learn/recursion-backtracking), and fine up to about `n = 20` (a million subsets). Past that, 2^n is too big for any method that lists them all.

To visit every **submask** of a mask `m` (every subset of a subset), use `for (s = m; s > 0; s = (s - 1) & m)` and handle the empty set separately. Over all masks this totals O(3^n), not O(4^n).

### Sum of all subset XORs

*Sum of all subset XOR totals*: XOR each of the 2ⁿ subsets of `nums` and add up the results. For `[5, 1, 6]` the eight XORs are 0, 5, 1, 6, 4, 3, 7 and 2, which sum to 28. Enumerating masks works for small `n` in O(n · 2ⁿ), but there's a one-line answer:

**sum = (OR of all values) · 2ⁿ⁻¹**

Take one bit position `k`. If no value has bit `k`, no subset's XOR has it. If some value `v` has it, pair every subset with the same subset with `v` toggled (added if absent, removed if present). The two XORs differ by exactly `v`, so bit `k` is set in exactly one subset of each pair: in half of the 2ⁿ subsets, 2ⁿ⁻¹ of them. So every bit that appears anywhere adds `2ᵏ · 2ⁿ⁻¹`, and the bits that appear anywhere are exactly the OR. For `[5, 1, 6]`: the OR is 7, and 7 · 4 = 28.

```python
def subset_xor_sum(nums):
    # Bit set in any value is set in XOR of exactly half of 2^n subsets
    # So each such bit adds 2^(n-1) times its value; OR collects those bits
    # every bit that appears in some value
    seen = 0
    for v in nums:
        seen |= v
    # times 2^(n-1)
    return seen << (len(nums) - 1)
```

```java
int subsetXORSum(int[] nums) {
    // Bit set in any value is set in XOR of exactly half of 2^n subsets
    // So each such bit adds 2^(n-1) times its value; OR collects those bits
    // every bit that appears in some value
    int seen = 0;
    for (int v : nums) seen |= v;
    // times 2^(n-1)
    return seen << (nums.length - 1);
}
```

```cpp
int subsetXORSum(vector<int>& nums) {
    // Bit set in any value is set in XOR of exactly half of 2^n subsets
    // So each such bit adds 2^(n-1) times its value; OR collects those bits
    // every bit that appears in some value
    int seen = 0;
    for (int v : nums) seen |= v;
    // times 2^(n-1)
    return seen << (nums.size() - 1);
}
```

**O(n) time, O(1) space.** Pitfalls: the shift overflows once the result needs more than 31 bits (fine for this problem's `n ≤ 12` and values up to 20; use a 64-bit type otherwise), and an empty array would shift by −1 (its sum is 0, so handle it first). The pairing argument is worth keeping: whenever any element qualifies, exactly 2ⁿ⁻¹ subsets have an odd XOR at that bit, or an odd sum.

### Bitmask DP

When a problem says "`n ≤ 20`" and asks about choosing or ordering items, the state is often "which items are used so far", stored as a mask. `dp[mask]` or `dp[mask][last]` then has 2^n or 2^n · n entries. Typical examples: the travelling salesman problem in O(2^n · n²), assigning `n` jobs to `n` workers, partitioning into `k` equal-sum subsets, and "shortest path visiting all nodes" (BFS over `(node, mask)` states). See [dynamic programming](/learn/dynamic-programming) for how to build the transitions.

## Interview problems and pitfalls

| Problem | Idea |
|---|---|
| Single number | XOR everything |
| Single number II (others appear three times) | count each bit position mod 3, or the `ones` / `twos` masks |
| Single number III (two singles) | XOR, then split on the lowest set bit |
| Missing number | XOR indices with values (or use `n(n+1)/2`) |
| Number of 1 bits | `x & (x - 1)` loop, or a popcount built-in |
| Counting bits | `bits[i] = bits[i >> 1] + (i & 1)` |
| Power of two | `x > 0 and (x & (x - 1)) == 0` |
| Reverse bits | shift the low bit out of `x` and into the result, 32 times |
| Sum of two integers | `a ^ b` plus carries `(a & b) << 1`, repeated |
| Bitwise AND of a range | the common binary prefix of the two ends |
| Maximum XOR of two numbers | a binary [trie](/learn/tries) on the bits, highest first |
| Add binary | add from the right end with a carry |
| Sum of all subset XOR totals | `(OR of all values) << (n - 1)` |

- **Parenthesise** every bitwise expression mixed with `==`, `+` or `<<`. Even `1 << n - 1` means `1 << (n - 1)`.
- **Use the right width.** `1 << 31` is negative in Java and C++, and `1 << 40` is wrong; use `1L` / `1LL`, or unsigned types.
- **Python negatives** have infinite sign bits: mask with `0xFFFFFFFF` when a problem talks about 32-bit integers, and convert back at the end.
- **`>>` vs `>>>`** in Java: only `>>>` fills with zeros.
- **`__builtin_ctz(0)` and `__builtin_clz(0)` are undefined.** Check for zero first.
- **Readability.** Bit tricks are fast but cryptic. In an interview, say what each line does ("this clears the lowest set bit").
