import { describe, expect, it } from 'vitest';
import { codeOnly, hasComments, stripComments } from './comments';

describe('stripComments', () => {
  it('drops comment lines and trailing comments in Python, keeping # inside strings', () => {
    const src = ['def f(s):', '    # count the hashes', '    n = s.count("#")  # inline', "    t = '#not a comment'", '', '    return n  # done'].join('\n');
    expect(stripComments(src, 'python3')).toBe(['def f(s):', '    n = s.count("#")', "    t = '#not a comment'", '', '    return n'].join('\n'));
  });

  it('keeps docstrings and triple-quoted strings', () => {
    const src = 'def f():\n    """Doc # with hash\n    still doc"""\n    return 1  # one';
    expect(stripComments(src, 'python3')).toBe('def f():\n    """Doc # with hash\n    still doc"""\n    return 1');
  });

  it('handles // and /* */ in Java and C++, not inside strings or chars', () => {
    const src = [
      'int f(String s) {',
      '    // line comment',
      '    String u = "http://x"; // url',
      "    char c = '/';",
      '    /* block',
      '       comment */',
      '    int x = 1; /* tail */ int y = 2;',
      '    return x + y;',
      '}',
    ].join('\n');
    expect(stripComments(src, 'java')).toBe(['int f(String s) {', '    String u = "http://x";', "    char c = '/';", '    int x = 1;  int y = 2;', '    return x + y;', '}'].join('\n'));
  });

  it('treats C++ digit separators and raw strings correctly', () => {
    const src = 'long n = 1\'000\'000; // a million\nauto r = R"(// not a comment)";';
    expect(stripComments(src, 'cpp')).toBe('long n = 1\'000\'000;\nauto r = R"(// not a comment)";');
  });

  it('compares code ignoring comments and blank lines', () => {
    const a = 'x = 1\ny = 2';
    const b = '# set up\nx = 1  # first\n\n# then\ny = 2';
    expect(codeOnly(a, 'python3')).toBe(codeOnly(b, 'python3'));
    expect(codeOnly('x = 1\ny = 3', 'python3')).not.toBe(codeOnly(b, 'python3'));
    expect(hasComments(b, 'python3')).toBe(true);
    expect(hasComments(a, 'python3')).toBe(false);
  });
});
