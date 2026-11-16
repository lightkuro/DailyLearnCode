import { AnimatePresence, motion } from 'motion/react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AltitudeRail, SkyScene } from '../components/Ascent';
import { QuizStage } from '../components/QuizStage';
import { ResultsPanel } from '../components/ResultsPanel';
import { StageBead, StagePath, type PathNode } from '../components/StagePath';
import { SyntaxOpeners, SyntaxPanel } from '../components/SyntaxTray';
import { Button, Card, Spinner } from '../components/ui';
import { loadSet } from '../content/loadDay';
import type { DailySet } from '../content/schema';
import { dayNumber, formatNavDate, localToday } from '../game/dates';
import { confettiBurst, playSfx } from '../game/fx';
import { useMediaQuery } from '../game/media';
import { DAY_MAX, SKIPPED, isStageDone, totalScore } from '../game/scoring';
import { currentStageIndex, useStore, type DayMode } from '../game/store';
import { computeStreak } from '../game/streak';
import { warmup } from '../runner/manager';

const NODE_META: Pick<PathNode, 'label' | 'fruit'>[] = [
  { label: 'Starter', fruit: 'apple' },
  { label: 'Easy', fruit: 'banana' },
  { label: 'Medium', fruit: 'grape' },
  { label: 'Hard', fruit: 'pineapple' },
  { label: 'SWE', fruit: 'crab' },
];

type View = number | 'results';

/** Widths of the right-hand column: the docked syntax tray, or the thin altitude rail when it's hidden. */
const TRAY_W = { xl: 300, xxl: 370 };
const RAIL_W = 56;
const GAP = 24;

/** After the view changes, the Skip/Next button ignores clicks briefly (no accidental double skips). */
const GUARD_MS = 650;

// The editor (CodeMirror) is the heaviest part of the app: load it on demand, prefetched during the quiz.
const loadCodeStage = () => import('../components/CodeStage');
const CodeStage = lazy(() => loadCodeStage().then((m) => ({ default: m.CodeStage })));

export function DayGame({ dayKey, setDate, mode, classic = false }: { dayKey: string; setDate: string; mode: DayMode; classic?: boolean }) {
  const [set, setSet] = useState<DailySet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ensureDay = useStore((s) => s.ensureDay);
  const completeDay = useStore((s) => s.completeDay);
  const skipStage = useStore((s) => s.skipStage);
  const record = useStore((s) => s.days[dayKey]);
  const days = useStore((s) => s.days);
  const lang = useStore((s) => s.settings.lang);
  const trayOpen = useStore((s) => s.settings.trayOpen);
  const isXl = useMediaQuery('(min-width: 1280px)');
  const isXxl = useMediaQuery('(min-width: 1536px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const [viewing, setViewing] = useState<View | null>(null);
  const celebrated = useRef(false);
  const justCompleted = useRef(false);

  useEffect(() => {
    let alive = true;
    setSet(null);
    setError(null);
    loadSet(setDate).then(
      (s) => alive && setSet(s),
      (e) => alive && setError(String(e?.message ?? e)),
    );
    return () => {
      alive = false;
    };
  }, [setDate]);

  useEffect(() => {
    if (set) ensureDay(dayKey, set, mode);
  }, [set, dayKey, mode, ensureDay]);

  const ready = set && record && record.setDate === set.date;
  const current = currentStageIndex(record);
  const allDone = ready ? current >= set.stages.length : false;
  const view: View = viewing ?? (allDone ? 'results' : current);
  const hasActiveCode = !!record?.stages.some((s) => s.kind === 'code' && s.status === 'active');


  // "Daily #n" and the date sit at the left end of the stage bar.
  const dayNum = dayNumber(mode === 'daily' ? dayKey : setDate);
  const navDate = formatNavDate(mode === 'daily' ? dayKey : setDate);
  /** Daily, or what kind of replay this is (the date stays in the tooltip). */
  const leadLabel = classic ? 'Classic' : mode === 'practice' ? 'Practice' : 'Daily';


  // Fetch the preferred toolchain in the background while the player does the starter quiz.
  useEffect(() => {
    if (!hasActiveCode) return;
    const t = setTimeout(() => {
      void loadCodeStage();
      void warmup(lang);
    }, 1200);
    return () => clearTimeout(t);
  }, [lang, hasActiveCode]);

  // Pin the stage on screen once loaded, so finishing a stage shows its review instead of jumping ahead.
  useEffect(() => {
    if (ready && viewing === null) setViewing(allDone ? 'results' : current);
  }, [ready, viewing, allDone, current]);

  // Day completion: lock in the score as soon as the last stage is finished.
  useEffect(() => {
    if (!ready || !allDone || record.completedAt) return;
    justCompleted.current = true;
    completeDay(dayKey, totalScore(set, record.stages));
  }, [ready, allDone, record, set, completeDay, dayKey]);

  const streak = useMemo(() => computeStreak(days, localToday()).current, [days]);

  // [ and ] step between unlocked stages (ignored while typing).
  const stepRef = useRef<(d: -1 | 1) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/input|textarea|select/i.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === '[') stepRef.current(-1);
      else if (e.key === ']') stepRef.current(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-3xl">🛰️</p>
        <p className="mt-3 font-semibold">Couldn&apos;t load this set.</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Button className="mt-5" onClick={() => location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }
  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }

  const showResults = () => {
    setViewing('results');
    if (justCompleted.current && !celebrated.current) {
      celebrated.current = true;
      const score = totalScore(set, record.stages);
      setTimeout(() => {
        playSfx('complete');
        confettiBurst(score === DAY_MAX ? 'perfect' : 'big');
      }, 250);
    }
  };

  const score = totalScore(set, record.stages);
  const nodes: PathNode[] = set.stages.map((_, i) => {
    const p = record.stages[i];
    const skipped = p.kind === 'code' ? p.status === 'gaveup' : p.done && p.answers.every((a) => a === SKIPPED);
    const quiz = p.kind === 'quiz' && !p.done ? { answered: p.answers.filter((a) => a !== null).length, steps: p.answers.length } : p.kind === 'quiz' ? { steps: p.answers.length } : {};
    return { ...NODE_META[i], status: isStageDone(p) ? 'done' : i === current ? 'active' : 'locked', skipped, ...quiz };
  });

  const goNext = (from: number) => {
    const next = from + 1;
    if (next >= set.stages.length) {
      if (allDone) showResults();
      else setViewing(current);
    } else setViewing(Math.min(next, current));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Skipping is instant (no confirmation): the stage scores 0 and its solution unlocks.
  const skip = (i: number) => {
    skipStage(dayKey, i, set);
    playSfx('tick');
    setViewing(i);
  };

  stepRef.current = (d) => {
    if (view === 'results') {
      if (d < 0) setViewing(set.stages.length - 1);
      return;
    }
    if (d > 0) {
      if (view < current) setViewing(view + 1);
      else if (allDone && view === set.stages.length - 1) showResults();
    } else if (view > 0) setViewing(view - 1);
  };

  const stage = view === 'results' ? null : set.stages[view];
  const progress = view === 'results' ? null : record.stages[view];

  // Right-hand column: the docked tray (xl+, when open) or the altitude rail (md+).
  const docked = isXl && trayOpen;
  const rightW = docked ? (isXxl ? TRAY_W.xxl : TRAY_W.xl) : isMd ? RAIL_W : 0;
  const sky = view === 'results' || stage?.kind === 'quiz';
  // Skip on the newest stage; elsewhere the same button steps forward.
  const atFrontier = !allDone && view === current;
  const canStepForward = view !== 'results' && (view < current || (allDone && view === set.stages.length - 1));

  return (
    <div className="space-y-5">
      {sky && <SkyScene km={score} />}

      {/* Phones: one compact bar (current stage, the list of stages, points, skip / next). */}
      <MobileStageBar
        nodes={nodes}
        view={view}
        onSelect={(i) => setViewing(i)}
        lead={leadLabel}
        dayNum={dayNum}
        dateTitle={`${leadLabel === 'Daily' ? '' : `${leadLabel} of the `}${navDate}${leadLabel === 'Daily' ? '' : ' set'}`}
        score={score}
        action={
          atFrontier || canStepForward ? (
            <GuardedButton
              key={`m-${String(view)}-${current}`}
              compact
              onClick={() => (atFrontier ? skip(current) : stepRef.current(1))}
              title={atFrontier ? `Skip ${NODE_META[current]?.label ?? 'stage'}: scores 0 and unlocks its solution` : 'Go to the next stage'}
              label={atFrontier ? 'Skip' : view === set.stages.length - 1 ? 'Results ›' : 'Next ›'}
              tone={atFrontier ? 'skip' : 'next'}
            />
          ) : allDone && view !== 'results' ? (
            <button type="button" onClick={showResults} className="h-11 rounded-xl border border-accent/40 bg-accent/10 px-4 font-display text-[15px] font-semibold text-accent-soft">
              Results ›
            </button>
          ) : null
        }
      />

      {/* Stage bar, skip/next and points span the full width, so opening the tray never moves them. */}
      <div className="hidden gap-3 md:flex md:flex-row md:items-stretch">
        <Card className="flex flex-1 items-center gap-1 py-2 pr-2 pl-4 sm:pl-5">
          <div className="w-16 shrink-0 sm:w-20" title={`${leadLabel === 'Daily' ? '' : `${leadLabel} of the `}${navDate}${leadLabel === 'Daily' ? '' : ' set'}`}>
            <p className="font-display text-[11px] font-semibold tracking-widest text-muted uppercase">{leadLabel}</p>
            <p className="font-display text-2xl leading-tight font-semibold tabular-nums sm:text-3xl">#{dayNum}</p>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <StagePath nodes={nodes} viewing={view === 'results' ? -1 : view} onSelect={(i) => setViewing(i)} />
          </div>
        </Card>
        {(atFrontier || canStepForward) && (
          <GuardedButton
            key={`${String(view)}-${current}`}
            onClick={() => (atFrontier ? skip(current) : stepRef.current(1))}
            title={atFrontier ? `Skip ${NODE_META[current]?.label ?? 'stage'}: scores 0 and unlocks its solution` : 'Go to the next stage'}
            label={atFrontier ? `Skip ${NODE_META[current]?.label}` : view === set.stages.length - 1 ? 'Results ›' : 'Next ›'}
            tone={atFrontier ? 'skip' : 'next'}
          />
        )}
        <Card className="flex items-center justify-between gap-4 px-5 py-3 md:w-44 md:flex-col md:items-start md:justify-center md:gap-0">
          <p className="font-display text-4xl font-semibold tabular-nums" title={`${score} of ${DAY_MAX} points: each point is a km of altitude`}>
            <AnimatedNumber value={score} />
            <span className="text-lg text-faint">/{DAY_MAX}</span>
            <span className="ml-1.5 text-xl text-muted">km</span>
          </p>
          <AnimatePresence>
            {allDone && view !== 'results' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={showResults}
                className="text-xs font-semibold text-accent-soft hover:underline"
              >
                Results ›
              </motion.button>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: rightW ? `minmax(0,1fr) ${rightW}px` : 'minmax(0,1fr)',
          ['--right-col' as string]: `${rightW ? rightW + GAP : 0}px`,
        }}
      >
        <motion.section className="min-w-0" key={String(view)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {view === 'results' ? (
            <div className="quiz-center">
              <ResultsPanel set={set} record={record} streak={streak} onReview={(i) => setViewing(i)} />
            </div>
          ) : stage?.kind === 'quiz' && progress?.kind === 'quiz' ? (
            <QuizStage
              key={`${dayKey}-${view}`}
              dayKey={dayKey}
              stageIndex={view}
              stage={stage}
              progress={progress}
              onContinue={() => goNext(view)}
              isLast={view === set.stages.length - 1}
            />
          ) : stage?.kind === 'code' && progress?.kind === 'code' ? (
            <Suspense
              fallback={
                <div className="grid min-h-[40vh] place-items-center text-muted">
                  <Spinner className="size-7" />
                </div>
              }
            >
              <CodeStage
                key={`${dayKey}-${view}`}
                dayKey={dayKey}
                stageIndex={view}
                problem={stage.problem}
                progress={progress}
                isLast={view === set.stages.length - 1}
                onContinue={() => goNext(view)}
                onSkip={() => skip(view)}
              />
            </Suspense>
          ) : null}
        </motion.section>
        {docked ? <SyntaxPanel /> : rightW ? <AltitudeRail km={score} /> : null}
      </div>

      <SyntaxOpeners docked={docked} />
    </div>
  );
}

/** Skip / Next: briefly inert after appearing so a double click can't skip two stages. */
function GuardedButton({ onClick, title, label, tone, compact = false }: { onClick: () => void; title: string; label: string; tone: 'skip' | 'next'; compact?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), GUARD_MS);
    return () => clearTimeout(t);
  }, []);
  const toneCls =
    tone === 'next'
      ? 'border-accent/40 bg-accent/10 text-accent-soft hover:border-accent/70 hover:bg-accent/15'
      : 'border-line bg-surface text-muted hover:border-faint hover:text-ink';
  return (
    <motion.button
      type="button"
      onClick={() => ready && onClick()}
      aria-disabled={!ready}
      whileTap={ready ? { scale: 0.96 } : undefined}
      className={`flex shrink-0 items-center justify-center border font-display font-semibold transition-[opacity,color,border-color,background-color] duration-300 ${
        compact ? 'h-11 rounded-xl px-4 text-[15px]' : 'gap-2 rounded-2xl px-5 py-3 text-lg md:w-40 md:flex-col md:gap-1 md:px-4'
      } ${toneCls} ${ready ? 'opacity-100' : 'cursor-default opacity-50'}`}
      title={title}
    >
      <span className={tone === 'next' && !compact ? 'text-xl' : ''}>{label}</span>
    </motion.button>
  );
}

/**
 * Phone layout of the stage bar: the stage on screen as one bead, then every stage's name stacked (the
 * one on screen in bold, finished ones ticked, locked ones faint), the points and the skip / next button.
 */
function MobileStageBar({
  nodes,
  view,
  onSelect,
  lead,
  dayNum,
  dateTitle,
  score,
  action,
}: {
  nodes: PathNode[];
  view: View;
  onSelect: (i: number) => void;
  lead: string;
  dayNum: number;
  dateTitle: string;
  score: number;
  action: React.ReactNode;
}) {
  const shown = view === 'results' ? null : nodes[view];
  // Four groups spread evenly across the bar: day number · bead + stage names · points · action.
  return (
    <Card className="flex items-center justify-between gap-2 py-2.5 pr-2.5 pl-4 md:hidden">
      <div className="shrink-0" title={dateTitle}>
        <p className="font-display text-[10px] font-semibold tracking-widest text-muted uppercase">{lead}</p>
        <p className="font-display text-2xl leading-tight font-semibold tabular-nums">#{dayNum}</p>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <StageBead node={shown} big />
        <ol className="min-w-0" aria-label="Stages">
          {nodes.map((n, i) => {
            const on = view === i;
            const locked = n.status === 'locked';
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(i)}
                  aria-current={on ? 'step' : undefined}
                  className={`flex w-full items-center gap-1 text-left font-display text-[12.5px] leading-4 ${
                    on ? 'font-bold text-ink' : locked ? 'text-faint/70' : 'font-medium text-muted'
                  }`}
                >
                  <span className="truncate">{n.label}</span>
                  {n.status === 'done' && <span className={`text-[10px] ${n.skipped ? 'text-faint' : 'text-accent-soft'}`}>{n.skipped ? '–' : '✓'}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="shrink-0 text-center font-display text-2xl leading-none font-semibold tabular-nums" title={`${score} of ${DAY_MAX} points: each point is a km of altitude`}>
        <AnimatedNumber value={score} />
        <span className="text-sm text-faint">/{DAY_MAX}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-muted">km</span>
      </p>
      {action}
    </Card>
  );
}
