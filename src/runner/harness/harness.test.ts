import { describe, expect, it } from 'vitest';
import { buildProgram, mapErrorLines, starterCode, type Signature } from '.';
import { compareOutput } from './compare';
import { parseRunOutput } from './protocol';
import { checkSignature, LANGS } from './types';
import { judgeRun } from './verdict';

describe('compareOutput', () => {
  it('exact with float tolerance', () => {
    expect(compareOutput([1, 2], [1, 2])).toBe(true);
    expect(compareOutput([1, 2], [2, 1])).toBe(false);
    expect(compareOutput(0.3, 0.1 + 0.2)).toBe(true);
    expect(compareOutput(2, 2.0)).toBe(true);
    expect(compareOutput(1000000, 1000001)).toBe(false);
  });
  it('unordered compares the outer list as a multiset', () => {
    expect(compareOutput([[1, 2], [3]], [[3], [1, 2]], 'unordered')).toBe(true);
    expect(compareOutput([[1, 2], [3]], [[3], [2, 1]], 'unordered')).toBe(false);
    expect(compareOutput([1, 1, 2], [1, 2, 2], 'unordered')).toBe(false);
  });
  it('unordered-deep ignores order at every level', () => {
    expect(compareOutput([['eat', 'tea'], ['bat']], [['bat'], ['tea', 'eat']], 'unordered-deep')).toBe(true);
    expect(compareOutput([['a', 'a']], [['a']], 'unordered-deep')).toBe(false);
  });
});

describe('protocol', () => {
  it('parses results, errors and per-case stdout', () => {
    const out = ['debug 1', '@@abc R 0 [1,2]', '@@abc E 1 ValueError: bad (line 3)', 'tail'].join('\n') + '\n';
    const p = parseRunOutput(out, 'abc');
    expect(p.cases.get(0)).toMatchObject({ kind: 'ok', value: [1, 2], stdout: 'debug 1' });
    expect(p.cases.get(1)).toMatchObject({ kind: 'error', error: 'ValueError: bad (line 3)' });
    expect(p.trailingStdout).toBe('tail');
  });
  it('finds a marker after output with no trailing newline (cout << x << " " in a loop)', () => {
    const p = parseRunOutput('1 2 3 @@abc R 0 [3,2,1]\n4 5 @@abc R 1 []\n', 'abc');
    expect(p.cases.get(0)).toMatchObject({ kind: 'ok', value: [3, 2, 1], stdout: '1 2 3 ' });
    expect(p.cases.get(1)).toMatchObject({ kind: 'ok', value: [], stdout: '4 5 ' });
  });
  it('ignores markers with the wrong nonce (user cannot forge results)', () => {
    const p = parseRunOutput('@@evil R 0 [1]\n', 'abc');
    expect(p.cases.size).toBe(0);
  });
});

describe('judgeRun', () => {
  const tests = [{ expected: 1 }, { expected: 2 }, { expected: 3 }];
  it('keeps what a timed-out test printed', () => {
    const j = judgeRun(tests, 'exact', { stdout: '@@n R 0 1\ni=1\ni=2\n', stderr: '', timedOut: true }, 'n');
    expect(j.verdict).toBe('time_limit');
    expect(j.cases[0].ok).toBe(true);
    expect(j.cases[1].stdout).toBe('i=1\ni=2');
  });
  it('accepts when everything matches', () => {
    const j = judgeRun(tests, 'exact', { stdout: '@@n R 0 1\n@@n R 1 2\n@@n R 2 3\n', stderr: '', timedOut: false }, 'n');
    expect(j.verdict).toBe('accepted');
    expect(j.passed).toBe(3);
  });
  it('reports the first wrong answer', () => {
    const j = judgeRun(tests, 'exact', { stdout: '@@n R 0 1\n@@n R 1 5\n@@n R 2 3\n', stderr: '', timedOut: false }, 'n');
    expect(j.verdict).toBe('wrong_answer');
    expect(j.firstFailure).toBe(1);
  });
  it('treats missing output as a crash, or TLE when timed out', () => {
    expect(judgeRun(tests, 'exact', { stdout: '@@n R 0 1\n', stderr: 'boom', timedOut: false }, 'n').verdict).toBe('runtime_error');
    expect(judgeRun(tests, 'exact', { stdout: '', stderr: '', timedOut: true }, 'n').verdict).toBe('time_limit');
  });
  it('surfaces compile errors', () => {
    const j = judgeRun(tests, 'exact', { compileError: 'x.cc:1: error', stdout: '', stderr: '', timedOut: false }, 'n');
    expect(j.verdict).toBe('compile_error');
  });
});

describe('harness generation', () => {
  const sig: Signature = { fn: 'twoThings', params: [{ name: 'nums', type: 'int[]' }, { name: 'head', type: 'ListNode' }], returns: 'list<list<int>>' };

  it('validates signatures', () => {
    expect(checkSignature(sig)).toEqual([]);
    expect(checkSignature({ ...sig, fn: 'class' })).not.toEqual([]);
    expect(checkSignature({ ...sig, returns: 'void' })).not.toEqual([]);
    expect(checkSignature({ ...sig, returns: 'void', outputParam: 'nums' })).toEqual([]);
  });

  it('generates LeetCode-style starters', () => {
    expect(starterCode('python3', sig)).toContain('def twoThings(self, nums: List[int], head: Optional[ListNode]) -> List[List[int]]:');
    expect(starterCode('java', sig)).toContain('public List<List<Integer>> twoThings(int[] nums, ListNode head)');
    expect(starterCode('cpp', sig)).toContain('vector<vector<int>> twoThings(vector<int>& nums, ListNode* head)');
  });

  it('embeds the nonce and maps error lines back to user code', () => {
    for (const lang of LANGS) {
      const user = starterCode(lang, sig);
      const prog = buildProgram(lang, sig, user, 'feedface');
      expect(prog.source).toContain('feedface');
      const userFirstLine = prog.source.split('\n')[prog.userLineOffset];
      expect(user.startsWith(userFirstLine)).toBe(true);
      expect(prog.userLineCount).toBe(user.trimEnd().split('\n').length);
    }
    const prog = buildProgram('cpp', sig, 'int x = ;\n', 'n');
    expect(mapErrorLines('cpp', `main.cc:${prog.userLineOffset + 1}:9: error: expected expression`, prog)).toBe(
      'solution.cpp:1:9: error: expected expression',
    );
  });

  it('strips `public` from user Java classes so Main.java compiles', () => {
    const prog = buildProgram('java', sig, 'public class Solution {}', 'n');
    expect(prog.source).toContain('\nclass Solution {}');
  });
});
