import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Card, Spinner } from '../components/ui';
import { loadIndex } from '../content/loadDay';
import { DATE_RE } from '../content/schema';
import { localToday } from '../game/dates';
import { useStore } from '../game/store';
import { DayGame } from './DayGame';

export function PracticePage() {
  const { date = '' } = useParams();
  const [known, setKnown] = useState<boolean | undefined>(undefined);
  const existing = useStore((s) => s.days[date]);

  useEffect(() => {
    if (!DATE_RE.test(date)) {
      setKnown(false);
      return;
    }
    loadIndex().then(
      (idx) => setKnown(idx.days.some((d) => d.date === date)),
      () => setKnown(false),
    );
  }, [date]);

  if (date === localToday()) return <Navigate to="/" replace />;
  if (known === undefined) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  if (!known) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">There is no published set for {date || 'that date'}.</p>
        <Link to="/archive" className="mt-3 inline-block text-sm text-accent-soft underline">
          Browse the archive
        </Link>
      </Card>
    );
  }
  // A daily you started on its own day keeps its record (and mode); otherwise this is practice.
  return <DayGame dayKey={date} setDate={existing?.setDate ?? date} mode={existing?.mode ?? 'practice'} />;
}
