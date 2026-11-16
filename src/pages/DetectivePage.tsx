import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DiagramView } from '../components/Diagram';
import { Markdown } from '../components/Markdown';
import { SyntaxOpeners, SyntaxPanel } from '../components/SyntaxTray';
import { useMediaQuery } from '../game/media';
import { RuntimeChip } from '../components/RuntimeChip';
import { Button, Card, ConfirmDialog, Spinner, Tag, TopicTag } from '../components/ui';
import { caseLang, fillGaps, fixedLines, indentOf, isGap, lineDiff } from '../content/detective';
import { loadDetective } from '../content/loadDay';
import { DETECTIVE_KINDS, type DetectiveCase, type DetectiveKind, type Problem } from '../content/schema';
import { DETECTIVE_MODES, MAX_TRIES, drawCases, normalizeLine, type CaseResult, type DetectiveMode } from '../game/detective';
import { confettiBurst, playSfx } from '../game/fx';
import { useStore } from '../game/store';
import { LANG_LABEL, type Lang } from '../runner/harness/types';
import { lineStyle } from '../components/CodeLines';
import { highlight } from '../syntax/highlight';

const KIND_LABEL: Record<DetectiveKind, string> = { leet: 'Algorithms', swe: 'SWE', design: 'System design', oop: 'Software design' };
const TYPE_LABEL = { choice: 'What’s wrong?', lines: 'Find the bad line', missing: 'Missing line' } as const;
const typeLabel = (c: DetectiveCase) => (c.doc && c.type === 'lines' ? 'Find the flaw' : TYPE_LABEL[c.type]);
const LETTERS = ['A', 'B', 'C', 'D'];

type Bank = Record<string, DetectiveCase>;

/** Detective: five short snippets per round, each hiding one bug to find. */
export function DetectivePage() {
  const [bank, setBank] = useState<Record<DetectiveKind, DetectiveCase[]> | null>(null);
  const round = useStore((s) => s.detective?.round);
  const stats = useStore((s) => s.detective);
  const startDetective = useStore((s) => s.startDetective);
  const [home, setHome] = useState(false);
  const [mode, setMode] = useState<DetectiveMode>(round?.mode ?? 'original');
  const [confirmNew, setConfirmNew] = useState<DetectiveMode | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(DETECTIVE_KINDS.map(loadDetective)).then(
      (files) => alive && setBank(Object.fromEntries(DETECTIVE_KINDS.map((k, i) => [k, files[i]])) as Record<DetectiveKind, DetectiveCase[]>),
    );
    return () => {
      alive = false;
    };
  }, []);

  const byId: Bank = useMemo(() => Object.fromEntries(DETECTIVE_KINDS.flatMap((k) => bank?.[k] ?? []).map((c) => [c.id, c])), [bank]);

  if (!bank) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  if (DETECTIVE_KINDS.every((k) => !bank[k].length)) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-3xl">🔍</p>
        <p className="mt-3 font-semibold">No cases have been published yet.</p>
      </Card>
    );
  }

  const start = (m: DetectiveMode) => {
    const ids = drawCases(
      m,
      Object.fromEntries(DETECTIVE_KINDS.map((k) => [k, bank[k].map((c) => c.id)])),
      useStore.getState().detective?.seen ?? [],
      Math.random,
      // Cases written in the player's language (or language-free design docs) come first while unseen ones last.
      (id) => !!byId[id] && (!!byId[id].doc || !!byId[id].code[useStore.getState().settings.lang]),
    );
    startDetective(m, ids);
    setMode(m);
    setHome(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const askStart = (m: DetectiveMode) => {
    if (round && !round.finishedAt && round.results.some((r) => r)) setConfirmNew(m);
    else start(m);
  };

  const playable = round && round.ids.every((id) => byId[id]);
  const showHome = home || !playable;

  return (
    <>
      {showHome ? (
        <DetectiveHome mode={mode} setMode={setMode} onStart={() => askStart(mode)} stats={stats} resume={playable && !round.finishedAt ? () => setHome(false) : undefined} counts={Object.fromEntries(DETECTIVE_KINDS.map((k) => [k, bank[k].length])) as Record<DetectiveKind, number>} />
      ) : (
        <RoundView key={round.startedAt} byId={byId} onNewRound={() => askStart(round.mode)} onHome={() => setHome(true)} />
      )}
      <ConfirmDialog
        open={!!confirmNew}
        title="Start a new round?"
        body="The round in progress ends here. Cases you already closed still count in your totals."
        confirmLabel="New round"
        onConfirm={() => {
          const m = confirmNew!;
          setConfirmNew(null);
          start(m);
        }}
        onCancel={() => setConfirmNew(null)}
      />
    </>
  );
}

function DetectiveHome({
  mode,
  setMode,
  onStart,
  stats,
  resume,
  counts,
}: {
  mode: DetectiveMode;
  setMode: (m: DetectiveMode) => void;
  onStart: () => void;
  stats: ReturnType<typeof useStore.getState>['detective'];
  resume?: () => void;
  counts: Record<DetectiveKind, number>;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-6 sm:p-8">
        <p className="text-4xl" aria-hidden="true">
          🔍
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Detective</h1>
        <p className="mt-2 text-muted">
          Five short cases per round, each with one flaw. Depending on the case, you pick what&apos;s wrong, point at the bad line, or write the
          line that&apos;s missing. Algorithm cases follow your language; missing lines are checked by running the tests in your browser.
          Software design cases are classes and design patterns (or a class design, like a parking lot or a vending machine) that break a
          principle; system design cases are architecture docs that break at scale.
        </p>
        <p className="mt-6 text-[11px] font-semibold tracking-widest text-muted uppercase">Case file</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Case file">
          {DETECTIVE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-2xl border p-4 text-left transition-colors last:sm:col-span-2 ${mode === m.id ? 'border-accent bg-accent/10' : 'border-line hover:border-faint'}`}
            >
              <span className="block font-display text-lg font-semibold">{m.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{m.blurb}</span>
            </button>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={onStart}>
            Open the case file
          </Button>
          {resume && (
            <Button variant="secondary" size="lg" onClick={resume}>
              Resume round
            </Button>
          )}
        </div>
        <p className="mt-4 text-xs text-faint">
          {counts.leet} algorithm, {counts.swe} SWE code, {counts.oop} software design and {counts.design} system design cases so far. Rounds avoid cases you&apos;ve seen until the file runs out. Detective doesn&apos;t
          affect your daily streak.
        </p>
      </Card>
      {stats && stats.cases > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Solved</p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {stats.solved}
              <span className="text-sm text-faint">/{stats.cases}</span>
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Rounds</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{stats.rounds}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Perfect</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{stats.perfect}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function RoundView({ byId, onNewRound, onHome }: { byId: Bank; onNewRound: () => void; onHome: () => void }) {
  const round = useStore((s) => s.detective!.round!);
  const updateCase = useStore((s) => s.updateCase);
  const finishDetective = useStore((s) => s.finishDetective);
  const firstOpen = round.results.findIndex((r) => !r?.done);
  const [view, setView] = useState<number | 'summary'>(firstOpen === -1 ? 'summary' : firstOpen);
  const cases = round.ids.map((id) => byId[id]);
  const points = round.results.filter((r) => r?.solved).length;
  const n = cases.length;
  const modeLabel = DETECTIVE_MODES.find((m) => m.id === round.mode)?.label ?? '';
  // The syntax tray docks on the right on wide screens, as in the other modes.
  const trayOpen = useStore((s) => s.settings.trayOpen);
  const isXl = useMediaQuery('(min-width: 1280px)');
  const isXxl = useMediaQuery('(min-width: 1536px)');
  const docked = isXl && trayOpen;
  const rightW = docked ? (isXxl ? 370 : 300) : 0;

  const go = (i: number) => {
    setView(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goNext = (from: number) => {
    const nextOpen = round.results.findIndex((r, i) => i > from && !r?.done);
    const anyOpen = round.results.findIndex((r) => !r?.done);
    if (nextOpen !== -1) setView(nextOpen);
    else if (anyOpen !== -1) setView(anyOpen);
    else {
      finishDetective();
      setView('summary');
      const all = useStore.getState().detective?.round?.results.every((r) => r?.solved);
      playSfx(all ? 'complete' : 'tick');
      if (all) confettiBurst('big');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="grid gap-6" style={{ gridTemplateColumns: rightW ? `minmax(0,1fr) ${rightW}px` : 'minmax(0,1fr)' }}>
        <div className="mx-auto w-full max-w-4xl min-w-0 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <Card className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 md:px-5">
              {/* The case file's name opens the picker (the round stays: "Resume round" brings it back). */}
              <button
                type="button"
                onClick={onHome}
                aria-label="Switch case file"
                title="Switch case file"
                className="group -mx-2 -my-1 shrink-0 rounded-xl px-2 py-1 text-left transition-colors hover:bg-surface-2"
              >
                <span className="block font-display text-[11px] font-semibold tracking-widest text-muted uppercase">Detective</span>
                <span className="flex items-center gap-1 font-display text-xl font-semibold">
                  {modeLabel}
                  <svg viewBox="0 0 24 24" className="size-4 text-faint transition-colors group-hover:text-ink" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              {/* Phones: the score sits in this card (top right) instead of its own box. */}
              <p className="ml-auto text-right font-display text-2xl leading-none font-semibold tabular-nums md:hidden" title={`${points} of ${n} cases solved`}>
                {points}
                <span className="text-sm text-faint">/{n}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-muted">solved</span>
              </p>
              <ol className="flex basis-full items-center justify-between gap-2 md:flex-1 md:basis-auto md:justify-start" aria-label="Cases">
                {cases.map((c, i) => {
                  const r = round.results[i];
                  const current = view === i;
                  const tone = r?.done ? (r.solved ? 'border-good/70 bg-good/15 text-good' : 'border-bad/50 bg-bad/10 text-bad') : current ? 'border-accent bg-accent/10 text-ink' : 'border-line text-faint';
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setView(i)}
                        aria-current={current ? 'step' : undefined}
                        title={`Case ${i + 1}: ${r?.done ? c.title : typeLabel(c)}`}
                        className={`grid size-10 place-items-center rounded-full border-2 font-display text-sm font-semibold transition-colors ${tone} ${current ? 'ring-4 ring-accent/20' : ''}`}
                      >
                        {r?.done ? (r.solved ? '✓' : '✗') : i + 1}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => setView('summary')}
                    disabled={!round.finishedAt}
                    className="rounded-full px-2 py-2 text-xs font-semibold text-muted hover:text-ink disabled:opacity-40 md:ml-1 md:px-3"
                  >
                    Summary
                  </button>
                </li>
              </ol>
            </Card>
            <Card className="hidden w-40 flex-col items-start justify-center px-5 py-3 md:flex">
              <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Solved</p>
              <p className="font-display text-3xl font-semibold tabular-nums">
                {points}
                <span className="text-lg text-faint">/{n}</span>
              </p>
            </Card>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={String(view)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              {view === 'summary' ? (
                <Summary cases={cases} results={round.results} onOpen={(i) => setView(i)} onNewRound={onNewRound} onHome={onHome} />
              ) : (
                <CaseView
                  c={cases[view]}
                  index={view}
                  total={n}
                  result={round.results[view]}
                  onUpdate={(r) => updateCase(view, r)}
                  onNext={() => goNext(view)}
                  onPrev={view > 0 ? () => go(view - 1) : undefined}
                  onForward={view < n - 1 ? () => go(view + 1) : round.finishedAt ? () => setView('summary') : undefined}
                  lastOpen={round.results.every((r, i) => i === view || r?.done)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {docked && <SyntaxPanel />}
      </div>
      <SyntaxOpeners docked={docked} />
    </>
  );
}

function Summary({
  cases,
  results,
  onOpen,
  onNewRound,
  onHome,
}: {
  cases: DetectiveCase[];
  results: (CaseResult | null)[];
  onOpen: (i: number) => void;
  onNewRound: () => void;
  onHome: () => void;
}) {
  const solved = results.filter((r) => r?.solved).length;
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-center text-4xl" aria-hidden="true">
        {solved === cases.length ? '🕵️' : solved >= 3 ? '🔎' : '🗂️'}
      </p>
      <h2 className="mt-2 text-center font-display text-2xl font-semibold">
        {solved === cases.length ? 'Every case closed!' : `${solved} of ${cases.length} cases closed`}
      </h2>
      <ul className="mx-auto mt-6 max-w-xl divide-y divide-line rounded-xl border border-line">
        {cases.map((c, i) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(i)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${results[i]?.solved ? 'bg-good/15 text-good' : 'bg-bad/10 text-bad'}`}>
                {results[i]?.solved ? '✓' : '✗'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.title}</span>
                <span className="block text-xs text-muted">
                  {KIND_LABEL[c.kind]} · {typeLabel(c)}
                  {c.similarLC && ` · like LC ${c.similarLC.number}`}
                </span>
              </span>
              <span className="text-xs text-faint">Review →</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="primary" size="lg" onClick={onNewRound}>
          New round
        </Button>
        <Button variant="secondary" size="lg" onClick={onHome}>
          Change case file
        </Button>
      </div>
    </Card>
  );
}

/** Per-case UI: brief, code, the type-specific question, then the reveal. */
function CaseView({
  c,
  index,
  total,
  result,
  onUpdate,
  onNext,
  onPrev,
  onForward,
  lastOpen,
}: {
  c: DetectiveCase;
  index: number;
  total: number;
  result: CaseResult | null;
  onUpdate: (r: CaseResult) => void;
  onNext: () => void;
  /** Step to the case before / after (to review, or to come back later). */
  onPrev?: () => void;
  onForward?: () => void;
  lastOpen: boolean;
}) {
  const picked = useStore((s) => s.settings.lang);
  const logTopics = useStore((s) => s.logTopics);
  const design = !!c.doc;
  // Design docs have no code, so the language never changes them.
  const lang: Lang = result?.lang ?? (design ? picked : caseLang(c, picked));
  const v = c.doc ?? c.code[lang]!;
  const done = !!result?.done;
  const nBad = v.bad?.length ?? 0;
  const gaps = v.lines.filter(isGap).length;
  const [flags, setFlags] = useState<number[]>([]);
  const [answers, setAnswers] = useState<string[]>(() => result?.tries?.at(-1) ?? new Array(gaps).fill(''));
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // A new language (before answering) means different code: start the case over.
  useEffect(() => {
    setFlags([]);
    setAnswers(result?.tries?.at(-1) ?? new Array(gaps).fill(''));
    setNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design ? '' : lang, c.id]);

  // Missing-line algorithm cases are checked by running tests: get the runtime ready.
  useEffect(() => {
    if (c.type === 'missing' && c.run && !done) void import('../runner/manager').then((m) => m.warmup(lang));
  }, [c.type, c.run, done, lang]);

  const finish = (r: Omit<CaseResult, 'lang' | 'done'>) => {
    onUpdate({ ...r, lang, done: true });
    logTopics(c.tags, r.solved);
    playSfx(r.solved ? 'correct' : 'wrong');
  };

  const pick = (i: number) => {
    if (done) return;
    finish({ solved: i === c.answerIndex, choice: i });
  };

  const toggle = (line: number) => {
    if (done || c.type !== 'lines') return;
    setFlags((f) => (f.includes(line) ? f.filter((x) => x !== line) : f.length >= nBad ? [...f.slice(1), line] : [...f, line]));
  };
  const accuse = () => {
    const bad = [...(v.bad ?? [])].sort();
    const mine = [...flags].sort();
    finish({ solved: bad.length === mine.length && bad.every((b, i) => b === mine[i]), lines: mine });
  };

  const tries = result?.tries ?? [];
  const check = async () => {
    if (done || checking || answers.some((a) => !a.trim())) return;
    const attempt = answers.map((a) => a.trim());
    const accepted = [v.missing!, ...(v.accept ?? [])].some((ref) => ref.every((r, i) => normalizeLine(r) === normalizeLine(attempt[i])));
    let ok = accepted;
    let msg: string | null = null;
    if (!ok && c.run) {
      setChecking(true);
      setNote(null);
      try {
        const { judge } = await import('../runner/judge');
        const problem = { signature: c.run.signature, examples: [], tests: c.run.tests, compare: c.run.compare, timeLimitMs: 2000 } as unknown as Problem;
        const rep = await judge(problem, lang, fillGaps(v.lines, attempt).join('\n'), 'submit');
        ok = rep.verdict === 'accepted';
        if (!ok) {
          msg =
            rep.verdict === 'compile_error'
              ? 'That doesn’t compile.'
              : rep.verdict === 'time_limit'
                ? 'The tests ran out of time with that line.'
                : rep.verdict === 'runtime_error'
                  ? 'The code crashes with that line.'
                  : `Close, but ${rep.total - rep.passed} of ${rep.total} tests still fail.`;
        }
      } catch {
        msg = 'Couldn’t run the tests here, so only exact answers count.';
      } finally {
        setChecking(false);
      }
    }
    const all = [...tries, attempt];
    if (ok) {
      finish({ solved: true, tries: all });
      return;
    }
    if (all.length >= MAX_TRIES) {
      finish({ solved: false, tries: all });
      return;
    }
    onUpdate({ lang, done: false, solved: false, tries: all });
    playSfx('fail');
    setNote(`${msg ?? 'Not quite.'} ${MAX_TRIES - all.length} ${MAX_TRIES - all.length === 1 ? 'try' : 'tries'} left.`);
  };
  const reveal = () => finish({ solved: false, tries });

  const question =
    c.type === 'choice'
      ? design
        ? 'What’s wrong with this design?'
        : 'What’s wrong with this code?'
      : c.type === 'lines'
        ? design
          ? `Find the ${nBad === 1 ? 'flawed decision' : `${nBad} flawed decisions`}.`
          : `Find the ${nBad === 1 ? 'incorrect line' : `${nBad} incorrect lines`}.`
        : `Write the missing ${gaps === 1 ? 'line' : `${gaps} lines`}.`;

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-display text-sm font-semibold text-muted">
            Case {index + 1} of {total}
          </span>
          <Tag>{KIND_LABEL[c.kind]}</Tag>
          <Tag>{typeLabel(c)}</Tag>
          {done && c.similarLC && <Tag>like LC {c.similarLC.number}</Tag>}
          <span className="ml-auto flex items-center gap-1">
            <StepButton dir="prev" onClick={onPrev} />
            <StepButton dir="next" onClick={onForward} last={index === total - 1} />
          </span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold">{c.title}</h2>
        <Markdown className="mt-2 text-[0.98rem] text-ink/90">{c.briefMd}</Markdown>
        <p className="mt-3 font-semibold text-accent-soft">{question}</p>
        {c.type === 'lines' && !done && <p className="mt-0.5 text-xs text-muted">Click a {design ? 'decision' : 'line'} to flag it, then accuse.</p>}
        {c.type === 'missing' && !done && (
          <p className="mt-0.5 text-xs text-muted">
            {c.run ? 'Any line that makes the tests pass counts. ' : ''}
            {MAX_TRIES - tries.length} {MAX_TRIES - tries.length === 1 ? 'try' : 'tries'} left.
          </p>
        )}
      </Card>

      {design ? (
        <DocView
          c={c}
          lines={v.lines}
          flagMode={c.type === 'lines' && !done}
          flags={done ? (result?.lines ?? []) : flags}
          bad={done ? v.bad : undefined}
          onToggle={toggle}
        />
      ) : (
        <CodeView
          lang={lang}
          lines={v.lines}
          langNote={!result && lang !== picked ? `${LANG_LABEL[lang]} only` : undefined}
          flagMode={c.type === 'lines' && !done}
          flags={done ? (result?.lines ?? []) : flags}
          bad={done && c.type !== 'missing' ? v.bad : undefined}
          onToggle={toggle}
          gap={
            c.type === 'missing'
              ? {
                  values: answers,
                  onChange: (k, val) => setAnswers((a) => a.map((x, i) => (i === k ? val : x))),
                  onSubmit: () => void check(),
                  disabled: done || checking,
                  solved: done ? !!result?.solved : undefined,
                }
              : undefined
          }
        />
      )}

      {!done && (
        <div className="flex flex-wrap items-center gap-3">
          {c.type === 'choice' && (
            <div className="grid w-full gap-2.5">
              {c.choices!.map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  className="relative rounded-xl border-2 border-line/70 bg-surface px-12 py-3 text-left shadow-sm transition-colors hover:border-accent/60"
                >
                  <span className="absolute top-1/2 left-3 grid size-6 -translate-y-1/2 place-items-center rounded-md bg-surface-3 font-display text-xs font-bold text-muted">{LETTERS[i]}</span>
                  <Markdown className="text-[0.95rem]">{ch}</Markdown>
                </button>
              ))}
            </div>
          )}
          {c.type === 'lines' && (
            <Button variant="primary" size="lg" onClick={accuse} disabled={flags.length !== nBad}>
              Accuse {flags.length}/{nBad}
            </Button>
          )}
          {c.type === 'missing' && (
            <>
              <Button variant="primary" size="lg" onClick={() => void check()} disabled={checking || answers.some((a) => !a.trim())}>
                {checking ? <Spinner /> : null} {checking ? 'Running tests…' : 'Check'}
              </Button>
              <Button variant="ghost" onClick={reveal} disabled={checking}>
                Show the answer
              </Button>
              {c.run && <RuntimeChip lang={lang} />}
            </>
          )}
          {note && (
            <p className="w-full text-sm text-warn" role="status">
              {note}
            </p>
          )}
        </div>
      )}

      {done && result && <Reveal c={c} lang={lang} result={result} onNext={onNext} nextLabel={lastOpen ? 'Close the file' : 'Next case'} />}
    </div>
  );
}

function CodeView({
  lang,
  lines,
  langNote,
  flagMode,
  flags,
  bad,
  onToggle,
  gap,
}: {
  lang: Lang;
  lines: string[];
  langNote?: string;
  flagMode: boolean;
  flags: number[];
  bad?: number[];
  onToggle: (line: number) => void;
  gap?: { values: string[]; onChange: (k: number, v: string) => void; onSubmit: () => void; disabled: boolean; solved?: boolean };
}) {
  let gapNo = -1;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
        <span className="font-semibold">{LANG_LABEL[lang]}</span>
        {langNote && <span className="text-faint">{langNote}</span>}
      </div>
      <div className="overflow-x-auto bg-code py-3 font-mono text-[13px] leading-6">
        {lines.map((line, i) => {
          const no = i + 1;
          if (isGap(line) && gap) {
            gapNo++;
            const k = gapNo;
            return (
              <form
                key={i}
                className={`flex items-center gap-0 pr-4 ${gap.solved === true ? 'bg-good/12' : gap.solved === false ? 'bg-bad/10' : 'bg-accent/8'}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  gap.onSubmit();
                }}
              >
                <span className="w-11 shrink-0 pr-3 text-right text-faint select-none">{no}</span>
                <span className="whitespace-pre select-none">{indentOf(line)}</span>
                <input
                  value={gap.values[k] ?? ''}
                  onChange={(e) => gap.onChange(k, e.target.value)}
                  disabled={gap.disabled}
                  autoFocus={k === 0 && !gap.disabled}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  aria-label={`Missing line ${k + 1}`}
                  placeholder="write the missing line here"
                  className="min-w-48 flex-1 rounded-md border border-accent/50 bg-surface px-2 font-mono text-[13px] text-ink outline-none placeholder:text-faint focus:border-accent disabled:border-transparent disabled:bg-transparent"
                />
              </form>
            );
          }
          const flagged = flags.includes(no);
          const isBad = bad?.includes(no);
          let tone = '';
          let mark: ReactNode = null;
          if (bad) {
            if (isBad && flagged) {
              tone = 'bg-good/15';
              mark = <span className="text-good">✓</span>;
            } else if (isBad) {
              tone = 'bg-bad/12';
              mark = <span className="text-bad">◀</span>;
            } else if (flagged) {
              tone = 'bg-surface-3/60 line-through decoration-faint';
              mark = <span className="text-faint">✗</span>;
            }
          } else if (flagged) {
            tone = 'bg-warn/15';
            mark = <span aria-hidden="true">🔍</span>;
          }
          const content = (
            <>
              <span className="w-11 shrink-0 pr-3 text-right text-faint select-none">{no}</span>
              <span className="code-line flex-1 whitespace-pre" style={lineStyle(line)}>
                {line ? highlight(line, lang) : ' '}
              </span>
              <span className="w-8 shrink-0 text-center text-xs">{mark}</span>
            </>
          );
          return flagMode ? (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(no)}
              aria-pressed={flagged}
              aria-label={`Line ${no}${flagged ? ' (flagged)' : ''}`}
              className={`flex w-full text-left hover:bg-accent/10 ${tone}`}
            >
              {content}
            </button>
          ) : (
            <div key={i} className={`flex ${tone}`}>
              {content}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** ‹ / › beside "Case n of 5": review earlier cases or skip ahead (the last one leads to the summary once finished). */
function StepButton({ dir, onClick, last }: { dir: 'prev' | 'next'; onClick?: () => void; last?: boolean }) {
  const label = dir === 'prev' ? 'Previous case' : last ? 'Round summary' : 'Following case';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-faint hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir === 'prev' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    </button>
  );
}

/** A design case: the architecture picture and the design doc, one decision per line (clickable in "find" cases). */
function DocView({ c, lines, flagMode, flags, bad, onToggle }: { c: DetectiveCase; lines: string[]; flagMode: boolean; flags: number[]; bad?: number[]; onToggle: (line: number) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
        <span className="font-semibold">{c.kind === 'oop' ? 'Class design' : 'Design doc'}</span>
        <span className="text-faint">{lines.length} decisions</span>
      </div>
      {c.diagram && (
        <div className="border-b border-line bg-surface-2/40 px-3">
          {/* The highlighted box points at the flaw, so it only lights up once the case is closed. */}
          <DiagramView diagram={bad || c.diagram.type !== 'flow' ? c.diagram : { ...c.diagram, nodes: c.diagram.nodes.map((n) => ({ ...n, highlight: false })) }} />
        </div>
      )}
      <ol className="py-2 text-[0.95rem] leading-relaxed">
        {lines.map((line, i) => {
          const no = i + 1;
          const flagged = flags.includes(no);
          const isBad = bad?.includes(no);
          let tone = '';
          let mark: ReactNode = null;
          if (bad) {
            if (isBad && flagged) {
              tone = 'bg-good/15';
              mark = <span className="text-good">✓</span>;
            } else if (isBad) {
              tone = 'bg-bad/12';
              mark = <span className="text-bad">◀</span>;
            } else if (flagged) {
              tone = 'bg-surface-3/60 line-through decoration-faint';
              mark = <span className="text-faint">✗</span>;
            }
          } else if (flagged) {
            tone = 'bg-warn/15';
            mark = <span aria-hidden="true">🔍</span>;
          }
          const content = (
            <>
              <span className="w-9 shrink-0 pt-px text-right font-mono text-xs leading-6 text-faint select-none">{no}</span>
              <span className="flex-1">{line}</span>
              <span className="w-8 shrink-0 text-center text-xs leading-6">{mark}</span>
            </>
          );
          return (
            <li key={i}>
              {flagMode ? (
                <button type="button" onClick={() => onToggle(no)} aria-pressed={flagged} aria-label={`Decision ${no}${flagged ? ' (flagged)' : ''}`} className={`flex w-full gap-3 px-2 py-1 text-left hover:bg-accent/10 ${tone}`}>
                  {content}
                </button>
              ) : (
                <div className={`flex gap-3 px-2 py-1 ${tone}`}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** After a case closes: the verdict, why, and the fix. */
function Reveal({ c, lang, result, onNext, nextLabel }: { c: DetectiveCase; lang: Lang; result: CaseResult; onNext: () => void; nextLabel: string }) {
  const design = !!c.doc;
  const v = c.doc ?? c.code[lang]!;
  const fixed = fixedLines(v);
  const verdict = result.solved
    ? c.type === 'missing' && (result.tries?.length ?? 0) > 1
      ? `Case closed on try ${result.tries!.length} ✓`
      : 'Case closed ✓'
    : c.type === 'choice'
      ? `Not this time: the answer is ${LETTERS[c.answerIndex!]}.`
      : c.type === 'lines'
        ? 'The culprit got away.'
        : 'The missing line, revealed:';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {c.type === 'choice' && (
        <div className="grid gap-2">
          {c.choices!.map((ch, i) => {
            const right = i === c.answerIndex;
            const mine = i === result.choice;
            return (
              <div
                key={i}
                className={`relative rounded-xl border-2 px-12 py-3 ${
                  right ? 'border-good/70 bg-[color-mix(in_oklab,var(--color-good)_11%,var(--color-surface))]' : mine ? 'border-faint/50 bg-surface-3' : 'border-line/50 bg-surface opacity-60'
                }`}
              >
                <span
                  className={`absolute top-1/2 left-3 grid size-6 -translate-y-1/2 place-items-center rounded-md font-display text-xs font-bold ${
                    right ? (result.solved ? 'bg-good text-bg' : 'bg-faint/80 text-bg') : 'bg-surface-3 text-muted'
                  }`}
                >
                  {right ? '✓' : mine ? <span className="size-2.5 rounded-full bg-current" /> : LETTERS[i]}
                </span>
                <Markdown className="text-[0.95rem]">{ch}</Markdown>
              </div>
            );
          })}
        </div>
      )}
      <Card className="p-5 sm:p-6">
        <p className={`font-display text-lg font-semibold ${result.solved ? 'text-good' : 'text-muted'}`} role="status">
          {verdict}
        </p>
        <Markdown className="mt-2 text-[0.95rem] text-ink/90">{c.explanationMd}</Markdown>
        <p className="mt-5 text-[11px] font-semibold tracking-widest text-muted uppercase">The fix</p>
        {design ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface-2/60 py-2 text-[0.92rem] leading-relaxed">
            {lineDiff(v.lines, fixed).map((d, i) => (
              <div key={i} className={`flex gap-2 px-1 py-0.5 ${d.kind === 'del' ? 'bg-bad/12' : d.kind === 'add' ? 'bg-good/15' : 'opacity-60'}`}>
                <span className="w-8 shrink-0 text-right font-mono text-xs leading-6 text-faint select-none">{d.kind === 'del' ? '−' : d.kind === 'add' ? '+' : d.n}</span>
                <span className={`flex-1 pr-3 ${d.kind === 'del' ? 'line-through decoration-bad/50' : ''}`}>{d.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-code py-2 font-mono text-[13px] leading-6">
            {c.type === 'missing'
              ? fixed.map((line, i) => {
                  const filled = isGap(v.lines[i]);
                  return (
                    <div key={i} className={`flex ${filled ? 'bg-good/15' : 'opacity-70'}`}>
                      <span className="w-11 shrink-0 pr-3 text-right text-faint select-none">{filled ? '+' : i + 1}</span>
                      <span className="code-line flex-1 pr-4 whitespace-pre" style={lineStyle(line)}>
                        {line ? highlight(line, lang) : ' '}
                      </span>
                    </div>
                  );
                })
              : lineDiff(v.lines, fixed).map((d, i) => (
                  <div key={i} className={`flex ${d.kind === 'del' ? 'bg-bad/12' : d.kind === 'add' ? 'bg-good/15' : 'opacity-70'}`}>
                    <span className="w-11 shrink-0 pr-3 text-right text-faint select-none">{d.kind === 'del' ? '−' : d.kind === 'add' ? '+' : d.n}</span>
                    <span className="code-line flex-1 pr-4 whitespace-pre" style={lineStyle(d.text)}>
                      {indentOf(d.text)}
                      {/* Strike only the code, not the indentation in front of it. */}
                      <span className={d.kind === 'del' ? 'line-through decoration-bad/50' : ''}>{d.text.trim() ? highlight(d.text.trimStart(), lang) : ' '}</span>
                    </span>
                  </div>
                ))}
          </div>
        )}
        {c.type === 'missing' && result.tries && result.tries.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Your {result.tries.length === 1 ? 'answer' : 'answers'}:{' '}
            {result.tries.map((t, i) => (
              <code key={i} className="mr-2">
                {t.join(' ⏎ ')}
              </code>
            ))}
          </p>
        )}
        {c.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.tags.map((t) => (
              <TopicTag key={t} tag={t} />
            ))}
          </div>
        )}
      </Card>
      <div className="flex justify-center">
        <Button variant="primary" size="lg" onClick={onNext} autoFocus>
          {nextLabel} →
        </Button>
      </div>
    </motion.div>
  );
}

