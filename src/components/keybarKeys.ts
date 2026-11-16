import type { Lang } from '../runner/harness/types';

/*
 * Key lists are space-separated. A key is `tap/hold1/hold2…`: tap types the first symbol; holding offers the rest,
 * like iOS's accented letters (`(/)`, `+/-/*\/%`). `\/` is a literal slash inside a key; a key with an empty part
 * (`/`, `//`, `/=`) stays a plain key. Special names: `tab` (indent with spaces), `left` / `right` (move the cursor).
 * Defaults end with `=/:` (Python) or `=/;` (Java, C++): tap =, hold for the statement symbol.
 */

/** One row on a phone: pairs packed into hold keys, brackets near the right, `=` with `:` or `;` last. */
export const COMPACT_KEYS: Record<Lang, string> = {
  python3: 'tab "/\' _/# </>/! +/-/*/% [/] {/} (/) =/:',
  java: 'tab "/\' &/| </>/! +/-/*/% [/] {/} (/) =/;',
  cpp: 'tab "/\' &/| </>/! ->/:: +/-/*/% [/] {/} (/) =/;',
};
/** The longer set ("More keys" on the Account page): a second row with . , and cursor keys. */
export const MORE_KEYS: Record<Lang, string> = {
  python3: 'tab "/\' _/# </>/! +/-/*/% [/] {/} (/) =/: ./,/? \\//% left right',
  java: 'tab "/\' &/| </>/! +/-/*/% [/] {/} (/) =/; ./,/? \\//% left right',
  cpp: 'tab "/\' &/| </>/! ->/:: +/-/*/% [/] {/} (/) =/; ./,/? \\//% left right',
};

export const defaultKeys = (lang: Lang, more: boolean) => (more ? MORE_KEYS : COMPACT_KEYS)[lang];

export interface Key {
  tap: string;
  /** What holding offers, in order (the first is picked if you just hold and let go). */
  hold: string[];
}

/** Split on `/` (not `\/`). Any empty part means the token is a plain key, typed as written. */
export function parseKey(token: string): Key {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '\\' && token[i + 1] === '/') {
      cur += '/';
      i++;
    } else if (token[i] === '/') {
      parts.push(cur);
      cur = '';
    } else cur += token[i];
  }
  parts.push(cur);
  if (parts.length === 1 || parts.some((p) => !p)) return { tap: token.replace(/\\\//g, '/'), hold: [] };
  return { tap: parts[0], hold: [...new Set(parts.slice(1))].filter((h) => h !== parts[0]) };
}

/** Back to the text form (escaping slashes inside symbols). */
export function formatKey(k: Key): string {
  const esc = (s: string) => (k.hold.length ? s.replace(/\//g, '\\/') : s);
  return [k.tap, ...k.hold].map(esc).join('/');
}

export const formatKeys = (keys: Key[]) => keys.map(formatKey).join(' ');

/**
 * The keys for a language: the player's own list when set, else the defaults (compact or more). With holding
 * off, every hold option becomes a key of its own.
 */
export function keysFor(lang: Lang, opts: { custom?: Partial<Record<Lang, string>>; hold?: boolean; more?: boolean } = {}): Key[] {
  const list = (opts.custom?.[lang]?.trim() || defaultKeys(lang, !!opts.more)).split(/\s+/).filter(Boolean);
  const keys = list.map(parseKey).flatMap((k) => (opts.hold === false && k.hold.length ? [k.tap, ...k.hold].map((t) => ({ tap: t, hold: [] })) : [k]));
  const seen = new Set<string>();
  return keys.filter((k) => !seen.has(formatKey(k)) && !!seen.add(formatKey(k))).slice(0, 40);
}

/** Keys per row: up to this many share a row's width; more wrap onto further rows. */
export const ROW_MAX = 11;
export const rowsFor = (n: number) => Math.max(1, Math.ceil(n / ROW_MAX));
