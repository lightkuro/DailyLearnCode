import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Avatar, SyncIcon, ago } from '../components/SyncButton';
import { FontSettings } from '../components/FontSettings';
import { KeyBarSettings } from '../components/KeyBarSettings';
import { Button, Card, ConfirmDialog, Spinner, Toggle } from '../components/ui';
import { useStore, type ThemePref } from '../game/store';
import { CODE_FILE, FOLDER_NAME, PROGRESS_FILE, download, driveEnabled, folderLink, hasToken, listFiles, signsInByRedirect, type DriveFile } from '../sync/drive';
import { SITE } from '../site';
import { renewOn, syncNow, trashFile, unlink, useSync, type SyncPrefs } from '../sync/sync';

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_strong]:text-ink">{children}</div>
    </Card>
  );
}

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'light', label: '☀️ Light' },
  { id: 'dark', label: '🌙 Dark' },
  { id: 'system', label: '🖥️ Match system' },
];

function kb(size?: string): string {
  const n = Number(size);
  if (!Number.isFinite(n)) return '';
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
}

/** Google Drive sync, the files it keeps, and per-device options. There are no site accounts. */
export function AccountPage() {
  const theme = useStore((s) => s.settings.theme ?? 'light');
  const setTheme = useStore((s) => s.setTheme);
  const sound = useStore((s) => s.settings.sound);
  const setSound = useStore((s) => s.setSound);
  const scrollCode = useStore((s) => !!s.settings.scrollCode);
  const setScrollCode = useStore((s) => s.setScrollCode);
  const sync = useSync();
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [filesMsg, setFilesMsg] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState<DriveFile | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const enabled = driveEnabled();
  const busy = sync.status === 'syncing';

  const refreshFiles = async () => {
    if (!hasToken()) {
      setFiles(null);
      setFilesMsg('Sync once (or reconnect) to list your files here.');
      return;
    }
    setLoadingFiles(true);
    setFilesMsg(null);
    try {
      setFiles(await listFiles());
    } catch (e) {
      setFilesMsg(String((e as Error)?.message ?? e));
    } finally {
      setLoadingFiles(false);
    }
  };

  // List the files after each sync (and on first visit when a token is already held).
  useEffect(() => {
    if (enabled && sync.linked) void refreshFiles();
  }, [enabled, sync.linked, sync.lastSync]);

  const setPref = (p: Partial<SyncPrefs>) => sync.setPrefs(p);

  const saveCopy = async (f: DriveFile) => {
    try {
      const text = await download(f.id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setFilesMsg(String((e as Error)?.message ?? e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Account</h1>
        <p className="mt-1 text-muted">There are no accounts on this site. Your progress lives in your browser, and you can keep a copy in your own Google Drive.</p>
      </div>

      <Section
        title="Google Drive sync"
        aside={
          sync.linked ? (
            <span className="flex items-center gap-2 text-xs text-muted">
              <Avatar email={sync.account?.email} className="size-7" />
              {sync.account?.email ?? 'Connected'}
            </span>
          ) : (
            <span className="text-xs text-faint">Optional</span>
          )
        }
      >
        {!enabled ? (
          <p>Google Drive sync isn&apos;t configured on this build. Use Export / Import backup on the About page instead.</p>
        ) : (
          <>
            <p>
              Syncing saves your data as ordinary files in <strong>your own Google Drive</strong>, in a folder named <code>{FOLDER_NAME}</code>. You own those files: your browser
              reads and writes them directly with Google, and nothing is sent to or stored by this site. The site can only see files it created (Google&apos;s{' '}
              <code>drive.file</code> access), never the rest of your Drive.
            </p>
            <div data-sync className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => void syncNow({ interactive: true })} disabled={busy}>
                {busy ? <Spinner /> : <SyncIcon />} {sync.linked ? 'Sync now' : 'Connect Google Drive'}
              </Button>
              {sync.linked && (
                <Button variant="ghost" onClick={() => setConfirmUnlink(true)}>
                  Disconnect
                </Button>
              )}
              <span className={`text-xs ${sync.status === 'error' || sync.status === 'needs-auth' ? 'text-warn' : 'text-muted'}`} role="status">
                {sync.message ?? (sync.lastSync ? `Last synced ${ago(sync.lastSync)}` : '')}
              </span>
            </div>

            <div className="grid gap-2 pt-1">
              <Toggle on label="Progress" sub={`Scores, answers, hints, streak and Detective stats → ${PROGRESS_FILE}. Always included.`} onChange={() => {}} disabled />
              <Toggle
                on={sync.prefs.code}
                onChange={(v) => setPref({ code: v })}
                label="Code you write"
                sub={`Finished and unfinished code for every problem, plus undo history for your 5 most recent files, in a separate file: ${CODE_FILE}. Turn off to keep your Drive copy small.`}
              />
              <Toggle
                on={sync.prefs.settings}
                onChange={(v) => setPref({ settings: v })}
                label="Settings"
                sub="Language, theme, sound, comments and code font follow you between devices."
              />
              <Toggle
                on={sync.prefs.auto}
                onChange={(v) => setPref({ auto: v })}
                label="Auto-sync"
                sub="Every 5 minutes, only when something changed, and when you leave the page. Syncs are at least 10 seconds apart."
              />
              <Toggle
                on={sync.prefs.auto && renewOn(sync.prefs)}
                onChange={(v) => setPref({ renew: v })}
                disabled={!sync.prefs.auto || signsInByRedirect()}
                label="Stay signed in"
                sub={
                  signsInByRedirect()
                    ? 'On phones, reconnect with the Sync button: sign-in happens in this tab, so it never runs by itself.'
                    : 'Google’s sign-in lasts about an hour. When it runs out, your next click anywhere renews it, so auto-sync keeps going.'
                }
              />
            </div>
            {sync.prefs.auto && renewOn(sync.prefs) && (
              <p className="flex gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-xs text-muted">
                <Info className="mt-px size-3.5 shrink-0 text-accent-soft" aria-hidden="true" />
                <span>
                  <strong className="text-ink">A Google window may flash open and close by itself.</strong> That&apos;s the renewal: Google checks you&apos;re still signed in and
                  hands back a fresh key, with nothing to click. On a phone it can show as a tab that opens and closes. If Google needs you to choose an account or sign in again,
                  nothing pops up; the sync button turns orange and you click it to reconnect.
                </span>
              </p>
            )}
            <p className="text-xs text-faint">
              {sync.prefs.auto && renewOn(sync.prefs)
                ? 'Each sync merges first, so syncing from several devices never loses progress; for code, the newest edit of each file wins.'
                : 'Google’s sign-in lasts about an hour. After that, auto-sync pauses until you click Sync again (the sync button turns orange). Each sync merges first, so syncing from several devices never loses progress; for code, the newest edit of each file wins.'}
            </p>
          </>
        )}
      </Section>

      {enabled && sync.linked && (
        <Section
          title="Files in your Drive"
          aside={
            <button type="button" onClick={() => void refreshFiles()} className="text-xs font-semibold text-accent-soft hover:underline" disabled={loadingFiles}>
              {loadingFiles ? 'Loading…' : 'Refresh'}
            </button>
          }
        >
          {files && files.length === 0 && <p>No files yet. Sync to create them.</p>}
          {files && files.length > 0 && (
            <p>
              In the <code>{FOLDER_NAME}</code> folder
              {folderLink() && (
                <>
                  {' '}
                  (
                  <a href={folderLink()!} target="_blank" rel="noopener noreferrer" className="text-accent-soft underline underline-offset-2">
                    open in Google Drive
                  </a>
                  )
                </>
              )}
              . Moving or renaming the folder is fine.
            </p>
          )}
          {files && files.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-ink">{f.name}</p>
                    <p className="text-xs text-faint">
                      {kb(f.size)}
                      {f.modifiedTime && ` · saved ${ago(Date.parse(f.modifiedTime))}`}
                    </p>
                  </div>
                  {f.webViewLink && (
                    <a href={f.webViewLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent-soft hover:underline">
                      Open in Drive ↗
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void saveCopy(f)}>
                    Download
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmTrash(f)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {filesMsg && <p className="text-xs text-warn">{filesMsg}</p>}
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs leading-relaxed">
            You don&apos;t need these buttons: they&apos;re a convenience and aren&apos;t guaranteed to work. The files are in your Google Drive (search for &ldquo;learn-&rdquo; at{' '}
            <a href="https://drive.google.com/drive/search?q=learn-" target="_blank" rel="noopener noreferrer" className="text-accent-soft underline">
              drive.google.com
            </a>
            ), where you can open, download or delete them yourself, and you can remove this site&apos;s access at{' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-accent-soft underline">
              myaccount.google.com/permissions
            </a>
            .
          </p>
        </Section>
      )}

      <Section title="Appearance">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${theme === t.id ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">The sun/moon button at the top (on phones: the gear menu) switches between light and dark; Match system follows your device.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={sound} onChange={setSound} label="Sound effects" sub="Clicks, chimes and the finish fanfare. Also in the gear menu." />
          <Toggle
            on={!scrollCode}
            onChange={(wrap) => setScrollCode(!wrap)}
            label="Wrap long code lines on phones"
            sub="Wrapped parts hang under their line. Off: scroll sideways. This device only."
          />
        </div>
      </Section>

      <Section title="Code font">
        <FontSettings />
      </Section>

      <Section title="Shortcut keys">
        <KeyBarSettings />
      </Section>

      <Section title="Backups and reset">
        <p>
          Export a backup file, import one, or reset everything on the{' '}
          <Link to="/about" className="text-accent-soft underline underline-offset-2">
            About page
          </Link>
          .
          {SITE.privacyUrl && (
            <>
              {' '}
              The{' '}
              <a href={SITE.privacyUrl} className="text-accent-soft underline underline-offset-2">
                privacy policy
              </a>{' '}
              explains what is stored where.
            </>
          )}
        </p>
      </Section>

      <ConfirmDialog
        open={!!confirmTrash}
        title={`Delete ${confirmTrash?.name ?? 'file'}?`}
        body={
          <>
            Moves the file to your Google Drive trash (you can restore it from there for 30 days). Progress in this browser stays.
            {confirmTrash?.name === PROGRESS_FILE && sync.prefs.auto && ' Auto-sync will create a fresh copy next time something changes, unless you disconnect.'}
          </>
        }
        confirmLabel="Move to trash"
        variant="danger"
        onConfirm={async () => {
          const f = confirmTrash!;
          setConfirmTrash(null);
          try {
            await trashFile(f.id, f.name);
            setFilesMsg(`${f.name} moved to your Drive trash.`);
            void refreshFiles();
          } catch (e) {
            setFilesMsg(String((e as Error)?.message ?? e));
          }
        }}
        onCancel={() => setConfirmTrash(null)}
      />
      <ConfirmDialog
        open={confirmUnlink}
        title="Disconnect Google Drive?"
        body="This browser stops syncing and forgets the sign-in. Your files stay in your Drive and your progress stays here."
        confirmLabel="Disconnect"
        onConfirm={() => {
          unlink();
          setFiles(null);
          setConfirmUnlink(false);
        }}
        onCancel={() => setConfirmUnlink(false)}
      />
    </div>
  );
}
