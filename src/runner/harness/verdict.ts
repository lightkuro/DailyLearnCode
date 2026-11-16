import { compareOutput, type CompareMode } from './compare';
import { parseRunOutput } from './protocol';

export type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'compile_error' | 'internal_error';

export interface CaseResult {
  index: number;
  ok: boolean;
  got?: unknown;
  error?: string;
  stdout: string;
  /** The program produced no result for this case (crash or timeout before reaching it). */
  missing?: boolean;
  /** The program reported running out of time on this case. */
  timedOut?: boolean;
}

export interface Judgement {
  verdict: Verdict;
  passed: number;
  total: number;
  cases: CaseResult[];
  firstFailure?: number;
  /** Compiler output, crash details, etc. */
  message?: string;
  ms?: number;
}

export interface RawRun {
  compileError?: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms?: number;
}

export interface JudgeCase {
  expected: unknown;
}

export function judgeRun(tests: JudgeCase[], compare: CompareMode, run: RawRun, nonce: string): Judgement {
  const total = tests.length;
  if (run.compileError !== undefined) {
    return { verdict: 'compile_error', passed: 0, total, cases: [], message: run.compileError.trim(), ms: run.ms };
  }
  const parsed = parseRunOutput(run.stdout, nonce);
  const cases: CaseResult[] = tests.map((t, index) => {
    const c = parsed.cases.get(index);
    if (!c) return { index, ok: false, missing: true, stdout: '' };
    if (c.kind === 'timeout') return { index, ok: false, missing: true, timedOut: true, stdout: c.stdout };
    if (c.kind === 'error') return { index, ok: false, error: c.error, stdout: c.stdout };
    return { index, ok: compareOutput(t.expected, c.value, compare), got: c.value, stdout: c.stdout };
  });
  const passed = cases.filter((c) => c.ok).length;
  const first = cases.find((c) => !c.ok);
  if (!first) return { verdict: 'accepted', passed, total, cases, ms: run.ms };

  let verdict: Verdict;
  let message: string | undefined;
  if ((run.timedOut || cases.some((c) => c.timedOut)) && first.missing) {
    verdict = 'time_limit';
    message = 'Time limit exceeded — look for an algorithm with better complexity (or an infinite loop).';
    // What the test printed before it ran out of time (streamed from the runtime as it ran).
    const tail = parsed.trailingStdout.trim();
    if (tail && !first.stdout) first.stdout = tail;
  } else if (first.missing) {
    verdict = 'runtime_error';
    const tail = parsed.trailingStdout.trim();
    message = [run.stderr.trim() || 'The program stopped before producing a result for this test.', tail && `stdout before crash:\n${tail}`]
      .filter(Boolean)
      .join('\n\n');
    first.stdout = tail;
  } else if (first.error !== undefined) {
    verdict = 'runtime_error';
    message = first.error;
  } else {
    verdict = 'wrong_answer';
  }
  return { verdict, passed, total, cases, firstFailure: first.index, message, ms: run.ms };
}
