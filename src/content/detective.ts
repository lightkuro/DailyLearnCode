import type { Lang } from '../runner/harness/types';
import { GAP_MARK, type CaseCode, type DetectiveCase } from './schema';

export const isGap = (line: string): boolean => line.trim() === GAP_MARK;
export const indentOf = (line: string): string => line.slice(0, line.length - line.trimStart().length);

/** The snippet with each gap replaced by the matching answer (indented like the gap). */
export function fillGaps(lines: string[], answers: string[]): string[] {
  let k = 0;
  return lines.map((l) => (isGap(l) ? indentOf(l) + (answers[k++] ?? '').trim() : l));
}

/** The code that is correct: the fixed version, or the gaps filled with the reference answer. */
export function fixedLines(v: CaseCode): string[] {
  return v.missing ? fillGaps(v.lines, v.missing) : (v.fixed ?? v.lines);
}

/** The code exactly as shown (gaps dropped), i.e. the buggy program. */
export function shownProgram(v: CaseCode): string[] {
  return v.lines.filter((l) => !isGap(l));
}

/** The version to show for a language: the player's language if the case has it, else the first one. */
export function caseLang(c: DetectiveCase, lang: Lang): Lang {
  if (c.code[lang]) return lang;
  return (['python3', 'java', 'cpp'] as const).find((l) => c.code[l])!;
}

/** Line diff (LCS) between the shown snippet and the fix, for the reveal. */
export function lineDiff(a: string[], b: string[]): { kind: 'same' | 'del' | 'add'; text: string; n?: number }[] {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { kind: 'same' | 'del' | 'add'; text: string; n?: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i], n: i + 1 });
      i++;
      j++;
    } else if (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1])) {
      out.push({ kind: 'del', text: a[i], n: i + 1 });
      i++;
    } else {
      out.push({ kind: 'add', text: b[j++] });
    }
  }
  return out;
}
