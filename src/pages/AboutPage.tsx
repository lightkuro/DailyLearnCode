import { ArrowRight, ScrollText } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, ConfirmDialog } from '../components/ui';
import { driveEnabled } from '../sync/drive';
import { SITE } from '../site';
import { exportData, useStore } from '../game/store';
import { RELEASES } from '../content/patchNotes';
import { CHEERPJ_VERSION, PYODIDE_VERSION, YOWASP_CLANG_VERSION } from '../runner/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_strong]:text-ink">{children}</div>
    </Card>
  );
}

const latest = RELEASES[0];

export function AboutPage() {
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${SITE.name}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      importData(await f.text());
      setMsg('Backup restored ✓');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-black tracking-tight">About</h1>
        <p className="mt-1 text-muted">A daily, bite-sized interview-prep routine.</p>
      </div>

      <Section title="How a day works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Starter quiz</strong> — 4 algorithm questions, 1 point each.
          </li>
          <li>
            <strong>Easy</strong>, <strong>Medium</strong>, <strong>Hard</strong> coding problems — 4 points each, in Python 3, Java or C++.
          </li>
          <li>
            <strong>SWE quiz</strong> — 4 software-engineering fundamentals questions, 1 point each.
          </li>
        </ol>
        <p>
          The day is scored out of <strong>20</strong>. Coding tasks are all-or-nothing: you get the points only when every hidden test passes. Each task has 3 progressively
          stronger hints; every hint you reveal lowers that task&apos;s maximum by 1. Submissions are unlimited, and <strong>Run</strong> (examples only) is always free. Stages
          unlock in order.
        </p>
        <p>
          Getting around: click a fruit on the stage bar, or press <kbd>[</kbd> / <kbd>]</kbd> to step between stages. In a quiz,
          <kbd>1</kbd>–<kbd>4</kbd> answers and <kbd>←</kbd> / <kbd>→</kbd> moves between questions (answered ones are read-only). On a coding problem, <kbd>Esc</kbd> or the title
          returns from Hints / Solution to the problem.
        </p>
        <p>
          A daily counts toward your 🔥 streak when you finish it on its own (local) day. Past sets stay playable in the archive (on the Stats page) as practice. Problems are
          original, LeetCode-style exercises; where relevant they link to a similar LeetCode problem.
        </p>
        <p>
          <strong>Unlimited</strong> keeps drawing questions and problems from every published day, or rounds of software-engineering interview questions on the topics you pick.{' '}
          <strong>Detective</strong> deals five short snippets per round, each hiding one bug: pick what&apos;s wrong, flag the bad line, or write the missing line (checked by
          running tests in your browser); its Design file swaps code for system design docs. Neither affects your streak, but every answer counts toward your topic stats.
        </p>
        <p>
          <strong>Learn</strong> has a crash-course page for every topic the questions cover, with diagrams and code in your language. Highlighted terms in a question&apos;s{' '}
          <em>Explore topic</em> panel link straight to the right section.
        </p>
      </Section>

      <Section title="Where your code runs">
        <p>
          Everything runs <strong>in your browser</strong> — no code is sent to a server. Each language runs in an isolated worker that is destroyed if it exceeds its time limit.
          Toolchains download once on first use and are cached:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Python 3</strong>: Pyodide {PYODIDE_VERSION} (CPython on WebAssembly) — MPL-2.0. Like LeetCode, <code>typing</code>, <code>collections</code>,{' '}
            <code>heapq</code>, <code>bisect</code>, <code>itertools</code>, <code>functools</code> and <code>math</code> are pre-imported (so <code>inf</code>, <code>gcd</code>,{' '}
            <code>sqrt</code>, <code>comb</code>… work without <code>math.</code>), and the recursion limit is raised.
          </li>
          <li>
            <strong>C++23</strong> at <code>-O2</code>: Clang/LLD {YOWASP_CLANG_VERSION.split('-')[0]} on WebAssembly via YoWASP — Apache-2.0 with LLVM exception. Set up to behave
            like LeetCode: every standard header and <code>using namespace std</code> come pre-included, <code>long</code> is 64-bit (WebAssembly's would be 32, so your code is
            compiled as if you wrote <code>long long</code>), <code>__gcd</code> and <code>__lg</code> work, and an out-of-range index or signed overflow stops with a runtime error
            instead of giving a wrong answer. Differences left: <code>size_t</code> and pointers are 32-bit, C++ exceptions are disabled (no <code>throw</code>), and GCC-only
            extras like <code>__gnu_pbds</code> aren't there.
          </li>
          <li>
            <strong>Java 21</strong>:{' '}
            <a className="text-accent-soft underline" href="https://cheerpj.com" target="_blank" rel="noopener noreferrer">
              Built with CheerpJ
            </a>{' '}
            {CHEERPJ_VERSION} (a JVM on WebAssembly) — Community licence, loaded from the CheerpJ CDN. <code>java.util.*</code>, streams and <code>java.math</code> are imported for
            you, as on LeetCode.
          </li>
        </ul>
        <p>
          Optional code font:{' '}
          <a className="text-accent-soft underline" href="https://github.com/paper-design/paper-mono" target="_blank" rel="noopener noreferrer">
            Paper Mono
          </a>{' '}
          by Paper — SIL Open Font License 1.1.
        </p>
        <p>Timing depends on your device, so limits are generous. Hard tests are sized so that an asymptotically slow solution still fails.</p>
      </Section>

      <Section title="Your data">
        <p>
          Progress, code and settings are stored in your browser&apos;s local storage. The app has no accounts, no cookies and no ads. Export a backup to move between devices
          {driveEnabled() ? ', or sync to your own Google Drive' : ''}.
        </p>
        {driveEnabled() && (
          <p>
            <strong>Google Drive sync (optional):</strong> your browser saves your progress (and, if you like, your code) as files in <strong>your own</strong> Google Drive. You
            own those files and can open or delete them in Drive at any time; they never pass through this site, and the site can only see files it created there.
          </p>
        )}
        {(SITE.privacyUrl || SITE.termsUrl) && (
          <p>
            The details are in the{' '}
            {SITE.privacyUrl && (
              <a href={SITE.privacyUrl} className="text-accent-soft underline underline-offset-2">
                privacy policy
              </a>
            )}
            {SITE.privacyUrl && SITE.termsUrl && ' and the '}
            {SITE.termsUrl && (
              <a href={SITE.termsUrl} className="text-accent-soft underline underline-offset-2">
                terms of service
              </a>
            )}
            .
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {driveEnabled() && (
            <Link to="/account" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:brightness-110">
              Google Drive sync →
            </Link>
          )}
          <Button onClick={download}>Export backup</Button>
          <Button onClick={() => fileRef.current?.click()}>Import backup</Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {msg && <p className="text-ink">{msg}</p>}
      </Section>

      <Link to="/patch-notes" className="group flex items-center gap-4 rounded-2xl border border-line bg-surface/90 p-5 transition-colors hover:border-faint">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-soft">
          <ScrollText className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">Patch notes</span>
          <span className="block text-sm text-muted">
            What&apos;s new in v{latest.version}
            {latest.title ? `: ${latest.title}` : ''}, and every release before it.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
      </Link>

      <Section title="Credits">
        <p>
          {SITE.name} is open source under the MIT licence,{' '}
          <a className="text-accent-soft underline" href={SITE.credit.href} target="_blank" rel="noopener">
            {SITE.credit.label}
          </a>
          . Editor: CodeMirror (MIT). UI: React, Tailwind CSS, Motion, canvas-confetti, Lucide icons. LeetCode is a trademark of its owner; this site is not affiliated with it.
        </p>
      </Section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all progress?"
        body="This deletes every score, streak and saved solution in this browser. Export a backup first if you might want it back."
        confirmLabel="Delete everything"
        variant="danger"
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
          setMsg('All progress cleared.');
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
