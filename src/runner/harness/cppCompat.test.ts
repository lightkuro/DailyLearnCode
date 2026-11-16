import { describe, expect, it } from 'vitest';
import { lp64 } from './cppCompat';

describe('lp64 (C++ long is 64-bit, like LeetCode)', () => {
  it('turns a lone long into long long, leaving long long / long double alone', () => {
    expect(lp64('long a = 0; unsigned long b; long int c;')).toBe('long long a = 0; unsigned long long b; long long int c;');
    expect(lp64('long long a; long double d; long\n  long e;')).toBe('long long a; long double d; long\n  long e;');
    expect(lp64('vector<long> v; (long)x * y; numeric_limits<long>::max()')).toBe('vector<long long> v; (long long)x * y; numeric_limits<long long>::max()');
    expect(lp64('int longest = 0, my_long = 1; long_val++;')).toBe('int longest = 0, my_long = 1; long_val++;');
  });
  it('rewrites L literals, LONG_MAX and long-only functions', () => {
    expect(lp64('accumulate(a.begin(), a.end(), 0L); x = 1UL << 40; y = 7LU; z = 0x1FL;')).toBe('accumulate(a.begin(), a.end(), 0LL); x = 1ULL << 40; y = 7LLU; z = 0x1FLL;');
    expect(lp64('a = 5LL; b = 1.5L; c = 1e5L; d = 1\'000L;')).toBe("a = 5LL; b = 1.5L; c = 1e5L; d = 1'000LL;");
    expect(lp64('m = LONG_MAX; n = std::stol(s); k = __builtin_popcountl(x); q = labs(v);')).toBe('m = LLONG_MAX; n = std::stoll(s); k = __builtin_popcountll(x); q = llabs(v);');
  });
  it('leaves comments, strings and chars alone (except printf %ld)', () => {
    const src = '// a long comment\nlong x; /* long */ string s = "so long"; char c = \'l\';\nprintf("%ld %5lu %lld %lf\\n", a, b, c, d);';
    expect(lp64(src)).toBe('// a long comment\nlong long x; /* long */ string s = "so long"; char c = \'l\';\nprintf("%lld %5llu %lld %lf\\n", a, b, c, d);');
    expect(lp64('auto r = R"(long "x" 1L)"; long y;')).toBe('auto r = R"(long "x" 1L)"; long long y;');
    expect(lp64("int big = 1'000'000; long z;")).toBe("int big = 1'000'000; long long z;");
  });
  it('keeps the line count', () => {
    const src = 'class Solution {\npublic:\n  long f(long n) {\n    return n * 1L; // long\n  }\n};\n';
    expect(lp64(src).split('\n').length).toBe(src.split('\n').length);
  });
});
