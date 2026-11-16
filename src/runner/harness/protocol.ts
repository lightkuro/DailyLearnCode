/**
 * Output protocol written by every harness:
 *   @@<nonce> R <i> <json>     result of test i
 *   @@<nonce> E <i> <message>  test i threw
 *   @@<nonce> T <i>            the time budget ran out during test i (Java self-timeout)
 * Any other line is the user's own stdout and is attributed to the next marker line.
 */
export interface ParsedCase {
  index: number;
  kind: 'ok' | 'error' | 'timeout';
  value?: unknown;
  raw?: string;
  error?: string;
  stdout: string;
}

export interface ParsedOutput {
  cases: Map<number, ParsedCase>;
  /** stdout printed after the last marker (e.g. output just before a crash). */
  trailingStdout: string;
  malformed: string[];
}

const MAX_STDOUT_PER_CASE = 4000;

export function parseRunOutput(stdout: string, nonce: string): ParsedOutput {
  const cases = new Map<number, ParsedCase>();
  const malformed: string[] = [];
  const prefix = `@@${nonce} `;
  let pending: string[] = [];
  let pendingLen = 0;
  const lines = stdout.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const keep = (text: string) => {
    if (pendingLen < MAX_STDOUT_PER_CASE) {
      pending.push(text);
      pendingLen += text.length + 1;
    }
  };
  for (const line of lines) {
    // Output printed without a final newline (cout << x << " " in a loop, print(x, end=" ")) ends up on
    // the same line as the next marker: the text before the marker is the player's.
    const at = line.indexOf(prefix);
    if (at === -1) {
      keep(line);
      continue;
    }
    if (at > 0) keep(line.slice(0, at));
    const rest = line.slice(at + prefix.length);
    const m = /^([RET]) (\d+) ?(.*)$/s.exec(rest);
    if (!m) {
      malformed.push(line);
      continue;
    }
    const [, kind, idxStr, payload] = m;
    const index = Number(idxStr);
    let userOut = pending.join('\n');
    if (userOut.length > MAX_STDOUT_PER_CASE) userOut = userOut.slice(0, MAX_STDOUT_PER_CASE) + '\n…(truncated)';
    pending = [];
    pendingLen = 0;
    if (kind === 'T') {
      cases.set(index, { index, kind: 'timeout', stdout: userOut });
    } else if (kind === 'R') {
      try {
        cases.set(index, { index, kind: 'ok', value: JSON.parse(payload), raw: payload, stdout: userOut });
      } catch {
        cases.set(index, { index, kind: 'error', error: 'Harness produced invalid output', raw: payload, stdout: userOut });
      }
    } else {
      cases.set(index, { index, kind: 'error', error: payload, stdout: userOut });
    }
  }
  return { cases, trailingStdout: pending.join('\n'), malformed };
}
