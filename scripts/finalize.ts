/**
 * Turns content/drafts/<date>.json into content/days/<date>.json:
 *   - collects test inputs (examples + edge cases + generatorPy output)
 *   - computes every expected output by running the Python reference solution (never trusting an LLM's answers)
 * Run validate-content afterwards to cross-check the Java and C++ references.
 *
 * Usage: tsx scripts/finalize.ts [draft.json ...]   (default: every draft without a matching day file)
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DailyDraftSchema, DailySetSchema, type DailySet, type ProblemDraft, type Problem } from '../src/content/schema';
import { checkSvg } from '../src/content/svg';
import { buildProgram, makeNonce } from '../src/runner/harness';
import { parseRunOutput } from '../src/runner/harness/protocol';
import { DAYS_DIR, DRAFTS_DIR, listJson, readJson, writeJson } from './lib/days';
import { runNative, runPythonScript } from './lib/native';

const MAX_TESTS = 60;

export function finalizeProblem(draft: ProblemDraft): Problem {
  const exampleInputs = draft.examples.map((e) => e.args);
  let generated: unknown[][] = [];
  if (draft.generatorPy) {
    const out = runPythonScript(draft.generatorPy);
    const parsed = JSON.parse(out);
    if (!Array.isArray(parsed) || !parsed.every(Array.isArray)) throw new Error(`${draft.id}: generator must print a JSON array of arg arrays`);
    generated = parsed;
  }
  const hidden = dedupe([...draft.edgeInputs, ...generated]).slice(0, MAX_TESTS);
  const inputs = [...exampleInputs, ...hidden];
  for (const args of inputs) {
    if (args.length !== draft.signature.params.length) {
      throw new Error(`${draft.id}: input has ${args.length} args, signature has ${draft.signature.params.length}: ${JSON.stringify(args).slice(0, 200)}`);
    }
  }
  const nonce = makeNonce();
  const program = buildProgram('python3', draft.signature, draft.editorial.solutions.python3, nonce);
  const run = runNative(program, JSON.stringify(inputs), 120000);
  if (run.timedOut) throw new Error(`${draft.id}: python reference timed out`);
  const parsed = parseRunOutput(run.stdout, nonce);
  const outputs = inputs.map((_, i) => {
    const c = parsed.cases.get(i);
    if (!c) throw new Error(`${draft.id}: reference produced no output for input ${i}\n${run.stderr.slice(0, 2000)}`);
    if (c.kind === 'error') throw new Error(`${draft.id}: reference threw on input ${i}: ${c.error}`);
    return c.value;
  });
  const { edgeInputs: _e, generatorPy: _g, examples, illustration, ...rest } = draft;
  // A broken or unsafe picture never blocks a day: drop it (the UI falls back to a data diagram).
  const svgErrors = illustration ? checkSvg(illustration.svg) : [];
  if (svgErrors.length) console.warn(`  ! ${draft.id}: illustration dropped (${svgErrors.join('; ')})`);
  return {
    ...rest,
    ...(illustration && !svgErrors.length ? { illustration } : {}),
    examples: examples.map((e, i) => ({ args: e.args, expected: outputs[i], ...(e.explanation ? { explanation: e.explanation } : {}) })),
    tests: hidden.map((args, i) => ({ args, expected: outputs[exampleInputs.length + i] })),
  };
}

function dedupe(inputs: unknown[][]): unknown[][] {
  const seen = new Set<string>();
  return inputs.filter((a) => {
    const k = JSON.stringify(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function finalizeDraft(raw: unknown): DailySet {
  const draft = DailyDraftSchema.parse(raw);
  const [q1, e, m, h, q2] = draft.stages;
  const set = {
    date: draft.date,
    version: 1 as const,
    stages: [
      q1,
      { kind: 'code' as const, problem: finalizeProblem(e.problem) },
      { kind: 'code' as const, problem: finalizeProblem(m.problem) },
      { kind: 'code' as const, problem: finalizeProblem(h.problem) },
      q2,
    ],
  };
  return DailySetSchema.parse(set);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const files = args.filter((a) => !a.startsWith('--'));
  const targets = files.length ? files : listJson(DRAFTS_DIR).filter((f) => force || !existsSync(join(DAYS_DIR, basename(f))));
  let failed = 0;
  for (const file of targets) {
    try {
      const set = finalizeDraft(readJson(file));
      writeJson(join(DAYS_DIR, `${set.date}.json`), set);
      const counts = set.stages.flatMap((s) => (s.kind === 'code' ? [`${s.problem.difficulty}:${s.problem.examples.length}+${s.problem.tests.length}`] : []));
      console.log(`✔ ${basename(file)} → days/${set.date}.json (${counts.join(', ')})`);
    } catch (err) {
      failed++;
      console.error(`✘ ${basename(file)}: ${(err as Error).message}`);
    }
  }
  if (!targets.length) console.log('Nothing to finalize.');
  process.exit(failed ? 1 : 0);
}
