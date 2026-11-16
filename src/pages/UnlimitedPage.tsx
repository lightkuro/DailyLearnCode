import { motion } from 'motion/react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_KM, SkyScene } from '../components/Ascent';
import { QuizStage } from '../components/QuizStage';
import { SyntaxOpeners, SyntaxPanel } from '../components/SyntaxTray';
import { Button, Card, Spinner } from '../components/ui';
import type { DailySet, QuizQuestion } from '../content/schema';
import { useMediaQuery } from '../game/media';
import { isStageDone, stageScore } from '../game/scoring';
import { useStore } from '../game/store';
import { INTERVIEW_TOPICS, ROUND_KINDS, UNLIMITED_KEY, drawInterviewRound, drawRound, interviewPool, topicCounts } from '../game/unlimited';
import { warmup } from '../runner/manager';

const CodeStage = lazy(() => import('../components/CodeStage').then((m) => ({ default: m.CodeStage })));

type Mode = 'stages' | 'interview';

const PREF_KEY = 'learn:unlimited-kinds';
const MODE_KEY = 'learn:unlimited-mode';
const TOPIC_KEY = 'learn:interview-topics';
/** The round in progress, so leaving for a Learn page (or Stats) and coming back keeps it. */
const SESSION_KEY = 'learn:unlimited-round';

function readJson<T>(store: Storage | undefined, key: string): T | null {
  try {
    return JSON.parse(store?.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
function writeJson(store: Storage | undefined, key: string, value: unknown): void {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: not remembered, which is fine */
  }
}
const local = typeof localStorage === 'undefined' ? undefined : localStorage;
const session = typeof sessionStorage === 'undefined' ? undefined : sessionStorage;

function loadKinds(): number[] {
  const v = readJson<number[]>(local, PREF_KEY);
  if (Array.isArray(v) && v.length && v.every((x) => Number.isInteger(x) && x >= 0 && x <= 4)) return v;
  return [0, 1, 2, 3, 4];
}
function loadTopics(): string[] {
  const v = readJson<string[]>(local, TOPIC_KEY);
  const ids = new Set(INTERVIEW_TOPICS.map((t) => t.id));
  if (Array.isArray(v) && v.length && v.every((x) => ids.has(x))) return v;
  return INTERVIEW_TOPICS.map((t) => t.id);
}

/**
 * Only the drawn stage of a round's set is ever read, so the others are emptied before the round is kept in
 * session storage (a day's hidden tests can run to megabytes).
 */
function slimSet(set: DailySet, keep: number): DailySet {
  const stages = set.stages.map((st, i) => {
    if (i === keep) return st;
    if (st.kind === 'quiz') return { ...st, questions: [] };
    const p = st.problem;
    return { ...st, problem: { ...p, tests: [], illustration: undefined, editorial: { ...p.editorial, solutions: { python3: '', java: '', cpp: '' }, alternatives: [] } } };
  });
  return { ...set, stages: stages as unknown as DailySet['stages'] };
}

interface Round {
  n: number;
  mode: Mode;
  stage: number;
  set: DailySet;
}
interface Tally {
  rounds: number;
  points: number;
  solved: number;
}

/** Endless practice: mixed stages from the published sets, or rounds of SWE interview questions by topic. */
export function UnlimitedPage() {
  const [mode, setModeState] = useState<Mode>(() => (readJson<Mode>(local, MODE_KEY) === 'interview' ? 'interview' : 'stages'));
  const [kinds, setKinds] = useState<number[]>(loadKinds);
  const [topics, setTopics] = useState<string[]>(loadTopics);
  const saved = useMemo(() => readJson<{ round: Round; tally: Tally }>(session, SESSION_KEY), []);
  const record = useStore((s) => s.days[UNLIMITED_KEY]);
  const [round, setRound] = useState<Round | null>(() => (saved?.round && record?.setDate === saved.round.set.date ? saved.round : null));
  const [tally, setTally] = useState<Tally>(() => (round && saved?.tally) || { rounds: 0, points: 0, solved: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pool, setPool] = useState<QuizQuestion[] | null>(null);
  const seen = useRef(new Set<string>());
  const startRound = useStore((s) => s.startRound);
  const logTopics = useStore((s) => s.logTopics);
  const logCode = useStore((s) => s.logCode);
  const trayOpen = useStore((s) => s.settings.trayOpen);
  const isXl = useMediaQuery('(min-width: 1280px)');
  const isXxl = useMediaQuery('(min-width: 1536px)');
  const docked = isXl && trayOpen;

  useEffect(() => writeJson(session, SESSION_KEY, round ? { round: { ...round, set: slimSet(round.set, round.stage) }, tally } : null), [round, tally]);

  // Interview mode shows how many questions each topic has.
  useEffect(() => {
    if (mode !== 'interview' || pool) return;
    let alive = true;
    interviewPool().then(
      (p) => alive && setPool(p),
      () => alive && setPool([]),
    );
    return () => {
      alive = false;
    };
  }, [mode, pool]);
  const counts = useMemo(() => (pool ? topicCounts(pool) : null), [pool]);

  const setMode = (m: Mode) => {
    setModeState(m);
    writeJson(local, MODE_KEY, m);
  };
  const toggleKind = (k: number) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k].sort();
    if (!next.length) return;
    setKinds(next);
    writeJson(local, PREF_KEY, next);
  };
  const toggleTopic = (id: string) => {
    const next = topics.includes(id) ? topics.filter((x) => x !== id) : [...topics, id];
    if (!next.length) return;
    setTopics(next);
    writeJson(local, TOPIC_KEY, next);
  };
  const allTopics = (on: boolean) => {
    const next = on ? INTERVIEW_TOPICS.map((t) => t.id) : [];
    if (!next.length) return;
    setTopics(next);
    writeJson(local, TOPIC_KEY, next);
  };

  const current = round && record?.setDate === round.set.date ? record.stages[round.stage] : null;
  const roundPoints = round && current && isStageDone(current) ? stageScore(round.set, round.stage, current) : 0;

  // Coding rounds count toward topic stats once they're finished (quiz answers are logged as you go).
  const loggedRound = useRef<string | null>(null);
  useEffect(() => {
    if (!round || !current || current.kind !== 'code' || !isStageDone(current) || loggedRound.current === round.set.date) return;
    const st = round.set.stages[round.stage];
    if (st.kind !== 'code') return;
    loggedRound.current = round.set.date;
    logTopics(st.problem.tags, current.status === 'accepted');
    if (st.problem.similarLC) logCode(st.problem.similarLC.number, current.status === 'accepted');
  }, [round, current, logTopics, logCode]);

  const next = async (forMode: Mode = round?.mode ?? mode) => {
    if (round && current) {
      const done = isStageDone(current);
      setTally((t) => ({ rounds: t.rounds + 1, points: t.points + roundPoints, solved: t.solved + (done && roundPoints > 0 ? 1 : 0) }));
    }
    setLoading(true);
    setError(null);
    try {
      let stage: number;
      let set: DailySet;
      if (forMode === 'interview') {
        stage = 4;
        set = await drawInterviewRound(topics, seen.current);
      } else {
        stage = kinds[Math.floor(Math.random() * kinds.length)];
        set = await drawRound(stage, seen.current);
        if (set.stages[stage].kind === 'code') void warmup(useStore.getState().settings.lang);
      }
      startRound(UNLIMITED_KEY, set);
      setRound({ n: (round?.n ?? 0) + 1, mode: forMode, stage, set });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  };
  const leave = () => {
    setRound(null);
    setTally({ rounds: 0, points: 0, solved: 0 });
  };

  const topicChips = (small: boolean) => (
    <div className={`flex flex-wrap ${small ? 'gap-1.5' : 'gap-2'}`}>
      {INTERVIEW_TOPICS.map((t) => {
        const on = topics.includes(t.id);
        const n = counts?.get(t.id) ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleTopic(t.id)}
            aria-pressed={on}
            disabled={!!counts && n === 0}
            title={counts ? `${n} question${n === 1 ? '' : 's'}` : undefined}
            className={`rounded-full border font-semibold transition-colors disabled:opacity-40 ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${
              on ? 'border-accent/70 bg-accent/12 text-ink' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {!small && on ? '✓ ' : ''}
            {t.label}
            {!small && counts && <span className="ml-1.5 text-xs font-medium text-faint tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );

  if (!round) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-3xl font-semibold">Unlimited</h1>
          <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Unlimited mode">
            {(
              [
                ['stages', 'Mixed stages', 'Quizzes and coding problems from every published day'],
                ['interview', 'SWE interview', 'Software-engineering interview questions, by topic'],
              ] as const
            ).map(([id, label, blurb]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${mode === id ? 'border-accent bg-accent/10' : 'border-line hover:border-faint'}`}
              >
                <span className="block font-display text-lg font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-muted">{blurb}</span>
              </button>
            ))}
          </div>
          {mode === 'stages' ? (
            <>
              <p className="mt-5 text-muted">
                Pick the kinds of stage you want; each round draws one at random from every published day plus a bank of extra SWE questions, avoiding repeats
                until the bank runs out.
              </p>
              <p className="mt-6 text-[11px] font-semibold tracking-widest text-muted uppercase">Stages</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROUND_KINDS.map((k) => {
                  const on = kinds.includes(k.stage);
                  return (
                    <button
                      key={k.stage}
                      type="button"
                      onClick={() => toggleKind(k.stage)}
                      aria-pressed={on}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${on ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink'}`}
                    >
                      {on ? '✓ ' : ''}
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="mt-5 text-muted">
                Rounds of four questions like the ones asked in software-engineering interviews: system design trade-offs, databases, concurrency, APIs,
                OOP and more. Scenario questions first, then the SWE questions from the daily sets.
              </p>
              <div className="mt-6 flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Topics</p>
                <div className="flex gap-3 text-xs font-semibold">
                  <button type="button" onClick={() => allTopics(true)} className="text-accent-soft hover:underline">
                    All
                  </button>
                </div>
              </div>
              <div className="mt-2">{topicChips(false)}</div>
            </>
          )}
          <p className="mt-6 text-xs text-faint">Unlimited rounds don&apos;t affect your streak; answers count toward your topic stats.</p>
          {error && <p className="mt-4 text-sm text-bad">{error}</p>}
          <Button variant="primary" size="lg" className="mt-6" onClick={() => void next(mode)} disabled={loading}>
            {loading ? <Spinner /> : null} Start
          </Button>
        </Card>
      </div>
    );
  }

  const rightW = docked ? (isXxl ? 370 : 300) : 0;
  const stageData = round.set.stages[round.stage];
  const interview = round.mode === 'interview';
  const label = interview ? 'SWE interview' : ROUND_KINDS[round.stage].label;
  const sessionPoints = tally.points + roundPoints;

  return (
    <div className="space-y-5">
      {stageData.kind === 'quiz' && <SkyScene km={Math.min(MAX_KM, sessionPoints)} />}
      {/* Phones: one bar (round label · session points · new round). */}
      <Card className="flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-4 md:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">
            <button type="button" onClick={leave} className="uppercase hover:text-ink" title="Back to the Unlimited menu">
              Unlimited
            </button>{' '}
            · round {round.n}
          </p>
          <p className="truncate font-display text-xl leading-tight font-semibold">{label}</p>
        </div>
        <p className="shrink-0 text-center font-display text-2xl leading-none font-semibold tabular-nums" title={`${tally.rounds} rounds done this session`}>
          {sessionPoints}
          <span className="mt-0.5 block text-[11px] font-medium text-muted">session</span>
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => void next()}
          disabled={loading}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3.5 font-display text-[15px] font-semibold text-muted hover:border-faint hover:text-ink"
          title="Draw a different round"
        >
          <ShuffleIcon className="size-4" />
          New
        </motion.button>
      </Card>
      {/* Wider screens: label + next-round toggles, new round, session. */}
      <div className="hidden items-stretch gap-3 md:flex">
        <Card className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">
              <button type="button" onClick={leave} className="uppercase hover:text-ink" title="Back to the Unlimited menu">
                Unlimited
              </button>{' '}
              · round {round.n}
            </p>
            <p className="truncate font-display text-xl font-semibold">{label}</p>
          </div>
          {interview ? (
            <div className="min-w-0 flex-1" title="Topics for the next rounds">
              {topicChips(true)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ROUND_KINDS.map((k) => (
                <button
                  key={k.stage}
                  type="button"
                  onClick={() => toggleKind(k.stage)}
                  aria-pressed={kinds.includes(k.stage)}
                  title="Include in the next rounds"
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${kinds.includes(k.stage) ? 'border-accent/60 bg-accent/10 text-ink' : 'border-line text-faint'}`}
                >
                  {k.short}
                </button>
              ))}
            </div>
          )}
        </Card>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => void next()}
          disabled={loading}
          className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface px-5 py-3 font-display text-sm font-semibold text-muted hover:border-faint hover:text-ink"
          title="Draw a different round"
        >
          <ShuffleIcon className="size-5" />
          New round
        </motion.button>
        <Card className="flex w-44 shrink-0 flex-col items-start justify-center px-5 py-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Session</p>
          <p className="font-display text-3xl leading-tight font-semibold tabular-nums">{sessionPoints}</p>
          <p className="text-xs text-faint">{tally.rounds} rounds done</p>
        </Card>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="grid gap-6" style={{ gridTemplateColumns: rightW ? `minmax(0,1fr) ${rightW}px` : 'minmax(0,1fr)', ['--right-col' as string]: `${rightW ? rightW + 24 : 0}px` }}>
        <section className="min-w-0">
          {loading || !current ? (
            <div className="grid min-h-[40vh] place-items-center text-muted">
              <Spinner className="size-7" />
            </div>
          ) : stageData.kind === 'quiz' && current.kind === 'quiz' ? (
            <QuizStage
              key={round.set.date}
              dayKey={UNLIMITED_KEY}
              stageIndex={round.stage}
              stage={stageData}
              progress={current}
              onContinue={() => void next()}
              isLast={false}
              nextLabel="Next round"
              name={interview ? 'Interview' : undefined}
            />
          ) : stageData.kind === 'code' && current.kind === 'code' ? (
            <Suspense
              fallback={
                <div className="grid min-h-[40vh] place-items-center text-muted">
                  <Spinner className="size-7" />
                </div>
              }
            >
              <CodeStage
                key={round.set.date}
                dayKey={UNLIMITED_KEY}
                stageIndex={round.stage}
                problem={stageData.problem}
                progress={current}
                onContinue={() => void next()}
                onSkip={() => useStore.getState().skipStage(UNLIMITED_KEY, round.stage, round.set)}
                nextLabel="Next round"
              />
            </Suspense>
          ) : null}
        </section>
        {docked && <SyntaxPanel />}
      </div>
      <SyntaxOpeners docked={docked} />
    </div>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}
