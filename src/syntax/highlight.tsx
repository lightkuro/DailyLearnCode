import type { ReactNode } from 'react';
import { glossKey } from './glossKey';
import type { Lang } from '../runner/harness/types';

/** The editor languages plus a few that only appear in Learn page code fences. */
export type HiLang = Lang | 'js' | 'sql' | 'shell';

const KEYWORDS: Record<HiLang, Set<string>> = {
  python3: new Set(
    'def class return if elif else for while in not and or is None True False lambda import from with as pass break continue yield nonlocal global try except raise del assert'.split(' '),
  ),
  java: new Set(
    'int long double float boolean char byte short void class new return if else for while do break continue static final private public protected var null true false switch case default record this super extends implements interface enum'.split(' '),
  ),
  cpp: new Set(
    'int long double float bool char void auto const struct class return if else for while do break continue nullptr true false switch case default template using namespace static unsigned signed size_t function'.split(' '),
  ),
  js: new Set(
    'const let var function return if else for while do break continue new class extends import from export default async await try catch finally throw typeof instanceof in of null undefined true false this super switch case interface type enum implements readonly as keyof never unknown any void yield static public private protected number string boolean'.split(' '),
  ),
  // Compared in upper case, so `select` and `SELECT` both count.
  sql: new Set(
    'SELECT FROM WHERE AND OR NOT NULL IS IN AS ON JOIN LEFT RIGHT INNER OUTER FULL CROSS GROUP BY ORDER HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX VIEW DROP ALTER ADD PRIMARY KEY FOREIGN REFERENCES UNIQUE CHECK DEFAULT DISTINCT UNION ALL EXISTS BETWEEN LIKE GLOB CASE WHEN THEN ELSE END WITH RECURSIVE OVER PARTITION ROWS RANGE ASC DESC BEGIN COMMIT ROLLBACK TRANSACTION CONFLICT DO NOTHING RETURNING INTEGER TEXT REAL BLOB NUMERIC STRICT AUTOINCREMENT PRAGMA EXPLAIN QUERY PLAN IF TRUE FALSE COLLATE NULLS FIRST LAST USING EXCEPT INTERSECT'.split(' '),
  ),
  shell: new Set('if then else fi for do done while in case esac function return export cd echo'.split(' ')),
};

const CPP_TYPES = new Set(
  'vector string unordered_map unordered_set map set stack queue deque priority_queue pair tuple array greater less stringstream numeric_limits'.split(' '),
);

const TOKEN: Record<HiLang, RegExp> = {
  python3: /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d[\d_]*(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/gm,
  java: /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d[\d_]*(?:\.\d+)?[Ll]?\b)|(\b[A-Za-z_]\w*\b)/gm,
  cpp: /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d[\d_]*(?:\.\d+)?(?:LL|ll|e\d+)?\b)|(\b[A-Za-z_]\w*\b)/gm,
  js: /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?n?\b)|(\b[A-Za-z_$][\w$]*\b)/gm,
  sql: /(--.*$)|('(?:''|[^'])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/gm,
  shell: /((?:^|\s)#.*$)|("(?:\\.|[^"\\])*"|'[^']*')|(\b\d+\b)|(\b[A-Za-z_][\w-]*\b)/gm,
};

/** A comment's opening marker and the spaces after it. */
export const COMMENT_MARK = /^\s*(?:\/\/+|#+|\/\*+|--+)\s*/;

/**
 * Tiny, dependency-free highlighter for cheat-sheet snippets. Identifiers found in `glossary` that
 * are used as calls/members/types (name(…), .name, @name, Name<…>) get a `data-gloss` hook for hover docs.
 */
export function highlight(code: string, lang: HiLang, glossary?: Record<string, unknown>): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(TOKEN[lang])) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const [text, comment, str, num, ident] = m;
    let cls = '';
    // Three tones only: keywords (accent), strings (muted green), comments (faint).
    if (comment) cls = 'text-faint italic';
    else if (str) cls = 'text-good/90';
    else if (ident) {
      if (KEYWORDS[lang].has(lang === 'sql' ? ident.toUpperCase() : ident)) cls = 'text-accent-soft';
      else if (lang !== 'sql' && lang !== 'shell' && (/^[A-Z]/.test(ident) || (lang === 'cpp' && CPP_TYPES.has(ident)))) cls = 'font-semibold';
    }
    void num;
    const before = code[i - 1];
    const after = code.slice(i + text.length).trimStart()[0];
    const glossed = ident && glossary ? glossKey(glossary, ident, before, after) : undefined;
    if (glossed) {
      out.push(
        <span key={k++} data-gloss={glossed} className={`cursor-help underline decoration-faint decoration-dotted underline-offset-[3px] ${cls}`}>
          {text}
        </span>,
      );
    } else if (comment) {
      // The marker ("// ", "# ") stays plain; only the words get the comment highlight.
      const mark = COMMENT_MARK.exec(text)![0];
      out.push(
        <span key={k++} className={cls}>
          {mark}
          <span className="code-comment">{text.slice(mark.length)}</span>
        </span>,
      );
    } else out.push(cls ? <span key={k++} className={cls}>{text}</span> : text);
    last = i + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** The glossary names a snippet links (the same ones highlight() underlines), in order of first use. */
export function glossNames(code: string, lang: Lang, glossary: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(TOKEN[lang])) {
    const ident = m[4];
    if (!ident) continue;
    const i = m.index ?? 0;
    const key = glossKey(glossary, ident, code[i - 1], code.slice(i + m[0].length).trimStart()[0]);
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}
