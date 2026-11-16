import { ArrowUp, Check, ChevronDown, LayoutGrid, List, ListTree, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { Heading, LearnIndex } from '../content/learn';
import { FOLD_OVER, LEARN_SECTIONS, groupHeadings, parentOf, sectionAnchor, type LearnSectionDef } from '../content/learnNav';
import { loadRecents, useScrollSpy, type LearnView } from '../content/useLearnNav';
import { GUIDE_BY_ID } from '../content/topics';
import { isOn, type Stamps } from '../game/review';
import { TopicIcon } from './icons';
import { Card } from './ui';

type IndexPage = LearnIndex['pages'][number];
type Tally = { seen: number; right: number };

/** The name of a page where space is tight. */
const shortTitle = (p: IndexPage) => {
  const g = GUIDE_BY_ID.get(p.slug);
  return g ? (g.short ?? g.label) : p.title;
};

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- the index ----------

/** One Learn page on the index: icon, title, summary, reading time and (for topics) practice stats. */
function PageCard({ p, i, read, stat }: { p: IndexPage; i: number; read: boolean; stat?: Tally }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
      <Link to={`/learn/${p.slug}`} className="block h-full">
        <Card className="flex h-full flex-col p-4 transition-colors hover:border-faint">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-soft">
              <TopicIcon id={p.slug} className="size-[18px]" />
            </span>
            <p className="min-w-0 flex-1 font-display text-lg leading-snug font-semibold">{p.title}</p>
            {read && (
              <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good" title="You've read this page">
                ✓ Read
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted">{p.summary}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-faint">
            <span>{p.minutes} min read</span>
            {stat && stat.seen > 0 && (
              <>
                <span>·</span>
                <span title="Questions, problems and cases on this topic you've answered">
                  {stat.seen} practised · {Math.round((stat.right / stat.seen) * 100)}% right
                </span>
              </>
            )}
          </p>
        </Card>
      </Link>
    </motion.div>
  );
}

/** A page as a small tile: icon, name and a tick once read. Many fit on a phone screen. */
function PageTile({ p, read, current, onPick }: { p: IndexPage; read: boolean; current: boolean; onPick?: () => void }) {
  return (
    <Link
      to={`/learn/${p.slug}`}
      onClick={onPick}
      aria-current={current ? 'page' : undefined}
      title={p.summary}
      className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-2.5 py-1.5 transition-colors ${
        current ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface hover:border-faint'
      }`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent-soft">
        <TopicIcon id={p.slug} className="size-4" />
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-tight font-semibold text-ink sm:text-sm sm:leading-tight">{shortTitle(p)}</span>
      {read && (
        <span className="shrink-0 text-good" title="You've read this page">
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">Read</span>
        </span>
      )}
    </Link>
  );
}

/** The sections of the index that have at least one of `pages`, with those pages in order. */
function sectionsWith(pages: IndexPage[]): {
  def: LearnSectionDef;
  groups: { name: string; pages: IndexPage[] }[];
  count: number;
}[] {
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  return LEARN_SECTIONS.map((def) => {
    const groups = def.groups
      .map((g) => ({
        name: g.name,
        pages: g.slugs.map((s) => bySlug.get(s)).filter((p): p is IndexPage => !!p),
      }))
      .filter((g) => g.pages.length);
    return {
      def,
      groups,
      count: groups.reduce((n, g) => n + g.pages.length, 0),
    };
  }).filter((s) => s.count);
}

/**
 * Every page, by section and group: as cards (summary, reading time, stats) or as compact tiles.
 * `anchors` gives the sections ids for the jump chips; `current` marks the page being read.
 */
export function LearnDirectory({
  pages,
  view,
  learnRead,
  stats,
  current,
  onPick,
  anchors = false,
}: {
  pages: IndexPage[];
  view: LearnView;
  learnRead: Stamps | undefined;
  stats?: ReadonlyMap<string, Tally>;
  current?: string;
  onPick?: () => void;
  anchors?: boolean;
}) {
  const compact = view === 'compact';
  return (
    <div className={compact ? 'space-y-6' : 'space-y-8'}>
      {sectionsWith(pages).map(({ def, groups }) => (
        <section key={def.key} id={anchors ? sectionAnchor(def.key) : undefined} aria-label={def.label} className="scroll-mt-32">
          <h2 className={`font-display font-semibold ${compact ? 'text-lg' : 'text-xl'}`}>{def.label}</h2>
          {def.blurb && !compact && <p className="mt-1 text-sm text-muted">{def.blurb}</p>}
          {groups.map((g) => (
            <div key={g.name} className={compact ? 'mt-2.5' : 'mt-4'}>
              {g.name && <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">{g.name}</p>}
              {compact ? (
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {g.pages.map((p) => (
                    <PageTile key={p.slug} p={p} read={isOn(learnRead, p.slug)} current={p.slug === current} onPick={onPick} />
                  ))}
                </div>
              ) : (
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.pages.map((p, i) => (
                    <PageCard key={p.slug} p={p} i={i} read={isOn(learnRead, p.slug)} stat={stats?.get(p.slug)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Sticks under the header on the index: a chip per section (tap to scroll there; the one on screen is
 * lit) and the compact / cards switch.
 */
export function JumpBar({ pages, view, onView }: { pages: IndexPage[]; view: LearnView; onView(v: LearnView): void }) {
  const sections = useMemo(() => sectionsWith(pages), [pages]);
  const ids = useMemo(() => sections.map((s) => sectionAnchor(s.def.key)), [sections]);
  const active = useScrollSpy(ids, true, 150);
  return (
    <div className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b border-line/60 bg-bg/95 px-4 py-2 backdrop-blur-lg sm:mx-0 sm:rounded-2xl sm:border sm:px-2">
      <nav className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Jump to a section">
        {sections.map((s) => {
          const id = sectionAnchor(s.def.key);
          const on = active === id;
          return (
            <button
              key={s.def.key}
              type="button"
              aria-current={on ? 'true' : undefined}
              onClick={() =>
                document.getElementById(id)?.scrollIntoView({
                  block: 'start',
                  behavior: calm() ? 'auto' : 'smooth',
                })
              }
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                on ? 'border-accent/50 bg-accent/12 text-accent-soft' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              <span className="sm:hidden">{s.def.short}</span>
              <span className="hidden sm:inline">{s.def.label}</span>
              <span className="hidden text-xs font-normal text-faint tabular-nums sm:inline">{s.count}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Layout">
        {(
          [
            ['compact', List, 'Compact list'],
            ['cards', LayoutGrid, 'Cards with summaries'],
          ] as const
        ).map(([v, Icon, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            aria-label={label}
            title={label}
            onClick={() => onView(v)}
            className={`grid size-7 place-items-center rounded-md transition-colors ${view === v ? 'bg-surface-3 text-ink' : 'text-faint hover:text-ink'}`}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The pages opened last on this device; an unfinished page reopens at the section you were reading. */
export function RecentRow({ index, learnRead }: { index: LearnIndex; learnRead: Stamps | undefined }) {
  const [recents] = useState(loadRecents);
  const bySlug = new Map(index.pages.map((p) => [p.slug, p]));
  const shown = recents.filter((r) => bySlug.has(r.slug)).slice(0, 3);
  if (!shown.length) return null;
  return (
    <section aria-label="Jump back in">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Jump back in</p>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {shown.map((r) => {
          const p = bySlug.get(r.slug)!;
          const resume = !!r.id && !!r.text && !isOn(learnRead, r.slug);
          return (
            <Link
              key={r.slug}
              to={`/learn/${r.slug}${resume ? `#${r.id}` : ''}`}
              className="flex max-w-[16rem] shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 hover:border-faint"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent-soft">
                <TopicIcon id={r.slug} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm leading-tight font-semibold text-ink">{shortTitle(p)}</span>
                {resume && <span className="block truncate text-xs text-muted">{r.text}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------- on a page ----------

/**
 * The contents list beside the article (wide screens). It follows the reader: the section on screen is
 * lit and kept in view, and on long pages ### headings show only under the section being read.
 */
export function Toc({ heads, active, onJump }: { heads: Heading[]; active: string; onJump(id: string): void }) {
  const groups = useMemo(() => groupHeadings(heads), [heads]);
  const fold = heads.length > FOLD_OVER;
  const openId = parentOf(groups, active);
  const box = useRef<HTMLElement>(null);
  // Keep the lit entry inside the list's own scroll area (never scrolls the page).
  useEffect(() => {
    const nav = box.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !el) return;
    const top = el.offsetTop;
    if (top < nav.scrollTop + 40) nav.scrollTop = Math.max(0, top - 80);
    else if (top + el.offsetHeight > nav.scrollTop + nav.clientHeight - 24) nav.scrollTop = top - nav.clientHeight / 2;
  }, [active, openId]);
  const link = (h: Heading) => (
    <li key={h.id}>
      <a
        href={`#${h.id}`}
        aria-current={active === h.id ? 'location' : undefined}
        onClick={(e) => {
          e.preventDefault();
          onJump(h.id);
        }}
        className={`-ml-px block border-l-2 py-0.5 hover:text-ink ${h.depth === 3 ? 'pl-6 text-[0.8rem]' : 'pl-3'} ${
          active === h.id ? 'border-accent font-semibold text-ink' : openId === h.id ? 'border-transparent text-ink' : 'border-transparent text-muted'
        }`}
      >
        {h.text}
      </a>
    </li>
  );
  return (
    <nav ref={box} className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2 text-sm" aria-label="On this page">
      <Link to="/learn" className="text-xs font-semibold text-muted hover:text-ink">
        ← All topics
      </Link>
      <p className="mt-4 text-[11px] font-semibold tracking-widest text-muted uppercase">On this page</p>
      <ul className="mt-2 space-y-1 border-l border-line">
        {groups.flatMap((g) => [...(g.head ? [link(g.head)] : []), ...(!fold || !g.head || g.head.id === openId ? g.kids.map(link) : [])])}
      </ul>
    </nav>
  );
}

/** A thin line that fills as the page is scrolled. */
function ReadProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, []);
  return <div ref={bar} aria-hidden="true" className="h-0.5 origin-left bg-accent/70" style={{ transform: 'scaleX(0)' }} />;
}

/**
 * Sticks under the header on a page (below the width where the contents list fits beside the article):
 * names the section on screen, opens the contents sheet, and holds the find button.
 */
export function SectionBar({ title, heads, active, onOpen, onFind }: { title: string; heads: Heading[]; active: string; onOpen(): void; onFind(): void }) {
  const at = heads.find((h) => h.id === active);
  return (
    <div className="sticky top-14 z-30 -mx-4 -mt-5 mb-4 border-b border-line/60 bg-bg/95 backdrop-blur-lg sm:-mt-6 lg:hidden" data-find-skip>
      <div className="flex h-10 items-center gap-1 px-2">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`Contents (now: ${at?.text ?? title})`}
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm text-ink hover:bg-surface-2"
        >
          <ListTree className="size-4 shrink-0 text-accent-soft" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 truncate font-semibold">{at?.text ?? title}</span>
          <ChevronDown className="size-3.5 shrink-0 text-faint" strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onFind}
          aria-label="Find on this page"
          title="Find on this page"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
        >
          <Search className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ReadProgress />
    </div>
  );
}

/**
 * The contents sheet (slides up from the bottom): this page's sections, and every Learn page for
 * switching without going back to the index.
 */
export function NavSheet({
  open,
  onClose,
  title,
  heads,
  active,
  onJump,
  index,
  slug,
  learnRead,
}: {
  open: boolean;
  onClose(): void;
  title: string;
  heads: Heading[];
  active: string;
  onJump(id: string): void;
  index: LearnIndex;
  slug: string;
  learnRead: Stamps | undefined;
}) {
  // While open: Escape closes, the page behind doesn't scroll, and focus returns to the opener after.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener('keydown', onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Contents"
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] max-w-xl flex-col rounded-t-3xl border border-b-0 border-line bg-surface shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <SheetBody title={title} heads={heads} active={active} onJump={onJump} onClose={onClose} index={index} slug={slug} learnRead={learnRead} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetBody({
  title,
  heads,
  active,
  onJump,
  onClose,
  index,
  slug,
  learnRead,
}: {
  title: string;
  heads: Heading[];
  active: string;
  onJump(id: string): void;
  onClose(): void;
  index: LearnIndex;
  slug: string;
  learnRead: Stamps | undefined;
}) {
  const [tab, setTab] = useState<'page' | 'all'>('page');
  const groups = useMemo(() => groupHeadings(heads), [heads]);
  const fold = heads.length > FOLD_OVER;
  // On long pages only the section being read starts unfolded; the chevrons unfold the others.
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(() => new Set([parentOf(groups, active)]));
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
  }, []);
  // Open with the current section (or the current page) in the middle of the list.
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[aria-current]');
    if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
    else if (box) box.scrollTop = 0;
  }, [tab]);
  const go = (id: string) => {
    onClose();
    onJump(id);
  };
  const row = (h: Heading) => {
    const on = active === h.id;
    return (
      <button
        type="button"
        onClick={() => go(h.id)}
        aria-current={on ? 'location' : undefined}
        className={`flex min-h-11 min-w-0 flex-1 items-center rounded-xl px-3 py-2 text-left leading-snug ${h.depth === 3 ? 'pl-7 text-sm' : 'text-[15px] font-semibold'} ${
          on ? 'bg-accent/12 text-accent-soft' : h.depth === 3 ? 'text-muted hover:bg-surface-2' : 'text-ink hover:bg-surface-2'
        }`}
      >
        {h.text}
      </button>
    );
  };
  return (
    <>
      <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-2">
        <div className="flex flex-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Contents">
          {(
            [
              ['page', 'On this page'],
              ['all', 'All pages'],
            ] as const
          ).map(([t, label], i) => (
            <button
              key={t}
              ref={i === 0 ? first : undefined}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div ref={scroller} role="tabpanel" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {tab === 'page' ? (
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => go('')}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[15px] font-semibold text-muted hover:bg-surface-2"
              >
                <ArrowUp className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">Top: {title}</span>
              </button>
            </li>
            {groups.map((g, gi) => {
              const key = g.head?.id ?? '';
              const shown = !fold || !g.head || unfolded.has(key);
              return (
                <li key={key || `_${gi}`}>
                  {g.head && (
                    <div className="flex items-stretch gap-1">
                      {row(g.head)}
                      {fold && g.kids.length > 0 && (
                        <button
                          type="button"
                          aria-expanded={shown}
                          aria-label={`${shown ? 'Hide' : 'Show'} the ${g.kids.length} parts of ${g.head.text}`}
                          onClick={() =>
                            setUnfolded((u) => {
                              const next = new Set(u);
                              if (!next.delete(key)) next.add(key);
                              return next;
                            })
                          }
                          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs text-faint tabular-nums hover:bg-surface-2 hover:text-ink"
                        >
                          {g.kids.length}
                          <ChevronDown className={`size-4 transition-transform ${shown ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                  {shown && g.kids.length > 0 && (
                    <ul className="space-y-0.5">
                      {g.kids.map((k) => (
                        <li key={k.id} className="flex">
                          {row(k)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="pt-1">
            <LearnDirectory pages={index.pages} view="compact" learnRead={learnRead} current={slug} onPick={onClose} />
          </div>
        )}
      </div>
    </>
  );
}
