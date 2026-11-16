import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { loadBank, loadIndex, loadLite, type LiteDay } from '../content/loadDay';
import type { DayIndex, QuizQuestion } from '../content/schema';
import { dayNumber, localToday } from '../game/dates';
import { LOCAL_ONLY_KEYS } from '../game/merge';
import { isOn } from '../game/review';
import { resolveQuestion } from '../content/quiz';
import { SKIPPED } from '../game/scoring';
import { useStore, type DayRecord } from '../game/store';
import { loadTopicsFile, type TopicsFile } from '../game/topicStats';
import type { Lang } from '../runner/harness/types';
import { Markdown } from './Markdown';
import { Card } from './ui';

const STAGE_NAME = ['Starter', 'Easy', 'Medium', 'Hard', 'SWE quiz'];
const DIFFS = ['easy', 'medium', 'hard'] as const;
const DIFF_DOT = { easy: 'bg-good', medium: 'bg-warn', hard: 'bg-bad' } as const;

const source = (rec: DayRecord) => (rec.mode === 'daily' ? `Daily #${dayNumber(rec.setDate)}` : `Practice · ${rec.setDate}`);
/** Where to play a day again: today's set lives on the home page. */
const dayLink = (date: string) => (date === localToday() ? '/' : `/day/${date}`);
const realRecords = (days: Record<string, DayRecord>) => Object.entries(days).filter(([k]) => !LOCAL_ONLY_KEYS.has(k) && k !== 'unlimited');

function useIndex(): DayIndex | null {
  const [index, setIndex] = useState<DayIndex | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex, () => setIndex({ days: [], builtAt: '' }));
  }, []);
  return index;
}

// ---------------------------------------------------------------- LeetCode coverage

type LcStatus = 'solved' | 'tried' | 'new';
interface LcRow {
  n: number;
  t: string;
  title: string;
  date: string;
  diff: (typeof DIFFS)[number];
  status: LcStatus;
}

/** Every LeetCode problem the published sets are based on, and whether you've solved our version of it. */
export function LeetCodeCard() {
  const index = useIndex();
  const days = useStore((s) => s.days);
  const lcLog = useStore((s) => s.lcLog);
  const [filter, setFilter] = useState<LcStatus | 'all'>('all');
  const [all, setAll] = useState(false);

  const rows = useMemo(() => {
    if (!index) return [];
    const today = localToday();
    const byNumber = new Map<number, LcRow>();
    const rank = { solved: 2, tried: 1, new: 0 };
    for (const d of index.days) {
      if (d.date > today) continue;
      d.lc?.forEach((lc, k) => {
        if (!lc) return;
        let status: LcStatus = 'new';
        for (const [, rec] of realRecords(days)) {
          if (rec.setDate !== d.date) continue;
          const p = rec.stages[k + 1];
          if (p?.kind !== 'code') continue;
          if (p.status === 'accepted') status = 'solved';
          else if ((p.status === 'gaveup' || p.submissions > 0) && status === 'new') status = 'tried';
        }
        const u = lcLog?.[lc.n];
        if (u?.solved) status = 'solved';
        else if (u && status === 'new') status = 'tried';
        const prev = byNumber.get(lc.n);
        if (!prev || rank[status] > rank[prev.status]) byNumber.set(lc.n, { n: lc.n, t: lc.t, title: d.titles[k] ?? '', date: d.date, diff: DIFFS[k] ?? 'medium', status });
      });
    }
    return [...byNumber.values()].sort((a, b) => a.n - b.n);
  }, [index, days, lcLog]);

  if (!index || !rows.length) return null;
  const count = (s: LcStatus) => rows.filter((r) => r.status === s).length;
  const solved = count('solved');
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);
  const visible = all ? shown : shown.slice(0, 12);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">LeetCode problems covered</h2>
        <p className="text-sm text-muted">
          <strong className="text-ink tabular-nums">{solved}</strong> of {rows.length} solved · {count('tried')} tried
        </p>
      </div>
      <p className="text-xs text-muted">Each coding problem is based on a LeetCode problem; this tracks our versions you&apos;ve solved (daily sets, archive and Unlimited).</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-good" style={{ width: `${(solved / rows.length) * 100}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter">
        {(['all', 'solved', 'tried', 'new'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${filter === f ? 'border-accent/60 bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink'}`}
          >
            {f === 'all' ? `All ${rows.length}` : f === 'new' ? `Not yet ${count('new')}` : `${f[0].toUpperCase()}${f.slice(1)} ${count(f)}`}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {visible.map((r) => (
          <li key={r.n}>
            <Link
              to={dayLink(r.date)}
              title={`Our version: ${r.title} (${r.date})`}
              className="flex items-center gap-2 rounded-lg border border-line/70 px-2.5 py-1.5 text-sm transition-colors hover:border-faint"
            >
              <span className={`size-2 shrink-0 rounded-full ${DIFF_DOT[r.diff]}`} aria-label={r.diff} />
              <span className="font-mono text-xs text-muted tabular-nums">#{r.n}</span>
              <span className="min-w-0 flex-1 truncate">{r.t}</span>
              <span
                className={`shrink-0 text-xs font-semibold ${r.status === 'solved' ? 'text-good' : r.status === 'tried' ? 'text-warn' : 'text-faint'}`}
              >
                {r.status === 'solved' ? '✓ solved' : r.status === 'tried' ? 'tried' : 'not yet'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length > 12 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 text-xs font-semibold text-accent-soft hover:text-ink">
          {all ? 'Show fewer' : `Show all ${shown.length}`}
        </button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- review list

interface QuizItem {
  kind: 'quiz';
  key: string;
  at: number;
  where: string;
  date?: string;
  question: QuizQuestion;
  lang?: Lang | null;
  picked: number | null;
}
interface CodeItem {
  kind: 'code';
  key: string;
  at: number;
  where: string;
  date: string;
  title: string;
  diff: string;
  lc?: { number: number; title: string };
  gaveUp: boolean;
}
type Item = QuizItem | CodeItem;

/** Wrong quiz answers (daily sets, archive, Unlimited) and coding problems you didn't solve, newest first. */
export function ReviewCard() {
  const days = useStore((s) => s.days);
  const missLog = useStore((s) => s.missLog);
  const reviewDone = useStore((s) => s.reviewDone);
  const setReviewDone = useStore((s) => s.setReviewDone);
  const [topics, setTopics] = useState<TopicsFile | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'quiz' | 'code'>('all');
  const [showDone, setShowDone] = useState(false);
  const [limit, setLimit] = useState(8);
  // Collapsed by default: the list can get long, and the header already shows how many are open.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void loadTopicsFile().then(setTopics);
  }, []);

  useEffect(() => {
    if (!topics) return;
    let alive = true;
    void (async () => {
      // 1. Daily / archive records: compare answers with the answer keys (no downloads yet).
      const wantQuiz: { rec: DayRecord; key: string; stage: number; qi: number; picked: number; lang?: Lang | null }[] = [];
      const out: Item[] = [];
      for (const [key, rec] of realRecords(days)) {
        const meta = topics[rec.setDate];
        if (!meta) continue;
        rec.stages.forEach((p, stage) => {
          const m = meta[stage];
          if (!p || !m) return;
          if (p.kind === 'quiz' && 'q' in m) {
            p.answers.forEach((a, qi) => {
              const q = m.q[qi];
              if (a === null || a === undefined || !q) return;
              const lang = p.langs?.[qi];
              const right = (lang && q.v?.[lang]) ?? q.a;
              if (a !== right) wantQuiz.push({ rec, key: `d:${key}:${stage}:${qi}`, stage, qi, picked: a, lang });
            });
          } else if (p.kind === 'code' && p.status !== 'accepted' && (p.status === 'gaveup' || p.submissions > 0)) {
            out.push({ kind: 'code', key: `d:${key}:${stage}`, at: rec.completedAt ?? rec.startedAt, where: source(rec), date: rec.setDate, title: '', diff: STAGE_NAME[stage], gaveUp: p.status === 'gaveup' });
          }
        });
      }
      // 2. Load the light day files that hold those questions (and the problem titles).
      const dates = new Set([...wantQuiz.map((w) => w.rec.setDate), ...out.map((o) => (o as CodeItem).date)]);
      const missIds = Object.keys(missLog ?? {}).filter((id) => isOn(missLog, id));
      for (const id of missIds) {
        const m = /^(\d{4}-\d{2}-\d{2})-/.exec(id);
        if (m) dates.add(m[1]);
      }
      const lite = new Map<string, LiteDay | null>();
      await Promise.all([...dates].map(async (d) => lite.set(d, await loadLite(d))));
      for (const w of wantQuiz) {
        const st = lite.get(w.rec.setDate)?.stages[w.stage];
        const q = st?.kind === 'quiz' ? st.questions[w.qi] : undefined;
        if (q) out.push({ kind: 'quiz', key: w.key, at: w.rec.completedAt ?? w.rec.startedAt, where: `${source(w.rec)} · ${STAGE_NAME[w.stage]}`, date: w.rec.setDate, question: q, lang: w.lang, picked: w.picked });
      }
      for (const o of out) {
        if (o.kind !== 'code') continue;
        const stage = Number(o.key.split(':').at(-1));
        const st = lite.get(o.date)?.stages[stage];
        if (st?.kind === 'code') {
          o.title = st.problem.title;
          o.lc = st.problem.similarLC;
          o.where = `${o.where} · ${STAGE_NAME[stage]}`;
        }
      }
      // 3. Unlimited misses: questions from the daily sets or from the extra banks.
      const banks = missIds.some((id) => !/^\d{4}-/.test(id)) ? (await Promise.all((['dsa', 'swe', 'interview'] as const).map(loadBank))).flat() : [];
      for (const id of missIds) {
        const m = /^(\d{4}-\d{2}-\d{2})-/.exec(id);
        let q: QuizQuestion | undefined;
        if (m) for (const st of lite.get(m[1])?.stages ?? []) if (st.kind === 'quiz') q ??= st.questions.find((x) => x.id === id);
        q ??= banks.find((x) => x.id === id);
        if (q) out.push({ kind: 'quiz', key: `u:${id}`, at: missLog![id], where: 'Unlimited', question: q, picked: null });
      }
      out.sort((a, b) => b.at - a.at);
      if (alive) setItems(out);
    })();
    return () => {
      alive = false;
    };
  }, [topics, days, missLog]);

  if (!items) return null;
  const open = items.filter((i) => showDone || !isOn(reviewDone, i.key));
  const shown = open.filter((i) => filter === 'all' || i.kind === filter);
  const doneCount = items.filter((i) => isOn(reviewDone, i.key)).length;

  return (
    <Card className="p-5">
      <h2>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)} className="group flex w-full flex-wrap items-baseline justify-between gap-2 text-left">
          <span className="flex items-center gap-2 font-bold">
            <ChevronRight className={`size-4 self-center text-muted transition-transform group-hover:text-ink ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
            To review
          </span>
          <span className="text-sm font-normal text-muted">
            {items.length - doneCount} open{doneCount ? ` · ${doneCount} reviewed` : ''}
          </span>
        </button>
      </h2>
      {!expanded ? null : items.length === 0 ? (
        <p className="mt-3 text-sm text-faint">Nothing to review yet.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">Questions you got wrong or skipped and problems you didn&apos;t solve. Mark them reviewed once they make sense.</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(['all', 'quiz', 'code'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${filter === f ? 'border-accent/60 bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink'}`}
              >
                {f === 'all' ? 'All' : f === 'quiz' ? 'Questions' : 'Problems'}
              </button>
            ))}
            {doneCount > 0 && (
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[var(--color-accent)]" />
                Show reviewed
              </label>
            )}
          </div>
          <ul className="mt-3 space-y-2">
            {shown.slice(0, limit).map((it) => (
              <li key={it.key}>
                {it.kind === 'quiz' ? (
                  <QuizReview item={it} done={isOn(reviewDone, it.key)} onDone={(d) => setReviewDone(it.key, d)} />
                ) : (
                  <CodeReview item={it} done={isOn(reviewDone, it.key)} onDone={(d) => setReviewDone(it.key, d)} />
                )}
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="mt-3 text-sm text-faint">All caught up.</p>}
          {shown.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 10)} className="mt-2 text-xs font-semibold text-accent-soft hover:text-ink">
              Show more ({shown.length - limit} left)
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function DoneButton({ done, onDone }: { done: boolean; onDone: (d: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onDone(!done)}
      className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${done ? 'border-good/40 text-good' : 'border-line text-muted hover:border-faint hover:text-ink'}`}
    >
      {done ? '✓ Reviewed' : 'Mark reviewed'}
    </button>
  );
}

function QuizReview({ item, done, onDone }: { item: QuizItem; done: boolean; onDone: (d: boolean) => void }) {
  const q = resolveQuestion(item.question, item.lang ?? undefined);
  return (
    <div className={`rounded-xl border border-line/70 p-3 ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
          {item.where}
          {item.picked === SKIPPED && <span className="ml-1.5 text-faint normal-case">(skipped)</span>}
        </p>
        <DoneButton done={done} onDone={onDone} />
      </div>
      <Markdown className="mt-1 text-sm">{q.promptMd}</Markdown>
      <details className="mt-1.5 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-accent-soft select-none">Show the answer</summary>
        <ul className="mt-2 space-y-1">
          {q.choices.map((c, i) => {
            const right = i === q.answerIndex;
            const mine = i === item.picked;
            return (
              <li
                key={i}
                className={`flex gap-2 rounded-lg px-2 py-1 ${right ? 'bg-good/12 text-ink' : mine ? 'bg-bad/10 text-ink' : 'text-muted'}`}
              >
                <span className="w-4 shrink-0 font-bold">{right ? '✓' : mine ? '✗' : ''}</span>
                <Markdown className="min-w-0 flex-1">{c}</Markdown>
              </li>
            );
          })}
        </ul>
        <Markdown className="mt-2 text-muted">{q.explanationMd}</Markdown>
        {item.date && (
          <Link to={dayLink(item.date)} className="mt-2 inline-block text-xs font-semibold text-accent-soft hover:text-ink">
            Open that day →
          </Link>
        )}
      </details>
    </div>
  );
}

function CodeReview({ item, done, onDone }: { item: CodeItem; done: boolean; onDone: (d: boolean) => void }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line/70 p-3 ${done ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{item.where}</p>
        <p className="font-semibold">
          {item.title || 'Coding problem'}
          {item.lc && <span className="ml-2 text-xs font-normal text-muted">like LeetCode #{item.lc.number} {item.lc.title}</span>}
        </p>
        <p className="text-xs text-faint">{item.gaveUp ? 'Skipped or gave up' : 'Not solved yet'}</p>
      </div>
      <Link to={dayLink(item.date)} className="shrink-0 rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent-soft hover:bg-accent/10">
        Try again →
      </Link>
      <DoneButton done={done} onDone={onDone} />
    </div>
  );
}
