import { countLines, type Program, type Signature, type ValueType } from './types';

const PY_TYPE: Record<ValueType, string> = {
  int: 'int',
  long: 'int',
  double: 'float',
  bool: 'bool',
  string: 'str',
  char: 'str',
  'int[]': 'List[int]',
  'long[]': 'List[int]',
  'double[]': 'List[float]',
  'bool[]': 'List[bool]',
  'string[]': 'List[str]',
  'char[]': 'List[str]',
  'int[][]': 'List[List[int]]',
  'string[][]': 'List[List[str]]',
  'char[][]': 'List[List[str]]',
  'list<int>': 'List[int]',
  'list<string>': 'List[str]',
  'list<list<int>>': 'List[List[int]]',
  'list<list<string>>': 'List[List[str]]',
  ListNode: 'Optional[ListNode]',
  TreeNode: 'Optional[TreeNode]',
};

const LISTNODE_DOC = `# Definition for singly-linked list (already provided):
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
`;
const TREENODE_DOC = `# Definition for a binary tree node (already provided):
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
`;

export function pythonStarter(sig: Signature): string {
  const params = sig.params.map((p) => `${p.name}: ${PY_TYPE[p.type]}`).join(', ');
  const ret = sig.returns === 'void' ? 'None' : PY_TYPE[sig.returns];
  const docs =
    (sig.params.some((p) => p.type === 'ListNode') || sig.returns === 'ListNode' ? LISTNODE_DOC : '') +
    (sig.params.some((p) => p.type === 'TreeNode') || sig.returns === 'TreeNode' ? TREENODE_DOC : '');
  const note = sig.returns === 'void' ? `        """Do not return anything, modify ${sig.outputParam} in-place instead."""\n` : '';
  return `${docs}class Solution:\n    def ${sig.fn}(self${params ? ', ' + params : ''}) -> ${ret}:\n${note}        pass\n`;
}

const PRELUDE = `import sys as _h_sys, json as _h_json, traceback as _h_tb
_h_sys.setrecursionlimit(100000)
from typing import *
from collections import *
from heapq import *
from bisect import *
from itertools import *
from functools import *
import math, re, string, random, collections, heapq, bisect, itertools, functools, operator
from math import inf, gcd, lcm, sqrt, isqrt, comb, perm, factorial, floor, ceil, log, log2, log10, hypot, pi

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

`;

const HARNESS = String.raw`

def _h_mk_list(a):
    head = cur = ListNode(0)
    for v in a or []:
        cur.next = ListNode(v)
        cur = cur.next
    return head.next

def _h_mk_tree(a):
    if not a or a[0] is None:
        return None
    root = TreeNode(a[0])
    q = [root]
    qi = 0
    i = 1
    while i < len(a) and qi < len(q):
        node = q[qi]
        qi += 1
        if i < len(a) and a[i] is not None:
            node.left = TreeNode(a[i])
            q.append(node.left)
        i += 1
        if i < len(a) and a[i] is not None:
            node.right = TreeNode(a[i])
            q.append(node.right)
        i += 1
    return root

def _h_norm(x):
    if x is None or isinstance(x, (bool, int, str)):
        return x
    if isinstance(x, float):
        if x != x or x in (float('inf'), float('-inf')):
            return None
        return x
    if isinstance(x, ListNode):
        out = []
        seen = 0
        while x is not None and seen <= 200000:
            out.append(_h_norm(x.val))
            x = x.next
            seen += 1
        return out
    if isinstance(x, TreeNode):
        out = []
        q = [x]
        qi = 0
        while qi < len(q):
            n = q[qi]
            qi += 1
            if n is None:
                out.append(None)
            else:
                out.append(_h_norm(n.val))
                q.append(n.left)
                q.append(n.right)
        while out and out[-1] is None:
            out.pop()
        return out
    if isinstance(x, (list, tuple)):
        return [_h_norm(e) for e in x]
    if isinstance(x, (set, frozenset)):
        return sorted((_h_norm(e) for e in x), key=lambda e: _h_json.dumps(e))
    try:
        import numbers
        if isinstance(x, numbers.Integral):
            return int(x)
        if isinstance(x, numbers.Real):
            return float(x)
    except Exception:
        pass
    return str(x)

def _h_free(*roots):
    # Pyodide (CPython on wasm) can overflow the browser stack when a long chain of objects is
    # freed recursively. Unlink linked lists / trees iteratively so each node is freed on its own.
    stack = list(roots)
    seen = set()
    while stack:
        n = stack.pop()
        if isinstance(n, (list, tuple)):
            if len(n) and isinstance(n[0], (ListNode, TreeNode, list, tuple)):
                stack.extend(n)
            continue
        if id(n) in seen:
            continue
        if isinstance(n, ListNode):
            seen.add(id(n))
            stack.append(n.next)
            n.next = None
        elif isinstance(n, TreeNode):
            seen.add(id(n))
            stack.append(n.left)
            stack.append(n.right)
            n.left = n.right = None

def _h_where(e):
    try:
        frames = _h_tb.extract_tb(e.__traceback__)
        for fr in reversed(frames):
            ln = fr.lineno - _H_OFFSET
            if fr.filename in ("main.py", "<exec>") and 1 <= ln <= _H_USER_LINES:
                return " (line %d)" % ln
    except Exception:
        pass
    return ""

def _h_main():
    raw = globals().get("__LEARN_INPUT__")
    if raw is None:
        raw = _h_sys.stdin.read()
    tests = _h_json.loads(raw)
    for i, a in enumerate(tests):
        args = res = None
        try:
            args = [__ARGS__]
            res = Solution().__FN__(*args)
            __VOID__
            if res is None and _H_NODE_RET:
                res = []
            out = _h_json.dumps(_h_norm(res), separators=(",", ":"), ensure_ascii=False)
            print("@@" + _H_NONCE + " R " + str(i) + " " + out, flush=True)
        except RecursionError as e:
            print("@@" + _H_NONCE + " E " + str(i) + " RecursionError: maximum recursion depth exceeded" + _h_where(e), flush=True)
        except BaseException as e:
            msg = (type(e).__name__ + ": " + str(e)).replace("\n", " ")[:400]
            print("@@" + _H_NONCE + " E " + str(i) + " " + msg + _h_where(e), flush=True)
        finally:
            _h_free(args, res)
            args = res = None

_h_main()
`;

function convExpr(t: ValueType, expr: string): string {
  switch (t) {
    case 'ListNode':
      return `_h_mk_list(${expr})`;
    case 'TreeNode':
      return `_h_mk_tree(${expr})`;
    case 'double':
      return `float(${expr})`;
    case 'double[]':
      return `[float(v) for v in ${expr}]`;
    default:
      return expr;
  }
}

export function pythonProgram(sig: Signature, userCode: string, nonce: string): Program {
  const code = userCode.replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';
  const userLineOffset = countLines(PRELUDE) - 1; // PRELUDE ends with a newline
  const userLineCount = countLines(code) - 1;
  const args = sig.params.map((p, i) => convExpr(p.type, `a[${i}]`)).join(', ');
  const outIdx = sig.returns === 'void' ? sig.params.findIndex((p) => p.name === sig.outputParam) : -1;
  const harness = HARNESS.replace('__ARGS__', args)
    .replace('__FN__', sig.fn)
    .replace('__VOID__', outIdx >= 0 ? `res = args[${outIdx}]` : 'pass');
  // Constants go after user code (so line offsets stay simple) but before _h_main() runs.
  const nodeRet = sig.returns === 'ListNode' || sig.returns === 'TreeNode' ? 'True' : 'False';
  const consts = `\n_H_NONCE = ${JSON.stringify(nonce)}\n_H_OFFSET = ${userLineOffset}\n_H_USER_LINES = ${userLineCount}\n_H_NODE_RET = ${nodeRet}\n`;
  const source = PRELUDE + code + consts + harness;
  return { lang: 'python3', source, files: {}, userLineOffset, userLineCount };
}
