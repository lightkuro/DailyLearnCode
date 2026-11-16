/**
 * Prebuild step: copies published day files into public/days/ and writes public/days/index.json.
 * Production only publishes days up to (UTC today + 1), so upcoming sets can't be downloaded early.
 * Preview builds (any Cloudflare branch that can't be production) publish every day, and so does PUBLISH_ALL=1.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { DayIndex } from '../src/content/schema';
import type { TopicsFile } from '../src/game/topicStats';
import { DailySetSchema, DetectiveBankSchema, QuizBankSchema } from '../src/content/schema';
import { readingMinutes, searchSections, termLinks, type LearnIndex, type LearnSearchIndex } from '../src/content/learn';
import { BANK_DIR, DAYS_DIR, DETECTIVE_DIR, ROOT, addDays, listJson, readJson, utcToday, writeJson } from './lib/days';
import { readLearnPages } from './lib/learn';

const OUT = join(ROOT, 'public/days');
/** Cloudflare Workers Builds: these branches (PRODUCTION_BRANCHES, comma separated; default main) are production, any other is a preview. */
const PRODUCTION_BRANCHES = (process.env.PRODUCTION_BRANCHES ?? 'main').split(',').map((b) => b.trim());
const ciBranch = process.env.WORKERS_CI_BRANCH;
const previewBuild = !!ciBranch && !PRODUCTION_BRANCHES.includes(ciBranch);
const publishAll = process.env.PUBLISH_ALL === '1' || previewBuild;
const cutoff = addDays(utcToday(), 1);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const LITE_OUT = join(OUT, 'lite');
mkdirSync(LITE_OUT, { recursive: true });

const index: DayIndex = { days: [], builtAt: new Date().toISOString() };
/** Tags and answer keys per day/stage, so Stats can count answers by topic (see src/game/topicStats.ts). */
const topics: TopicsFile = {};
let skipped = 0;
for (const file of listJson(DAYS_DIR)) {
  const date = basename(file, '.json');
  if (!publishAll && date > cutoff) {
    skipped++;
    continue;
  }
  const set = DailySetSchema.parse(readJson(file));
  copyFileSync(file, join(OUT, `${date}.json`));
  // A light copy for Stats' review list: both quizzes in full, coding stages reduced to their headline.
  writeJson(join(LITE_OUT, `${date}.json`), {
    date,
    stages: set.stages.map((st) =>
      st.kind === 'code'
        ? { kind: 'code', problem: { id: st.problem.id, title: st.problem.title, difficulty: st.problem.difficulty, similarLC: st.problem.similarLC, tags: st.problem.tags } }
        : st,
    ),
  });
  topics[date] = set.stages.map((st) =>
    st.kind === 'code'
      ? { p: st.problem.tags }
      : {
          q: st.questions.map((q) => {
            const v = Object.fromEntries((['java', 'cpp'] as const).flatMap((l) => (q.variants?.[l] ? [[l, q.variants[l]!.answerIndex]] : [])));
            return { t: q.tags, a: q.answerIndex, ...(Object.keys(v).length ? { v } : {}) };
          }),
        },
  );
  index.days.push({
    date,
    titles: set.stages.flatMap((s) => (s.kind === 'code' ? [s.problem.title] : [])),
    lc: set.stages.flatMap((s) => (s.kind === 'code' ? [s.problem.similarLC ? { n: s.problem.similarLC.number, t: s.problem.similarLC.title } : null] : [])),
  });
}
// Question banks aren't tied to a date, so they're always published.
const BANK_OUT = join(ROOT, 'public/bank');
rmSync(BANK_OUT, { recursive: true, force: true });
if (existsSync(BANK_DIR)) {
  mkdirSync(BANK_OUT, { recursive: true });
  for (const f of readdirSync(BANK_DIR).filter((n) => n.endsWith('.json'))) {
    const bank = QuizBankSchema.parse(readJson(join(BANK_DIR, f)));
    writeJson(join(BANK_OUT, `${bank.kind}.json`), bank);
    index.banks = [...(index.banks ?? []), bank.kind];
    console.log(`content: bank ${bank.kind} with ${bank.questions.length} question(s)`);
  }
}
// Detective case files: also undated, always published.
const DET_OUT = join(ROOT, 'public/detective');
rmSync(DET_OUT, { recursive: true, force: true });
if (existsSync(DETECTIVE_DIR)) {
  mkdirSync(DET_OUT, { recursive: true });
  for (const f of readdirSync(DETECTIVE_DIR).filter((n) => n.endsWith('.json'))) {
    const bank = DetectiveBankSchema.parse(readJson(join(DETECTIVE_DIR, f)));
    writeJson(join(DET_OUT, `${bank.kind}.json`), bank);
    index.detective = [...(index.detective ?? []), bank.kind];
    console.log(`content: detective ${bank.kind} with ${bank.cases.length} case(s)`);
  }
}

// Learn pages: one JSON per page plus an index with the term links.
const LEARN_OUT = join(ROOT, 'public/learn');
rmSync(LEARN_OUT, { recursive: true, force: true });
const learn = readLearnPages();
if (learn.length) {
  mkdirSync(LEARN_OUT, { recursive: true });
  const learnIndex: LearnIndex = { pages: [], builtAt: index.builtAt };
  const search: LearnSearchIndex = { pages: [] };
  for (const p of learn) {
    search.pages.push({ slug: p.slug, title: p.title, sections: searchSections(p.md) });
    writeJson(join(LEARN_OUT, `${p.slug}.json`), { slug: p.slug, title: p.title, summary: p.summary, related: p.related, md: p.md });
    learnIndex.pages.push({ slug: p.slug, title: p.title, summary: p.summary, related: p.related, terms: termLinks(p), minutes: readingMinutes(p.md) });
  }
  writeJson(join(LEARN_OUT, 'index.json'), learnIndex);
  // Plain text of every section, fetched only once someone searches.
  writeFileSync(join(LEARN_OUT, 'search.json'), JSON.stringify(search));
  console.log(`content: ${learn.length} learn page(s)`);
}

writeJson(join(OUT, 'index.json'), index);
writeFileSync(join(OUT, 'topics.json'), JSON.stringify(topics));
console.log(
  `content: published ${index.days.length} day(s) up to ${publishAll ? `all${previewBuild ? ` (preview branch ${ciBranch})` : ''}` : cutoff}${skipped ? `, held back ${skipped}` : ''}`,
);
