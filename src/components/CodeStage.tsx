import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Problem } from '../content/schema';
import { confettiBurst, playSfx } from '../game/fx';
import { CODE_MAX, MAX_HINTS, codeMax, codeScore, type CodeProgress } from '../game/scoring';
import { stageEmoji } from '../game/share';
import { useStore } from '../game/store';
import { undoKey } from '../game/undoHistory';
import { useRuntimeStatus } from '../runner/manager';
import { LANGS, LANG_LABEL, starterCode, type Lang } from '../runner/harness';
import { judge, type JudgeMode, type JudgeReport } from '../runner/judge';
import { CodeEditor } from './CodeEditor';
import { CommentsToggle, useShownCode } from './CommentsToggle';
import { EditHistoryButtons } from './EditHistory';
import { Markdown } from './Markdown';
import { SyncButton } from './SyncButton';
import { ProblemVisual } from './ProblemVisual';
import { RuntimeChip } from './RuntimeChip';
import { StageDonePanel } from './StageDone';
import { TestResults, formatValue } from './TestResults';
import { Button, Card, ConfirmDialog, TopicTag } from './ui';

type Tab = 'problem' | 'hints' | 'solution';


function lcUrl(title: string): string {
  return `https://leetcode.com/problems/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/`;
}

export function CodeStage({
  dayKey,
  stageIndex,
  problem,
  progress,
  onContinue,
  onSkip,
  isLast = false,
  nextLabel,
}: {
  dayKey: string;
  stageIndex: number;
  problem: Problem;
  progress: CodeProgress;
  onContinue: () => void;
  onSkip: () => void;
  isLast?: boolean;
  /** Label for the finished-stage Next button (default: Next stage / See results). */
  nextLabel?: string;
}) {
  const nextText = nextLabel ?? (isLast ? 'See results' : 'Next stage');
  const lang = useStore((s) => s.settings.lang);
  const setLang = useStore((s) => s.setLang);
  const saved = useStore((s) => s.days[dayKey]?.code[stageIndex]?.[lang]);
  const saveCode = useStore((s) => s.saveCode);
  const takeHint = useStore((s) => s.takeHint);
  const recordSubmission = useStore((s) => s.recordSubmission);

  const starter = useMemo(() => starterCode(lang, problem.signature), [lang, problem.signature]);
  const [code, setCode] = useState(saved ?? starter);
  const [tab, setTab] = useState<Tab>(progress.status === 'gaveup' ? 'solution' : 'problem');
  const [running, setRunning] = useState<JudgeMode | null>(null);
  const [report, setReport] = useState<JudgeReport | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Solved during this visit: the done panel counts down to the next stage. */
  const [fresh, setFresh] = useState(false);
  /** Finished stage: show the editor again instead of the Next/Review panel. */
  const [reviewCode, setReviewCode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const done = progress.status !== 'active';
  const maxNow = codeMax(progress.hintsUsed);

  // The first download of a language runtime is slow; say so once, then it's cached.
  const runtime = useRuntimeStatus((st) => st[lang]);
  const warmed = useStore((s) => !!s.settings.warmed?.[lang]);
  const markWarmed = useStore((s) => s.markWarmed);
  useEffect(() => {
    if (runtime.state === 'ready') markWarmed(lang);
  }, [runtime.state, lang, markWarmed]);
  const firstLoad = runtime.state === 'loading' && !warmed;

  // Esc returns from Hints / Solution to the problem.
  useEffect(() => {
    if (tab === 'problem') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== 'Escape' || (t && (t.isContentEditable || /input|textarea|select/i.test(t.tagName)))) return;
      setTab('problem');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab]);

  // Skipping from the stage bar unlocks the editorial: show it.
  const prevStatus = useRef(progress.status);
  useEffect(() => {
    if (prevStatus.current === 'active' && progress.status === 'gaveup') setTab('solution');
    prevStatus.current = progress.status;
  }, [progress.status]);

  // Switching language (or problem) loads that language's saved code or the starter.
  useEffect(() => {
    setCode(useStore.getState().days[dayKey]?.code[stageIndex]?.[lang] ?? starterCode(lang, problem.signature));
    setReport(null);
  }, [lang, dayKey, stageIndex, problem.signature]);

  const onChange = useCallback(
    (v: string) => {
      setCode(v);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveCode(dayKey, stageIndex, lang, v), 400);
    },
    [saveCode, dayKey, stageIndex, lang],
  );
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const execute = useCallback(
    async (mode: JudgeMode) => {
      if (running) return;
      saveCode(dayKey, stageIndex, lang, codeRef.current);
      setRunning(mode);
      setReport(null);
      try {
        const r = await judge(problem, lang, codeRef.current, mode);
        setReport(r);
        const ok = r.verdict === 'accepted';
        if (mode === 'submit') {
          const wasActive = useStore.getState().days[dayKey]?.stages[stageIndex];
          recordSubmission(dayKey, stageIndex, ok);
          if (ok && wasActive?.kind === 'code' && wasActive.status === 'active') {
            playSfx('accepted');
            confettiBurst(maxNow === CODE_MAX ? 'big' : 'small');
            setFresh(true);
            setReviewCode(false);
          } else playSfx(ok ? 'correct' : 'fail');
        } else playSfx(ok ? 'correct' : 'fail');
      } catch (e) {
        setReport({
          verdict: 'internal_error',
          passed: 0,
          total: 0,
          cases: [],
          message: String((e as Error)?.message ?? e),
          mode,
          lang,
          tests: [],
          exampleCount: 0,
        });
      } finally {
        setRunning(null);
      }
    },
    [running, saveCode, dayKey, stageIndex, lang, problem, recordSubmission, maxNow],
  );
  const onRun = useCallback(() => void execute('run'), [execute]);
  const onSubmit = useCallback(() => void execute('submit'), [execute]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
      {/* ---------------- Problem panel ---------------- */}
      <Card className="flex min-h-0 flex-col lg:h-[calc(100dvh-15rem)] lg:min-h-[560px]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line px-3 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_7.5rem] sm:items-start">
          <PanelToggle active={tab === 'hints'} onClick={() => setTab(tab === 'hints' ? 'problem' : 'hints')} className="justify-self-start">
            {tab === 'hints' ? (
              '← Problem'
            ) : (
              <>
                <BulbIcon className="size-3.5 text-warn" />
                Hints {progress.hintsUsed}/{MAX_HINTS}
              </>
            )}
          </PanelToggle>
          <ProblemTitle problem={problem} showTags={done || progress.hintsUsed > 0} onClick={() => setTab('problem')} />
          {done ? (
            <PanelToggle active={tab === 'solution'} onClick={() => setTab(tab === 'solution' ? 'problem' : 'solution')} className="justify-self-end">
              {tab === 'solution' ? '← Problem' : 'Solution'}
            </PanelToggle>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {tab === 'problem' && <ProblemView problem={problem} />}
          {tab === 'hints' && (
            <HintsView
              problem={problem}
              progress={progress}
              done={done}
              onReveal={() => {
                takeHint(dayKey, stageIndex);
                playSfx('hint');
              }}
            />
          )}
          {tab === 'solution' && <SolutionView problem={problem} done={done} />}
        </div>
      </Card>

      {/* ---------------- Editor + results (or, once finished, Next / Review) ---------------- */}
      {done && !reviewCode ? (
        <Card className="grid min-h-[420px] place-items-center px-6 py-12 lg:h-[calc(100dvh-15rem)] lg:min-h-[560px]">
          <StageDonePanel
            emoji={progress.status === 'accepted' ? stageEmoji(codeScore(progress), CODE_MAX) : '🌂'}
            title={progress.status === 'accepted' ? 'Solved!' : 'Skipped'}
            subtitle={
              progress.status === 'accepted'
                ? progress.hintsUsed === 0
                  ? 'No hints needed. Nice.'
                  : `Solved with ${progress.hintsUsed} ${progress.hintsUsed === 1 ? 'hint' : 'hints'}.`
                : 'The solution is open on the left. Review brings your editor back.'
            }
            nextLabel={nextText}
            onNext={onContinue}
            onReview={() => setReviewCode(true)}
            reviewLabel="Review code"
            auto={fresh}
          />
        </Card>
      ) : (
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="overflow-visible">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <label className="sr-only" htmlFor={`lang-${stageIndex}`}>
              Language
            </label>
            <select
              id={`lang-${stageIndex}`}
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              disabled={!!running}
              className="h-8 rounded-lg border border-line bg-surface-3 px-2 text-sm font-semibold"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABEL[l]}
                </option>
              ))}
            </select>
            <RuntimeChip lang={lang} />
            <div className="ml-auto flex items-center gap-3">
              <EditHistoryButtons code={code} />
              <span className="text-xs text-muted" title="Each hint lowers what this problem is worth by 1">
                {done ? (
                  <span className={progress.status === 'accepted' ? 'text-good' : 'text-faint'}>{progress.status === 'accepted' ? 'Solved' : 'Skipped'}</span>
                ) : (
                  <>
                    Worth <strong className={maxNow < CODE_MAX ? 'text-warn' : 'text-ink'}>{maxNow}</strong> {maxNow === 1 ? 'pt' : 'pts'}
                  </>
                )}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} disabled={!!running}>
                Reset
              </Button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {firstLoad && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-line bg-surface-2 px-4 text-xs text-muted"
                role="status"
              >
                <span className="block py-2">
                  ⛵ <strong className="text-ink">One-time setup:</strong> {LANG_LABEL[lang]} is downloading into your browser. The first load takes about 20 seconds. After that it&apos;s cached, so
                  it&apos;s smooth sailing.
                </span>
              </motion.p>
            )}
          </AnimatePresence>
          <div className="relative h-[420px] overflow-hidden lg:h-[calc(100dvh-28rem)] lg:min-h-[340px]">
            {/* Keyed so undo history starts fresh per problem and language (undo never brings back another language's code). */}
            <CodeEditor
              key={`${problem.id}:${lang}`}
              lang={lang}
              value={code}
              onChange={onChange}
              onRun={onRun}
              onSubmit={onSubmit}
              undoKey={undoKey(dayKey, stageIndex, lang)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <HintButton
              problem={problem}
              progress={progress}
              done={done}
              onReveal={() => {
                takeHint(dayKey, stageIndex);
                playSfx('hint');
              }}
              onOpenTab={() => setTab('hints')}
            />
            <SyncButton variant="toolbar" placement="up" />
            {!done && progress.hintsUsed >= MAX_HINTS && (
              <Button size="sm" variant="ghost" onClick={onSkip} title="Skip this problem: scores 0 and unlocks the solution">
                Skip
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={onRun} disabled={!!running}>
                ▶ Run
              </Button>
              <Button variant="success" onClick={onSubmit} disabled={!!running}>
                Submit
              </Button>
              {done && (
                <Button variant="primary" onClick={onContinue}>
                  {nextText} →
                </Button>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <TestResults report={report} running={running} params={problem.signature.params} points={progress.status === 'accepted' ? codeScore(progress) : undefined} />
        </Card>
        <p className="text-center text-xs text-faint lg:hidden">Coding works best on a larger screen with a keyboard.</p>
      </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset to starter code?"
        body={`Your ${LANG_LABEL[lang]} code for this problem will be replaced by the starter template.`}
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          onChange(starter);
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function PanelToggle({ active, onClick, className = '', children }: { active: boolean; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
        active ? 'border-accent/50 bg-accent/10 text-ink' : 'border-line text-muted hover:border-faint hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Centered title (click: back to the problem). Difficulty appears on hover; topic tags only once a
 * hint has been used (or the stage is over), since they can give the approach away.
 */
function ProblemTitle({ problem, showTags, onClick }: { problem: Problem; showTags: boolean; onClick: () => void }) {
  return (
    <div className="group relative min-w-0 text-center" tabIndex={0} aria-label={`${problem.title}, ${problem.difficulty}`}>
      <h2 className="line-clamp-2 cursor-pointer font-display text-lg leading-snug font-semibold text-ink sm:line-clamp-none sm:truncate sm:text-xl" onClick={onClick}>
        {problem.title}
      </h2>
      <div className="pointer-events-none absolute inset-x-0 top-full z-20 flex flex-wrap items-center justify-center gap-1.5 pt-1 opacity-0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink capitalize shadow-sm">{problem.difficulty}</span>
        {showTags && problem.tags.map((t) => <TopicTag key={t} tag={t} className="border border-line bg-surface shadow-sm" />)}
      </div>
    </div>
  );
}

/** Click to arm, click again to reveal the next hint; hover to peek at revealed hints. */
function HintButton({
  problem,
  progress,
  done,
  onReveal,
  onOpenTab,
}: {
  problem: Problem;
  progress: CodeProgress;
  done: boolean;
  onReveal: () => void;
  onOpenTab: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState(false);
  const [flash, setFlash] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const used = progress.hintsUsed;
  const visible = done ? problem.hints.length : used;
  const allUsed = used >= MAX_HINTS;
  useEffect(() => () => clearTimeout(armTimer.current), []);

  const click = () => {
    if (allUsed || (done && used >= problem.hints.length)) {
      onOpenTab();
      return;
    }
    if (done) {
      onReveal();
      return;
    }
    if (!armed) {
      setArmed(true);
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    onReveal();
    setFlash(true);
    setTimeout(() => setFlash(false), 4500);
  };

  const showPopover = hover || flash;
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        onClick={click}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
          armed ? 'border-warn bg-warn/15 text-warn' : 'border-warn/30 text-warn/90 hover:bg-warn/10'
        }`}
      >
        <BulbIcon className="size-4" />
        {armed ? `Reveal hint ${used + 1}? −1 pt` : allUsed ? 'Hints 3/3' : `Hint${used ? ` ${used}/${MAX_HINTS}` : ''}`}
      </button>
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-full left-0 z-30 mb-2 w-[min(420px,80vw)] rounded-2xl border border-warn/30 bg-surface p-4 shadow-2xl"
            role="tooltip"
          >
            {visible === 0 ? (
              <p className="text-sm text-muted">
                No hints revealed yet. Click once to arm, again to reveal hint 1 — it lowers this task&apos;s max by 1.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {problem.hints.slice(0, visible).map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="mr-1.5 font-display text-xs font-semibold text-warn">Hint {i + 1}</span>
                    <Markdown className="inline [&>p]:inline">{h}</Markdown>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProblemView({ problem }: { problem: Problem }) {
  const { params } = problem.signature;
  return (
    <article>
      <ProblemVisual problem={problem} />
      <Markdown className="text-[0.95rem]">{problem.statementMd}</Markdown>
      <div className="mt-6 space-y-4">
        {problem.examples.map((ex, i) => (
          <div key={i}>
            <p className="mb-1.5 font-display text-sm font-semibold">Example {i + 1}</p>
            <div className="rounded-xl border-l-2 border-accent/40 bg-surface-2 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
              <p className="break-all">
                <span className="text-muted">Input: </span>
                {params.map((p, j) => (
                  <span key={p.name}>
                    {j > 0 && ', '}
                    <span className="text-accent-soft">{p.name}</span> = {formatValue(ex.args[j], 300)}
                  </span>
                ))}
              </p>
              <p className="break-all">
                <span className="text-muted">Output: </span>
                {formatValue(ex.expected, 300)}
              </p>
              {ex.explanation && (
                <p className="mt-1 font-sans text-sm text-muted">
                  <span className="font-semibold text-ink/80">Why: </span>
                  {ex.explanation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {problem.constraints.length > 0 && (
        <div className="mt-6">
          <p className="mb-1.5 font-display text-sm font-semibold">Constraints</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {problem.constraints.map((c) => (
              <li key={c}>
                <code className="font-mono text-[12.5px] text-ink/85">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {problem.compare !== 'exact' && (
        <p className="mt-4 text-xs text-muted">
          {problem.compare === 'unordered' ? 'Any order of the result is accepted.' : 'Any order is accepted, at every level of the result.'}
        </p>
      )}
      {problem.similarLC && (
        <p className="mt-6 text-xs text-faint">
          Similar to LeetCode{' '}
          <a className="text-accent-soft underline underline-offset-2" href={lcUrl(problem.similarLC.title)} target="_blank" rel="noopener noreferrer">
            #{problem.similarLC.number} · {problem.similarLC.title}
          </a>
        </p>
      )}
    </article>
  );
}

function HintsView({ problem, progress, done, onReveal }: { problem: Problem; progress: CodeProgress; done: boolean; onReveal: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const maxNow = codeMax(progress.hintsUsed);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Hints get progressively more specific. {done ? 'This stage is finished, so hints are free now.' : 'Each one lowers this task’s maximum by 1 point.'}
      </p>
      {problem.hints.map((h, i) => {
        const visible = i < progress.hintsUsed || done;
        const next = i === progress.hintsUsed && !done;
        return (
          <motion.div key={i} layout className={`rounded-xl border p-4 ${visible ? 'border-warn/30 bg-warn/5' : 'border-line bg-surface-2'}`}>
            <p className="mb-1 font-display text-xs font-semibold tracking-wider text-warn uppercase">Hint {i + 1}</p>
            {visible ? (
              <motion.div initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}>
                <Markdown className="text-sm">{h}</Markdown>
              </motion.div>
            ) : next ? (
              <Button size="sm" variant="secondary" onClick={() => setConfirm(true)}>
                Reveal (−1 max point)
              </Button>
            ) : (
              <p className="text-sm text-faint">Reveal hint {i} first.</p>
            )}
          </motion.div>
        );
      })}
      <ConfirmDialog
        open={confirm}
        title={`Reveal hint ${progress.hintsUsed + 1}?`}
        body={
          <>
            This task&apos;s maximum drops from <strong className="text-ink">{maxNow}</strong> to <strong className="text-warn">{Math.max(0, maxNow - 1)}</strong> points.
          </>
        }
        confirmLabel="Reveal hint"
        onConfirm={() => {
          onReveal();
          setConfirm(false);
        }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function SolutionView({ problem, done }: { problem: Problem; done: boolean }) {
  const [lang, setLang] = useState<Lang>(useStore.getState().settings.lang);
  const shown = useShownCode(problem.editorial.solutions[lang], lang);
  if (!done) {
    return (
      <div className="grid h-full min-h-60 place-items-center text-center">
        <div>
          <p className="text-4xl">🔒</p>
          <p className="mt-3 font-semibold">The editorial unlocks when you solve the problem or skip it.</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-display text-lg font-semibold">Approach</h3>
      <Markdown className="mt-2 text-sm">{problem.editorial.approachMd}</Markdown>
      <p className="mt-3 text-sm">
        <span className="font-semibold text-ink">Complexity: </span>
        {problem.editorial.complexity}
      </p>
      <div className="mt-5 flex items-center gap-1">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${lang === l ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
        <CommentsToggle className="ml-auto" />
      </div>
      <div className="mt-2 overflow-hidden rounded-xl border border-line">
        <CodeEditor lang={lang} value={shown} readOnly height="auto" />
      </div>
      <Alternatives problem={problem} lang={lang} />
    </div>
  );
}

/** Other common or simpler approaches, as tabs under the main solution (same language as above). */
function Alternatives({ problem, lang }: { problem: Problem; lang: Lang }) {
  const alts = problem.editorial.alternatives ?? [];
  const [pick, setPick] = useState(0);
  if (!alts.length) return null;
  const alt = alts[Math.min(pick, alts.length - 1)];
  return <AlternativeView alt={alt} alts={alts} pick={pick} setPick={setPick} lang={lang} />;
}

function AlternativeView({
  alt,
  alts,
  pick,
  setPick,
  lang,
}: {
  alt: NonNullable<Problem['editorial']['alternatives']>[number];
  alts: NonNullable<Problem['editorial']['alternatives']>;
  pick: number;
  setPick(i: number): void;
  lang: Lang;
}) {
  const shown = useShownCode(alt.solutions[lang], lang);
  return (
    <section className="mt-7 border-t border-line pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-1 font-display text-base font-semibold">Other approaches</h3>
        {alts.map((a, i) => (
          <button
            key={a.name}
            type="button"
            onClick={() => setPick(i)}
            aria-pressed={i === pick}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${i === pick ? 'border-accent/60 bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink'}`}
          >
            {a.name}
          </button>
        ))}
      </div>
      <Markdown className="mt-3 text-sm">{alt.approachMd}</Markdown>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-ink">Complexity: </span>
        {alt.complexity}
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <CodeEditor lang={lang} value={shown} readOnly height="auto" />
      </div>
    </section>
  );
}

function BulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}
