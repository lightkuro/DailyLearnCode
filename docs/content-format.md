# Content format

All content is JSON or Markdown under `content/`, validated by the zod schemas in `src/content/schema.ts`. The
build (`scripts/build-content.ts`) copies it into `public/`, and `npm run content:validate` checks it.

| Folder | What | Schema |
|---|---|---|
| `content/days/<YYYY-MM-DD>.json` | One daily set: 5 stages | `DailySetSchema` |
| `content/drafts/<YYYY-MM-DD>.json` | Optional: a day before its expected outputs are computed | `DailyDraftSchema` |
| `content/bank/<kind>.json` | Extra quiz questions. `swe` mixes into Unlimited; `interview` feeds its SWE interview mode. | `QuizBankSchema` |
| `content/detective/<kind>.json` | Detective cases: `leet`, `swe`, `oop`, `design` | `DetectiveBankSchema` |
| `content/learn/<slug>.md` | Learn pages ([format](learn-pages.md)) | front matter + Markdown |

## Tags

Every quiz question, problem and Detective case needs at least one tag from `src/content/topics.ts`. Tags drive
per-topic stats, Unlimited's topic filter and the links to Learn pages. The validator rejects unknown tags. To add
a topic, add it to `TOPICS` and write its Learn page.

## A daily set

```jsonc
{
  "date": "2026-11-09",
  "version": 1,
  "stages": [
    { "kind": "quiz", "id": "dsa", "title": "…", "questions": [/* exactly 4 */] },
    { "kind": "code", "problem": { "difficulty": "easy", … } },
    { "kind": "code", "problem": { "difficulty": "medium", … } },
    { "kind": "code", "problem": { "difficulty": "hard", … } },
    { "kind": "quiz", "id": "swe", "title": "…", "questions": [/* exactly 4 */] }
  ]
}
```

The sample days in `content/days/` are complete examples of every field.

### Quiz questions

| Field | Notes |
|---|---|
| `id` | Unique, e.g. `2026-11-09-dsa-1` |
| `promptMd`, `choices` (4), `answerIndex` | Markdown prompt; one correct choice |
| `explanationMd` | Why the answer is right |
| `choiceNotesMd` (optional, 4) | Why each choice is right or wrong, shown in review |
| `topicMd`, `keyTerms` (optional) | The *Explore topic* panel |
| `tags` | From `topics.ts` |
| `variants` (optional) | `java` and `cpp` versions of a code-reading question. The base question is Python. |

Starter (`dsa`) questions must be answerable by recognising the idea after one or two reads: no hand-tracing loops,
DP tables or long simulations.

### Problems

| Field | Notes |
|---|---|
| `id`, `title`, `difficulty`, `statementMd`, `constraints` | Original wording, short paragraphs, no examples inside the statement |
| `signature` | `{ fn, params: [{ name, type }], returns }`; see the types below |
| `examples` | `{ args, expected, explanation? }`; shown to the player and used by **Run** |
| `tests` | `{ args, expected }`; the hidden tests used by **Submit**. Include large cases that a worse complexity class fails. |
| `compare` | `exact` (default), `unordered` (any order of a list) or `unordered-deep` (also inner lists) |
| `timeLimitMs` | Native-speed budget for the whole test set; runners scale it per language |
| `hints` | Exactly 3, progressively stronger, no code |
| `editorial` | `approachMd`, `complexity`, `solutions` (`python3`, `java`, `cpp`: a `class Solution` each, with comments), optional `alternatives` (up to 3) |
| `tags`, `similarLC` (optional) | `similarLC: { number, title }` links a similar LeetCode problem |
| `illustration` (optional) | `{ svg, caption }`: a static SVG of example 1. Only plain shapes and text are allowed (`src/content/svg.ts`). |

**Signature types:**
- Scalars: `int`, `long`, `double`, `bool`, `string`, `char`
- Arrays: `T[]` and `T[][]` of int, string or char
- Lists: `list<int|string>` and `list<list<int|string>>`
- Structures: `ListNode` and `TreeNode` (level-order arrays with `null`)
- In place: `void` plus `outputParam` for problems that modify an argument

The harness generates starter code and drivers from the signature, so the reference solutions only implement the
method.

## Adding a day

1. **Write a draft** at `content/drafts/<date>.json`. A draft is a day where each problem has **inputs only**:
   - `examples[].args` and `edgeInputs`, which are hand-picked argument arrays.
   - Optionally `generatorPy`: a standalone Python 3 script (stdlib only, fixed random seed) that prints a JSON
     array of argument arrays, for random and large tests.
2. **Compute the outputs:**
   ```bash
   npm run content:finalize -- content/drafts/<date>.json
   ```
   This runs the Python reference on every input and writes `content/days/<date>.json`.
3. **Cross-check:**
   ```bash
   npm run content:validate -- content/days/<date>.json
   ```
   The Java and C++ references must agree on every test, and the starter code must compile in every language.
4. Commit the day file. The draft is optional to keep.

You can also edit a day file directly. If you change inputs or a reference, re-run `content:validate`; it fails
when an expected output is wrong.

## Detective cases

Each case has a `kind`, a `type` and a title, brief, explanation and tags.

**Kinds:**
- `leet`: algorithm snippets. They need Python, Java and C++ code plus `run`, a signature and tests that tell the
  fix from the bug.
- `swe`: software-engineering code.
- `oop`: software design, as code or as a class-design `doc`.
- `design`: system design `doc`s, one decision per line, optionally with a `diagram`.

**Types:**
- `choice`: four `choices` and an `answerIndex`.
- `lines`: `bad` gives the 1-based numbers of the incorrect lines, and `fixed` the corrected snippet.
- `missing`: a gap line holding only `«?»`, `missing` with the answer, and optional `accept` alternatives.

`content:validate` runs every `leet` case in all three languages. It checks that the buggy version fails, that the
fixed version passes, and that every accepted answer for a missing line passes.

## Learn pages

See [learn-pages.md](learn-pages.md). Check them with `npm run learn:validate -- <slug>`.
