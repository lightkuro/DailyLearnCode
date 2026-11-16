import type { Problem, TestCase } from '../content/schema';
import { buildProgram, makeNonce, mapErrorLines } from './harness';
import type { Lang } from './harness/types';
import { judgeRun, type Judgement } from './harness/verdict';
import { compileTimeout, runProgram, runTimeout } from './manager';

export type JudgeMode = 'run' | 'submit';

export interface JudgeReport extends Judgement {
  mode: JudgeMode;
  lang: Lang;
  tests: TestCase[];
  /** Number of leading tests that are the visible examples. */
  exampleCount: number;
}

/** Compile + run the user's code against the examples (run) or every test (submit) and grade it. */
export async function judge(problem: Problem, lang: Lang, userCode: string, mode: JudgeMode): Promise<JudgeReport> {
  const tests: TestCase[] = mode === 'run' ? problem.examples : [...problem.examples, ...problem.tests];
  const nonce = makeNonce();
  const program = buildProgram(lang, problem.signature, userCode, nonce);
  const budget = runTimeout(lang, problem.timeLimitMs);
  const outcome = await runProgram(lang, {
    source: program.source,
    files: program.files,
    input: JSON.stringify(tests.map((t) => t.args)),
    compileTimeoutMs: compileTimeout(lang),
    // Java enforces its own budget in-JVM; the page timer is only a backstop (see javaGuard.ts).
    runTimeoutMs: lang === 'java' ? budget * 2 + 15_000 : budget,
    budgetMs: budget,
  });
  if (outcome.compileError !== undefined) outcome.compileError = mapErrorLines(lang, outcome.compileError, program);
  outcome.stderr = mapErrorLines(lang, outcome.stderr, program);
  const j = judgeRun(tests, problem.compare, outcome, nonce);
  if (j.message) j.message = mapErrorLines(lang, j.message, program);
  return { ...j, mode, lang, tests, exampleCount: problem.examples.length };
}
