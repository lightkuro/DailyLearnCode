/**
 * Undo history for the most recently edited code files, kept only while Drive sync (with code) is on, so it can
 * travel to other devices in the code file. A saved history belongs to one exact document: it's used only when
 * the editor opens with that same code (if the code changed elsewhere, the old history would undo the wrong text).
 */

/** How many files keep their history. */
export const UNDO_FILES = 5;
/** Largest history kept per file (JSON characters); bigger ones are skipped rather than truncated. */
const MAX_CHARS = 120_000;
const KEY = 'learn:undo';

export interface UndoEntry {
  /** The code the history belongs to. */
  doc: string;
  /** CodeMirror's history field as JSON (state.toJSON({ history: historyField }).history). */
  hist: unknown;
  /** When it was saved (newest wins when merging devices). */
  at: number;
}
export type UndoFiles = Record<string, UndoEntry>;

/** One code file: a day, a stage and a language. */
export const undoKey = (day: string, stage: number, lang: string) => `${day}|${stage}|${lang}`;

function read(): UndoFiles {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as UndoFiles;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function write(files: UndoFiles): void {
  try {
    if (Object.keys(files).length) localStorage.setItem(KEY, JSON.stringify(files));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or blocked: undo still works for this visit */
  }
}

/** Keep the newest UNDO_FILES entries that look valid. */
function trim(files: UndoFiles): UndoFiles {
  const ok = Object.entries(files).filter(([, e]) => e && typeof e.doc === 'string' && typeof e.at === 'number' && e.hist != null);
  ok.sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(ok.slice(0, UNDO_FILES));
}

export function saveUndo(key: string, doc: string, hist: unknown): void {
  if (JSON.stringify(hist).length > MAX_CHARS) return;
  write(trim({ ...read(), [key]: { doc, hist, at: Date.now() } }));
}

/** The saved history for this file, if it was saved for exactly this code. */
export function loadUndo(key: string, doc: string): unknown | undefined {
  const e = read()[key];
  return e && e.doc === doc ? e.hist : undefined;
}

/** For the Drive code file. */
export function undoFiles(): UndoFiles {
  return read();
}

/** Merge histories from another device: newest per file, then the newest UNDO_FILES overall. */
export function mergeUndo(remote: unknown): void {
  if (!remote || typeof remote !== 'object') return;
  const local = read();
  const out: UndoFiles = { ...local };
  for (const [k, e] of Object.entries(remote as UndoFiles)) {
    if (!e || typeof e.at !== 'number') continue;
    if (!out[k] || e.at > out[k].at) out[k] = e;
  }
  write(trim(out));
}

/** Forget every saved history (Drive disconnected, or code sync switched off). */
export function clearUndo(): void {
  write({});
}
