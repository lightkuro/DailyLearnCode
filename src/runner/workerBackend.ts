import type { Backend, FromRuntime, RunOutcome, RunRequest, RuntimeState, ToRuntime } from './types';

export type StatusListener = (state: RuntimeState, progress?: number, message?: string) => void;

/** Something we can post messages to and destroy: a Worker or the Java iframe channel. */
export interface Channel {
  post(msg: ToRuntime): void;
  onMessage(fn: (msg: FromRuntime) => void): void;
  onCrash(fn: (message: string) => void): void;
  destroy(): void;
}

export function workerChannel(make: () => Worker): Channel {
  const w = make();
  return {
    post: (m) => w.postMessage(m),
    onMessage: (fn) => {
      w.onmessage = (e: MessageEvent<FromRuntime>) => fn(e.data);
    },
    onCrash: (fn) => {
      w.onerror = (e) => fn(e.message || 'worker crashed');
    },
    destroy: () => w.terminate(),
  };
}

interface Pending {
  id: number;
  resolve: (o: RunOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
  req: RunRequest;
  /** stdout streamed so far (used if the run is killed for time). */
  partial: string[];
}

/**
 * Drives one isolated runtime. Every run is guarded by a compile timeout and a run timeout; when either
 * fires, the whole runtime is destroyed (the only reliable way to stop an infinite loop) and lazily recreated.
 */
export class ChannelBackend implements Backend {
  private ch: Channel | null = null;
  private nextId = 1;
  private pending: Pending | null = null;
  private state: RuntimeState = 'idle';
  private waiters: (() => void)[] = [];

  constructor(
    private readonly create: () => Channel,
    private readonly onStatus: StatusListener,
  ) {}

  private setState(state: RuntimeState, progress?: number, message?: string) {
    this.state = state;
    this.onStatus(state, progress, message);
    if (state === 'ready' || state === 'error') {
      const w = this.waiters;
      this.waiters = [];
      w.forEach((fn) => fn());
    }
  }

  private channel(): Channel {
    if (this.ch) return this.ch;
    const ch = this.create();
    ch.onMessage((m) => this.handle(m));
    ch.onCrash((message) => {
      this.kill();
      this.setState('error', undefined, message);
    });
    this.ch = ch;
    return ch;
  }

  private handle(m: FromRuntime) {
    if (m.type === 'status') {
      this.setState(m.state, m.progress, m.message);
      // A runtime that broke (e.g. crashed interpreter) is thrown away and recreated on next use.
      if (m.state === 'error' && !this.pending) this.kill();
      return;
    }
    const p = this.pending;
    if (!p || m.id !== p.id) return;
    if (m.type === 'output') {
      p.partial.push(m.chunk);
      return;
    }
    if (m.type === 'compiled') {
      clearTimeout(p.timer);
      if (!m.ok) {
        this.finish({ compileError: m.error ?? 'Compilation failed', stdout: '', stderr: '', timedOut: false, ms: 0, exitCode: null });
        return;
      }
      const started = performance.now();
      p.timer = setTimeout(() => {
        this.kill();
        p.resolve({ stdout: p.partial.join(''), stderr: '', timedOut: true, ms: performance.now() - started, exitCode: null });
      }, p.req.runTimeoutMs);
      return;
    }
    clearTimeout(p.timer);
    this.finish({ stdout: m.stdout, stderr: m.stderr, timedOut: false, ms: m.ms, exitCode: m.exitCode });
  }

  private finish(o: RunOutcome) {
    const p = this.pending;
    this.pending = null;
    p?.resolve(o);
  }

  /** Destroy the runtime (timeout / crash). It is recreated on next use. */
  kill() {
    this.ch?.destroy();
    this.ch = null;
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
    this.setState('idle');
    const w = this.waiters;
    this.waiters = [];
    w.forEach((fn) => fn());
  }

  warmup(): Promise<void> {
    if (this.state === 'ready' && this.ch) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      this.channel().post({ type: 'warmup' });
    });
  }

  run(req: RunRequest): Promise<RunOutcome> {
    if (this.pending) return Promise.reject(new Error('A run is already in progress'));
    return new Promise((resolve) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.kill();
        resolve({ compileError: 'Timed out while starting/compiling. The toolchain may still be downloading — try again.', stdout: '', stderr: '', timedOut: false, ms: 0, exitCode: null });
      }, req.compileTimeoutMs);
      this.pending = { id, resolve, timer, req, partial: [] };
      this.channel().post({ type: 'run', id, source: req.source, files: req.files, input: req.input, timeoutMs: req.budgetMs ?? req.runTimeoutMs });
    });
  }
}
