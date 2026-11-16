import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { hasVariants, resolveQuestion } from '../content/quiz';
import type { QuizStage as QuizStageData } from '../content/schema';
import { confettiBurst, playSfx } from '../game/fx';
import { useMediaQuery } from '../game/media';
import { SKIPPED, quizScore, type QuizProgress } from '../game/scoring';
import { stageEmoji } from '../game/share';
import { useStore } from '../game/store';
import { LANG_LABEL } from '../runner/harness/types';
import { Markdown } from './Markdown';
import { ModeBox } from './ModeBox';
import { useLocation } from 'react-router';
import { useLearnTerms } from '../content/useLearn';
import { linkForPhrase } from '../content/termLinks';
import { UNLIMITED_KEY } from '../game/unlimited';
import { Link } from 'react-router';
import { QuizArt, pickArt } from './QuizArt';
import { StageDonePanel, TimerBar } from './StageDone';
import { Button } from './ui';

const LETTERS = ['A', 'B', 'C', 'D'];
export const QUIZ_NAME = { dsa: 'Starter', swe: 'SWE' } as const;

const PANEL = 'rounded-2xl border border-line/70 bg-surface/85 shadow-xl backdrop-blur-md';
/** Free space needed left of the quiz before the mode box shows (box width + breathing room). */
const MODEBOX_ROOM = 248;

/** Free space left and right of the quiz column (the review arrows go there when they fit). */
function useSideGaps(ref: RefObject<HTMLElement | null>, key: unknown): { left: number; right: number } {
  const [gap, setGap] = useState({ left: 0, right: 0 });
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const a = el.getBoundingClientRect();
      const b = parent.getBoundingClientRect();
      setGap((g) => (g.left === a.left - b.left && g.right === b.right - a.right ? g : { left: a.left - b.left, right: b.right - a.right }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref, key]);
  return gap;
}

export function QuizStage({
  dayKey,
  stageIndex,
  stage,
  progress,
  onContinue,
  isLast,
  nextLabel,
  name,
}: {
  dayKey: string;
  stageIndex: number;
  stage: QuizStageData;
  progress: QuizProgress;
  onContinue: () => void;
  isLast: boolean;
  /** Label for the finished-stage Next button (default: Next stage / See results). */
  nextLabel?: string;
  /** Name in the header (default: Starter / SWE). */
  name?: string;
}) {
  const answerQuiz = useStore((s) => s.answerQuiz);
  const finishQuiz = useStore((s) => s.finishQuiz);
  const lang = useStore((s) => s.settings.lang);
  const n = stage.questions.length;
  const firstOpen = progress.answers.findIndex((a) => a === null);
  const [qi, setQi] = useState(firstOpen === -1 ? n - 1 : firstOpen);
  /** Finished stage: false = summary with Next/Review, true = stepping through the answers. */
  const [reviewing, setReviewing] = useState(false);
  /** Finished during this visit (the summary then counts down to the next stage). */
  const [justFinished, setJustFinished] = useState(false);
  /** The question whose "next" countdown is running (only right after answering it). */
  const [autoQ, setAutoQ] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  /** After answering: the wrong choice whose "why not" note is open (one at a time). */
  const [opened, setOpened] = useState<number | null>(null);
  /** "Explore topic": the question area becomes one explainer panel. */
  const [exploring, setExploring] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  const logTopics = useStore((s) => s.logTopics);
  const logMiss = useStore((s) => s.logMiss);
  const title = name ?? QUIZ_NAME[stage.id];

  const q = stage.questions[qi];
  const chosen = progress.answers[qi];
  const answered = chosen !== null;
  // Answered questions stay in the language they were answered in; open ones follow the picker.
  const shown = resolveQuestion(q, answered ? progress.langs?.[qi] : lang);
  const score = quizScore(stage, progress.answers, progress.langs);
  const lastQuestion = qi === n - 1;
  const correctNow = answered && chosen === shown.answerIndex;
  const skippedQ = chosen === SKIPPED;
  const notes = shown.choiceNotesMd;
  const art = pickArt(shown.promptMd, q.tags);
  const reviewMode = progress.done && reviewing;
  // Short answers (numbers, complexities, one-word names) go in a 2×2 grid with a larger font
  // (on phones only when they're very short).
  const wide = useMediaQuery('(min-width: 640px)');
  const compact = shown.choices.every((c) => c.length <= (wide ? 32 : 12) && !c.includes('\n'));
  const canOpen = (i: number) => answered && !!notes && i !== shown.answerIndex;

  const goTo = (i: number) => {
    setAutoQ(null);
    setReading(false);
    setOpened(null);
    setExploring(false);
    setQi(i);
  };

  const choose = useCallback(
    (i: number) => {
      if (progress.done || answered) {
        // After answering, clicking a wrong choice shows why it's wrong, attached under it (one at a time).
        if (answered && notes && i !== shown.answerIndex) {
          setAutoQ(null);
          setOpened((cur) => (cur === i ? null : i));
        }
        return;
      }
      answerQuiz(dayKey, stageIndex, qi, i, lang);
      // Daily sets are counted from their records; Unlimited answers go to the topic log.
      if (dayKey === UNLIMITED_KEY) {
        logTopics(q.tags, i === shown.answerIndex);
        logMiss(q.id, i === shown.answerIndex);
      }
      playSfx(i === shown.answerIndex ? 'correct' : 'wrong');
      setAutoQ(qi);
    },
    [answered, notes, progress.done, answerQuiz, dayKey, stageIndex, qi, lang, shown.answerIndex, logTopics, logMiss, q.tags, q.id],
  );

  const next = useCallback(() => {
    if (!answered) return;
    if (!lastQuestion) {
      goTo(qi + 1);
      return;
    }
    setAutoQ(null);
    setExploring(false);
    if (progress.done) {
      setReviewing(false); // end of the review: back to the summary
      return;
    }
    finishQuiz(dayKey, stageIndex, score);
    setJustFinished(true);
    playSfx(score === n ? 'accepted' : 'tick');
    if (score === n) confettiBurst('small');
  }, [answered, lastQuestion, qi, progress.done, finishQuiz, dayKey, stageIndex, score, n]);

  const prev = useCallback(() => {
    if (qi > 0) goTo(qi - 1);
  }, [qi]);

  // Keyboard (optional; everything also has a button): 1–4 answer, Enter / → continue, ← back.
  const keys = useRef({ choose, next, prev });
  useLayoutEffect(() => {
    keys.current = { choose, next, prev };
  }, [choose, next, prev]);
  const showQuestions = !progress.done || reviewing;
  const { left: leftGap, right: rightGap } = useSideGaps(colRef, showQuestions);
  useEffect(() => {
    if (!showQuestions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // A focused button already handles Enter via its click.
      if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
      const k = Number(e.key);
      if (k >= 1 && k <= 4) keys.current.choose(k - 1);
      else if (e.key === 'Enter' || e.key === 'ArrowRight') keys.current.next();
      else if (e.key === 'ArrowLeft') keys.current.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showQuestions]);

  if (!showQuestions) {
    const allSkipped = progress.answers.every((a) => a === SKIPPED);
    return (
      <div ref={colRef} className="quiz-center relative pt-6 pb-10">
        {leftGap >= MODEBOX_ROOM && <ModeBox className="absolute top-6" style={{ left: -leftGap + 4 }} />}
        <div className={`${PANEL} px-6 py-10`}>
          <StageDonePanel
            emoji={stageEmoji(score, n)}
            title={allSkipped ? `${title} skipped` : `${title} cleared`}
            subtitle={score === n ? 'Perfect round — straight up!' : allSkipped ? 'Review shows every answer and why.' : undefined}
            nextLabel={nextLabel ?? (isLast ? 'See results' : 'Next stage')}
            onNext={onContinue}
            onReview={() => {
              // Review opens on the last question; the arrows step back from there.
              goTo(n - 1);
              setReviewing(true);
            }}
            auto={justFinished}
          />
        </div>
      </div>
    );
  }

  const header = (
    <p className="font-display text-base font-semibold text-muted 2xl:text-lg">
      {title} #{qi + 1}
      <span className="text-[0.72em] font-medium text-faint">/{n}</span>
      {progress.done && <span className="ml-2 text-xs font-medium text-faint">review</span>}
    </p>
  );

  /** Border colour per choice, shared with its attached note so the two read as one piece. */
  const borderOf = (i: number) => (!answered ? 'border-line/70' : i === shown.answerIndex ? 'border-good/70' : i === chosen ? 'border-faint/50' : 'border-line/60');

  const choiceButton = (c: string, i: number) => {
    const isAnswer = i === shown.answerIndex;
    const isChosen = i === chosen;
    const open = opened === i;
    let tone = 'bg-surface/85 hover:border-accent/60 hover:bg-surface';
    let badge = 'bg-surface-3 text-muted';
    let mark: React.ReactNode = LETTERS[i];
    if (answered) {
      if (isAnswer) {
        // Always tinted green; the check box itself is green only if you got it.
        tone = 'bg-[color-mix(in_oklab,var(--color-good)_11%,var(--color-surface))]';
        badge = correctNow ? 'bg-good text-bg' : 'bg-faint/80 text-bg';
        mark = '✓';
      } else if (isChosen) {
        tone = 'bg-surface-3/90';
        badge = 'bg-faint/30 text-ink';
        mark = <span className="size-2.5 rounded-full bg-current" aria-label="your answer" />;
      } else tone = `bg-surface/75 ${open ? '' : 'opacity-60'}`;
      if (canOpen(i)) tone += ' cursor-pointer hover:opacity-100 hover:brightness-[0.98]';
    }
    return (
      <motion.button
        key={`c${i}`}
        type="button"
        disabled={answered && !canOpen(i)}
        onClick={() => choose(i)}
        aria-expanded={canOpen(i) ? open : undefined}
        initial={{ opacity: 0, y: 14 }}
        animate={answered && isAnswer && !progress.done && autoQ === qi ? { opacity: 1, y: 0, scale: [1, 1.025, 1] } : { opacity: 1, y: 0 }}
        transition={{ delay: answered ? 0 : 0.06 + i * 0.05, duration: 0.35 }}
        whileTap={answered ? undefined : { scale: 0.985 }}
        className={`relative w-full border-2 text-center shadow-sm backdrop-blur-md transition-[color,background-color,border-color,opacity,border-radius] disabled:cursor-default ${
          open ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'
        } ${compact ? 'h-full min-h-16 py-3 pr-2 pl-10 sm:px-11 2xl:min-h-20' : 'px-12 py-3 2xl:py-3.5'} ${borderOf(i)} ${tone}`}
      >
        <span className={`absolute top-1/2 left-3 grid size-6 -translate-y-1/2 place-items-center rounded-md font-display text-xs font-bold ${badge}`}>{mark}</span>
        <Markdown className={`md-center ${compact ? 'text-base font-medium sm:text-[1.15rem] 2xl:text-[1.35rem]' : 'text-[0.95rem] 2xl:text-[1.08rem]'}`}>{c}</Markdown>
      </motion.button>
    );
  };

  /** Why a wrong choice is wrong: a grey drawer attached to the bottom of that choice. */
  const choiceNote = (i: number) => (
    <motion.div
      key={`n${i}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={`overflow-hidden rounded-b-xl border-2 border-t-0 bg-surface-3/85 backdrop-blur-md ${borderOf(i)} ${compact ? (i % 2 ? 'col-start-2' : 'col-start-1') : ''}`}
    >
      <Markdown breaks className="md-center px-5 py-3 text-sm text-ink/70 2xl:text-[0.95rem]">
        {notes?.[i] ?? ''}
      </Markdown>
    </motion.div>
  );

  // Rows of choices (one per row, or two in the 2×2 grid); an open note sits right under its own choice.
  const rows: number[][] = [];
  for (let r = 0; r < shown.choices.length; r += compact ? 2 : 1) rows.push(shown.choices.slice(r, r + (compact ? 2 : 1)).map((_, j) => r + j));

  const arrow = (dir: -1 | 1) => {
    const label = dir < 0 ? 'Previous question' : lastQuestion ? 'Back to summary' : 'Next question';
    return (
      <button
        type="button"
        onClick={dir < 0 ? prev : next}
        disabled={dir < 0 && qi === 0}
        aria-label={label}
        title={label}
        className="grid h-20 w-9 place-items-center text-ink/25 transition-colors hover:text-ink/70 disabled:pointer-events-none disabled:opacity-0"
      >
        <svg viewBox="0 0 20 48" className="h-14 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={dir < 0 ? 'M15 6 5 24l10 18' : 'M5 6l10 18L5 42'} />
        </svg>
      </button>
    );
  };
  const arrowsOutside = leftGap >= 56 && rightGap >= 56;
  const showModeBox = leftGap >= MODEBOX_ROOM + (reviewMode && arrowsOutside ? 56 : 0);

  return (
    <div ref={colRef} className="quiz-center relative pb-10">
      {showModeBox && <ModeBox tags={q.tags} className="absolute top-0" style={{ left: -leftGap + 4 }} />}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${qi}-${shown.variantLang}-${exploring ? 'x' : 'q'}`}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -36 }}
          transition={{ type: 'spring', stiffness: 210, damping: 26 }}
        >
          {exploring && shown.topicMd ? (
            /* Explore topic: one panel with the fuller explanation and key terms. */
            <ExplorePanel header={header} topicMd={shown.topicMd} keyTerms={shown.keyTerms} onBack={() => setExploring(false)} />
          ) : (
            <>
              {/* question */}
              <section className="relative" aria-label={`${title} question ${qi + 1} of ${n}${progress.done ? ' (review)' : ''}`}>
                <div className={`${PANEL} pt-5 pb-6 text-center 2xl:pt-6 2xl:pb-8 ${reviewMode && !arrowsOutside ? 'px-10 sm:px-12' : 'px-5 sm:px-8'}`}>
                  {header}
                  <QuizArt kind={art} className="mx-auto mt-1 h-16 sm:h-20 2xl:h-24" />
                  {hasVariants(q) && shown.variantLang && (
                    <p className="mt-0.5 text-xs text-faint">{LANG_LABEL[shown.variantLang]} version · change language at the top right</p>
                  )}
                  <Markdown breaks className="md-center mt-3 text-[1.08rem] text-ink 2xl:text-[1.25rem]">
                    {shown.promptMd}
                  </Markdown>
                </div>
                {/* Review: subtle arrows beside the question. */}
                {reviewMode && (
                  <>
                    <div className={`absolute top-1/2 -translate-y-1/2 ${arrowsOutside ? 'right-full mr-2' : 'left-0.5'}`}>{arrow(-1)}</div>
                    <div className={`absolute top-1/2 -translate-y-1/2 ${arrowsOutside ? 'left-full ml-2' : 'right-0.5'}`}>{arrow(1)}</div>
                  </>
                )}
              </section>

              {/* answers: separate pills on the sky, not boxes inside the card */}
              <div className="mt-4 flex flex-col gap-2.5 2xl:gap-3" onMouseEnter={() => answered && setReading(true)} onMouseLeave={() => setReading(false)}>
                {rows.map((row) => (
                  <div key={row.join()} className={compact ? 'grid grid-cols-2 gap-x-2.5 2xl:gap-x-3' : 'flex flex-col'}>
                    {row.map((i) => choiceButton(shown.choices[i], i))}
                    <AnimatePresence initial={false}>{opened !== null && row.includes(opened) && choiceNote(opened)}</AnimatePresence>
                  </div>
                ))}
              </div>

              {/* The answer's explanation: one panel at the bottom (hidden while a wrong choice's note is open). */}
              <AnimatePresence initial={false}>
                {answered && opened === null && (
                  <motion.div key="explain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }}>
                    <div
                      className={`${PANEL} mt-4 px-5 py-4 text-center text-sm 2xl:text-[0.95rem]`}
                      role="status"
                      onMouseEnter={() => setReading(true)}
                      onMouseLeave={() => setReading(false)}
                    >
                      <p className={`font-display font-semibold ${correctNow ? 'text-good' : 'text-muted'}`}>
                        {correctNow ? 'Correct — up you go!' : skippedQ ? `Skipped — the answer is ${LETTERS[shown.answerIndex]}.` : `Not quite — the answer is ${LETTERS[shown.answerIndex]}.`}
                      </p>
                      <Markdown breaks className="md-center mt-1 text-ink/80">
                        {shown.explanationMd}
                      </Markdown>
                      {shown.topicMd && (
                        <button
                          type="button"
                          onClick={() => {
                            setAutoQ(null);
                            setExploring(true);
                          }}
                          className="mt-3 text-xs font-semibold text-accent-soft underline-offset-2 hover:underline"
                        >
                          Explore topic →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* navigation: always buttons, keyboard optional */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div className="flex justify-end">
          {qi > 0 && (
            <Button variant="secondary" size="lg" onClick={prev}>
              <span aria-hidden="true">←</span> Previous
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          {answered ? (
            <>
              <Button variant="primary" size="lg" onClick={next} autoFocus>
                {!lastQuestion ? 'Next question' : progress.done ? 'Back to summary' : 'Finish stage'} <span aria-hidden="true">→</span>
              </Button>
              {autoQ === qi && !exploring && <TimerBar className="w-full" paused={reading} onDone={next} />}
            </>
          ) : (
            <p className="pt-3 text-center text-xs font-medium text-ink/55">Pick an answer (or press 1–4)</p>
          )}
        </div>
        <span />
      </div>
    </div>
  );
}

/**
 * "Explore topic": a longer explainer in one panel. Long text scrolls inside the panel; a line with only
 * `---` splits it into pages. Key terms come on the last page.
 */
function ExplorePanel({ header, topicMd, keyTerms, onBack }: { header: React.ReactNode; topicMd: string; keyTerms?: { term: string; def: string }[]; onBack: () => void }) {
  const terms = useLearnTerms();
  const { pathname } = useLocation();
  const from = useMemo(() => ({ from: pathname }), [pathname]);
  const pages = topicMd
    .split(/\n\s*---+\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const [page, setPage] = useState(0);
  const last = page === pages.length - 1;
  return (
    <div className={`${PANEL} px-6 pt-5 pb-6 sm:px-9`}>
      <div className="text-center">{header}</div>
      <p className="mt-1 text-center text-xs font-semibold tracking-widest text-accent-soft uppercase">Explore the topic</p>
      <div className="mt-4 max-h-[min(52vh,520px)] overflow-y-auto pr-1" key={page}>
        <Markdown className="text-[0.98rem] leading-relaxed text-ink" terms={terms} linkState={from}>
          {pages[page] ?? ''}
        </Markdown>
        {last && keyTerms && keyTerms.length > 0 && (
          <dl className="mt-5 grid gap-x-4 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-[max-content_1fr]">
            {keyTerms.map((t) => {
              const href = terms && linkForPhrase(t.term, terms);
              return (
              <div key={t.term} className="contents">
                <dt className="font-semibold text-ink">
                  {href ? (
                    <Link to={href} state={from} className="term-link">
                      {t.term}
                    </Link>
                  ) : (
                    t.term
                  )}
                </dt>
                <dd className="text-muted">{t.def}</dd>
              </div>
              );
            })}
          </dl>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← Back to the question
        </Button>
        {pages.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Button size="sm" variant="ghost" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">
              ‹
            </Button>
            <span className="tabular-nums">
              {page + 1} / {pages.length}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setPage(page + 1)} disabled={last} aria-label="Next page">
              ›
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
