import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { BUILD } from '../build-info';
import { Markdown } from '../components/Markdown';
import { Card } from '../components/ui';
import { RELEASES } from '../content/patchNotes';

const SHOWN = 8;
const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** /patch-notes: what changed in each release, newest first. */
export function PatchNotesPage() {
  // Opening a link to an older release shows the full list.
  const [all, setAll] = useState(() => {
    const id = typeof location === 'undefined' ? '' : location.hash.slice(1);
    return RELEASES.findIndex((r) => r.id === id) >= SHOWN;
  });
  const shown = all ? RELEASES : RELEASES.slice(0, SHOWN);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link to="/about" className="text-xs font-semibold text-muted hover:text-ink">
          ← About
        </Link>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-tight">
          <ScrollText className="size-7 text-accent-soft" aria-hidden="true" />
          Patch notes
        </h1>
        <p className="mt-1 text-muted">
          What changed in each release, newest first. You&apos;re on <strong className="font-mono text-ink">v{BUILD.version}</strong>.
        </p>
      </div>
      {shown.map((r, i) => (
        <section key={r.version} id={r.id} className="scroll-mt-20">
        <Card className="p-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-mono text-lg font-bold">v{r.version}</h2>
            <span className="text-sm text-faint">{longDate(r.date)}</span>
            {i === 0 && <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good">Current</span>}
          </div>
          {r.title && <p className="mt-1 font-display text-xl font-semibold">{r.title}</p>}
          <Markdown className="mt-3 text-sm leading-relaxed text-muted [&_strong]:text-ink">{r.md}</Markdown>
        </Card>
        </section>
      ))}
      {!all && RELEASES.length > SHOWN && (
        <button type="button" onClick={() => setAll(true)} className="w-full rounded-2xl border border-line py-3 text-sm font-semibold text-muted hover:border-faint hover:text-ink">
          Show {RELEASES.length - SHOWN} older releases
        </button>
      )}
    </div>
  );
}
