import type { Lang } from '../runner/harness/types';

/**
 * Comments in solution code: a small lexer per language that knows strings and character literals, so a `#` or `//`
 * inside a string is left alone. Used to hide comments (the "Comments" toggle) and, in scripts, to check that an edit
 * changed nothing but comments.
 */

interface Lexed {
  /** The code with every comment cut out (newlines inside block comments kept). */
  code: string;
  /** Per line: did a comment start or run on it? */
  commented: boolean[];
}

function lexPython(src: string): Lexed {
  let out = '';
  const commented: boolean[] = [false];
  let line = 0;
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    if (c === '\n') {
      out += c;
      commented[++line] = false;
      i++;
    } else if (c === '#') {
      commented[line] = true;
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '"' || c === "'") {
      const triple = src.startsWith(c.repeat(3), i);
      const end = triple ? c.repeat(3) : c;
      let j = i + end.length;
      while (j < src.length && !src.startsWith(end, j)) {
        if (src[j] === '\\') j++;
        else if (!triple && src[j] === '\n') break; // unterminated: stop at the line end
        j++;
      }
      j = Math.min(src.length, src.startsWith(end, j) ? j + end.length : j);
      const s = src.slice(i, j);
      out += s;
      for (const ch of s) if (ch === '\n') commented[++line] = false;
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return { code: out, commented };
}

function lexCLike(src: string): Lexed {
  let out = '';
  const commented: boolean[] = [false];
  let line = 0;
  const copy = (s: string) => {
    out += s;
    for (const ch of s) if (ch === '\n') commented[++line] = false;
  };
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      commented[line] = true;
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && src[i + 1] === '*') {
      commented[line] = true;
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? src.length : j + 2;
      for (const ch of src.slice(i, j)) {
        if (ch === '\n') {
          out += '\n';
          commented[++line] = true;
        }
      }
      i = j;
    } else if (c === 'R' && src[i + 1] === '"' && !/\w/.test(src[i - 1] ?? '')) {
      // C++ raw string R"delim( … )delim"
      const open = src.indexOf('(', i + 2);
      const delim = open < 0 ? '' : src.slice(i + 2, open);
      const close = open < 0 ? -1 : src.indexOf(`)${delim}"`, open);
      const j = close < 0 ? src.length : close + delim.length + 2;
      copy(src.slice(i, j));
      i = j;
    } else if (c === '"' && src.startsWith('"""', i)) {
      // Java text block
      const close = src.indexOf('"""', i + 3);
      const j = close < 0 ? src.length : close + 3;
      copy(src.slice(i, j));
      i = j;
    } else if (c === '"' || (c === "'" && !/[0-9a-fA-F]/.test(src[i - 1] ?? ''))) {
      // A string or char literal (a ' after a digit is a C++14 digit separator, as in 1'000'000).
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      j = Math.min(src.length, src[j] === c ? j + 1 : j);
      copy(src.slice(i, j));
      i = j;
    } else {
      out += c;
      if (c === '\n') commented[++line] = false;
      i++;
    }
  }
  return { code: out, commented };
}

const lex = (code: string, lang: Lang): Lexed => (lang === 'python3' ? lexPython(code) : lexCLike(code));

/**
 * The code without comments: lines that held only a comment disappear, trailing comments are cut (with the spaces
 * before them), and everything else stays exactly as it was, blank lines included.
 */
export function stripComments(code: string, lang: Lang): string {
  const { code: cut, commented } = lex(code, lang);
  const before = code.split('\n');
  return cut
    .split('\n')
    .flatMap((l, i) => {
      if (!commented[i]) return [l];
      const kept = l.trimEnd();
      return kept.trim() || !before[i]?.trim() ? [kept] : [];
    })
    .join('\n');
}

/** True when the code has at least one comment. */
export function hasComments(code: string, lang: Lang): boolean {
  return lex(code, lang).commented.some(Boolean);
}

/** The code with comments and blank lines removed and line ends trimmed: equal for two versions that differ only in comments. */
export function codeOnly(code: string, lang: Lang): string {
  return stripComments(code, lang)
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .join('\n');
}
