import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router';
import { fold } from '../content/learnSearch';

/**
 * Find on this page: highlights every match inside `root` (CSS Custom Highlight API, so React's DOM is
 * never touched), with next / previous and a match counter. Matches are re-found when the content
 * changes (a code tab or the language picker swaps the code shown).
 */

/** Text in different blocks never joins into one match ("end of one paragraph" + "start of the next"). */
const BLOCKS = 'p,li,td,th,h1,h2,h3,h4,pre,.code-line,figcaption,blockquote,dt,dd,summary,div,button';

export function findRanges(root: HTMLElement, query: string): Range[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('svg, [data-find-skip]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  const starts: number[] = [];
  let text = '';
  let prevBlock: Element | null = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const block = n.parentElement?.closest(BLOCKS) ?? null;
    if (prevBlock && block !== prevBlock) text += '\n';
    prevBlock = block;
    starts.push(text.length);
    nodes.push(n as Text);
    text += fold((n as Text).data);
  }
  // The text node holding position p (the last one starting at or before it).
  const locate = (p: number, end: boolean): [Text, number] => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] < p || (!end && starts[mid] === p)) lo = mid;
      else hi = mid - 1;
    }
    return [nodes[lo], Math.min(p - starts[lo], nodes[lo].length)];
  };
  const out: Range[] = [];
  for (let i = text.indexOf(needle); i >= 0 && out.length < 2000; i = text.indexOf(needle, i + needle.length)) {
    const r = document.createRange();
    r.setStart(...locate(i, false));
    r.setEnd(...locate(i + needle.length, true));
    if (r.getClientRects().length) out.push(r);
  }
  return out;
}

const highlights = (): HighlightRegistry | null => (typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null);

/** Bring a match into view: scroll a code block sideways if needed, then the page so it sits in the upper third. */
function reveal(r: Range, smooth: boolean): void {
  const box = r.startContainer.parentElement?.closest('pre');
  if (box && box.scrollWidth > box.clientWidth) {
    const rr = r.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    if (rr.left < br.left || rr.right > br.right) box.scrollLeft += rr.left - br.left - br.width / 3;
  }
  const rect = r.getBoundingClientRect();
  // Clear of the header and the find bar (which sits lower below lg, under the section bar).
  const clear = window.innerWidth < 1024 ? 170 : 130;
  if (rect.top > clear && rect.bottom < window.innerHeight - 60) return;
  window.scrollTo({
    top: window.scrollY + rect.top - window.innerHeight * 0.3,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

export function FindBar({
  root,
  initial,
  anchor,
  source,
  focus,
  onClose,
}: {
  root: RefObject<HTMLElement | null>;
  initial: string;
  /** Start at the first match after this heading id (a search result's section). */
  anchor?: string;
  /** The page's Markdown, to tell "not on the page" from "only in another language's code". */
  source: string;
  /** Focus the box (not when arriving from a search result: on phones that would pop the keyboard up). */
  focus: boolean;
  onClose(): void;
}) {
  const [q, setQ] = useState(initial);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [cur, setCur] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const smooth = typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = useCallback(
    (i: number, list = ranges) => {
      if (!list.length) return;
      const n = ((i % list.length) + list.length) % list.length;
      setCur(n);
      reveal(list[n], smooth);
    },
    [ranges, smooth],
  );

  // Find (debounced while typing) and again whenever the article's content changes.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const run = (jump: boolean) => {
      const list = findRanges(el, q);
      setRanges(list);
      if (!list.length) return setCur(0);
      if (!jump) return setCur((c) => Math.min(c, list.length - 1));
      // First time from a search result: the first match in that section. Otherwise the first one on screen.
      let i = -1;
      const head = first.current && anchor ? document.getElementById(anchor) : null;
      if (head) i = list.findIndex((r) => head.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING);
      else if (!first.current) i = list.findIndex((r) => r.getBoundingClientRect().top >= 70);
      if (i < 0 && head) head.scrollIntoView({ block: 'start' });
      const n = Math.max(0, i);
      setCur(n);
      if (i >= 0 || !head) reveal(list[n], smooth && !first.current);
      first.current = false;
    };
    t = setTimeout(() => run(true), first.current ? 0 : 140);
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => run(false), 200);
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [q, root, anchor, smooth]);

  // Paint the highlights.
  useEffect(() => {
    const reg = highlights();
    if (!reg) return;
    reg.set('learn-find', new Highlight(...ranges));
    if (ranges[cur]) reg.set('learn-find-current', new Highlight(ranges[cur]));
    else reg.delete('learn-find-current');
  }, [ranges, cur]);
  useEffect(
    () => () => {
      highlights()?.delete('learn-find');
      highlights()?.delete('learn-find-current');
    },
    [],
  );

  useEffect(() => {
    if (!focus) return;
    input.current?.focus();
    input.current?.select();
  }, [focus]);

  // Esc closes and / jumps into the box, even when the focus is elsewhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t !== input.current && t?.closest('input, textarea, select, [contenteditable="true"], .cm-editor')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === '/' && t !== input.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const term = q.trim();
  const elsewhere = !!term && !ranges.length && fold(source).includes(fold(term));
  return (
    <div
      role="search"
      data-find-skip
      className="fixed top-[6.5rem] right-3 left-3 z-30 lg:top-[4.25rem] rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur sm:left-auto sm:w-[25rem] lg:right-8"
    >
      <div className="flex items-center gap-1">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-2.5 focus-within:ring-2 focus-within:ring-accent/50">
          <Search className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                go(cur + (e.shiftKey ? -1 : 1));
              }
            }}
            placeholder="Find on this page"
            aria-label="Find on this page"
            enterKeyHint="search"
            className="h-9 min-w-0 flex-1 bare-input bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          <span className="shrink-0 text-xs text-faint tabular-nums" aria-live="polite">
            {term ? (ranges.length ? `${cur + 1}/${ranges.length}` : 'None') : ''}
          </span>
        </label>
        <button
          type="button"
          onClick={() => go(cur - 1)}
          disabled={!ranges.length}
          aria-label="Previous match"
          title="Previous (Shift+Enter)"
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => go(cur + 1)}
          disabled={!ranges.length}
          aria-label="Next match"
          title="Next (Enter)"
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <ChevronDown className="size-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close find" title="Close (Esc)" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {term && (
        <p className="flex items-center justify-between gap-3 px-2 pt-1.5 pb-0.5 text-xs text-faint">
          <span>{elsewhere ? 'Only in another language’s code tab here.' : ranges.length ? <span className="hidden sm:inline">Enter: next · Shift+Enter: previous</span> : 'Not on this page.'}</span>
          <Link to={`/learn?q=${encodeURIComponent(term)}`} className="shrink-0 font-semibold text-accent-soft hover:underline">
            Search all pages →
          </Link>
        </p>
      )}
    </div>
  );
}
