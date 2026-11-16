/// <reference lib="webworker" />
/**
 * Python 3 runtime: Pyodide (CPython compiled to WebAssembly), loaded from jsDelivr.
 * Runs user code with a fresh globals dict per run. The page kills this worker on timeout.
 */
import { MAX_OUTPUT_CHARS, PYODIDE_INDEX, outputStreamer, type FromRuntime, type ToRuntime } from './types';

declare const self: DedicatedWorkerGlobalScope;

interface PyProxyDict {
  set(key: string, value: unknown): void;
  destroy(): void;
}
interface Pyodide {
  runPython(code: string, opts?: { globals?: unknown; filename?: string }): unknown;
  setStdout(opts: { write: (buf: Uint8Array) => number; isatty?: boolean }): void;
  setStderr(opts: { write: (buf: Uint8Array) => number }): void;
  toPy(obj: unknown): PyProxyDict;
}

const post = (m: FromRuntime) => self.postMessage(m);
let pyodide: Promise<Pyodide> | null = null;

function load(): Promise<Pyodide> {
  pyodide ??= (async () => {
    post({ type: 'status', state: 'loading', message: 'Downloading Python…' });
    const mod = (await import(/* @vite-ignore */ `${PYODIDE_INDEX}pyodide.mjs`)) as {
      loadPyodide: (o: { indexURL: string }) => Promise<Pyodide>;
    };
    const py = await mod.loadPyodide({ indexURL: PYODIDE_INDEX });
    post({ type: 'status', state: 'ready' });
    return py;
  })().catch((err) => {
    pyodide = null;
    post({ type: 'status', state: 'error', message: `Python failed to load: ${String(err?.message ?? err)}` });
    throw err;
  });
  return pyodide;
}

function sink(chunks: string[], counter: { n: number }, stream?: (text: string) => void) {
  const dec = new TextDecoder();
  return (buf: Uint8Array) => {
    if (counter.n < MAX_OUTPUT_CHARS) {
      const s = dec.decode(buf, { stream: true });
      chunks.push(s);
      counter.n += s.length;
      stream?.(s);
    }
    return buf.length;
  };
}

self.onmessage = async (ev: MessageEvent<ToRuntime>) => {
  const msg = ev.data;
  if (msg.type === 'warmup') {
    await load().catch(() => undefined);
    return;
  }
  let py: Pyodide;
  try {
    py = await load();
  } catch (err) {
    post({ type: 'compiled', id: msg.id, ok: false, error: `Python runtime failed to load: ${String((err as Error)?.message ?? err)}` });
    return;
  }
  const out: string[] = [];
  const err: string[] = [];
  const counter = { n: 0 };
  let globals: PyProxyDict | null = null;
  let exitCode: number | null = 0;
  let t0 = performance.now();
  let compiledSent = false;
  try {
    // isatty: line-buffered, so prints reach the page as they happen (and survive a time-limit kill).
    py.setStdout({ write: sink(out, counter, outputStreamer(post, msg.id)), isatty: true });
    py.setStderr({ write: sink(err, counter) });
    globals = py.toPy({});
    globals.set('__LEARN_INPUT__', msg.input);
    globals.set('__name__', '__main__');
    post({ type: 'compiled', id: msg.id, ok: true });
    compiledSent = true;
    t0 = performance.now();
    py.runPython(msg.source, { globals, filename: 'main.py' });
  } catch (e) {
    exitCode = 1;
    err.push(String((e as Error)?.message ?? e));
  } finally {
    try {
      globals?.destroy();
    } catch {
      /* interpreter may be dead */
    }
  }
  const healthy = isHealthy(py);
  if (!healthy) {
    exitCode = null;
    err.push('\nRuntime error: the Python runtime crashed (browser stack overflow, usually from a very deep recursion or nested structure). It will restart for your next run.');
  }
  // The page expects 'compiled' before 'done', even if the interpreter died before user code ran.
  if (!compiledSent) post({ type: 'compiled', id: msg.id, ok: true });
  post({ type: 'done', id: msg.id, stdout: out.join(''), stderr: err.join(''), exitCode, ms: performance.now() - t0 });
  if (!healthy) post({ type: 'status', state: 'error', message: 'Python runtime crashed — restarting' });
};

function isHealthy(py: Pyodide): boolean {
  try {
    py.runPython('0');
    return true;
  } catch {
    return false;
  }
}
