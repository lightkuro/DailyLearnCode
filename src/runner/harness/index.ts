import { cppProgram, cppStarter } from './cpp';
import { javaProgram, javaStarter } from './java';
import { pythonProgram, pythonStarter } from './python';
import type { Lang, Program, Signature } from './types';

export * from './types';
export { compareOutput, jsonEqual } from './compare';
export { parseRunOutput, type ParsedCase } from './protocol';

export function starterCode(lang: Lang, sig: Signature): string {
  switch (lang) {
    case 'python3':
      return pythonStarter(sig);
    case 'java':
      return javaStarter(sig);
    case 'cpp':
      return cppStarter(sig);
  }
}

export function buildProgram(lang: Lang, sig: Signature, userCode: string, nonce: string): Program {
  switch (lang) {
    case 'python3':
      return pythonProgram(sig, userCode, nonce);
    case 'java':
      return javaProgram(sig, userCode, nonce);
    case 'cpp':
      return cppProgram(sig, userCode, nonce);
  }
}

/** Map compiler/interpreter line numbers in an error message back to the user's code. */
export function mapErrorLines(lang: Lang, message: string, program: Program): string {
  const fix = (n: number) => {
    const ln = n - program.userLineOffset;
    return ln >= 1 && ln <= program.userLineCount ? String(ln) : null;
  };
  let out = message;
  if (lang === 'python3') {
    out = out.replace(/File "(?:main\.py|<exec>)", line (\d+)/g, (m, n) => {
      const ln = fix(+n);
      return ln ? `line ${ln}` : m.replace(/File "[^"]+", /, 'File "harness", ');
    });
  } else if (lang === 'java') {
    out = out.replace(/(?:\/[\w./-]*\/)?Main\.java:(\d+):/g, (m, n) => {
      const ln = fix(+n);
      return ln ? `Solution.java:${ln}:` : m;
    });
  } else {
    out = out.replace(/(?:[\w./-]*\/)?main\.cc:(\d+):(\d+):/g, (m, n, c) => {
      const ln = fix(+n);
      return ln ? `solution.cpp:${ln}:${c}:` : m;
    });
  }
  return out;
}

export function makeNonce(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
