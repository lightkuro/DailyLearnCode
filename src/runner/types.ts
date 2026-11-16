/** Messages between the page and a language runtime (Web Worker or the Java iframe). */

export type RuntimeState = 'idle' | 'loading' | 'ready' | 'error';

export type ToRuntime =
  | { type: 'warmup' }
  | { type: 'run'; id: number; source: string; files: Record<string, string>; input: string; timeoutMs: number };

export type FromRuntime =
  | { type: 'status'; state: RuntimeState; progress?: number; message?: string }
  | { type: 'compiled'; id: number; ok: boolean; error?: string }
  /** stdout so far, sent while the program runs, so output survives a time-limit kill. */
  | { type: 'output'; id: number; chunk: string }
  | { type: 'done'; id: number; stdout: string; stderr: string; exitCode: number | null; ms: number };

export interface RunRequest {
  source: string;
  files: Record<string, string>;
  input: string;
  compileTimeoutMs: number;
  /** Hard stop enforced by the page (kills the runtime). */
  runTimeoutMs: number;
  /** Budget the program enforces itself (Java only; CheerpJ cannot be interrupted from outside). */
  budgetMs?: number;
}

export interface RunOutcome {
  compileError?: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms: number;
  exitCode: number | null;
}

export interface Backend {
  warmup(): Promise<void>;
  run(req: RunRequest): Promise<RunOutcome>;
}

/** Hard cap on captured output so a print loop cannot exhaust memory. */
export const MAX_OUTPUT_CHARS = 2_000_000;

/** Pinned toolchain versions (all loaded from public CDNs; see About page for licences). */
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const YOWASP_CLANG_VERSION = '22.0.0-git20542-10';
export const YOWASP_CLANG_URL = `https://cdn.jsdelivr.net/npm/@yowasp/clang@${YOWASP_CLANG_VERSION}/gen/bundle.js`;
export const CHEERPJ_VERSION = '5.0';

/**
 * Worker side: forwards stdout to the page in batches while a program runs. Runtimes execute
 * synchronously, so batches go out whenever enough time or text has piled up (checked on each write).
 */
export function outputStreamer(post: (m: FromRuntime) => void, id: number): (text: string) => void {
  let buf = '';
  let sent = 0;
  let last = performance.now();
  return (text) => {
    if (sent >= MAX_OUTPUT_CHARS) return;
    buf += text;
    const now = performance.now();
    if (now - last > 100 || buf.length > 65536) {
      post({ type: 'output', id, chunk: buf });
      sent += buf.length;
      buf = '';
      last = now;
    }
  };
}
