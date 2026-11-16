/**
 * Optional Google Drive sync. The files live in the player's own Google Drive; there is no server:
 * the browser gets a short-lived OAuth access token from Google Identity Services and talks to the
 * Drive REST API directly.
 *
 * Scope: drive.file, so the site can only see files it created itself, nothing else in the Drive.
 * Enabled only when the build has VITE_GOOGLE_CLIENT_ID (a public OAuth client ID, not a secret),
 * set as a build variable in Cloudflare (or .env.local for local dev).
 */
import { SITE } from '../site';

export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;
export const driveEnabled = (): boolean => !!GOOGLE_CLIENT_ID;

/*
 * Phones: Google's popup is a whole new tab. With many tabs open the browser may unload this one meanwhile, and
 * when Google's tab closes itself there is nothing to return to. With VITE_GOOGLE_REDIRECT=1 touch-only devices
 * sign in in the same tab instead: the page goes to Google and comes back to /oauth with the token. That address
 * must be listed under "Authorized redirect URIs" of the OAuth client in Google Cloud, for every site domain.
 */
const REDIRECT_BUILD = import.meta.env.VITE_GOOGLE_REDIRECT === '1';
export const REDIRECT_PATH = '/oauth';
const REDIRECT_KEY = 'learn:oauth';
/** Touch-only device (no mouse): popups there are full tabs. */
export const touchOnly = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
/** Sign-in leaves the page and comes back (instead of a popup). */
export const signsInByRedirect = (): boolean => REDIRECT_BUILD && touchOnly();

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
/** Progress, scores, streak, Detective stats and (optionally) settings. */
export const PROGRESS_FILE = `${SITE.name}-progress.json`;
/** Optional: the code written in the editor, kept apart so syncing it is a choice. */
export const CODE_FILE = `${SITE.name}-code.json`;
export const FILE_NAMES = [PROGRESS_FILE, CODE_FILE] as const;
export type SyncFileName = (typeof FILE_NAMES)[number];

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
/** The token lives in this tab's session storage (gone when the tab closes; it expires within an hour anyway). */
const TOKEN_KEY = 'learn:gtoken';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(opts?: { prompt?: string; login_hint?: string }): void;
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}
declare global {
  interface Window {
    google?: Gis;
  }
}

let gisPromise: Promise<Gis> | null = null;
function loadGis(): Promise<Gis> {
  gisPromise ??= new Promise<Gis>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google) : reject(new Error('Google sign-in did not load')));
    s.onerror = () => reject(new Error('Could not reach Google sign-in (blocked or offline?)'));
    document.head.appendChild(s);
  }).catch((e) => {
    gisPromise = null;
    throw e;
  });
  return gisPromise;
}

type Token = { value: string; expires: number };

function readToken(): Token | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') as Token | null;
    return t && typeof t.value === 'string' && typeof t.expires === 'number' ? t : null;
  } catch {
    return null;
  }
}
function writeToken(t: Token | null): void {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* memory only, then */
  }
}

let token: Token | null = typeof window !== 'undefined' ? readToken() : null;

/** True while a usable token is held (auto-sync needs one: it can't open Google's window by itself). */
export function hasToken(): boolean {
  return !!token && Date.now() < token.expires - 60_000;
}

// One token client for the page. Made ahead of time (preloadGoogle) so a request can open Google's
// window synchronously inside a click: browsers block popups that open later than the click.
let client: TokenClient | null = null;
let waiting: { resolve(t: string): void; reject(e: Error): void } | null = null;
let inflight: Promise<string> | null = null;

function clientFor(gis: Gis): TokenClient {
  client ??= gis.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID!,
    scope: SCOPE,
    callback: (r) => {
      if (!r.access_token) return waiting?.reject(new Error(r.error_description || r.error || 'Google sign-in was cancelled'));
      token = { value: r.access_token, expires: Date.now() + (r.expires_in ?? 3600) * 1000 };
      writeToken(token);
      waiting?.resolve(r.access_token);
    },
    error_callback: (e) => waiting?.reject(new Error(e.type === 'popup_closed' ? 'Sign-in window closed' : `Google sign-in failed (${e.type})`)),
  });
  return client;
}

function request(c: TokenClient, prompt: '' | 'none', hint?: string): Promise<string> {
  const p = new Promise<string>((resolve, reject) => {
    waiting = { resolve, reject };
    c.requestAccessToken(hint ? { prompt, login_hint: hint } : { prompt });
  });
  inflight = p;
  const done = () => {
    if (inflight === p) inflight = null;
  };
  p.then(done, done);
  return p;
}

/** Fetch Google's sign-in script and set up the token client before it's needed. */
export function preloadGoogle(): void {
  if (driveEnabled() && !client) void loadGis().then(clientFor, () => {});
}

/**
 * Same-tab sign-in: go to Google, which sends the browser back to /oauth with the token in the address (see
 * finishRedirectSignIn). First quietly (prompt=none: no screen when still signed in to Google and the site is
 * allowed); only if Google needs an answer does it go again with the account picker. Never resolves: the page leaves.
 */
function redirectToGoogle(prompt: 'none' | 'select_account', hint?: string, back = location.pathname + location.search + location.hash): Promise<never> {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    localStorage.setItem(REDIRECT_KEY, JSON.stringify({ state, back, prompt, hint, at: Date.now() }));
  } catch {
    /* without storage the answer can't be checked; finishRedirectSignIn will refuse it */
  }
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: location.origin + REDIRECT_PATH,
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
    prompt,
  });
  if (hint) q.set('login_hint', hint);
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  return new Promise<never>(() => {});
}

/** Answers that mean "ask the person": try again with the account picker. */
const NEEDS_SCREEN = new Set(['interaction_required', 'login_required', 'consent_required', 'account_selection_required']);

/**
 * Back from Google (same-tab sign-in): keep the token, put the original address back, and say how it went.
 * Call once, before the app renders. 'retrying' means the page is going to Google again.
 */
export function finishRedirectSignIn(): 'signed-in' | 'cancelled' | 'retrying' | null {
  if (typeof window === 'undefined' || location.pathname !== REDIRECT_PATH) return null;
  const answer = new URLSearchParams(location.hash.slice(1));
  let saved: { state: string; back: string; prompt: string; hint?: string; at: number } | null;
  try {
    saved = JSON.parse(localStorage.getItem(REDIRECT_KEY) ?? 'null');
    localStorage.removeItem(REDIRECT_KEY);
  } catch {
    saved = null;
  }
  const ours = !!saved && saved.state === answer.get('state') && Date.now() - saved.at < 15 * 60_000;
  const error = answer.get('error');
  if (ours && error && NEEDS_SCREEN.has(error) && saved!.prompt === 'none') {
    void redirectToGoogle('select_account', saved!.hint, saved!.back);
    return 'retrying';
  }
  history.replaceState(null, '', ours ? saved!.back : '/');
  const value = answer.get('access_token');
  if (!ours || !value) return ours ? 'cancelled' : null;
  token = { value, expires: Date.now() + Number(answer.get('expires_in') ?? 3600) * 1000 };
  writeToken(token);
  return 'signed-in';
}

/**
 * An access token, asking Google (popup, or same-tab on phones) when there is none or it expired. Only call
 * from a click. First time Google shows the consent screen; afterwards it returns quickly (maybe after an
 * account pick).
 */
export async function connect(hint?: string): Promise<string> {
  if (token && hasToken()) return token.value;
  if (signsInByRedirect()) return redirectToGoogle('none', hint);
  if (inflight) return inflight;
  if (client) return request(client, '', hint);
  return request(clientFor(await loadGis()), '', hint);
}

/**
 * Renew the token without asking anything: Google's window opens and closes by itself when you're still
 * signed in to Google and have allowed the site before; otherwise it fails instead of showing a screen.
 * Call it synchronously inside a click. Null when Google's script isn't loaded yet.
 */
export function renewQuietly(hint?: string): Promise<string> | null {
  if (token && hasToken()) return Promise.resolve(token.value);
  if (inflight) return inflight;
  return client ? request(client, 'none', hint) : null;
}

/** Forget the token and tell Google to revoke it. */
export function disconnect(): void {
  if (token) window.google?.accounts.oauth2.revoke(token.value);
  token = null;
  folderId = null;
  writeToken(null);
}

export class NeedsSignIn extends Error {
  constructor() {
    super('Google sign-in expired. Click sync to reconnect.');
  }
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  if (!token || !hasToken()) throw new NeedsSignIn();
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token.value}` } });
  if (res.status === 401) {
    token = null;
    writeToken(null);
    throw new NeedsSignIn();
  }
  if (!res.ok) throw new Error(`Google Drive: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  /** Folders the file is in (the site's folder, or the top of the Drive for files saved before it existed). */
  parents?: string[];
}

/** The files this site created in the Drive (drive.file only ever lists those), newest first. */
export async function listFiles(): Promise<DriveFile[]> {
  const names = FILE_NAMES.map((n) => `name = '${n}'`).join(' or ');
  const q = encodeURIComponent(`(${names}) and trashed = false`);
  const res = await api(`${API}/files?q=${q}&spaces=drive&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,size,modifiedTime,webViewLink,parents)`);
  return ((await res.json()) as { files?: DriveFile[] }).files ?? [];
}

// ---------- the site's folder ----------

/** The folder the files live in, so they aren't loose in the top of the Drive. */
export const FOLDER_NAME = SITE.host ?? SITE.name;
const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** Marks the folder as the site's, so it's found again even after being renamed or moved. */
const FOLDER_MARK = { key: 'learn', value: 'folder' };
let folderId: string | null = null;

/**
 * The site's folder, found by its mark or created (drive.file lets the site see only what it created, so this never
 * looks at anything else in the Drive). `fresh` skips the cached id, e.g. before creating a file in it.
 */
export async function siteFolder(fresh = false): Promise<string> {
  if (folderId && !fresh) return folderId;
  const q = encodeURIComponent(`mimeType = '${FOLDER_MIME}' and appProperties has { key='${FOLDER_MARK.key}' and value='${FOLDER_MARK.value}' } and trashed = false`);
  const res = await api(`${API}/files?q=${q}&spaces=drive&orderBy=createdTime&pageSize=1&fields=files(id)`);
  const found = ((await res.json()) as { files?: { id: string }[] }).files?.[0]?.id;
  if (found) return (folderId = found);
  const made = await api(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: FOLDER_MIME,
      appProperties: { [FOLDER_MARK.key]: FOLDER_MARK.value },
      description: `Files ${SITE.name} saved for you: your progress and, if you chose, your code. Safe to delete.`,
    }),
  });
  return (folderId = ((await made.json()) as { id: string }).id);
}

/** Link to the folder in Google Drive (once it's known this visit). */
export const folderLink = (): string | null => (folderId ? `https://drive.google.com/drive/folders/${folderId}` : null);

/** Move files saved before the folder existed (loose in the Drive) into it. Best effort: a failure changes nothing. */
export async function tidyIntoFolder(files: DriveFile[]): Promise<void> {
  if (!files.length) return;
  const id = await siteFolder();
  for (const f of files) {
    if (!f.parents || f.parents.includes(id)) continue;
    await api(`${API}/files/${f.id}?addParents=${id}&removeParents=${f.parents.join(',')}&fields=id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    f.parents = [id];
  }
}

/** Which Google account the Drive belongs to (shown in this browser only). */
export async function whoAmI(): Promise<{ name?: string; email?: string }> {
  const res = await api(`${API}/about?fields=user(displayName,emailAddress)`);
  const j = (await res.json()) as { user?: { displayName?: string; emailAddress?: string } };
  return { name: j.user?.displayName, email: j.user?.emailAddress };
}

export async function download(id: string): Promise<string> {
  return (await api(`${API}/files/${id}?alt=media`)).text();
}

/** multipart/related body for creating a file with metadata + content in one request. */
export function multipartBody(metadata: object, content: string, boundary: string): string {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

const DESCRIPTIONS: Record<SyncFileName, string> = {
  [PROGRESS_FILE]: `Progress from ${SITE.name}, saved by you to your own Drive. Safe to delete.`,
  [CODE_FILE]: `Code you wrote on ${SITE.name}, saved by you to your own Drive. Safe to delete.`,
};

/** Overwrite file `id`, or create `name` when there is none yet. */
export async function upload(name: SyncFileName, json: string, id?: string): Promise<void> {
  if (id) {
    await api(`${UPLOAD}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: json });
    return;
  }
  const boundary = `learn${Math.random().toString(36).slice(2)}`;
  await api(`${UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    // Inside the site's folder (looked up afresh: it may have been deleted since it was last used).
    body: multipartBody({ name, mimeType: 'application/json', description: DESCRIPTIONS[name], parents: [await siteFolder(true)] }, json, boundary),
  });
}

/** Move a file to the Drive's trash (restorable from Google Drive for 30 days). */
export async function trash(id: string): Promise<void> {
  await api(`${API}/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
}
