/**
 * LeetCode compiles C++ for 64-bit Linux, where `long` is 64 bits. The browser compiles to wasm32, where
 * `long` (like `size_t` and pointers) is 32 bits, so `long x = 1e5; x * x` would silently overflow.
 *
 * `lp64` rewrites the player's code so `long` means `long long`, outside strings and comments:
 *   - the `long` keyword (`long`, `unsigned long`, `long int`; `long long` and `long double` stay),
 *   - integer literals with an `L` suffix (`0L`, `1UL`),
 *   - names tied to `long`: LONG_MAX / LONG_MIN / ULONG_MAX, stol / stoul, labs, atol, strtol,
 *     lround / lrint and the `l` builtins (`__builtin_popcountl` …),
 *   - `%ld` / `%lu` … in string literals (printf formats).
 * Only text inside a line changes, so line numbers in compiler errors still match the editor.
 * On a 64-bit machine (native validation) the result means the same as the original.
 */

const NAMES: Record<string, string> = {
  LONG_MAX: 'LLONG_MAX',
  LONG_MIN: 'LLONG_MIN',
  ULONG_MAX: 'ULLONG_MAX',
  stol: 'stoll',
  stoul: 'stoull',
  labs: 'llabs',
  atol: 'atoll',
  strtol: 'strtoll',
  strtoul: 'strtoull',
  lround: 'llround',
  lrint: 'llrint',
  __builtin_popcountl: '__builtin_popcountll',
  __builtin_clzl: '__builtin_clzll',
  __builtin_ctzl: '__builtin_ctzll',
  __builtin_ffsl: '__builtin_ffsll',
  __builtin_parityl: '__builtin_parityll',
  __builtin_labs: '__builtin_llabs',
};
const NAME_RE = new RegExp(`\\b(${Object.keys(NAMES).join('|')})\\b`, 'g');

function rewriteCode(s: string): string {
  return (
    s
      // A lone `long` (not part of `long long`, not `long double`) becomes `long long`. Whitespace inside
      // `long long` is kept as written (it may span lines).
      .replace(/\blong\b(?:(\s+)long\b)?(?!\s+double\b)/g, (m, ws: string | undefined) => (ws === undefined ? 'long long' : m))
      // Integer literals with a single L suffix: 0L → 0LL, 1UL → 1ULL, 2LU → 2LLU.
      .replace(/(?<![\w.'])((?:0[xX][0-9a-fA-F']+|0[bB][01']+|\d[\d']*)[uU]?)([lL])(?![\w.'])/g, (_m, num: string, l: string) => `${num}${l}${l}`)
      .replace(/(?<![\w.'])((?:0[xX][0-9a-fA-F']+|0[bB][01']+|\d[\d']*))([lL])([uU])(?![\w.'])/g, (_m, num: string, l: string, u: string) => `${num}${l}${l}${u}`)
      .replace(NAME_RE, (m) => NAMES[m] ?? m)
  );
}

/** printf-style `%ld` → `%lld` (the argument is now a long long). `%lld`, `%lf` are left alone. */
function rewriteString(s: string): string {
  return s.replace(/%([-+ #0]*(?:\d+|\*)?(?:\.(?:\d+|\*))?)l([diouxX])/g, (m, spec: string, conv: string, at: number) => (s[at - 1] === '%' ? m : `%${spec}ll${conv}`));
}

const isWord = (c: string | undefined) => !!c && /\w/.test(c);

export function lp64(src: string): string {
  let out = '';
  let i = 0;
  let code = 0; // start of the pending code run
  const flush = (end: number) => {
    out += rewriteCode(src.slice(code, end));
  };
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      flush(i);
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out += src.slice(i, stop);
      i = code = stop;
      continue;
    }
    if (c === '/' && next === '*') {
      flush(i);
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop);
      i = code = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      // The identifier just before the quote: an encoding prefix (L, u, U, u8) and/or R for raw strings.
      let p = i;
      while (p > code && isWord(src[p - 1])) p--;
      const prefix = src.slice(p, i);
      const isPrefix = /^(?:u8|[uUL])?R?$/.test(prefix) && !(prefix.endsWith('R') && c === "'");
      // `'` right after a digit/letter (not a prefix) is a digit separator (1'000'000) or part of a name.
      if (c === "'" && prefix && !isPrefix) {
        i++;
        continue;
      }
      flush(isPrefix ? p : i);
      const start = isPrefix ? p : i;
      let stop: number;
      if (c === '"' && isPrefix && prefix.endsWith('R')) {
        const open = src.indexOf('(', i);
        const delim = open === -1 ? '' : src.slice(i + 1, open);
        const close = open === -1 ? -1 : src.indexOf(`)${delim}"`, open);
        stop = close === -1 ? src.length : close + delim.length + 2;
        out += src.slice(start, stop);
      } else {
        let j = i + 1;
        while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        stop = Math.min(src.length, src[j] === c ? j + 1 : j);
        const body = src.slice(start, stop);
        out += c === '"' ? rewriteString(body) : body;
      }
      i = code = stop;
      continue;
    }
    i++;
  }
  flush(src.length);
  return out;
}
