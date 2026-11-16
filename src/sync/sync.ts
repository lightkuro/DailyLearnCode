import { SITE } from '../site';
import { create } from 'zustand';
import { mergeLcLog, mergeStamps, type LcLog, type Stamps } from '../game/review';
import { createJSONStorage, persist } from 'zustand/middleware';
import { hashString } from '../game/dates';
import { mergeDetective, type DetectiveStats } from '../game/detective';
import { mergeTopicLog, type TopicTally } from '../game/topicStats';
import { LOCAL_ONLY_KEYS, mergeCode, mergeDays } from '../game/merge';
import { SYNCED_SETTINGS, safeStorage, useStore, type DayRecord, type Settings } from '../game/store';
import { clearUndo, mergeUndo, undoFiles, type UndoFiles } from '../game/undoHistory';
import { CODE_FILE, NeedsSignIn, PROGRESS_FILE, connect, disconnect, download, driveEnabled, finishRedirectSignIn, hasToken, listFiles, preloadGoogle, renewQuietly, tidyIntoFolder, signsInByRedirect, touchOnly, trash, upload, whoAmI } from './drive';

/** Minimum gap between two syncs (manual or automatic). */
export const COOLDOWN_MS = 10_000;
/** Auto-sync runs at most this often, and only when something changed. */
export const AUTO_EVERY_MS = 5 * 60_000;

export interface SyncPrefs {
  /** Sync every 5 minutes when something changed, and when leaving the page. */
  auto: boolean;
  /** Also sync the code written in the editor (separate file). */
  code: boolean;
  /** Also sync language, sound and theme. */
  settings: boolean;
  /**
   * When the hour-long Google sign-in has run out, renew it on the next click anywhere on the page
   * (Google's window flashes open and shut). Unset: on for mouse devices, off for touch-only ones,
   * where the "window" is a whole tab opening and closing.
   */
  renew?: boolean;
}

/** Renewing on click is on by default where a popup is a small window (not a full tab, as on phones). */
export function renewOn(prefs: SyncPrefs): boolean {
  // Same-tab sign-in would leave the page in the middle of whatever was clicked: phones reconnect from Sync only.
  if (signsInByRedirect()) return false;
  if (prefs.renew !== undefined) return prefs.renew;
  return typeof window === 'undefined' || !touchOnly();
}

let redirectResult: ReturnType<typeof finishRedirectSignIn> = null;
/**
 * Back from Google's same-tab sign-in (phones): keep the token and restore the address. Call before the app
 * renders. True when the page is on its way to Google again (nothing to render).
 */
export function takeRedirectSignIn(): boolean {
  redirectResult = finishRedirectSignIn();
  return redirectResult === 'retrying';
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'needs-auth';

interface SyncData {
  prefs: SyncPrefs;
  /** Connected on this device at least once (and not disconnected since). */
  linked: boolean;
  account?: { name?: string; email?: string };
  lastSync: number | null;
  /** Hashes of what was last uploaded (unchanged data isn't uploaded again). */
  lastHash: { progress?: number; code?: number };
  /** The one-time "that flash was Google renewing your sign-in" note has been shown on this device. */
  renewNoticed?: boolean;
}

interface SyncState extends SyncData {
  status: SyncStatus;
  message: string | null;
  /** No new sync starts before this time (the cooldown). */
  readyAt: number;
  /** This browser has changes the Drive doesn't (recomputed shortly after each change). */
  pending: boolean;
  /** Show the one-time note explaining the window that just flashed. */
  renewNotice: boolean;
  setPrefs(p: Partial<SyncPrefs>): void;
}

const OLD_KEY = 'learn:drive-saved-at';

function legacyLastSave(): number | null {
  try {
    const v = Number(localStorage.getItem(OLD_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export const useSync = create<SyncState>()(
  persist(
    (set) => {
      const old = typeof window !== 'undefined' ? legacyLastSave() : null;
      return {
        prefs: { auto: true, code: true, settings: true },
        linked: !!old,
        lastSync: old,
        lastHash: {},
        status: 'idle',
        message: null,
        readyAt: 0,
        pending: false,
        renewNotice: false,
        setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p }, lastHash: p.code === undefined ? s.lastHash : { ...s.lastHash, code: undefined } })),
      };
    },
    {
      name: 'learn:sync',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ prefs: s.prefs, linked: s.linked, account: s.account, lastSync: s.lastSync, lastHash: s.lastHash, renewNoticed: s.renewNoticed }) as unknown as SyncState,
    },
  ),
);

// ---------- what goes into the files ----------

interface ProgressFile {
  version: 1;
  kind: 'learn-progress';
  days: Record<string, DayRecord>;
  detective?: DetectiveStats;
  topicLog?: Record<string, TopicTally>;
  missLog?: Stamps;
  lcLog?: LcLog;
  learnRead?: Stamps;
  reviewDone?: Stamps;
  settings?: Partial<Settings>;
  savedAt?: string;
}
interface CodeFile {
  version: 1;
  kind: 'learn-code';
  code: Record<string, Pick<DayRecord, 'code' | 'codeAt'>>;
  /** Undo history of the most recently edited files (game/undoHistory). */
  undo?: UndoFiles;
  savedAt?: string;
}

function pack(body: object): { json: string; hash: number } {
  const core = JSON.stringify(body);
  return { json: JSON.stringify({ ...body, savedAt: new Date().toISOString() }), hash: hashString(core) };
}

/** Progress without code (code has its own, optional file). */
export function progressPayload(withSettings: boolean): { json: string; hash: number } {
  const { days, settings, detective, topicLog, missLog, lcLog, learnRead, reviewDone } = useStore.getState();
  const out: Record<string, DayRecord> = {};
  for (const [key, rec] of Object.entries(days)) {
    if (LOCAL_ONLY_KEYS.has(key)) continue;
    const { codeAt: _codeAt, ...rest } = rec;
    void _codeAt;
    out[key] = { ...rest, code: {} };
  }
  const body: ProgressFile = { version: 1, kind: 'learn-progress', days: out, detective: detective && { ...detective, round: undefined }, topicLog, missLog, lcLog, learnRead, reviewDone };
  if (withSettings) body.settings = Object.fromEntries([...SYNCED_SETTINGS, 'settingsAt'].map((k) => [k, settings[k as keyof Settings]]));
  return pack(body);
}

export function codePayload(): { json: string; hash: number } {
  const { days } = useStore.getState();
  const code: CodeFile['code'] = {};
  for (const [key, rec] of Object.entries(days)) {
    if (LOCAL_ONLY_KEYS.has(key) || !rec.code || !Object.keys(rec.code).length) continue;
    code[key] = { code: rec.code, codeAt: rec.codeAt };
  }
  const undo = undoFiles();
  return pack({ version: 1, kind: 'learn-code', code, ...(Object.keys(undo).length ? { undo } : {}) } satisfies CodeFile);
}

function parse(json: string): Record<string, unknown> {
  const j = JSON.parse(json);
  const body = j?.state ?? j; // tolerate a raw zustand snapshot
  if (!body || typeof body !== 'object' || body.version !== 1) throw new Error(`That Drive file is not a ${SITE.name} sync file`);
  return body;
}

/** Merge a downloaded progress file into this browser (never loses progress on either side). */
export function applyProgress(json: string, withSettings: boolean): void {
  const body = parse(json) as Partial<ProgressFile>;
  useStore.setState((s) => {
    const next: Partial<typeof s> = {};
    if (body.days && typeof body.days === 'object') next.days = mergeDays(s.days, body.days);
    if (body.detective) next.detective = mergeDetective(s.detective, body.detective);
    if (body.topicLog && typeof body.topicLog === 'object') next.topicLog = mergeTopicLog(s.topicLog, body.topicLog);
    if (body.missLog) next.missLog = mergeStamps(s.missLog, body.missLog);
    if (body.lcLog) next.lcLog = mergeLcLog(s.lcLog, body.lcLog);
    if (body.learnRead) next.learnRead = mergeStamps(s.learnRead, body.learnRead);
    if (body.reviewDone) next.reviewDone = mergeStamps(s.reviewDone, body.reviewDone);
    const rs = body.settings;
    if (withSettings && rs && (rs.settingsAt ?? 0) > (s.settings.settingsAt ?? 0)) {
      const picked = Object.fromEntries(SYNCED_SETTINGS.filter((k) => rs[k] !== undefined).map((k) => [k, rs[k]]));
      next.settings = { ...s.settings, ...picked, settingsAt: rs.settingsAt };
    }
    return next;
  });
}

/** Merge a downloaded code file: for each file the newest edit wins. */
export function applyCode(json: string): void {
  const body = parse(json) as Partial<CodeFile>;
  if (body.undo) mergeUndo(body.undo);
  if (!body.code) return;
  useStore.setState((s) => {
    const days = { ...s.days };
    for (const [key, remote] of Object.entries(body.code!)) {
      const local = days[key];
      if (!local || LOCAL_ONLY_KEYS.has(key)) continue;
      const { code, codeAt } = mergeCode(local, remote);
      days[key] = { ...local, code, codeAt };
    }
    return { days };
  });
}

// ---------- syncing ----------

/** True when this browser has changes the Drive doesn't have yet (as far as this device knows). */
export function hasChanges(): boolean {
  const { prefs, lastHash } = useSync.getState();
  if (progressPayload(prefs.settings).hash !== lastHash.progress) return true;
  return prefs.code && codePayload().hash !== lastHash.code;
}

/**
 * Sync with Google Drive: download what's there, merge it in, upload the result. `interactive`
 * (a click) may open Google's sign-in window; automatic syncs only run while a token is held.
 */
export async function syncNow({ interactive }: { interactive: boolean }): Promise<boolean> {
  const st = useSync.getState();
  if (!driveEnabled() || st.status === 'syncing') return false;
  const wait = st.readyAt - Date.now();
  if (wait > 0) {
    useSync.setState({ message: `Just synced. Try again in ${Math.ceil(wait / 1000)} s.` });
    return false;
  }
  if (!interactive && !hasToken()) {
    useSync.setState({ status: 'needs-auth', message: 'Google sign-in expired. Click Sync to reconnect.' });
    return false;
  }
  useSync.setState({ status: 'syncing', message: null });
  try {
    if (interactive) await connect(useSync.getState().account?.email);
    const { prefs } = useSync.getState();
    const files = await listFiles();
    // Files saved before the site used a folder: move them into it (never blocks the sync).
    await tidyIntoFolder(files).catch(() => {});
    const prog = files.find((f) => f.name === PROGRESS_FILE);
    const codeFile = files.find((f) => f.name === CODE_FILE);
    if (prog) applyProgress(await download(prog.id), prefs.settings);
    if (prefs.code && codeFile) applyCode(await download(codeFile.id));

    const lastHash = { ...useSync.getState().lastHash };
    const p = progressPayload(prefs.settings);
    if (!prog || p.hash !== lastHash.progress) await upload(PROGRESS_FILE, p.json, prog?.id);
    lastHash.progress = p.hash;
    if (prefs.code) {
      const c = codePayload();
      if (!codeFile || c.hash !== lastHash.code) await upload(CODE_FILE, c.json, codeFile?.id);
      lastHash.code = c.hash;
    }
    let account = useSync.getState().account;
    if (!account?.email) account = await whoAmI().catch(() => account);
    useSync.setState({ status: 'idle', message: null, lastSync: Date.now(), lastHash, linked: true, account });
    syncedThisTab = true;
    return true;
  } catch (e) {
    if (e instanceof NeedsSignIn) useSync.setState({ status: 'needs-auth', message: e.message });
    else useSync.setState({ status: 'error', message: String((e as Error)?.message ?? e) });
    return false;
  } finally {
    useSync.setState({ readyAt: Date.now() + COOLDOWN_MS });
  }
}

/** Forget Google on this device (the Drive files stay where they are). */
export function unlink(): void {
  disconnect();
  clearUndo();
  useSync.setState({ linked: false, account: undefined, status: 'idle', message: 'Disconnected. Your Drive files are untouched.', lastHash: {} });
}

/** Move one of the site's files to the Drive trash. */
export async function trashFile(id: string, name: string): Promise<void> {
  await trash(id);
  useSync.setState((s) => ({ lastHash: name === CODE_FILE ? { ...s.lastHash, code: undefined } : { ...s.lastHash, progress: undefined } }));
}

// ---------- renewing the sign-in on the next click ----------

/** Synced at least once since this tab opened (later renewals then wait until there's something to upload). */
let syncedThisTab = false;
/** After a quiet renewal fails (signed out of Google, another account…), don't try again for a while. */
let renewPausedUntil = 0;

function wantsRenew(): boolean {
  const s = useSync.getState();
  if (!driveEnabled() || !s.linked || !s.prefs.auto || !renewOn(s.prefs) || hasToken() || s.status === 'syncing') return false;
  if (Date.now() < renewPausedUntil) return false;
  // On a fresh visit: renew to pull what other devices saved. Later: only when there are changes to save.
  return !syncedThisTab || s.pending;
}

/**
 * A click anywhere (capture phase, before the page handles it) renews an expired sign-in. Popups are only
 * allowed during a click, so Google's window has to open now, synchronously; the click itself carries on.
 */
function renewOnClick(e: MouseEvent): void {
  if (!e.isTrusted || !wantsRenew()) return;
  // The sync buttons sign in by themselves (and may show Google's account picker).
  if ((e.target as Element | null)?.closest?.('[data-sync]')) return;
  const p = renewQuietly(useSync.getState().account?.email);
  if (!p) return preloadGoogle(); // not loaded yet: the next click will do it
  p.then(
    () => {
      if (!useSync.getState().renewNoticed) useSync.setState({ renewNotice: true, renewNoticed: true });
      void syncNow({ interactive: false });
    },
    () => {
      renewPausedUntil = Date.now() + 15 * 60_000;
      useSync.setState({ status: 'needs-auth', message: 'Google sign-in expired. Click Sync to reconnect.' });
    },
  );
}

let started = false;
/** Auto-sync: every 5 minutes when something changed, and when the page is hidden (tab switch, close). */
export function startAutoSync(): void {
  if (started || !driveEnabled()) return;
  started = true;
  // Finish what the Sync click started before the page went to Google.
  if (redirectResult === 'signed-in') void syncNow({ interactive: false });
  else if (redirectResult === 'cancelled') useSync.setState({ status: 'needs-auth', message: 'Google sign-in was cancelled. Tap Sync to try again.' });
  redirectResult = null;
  const tick = (leaving: boolean) => {
    const s = useSync.getState();
    if (!s.linked || !s.prefs.auto || s.status === 'syncing') return;
    if (!leaving && Date.now() - (s.lastSync ?? 0) < AUTO_EVERY_MS) return;
    if (Date.now() < s.readyAt || !hasChanges()) return;
    void syncNow({ interactive: false });
  };
  setInterval(() => tick(false), 30_000);
  // Keep the "unsynced changes" dot current without re-serialising on every keystroke.
  let t: ReturnType<typeof setTimeout> | undefined;
  const recheck = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const s = useSync.getState();
      const pending = s.linked && hasChanges();
      if (pending !== s.pending) useSync.setState({ pending });
    }, 1500);
  };
  useStore.subscribe(recheck);
  useSync.subscribe((s, prev) => {
    if (s.lastHash !== prev.lastHash || s.linked !== prev.linked || s.prefs !== prev.prefs) recheck();
    // Undo history is only kept for syncing code; forget it when that stops.
    if (prev.prefs.code && !s.prefs.code) clearUndo();
  });
  recheck();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') tick(true);
  });
  // Have Google's script ready so the first click can renew the sign-in.
  const s = useSync.getState();
  if (s.linked && s.prefs.auto && renewOn(s.prefs)) preloadGoogle();
  document.addEventListener('click', renewOnClick, true);
}
