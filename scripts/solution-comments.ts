/**
 * Tools for adding comments to editorial solutions without touching the code.
 *
 *   tsx scripts/solution-comments.ts export <dir> <date…>   one code file per solution: <dir>/<date>/s<stage>-<main|altN>.<py|java|cpp>
 *   tsx scripts/solution-comments.ts import <dir> <date…> [--code]   put edited files back (refuses any change other
 *                                                                    than comments unless --code: e.g. clearer variable
 *                                                                    names; re-run validate-content afterwards)
 *   tsx scripts/solution-comments.ts check [--learn]        compare content/ with git HEAD: only comments may differ in code,
 *                                                           nothing else may differ; lists solutions that still have no comments
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { codeOnly, hasComments } from '../src/content/comments';
import type { Lang } from '../src/runner/harness/types';
import { DAYS_DIR, LEARN_DIR, ROOT, formatJson } from './lib/days';

const EXT: Record<Lang, string> = { python3: 'py', java: 'java', cpp: 'cpp' };
const LANGS: Lang[] = ['python3', 'java', 'cpp'];

interface Sol {
  solutions: Record<Lang, string>;
}
interface Day {
  date: string;
  stages: { kind: string; problem?: { title: string; editorial: Sol & { alternatives?: (Sol & { name: string })[] } } }[];
}
/** Every solution block of a day: [key, holder]. */
function blocks(day: Day): [string, Sol, string][] {
  const out: [string, Sol, string][] = [];
  day.stages.forEach((st, i) => {
    if (st.kind !== 'code' || !st.problem) return;
    const e = st.problem.editorial;
    out.push([`s${i}-main`, e, `${st.problem.title}: main solution`]);
    (e.alternatives ?? []).forEach((a, k) => out.push([`s${i}-alt${k}`, a, `${st.problem!.title}: alternative "${a.name}"`]));
  });
  return out;
}
const dayPath = (date: string) => join(DAYS_DIR, `${date}.json`);
const readDay = (date: string): Day => JSON.parse(readFileSync(dayPath(date), 'utf8'));
const headFile = (rel: string): string | null => {
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  } catch {
    return null;
  }
};

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'export') {
  const [dir, ...dates] = args;
  for (const date of dates) {
    const out = join(dir, date);
    mkdirSync(out, { recursive: true });
    const notes: string[] = [];
    for (const [key, sol, label] of blocks(readDay(date))) {
      for (const lang of LANGS) writeFileSync(join(out, `${key}.${EXT[lang]}`), sol.solutions[lang].replace(/\n?$/, '\n'));
      notes.push(`${key}: ${label}`);
    }
    writeFileSync(join(out, 'INDEX.txt'), notes.join('\n') + '\n');
    console.log(`exported ${date} → ${out}`);
  }
} else if (cmd === 'import') {
  const allowCode = args.includes('--code');
  const [dir, ...dates] = args.filter((a) => !a.startsWith('--'));
  let bad = 0;
  for (const date of dates) {
    const day = readDay(date);
    for (const [key, sol] of blocks(day)) {
      for (const lang of LANGS) {
        const file = join(dir, date, `${key}.${EXT[lang]}`);
        if (!existsSync(file)) continue;
        // Keep the original's ending (some solutions end with a newline, some don't).
        const next = readFileSync(file, 'utf8').replace(/\s+$/, '') + (/\s*$/.exec(sol.solutions[lang])?.[0] ?? '');
        if (!allowCode && codeOnly(next, lang) !== codeOnly(sol.solutions[lang], lang)) {
          console.error(`✗ ${date} ${key}.${EXT[lang]}: the code changed (only comments may change; --code allows it); not imported`);
          bad++;
          continue;
        }
        sol.solutions[lang] = next;
      }
    }
    writeFileSync(dayPath(date), formatJson(day));
    console.log(`imported ${date}`);
  }
  if (bad) process.exit(1);
} else if (cmd === 'check') {
  let bad = 0;
  let missing = 0;
  let total = 0;
  for (const f of readdirSync(DAYS_DIR).filter((n) => n.endsWith('.json')).sort()) {
    const now = JSON.parse(readFileSync(join(DAYS_DIR, f), 'utf8')) as Day;
    const headRaw = headFile(`content/days/${f}`);
    const head = headRaw ? (JSON.parse(headRaw) as Day) : null;
    const nowBlocks = blocks(now);
    if (head) {
      const headBlocks = blocks(head);
      // Everything except the solution text must be identical.
      const blank = (d: Day) => {
        const c = structuredClone(d);
        for (const [, sol] of blocks(c)) for (const l of LANGS) sol.solutions[l] = '';
        return JSON.stringify(c);
      };
      if (blank(now) !== blank(head)) {
        console.error(`✗ ${f}: something other than solution code changed`);
        bad++;
      }
      headBlocks.forEach(([key, sol], i) => {
        for (const lang of LANGS) {
          const after = nowBlocks[i]?.[1].solutions[lang] ?? '';
          if (codeOnly(after, lang) !== codeOnly(sol.solutions[lang], lang)) {
            console.error(`✗ ${f} ${key} ${lang}: code changed, not just comments`);
            bad++;
          }
        }
      });
    }
    for (const [key, sol, label] of nowBlocks) {
      for (const lang of LANGS) {
        total++;
        if (!hasComments(sol.solutions[lang], lang)) {
          missing++;
          if (!args.includes('--quiet')) console.log(`  no comments: ${f} ${key} ${lang} (${label})`);
        }
      }
    }
  }
  console.log(`solutions: ${total - missing}/${total} have comments; ${bad} problem(s)`);

  if (args.includes('--learn')) {
    const LANG_OF: Record<string, Lang> = { python: 'python3', py: 'python3', python3: 'python3', java: 'java', cpp: 'cpp', 'c++': 'cpp' };
    /** Prose outside code fences, and the code fences themselves. */
    const split = (md: string) => {
      const prose: string[] = [];
      const code: { lang: Lang; body: string }[] = [];
      md.replace(/```([\w+]*)\n([\s\S]*?)```|([^`]+|`)/g, (_m, lang: string, body: string, text: string) => {
        if (body !== undefined && LANG_OF[lang]) code.push({ lang: LANG_OF[lang], body });
        else prose.push(body !== undefined ? `\`\`\`${lang}\n${body}\`\`\`` : text);
        return '';
      });
      return { prose: prose.join(''), code };
    };
    let learnBad = 0;
    for (const f of readdirSync(LEARN_DIR).filter((n) => n.endsWith('.md'))) {
      const head = headFile(`content/learn/${f}`);
      if (!head) continue;
      const a = split(head);
      const b = split(readFileSync(join(LEARN_DIR, f), 'utf8'));
      if (a.prose !== b.prose || a.code.length !== b.code.length) {
        console.error(`✗ learn/${f}: text outside code blocks changed, or a code block was added/removed`);
        learnBad++;
        continue;
      }
      a.code.forEach((c, i) => {
        if (codeOnly(c.body, c.lang) !== codeOnly(b.code[i].body, b.code[i].lang)) {
          console.error(`✗ learn/${f} code block ${i + 1} (${c.lang}): code changed, not just comments`);
          learnBad++;
        }
      });
    }
    console.log(`learn: ${learnBad} problem(s)`);
    bad += learnBad;
  }
  if (bad) process.exit(1);
} else {
  console.error('usage: solution-comments.ts export <dir> <date…> | import <dir> <date…> [--code] | check [--learn] [--quiet]');
  process.exit(2);
}
