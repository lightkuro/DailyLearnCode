import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DAYS_DIR = join(ROOT, 'content/days');
export const DRAFTS_DIR = join(ROOT, 'content/drafts');
export const BANK_DIR = join(ROOT, 'content/bank');
export const DETECTIVE_DIR = join(ROOT, 'content/detective');
export const LEARN_DIR = join(ROOT, 'content/learn');

export function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => join(dir, f));
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Pretty JSON, but arrays that contain only primitives/nested primitive arrays stay on one line. */
export function formatJson(value: unknown): string {
  const isFlat = (v: unknown): boolean =>
    v === null || typeof v !== 'object' || (Array.isArray(v) && v.every(isFlat));
  const fmt = (v: unknown, ind: string): string => {
    if (isFlat(v)) return JSON.stringify(v);
    const next = ind + '  ';
    if (Array.isArray(v)) return `[\n${v.map((e) => next + fmt(e, next)).join(',\n')}\n${ind}]`;
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    return `{\n${entries.map(([k, x]) => `${next}${JSON.stringify(k)}: ${fmt(x, next)}`).join(',\n')}\n${ind}}`;
  };
  return fmt(value, '') + '\n';
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatJson(value));
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
