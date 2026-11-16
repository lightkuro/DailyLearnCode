import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { hashString, localToday } from '../game/dates';
import { useStore } from '../game/store';
import { computeStreak } from '../game/streak';
import { driveEnabled } from '../sync/drive';
import { syncNow, useSync } from '../sync/sync';
import { Fruit, type FruitKind } from './Fruit';

export function ago(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

/** Two arrows chasing each other: "sync / refresh". */
export function SyncIcon({ className = 'size-4', spin = false }: { className?: string; spin?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${spin ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </svg>
  );
}

const FRUITS: FruitKind[] = ['apple', 'banana', 'grape', 'pineapple', 'crab'];

/** Placeholder profile picture: one of the stage fruits, picked from the email so it stays the same. */
export function Avatar({ email, className = 'size-9' }: { email?: string; className?: string }) {
  const kind = FRUITS[hashString(email ?? 'learn') % FRUITS.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/12 ${className}`} aria-hidden="true">
      <Fruit kind={kind} mood="happy" className="size-[72%]" />
    </span>
  );
}

/**
 * "Sync" with Google Drive. Click syncs (or, before connecting, opens the menu); hovering shows the
 * account and when it last synced. Renders nothing unless Drive is configured for this build.
 */
export function SyncButton({ variant = 'icon', placement = 'down' }: { variant?: 'icon' | 'toolbar' | 'label'; placement?: 'down' | 'up' }) {
  const { linked, status, account, lastSync, pending, message, readyAt } = useSync();
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Touch screens fire fake mouseenter/mouseleave around a tap; only a real mouse opens the menu by hovering.
  const pointer = useRef('mouse');

  // Refresh "x min ago" and the cooldown while the menu is open.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!driveEnabled()) return null;
  const busy = status === 'syncing';
  const warn = status === 'needs-auth' || status === 'error';
  const cooling = Date.now() < readyAt;

  const enter = () => {
    if (pointer.current !== 'mouse') return;
    clearTimeout(closeT.current);
    setOpen(true);
  };
  const leave = () => {
    if (pointer.current !== 'mouse') return;
    closeT.current = setTimeout(() => setOpen(false), 220);
  };
  const click = () => {
    if (!linked) setOpen((o) => !o);
    else void syncNow({ interactive: true });
  };

  const text = variant === 'label' && !linked ? 'Save with Google' : busy ? 'Syncing…' : 'Sync';
  // The toolbar (coding view) is a quiet box with an icon; a warning tints the icon instead of adding a dot.
  const toolbar = variant === 'toolbar';
  const dot = toolbar || !linked || busy ? '' : warn ? 'bg-warn' : pending ? 'bg-accent' : '';
  const btnClass =
    variant === 'label'
      ? 'h-10 rounded-xl border border-line bg-surface-3 px-4 text-sm text-ink hover:border-faint'
      : toolbar
        ? 'h-8 rounded-lg border border-line px-2.5 text-xs text-muted hover:border-faint hover:text-ink'
        : 'h-9 rounded-lg px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-ink';

  return (
    <div ref={box} data-sync className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onPointerDown={(e) => (pointer.current = e.pointerType || 'mouse')}
        onClick={click}
        onFocus={enter}
        disabled={busy}
        aria-haspopup="true"
        aria-expanded={open}
        title={linked ? (warn ? 'Sign in again and sync' : 'Click to sync now') : 'Sync with Google Drive'}
        className={`group relative inline-flex items-center gap-1.5 font-semibold transition-colors disabled:cursor-progress ${btnClass}`}
      >
        {toolbar && <SyncIcon spin={busy} className={`size-3.5 transition-transform duration-500 group-hover:rotate-180 ${warn ? 'text-warn' : ''}`} />}
        {/* Hovering (when connected) shows the refresh arrows: a click syncs. */}
        {linked && !toolbar && (
          <span className={`grid overflow-hidden transition-all duration-200 ${busy ? 'w-4 opacity-100' : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-100'}`}>
            <SyncIcon spin={busy} className="size-4 transition-transform duration-500 group-hover:rotate-180" />
          </span>
        )}
        <span>{text}</span>
        {dot && <span className={`absolute top-1 right-1 size-2 rounded-full ring-2 ring-bg ${dot}`} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'down' ? -6 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'down' ? -6 : 6 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-max min-w-64 rounded-2xl border border-line bg-surface p-3 text-left text-sm shadow-2xl ${
              placement === 'down' ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'
            }`}
          >
            {!linked ? (
              <>
                <p className="px-1 font-semibold text-ink">Not synced</p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-surface-2 py-2 pr-2 pl-3">
                  <span className="text-xs whitespace-nowrap text-muted">Connect with Google Drive</span>
                  <button
                    type="button"
                    onClick={() => void syncNow({ interactive: true })}
                    className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Connect
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-surface-2" title="Account and sync settings">
                  <Avatar email={account?.email} />
                  <span className="min-w-0 truncate font-semibold text-ink">{account?.email ?? 'Google Drive'}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void syncNow({ interactive: true })}
                  disabled={busy || cooling}
                  title="Sync now"
                  className={`group mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-default ${
                    warn ? 'bg-warn/15 text-warn hover:bg-warn/25' : 'bg-surface-2 text-ink hover:bg-accent hover:text-white'
                  }`}
                >
                  <SyncIcon spin={busy} className="size-4 transition-transform duration-500 group-hover:rotate-180" />
                  {busy ? 'Syncing…' : warn ? (status === 'needs-auth' ? 'Reconnect' : 'Try again') : lastSync ? ago(lastSync) : 'Sync now'}
                  {pending && !busy && !warn && <span className="size-1.5 rounded-full bg-accent" title="Changes not synced yet" />}
                </button>
                {status === 'error' && message && <p className="mt-2 px-1 text-xs text-warn">{message}</p>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Generic profile picture for "no account connected". */
function PersonIcon({ className = 'size-[60%]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c.8-4 3.9-6.5 7.5-6.5s6.7 2.5 7.5 6.5z" />
    </svg>
  );
}

/** Small flame (the streak) drawn as an icon rather than an emoji. */
export function FlameIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.6 2.2c.4 3-1.3 4.6-2.9 6.3C8 10.3 6.5 12 6.5 14.9A5.6 5.6 0 0 0 12 20.5a5.6 5.6 0 0 0 5.5-5.6c0-2.1-.8-3.6-1.7-4.8-.3 1.4-1 2.4-2 2.9.6-3.6-.2-7.6-1.2-10.8Z" />
    </svg>
  );
}

/**
 * Top-right account button: a profile picture (your avatar once Drive is connected) with a small sync badge.
 * Hover (or tap) shows the account, your streak and the sync controls; with a mouse, clicking syncs.
 */
export function AccountButton() {
  const { linked, status, account, lastSync, pending, message, readyAt } = useSync();
  const days = useStore((s) => s.days);
  const streak = useMemo(() => computeStreak(days, localToday()), [days]);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointer = useRef<string>('mouse');
  const enabled = driveEnabled();

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    const onDoc = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t);
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const busy = status === 'syncing';
  const warn = status === 'needs-auth' || status === 'error';
  const cooling = Date.now() < readyAt;
  const badgeTone = busy ? 'text-accent' : warn ? 'text-warn' : linked && pending ? 'text-accent' : 'text-muted';

  const enter = () => {
    if (pointer.current !== 'mouse') return;
    clearTimeout(closeT.current);
    setOpen(true);
  };
  const leave = () => {
    if (pointer.current !== 'mouse') return;
    closeT.current = setTimeout(() => setOpen(false), 220);
  };
  // A tap opens the menu (there's no hover on touch screens); a mouse click syncs once connected.
  const click = () => {
    if (pointer.current !== 'mouse' || !linked || !enabled) setOpen((o) => !o);
    else void syncNow({ interactive: true });
  };

  return (
    <div ref={box} data-sync className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onPointerDown={(e) => (pointer.current = e.pointerType || 'mouse')}
        onClick={click}
        // Keyboard focus opens the menu; a tap's focus doesn't (its click toggles it instead).
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={linked ? `Account (${account?.email ?? 'Google Drive'}): sync and streak` : 'Account, sync and streak'}
        title={linked && enabled ? (warn ? 'Sign in again and sync' : 'Click to sync now') : 'Account'}
        // With Drive: a pill, picture on the left and the sync arrows on the right. Without: just the picture.
        className={`group relative flex h-9 items-center rounded-full outline-offset-2 transition-colors ${
          enabled ? `gap-1 border border-line bg-surface-2/80 p-[3px] pr-2 hover:border-faint ${open ? 'border-faint' : ''}` : 'size-9 justify-center'
        }`}
      >
        {linked ? (
          <Avatar email={account?.email} className={enabled ? 'size-7' : 'size-8'} />
        ) : (
          <span className={`grid place-items-center rounded-full border border-line bg-surface-3 text-faint transition-colors group-hover:text-muted ${enabled ? 'size-7' : 'size-8'}`}>
            <PersonIcon />
          </span>
        )}
        {enabled && <SyncIcon spin={busy} className={`size-4 transition-transform duration-500 group-hover:rotate-180 ${badgeTone}`} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-max max-w-[calc(100vw-2rem)] min-w-64 rounded-2xl border border-line bg-surface p-3 text-left text-sm shadow-2xl"
          >
            {linked ? (
              <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-surface-2" title="Account and sync settings">
                <Avatar email={account?.email} />
                <span className="min-w-0 truncate font-semibold text-ink">{account?.email ?? 'Google Drive'}</span>
              </Link>
            ) : enabled ? (
              <>
                <p className="px-1 font-semibold text-ink">Not synced</p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-surface-2 py-2 pr-2 pl-3">
                  <span className="text-xs whitespace-nowrap text-muted">Connect with Google Drive</span>
                  <button
                    type="button"
                    onClick={() => void syncNow({ interactive: true })}
                    className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Connect
                  </button>
                </div>
              </>
            ) : (
              <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl p-1 font-semibold text-ink hover:bg-surface-2">
                <span className="grid size-9 place-items-center rounded-full border border-line bg-surface-3 text-faint">
                  <PersonIcon />
                </span>
                Account &amp; settings
              </Link>
            )}

            <Link
              to="/stats"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2"
              title={streak.todayDone ? 'Streak (today done)' : 'Finish today’s set to keep the streak going'}
            >
              <span className={`grid size-7 place-items-center rounded-full ${streak.current > 0 ? 'bg-warn/12 text-warn' : 'bg-surface-3 text-faint'}`}>
                <FlameIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-tight font-semibold text-ink">{streak.current > 0 ? `${streak.current}-day streak` : 'No streak yet'}</span>
                <span className="block text-xs text-muted">{streak.todayDone ? 'Today done' : streak.current > 0 ? 'Play today to keep it' : 'Finish a daily set to start one'}</span>
              </span>
              <span className="text-xs text-faint tabular-nums">best {streak.best}</span>
            </Link>

            {linked && enabled && (
              <button
                type="button"
                onClick={() => void syncNow({ interactive: true })}
                disabled={busy || cooling}
                title="Sync now"
                className={`group mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-default ${
                  warn ? 'bg-warn/15 text-warn hover:bg-warn/25' : 'bg-surface-2 text-ink hover:bg-accent hover:text-white'
                }`}
              >
                <SyncIcon spin={busy} className="size-4 transition-transform duration-500 group-hover:rotate-180" />
                {busy ? 'Syncing…' : warn ? (status === 'needs-auth' ? 'Reconnect' : 'Try again') : lastSync ? ago(lastSync) : 'Sync now'}
                {pending && !busy && !warn && <span className="size-1.5 rounded-full bg-accent" title="Changes not synced yet" />}
              </button>
            )}
            {status === 'error' && message && <p className="mt-2 px-1 text-xs text-warn">{message}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Shown once per device, right after the first quiet sign-in renewal, so the Google window that just
 * flashed open and shut reads as routine. Short on purpose.
 */
export function RenewNotice() {
  const show = useSync((s) => s.renewNotice);
  const close = () => useSync.setState({ renewNotice: false });
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(close, 6000);
    return () => clearTimeout(t);
  }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-3 text-sm whitespace-nowrap shadow-xl sm:right-4 sm:left-auto sm:translate-x-0"
        >
          <SyncIcon className="size-4 text-good" />
          <span className="font-semibold text-ink">Reconnected account sync</span>
          <Link to="/account" onClick={close} className="rounded-full px-2.5 py-1 text-xs font-semibold text-accent-soft hover:bg-surface-2">
            Settings
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
