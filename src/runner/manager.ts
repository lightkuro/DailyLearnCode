import { create } from 'zustand';
import type { Lang } from './harness/types';
import { javaChannel } from './javaChannel';
import type { Backend, RunOutcome, RunRequest, RuntimeState } from './types';
import { ChannelBackend, workerChannel } from './workerBackend';

export interface RuntimeStatus {
  state: RuntimeState;
  progress?: number;
  message?: string;
}

export const useRuntimeStatus = create<Record<Lang, RuntimeStatus>>(() => ({
  python3: { state: 'idle' },
  java: { state: 'idle' },
  cpp: { state: 'idle' },
}));

const backends: Partial<Record<Lang, Backend>> = {};

function backend(lang: Lang): Backend {
  const existing = backends[lang];
  if (existing) return existing;
  const onStatus = (state: RuntimeState, progress?: number, message?: string) =>
    useRuntimeStatus.setState({ [lang]: { state, progress, message } } as Partial<Record<Lang, RuntimeStatus>>);
  let b: Backend;
  switch (lang) {
    case 'python3':
      b = new ChannelBackend(
        () => workerChannel(() => new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module', name: 'python' })),
        onStatus,
      );
      break;
    case 'cpp':
      b = new ChannelBackend(
        () => workerChannel(() => new Worker(new URL('./cpp.worker.ts', import.meta.url), { type: 'module', name: 'cpp' })),
        onStatus,
      );
      break;
    case 'java':
      b = new ChannelBackend(javaChannel, onStatus);
      break;
  }
  backends[lang] = b;
  return b;
}

/** Start downloading/initialising a toolchain in the background (e.g. while the user does the quiz). */
export function warmup(lang: Lang): Promise<void> {
  return backend(lang).warmup();
}

export function runProgram(lang: Lang, req: RunRequest): Promise<RunOutcome> {
  return backend(lang).run(req);
}

/** How long a run may take in the browser, scaled from the problem's native-speed budget. */
export function runTimeout(lang: Lang, timeLimitMs: number): number {
  const scale: Record<Lang, [number, number]> = {
    cpp: [3, 1000],
    java: [6, 4000],
    python3: [8, 1500],
  };
  const [mult, base] = scale[lang];
  return Math.min(60_000, timeLimitMs * mult + base);
}

/** First compile can include downloading the toolchain, so allow plenty of time. */
export function compileTimeout(lang: Lang): number {
  return lang === 'python3' ? 120_000 : 240_000;
}
