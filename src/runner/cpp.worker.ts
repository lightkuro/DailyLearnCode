/// <reference lib="webworker" />
/**
 * C++ runtime: Clang/LLD compiled to WebAssembly (@yowasp/clang, loaded from jsDelivr) compiles the
 * program to wasm32-wasi, which then runs in this worker through a minimal WASI shim.
 * A precompiled header of the standard-library prelude is built once per session to speed up compiles.
 */
import { ConsoleStdout, File, OpenFile, WASI, WASIProcExit } from '@bjorn3/browser_wasi_shim';
import { CPP_CHECK_FLAGS_CLANG, CPP_PRELUDE_FILE, CPP_PRELUDE_H, CPP_STD_FLAGS } from './harness/cpp';
import { MAX_OUTPUT_CHARS, YOWASP_CLANG_URL, YOWASP_CLANG_VERSION, outputStreamer, type FromRuntime, type ToRuntime } from './types';

declare const self: DedicatedWorkerGlobalScope;

type Tree = { [name: string]: Tree | string | Uint8Array };
interface ClangModule {
  runClang(
    args: string[],
    files: Tree,
    opts?: {
      stdout?: ((b: Uint8Array | null) => void) | null;
      stderr?: ((b: Uint8Array | null) => void) | null;
      fetchProgress?: (e: { totalLength: number; doneLength: number }) => void;
    },
  ): Promise<Tree>;
}

const post = (m: FromRuntime) => self.postMessage(m);
const FLAGS = [
  ...CPP_STD_FLAGS,
  ...CPP_CHECK_FLAGS_CLANG,
  '-fno-exceptions',
  '-I.',
  '-Wno-unused-command-line-argument',
  '-Wl,-z,stack-size=16777216',
  '-Wl,--initial-memory=67108864',
];
const PCH_FLAGS = [...CPP_STD_FLAGS, ...CPP_CHECK_FLAGS_CLANG, '-fno-exceptions', '-I.'];

let clang: Promise<ClangModule> | null = null;
let pch: Uint8Array | null = null;
let pchTried = false;

function load(): Promise<ClangModule> {
  clang ??= (async () => {
    post({ type: 'status', state: 'loading', progress: 0, message: 'Downloading C++ compiler…' });
    const mod = (await import(/* @vite-ignore */ YOWASP_CLANG_URL)) as ClangModule;
    // Trigger the (large, cached) resource download with progress reporting.
    await mod.runClang(['clang++', '--version'], {}, {
      stdout: null,
      stderr: null,
      fetchProgress: ({ totalLength, doneLength }) => {
        if (totalLength > 0) post({ type: 'status', state: 'loading', progress: doneLength / totalLength, message: 'Downloading C++ compiler…' });
      },
    });
    post({ type: 'status', state: 'loading', progress: 1, message: 'Preparing C++ headers…' });
    await buildPch(mod);
    post({ type: 'status', state: 'ready' });
    return mod;
  })().catch((err) => {
    clang = null;
    post({ type: 'status', state: 'error', message: `C++ compiler failed to load: ${String(err?.message ?? err)}` });
    throw err;
  });
  return clang;
}

// The PCH takes ~20s to build, so it is kept in Cache Storage across reloads and worker restarts.
const PCH_CACHE = 'learn-cpp-pch';
function pchKey(): string {
  let h = 0x811c9dc5;
  for (const ch of CPP_PRELUDE_H + PCH_FLAGS.join(' ')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return `/__learn/pch/${YOWASP_CLANG_VERSION}/${(h >>> 0).toString(16)}.pch`;
}
async function cachedPch(): Promise<Uint8Array | null> {
  try {
    const hit = await (await caches.open(PCH_CACHE)).match(pchKey());
    return hit ? new Uint8Array(await hit.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
async function storePch(bytes: Uint8Array | null): Promise<void> {
  try {
    const cache = await caches.open(PCH_CACHE);
    if (bytes) await cache.put(pchKey(), new Response(bytes as BufferSource));
    else await cache.delete(pchKey());
  } catch {
    /* Cache Storage unavailable (private mode etc.) */
  }
}

async function buildPch(mod: ClangModule): Promise<void> {
  if (pchTried) return;
  pchTried = true;
  pch = await cachedPch();
  if (pch) return;
  try {
    const out = await mod.runClang(
      ['clang++', ...PCH_FLAGS, '-x', 'c++-header', CPP_PRELUDE_FILE, '-o', `${CPP_PRELUDE_FILE}.pch`],
      { [CPP_PRELUDE_FILE]: CPP_PRELUDE_H },
      { stdout: null, stderr: null },
    );
    const bytes = out[`${CPP_PRELUDE_FILE}.pch`];
    if (bytes instanceof Uint8Array) {
      pch = bytes;
      void storePch(bytes);
    }
  } catch {
    pch = null; // compile without PCH (slower, still correct)
  }
}

function collect(): { chunks: string[]; write: (b: Uint8Array | null) => void } {
  const chunks: string[] = [];
  const dec = new TextDecoder();
  return { chunks, write: (b) => b && chunks.push(dec.decode(b, { stream: true })) };
}

function toTree(files: Record<string, string>): Tree {
  const root: Tree = {};
  for (const [path, text] of Object.entries(files)) {
    const parts = path.split('/');
    let dir = root;
    for (const p of parts.slice(0, -1)) dir = (dir[p] ??= {}) as Tree;
    dir[parts[parts.length - 1]] = text;
  }
  return root;
}

async function compile(mod: ClangModule, source: string, files: Record<string, string>): Promise<{ wasm?: Uint8Array; error?: string }> {
  const attempt = async (usePch: boolean) => {
    const tree = toTree({ ...files, 'main.cc': source });
    const args = ['clang++', ...FLAGS];
    if (usePch && pch) {
      tree[`${CPP_PRELUDE_FILE}.pch`] = pch;
      args.push('-include-pch', `${CPP_PRELUDE_FILE}.pch`);
    }
    args.push('main.cc', '-o', 'main.wasm');
    const err = collect();
    try {
      const out = await mod.runClang(args, tree, { stdout: err.write, stderr: err.write });
      const wasm = out['main.wasm'];
      if (wasm instanceof Uint8Array) return { wasm };
      return { error: err.chunks.join('') || 'Compilation produced no output.' };
    } catch (e) {
      return { error: err.chunks.join('') || String((e as Error)?.message ?? e) };
    }
  };
  if (pch) {
    const r = await attempt(true);
    if (r.wasm) return r;
    // A stale/incompatible PCH shows up as a PCH error: drop it and retry without.
    if (/precompiled|\.pch|PCH/i.test(r.error ?? '')) {
      pch = null;
      void storePch(null);
      return attempt(false);
    }
    return r;
  }
  return attempt(false);
}

self.onmessage = async (ev: MessageEvent<ToRuntime>) => {
  const msg = ev.data;
  if (msg.type === 'warmup') {
    await load().catch(() => undefined);
    return;
  }
  let mod: ClangModule;
  try {
    mod = await load();
  } catch (err) {
    post({ type: 'compiled', id: msg.id, ok: false, error: `C++ compiler failed to load: ${String((err as Error)?.message ?? err)}` });
    return;
  }
  const { wasm, error } = await compile(mod, msg.source, msg.files);
  if (!wasm) {
    post({ type: 'compiled', id: msg.id, ok: false, error });
    return;
  }
  post({ type: 'compiled', id: msg.id, ok: true });

  const out: string[] = [];
  const err: string[] = [];
  let outLen = 0;
  const stream = outputStreamer(post, msg.id);
  const push = (arr: string[]) => (line: string) => {
    if (outLen < MAX_OUTPUT_CHARS) {
      arr.push(line + '\n');
      outLen += line.length + 1;
      if (arr === out) stream(line + '\n');
    }
  };
  const t0 = performance.now();
  let exitCode: number | null;
  try {
    const wasi = new WASI(['main'], [], [
      new OpenFile(new File(new TextEncoder().encode(msg.input))),
      ConsoleStdout.lineBuffered(push(out)),
      ConsoleStdout.lineBuffered(push(err)),
    ]);
    const module = await WebAssembly.compile(wasm as BufferSource);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    exitCode = wasi.start(instance as unknown as { exports: { memory: WebAssembly.Memory; _start: () => unknown } });
  } catch (e) {
    if (e instanceof WASIProcExit) exitCode = e.code;
    else {
      exitCode = null;
      const m = String((e as Error)?.message ?? e);
      err.push(
        /unreachable/i.test(m)
          ? 'Runtime error: the program stopped on a failed check: an index out of range (vector, string, array…), signed integer overflow, a failed assert or abort().\n'
          : /out of bounds|stack/i.test(m)
            ? `Runtime error: ${m} (out-of-bounds memory access or stack overflow).\n`
            : `Runtime error: ${m}\n`,
      );
    }
  }
  post({ type: 'done', id: msg.id, stdout: out.join(''), stderr: err.join(''), exitCode, ms: performance.now() - t0 });
};
