import { loadBank, loadIndex, loadSet } from '../content/loadDay';
import type { DailySet, QuizQuestion } from '../content/schema';
import { TOPICS, topicsOf } from '../content/topics';

/** Stage slots a round can be drawn from (same order as a daily set). */
export const ROUND_KINDS = [
  { stage: 0, label: 'Starter quiz', short: 'Starter' },
  { stage: 1, label: 'Easy', short: 'Easy' },
  { stage: 2, label: 'Medium', short: 'Medium' },
  { stage: 3, label: 'Hard', short: 'Hard' },
  { stage: 4, label: 'SWE quiz', short: 'SWE' },
] as const;

export const UNLIMITED_KEY = 'unlimited';

function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw one round for `stage` from the published bank, avoiding items in `seen` while possible.
 * Quiz rounds mix 4 questions from different days; coding rounds take one problem. The result is a
 * full daily-shaped set (so the normal stage components can play it) whose `stage` slot holds the draw.
 */
export async function drawRound(stage: number, seen: Set<string>, rnd: () => number = Math.random): Promise<DailySet> {
  const index = await loadIndex();
  const dates = shuffle(
    index.days.map((d) => d.date),
    rnd,
  );
  if (!dates.length) throw new Error('No published sets yet.');
  const isQuiz = stage === 0 || stage === 4;
  let base: DailySet | null = null;

  if (isQuiz) {
    // Extra bank questions plus the questions of up to 8 random days.
    const pool: QuizQuestion[] = [...(await loadBank(stage === 0 ? 'dsa' : 'swe'))];
    for (const date of dates.slice(0, 8)) {
      const set = await loadSet(date);
      base ??= set;
      const st = set.stages[stage];
      if (st.kind === 'quiz') pool.push(...st.questions);
    }
    let fresh = pool.filter((q) => !seen.has(q.id));
    if (fresh.length < 4) {
      for (const q of pool) seen.delete(q.id); // bank exhausted: start over
      fresh = pool;
    }
    const questions = shuffle(fresh, rnd).slice(0, 4);
    questions.forEach((q) => seen.add(q.id));
    const quiz = base!.stages[stage];
    if (quiz.kind !== 'quiz') throw new Error('bad bank');
    return withStage(base!, stage, { ...quiz, questions });
  }

  for (const pass of [0, 1]) {
    for (const date of dates) {
      const set = await loadSet(date);
      const st = set.stages[stage];
      if (st.kind !== 'code') continue;
      if (pass === 0 && seen.has(st.problem.id)) continue;
      seen.add(st.problem.id);
      return withStage(set, stage, st);
    }
    // Every problem of this level has been seen: allow repeats.
  }
  throw new Error('No problems found.');
}

function withStage(base: DailySet, stage: number, st: DailySet['stages'][number]): DailySet {
  const stages = [...base.stages] as DailySet['stages'];
  (stages as unknown[])[stage] = st;
  return { ...base, date: `${base.date}#u${Date.now().toString(36)}`, stages };
}

/** Topics offered in the SWE interview mode (every software-engineering topic). */
export const INTERVIEW_TOPICS = TOPICS.filter((t) => t.area === 'swe');

/**
 * Every software-engineering question: the interview bank first, then the extra SWE bank and the SWE
 * quizzes of every published day (ids are unique across them).
 */
export async function interviewPool(): Promise<QuizQuestion[]> {
  const index = await loadIndex();
  const out: QuizQuestion[] = [...(await loadBank('interview')), ...(await loadBank('swe'))];
  const sets = await Promise.all(index.days.map((d) => loadSet(d.date).catch(() => null)));
  for (const set of sets) {
    const st = set?.stages[4];
    if (st?.kind === 'quiz') out.push(...st.questions);
  }
  const ids = new Set<string>();
  return out.filter((q) => !ids.has(q.id) && ids.add(q.id));
}

/** How many questions each interview topic has in `pool`. */
export function topicCounts(pool: QuizQuestion[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const q of pool) for (const t of topicsOf(q.tags)) m.set(t.id, (m.get(t.id) ?? 0) + 1);
  return m;
}

/**
 * Four questions on the chosen topics (unseen first; once they run out, the seen ones come back),
 * as a daily-shaped set whose SWE stage holds them.
 */
export async function drawInterviewRound(topicIds: string[], seen: Set<string>, rnd: () => number = Math.random): Promise<DailySet> {
  const index = await loadIndex();
  if (!index.days.length) throw new Error('No published sets yet.');
  const base = await loadSet(index.days[index.days.length - 1].date);
  const want = new Set(topicIds);
  const pool = (await interviewPool()).filter((q) => topicsOf(q.tags).some((t) => want.has(t.id)));
  if (!pool.length) throw new Error('No questions on those topics yet.');
  let fresh = pool.filter((q) => !seen.has(q.id));
  if (fresh.length < Math.min(4, pool.length)) {
    for (const q of pool) seen.delete(q.id);
    fresh = pool;
  }
  // Interview-bank questions first among the unseen, then the rest; shuffled within each group.
  const isBank = (q: QuizQuestion) => q.id.startsWith('int-');
  let picked = [...shuffle(fresh.filter(isBank), rnd), ...shuffle(fresh.filter((q) => !isBank(q)), rnd)].slice(0, 4);
  // Fewer than 4 on a narrow topic choice: top up from the rest of the topic pool.
  if (picked.length < 4) picked = [...picked, ...shuffle(pool.filter((q) => !picked.includes(q)), rnd)].slice(0, 4);
  while (picked.length < 4) picked.push(pool[picked.length % pool.length]);
  picked = shuffle(picked, rnd);
  picked.forEach((q) => seen.add(q.id));
  const quiz = base.stages[4];
  if (quiz.kind !== 'quiz') throw new Error('bad set');
  return withStage(base, 4, { ...quiz, title: 'SWE interview', questions: picked });
}
