import { SITE } from '../site';
import { create } from 'zustand';
import { mergeDays } from './merge';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { DailySet } from '../content/schema';
import type { Lang } from '../runner/harness/types';
import { topicsOf } from '../content/topics';
import type { TopicTally } from './topicStats';
import { setStamp, type LcLog, type Stamps } from './review';
import { EMPTY_DETECTIVE, addSeen, type CaseResult, type DetectiveMode, type DetectiveStats } from './detective';
import { MAX_HINTS, SKIPPED, codeMax, isStageDone, quizScore, type CodeProgress, type QuizProgress, type StageProgress } from './scoring';

/** 'unlimited' = a single-stage round drawn from the bank (never counts toward stats or streaks). */
export type DayMode = 'daily' | 'practice' | 'unlimited';

export interface DayRecord {
  /** Progress key: the local play date for dailies, the set date for archive practice. */
  key: string;
  /** Content date actually played (differs from key for "classic" fallbacks). */
  setDate: string;
  mode: DayMode;
  stages: StageProgress[];
  /** Points locked in per stage once it is finished (null while in progress). */
  stageScores: (number | null)[];
  /** Saved editor contents: stage index → language → code. */
  code: Record<number, Partial<Record<Lang, string>>>;
  /** When each saved file was last edited (ms), so syncing keeps the newest edit. */
  codeAt?: Record<number, Partial<Record<Lang, number>>>;
  startedAt: number;
  completedAt?: number;
  score?: number;
}

export type ThemePref = 'system' | 'light' | 'dark';
export type MonoFont = 'default' | 'paper';
export type Ligatures = 'off' | 'comments' | 'all';
export type FontPrefs = Pick<Settings, 'monoFont' | 'ligatures' | 'slashedZero' | 'duospace'>;

export interface Settings {
  lang: Lang;
  sound: boolean;
  theme: ThemePref;
  /** Syntax tray open (wide screens). */
  trayOpen: boolean;
  /** Phones: scroll long code lines sideways instead of wrapping them (this device only). */
  scrollCode?: boolean;
  /** Show comments in solutions and Learn code (default on). */
  codeComments?: boolean;
  /** Shortcut keys above the on-screen keyboard while editing code (touch screens; default on). */
  keybar?: boolean;
  /** Custom shortcut keys per language, space-separated (unset: the defaults in KeyBar.tsx). */
  keybarKeys?: Partial<Record<Lang, string>>;
  /** Hold a key for its second symbol (`(/)`: tap "(", hold ")"); off splits pairs into two keys. Default on. */
  keybarHold?: boolean;
  /** The longer default key set (scrolls sideways) instead of the one-row set. Default off. */
  keybarMore?: boolean;
  /** Font for code: 'default' (the system's monospace font) or Paper Mono. */
  monoFont?: MonoFont;
  /** Paper Mono's coding ligatures (default: in comments only). */
  ligatures?: Ligatures;
  /** Zero with a stroke, so it never reads as O (default on). */
  slashedZero?: boolean;
  /** Paper Mono: narrow spaces and wider M and W (duospace; default off). */
  duospace?: boolean;
  /** Languages whose runtime has finished loading at least once (first load is slow, later ones are cached). */
  warmed?: Partial<Record<Lang, boolean>>;
  /** Last change to a synced setting (language, sound, theme), so syncing keeps the newest. */
  settingsAt?: number;
}

/** Settings that travel with Drive sync (the rest are about this device). */
export const SYNCED_SETTINGS = ['lang', 'sound', 'theme', 'codeComments', 'monoFont', 'ligatures', 'slashedZero', 'duospace', 'keybar', 'keybarKeys', 'keybarHold', 'keybarMore'] as const;

interface Data {
  version: 1;
  days: Record<string, DayRecord>;
  settings: Settings;
  /** Detective mode: lifetime numbers and the round in progress. */
  detective?: DetectiveStats;
  /** Answers outside the daily sets (Unlimited, Detective) per topic id; daily sets are counted from `days`. */
  topicLog?: Record<string, TopicTally>;
  /** Unlimited quiz questions answered wrong (question id → stamp, see review.ts); daily sets come from `days`. */
  missLog?: Stamps;
  /** Unlimited coding rounds by LeetCode number. */
  lcLog?: LcLog;
  /** Learn pages read (slug → stamp). */
  learnRead?: Stamps;
  /** Review items marked done in Stats (item key → stamp). */
  reviewDone?: Stamps;
}

interface Actions {
  ensureDay(key: string, set: DailySet, mode: DayMode): void;
  /** Start over on `key` with a fresh record (Unlimited rounds reuse one key). */
  startRound(key: string, set: DailySet): void;
  answerQuiz(key: string, stage: number, question: number, choice: number, lang: Lang): void;
  /** Skip the stage: unanswered quiz questions / the coding task score 0. */
  skipStage(key: string, stage: number, set: DailySet): void;
  finishQuiz(key: string, stage: number, score: number): void;
  saveCode(key: string, stage: number, lang: Lang, code: string): void;
  takeHint(key: string, stage: number): void;
  recordSubmission(key: string, stage: number, accepted: boolean): void;
  completeDay(key: string, score: number): void;
  setLang(lang: Lang): void;
  setSound(on: boolean): void;
  setScrollCode(on: boolean): void;
  setCodeComments(on: boolean): void;
  setKeybar(p: Pick<Settings, 'keybar' | 'keybarKeys' | 'keybarHold' | 'keybarMore'>): void;
  setFontPrefs(p: FontPrefs): void;
  setTrayOpen(open: boolean): void;
  setTheme(theme: ThemePref): void;
  markWarmed(lang: Lang): void;
  importData(json: string): void;
  /** Merge another snapshot (e.g. from Google Drive) into this one without losing progress. */
  mergeIn(json: string): void;
  resetAll(): void;
  startDetective(mode: DetectiveMode, ids: string[]): void;
  /** Update case `i` of the current round (counts toward the totals once it is done). */
  updateCase(i: number, result: CaseResult): void;
  finishDetective(): void;
  /** Count one Unlimited / Detective answer toward its topics. */
  logTopics(tags: readonly string[], right: boolean): void;
  /** Unlimited: remember a wrong answer for review (a right one clears it). */
  logMiss(questionId: string, right: boolean): void;
  /** Unlimited: a finished coding round, by LeetCode number. */
  logCode(lcNumber: number, solved: boolean): void;
  setLearnRead(slug: string, read: boolean): void;
  setReviewDone(key: string, done: boolean): void;
  /** Forget every day's progress but keep settings (preview builds' quick reset). */
  resetProgress(): void;
}

export type Store = Data & Actions;

const initialData: Data = { version: 1, days: {}, settings: { lang: 'python3', sound: true, trayOpen: true, theme: 'light' } };

function freshStages(set: DailySet): StageProgress[] {
  return set.stages.map((s): StageProgress =>
    s.kind === 'quiz'
      ? { kind: 'quiz', answers: s.questions.map(() => null), langs: s.questions.map(() => null), done: false }
      : { kind: 'code', status: 'active', hintsUsed: 0, submissions: 0 },
  );
}

/** localStorage can throw (private mode, blocked storage); never let that break the app. */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const patchDay = (key: string, fn: (d: DayRecord) => DayRecord | void) =>
        set((s) => {
          const day = s.days[key];
          if (!day) return s;
          const copy: DayRecord = structuredClone(day);
          const next = fn(copy) ?? copy;
          return { days: { ...s.days, [key]: next } };
        });

      return {
        ...initialData,

        ensureDay(key, daySet, mode) {
          set((s) => {
            if (s.days[key]) return s;
            const rec: DayRecord = {
              key,
              setDate: daySet.date,
              mode,
              stages: freshStages(daySet),
              stageScores: daySet.stages.map(() => null),
              code: {},
              startedAt: Date.now(),
            };
            return { days: { ...s.days, [key]: rec } };
          });
        },

        startRound(key, roundSet) {
          set((s) => ({
            days: {
              ...s.days,
              [key]: {
                key,
                setDate: roundSet.date,
                mode: 'unlimited',
                stages: freshStages(roundSet),
                stageScores: roundSet.stages.map(() => null),
                code: {},
                startedAt: Date.now(),
              },
            },
          }));
        },

        answerQuiz(key, stage, question, choice, lang) {
          patchDay(key, (d) => {
            const p = d.stages[stage] as QuizProgress;
            if (p.kind !== 'quiz' || p.done || p.answers[question] !== null) return;
            p.answers[question] = choice;
            p.langs ??= p.answers.map(() => null);
            p.langs[question] = lang;
          });
        },

        skipStage(key, stage, daySet) {
          patchDay(key, (d) => {
            const p = d.stages[stage];
            const s = daySet.stages[stage];
            if (p.kind === 'quiz' && s.kind === 'quiz') {
              if (p.done) return;
              p.answers = p.answers.map((a) => (a === null ? SKIPPED : a));
              p.done = true;
              d.stageScores[stage] = quizScore(s, p.answers, p.langs);
            } else if (p.kind === 'code' && p.status === 'active') {
              p.status = 'gaveup';
              d.stageScores[stage] = 0;
            }
          });
        },

        finishQuiz(key, stage, score) {
          patchDay(key, (d) => {
            const p = d.stages[stage] as QuizProgress;
            if (p.kind !== 'quiz' || p.done || p.answers.some((a) => a === null)) return;
            p.done = true;
            d.stageScores[stage] = score;
          });
        },

        saveCode(key, stage, lang, code) {
          set((s) => {
            const day = s.days[key];
            if (!day || day.code[stage]?.[lang] === code) return s;
            const stageCode = { ...(day.code[stage] ?? {}), [lang]: code };
            const stageAt = { ...(day.codeAt?.[stage] ?? {}), [lang]: Date.now() };
            return { days: { ...s.days, [key]: { ...day, code: { ...day.code, [stage]: stageCode }, codeAt: { ...day.codeAt, [stage]: stageAt } } } };
          });
        },

        takeHint(key, stage) {
          patchDay(key, (d) => {
            const p = d.stages[stage] as CodeProgress;
            if (p.kind !== 'code' || p.status !== 'active' || p.hintsUsed >= MAX_HINTS) return;
            p.hintsUsed += 1;
          });
        },

        recordSubmission(key, stage, accepted) {
          patchDay(key, (d) => {
            const p = d.stages[stage] as CodeProgress;
            if (p.kind !== 'code' || p.status !== 'active') return;
            p.submissions += 1;
            if (accepted) {
              p.status = 'accepted';
              d.stageScores[stage] = codeMax(p.hintsUsed);
            }
          });
        },

        completeDay(key, score) {
          patchDay(key, (d) => {
            if (d.completedAt || !d.stages.every(isStageDone)) return;
            d.completedAt = Date.now();
            d.score = score;
          });
        },

        setLang(lang) {
          set((s) => ({ settings: { ...s.settings, lang, settingsAt: Date.now() } }));
        },

        setSound(on) {
          set((s) => ({ settings: { ...s.settings, sound: on, settingsAt: Date.now() } }));
        },

        setScrollCode(on) {
          set((s) => ({ settings: { ...s.settings, scrollCode: on } }));
        },

        setCodeComments(on) {
          set((s) => ({ settings: { ...s.settings, codeComments: on, settingsAt: Date.now() } }));
        },

        setKeybar(p) {
          set((s) => ({ settings: { ...s.settings, ...p, settingsAt: Date.now() } }));
        },

        setFontPrefs(p) {
          set((s) => ({ settings: { ...s.settings, ...p, settingsAt: Date.now() } }));
        },

        setTrayOpen(open) {
          set((s) => ({ settings: { ...s.settings, trayOpen: open } }));
        },

        setTheme(theme) {
          set((s) => ({ settings: { ...s.settings, theme, settingsAt: Date.now() } }));
        },

        markWarmed(lang) {
          if (get().settings.warmed?.[lang]) return;
          set((s) => ({ settings: { ...s.settings, warmed: { ...s.settings.warmed, [lang]: true } } }));
        },

        importData(json) {
          const parsed = JSON.parse(json);
          const state = parsed?.state ?? parsed;
          if (!state || state.version !== 1 || typeof state.days !== 'object') throw new Error(`Not a ${SITE.name} backup file`);
          set({
            version: 1,
            days: state.days,
            settings: { ...initialData.settings, ...state.settings },
            detective: state.detective,
            topicLog: state.topicLog,
            missLog: state.missLog,
            lcLog: state.lcLog,
            learnRead: state.learnRead,
            reviewDone: state.reviewDone,
          });
        },

        mergeIn(json) {
          const parsed = JSON.parse(json);
          const state = parsed?.state ?? parsed;
          if (!state || state.version !== 1 || typeof state.days !== 'object') throw new Error(`Not a ${SITE.name} progress file`);
          set((s) => ({ days: mergeDays(s.days, state.days as Record<string, DayRecord>) }));
        },

        resetProgress() {
          set({ days: {}, detective: undefined, topicLog: undefined, missLog: undefined, lcLog: undefined, learnRead: undefined, reviewDone: undefined });
        },

        logMiss(questionId, right) {
          set((s) => {
            const missed = (s.missLog?.[questionId] ?? 0) > 0;
            if (right && !missed) return s; // nothing to clear
            return { missLog: setStamp(s.missLog, questionId, !right) };
          });
        },

        logCode(lcNumber, solved) {
          set((s) => {
            const prev = s.lcLog?.[lcNumber];
            return { lcLog: { ...s.lcLog, [lcNumber]: { solved: solved || !!prev?.solved, at: Date.now() } } };
          });
        },

        setLearnRead(slug, read) {
          set((s) => ({ learnRead: setStamp(s.learnRead, slug, read) }));
        },

        setReviewDone(key, done) {
          set((s) => ({ reviewDone: setStamp(s.reviewDone, key, done) }));
        },

        logTopics(tags, right) {
          const ids = topicsOf(tags).map((t) => t.id);
          if (!ids.length) return;
          set((s) => {
            const log = { ...s.topicLog };
            for (const id of ids) {
              const t = log[id] ?? { seen: 0, right: 0 };
              log[id] = { seen: t.seen + 1, right: t.right + (right ? 1 : 0) };
            }
            return { topicLog: log };
          });
        },

        startDetective(mode, ids) {
          set((s) => {
            const d = s.detective ?? EMPTY_DETECTIVE;
            return { detective: { ...d, seen: addSeen(d.seen, ids), round: { mode, ids, results: ids.map(() => null), startedAt: Date.now() } } };
          });
        },

        updateCase(i, result) {
          set((s) => {
            const d = s.detective;
            const r = d?.round;
            if (!d || !r || r.finishedAt || i < 0 || i >= r.ids.length || r.results[i]?.done) return s;
            const results = [...r.results];
            results[i] = result;
            const counted = result.done ? { cases: d.cases + 1, solved: d.solved + (result.solved ? 1 : 0) } : {};
            return { detective: { ...d, ...counted, round: { ...r, results } } };
          });
        },

        finishDetective() {
          set((s) => {
            const d = s.detective;
            const r = d?.round;
            if (!d || !r || r.finishedAt || !r.results.every((x) => x?.done)) return s;
            const perfect = r.results.every((x) => x?.solved);
            return { detective: { ...d, rounds: d.rounds + 1, perfect: d.perfect + (perfect ? 1 : 0), round: { ...r, finishedAt: Date.now() } } };
          });
        },

        resetAll() {
          set({ ...initialData, detective: undefined, topicLog: undefined, missLog: undefined, lcLog: undefined, learnRead: undefined, reviewDone: undefined });
        },
      };
    },
    {
      name: 'learn:v1',
      // v2: light became the default theme; saves that still had the old default ("system") switch to light.
      version: 2,
      migrate: (persisted, from) => {
        const p = (persisted ?? {}) as Partial<Data>;
        if (from < 2 && p.settings?.theme === 'system') p.settings = { ...p.settings, theme: 'light' };
        return p as unknown as Store;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) =>
        ({
          version: s.version,
          days: s.days,
          settings: s.settings,
          detective: s.detective,
          topicLog: s.topicLog,
          missLog: s.missLog,
          lcLog: s.lcLog,
          learnRead: s.learnRead,
          reviewDone: s.reviewDone,
        }) as unknown as Store,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function exportData(): string {
  const { version, days, settings, detective, topicLog, missLog, lcLog, learnRead, reviewDone } = useStore.getState();
  return JSON.stringify({ version, days, settings, detective, topicLog, missLog, lcLog, learnRead, reviewDone, exportedAt: new Date().toISOString() }, null, 2);
}

export function currentStageIndex(rec: DayRecord | undefined): number {
  if (!rec) return 0;
  const i = rec.stages.findIndex((s) => !isStageDone(s));
  return i === -1 ? rec.stages.length : i;
}
