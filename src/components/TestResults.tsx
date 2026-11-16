import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { Param } from '../runner/harness/types';
import type { JudgeReport } from '../runner/judge';
import type { Verdict } from '../runner/harness/verdict';
import { Spinner } from './ui';

const VERDICT: Record<Verdict, { label: string; tone: string }> = {
  accepted: { label: 'Accepted', tone: 'text-good' },
  wrong_answer: { label: 'Wrong Answer', tone: 'text-bad' },
  runtime_error: { label: 'Runtime Error', tone: 'text-bad' },
  time_limit: { label: 'Time Limit Exceeded', tone: 'text-warn' },
  compile_error: { label: 'Compile Error', tone: 'text-bad' },
  internal_error: { label: 'Something went wrong', tone: 'text-bad' },
};

export function formatValue(v: unknown, max = 600): string {
  const s = JSON.stringify(v) ?? 'undefined';
  if (s.length <= max) return s;
  const size = Array.isArray(v) ? ` · ${v.length} items` : '';
  return `${s.slice(0, max)}… (${s.length.toLocaleString()} chars${size})`;
}

function Block({ label, children, tone = '' }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <pre className={`max-h-48 overflow-auto rounded-lg bg-code px-3 py-2 font-mono text-[12.5px] leading-relaxed break-all whitespace-pre-wrap ${tone}`}>
        {children}
      </pre>
    </div>
  );
}

function CaseDetail({ report, index, params }: { report: JudgeReport; index: number; params: Param[] }) {
  const test = report.tests[index];
  const res = report.cases[index];
  return (
    <div className="space-y-3">
      <Block label="Input">{params.map((p, i) => `${p.name} = ${formatValue(test.args[i])}`).join('\n')}</Block>
      {res?.error !== undefined ? (
        <Block label="Error" tone="text-bad">
          {res.error}
        </Block>
      ) : res?.missing ? (
        <Block label="Output" tone="text-faint">
          {report.verdict === 'time_limit' ? '(timed out before this test finished)' : '(no output — the program stopped)'}
        </Block>
      ) : (
        <Block label="Your output" tone={res?.ok ? 'text-good' : 'text-bad'}>
          {formatValue(res?.got)}
        </Block>
      )}
      <Block label="Expected" tone="text-good">
        {formatValue(test.expected)}
      </Block>
      {res?.stdout ? <Block label="Stdout">{res.stdout}</Block> : null}
    </div>
  );
}

export function TestResults({
  report,
  running,
  params,
  points,
}: {
  report: JudgeReport | null;
  running: 'run' | 'submit' | null;
  params: Param[];
  points?: number;
}) {
  const [selected, setSelected] = useState(0);

  if (running) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted">
        <Spinner className="size-6 text-accent-soft" />
        <p>{running === 'run' ? 'Running examples…' : 'Judging against all tests…'}</p>
        <p className="text-xs text-faint">First run of a language downloads its toolchain (cached afterwards).</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted">
        <p>
          <strong className="text-ink">Run</strong> checks the examples. <strong className="text-ink">Submit</strong> judges every
          hidden test.
        </p>
        <p className="text-xs text-faint">Shortcuts: Ctrl/⌘ + Enter to run · Ctrl/⌘ + Shift + Enter to submit</p>
      </div>
    );
  }

  const v = VERDICT[report.verdict];
  const failIdx = report.firstFailure;
  const showIdx = report.mode === 'run' ? Math.min(selected, report.tests.length - 1) : (failIdx ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <motion.h3
          key={`${report.verdict}-${report.mode}`}
          initial={{ scale: report.verdict === 'accepted' ? 1.6 : 1, opacity: 0, rotate: report.verdict === 'accepted' ? -6 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          className={`text-xl font-black ${v.tone}`}
          role="status"
        >
          {report.mode === 'run' && report.verdict === 'accepted' ? 'Examples pass' : v.label}
          {report.mode === 'submit' && report.verdict === 'accepted' && points !== undefined && (
            <span className="ml-2 rounded-lg bg-good/15 px-2 py-0.5 text-base">+{points}</span>
          )}
        </motion.h3>
        {report.verdict !== 'compile_error' && (
          <p className="text-sm text-muted tabular-nums">
            {report.passed}/{report.total} {report.mode === 'run' ? 'examples' : 'tests'} passed
            {report.ms !== undefined && report.verdict !== 'time_limit' ? ` · ${Math.round(report.ms)} ms` : ''}
          </p>
        )}
      </div>

      {report.verdict !== 'compile_error' && (
        <div className="flex flex-wrap gap-1.5" aria-label="Test results">
          {report.cases.map((c, i) => (
            <motion.button
              type="button"
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: Math.min(i * 0.035, 1.2), type: 'spring', stiffness: 500, damping: 22 }}
              onClick={() => report.mode === 'run' && setSelected(i)}
              title={`${i < report.exampleCount ? 'Example' : 'Hidden test'} ${i + 1}: ${c.ok ? 'passed' : c.missing ? 'not reached' : 'failed'}`}
              className={`h-6 rounded-md text-[11px] font-bold ${report.mode === 'run' ? 'min-w-16 px-2' : 'w-6'} ${
                c.ok ? 'bg-good/85 text-bg' : c.missing ? 'bg-surface-3 text-faint' : 'bg-bad/85 text-bg'
              } ${report.mode === 'run' && i === showIdx ? 'ring-2 ring-ink/60' : ''}`}
            >
              {report.mode === 'run' ? `Case ${i + 1} ${c.ok ? '✓' : '✗'}` : ''}
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={`${report.verdict}-${showIdx}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {report.verdict === 'compile_error' || (report.message && report.verdict !== 'wrong_answer' && report.verdict !== 'time_limit') ? (
            <Block label={report.verdict === 'compile_error' ? 'Compiler output' : 'Details'} tone="text-bad">
              {report.message}
            </Block>
          ) : null}
          {report.verdict === 'time_limit' && <p className="text-sm text-warn">{report.message}</p>}
          {report.verdict !== 'compile_error' && (report.mode === 'run' || failIdx !== undefined) && (
            <div className="mt-3">
              {report.mode === 'submit' && failIdx !== undefined && (
                <p className="mb-2 text-xs font-semibold text-muted">
                  First failing test: {failIdx < report.exampleCount ? `example ${failIdx + 1}` : `hidden test ${failIdx + 1 - report.exampleCount}`}
                </p>
              )}
              <CaseDetail report={report} index={showIdx} params={params} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
