import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../game/store';
import { useResolvedTheme } from '../game/theme';
import { FontMenuItems } from './FontSettings';
import { Toggle } from './ui';

export function SpeakerIcon({ muted, className = 'size-[18px]' }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

function GearIcon({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

/** Phones wrap long code lines unless the player switched back to sideways scrolling (see index.css). */
export function useApplyCodeWrap() {
  const scrollCode = useStore((s) => !!s.settings.scrollCode);
  useEffect(() => {
    document.documentElement.classList.toggle('code-scroll', scrollCode);
  }, [scrollCode]);
}

/** Gear in the header: sound, code wrapping, code font, and (on phones, where the sun/moon button is hidden) the theme. */
export function SettingsMenu() {
  const sound = useStore((s) => s.settings.sound);
  const setSound = useStore((s) => s.setSound);
  const scrollCode = useStore((s) => !!s.settings.scrollCode);
  const setScrollCode = useStore((s) => s.setScrollCode);
  const keybar = useStore((s) => s.settings.keybar ?? true);
  const setKeybar = useStore((s) => s.setKeybar);
  const setTheme = useStore((s) => s.setTheme);
  const resolved = useResolvedTheme();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        className={`grid size-9 place-items-center rounded-lg transition-colors hover:bg-surface-2 hover:text-ink ${open ? 'bg-surface-2 text-ink' : 'text-muted'}`}
      >
        <GearIcon className={`size-[18px] transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-2 text-left text-sm shadow-2xl"
            role="dialog"
            aria-label="Settings"
          >
            <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">Settings</p>
            <Toggle compact on={sound} onChange={setSound} label="Sound effects" sub="Clicks, chimes and the finish fanfare." />
            <Toggle
              compact
              on={!scrollCode}
              onChange={(wrap) => setScrollCode(!wrap)}
              label="Wrap long code lines"
              sub="On phones. Off: scroll sideways instead."
            />
            <FontMenuItems />
            <Toggle
              compact
              on={keybar}
              onChange={(v) => setKeybar({ keybar: v })}
              label="Shortcut keys"
              sub="Phones: ; { } ( ) and more above the keyboard while coding."
            />
            <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 sm:hidden">
              <span className="font-semibold text-ink">Theme</span>
              <span className="flex rounded-full border border-line bg-surface-2/80 p-0.5" role="radiogroup" aria-label="Theme">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={resolved === t}
                    onClick={() => setTheme(t)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${resolved === t ? 'bg-accent text-white' : 'text-muted'}`}
                  >
                    {t}
                  </button>
                ))}
              </span>
            </div>
            <div className="mt-1 border-t border-line/70 pt-1">
              <Link to="/account" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-accent-soft hover:bg-surface-2 hover:text-ink">
                All settings and backups <span aria-hidden="true">→</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
