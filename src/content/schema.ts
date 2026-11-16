import { z } from 'zod';
import { VALUE_TYPES, checkSignature } from '../runner/harness/types';
import { DiagramSchema } from './diagram';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** One language's version of a question (code snippets, library names, language quirks). */
export const QuizVariantSchema = z.object({
  promptMd: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanationMd: z.string().min(1),
  /** Why each choice is right or wrong (same order as choices); shown when a choice is clicked in review. */
  choiceNotesMd: z.array(z.string().min(1)).length(4).optional(),
  /** "Explore topic": a fuller explanation of the concept behind the question (Markdown). */
  topicMd: z.string().min(1).optional(),
  /** Key terms for the topic, shown with the explainer. */
  keyTerms: z.array(z.object({ term: z.string().min(1), def: z.string().min(1) })).max(6).optional(),
});
export type QuizVariant = z.infer<typeof QuizVariantSchema>;

export const QuizQuestionSchema = QuizVariantSchema.extend({
  id: z.string().min(1),
  /** Topic tags (see src/content/topics.ts); every question has at least one. */
  tags: z.array(z.string().min(1)).min(1),
  /**
   * Language-specific versions. The base fields are the Python (or language-neutral) version;
   * players see the variant for the language they picked.
   */
  variants: z.object({ java: QuizVariantSchema.optional(), cpp: QuizVariantSchema.optional() }).optional(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

const ValueTypeSchema = z.enum(VALUE_TYPES);

export const SignatureSchema = z
  .object({
    fn: z.string(),
    params: z.array(z.object({ name: z.string(), type: ValueTypeSchema })).min(1),
    returns: z.union([ValueTypeSchema, z.literal('void')]),
    outputParam: z.string().optional(),
  })
  .superRefine((sig, ctx) => {
    for (const msg of checkSignature(sig)) ctx.addIssue({ code: 'custom', message: msg });
  });

export const TestCaseSchema = z.object({
  args: z.array(z.unknown()),
  expected: z.unknown(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const ExampleSchema = TestCaseSchema.extend({ explanation: z.string().optional() });
export type Example = z.infer<typeof ExampleSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const SolutionsSchema = z.object({
  python3: z.string().min(1),
  java: z.string().min(1),
  cpp: z.string().min(1),
});

export const AlternativeSchema = z.object({
  name: z.string().min(1).max(40),
  approachMd: z.string().min(1),
  complexity: z.string().min(1),
  solutions: SolutionsSchema,
});
export type Alternative = z.infer<typeof AlternativeSchema>;

export const ProblemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  difficulty: DifficultySchema,
  statementMd: z.string().min(1),
  constraints: z.array(z.string()),
  signature: SignatureSchema,
  examples: z.array(ExampleSchema).min(1),
  /** Hidden tests (examples are run too on submit). */
  tests: z.array(TestCaseSchema).min(1),
  compare: z.enum(['exact', 'unordered', 'unordered-deep']).default('exact'),
  /** Rough native-speed budget for the whole test set; runners scale it per language. */
  timeLimitMs: z.number().int().positive().default(2000),
  hints: z.array(z.string().min(1)).length(3),
  editorial: z.object({
    approachMd: z.string().min(1),
    complexity: z.string().min(1),
    solutions: SolutionsSchema,
    /** Other common or simpler approaches (e.g. brute force), shown as tabs under the main solution. */
    alternatives: z.array(AlternativeSchema).max(3).optional(),
  }),
  /** Topic tags (see src/content/topics.ts); every problem has at least one. */
  tags: z.array(z.string().min(1)).min(1),
  similarLC: z.object({ number: z.number().int().positive(), title: z.string() }).optional(),
  /** Themed picture of the first example (SVG, rendered through <img> so it can never run script). */
  illustration: z
    .object({
      svg: z.string().max(40_000),
      caption: z.string().max(200).optional(),
    })
    .optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export const QuizStageSchema = z.object({
  kind: z.literal('quiz'),
  id: z.enum(['dsa', 'swe']),
  title: z.string(),
  questions: z.array(QuizQuestionSchema).length(4),
});
export type QuizStage = z.infer<typeof QuizStageSchema>;

export const CodeStageSchema = z.object({
  kind: z.literal('code'),
  problem: ProblemSchema,
});
export type CodeStage = z.infer<typeof CodeStageSchema>;

export const DailySetSchema = z
  .object({
    date: z.string().regex(DATE_RE),
    version: z.literal(1),
    stages: z.tuple([QuizStageSchema, CodeStageSchema, CodeStageSchema, CodeStageSchema, QuizStageSchema]),
  })
  .superRefine((d, ctx) => {
    const diffs = [d.stages[1], d.stages[2], d.stages[3]].map((s) => s.problem.difficulty);
    if (diffs.join() !== 'easy,medium,hard') {
      ctx.addIssue({ code: 'custom', message: `coding stages must be easy, medium, hard (got ${diffs.join()})` });
    }
    if (d.stages[0].id !== 'dsa' || d.stages[4].id !== 'swe') {
      ctx.addIssue({ code: 'custom', message: 'stage 1 must be the dsa quiz and stage 5 the swe quiz' });
    }
  });
export type DailySet = z.infer<typeof DailySetSchema>;
export type Stage = DailySet['stages'][number];

/**
 * Extra quiz questions that aren't tied to a day (content/bank/<kind>.json): dsa / swe are mixed into
 * Unlimited's stage rounds; interview feeds Unlimited's SWE interview mode.
 */
export const QuizBankSchema = z.object({
  kind: z.enum(['dsa', 'swe', 'interview']),
  questions: z.array(QuizQuestionSchema).min(1),
});
export type QuizBank = z.infer<typeof QuizBankSchema>;

export const DayIndexSchema = z.object({
  days: z.array(
    z.object({
      date: z.string().regex(DATE_RE),
      titles: z.array(z.string()),
      /** The LeetCode problem each coding stage is based on (same order as titles), for Stats coverage. */
      lc: z.array(z.object({ n: z.number().int(), t: z.string() }).nullable()).optional(),
    }),
  ),
  /** Question banks published alongside the days (public/bank/<kind>.json). */
  banks: z.array(z.enum(['dsa', 'swe', 'interview'])).optional(),
  /** Detective case files published (public/detective/<kind>.json). */
  detective: z.array(z.enum(['leet', 'swe', 'design', 'oop'])).optional(),
  builtAt: z.string(),
});
export type DayIndex = z.infer<typeof DayIndexSchema>;

// ---------- Draft format (what the generator / an author writes before tests are computed) ----------

export const ProblemDraftSchema = ProblemSchema.omit({ tests: true, examples: true }).extend({
  examples: z.array(z.object({ args: z.array(z.unknown()), explanation: z.string().optional() })).min(1),
  /** Hand-picked edge-case inputs (arg arrays). */
  edgeInputs: z.array(z.array(z.unknown())).default([]),
  /**
   * Python 3 program that prints a JSON array of arg arrays to stdout (deterministic: seed its RNG).
   * Used for random and large tests.
   */
  generatorPy: z.string().optional(),
});
export type ProblemDraft = z.infer<typeof ProblemDraftSchema>;

export const DailyDraftSchema = z.object({
  date: z.string().regex(DATE_RE),
  version: z.literal(1),
  stages: z.tuple([
    QuizStageSchema,
    z.object({ kind: z.literal('code'), problem: ProblemDraftSchema }),
    z.object({ kind: z.literal('code'), problem: ProblemDraftSchema }),
    z.object({ kind: z.literal('code'), problem: ProblemDraftSchema }),
    QuizStageSchema,
  ]),
});
export type DailyDraft = z.infer<typeof DailyDraftSchema>;

// ---------- Detective mode: short snippets with a bug to find ----------

/** A line holding only this (plus indentation) is a gap the player fills in ("missing line" cases). */
export const GAP_MARK = '«?»';

export const CaseCodeSchema = z.object({
  /** The snippet as shown (the buggy version), one entry per line. */
  lines: z.array(z.string()).min(3).max(45),
  /** "lines" / "choice" cases: 1-based numbers of the incorrect lines. */
  bad: z.array(z.number().int().positive()).min(1).max(3).optional(),
  /** "lines" / "choice" cases: the whole snippet after the fix (shown as a diff in the reveal). */
  fixed: z.array(z.string()).optional(),
  /** "missing" cases: the line(s) that belong in the gap (one per GAP_MARK line). */
  missing: z.array(z.string().min(1)).min(1).max(3).optional(),
  /** "missing" cases: other accepted answers (each with one entry per gap line). */
  accept: z.array(z.array(z.string().min(1))).optional(),
});
export type CaseCode = z.infer<typeof CaseCodeSchema>;

/** Detective case files: algorithms, software-engineering code, system design docs, software (object-oriented) design. */
export const DETECTIVE_KINDS = ['leet', 'swe', 'design', 'oop'] as const;
export type DetectiveKind = (typeof DETECTIVE_KINDS)[number];

export const DetectiveCaseSchema = z
  .object({
    id: z.string().min(1),
    /**
     * leet = algorithm snippets (runnable); swe = software-engineering snippets; design = system design docs (no code);
     * oop = software design: classes, SOLID and design patterns, as code or as a class-design doc.
     */
    kind: z.enum(DETECTIVE_KINDS),
    /** choice = "what's wrong?"; lines = find the incorrect line(s); missing = write the missing line(s). */
    type: z.enum(['choice', 'lines', 'missing']),
    title: z.string().min(1).max(60),
    /** What the code is supposed to do. */
    briefMd: z.string().min(1),
    code: z.object({ python3: CaseCodeSchema.optional(), java: CaseCodeSchema.optional(), cpp: CaseCodeSchema.optional() }).default({}),
    /** Design (and doc-style oop) cases: the design doc, one decision per line (same fields as code: lines, bad, fixed). */
    doc: CaseCodeSchema.optional(),
    /** Design / oop doc cases: a picture (a flow diagram, see content/diagram.ts). */
    diagram: DiagramSchema.optional(),
    choices: z.array(z.string().min(1)).length(4).optional(),
    answerIndex: z.number().int().min(0).max(3).optional(),
    /** The reveal: what was wrong and why. */
    explanationMd: z.string().min(1),
    /** Topic tags (see src/content/topics.ts). */
    tags: z.array(z.string().min(1)).min(1),
    /** leet cases: the function the snippet implements, with tests that separate the fix from the bug. */
    run: z
      .object({
        signature: SignatureSchema,
        tests: z.array(TestCaseSchema).min(1),
        compare: z.enum(['exact', 'unordered', 'unordered-deep']).default('exact'),
      })
      .optional(),
    similarLC: z.object({ number: z.number().int().positive(), title: z.string() }).optional(),
  })
  .superRefine((c, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${c.id}: ${message}` });
    const versions = (Object.entries(c.code).filter(([, v]) => v) as [string, CaseCode][]).concat(c.doc ? [['doc', c.doc]] : []);
    const hasCode = Object.values(c.code).some(Boolean);
    if (c.kind === 'design') {
      if (!c.doc) issue('design cases need a `doc`');
      if (hasCode) issue('design cases have a doc instead of code');
    } else if (c.kind === 'oop') {
      if (c.doc && hasCode) issue('oop cases have code or a doc, not both');
      if (c.diagram && !c.doc) issue('only doc cases have a diagram');
    } else if (c.doc || c.diagram) issue('only design and oop cases have a doc or diagram');
    if (c.doc && c.type === 'missing') issue('doc cases are "choice" or "lines"');
    if (!versions.length) issue('needs code in at least one language');
    if (c.kind === 'leet' && (versions.length !== 3 || !c.run)) issue('leet cases need python3, java and cpp code plus `run`');
    if (c.type === 'choice' && (!c.choices || c.answerIndex === undefined)) issue('choice cases need choices and answerIndex');
    for (const [lang, v] of versions) {
      const gaps = v.lines.filter((l) => l.trim() === GAP_MARK).length;
      if (c.type === 'missing') {
        if (!v.missing || gaps !== v.missing.length) issue(`${lang}: ${gaps} gap line(s) but ${v.missing?.length ?? 0} missing line(s)`);
        for (const a of v.accept ?? []) if (a.length !== gaps) issue(`${lang}: an accepted answer has the wrong number of lines`);
      } else {
        if (gaps) issue(`${lang}: only "missing" cases have gaps`);
        if (!v.fixed) issue(`${lang}: needs the fixed code`);
        if (c.type === 'lines' && !v.bad) issue(`${lang}: "lines" cases need the bad line numbers`);
        for (const b of v.bad ?? []) if (b > v.lines.length) issue(`${lang}: bad line ${b} is past the end`);
      }
    }
  });
export type DetectiveCase = z.infer<typeof DetectiveCaseSchema>;

/** content/detective/<kind>.json → public/detective/<kind>.json */
export const DetectiveBankSchema = z.object({
  kind: z.enum(DETECTIVE_KINDS),
  cases: z.array(DetectiveCaseSchema).min(1),
});
export type DetectiveBank = z.infer<typeof DetectiveBankSchema>;
