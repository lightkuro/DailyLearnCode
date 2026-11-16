/**
 * Runs harness programs with the real toolchains (python3, javac/java, g++).
 * Used by content finalization/validation in CI — never in the browser.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CPP_CHECK_FLAGS_GCC, CPP_STD_FLAGS } from '../../src/runner/harness/cpp';
import { SOURCE_FILE, type Program } from '../../src/runner/harness/types';

export interface NativeResult {
  compileError?: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms: number;
  exitCode: number | null;
}

const MAX_BUFFER = 256 * 1024 * 1024;

function sh(cmd: string, args: string[], opts: { cwd: string; input?: string; timeoutMs: number }) {
  const t0 = performance.now();
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd,
    input: opts.input,
    timeout: opts.timeoutMs,
    maxBuffer: MAX_BUFFER,
    encoding: 'utf8',
    // Keep secrets out of anything that runs generated code.
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: opts.cwd, LANG: 'C.UTF-8', JAVA_TOOL_OPTIONS: '' },
  });
  const ms = performance.now() - t0;
  const timedOut = r.error !== undefined && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT';
  return { stdout: r.stdout ?? '', stderr: (r.stderr ?? '').replace(/^Picked up JAVA_TOOL_OPTIONS.*\n/m, ''), status: r.status, timedOut, ms, error: r.error };
}

export function runNative(program: Program, input: string, timeoutMs = 20000): NativeResult {
  const dir = mkdtempSync(join(tmpdir(), 'learn-native-'));
  try {
    writeFileSync(join(dir, SOURCE_FILE[program.lang]), program.source);
    for (const [name, text] of Object.entries(program.files)) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), text);
    }
    if (program.lang === 'python3') {
      const r = sh('python3', ['-I', 'main.py'], { cwd: dir, input, timeoutMs });
      return { stdout: r.stdout, stderr: r.stderr, timedOut: r.timedOut, ms: r.ms, exitCode: r.status };
    }
    if (program.lang === 'java') {
      const c = sh('javac', ['-encoding', 'UTF-8', '-nowarn', '-d', 'out', 'Main.java'], { cwd: dir, timeoutMs: 120000 });
      if (c.status !== 0) return { compileError: c.stderr || c.stdout, stdout: '', stderr: '', timedOut: false, ms: 0, exitCode: c.status };
      writeFileSync(join(dir, 'input.json'), input);
      const r = sh('java', ['-Xss512m', '-cp', 'out', 'Main', 'input.json', 'out.txt'], { cwd: dir, timeoutMs });
      let stdout = '';
      try {
        stdout = readFileSync(join(dir, 'out.txt'), 'utf8');
      } catch {
        /* no output */
      }
      return { stdout, stderr: r.stderr, timedOut: r.timedOut, ms: r.ms, exitCode: r.status };
    }
    const c = sh('g++', [...CPP_STD_FLAGS, ...CPP_CHECK_FLAGS_GCC, '-I.', 'main.cc', '-o', 'main'], { cwd: dir, timeoutMs: 120000 });
    if (c.status !== 0) return { compileError: c.stderr || c.stdout, stdout: '', stderr: '', timedOut: false, ms: 0, exitCode: c.status };
    const r = sh('./main', [], { cwd: dir, input, timeoutMs });
    return { stdout: r.stdout, stderr: r.stderr, timedOut: r.timedOut, ms: r.ms, exitCode: r.status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run a standalone Python script (test generators). Returns stdout. */
export function runPythonScript(code: string, timeoutMs = 60000): string {
  const dir = mkdtempSync(join(tmpdir(), 'learn-gen-'));
  try {
    writeFileSync(join(dir, 'gen.py'), code);
    const r = sh('python3', ['-I', 'gen.py'], { cwd: dir, timeoutMs });
    if (r.timedOut) throw new Error('generator timed out');
    if (r.status !== 0) throw new Error(`generator failed: ${r.stderr.slice(0, 2000)}`);
    return r.stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
