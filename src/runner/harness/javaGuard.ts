/**
 * CheerpJ runs Java on the page's main thread and never yields inside a busy loop, so a runaway
 * program would freeze the tab (and no timer could stop it). We therefore make Java stop itself:
 * a cheap `LearnGuard.tick()` is inserted at the start of every loop body and method body. When the
 * time budget is exceeded, tick() throws, the harness reports a time limit, and control returns.
 *
 * Edits never add newlines, so compiler line numbers stay aligned with the user's code.
 */

const TICK = 'LearnGuard.tick();';
const NO_TICK_BLOCK = new Set(['if', 'switch', 'catch', 'synchronized', 'try', 'return', 'new', 'else', 'assert', 'throw']);
const LOOP = new Set(['for', 'while']);

interface ParenInfo {
  /** Identifier immediately before `(` ('' if none). */
  word: string;
  /** Identifier before that (e.g. `new` in `new Foo(`). */
  prevWord: string;
  /** Last significant character before `word` (used to spot the `} while (...)` of a do-while). */
  charBeforeWord: string;
}

function isIdentChar(c: string | undefined): boolean {
  return c !== undefined && /[A-Za-z0-9_$]/.test(c);
}

/** Index just past a string/char/text-block literal starting at i. */
function skipLiteral(code: string, i: number): number {
  if (code.startsWith('"""', i)) {
    const j = code.indexOf('"""', i + 3);
    return j === -1 ? code.length : j + 3;
  }
  const q = code[i];
  let j = i + 1;
  while (j < code.length && code[j] !== q && code[j] !== '\n') {
    if (code[j] === '\\') j++;
    j++;
  }
  return j + 1;
}

/** Index just past a comment starting at i, or i if there is none. */
function skipComment(code: string, i: number): number {
  if (code[i] === '/' && code[i + 1] === '/') {
    const j = code.indexOf('\n', i);
    return j === -1 ? code.length : j;
  }
  if (code[i] === '/' && code[i + 1] === '*') {
    const j = code.indexOf('*/', i + 2);
    return j === -1 ? code.length : j + 2;
  }
  return i;
}

/** Skip whitespace and comments. */
function skipTrivia(code: string, i: number): number {
  for (;;) {
    while (i < code.length && /\s/.test(code[i])) i++;
    const j = skipComment(code, i);
    if (j === i) return i;
    i = j;
  }
}

/** For a single-statement loop body starting at i, return the index just past its terminating `;`, or -1. */
function simpleStatementEnd(code: string, i: number): number {
  let j = i;
  while (isIdentChar(code[j])) j++;
  const firstWord = code.slice(i, j);
  if (['if', 'for', 'while', 'do', 'try', 'switch', 'synchronized'].includes(firstWord)) return -1;
  let depth = 0;
  for (let k = i; k < code.length; ) {
    const c = code[k];
    if (c === '"' || c === "'") {
      k = skipLiteral(code, k);
      continue;
    }
    const after = skipComment(code, k);
    if (after !== k) {
      k = after;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return -1;
      depth--;
    } else if (c === ';' && depth === 0) return k + 1;
    k++;
  }
  return -1;
}

export function instrumentJava(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;
  const parens: ParenInfo[] = [];
  let w1 = ''; // last identifier
  let w2 = ''; // identifier before that
  let lastSig = ''; // last significant char emitted (non-space, non-comment)
  let charBeforeW1 = '';
  let closed: ParenInfo | null = null; // set right after a `)` (and kept through a `throws` clause)
  let inThrows = false;

  while (i < n) {
    const c = code[i];
    if (c === '"' || c === "'") {
      const j = skipLiteral(code, i);
      out += code.slice(i, j);
      i = j;
      lastSig = c;
      closed = null;
      w1 = '';
      continue;
    }
    const afterComment = skipComment(code, i);
    if (afterComment !== i) {
      out += code.slice(i, afterComment);
      i = afterComment;
      continue;
    }
    if (/\s/.test(c)) {
      out += c;
      i++;
      continue;
    }
    if (isIdentChar(c)) {
      let j = i;
      while (isIdentChar(code[j])) j++;
      const word = code.slice(i, j);
      out += word;
      i = j;
      if (closed && (word === 'throws' || inThrows)) inThrows = true;
      else closed = null;
      charBeforeW1 = lastSig;
      w2 = w1;
      w1 = word;
      lastSig = word[word.length - 1];
      if (word === 'do') {
        const k = skipTrivia(code, i);
        if (code[k] === '{') {
          out += code.slice(i, k + 1) + ' ' + TICK;
          i = k + 1;
          lastSig = '{';
          w1 = '';
        }
      }
      continue;
    }
    if (c === '(') {
      parens.push({ word: isIdentChar(lastSig) ? w1 : '', prevWord: isIdentChar(lastSig) ? w2 : '', charBeforeWord: charBeforeW1 });
      closed = null;
      inThrows = false;
    } else if (c === ')') {
      const info = parens.pop() ?? { word: '', prevWord: '', charBeforeWord: '' };
      out += c;
      i++;
      lastSig = c;
      closed = info;
      inThrows = false;
      if (LOOP.has(info.word)) {
        // Decide what follows the loop header.
        const k = skipTrivia(code, i);
        if (code[k] === '{') {
          out += code.slice(i, k + 1) + ' ' + TICK;
          i = k + 1;
          lastSig = '{';
          closed = null;
        } else if (code[k] === ';') {
          // `while (x);` has an empty body; `} while (x);` ends a do-while (already ticked).
          if (!(info.word === 'while' && info.charBeforeWord === '}')) {
            out += code.slice(i, k) + `{ ${TICK} }`;
            i = k + 1;
            lastSig = '}';
          }
          closed = null;
        } else {
          const end = simpleStatementEnd(code, k);
          if (end !== -1) {
            out += code.slice(i, k) + `{ ${TICK} ` + code.slice(k, end) + ' }';
            i = end;
            lastSig = '}';
          }
          closed = null;
        }
      }
      continue;
    } else if (c === '{') {
      const isMethodBody =
        closed !== null && closed.word !== '' && !NO_TICK_BLOCK.has(closed.word) && !LOOP.has(closed.word) && closed.prevWord !== 'new';
      out += c;
      i++;
      if (isMethodBody) out += ' ' + TICK;
      lastSig = c;
      closed = null;
      inThrows = false;
      w1 = '';
      continue;
    } else if (!(inThrows && (c === '.' || c === ','))) {
      closed = null;
      inThrows = false;
    }
    out += c;
    i++;
    lastSig = c;
  }
  return out;
}

export const JAVA_GUARD_CLASSES = `
final class LearnTimeout extends Error {
    LearnTimeout() { super("time limit exceeded", null, false, false); }
}
final class LearnGuard {
    static long deadline = Long.MAX_VALUE;
    static int n;
    static void tick() { if ((++n & 1023) == 0 && System.nanoTime() > deadline) throw new LearnTimeout(); }
}
`;
