import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type MouseEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { useStore } from '../game/store';
import { useFitHeight } from '../game/useFitHeight';
import { LANG_LABEL, type Lang } from '../runner/harness/types';
import { cpp } from '../syntax/cpp';
import { DESCRIPTIONS } from '../syntax/descriptions';
import { GLOSSARY, type GlossaryEntry } from '../syntax/glossary';
import { glossNames, highlight } from '../syntax/highlight';
import { java } from '../syntax/java';
import { python } from '../syntax/python';
import type { SyntaxItem, SyntaxSheet } from '../syntax/types';
import { insertIntoEditor, useActiveEditor } from './editorBridge';
import { useKeyBarShown } from './KeyBar';

const SHEETS: Record<Lang, SyntaxSheet> = { python3: python, java, cpp };

type ShowTip = (entry: GlossaryEntry | null, rect?: DOMRect) => void;

function Snippet({ item, lang, onTip }: { item: SyntaxItem; lang: Lang; onTip: ShowTip }) {
  const [flash, setFlash] = useState<string | null>(null);
  // Details: the docs for every linked name in this snippet (hover isn't available on touch screens).
  const names = useMemo(() => glossNames(item.code, lang, GLOSSARY[lang]), [item.code, lang]);
  const [details, setDetails] = useState(false);
  const canInsert = useActiveEditor((s) => s.view !== null);
  const done = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1100);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      done('Copied');
    } catch {
      done('Copy failed');
    }
  };
  return (
    <div className="group relative">
      <p className="pr-32 text-[12px] font-semibold text-ink/90">{item.label}</p>
      {DESCRIPTIONS[lang][item.label] && <p className="mt-0.5 mb-1.5 text-[11.5px] leading-snug text-muted">{DESCRIPTIONS[lang][item.label]}</p>}
      <button
        type="button"
        onClick={copy}
        // No `title`: the browser's own tooltip would cover the hover card for underlined names.
        aria-label={`Copy: ${item.label}`}
        onMouseOver={(e: MouseEvent) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>('[data-gloss]');
          const entry = el ? GLOSSARY[lang][el.dataset.gloss ?? ''] : undefined;
          onTip(entry ?? null, el?.getBoundingClientRect());
        }}
        onMouseLeave={() => onTip(null)}
        className="block w-full rounded-lg border border-line/70 bg-code px-2.5 py-2 text-left font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap text-ink/90 transition-colors hover:border-accent/40"
      >
        {highlight(item.code, lang, GLOSSARY[lang])}
      </button>
      <div className="absolute -top-0.5 right-0 flex items-center gap-1">
        {canInsert && (
          <button
            type="button"
            onClick={() => insertIntoEditor(item.code) && done('Inserted')}
            className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink focus:opacity-100 [@media(hover:none)]:opacity-100"
            title="Insert at the cursor in your editor"
          >
            ↵ insert
          </button>
        )}
        {names.length > 0 && (
          <button
            type="button"
            onClick={() => setDetails((d) => !d)}
            aria-expanded={details}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              details ? 'bg-accent/15 text-accent-soft' : 'bg-surface-3 text-muted hover:text-ink'
            }`}
            title="Inputs, return value and cost of each function here"
          >
            <Info className="size-3" aria-hidden="true" />
            details
          </button>
        )}
      </div>
      {details && (
        <div className="mt-1.5 space-y-2.5 rounded-lg border border-line/70 bg-surface p-2.5">
          {names.map((n) => (
            <GlossBody key={n} entry={GLOSSARY[lang][n]} />
          ))}
        </div>
      )}
      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-good px-1.5 py-0.5 text-[10px] font-bold text-bg"
          >
            {flash}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * What the tray was showing, kept while the page is open (memory only, nothing stored): on phones the tray is
 * closed to look at the code and reopened to copy the next thing, so it should come back with the same search,
 * the same sections open and at the same scroll position. Scroll is remembered per language and search.
 */
const useTrayMemory = create<{ query: string; open: string[]; scroll: Record<string, number> }>(() => ({ query: '', open: [], scroll: {} }));

export function SyntaxTray({ onClose }: { onClose?: () => void }) {
  const lang = useStore((s) => s.settings.lang);
  const sheet = SHEETS[lang];
  const query = useTrayMemory((s) => s.query);
  const setQuery = (q: string) => useTrayMemory.setState({ query: q });
  const openIds = useTrayMemory((s) => s.open);
  const open = useMemo(() => new Set(openIds), [openIds]);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollKey = `${lang}|${query.trim().toLowerCase()}`;
  // Back where it was for this language and search (the open sections render at full height straight away).
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = useTrayMemory.getState().scroll[scrollKey] ?? 0;
  }, [scrollKey]);
  const [tip, setTip] = useState<{ entry: GlossaryEntry; rect: DOMRect } | null>(null);
  const onTip: ShowTip = (entry, rect) => setTip(entry && rect ? { entry, rect } : null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const all = [...sheet.common, ...sheet.categories.flatMap((c) => c.items)];
    const seen = new Set<string>();
    return all.filter((it) => {
      const hit = it.label.toLowerCase().includes(q) || it.code.toLowerCase().includes(q);
      if (!hit || seen.has(it.code)) return false;
      seen.add(it.code);
      return true;
    });
  }, [query, sheet]);

  const toggle = (id: string) => useTrayMemory.setState((m) => ({ open: m.open.includes(id) ? m.open.filter((x) => x !== id) : [...m.open, id] }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="font-display text-base font-semibold">Syntax</span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-muted">{LANG_LABEL[lang]}</span>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink" aria-label="Close syntax tray">
            ✕
          </button>
        )}
      </div>
      <div className="px-4 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (sort, heap, split…)"
          aria-label="Search syntax"
          className="h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-sm placeholder:text-faint focus:border-accent-soft/60 focus:outline-none"
        />
        <p className="mt-1.5 text-[11px] text-faint">Click a snippet to copy it · hover underlined names for details</p>
      </div>
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-3 pb-6"
        onScroll={(e) => {
          useTrayMemory.getState().scroll[scrollKey] = e.currentTarget.scrollTop;
          if (tip) setTip(null);
        }}
      >
        {results ? (
          results.length ? (
            results.map((it) => <Snippet key={it.label + it.code} item={it} lang={lang} onTip={onTip} />)
          ) : (
            <p className="text-sm text-faint">No matches.</p>
          )
        ) : (
          <>
            <section>
              <p className="mb-2 text-[11px] font-bold tracking-widest text-accent-soft uppercase">Most used</p>
              <div className="space-y-3">
                {sheet.common.map((it) => (
                  <Snippet key={it.label} item={it} lang={lang} onTip={onTip} />
                ))}
              </div>
            </section>
            <section>
              <p className="mb-2 text-[11px] font-bold tracking-widest text-muted uppercase">Full reference</p>
              <ul className="space-y-1.5">
                {sheet.categories.map((c) => {
                  const isOpen = open.has(c.id);
                  return (
                    <li key={c.id} className="rounded-xl border border-line bg-surface-2/60">
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold"
                      >
                        <span aria-hidden="true">{c.icon}</span>
                        <span className="flex-1">{c.title}</span>
                        <span className="text-xs text-faint tabular-nums">{c.items.length}</span>
                        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-faint" aria-hidden="true">
                          ›
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 px-3 pt-1 pb-3">
                              {c.items.map((it) => (
                                <Snippet key={it.label} item={it} lang={lang} onTip={onTip} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
      {tip && <GlossTip entry={tip.entry} rect={tip.rect} />}
    </div>
  );
}

/**
 * Hover card for an underlined name: below the word when there's room, otherwise above it, and always inside
 * the window (measured after the first render, so long descriptions are placed correctly too).
 */
function GlossTip({ entry, rect }: { entry: GlossaryEntry; rect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 120;
    const w = ref.current?.offsetWidth ?? 288;
    const below = rect.bottom + 8;
    const top = below + h <= window.innerHeight - 8 ? below : Math.max(8, rect.top - 8 - h);
    setPos({ top, left: Math.max(8, Math.min(window.innerWidth - w - 8, rect.left - 40)) });
  }, [entry, rect]);
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[70] w-72 rounded-xl border border-line bg-surface p-3 text-left shadow-2xl"
      style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}
    >
      <GlossBody entry={entry} />
    </div>,
    document.body,
  );
}

/** Signature, what it does, each input, the return value and the cost. */
function GlossBody({ entry }: { entry: GlossaryEntry }) {
  return (
    <div>
      <p className="font-mono text-[12px] font-semibold text-ink">{entry.sig}</p>
      <p className="mt-1 text-[12px] leading-snug text-muted">{entry.desc}</p>
      {entry.params && entry.params.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">Inputs</p>
          <ul className="mt-0.5 space-y-0.5">
            {entry.params.map((p) => (
              <li key={p.name} className="text-[11.5px] leading-snug text-muted">
                <span className="font-mono font-semibold text-ink">{p.name}</span> <span className="font-mono text-accent-soft">{p.type}</span>: {p.desc}
              </li>
            ))}
          </ul>
        </div>
      )}
      {entry.returns && (
        <div className="mt-1.5">
          <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">Returns</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
            <span className="font-mono text-accent-soft">{entry.returns.type}</span>: {entry.returns.desc}
          </p>
        </div>
      )}
      {entry.cost && <p className="mt-1.5 text-[11px] font-semibold text-accent-soft">{entry.cost}</p>}
    </div>
  );
}

/** Wide screens: the docked tray (a sticky right-hand column below the stage bar). */
export function SyntaxPanel() {
  const setTrayOpen = useStore((s) => s.setTrayOpen);
  const ref = useRef<HTMLElement>(null);
  const h = useFitHeight(ref, 360);
  return (
    <aside ref={ref} className="sticky top-20" style={{ height: h }} aria-label="Syntax reference">
      {/* Middle of the left edge: hide the tray. */}
      <button
        type="button"
        onClick={() => setTrayOpen(false)}
        className="group absolute top-1/2 -left-3 z-10 grid h-20 w-3 -translate-y-1/2 place-items-center rounded-l-lg border border-r-0 border-line bg-surface text-[10px] text-faint transition-colors hover:w-4 hover:-left-4 hover:bg-surface-2 hover:text-ink"
        title="Hide the syntax tray"
        aria-label="Hide the syntax tray"
      >
        ›
      </button>
      <div className="h-full overflow-hidden rounded-2xl border border-line bg-surface/90 backdrop-blur">
        <SyntaxTray onClose={() => setTrayOpen(false)} />
      </div>
    </aside>
  );
}

/** The ways to open the tray: an edge tab on wide screens (when hidden), a button + drawer on narrow ones. */
export function SyntaxOpeners({ docked }: { docked: boolean }) {
  const keyBarH = useKeyBarShown((k) => k.height);
  const setTrayOpen = useStore((s) => s.setTrayOpen);
  const [drawer, setDrawer] = useState(false);

  return (
    <>
      {!docked && (
        // Middle of the right edge. The label is centred by flexbox; the vertical text sits in a
        // one-line box (leading-none) so it can't drift off-centre.
        <button
          type="button"
          onClick={() => setTrayOpen(true)}
          className="fixed top-1/2 right-0 z-30 hidden h-28 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-line bg-surface font-mono text-[11px] font-bold text-accent-soft shadow-lg hover:bg-surface-2 xl:flex"
          aria-label="Open the syntax tray"
        >
          <span className="leading-none whitespace-nowrap [writing-mode:vertical-rl]">{'{ } syntax'}</span>
        </button>
      )}

      {/* below xl */}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        className="fixed right-4 bottom-4 z-30 grid size-12 place-items-center rounded-full bg-accent font-mono text-sm font-black text-white shadow-[0_8px_30px_-8px_var(--color-accent)] xl:hidden"
        // Above the shortcut keys while they're showing (they sit at the bottom, over the keyboard).
        style={keyBarH ? { bottom: keyBarH + 16 } : undefined}
        aria-label="Open syntax reference"
      >
        {'{ }'}
      </button>
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
            <motion.div
              className="absolute top-0 right-0 h-full w-[min(420px,92vw)] border-l border-line bg-surface shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <SyntaxTray onClose={() => setDrawer(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
