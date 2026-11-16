import { describe, expect, it } from 'vitest';
import { instrumentJava } from './javaGuard';

const T = 'LearnGuard.tick();';

describe('instrumentJava', () => {
  it('ticks at loop bodies and method entries without adding lines', () => {
    const src = `class Solution {
    public int f(int[] a) {
        int s = 0;
        for (int i = 0; i < a.length; i++) {
            while (s > 100) { s--; }
        }
        do { s++; } while (s < 3);
        return s;
    }
}`;
    const out = instrumentJava(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out).toContain(`public int f(int[] a) { ${T}`);
    expect(out).toContain(`i++) { ${T}`);
    expect(out).toContain(`while (s > 100) { ${T} s--; }`);
    expect(out).toContain(`do { ${T} s++; } while (s < 3);`);
    expect(out).toContain('class Solution {\n'); // no tick in class bodies
  });

  it('wraps single-statement and empty loop bodies', () => {
    expect(instrumentJava('void g() { while (x) i++; }')).toBe(`void g() { ${T} while (x) { ${T} i++; } }`);
    expect(instrumentJava('void g() { while (busy()); }')).toBe(`void g() { ${T} while (busy()){ ${T} } }`);
    expect(instrumentJava('void g() { for (;;) if (x) break; }')).toContain('for (;;) if (x) break;');
  });

  it('leaves control blocks, anonymous classes, strings and comments alone', () => {
    const src = `int h() throws Exception { if (a) { b(); } else { c(); } try { d(); } catch (E e) { } switch (k) { default: } String s = "for (;;) {"; // while (x) {
        Comparator<Integer> cmp = new Comparator<Integer>() { public int compare(Integer x, Integer y) { return x - y; } };
        Runnable r = new Runnable() { public void run() {} };
        return 0; }`;
    const out = instrumentJava(src);
    expect(out).toContain(`throws Exception { ${T}`);
    expect(out).toContain('if (a) { b(); }');
    expect(out).toContain('catch (E e) { }');
    expect(out).toContain('switch (k) { default: }');
    expect(out).toContain('"for (;;) {"');
    expect(out).toContain('// while (x) {');
    expect(out).toContain(`new Comparator<Integer>() { public int compare(Integer x, Integer y) { ${T} return`);
    expect(out).toContain(`new Runnable() { public void run() { ${T}}`);
  });
});
