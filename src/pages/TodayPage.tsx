import { useEffect, useState } from 'react';
import { Card, Spinner } from '../components/ui';
import { loadIndex, pickDaily, type DailyPick } from '../content/loadDay';
import { localToday } from '../game/dates';
import { useStore } from '../game/store';
import { DayGame } from './DayGame';

export function TodayPage() {
  const today = localToday();
  const [pick, setPick] = useState<DailyPick | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(
      (idx) => {
        // Keep playing whatever set today's progress was started with (e.g. a classic replay).
        const existing = useStore.getState().days[today];
        setPick(existing ? { setDate: existing.setDate, classic: existing.setDate !== today } : pickDaily(idx, today));
      },
      (e) => setError(String(e?.message ?? e)),
    );
  }, [today]);

  if (error) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">Couldn&apos;t reach the puzzle index.</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
      </Card>
    );
  }
  if (pick === undefined) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  if (pick === null) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-3xl">🌙</p>
        <p className="mt-3 font-semibold">No daily sets have been published yet.</p>
        <p className="mt-1 text-sm text-muted">Check back soon.</p>
      </Card>
    );
  }
  return <DayGame dayKey={today} setDate={pick.setDate} mode="daily" classic={pick.classic} />;
}
