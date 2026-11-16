/**
 * Validates published day files:
 *   1. schema (zod)
 *   2. every reference solution (Python, Java, C++) passes every example + hidden test via the real harness
 *   3. the generated starter code compiles in every language (catches harness/type-mapping bugs)
 *
 * Usage: tsx scripts/validate-content.ts [day.json ...] [--skip-starters]
 * Exits non-zero on the first broken file (after reporting all).
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { hasComments } from '../src/content/comments';
import { fillGaps, fixedLines, shownProgram } from '../src/content/detective';
import { DailySetSchema, DetectiveBankSchema, QuizBankSchema, type DetectiveCase, type Problem, type QuizQuestion, type TestCase } from '../src/content/schema';
import { checkSvg } from '../src/content/svg';
import { diagramProblems } from '../src/content/diagram';
import { unknownTags } from '../src/content/topics';
import { LANGS, buildProgram, makeNonce, starterCode, type Lang } from '../src/runner/harness';
import { judgeRun } from '../src/runner/harness/verdict';
import { BANK_DIR, DAYS_DIR, DETECTIVE_DIR, listJson, readJson } from './lib/days';
import { runNative } from './lib/native';
import { validateLearn } from './validate-learn';

/** Every tag must belong to a topic in src/content/topics.ts (stats and Learn links group by topic). */
function checkTags(id: string, tags: string[]): string[] {
  const bad = unknownTags(tags);
  return bad.length ? [`${id}: unknown tag(s) ${bad.map((t) => `"${t}"`).join(', ')} (add them to a topic in src/content/topics.ts or use a listed tag)`] : [];
}

export function validateProblem(problem: Problem, opts: { starters: boolean }): string[] {
  const errors: string[] = checkTags(problem.id, problem.tags);
  if (problem.illustration) errors.push(...checkSvg(problem.illustration.svg).map((e) => `${problem.id} illustration: ${e}`));
  const tests = [...problem.examples, ...problem.tests];
  const input = JSON.stringify(tests.map((t) => t.args));
  for (const lang of LANGS) {
    const nonce = makeNonce();
    const program = buildProgram(lang, problem.signature, problem.editorial.solutions[lang], nonce);
    const run = runNative(program, input, 60000);
    const j = judgeRun(tests, problem.compare, run, nonce);
    if (j.verdict !== 'accepted') {
      const f = j.firstFailure !== undefined ? j.cases[j.firstFailure] : undefined;
      errors.push(
        `${problem.id} [${lang}] ${j.verdict} ${j.passed}/${j.total}` +
          (f ? ` — test ${f.index}: args=${JSON.stringify(tests[f.index].args).slice(0, 200)} expected=${JSON.stringify(tests[f.index].expected).slice(0, 200)} got=${JSON.stringify(f.got)?.slice(0, 200)}` : '') +
          (j.message ? `\n${j.message.slice(0, 3000)}` : ''),
      );
    } else {
      console.log(`    ${lang.padEnd(7)} ✔ ${j.passed}/${j.total} in ${Math.round(run.ms)}ms`);
    }
    if (opts.starters) {
      const starter = buildProgram(lang, problem.signature, starterCode(lang as Lang, problem.signature), nonce);
      const sr = runNative(starter, JSON.stringify(problem.examples.map((e) => e.args)), 60000);
      if (sr.compileError !== undefined) errors.push(`${problem.id} [${lang}] starter code does not compile:\n${sr.compileError.slice(0, 2000)}`);
    }
  }
  // Every solution shown to players carries comments (they can hide them with a toggle).
  for (const [name, sols] of [['main solution', problem.editorial.solutions] as const, ...(problem.editorial.alternatives ?? []).map((a) => [`alternative "${a.name}"`, a.solutions] as const)]) {
    for (const lang of LANGS) if (!hasComments(sols[lang], lang)) errors.push(`${problem.id} ${name} [${lang}] has no comments`);
  }
  // Alternatives (e.g. brute force) must be correct too, but only on the examples and small tests.
  const small = [...problem.examples, ...problem.tests.filter((t) => JSON.stringify(t.args).length <= 2000)];
  for (const alt of problem.editorial.alternatives ?? []) {
    for (const lang of LANGS) {
      const nonce = makeNonce();
      const run = runNative(buildProgram(lang, problem.signature, alt.solutions[lang], nonce), JSON.stringify(small.map((t) => t.args)), 60000);
      const j = judgeRun(small, problem.compare, run, nonce);
      if (j.verdict !== 'accepted') errors.push(`${problem.id} alternative "${alt.name}" [${lang}] ${j.verdict} ${j.passed}/${j.total}${j.message ? `\n${j.message.slice(0, 1500)}` : ''}`);
      else console.log(`    alt ${alt.name.slice(0, 18).padEnd(18)} ${lang.padEnd(7)} ✔ ${j.passed}/${j.total}`);
    }
  }
  return errors;
}

function checkQuestions(questions: QuizQuestion[]): string[] {
  const errors: string[] = [];
  for (const q of questions) {
    errors.push(...checkTags(q.id, q.tags));
    for (const v of [q, q.variants?.java, q.variants?.cpp]) {
      if (v && new Set(v.choices).size !== v.choices.length) errors.push(`${q.id}: duplicate choices`);
      if (v?.choiceNotesMd && v.choiceNotesMd.length !== v.choices.length) errors.push(`${q.id}: choiceNotesMd must have one note per choice`);
    }
  }
  return errors;
}

/** content/bank/*.json: schema, unique ids, per-question checks. */
export function validateBankFile(file: string): string[] {
  const parsed = QuizBankSchema.safeParse(readJson(file));
  if (!parsed.success) return [`${basename(file)}: schema: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`];
  const ids = parsed.data.questions.map((q) => q.id);
  const errors = checkQuestions(parsed.data.questions);
  if (new Set(ids).size !== ids.length) errors.push(`${basename(file)}: duplicate question ids`);
  console.log(`  ${parsed.data.kind} bank: ${ids.length} question(s)`);
  return errors;
}

/** Run `code` against a Detective case's tests natively; true when every test passes. */
function caseVerdict(c: DetectiveCase, lang: Lang, code: string[]): { ok: boolean; detail: string } {
  const run = c.run!;
  const tests: TestCase[] = run.tests;
  const nonce = makeNonce();
  const r = runNative(buildProgram(lang, run.signature, code.join('\n'), nonce), JSON.stringify(tests.map((t) => t.args)), 30000);
  const j = judgeRun(tests, run.compare, r, nonce);
  return { ok: j.verdict === 'accepted', detail: `${j.verdict} ${j.passed}/${j.total}${j.message ? ` ${j.message.slice(0, 600)}` : ''}` };
}

/**
 * content/detective/*.json: schema, unique ids, and for algorithm cases in every language:
 * the fix passes every test, the code as shown does not, and every accepted answer passes too.
 */
export function validateDetectiveFile(file: string): string[] {
  const parsed = DetectiveBankSchema.safeParse(readJson(file));
  if (!parsed.success) return [`${basename(file)}: schema: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`];
  const errors: string[] = [];
  const ids = parsed.data.cases.map((c) => c.id);
  if (new Set(ids).size !== ids.length) errors.push(`${basename(file)}: duplicate case ids`);
  for (const c of parsed.data.cases) {
    if (c.kind !== parsed.data.kind) errors.push(`${c.id}: kind ${c.kind} in the ${parsed.data.kind} file`);
    if (c.choices && new Set(c.choices).size !== 4) errors.push(`${c.id}: duplicate choices`);
    errors.push(...checkTags(c.id, c.tags));
    if (c.diagram) errors.push(...diagramProblems(c.diagram).map((e) => `${c.id} diagram: ${e}`));
    if (c.doc && c.doc.lines.some((l) => l.length > 160)) errors.push(`${c.id}: keep design doc lines under 160 characters`);
    if (c.kind !== 'leet') continue;
    for (const lang of LANGS) {
      const v = c.code[lang]!;
      const fixed = caseVerdict(c, lang, fixedLines(v));
      if (!fixed.ok) errors.push(`${c.id} [${lang}] the fix fails: ${fixed.detail}`);
      const shown = caseVerdict(c, lang, shownProgram(v));
      if (shown.ok) errors.push(`${c.id} [${lang}] the code as shown passes every test, so the bug isn't caught`);
      const alts = (v.accept ?? []).map((a) => caseVerdict(c, lang, fillGaps(v.lines, a)));
      alts.forEach((a, i) => !a.ok && errors.push(`${c.id} [${lang}] accepted answer ${JSON.stringify(v.accept![i])} fails: ${a.detail}`));
      if (fixed.ok && !shown.ok && alts.every((a) => a.ok)) console.log(`    ${c.id.padEnd(24)} ${lang.padEnd(7)} ✔ fix passes, shown fails (${shown.detail.split(' ')[0]})${alts.length ? `, ${alts.length} alt(s) pass` : ''}`);
    }
  }
  console.log(`  detective ${parsed.data.kind}: ${ids.length} case(s)`);
  return errors;
}

export function validateDayFile(file: string, opts: { starters: boolean }): string[] {
  const parsed = DailySetSchema.safeParse(readJson(file));
  if (!parsed.success) return [`${basename(file)}: schema: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`];
  const set = parsed.data;
  const errors: string[] = [];
  if (basename(file) !== `${set.date}.json`) errors.push(`${basename(file)}: date field ${set.date} does not match file name`);
  for (const stage of set.stages) {
    if (stage.kind === 'quiz') {
      errors.push(...checkQuestions(stage.questions));
      continue;
    }
    console.log(`  ${stage.problem.difficulty.padEnd(6)} ${stage.problem.title}`);
    errors.push(...validateProblem(stage.problem, opts));
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith('--'));
  const banks = existsSync(BANK_DIR) ? readdirSync(BANK_DIR).filter((n) => n.endsWith('.json')).map((n) => join(BANK_DIR, n)) : [];
  const detective = existsSync(DETECTIVE_DIR) ? readdirSync(DETECTIVE_DIR).filter((n) => n.endsWith('.json')).map((n) => join(DETECTIVE_DIR, n)) : [];
  const targets = files.length ? files : [...listJson(DAYS_DIR), ...banks, ...detective];
  const starters = !args.includes('--skip-starters');
  let bad = 0;
  for (const file of targets) {
    console.log(`• ${basename(file)}`);
    const errs = file.includes('/bank/') ? validateBankFile(file) : file.includes('/detective/') ? validateDetectiveFile(file) : validateDayFile(file, { starters });
    if (errs.length) {
      bad++;
      for (const e of errs) console.error(`  ✘ ${e}`);
    }
  }
  if (!files.length) {
    console.log('• learn pages');
    const learn = validateLearn();
    for (const w of learn.warnings) console.warn(`  ⚠ ${w}`);
    for (const e of learn.errors) console.error(`  ✘ ${e}`);
    if (learn.errors.length) bad++;
    else console.log(`  ${learn.pages} page(s)`);
  }
  console.log(bad ? `\n${bad} file(s) failed validation.` : `\nAll ${targets.length} file(s) valid.`);
  process.exit(bad ? 1 : 0);
}
