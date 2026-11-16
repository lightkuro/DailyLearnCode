import { hashString } from '../game/dates';
import { LearnIndexSchema, LearnPageSchema, type LearnIndex, type LearnPage, type LearnSearchIndex } from './learn';
import { DailySetSchema, DayIndexSchema, DetectiveBankSchema, QuizBankSchema, QuizStageSchema, type DailySet, type DayIndex, type DetectiveCase, type DetectiveKind, type QuizQuestion, type QuizStage } from './schema';

let indexPromise: Promise<DayIndex> | null = null;
const setCache = new Map<string, Promise<DailySet>>();

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export function loadIndex(): Promise<DayIndex> {
  indexPromise ??= fetchJson('/days/index.json')
    .then((j) => DayIndexSchema.parse(j))
    .catch((e) => {
      indexPromise = null;
      throw e;
    });
  return indexPromise;
}

export function loadSet(date: string): Promise<DailySet> {
  let p = setCache.get(date);
  if (!p) {
    p = fetchJson(`/days/${date}.json`).then((j) => DailySetSchema.parse(j));
    p.catch(() => setCache.delete(date));
    setCache.set(date, p);
  }
  return p;
}

const bankCache = new Map<string, Promise<QuizQuestion[]>>();

/** Extra questions for Unlimited (public/bank/<kind>.json, listed in the index). A missing or broken bank is just empty. */
export function loadBank(kind: 'dsa' | 'swe' | 'interview'): Promise<QuizQuestion[]> {
  let p = bankCache.get(kind);
  if (!p) {
    p = loadIndex()
      .then(async (idx) => (idx.banks?.includes(kind) ? QuizBankSchema.parse(await fetchJson(`/bank/${kind}.json`)).questions : []))
      .catch(() => []);
    bankCache.set(kind, p);
  }
  return p;
}

export interface DailyPick {
  setDate: string;
  /** True when today's set was missing and an older "classic" set is replayed instead. */
  classic: boolean;
}

/** Today's set if published, otherwise a deterministic "classic" from earlier days. */
export function pickDaily(index: DayIndex, today: string): DailyPick | null {
  if (index.days.some((d) => d.date === today)) return { setDate: today, classic: false };
  const past = index.days.filter((d) => d.date < today);
  if (!past.length) return index.days.length ? { setDate: index.days[0].date, classic: true } : null;
  return { setDate: past[hashString(today) % past.length].date, classic: true };
}

const detectiveCache = new Map<string, Promise<DetectiveCase[]>>();

/** Detective case files (public/detective/<kind>.json, listed in the index). Missing → no cases. */
export function loadDetective(kind: DetectiveKind): Promise<DetectiveCase[]> {
  let p = detectiveCache.get(kind);
  if (!p) {
    p = loadIndex()
      .then(async (idx) => (idx.detective?.includes(kind) ? DetectiveBankSchema.parse(await fetchJson(`/detective/${kind}.json`)).cases : []))
      .catch(() => {
        detectiveCache.delete(kind);
        return [];
      });
    detectiveCache.set(kind, p);
  }
  return p;
}

// ---------- Learn pages ----------

let learnIndexPromise: Promise<LearnIndex> | null = null;
const learnPageCache = new Map<string, Promise<LearnPage>>();

/** public/learn/index.json: page titles, summaries and the term → link list. */
export function loadLearnIndex(): Promise<LearnIndex> {
  learnIndexPromise ??= fetchJson('/learn/index.json')
    .then((j) => LearnIndexSchema.parse(j))
    .catch((e) => {
      learnIndexPromise = null;
      throw e;
    });
  return learnIndexPromise;
}

let learnSearchPromise: Promise<LearnSearchIndex> | null = null;
/** public/learn/search.json: every section as plain text (about 200 kB gzipped, fetched on the first search). */
export function loadLearnSearch(): Promise<LearnSearchIndex> {
  learnSearchPromise ??= fetchJson('/learn/search.json')
    .then((j) => j as LearnSearchIndex)
    .catch((e) => {
      learnSearchPromise = null;
      throw e;
    });
  return learnSearchPromise;
}

export function loadLearnPage(slug: string): Promise<LearnPage> {
  let p = learnPageCache.get(slug);
  if (!p) {
    p = fetchJson(`/learn/${encodeURIComponent(slug)}.json`).then((j) => LearnPageSchema.parse(j));
    p.catch(() => learnPageCache.delete(slug));
    learnPageCache.set(slug, p);
  }
  return p;
}

/** A day's quizzes in full plus its coding stages' headlines (public/days/lite, for Stats' review list). */
export interface LiteDay {
  date: string;
  stages: (QuizStage | { kind: 'code'; problem: { id: string; title: string; difficulty: string; similarLC?: { number: number; title: string }; tags: string[] } })[];
}
const liteCache = new Map<string, Promise<LiteDay | null>>();
export function loadLite(date: string): Promise<LiteDay | null> {
  let p = liteCache.get(date);
  if (!p) {
    p = fetchJson(`/days/lite/${date}.json`)
      .then((j) => {
        const d = j as LiteDay;
        return { date: d.date, stages: d.stages.map((st) => (st.kind === 'quiz' ? QuizStageSchema.parse(st) : st)) };
      })
      .catch(() => {
        liteCache.delete(date);
        return null;
      });
    liteCache.set(date, p);
  }
  return p;
}
