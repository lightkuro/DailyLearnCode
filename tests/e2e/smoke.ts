/**
 * End-to-end smoke test in a real browser: plays today's set with the reference solutions
 * (Python for easy, Java for medium, C++ for hard) and checks the 20/20 result, then
 * exercises hints, wrong answers, time limits and compile errors on a practice day.
 *
 * Prereqs: `npm run build`, `tsx tests/e2e/serve.ts 4173 &`, and Playwright with Chromium
 * (`npm i -D playwright && npx playwright install chromium`).
 * Usage: tsx tests/e2e/smoke.ts [--only=python|java|cpp] [--shots=dir]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';
import { pickDaily } from '../../src/content/loadDay';
import type { DayIndex } from '../../src/content/schema';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as typeof import('playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const SHOTS = args.shots ?? '';
const SCALE = Number(args.scale ?? 1);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

type Lang = 'python3' | 'java' | 'cpp';
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

interface Q {
  answerIndex: number;
  variants?: { java?: { answerIndex: number }; cpp?: { answerIndex: number } };
}
let curLang: Lang = 'python3';
/** Correct answers in the language currently selected (questions can have per-language versions). */
const answersFor = (qs: Q[]) => qs.map((q) => (curLang === 'java' ? q.variants?.java : curLang === 'cpp' ? q.variants?.cpp : undefined)?.answerIndex ?? q.answerIndex);

/** The question panel, labelled e.g. "Starter question 2 of 4" (plus " (review)" once the stage is done). */
const question = (page: Page, n: number, review = false) =>
  page.getByRole('region', { name: new RegExp(`^(Starter|SWE) question ${n} of \\d+${review ? ' \\(review\\)' : ''}$`) });

async function answerQuiz(page: Page, answers: number[], correct = true) {
  for (let i = 0; i < answers.length; i++) {
    const pick = correct ? answers[i] : (answers[i] + 1) % 4;
    await question(page, i + 1).waitFor();
    await page.keyboard.press(String(pick + 1));
    const next = page.getByRole('button', { name: /Next question|Finish stage/ });
    await next.waitFor();
    if (i === 0) await shot(page, 'quiz-answered');
    await next.click();
  }
  // Finished stage: one big Next button (Review sits to its left).
  await page.getByRole('button', { name: /^(Next stage|See results)/ }).click();
}

/** The Skip / Next button in the stage bar ignores clicks for a moment after it appears. */
async function clickWhenArmed(page: Page, name: string) {
  const btn = page.getByRole('button', { name, exact: true });
  await btn.waitFor();
  await page.waitForFunction((n) => [...document.querySelectorAll('button')].some((b) => b.textContent?.trim().endsWith(n) && b.getAttribute('aria-disabled') === 'false'), name);
  await btn.click();
}

async function setCode(page: Page, code: string) {
  const editor = page.locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

async function submitAndWait(page: Page, label: string, expect: RegExp, timeout = 300_000) {
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  // A first solve swaps the editor for the "Solved!" panel; otherwise the verdict heading shows.
  const verdict = page.locator('h3[role="status"]').or(page.getByText('Solved!', { exact: true }));
  await verdict.first().waitFor({ timeout });
  const raw = (await verdict.first().innerText()).trim();
  const text = raw === 'Solved!' ? 'Accepted (Solved!)' : raw;
  log(`${label}: "${text.replace(/\s+/g, ' ')}" in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!expect.test(text)) {
    const details = await page.locator('pre').allInnerTexts();
    throw new Error(`${label}: expected ${expect}, got "${text}"\n${details.join('\n---\n').slice(0, 3000)}`);
  }
}

async function solveCodeStage(page: Page, lang: Lang, code: string, label: string) {
  await page.locator('select').first().selectOption(lang);
  curLang = lang;
  await setCode(page, code);
  await submitAndWait(page, label, /Accepted/);
  await shot(page, `accepted-${label}`);
}

let activePage: Page | null = null;

async function main() {
  const browser: Browser = await chromium.launch({
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined,
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  activePage = page;
  const problems: string[] = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) problems.push(`CSP: ${t}`);
    else if (m.type() === 'error') log('console.error:', t.slice(0, 300));
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto(BASE);
  await question(page, 1).waitFor();
  await page.locator("p:visible", { hasText: /^#\d+$/ }).first().waitFor(); // "Daily #n" at the left of the stage bar
  const index = (await (await page.request.get(`${BASE}/days/index.json`)).json()) as { days: { date: string }[] };
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  // Today's set, or the classic the app replays when there is none (same pick as the app).
  const setDate = pickDaily(index as DayIndex, today)!.setDate;
  const set = await (await page.request.get(`${BASE}/days/${setDate}.json`)).json();
  log(`playing ${setDate}`);
  await shot(page, 'quiz-start');

  // Syntax tray: search filters snippets for the selected language.
  await page.getByRole('searchbox', { name: 'Search syntax' }).fill('heap');
  await page.getByText('heappush', { exact: false }).first().waitFor();
  await page.getByRole('searchbox', { name: 'Search syntax' }).fill('');
  await question(page, 1).click(); // move focus back to the quiz
  log('syntax tray search ✓');

  const only = args.only as Lang | undefined;
  await answerQuiz(page, answersFor(set.stages[0].questions));
  const plan: [number, Lang, string][] = [
    [1, 'python3', 'easy'],
    [2, 'java', 'medium'],
    [3, 'cpp', 'hard'],
  ];
  for (const [i, lang, label] of plan) {
    const stageLang = only ?? lang;
    await page.locator('.cm-content').first().waitFor({ timeout: 60_000 });
    await solveCodeStage(page, stageLang, set.stages[i].problem.editorial.solutions[stageLang], `${label}-${stageLang}`);
    // Solved: the editor makes way for a big Next button (which also counts down on its own).
    await page.getByText('Solved!').waitFor();
    if (i === 1) await shot(page, 'code-done');
    await page.getByRole('button', { name: /^Next stage/ }).click();
  }
  await answerQuiz(page, answersFor(set.stages[4].questions));
  await page.getByText('Flawless').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  await shot(page, 'results');
  log('day complete: 20/20 Flawless ✓');

  // ---------- practice day: hints, wrong answer, TLE, compile error ----------
  const practice = index.days.find((d) => d.date !== setDate);
  if (practice) {
    await page.goto(`${BASE}/day/${practice.date}`);
    await question(page, 1).waitFor();
    const pset = await (await page.request.get(`${BASE}/days/${practice.date}.json`)).json();
    const pAnswers = answersFor(pset.stages[0].questions);

    // After answering, a 5 s bar runs and the quiz moves on by itself.
    await page.keyboard.press(String(((pAnswers[0] + 1) % 4) + 1));
    await page.getByRole('timer').waitFor();
    await question(page, 2).waitFor({ timeout: 9000 });
    log('quiz auto-advances after answering ✓');
    // Going back (button at the bottom) shows the earlier question read-only.
    await page.getByRole('button', { name: /Previous/ }).click();
    await question(page, 1).waitFor();
    const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem('learn:v1')!).state.days[k].stages[0].answers[0], practice.date);
    const before = await stored();
    // The answer's explanation is one panel at the bottom; clicking a wrong choice opens its note,
    // attached under that choice, in place of the bottom panel (one panel at a time).
    await page.getByText(/^Not quite — the answer is [A-D]\.$/).waitFor();
    const wrongPick = (pAnswers[0] + 1) % 4;
    const note = pset.stages[0].questions[0].choiceNotesMd?.[wrongPick] as string | undefined;
    if (note) {
      await page.locator('main button[aria-expanded="false"]').nth(wrongPick > pAnswers[0] ? wrongPick - 1 : wrongPick).click();
      await page.getByText(note.split(/(?<=[.!?])\s/)[0].slice(0, 40), { exact: false }).first().waitFor();
      await page.getByText(/^Not quite — the answer is/).waitFor({ state: 'detached' });
      await page.locator('main button[aria-expanded="true"]').click();
      await page.getByText(/^Not quite — the answer is/).waitFor();
    }
    if ((await stored()) !== before) throw new Error('clicking a choice on an answered question must not change the answer');
    log('choice notes on an answered question ✓');
    await page.getByRole('button', { name: 'Explore topic →' }).click();
    await page.getByText('Explore the topic').waitFor();
    await page.getByRole('button', { name: '← Back to the question' }).click();
    log('explore topic opens and closes ✓');
    await page.getByRole('button', { name: /^Next question/ }).click();
    await question(page, 2).waitFor();
    log('previous question is read-only ✓');
    for (let i = 1; i < 4; i++) {
      await question(page, i + 1).waitFor();
      await page.keyboard.press(String(((pAnswers[i] + 1) % 4) + 1));
      await page.getByRole('button', { name: /Next question|Finish stage/ }).click();
    }
    // Review steps through the finished quiz, then returns to the summary.
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    // Review opens on the last question; the arrows beside it step back, the buttons below go forward.
    await question(page, 4, true).waitFor();
    for (let i = 3; i >= 1; i--) {
      await page.locator('main section').getByRole('button', { name: 'Previous question' }).click();
      await question(page, i, true).waitFor();
    }
    for (let i = 1; i < 4; i++) {
      await page.getByRole('button', { name: /^Next question/ }).last().click();
      await question(page, i + 1, true).waitFor();
    }
    await page.getByRole('button', { name: /Back to summary/ }).last().click();
    log('review opens on the last question and steps with the side arrows and buttons ✓');
    await page.getByRole('button', { name: /^Next stage/ }).click();
    await page.locator('.cm-content').first().waitFor({ timeout: 60_000 });

    // Hint button: first click arms, second reveals; hovering shows revealed hints.
    await page.getByRole('button', { name: /^Hint(?!s)/ }).click();
    await page.getByRole('button', { name: /Reveal hint 1/ }).click();
    await page.getByText('Worth').locator('strong', { hasText: '3' }).waitFor();
    await page.getByText(pset.stages[1].problem.hints[0].slice(0, 30), { exact: false }).first().waitFor();
    log('hint button reveals hint 1 and lowers max to 3 ✓');
    await shot(page, 'hint');

    const problem = pset.stages[1].problem;
    const sol = problem.editorial.solutions;
    const fn: string = problem.signature.fn;
    const select = page.locator('select').first();

    await select.selectOption('python3');
    await setCode(page, `class Solution:\n    def ${fn}(self, *args):\n        return None\n`);
    await submitAndWait(page, 'wrong-answer-python', /Wrong Answer/);
    await shot(page, 'wrong-answer');

    await setCode(page, `class Solution:\n    def ${fn}(self, *args):\n        while True:\n            pass\n`);
    await submitAndWait(page, 'tle-python', /Time Limit/, 120_000);

    // Freeing a very long object chain overflows the browser stack inside Pyodide; the runtime must recover.
    await setCode(page, `class Solution:\n    def ${fn}(self, *args):\n        class N:\n            def __init__(s, n): s.n = n\n        h = None\n        for _ in range(20000):\n            h = N(h)\n        return None\n`);
    await submitAndWait(page, 'python-crash', /Runtime Error|Wrong Answer/, 120_000);
    await setCode(page, sol.python3);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    // Solved: Next / Review panel replaces the editor. Review brings the editor back and stops the countdown.
    await page.getByText('Solved!').waitFor({ timeout: 120_000 });
    log('python-after-crash: Accepted');
    await page.getByRole('button', { name: 'Review code' }).click();
    await page.waitForTimeout(6000);
    await page.locator('.cm-content').first().waitFor();
    await page.getByRole('button', { name: 'Next stage →' }).waitFor();
    log('review stops the auto-advance ✓');

    if (only !== 'python3') {
      // Insert a statement at the start of the solution method body.
      const inject = (code: string, stmt: string) => {
        const at = code.indexOf('{', code.indexOf(`${fn}(`)) + 1;
        return code.slice(0, at) + `\n        ${stmt}\n` + code.slice(at);
      };
      await select.selectOption('cpp');
      await setCode(page, `class Solution { public: int ${fn}( { } };`);
      await submitAndWait(page, 'compile-error-cpp', /Compile Error/);
      await shot(page, 'compile-error');
      await setCode(page, inject(sol.cpp, 'volatile int spin = 1; while (spin) {}'));
      await submitAndWait(page, 'tle-cpp', /Time Limit/, 180_000);
      await setCode(page, sol.cpp);
      await submitAndWait(page, 'cpp-after-kill', /Accepted/);

      await select.selectOption('java');
      await setCode(page, inject(sol.java, 'if (System.nanoTime() > 0) { while (true) {} }'));
      await submitAndWait(page, 'tle-java', /Time Limit/, 180_000);
      await setCode(page, sol.java);
      await submitAndWait(page, 'java-after-kill', /Accepted/);
    }

    // Skip (no confirmation) from the stage bar: the next stage (medium) is active; skipping unlocks its editorial.
    await page.getByRole('button', { name: 'Next stage →' }).click();
    // An instant click is ignored (anti double-skip), then it works.
    await page.getByRole('button', { name: 'Skip Medium', exact: true }).dispatchEvent('click');
    await page.waitForTimeout(150);
    if (await page.getByRole('heading', { name: 'Approach', exact: true }).count()) throw new Error('Skip should ignore clicks right after it appears');
    await clickWhenArmed(page, 'Skip Medium');
    await page.getByRole('heading', { name: 'Approach', exact: true }).waitFor();
    await page.getByText('Skipped', { exact: true }).first().waitFor();
    log('skip from the stage bar reveals the editorial ✓');
    if (pset.stages[2].problem.editorial.alternatives?.length) {
      await page.getByRole('heading', { name: 'Other approaches' }).waitFor();
      log('alternative solutions are listed ✓');
      await page.getByRole('button', { name: 'Comments' }).first().waitFor();
    }
    // Off the newest stage, the same button steps forward.
    await page.getByRole('button', { name: /Stage 2: Easy/ }).click();
    await clickWhenArmed(page, 'Next ›');
    await page.getByRole('heading', { name: 'Approach', exact: true }).waitFor();
    log('Next in the stage bar steps forward ✓');
  }

  // ---------- unlimited: rounds drawn from the bank ----------
  await page.goto(`${BASE}/unlimited`);
  await page.getByRole('heading', { name: 'Unlimited' }).waitFor();
  for (const n of ['✓ Easy', '✓ Medium', '✓ Hard', '✓ SWE quiz']) await page.getByRole('button', { name: n }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await question(page, i + 1).waitFor();
    await page.keyboard.press('1');
    await page.getByRole('button', { name: /Next question|Finish stage/ }).click();
  }
  await page.getByRole('button', { name: /^Next round/ }).click();
  await page.getByText('round 2', { exact: false }).filter({ visible: true }).waitFor();
  await question(page, 1).waitFor();
  log('unlimited: a quiz round, then the next round ✓');

  // SWE interview mode: a round of interview questions; the round survives a trip to a Learn page.
  await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
  await page.getByRole('radio', { name: /^SWE interview/ }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('region', { name: /^Interview question 1 of 4/ }).waitFor();
  await page.keyboard.press('2');
  await page.goto(`${BASE}/learn/trees`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.goBack();
  // Back on the same round, at its first unanswered question.
  await page.getByRole('region', { name: /^Interview question 2 of 4/ }).waitFor();
  log('unlimited: SWE interview round, kept across a Learn visit ✓');

  // ---------- learn: index, a page with diagrams, and term links ----------
  await page.goto(`${BASE}/learn`);
  // The page was opened a moment ago, so it's also under "Jump back in": pick the one in the directory.
  await page.getByRole('region', { name: 'Jump back in' }).getByRole('link', { name: /Binary trees & traversals/ }).waitFor();
  await page.getByRole('region', { name: 'Algorithms & data structures' }).getByRole('link', { name: /Binary trees & traversals/ }).click();
  await page.getByRole('heading', { name: 'Binary trees & traversals', level: 1 }).waitFor();
  const diagrams = await page.locator('figure.diagram svg').count();
  if (diagrams < 3) problems.push(`trees page shows only ${diagrams} diagrams`);
  const broken = await page.getByText('(diagram unavailable)').count();
  if (broken) problems.push(`${broken} diagram(s) failed to render`);
  await page.locator('a.term-link').first().waitFor();
  log(`learn: trees page with ${diagrams} diagrams and term links ✓`);
  // Code comments: on by default; the switch hides them in every snippet and brings them back.
  {
    const group = page.locator('.code-group').filter({ has: page.getByRole('button', { name: 'Comments' }) }).first();
    const toggle = group.getByRole('button', { name: 'Comments' });
    if ((await toggle.getAttribute('aria-pressed')) !== 'true') problems.push('learn: code comments should be on by default');
    const withComments = await group.locator('pre').innerText();
    await toggle.click();
    const without = await group.locator('pre').innerText();
    if (without.length >= withComments.length) problems.push('learn: hiding comments did not shorten the code');
    await toggle.click();
    if ((await group.locator('pre').innerText()) !== withComments) problems.push('learn: showing comments again did not restore the code');
    log('learn: comments switch hides and restores code comments ✓');
  }
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await page.getByText('✓ You’ve read this page').waitFor();
  await page.goto(`${BASE}/learn`);
  await page.getByText(/^1$/).first().waitFor();
  await page.getByText('✓ Read').first().waitFor();
  log('learn: marking a page read shows on the index ✓');

  // Full-text search: results with snippets, a deep link into the section, and find on page.
  await page.getByLabel('Search Learn pages').fill('running median');
  const results = page.getByLabel('Search results');
  await results.getByRole('link', { name: /Running median with two heaps/ }).click();
  await page.waitForURL(/\/learn\/heaps\?find=running%20median#running-median-with-two-heaps/);
  const finder = page.getByRole('search');
  await finder.getByText(/^\d+\/\d+$/).waitFor();
  const current = await page.evaluate(() => (CSS.highlights.get('learn-find-current') ? [...CSS.highlights.get('learn-find-current')!][0].toString() : ''));
  if (current.toLowerCase() !== 'running median') problems.push(`find on page: current match is "${current}"`);
  await page.keyboard.press('Escape');
  await finder.waitFor({ state: 'detached' });
  await page.keyboard.press('/');
  await page.keyboard.type('heappop');
  await finder.getByText(/^\d+\/\d+$/).waitFor();
  await page.goBack();
  if ((await page.getByLabel('Search Learn pages').inputValue()) !== 'running median') problems.push('learn search: Back lost the query');
  log('learn: search → section deep link → find on page ✓');

  // ---------- detective: one case of each kind ----------
  {
    type Code = { bad?: number[]; missing?: string[] };
    type Case = { id: string; type: 'choice' | 'lines' | 'missing'; answerIndex?: number; code: Record<string, Code>; doc?: Code };
    const files = await Promise.all(['leet', 'swe', 'design', 'oop'].map(async (k) => (await (await page.request.get(`${BASE}/detective/${k}.json`)).json()) as { cases: Case[] }));
    const byId = new Map(files.flatMap((f) => f.cases).map((c) => [c.id, c]));
    await page.goto(`${BASE}/detective`);
    await page.getByRole('radio', { name: /^Original/ }).click();
    await page.getByRole('button', { name: 'Open the case file' }).click();
    const round = await page.evaluate(() => JSON.parse(localStorage.getItem('learn:v1')!).state as { detective: { round: { ids: string[] } }; settings: { lang: string } });
    // Step forward and back between cases, then leave for the case-file picker and resume.
    await page.getByText('Case 1 of 5', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Following case' }).click();
    await page.getByText('Case 2 of 5', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Previous case' }).click();
    await page.getByText('Case 1 of 5', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Switch case file' }).click();
    await page.getByRole('button', { name: 'Resume round' }).click();
    await page.getByText('Case 1 of 5', { exact: true }).waitFor();
    log('detective: previous / following case and switching the case file mid-round ✓');
    const done = new Set<string>();
    for (const id of round.detective.round.ids) {
      const c = byId.get(id)!;
      await page.getByText(/^Case \d of 5$/).waitFor();
      const v = c.doc ?? c.code[round.settings.lang] ?? Object.values(c.code)[0];
      if (c.type === 'choice') await page.locator('main button.relative').nth(c.answerIndex!).click();
      else if (c.type === 'lines') {
        for (const b of v.bad!) await page.getByRole('button', { name: new RegExp(`^(Line|Decision) ${b}$`) }).click();
        await page.getByRole('button', { name: /Accuse/ }).click();
      } else {
        await page.getByLabel('Missing line 1').fill(v.missing![0]);
        await page.getByRole('button', { name: 'Check', exact: true }).click();
      }
      await page.getByText(/^Case closed/).waitFor();
      done.add(c.type);
      await page.getByRole('button', { name: /Next case|Close the file/ }).click();
    }
    await page.getByText('Every case closed!').waitFor();
    log(`detective: a full Original round solved (${[...done].join(', ')}) ✓`);

    // Design file: a design doc with its architecture picture.
    await page.getByRole('button', { name: 'Change case file' }).click();
    await page.getByRole('radio', { name: /^System design/ }).click();
    await page.getByRole('button', { name: 'Open the case file' }).click();
    await page.getByText('Design doc').waitFor();
    await page.locator('figure.diagram svg').first().waitFor();
    log('detective: System design round shows a design doc and diagram ✓');

    // Software design file: only object-oriented design cases (code or a class design).
    await page.getByRole('button', { name: 'Switch case file' }).click();
    await page.getByRole('radio', { name: /^Software design/ }).click();
    // (Nothing was answered in the system design round, so no "start a new round?" question.)
    await page.getByRole('button', { name: 'Open the case file' }).click();
    await page.getByText('Case 1 of 5', { exact: true }).waitFor();
    const oopIds = await page.evaluate(() => JSON.parse(localStorage.getItem('learn:v1')!).state.detective.round.ids as string[]);
    const oopFile = new Set(files[3].cases.map((c) => c.id));
    if (!oopIds.every((id) => oopFile.has(id))) problems.push(`Software design round drew other cases: ${oopIds.join(', ')}`);
    log('detective: Software design round draws only software design cases ✓');
  }

  // ---------- patch notes, from About ----------
  await page.goto(`${BASE}/about`);
  await page.getByRole('link', { name: /Patch notes/ }).click();
  await page.getByRole('heading', { name: 'Patch notes', level: 1 }).waitFor();
  await page.getByText('Current', { exact: true }).waitFor();
  log('patch notes open from About ✓');

  // ---------- mobile layout ----------
  const mobile = await browser.newContext({ ...require('playwright').devices['iPhone 13'] });
  const m = await mobile.newPage();
  await m.goto(BASE);
  await m.getByText(/cleared|Easy/).first().waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (SHOTS) await m.screenshot({ path: join(SHOTS, 'mobile.png') });
  log(`mobile horizontal overflow: ${overflow}px`);
  if (overflow > 1) problems.push(`mobile page scrolls horizontally by ${overflow}px`);

  // Phones wrap long code lines (no sideways scrolling inside code blocks); Settings can switch that off.
  const codeOverflow = () => m.evaluate(() => [...document.querySelectorAll('pre')].filter((p) => p.scrollWidth > p.clientWidth + 1).length);
  await m.goto(`${BASE}/learn/trees`);
  await m.locator('.code-line').first().waitFor();
  const wrapped = await codeOverflow();
  const rails = await m.evaluate(() => [...document.querySelectorAll('.code-line')].filter((el) => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.5).length);
  if (wrapped > 0) problems.push(`mobile: ${wrapped} code block(s) still scroll sideways`);
  if (rails === 0) problems.push('mobile: no long code line wrapped on the trees page (expected some)');
  // A long first word after the indent must not wrap on its own, leaving a row of nothing but spaces.
  const blankRows = () =>
    m.evaluate(() =>
      [...document.querySelectorAll('.code-ind')].filter((ind) => {
        const next = ind.nextSibling;
        const start = next?.nodeType === Node.TEXT_NODE ? next : next?.firstChild;
        if (!start) return false;
        const r = document.createRange();
        r.setStart(start, 0);
        r.setEnd(start, Math.min(1, (start as Text).length ?? 1));
        return r.getBoundingClientRect().top - ind.parentElement!.getBoundingClientRect().top > 8;
      }).length,
    );
  await m.goto(`${BASE}/learn/concurrency`);
  await m.locator('.code-line').first().waitFor();
  for (const lang of ['Java', 'C++']) {
    await m.getByRole('radiogroup', { name: 'Programming language' }).getByRole('radio', { name: lang }).click();
    await m.waitForTimeout(300);
    const blank = await blankRows();
    if (blank) problems.push(`mobile: ${blank} wrapped ${lang} code line(s) start with an empty row`);
  }
  await m.goto(`${BASE}/learn/trees`);
  await m.locator('.code-line').first().waitFor();
  await m.getByRole('button', { name: 'Settings' }).click();
  await m.getByText('Wrap long code lines').click();
  await m.keyboard.press('Escape');
  const scrolled = await codeOverflow();
  if (scrolled === 0) problems.push('mobile: turning wrapping off should bring back sideways scrolling');
  log(`mobile code: ${rails} wrapped line(s), 0 scrolling blocks; with wrapping off ${scrolled} block(s) scroll ✓`);

  // Learn on a phone: a compact index with jump chips; on a page, the section bar and the contents sheet.
  await m.goto(`${BASE}/learn`);
  const compactOn = await m.getByRole('button', { name: 'Compact list' }).getAttribute('aria-pressed');
  if (compactOn !== 'true') problems.push('mobile learn: the index should start as the compact list');
  const screens = await m.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
  if (screens > 5) problems.push(`mobile learn: the compact index is ${screens.toFixed(1)} screens long`);
  await m.getByRole('navigation', { name: 'Jump to a section' }).getByRole('button', { name: 'Languages' }).click();
  await m.waitForFunction(() => {
    const r = document.getElementById('area-guides')?.getBoundingClientRect();
    return !!r && r.top > 40 && r.top < 220;
  });
  await m.getByRole('link', { name: 'SQL & SQLite' }).click();
  await m.getByRole('heading', { level: 1, name: /SQL & SQLite/ }).waitFor();
  await m.getByRole('button', { name: /^Contents/ }).click();
  const sheet = m.getByRole('dialog', { name: 'Contents' });
  await sheet.getByRole('button', { name: 'Window functions', exact: true }).click();
  await m.waitForURL(/#window-functions$/);
  await sheet.waitFor({ state: 'detached' });
  await m.getByRole('button', { name: 'Contents (now: Window functions)' }).waitFor();
  const headTop = await m.evaluate(() => document.getElementById('window-functions')!.getBoundingClientRect().top);
  if (headTop < 96 || headTop > 160) problems.push(`mobile learn: the jumped-to heading sits at ${Math.round(headTop)}px (under the bars or too low)`);
  await m.getByRole('button', { name: /^Contents/ }).click();
  await sheet.getByRole('tab', { name: 'All pages' }).click();
  await sheet.getByRole('link', { name: 'Caching' }).click();
  await m.getByRole('heading', { level: 1, name: 'Caching' }).waitFor();
  await m.goto(`${BASE}/learn`);
  const recent = m.getByRole('region', { name: 'Jump back in' });
  await recent.getByRole('link', { name: /Caching/ }).waitFor();
  await recent.getByRole('link', { name: /SQL & SQLite.*Window functions/ }).click();
  await m.waitForURL(/\/learn\/lang-sql#window-functions$/);
  log('mobile learn: compact index, jump chips, contents sheet, page switch and resume ✓');

  await browser.close();
  if (problems.length) {
    console.error('\nProblems:\n' + problems.join('\n'));
    process.exit(1);
  }
  log('all e2e checks passed ✓');
}

main().catch(async (e) => {
  console.error(e);
  if (activePage && SHOTS) await activePage.screenshot({ path: join(SHOTS, 'FAILURE.png') }).catch(() => undefined);
  process.exit(1);
});
