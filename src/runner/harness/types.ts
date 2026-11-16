/**
 * Signature DSL shared by content, the browser judge and the native validator.
 * Every value crosses the language boundary as JSON:
 *   - ListNode  <-> [1,2,3]
 *   - TreeNode  <-> LeetCode level order, e.g. [1,null,2,3]
 *   - char      <-> one-character string
 */
export const LANGS = ['python3', 'java', 'cpp'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = {
  python3: 'Python 3',
  java: 'Java',
  cpp: 'C++',
};

export const VALUE_TYPES = [
  'int',
  'long',
  'double',
  'bool',
  'string',
  'char',
  'int[]',
  'long[]',
  'double[]',
  'bool[]',
  'string[]',
  'char[]',
  'int[][]',
  'string[][]',
  'char[][]',
  'list<int>',
  'list<string>',
  'list<list<int>>',
  'list<list<string>>',
  'ListNode',
  'TreeNode',
] as const;
export type ValueType = (typeof VALUE_TYPES)[number];
export type ReturnType = ValueType | 'void';

export interface Param {
  name: string;
  type: ValueType;
}

export interface Signature {
  /** Method name on class Solution (same in all languages). */
  fn: string;
  params: Param[];
  returns: ReturnType;
  /** For `void` methods that mutate an argument in place: the param whose final value is the output. */
  outputParam?: string;
}

/** A generated, ready-to-run program. */
export interface Program {
  lang: Lang;
  /** Main source file contents. */
  source: string;
  /** Extra files the program needs next to the source (e.g. C++ prelude header). */
  files: Record<string, string>;
  /** Number of program lines before the first line of user code (for mapping error line numbers). */
  userLineOffset: number;
  /** Number of lines of user code. */
  userLineCount: number;
}

export const SOURCE_FILE: Record<Lang, string> = {
  python3: 'main.py',
  java: 'Main.java',
  cpp: 'main.cc',
};

export function isListType(t: ValueType): boolean {
  return t.endsWith('[]') || t.startsWith('list<');
}

/** Element type of an array/list type. */
export function elementType(t: ValueType): ValueType {
  if (t.endsWith('[]')) return t.slice(0, -2) as ValueType;
  if (t.startsWith('list<')) return t.slice(5, -1) as ValueType;
  throw new Error(`not a list type: ${t}`);
}

export function usesNodeType(sig: Signature, node: 'ListNode' | 'TreeNode'): boolean {
  return sig.returns === node || sig.params.some((p) => p.type === node);
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED = new Set([
  // Words that would break at least one of the target languages if used as identifiers.
  'class', 'def', 'int', 'long', 'double', 'char', 'bool', 'boolean', 'string', 'String', 'new', 'delete', 'return',
  'public', 'private', 'static', 'void', 'for', 'while', 'if', 'else', 'switch', 'case', 'default', 'try', 'catch',
  'throw', 'lambda', 'None', 'True', 'False', 'null', 'true', 'false', 'and', 'or', 'not', 'in', 'is', 'from',
  'import', 'pass', 'with', 'as', 'global', 'nonlocal', 'yield', 'del', 'assert', 'raise', 'final', 'this', 'super',
  'list', 'map', 'set', 'vector', 'Solution', 'Main', 'ListNode', 'TreeNode', 'auto', 'const', 'struct', 'template',
  'operator', 'namespace', 'using', 'friend', 'virtual', 'register', 'signed', 'unsigned', 'short', 'float', 'byte',
  'interface', 'enum', 'extends', 'implements', 'package', 'abstract', 'native', 'goto', 'self', 'print', 'input',
  'len', 'sum', 'min', 'max', 'abs', 'sorted', 'range', 'id', 'type', 'object', 'str', 'dict', 'tuple', 'next',
]);

/** Validate that a signature can be expressed safely in every language. Returns a list of problems. */
export function checkSignature(sig: Signature): string[] {
  const errs: string[] = [];
  if (!IDENT.test(sig.fn) || RESERVED.has(sig.fn)) errs.push(`bad function name: ${sig.fn}`);
  const seen = new Set<string>();
  for (const p of sig.params) {
    if (!IDENT.test(p.name) || RESERVED.has(p.name) || p.name.startsWith('_')) errs.push(`bad param name: ${p.name}`);
    if (seen.has(p.name)) errs.push(`duplicate param: ${p.name}`);
    seen.add(p.name);
    if (!(VALUE_TYPES as readonly string[]).includes(p.type)) errs.push(`unknown type: ${p.type}`);
  }
  if (sig.returns === 'void') {
    const out = sig.params.find((p) => p.name === sig.outputParam);
    if (!out) errs.push('void signature needs outputParam naming one of the params');
  } else if (!(VALUE_TYPES as readonly string[]).includes(sig.returns)) {
    errs.push(`unknown return type: ${sig.returns}`);
  }
  return errs;
}

export function countLines(s: string): number {
  if (s.length === 0) return 0;
  return s.split('\n').length;
}
