import { motion } from 'motion/react';
import { LeetCodeCard, ReviewCard } from '../components/StatsReview';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { SyncButton } from '../components/SyncButton';
import { Card } from '../components/ui';
import { addDays, formatShortDate, localToday } from '../game/dates';
import { DAY_MAX } from '../game/scoring';
import { useStore, type DayRecord } from '../game/store';
import { computeStreak } from '../game/streak';
import { AREA_LABEL, TOPICS, type Area } from '../content/topics';
import { useTopicStats, type TopicTally } from '../game/topicStats';

const BUCKETS = [
  { label: '20', min: 20, max: 20 },
  { label: '16–19', min: 16, max: 19 },
  { label: '12–15', min: 12, max: 15 },
  { label: '8–11', min: 8, max: 11 },
  { label: '4–7', min: 4, max: 7 },
  { label: '0–3', min: 0, max: 3 },
];
const STAGES = [
  { label: 'Starter quiz', max: 4 },
  { label: 'Easy', max: 4 },
  { label: 'Medium', max: 4 },
  { label: 'Hard', max: 4 },
  { label: 'SWE quiz', max: 4 },
];

/** Single-hue sequential scale (violet, dim → bright on the dark surface) for the 30-day strip. */
function cellColor(score: number | undefined): string {
  if (score === undefined) return 'var(--color-surface-3)';
  const t = score / DAY_MAX;
  const l = 32 + t * 46; // OKLCH lightness 32% → 78%
  return `oklch(${l}% ${0.06 + t * 0.12} 293)`;
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
      {sub && <p className="text-xs text-faint">{sub}</p>}
    </Card>
  );
}

export function StatsPage() {
  const days = useStore((s) => s.days);
  const detective = useStore((s) => s.detective);
  const topicLog = useStore((s) => s.topicLog);
  const missLog = useStore((s) => s.missLog);
  const lcLog = useStore((s) => s.lcLog);
  const today = localToday();
  const [hover, setHover] = useState<string | null>(null);

  const finished = useMemo(() => Object.values(days).filter((d): d is DayRecord & { score: number } => d.completedAt !== undefined && d.score !== undefined), [days]);
  const streak = useMemo(() => computeStreak(days, today), [days, today]);
  const avg = finished.length ? finished.reduce((s, d) => s + d.score, 0) / finished.length : 0;
  const perfect = finished.filter((d) => d.score === DAY_MAX).length;
  const counts = BUCKETS.map((b) => finished.filter((d) => d.score >= b.min && d.score <= b.max).length);
  const maxCount = Math.max(1, ...counts);
  const stageAvg = STAGES.map((_, i) => {
    const vals = finished.map((d) => d.stageScores[i] ?? 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const scoreByKey = new Map(finished.map((d) => [d.key, d.score]));
  const todayRec = days[today];

  const head = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Stats</h1>
        <p className="mt-1 text-muted">Stored in this browser. Sync to your own Google Drive or export a backup to keep them safe.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/archive" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-3 px-4 text-sm font-semibold text-ink hover:border-faint">
          Archive
        </Link>
        <SyncButton variant="label" />
      </div>
    </div>
  );

  if (!finished.length && !Object.keys(days).some((k) => k !== 'unlimited') && !detective?.cases && !Object.keys(topicLog ?? {}).length && !Object.keys(missLog ?? {}).length && !Object.keys(lcLog ?? {}).length) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {head}
        <Card className="mx-auto max-w-lg p-8 text-center">
          <p className="text-3xl">📊</p>
          <p className="mt-3 font-semibold">No games yet.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/" className="text-accent-soft underline">
              Play today&apos;s set
            </Link>
            <Link to="/archive" className="text-accent-soft underline">
              Browse the archive
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {head}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Completed" value={finished.length} sub={`${perfect} perfect`} />
        <Tile label="Average" value={avg.toFixed(1)} sub={`out of ${DAY_MAX}`} />
        <Tile label="Streak" value={<>🔥 {streak.current}</>} sub={streak.todayDone ? 'today done' : todayRec ? 'finish today to extend' : 'play today to extend'} />
        <Tile label="Best streak" value={streak.best} sub="days in a row" />
      </div>

      {!!detective?.cases && (
        <Link to="/detective" className="block">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:border-faint">
            <p className="font-bold">
              Detective
            </p>
            <p className="text-sm text-muted">
              <strong className="text-ink tabular-nums">{detective.solved}</strong>/{detective.cases} cases solved
            </p>
            <p className="text-sm text-muted">
              <strong className="text-ink tabular-nums">{detective.rounds}</strong> rounds · <strong className="text-ink tabular-nums">{detective.perfect}</strong> perfect
            </p>
          </Card>
        </Link>
      )}

      <Card className="p-5">
        <h2 className="font-bold">Score distribution</h2>
        <p className="text-xs text-muted">Completed sets by total score</p>
        <ul className="mt-4 space-y-1.5">
          {BUCKETS.map((b, i) => (
            <li key={b.label} className="grid grid-cols-[3.5rem_1fr] items-center gap-3 text-sm">
              <span className="text-right text-muted tabular-nums">{b.label}</span>
              <div className="flex items-center gap-2" title={`${b.label}: ${counts[i]} day(s)`}>
                <motion.div
                  className="h-6 rounded-r-[4px] bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: counts[i] ? `${(counts[i] / maxCount) * 100}%` : '2px' }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 90, damping: 18 }}
                  style={{ minWidth: 2, opacity: counts[i] ? 1 : 0.35 }}
                />
                <span className="text-xs text-muted tabular-nums">{counts[i]}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-bold">Last 30 days</h2>
            <p className="text-xs text-muted">Brighter = higher score · empty = not completed</p>
          </div>
          <p className="text-xs text-ink tabular-nums" aria-live="polite">
            {hover ? `${formatShortDate(hover)}: ${scoreByKey.has(hover) ? `${scoreByKey.get(hover)}/${DAY_MAX}` : '—'}` : ' '}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-10 gap-[3px] sm:grid-cols-15">
          {last30.map((d) => (
            <button
              key={d}
              type="button"
              aria-label={`${formatShortDate(d)}: ${scoreByKey.has(d) ? `${scoreByKey.get(d)} of ${DAY_MAX}` : 'not completed'}`}
              onMouseEnter={() => setHover(d)}
              onFocus={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              className={`aspect-square rounded-[4px] outline-offset-1 ${d === today ? 'ring-1 ring-ink/60' : ''}`}
              style={{ background: cellColor(scoreByKey.get(d)) }}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">Average points by stage</h2>
        <ul className="mt-4 space-y-2.5">
          {STAGES.map((s, i) => (
            <li key={s.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="text-muted">{s.label}</span>
              <div className="h-2.5 rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-accent-soft"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stageAvg[i] / s.max) * 100}%` }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.6 }}
                />
              </div>
              <span className="text-right text-xs tabular-nums" title="Average points">{stageAvg[i].toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ReviewCard />

      <LeetCodeCard />

      <TopicsCard />

      <details className="rounded-2xl border border-line bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-semibold">History table</summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">Date</th>
              <th>Mode</th>
              <th className="text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {[...finished]
              .sort((a, b) => (a.key < b.key ? 1 : -1))
              .map((d) => (
                <tr key={d.key} className="border-t border-line">
                  <td className="py-1.5">{formatShortDate(d.key)}</td>
                  <td className="text-muted">{d.mode}</td>
                  <td className="text-right font-semibold">
                    {d.score}/{DAY_MAX}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Every topic: how often you've practised it and how often you got it right, or "not yet". */
function TopicsCard() {
  const { byTopic, ready } = useTopicStats();
  const touched = TOPICS.filter((t) => (byTopic.get(t.id)?.seen ?? 0) > 0).length;
  const areas: Area[] = ['dsa', 'swe'];
  const row = (id: string, label: string, t: TopicTally | undefined) => {
    const pct = t && t.seen ? t.right / t.seen : 0;
    return (
      <li key={id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.2rem] items-center gap-2 py-1 text-sm">
        <Link to={`/learn/${id}`} className={`truncate hover:underline ${t?.seen ? 'text-ink' : 'text-faint'}`} title={`${label}: open the Learn page`}>
          {label}
        </Link>
        {t?.seen ? (
          <>
            <div className="h-2 rounded-full bg-surface-3" title={`${t.right} of ${t.seen} right`}>
              <motion.div className="h-full rounded-full bg-accent-soft" initial={{ width: 0 }} animate={{ width: `${Math.max(4, pct * 100)}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="text-right text-xs text-muted tabular-nums">
              {t.right}/{t.seen}
            </span>
          </>
        ) : (
          <span className="col-span-2 text-right text-xs text-faint">not yet</span>
        )}
      </li>
    );
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-bold">Topics</h2>
          <p className="text-xs text-muted">Answers by topic across daily sets, Unlimited and Detective · right / answered</p>
        </div>
        {ready && (
          <p className="text-xs text-muted">
            <strong className="text-ink tabular-nums">{touched}</strong> of {TOPICS.length} topics touched
          </p>
        )}
      </div>
      <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {areas.map((area) => (
          <div key={area}>
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">{AREA_LABEL[area]}</p>
            <ul className="mt-1.5">{TOPICS.filter((t) => t.area === area).map((t) => row(t.id, t.label, byTopic.get(t.id)))}</ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
