import { Fragment, type CSSProperties } from 'react';
import { highlight, type HiLang } from '../syntax/highlight';

/** Leading whitespace of a line, in columns (tab = 4), capped so wrapped text keeps some room. */
export function indentCols(line: string, cap = 16): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n++;
    else if (ch === '\t') n += 4;
    else break;
  }
  return Math.min(n, cap);
}

/**
 * Width of the comment marker ("// " or "# ") when the whole line is a comment, else 0. Wrapped comment lines
 * continue under their text (like a paragraph) instead of hanging past the indent with a rail.
 */
export function commentMarker(line: string, lang?: HiLang): number {
  const t = line.trimStart();
  if (lang === 'sql') return t.startsWith('--') ? 3 : 0;
  if (lang !== 'python3' && lang !== 'shell' && t.startsWith('//')) return 3;
  if (lang !== 'java' && lang !== 'cpp' && lang !== 'js' && t.startsWith('#')) return 2;
  return 0;
}

/** Hanging indent for a wrapped line, in columns: 2 past the indentation, or under the text for a comment. */
export function hangCols(line: string, lang?: HiLang): number {
  const note = commentMarker(line, lang);
  return note ? indentCols(line) + note - 2 : indentCols(line);
}

/** Style for one code line: `--ind` sets the hanging indent used when phones wrap long lines (index.css). */
export const lineStyle = (line: string, lang?: HiLang) => ({ '--ind': `${hangCols(line, lang)}ch` }) as CSSProperties;

/** One line: its leading whitespace in a span that never wraps (see index.css .code-ind), then the code. */
function Line({ text, lang }: { text: string; lang?: HiLang }) {
  const ws = /^[ \t]*/.exec(text)![0];
  const rest = text.slice(ws.length);
  const code = lang ? highlight(rest, lang) : rest;
  return ws && rest ? (
    <>
      <span className="code-ind">{ws}</span>
      {code}
    </>
  ) : lang ? (
    highlight(text, lang)
  ) : (
    text
  );
}

/**
 * Code as one span per line. Wide screens see an ordinary <pre>; on phones (unless Settings → scroll)
 * each line wraps with a hanging indent and a thin rail beside the wrapped part.
 */
export function CodeLines({ code, lang }: { code: string; lang?: HiLang }) {
  const lines = code.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          <span className={commentMarker(line, lang) ? 'code-line code-note' : 'code-line'} style={lineStyle(line, lang)}>
            <Line text={line} lang={lang} />
          </span>
          {i < lines.length - 1 && <span className="code-nl">{'\n'}</span>}
        </Fragment>
      ))}
    </>
  );
}
