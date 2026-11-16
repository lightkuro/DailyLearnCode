export type CompareMode = 'exact' | 'unordered' | 'unordered-deep';

function numEqual(a: number, b: number): boolean {
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  const diff = Math.abs(a - b);
  return diff <= 1e-5 || diff <= 1e-5 * Math.max(Math.abs(a), Math.abs(b));
}

/** Deep JSON equality with a small tolerance for non-integer numbers. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return numEqual(a, b);
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!jsonEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function sortKey(v: unknown): string {
  return JSON.stringify(v);
}

function sortOuter(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  return [...v].sort((x, y) => (sortKey(x) < sortKey(y) ? -1 : sortKey(x) > sortKey(y) ? 1 : 0));
}

function sortDeep(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  return sortOuter(v.map(sortDeep));
}

export function compareOutput(expected: unknown, actual: unknown, mode: CompareMode = 'exact'): boolean {
  switch (mode) {
    case 'exact':
      return jsonEqual(expected, actual);
    case 'unordered':
      return jsonEqual(sortOuter(expected), sortOuter(actual));
    case 'unordered-deep':
      return jsonEqual(sortDeep(expected), sortDeep(actual));
  }
}
