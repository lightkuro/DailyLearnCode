import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { FindBar } from '../components/FindInPage';
import { JumpBar, LearnDirectory, NavSheet, RecentRow, SectionBar, Toc } from '../components/LearnNav';
import { TopicIcon } from '../components/icons';
import { Markdown } from '../components/Markdown';
import { Card, Spinner } from '../components/ui';
import { headingsOf, type LearnIndex, type LearnPage as LearnPageData, type LearnSearchIndex } from '../content/learn';
import { noteRecent, useLearnView, useScrollSpy } from '../content/useLearnNav';
import { markParts, queryWords, searchLearn, type PageHit } from '../content/learnSearch';
import { loadLearnPage, loadLearnSearch } from '../content/loadDay';
import { AREA_LABEL, GUIDES_LABEL, GUIDE_BY_ID, TOPIC_BY_ID, learnLabel } from '../content/topics';
import { useLearnIndex, useLearnTerms } from '../content/useLearn';
import { isOn, type Stamps } from '../game/review';
import { useStore } from '../game/store';
import { useTopicStats } from '../game/topicStats';

/** /learn: crash courses on the concepts behind the questions. /learn/:slug: one page. */
export function LearnPage() {
  const { slug } = useParams();
  const index = useLearnIndex();
  if (!index) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  return slug ? <Article key={slug} slug={slug} index={index} /> : <LearnHome index={index} />;
}

function LearnHome({ index }: { index: LearnIndex }) {
  // The query is mirrored into the URL (?q=), so Back from a result returns to the same results.
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') ?? '');
  const urlQ = params.get('q') ?? '';
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => setParams(q ? { q } : {}, { replace: true, preventScrollReset: true }), 300);
    return () => clearTimeout(t);
  }, [q, urlQ, setParams]);
  const box = useRef<HTMLInputElement>(null);
  const stats = useTopicStats();
  const learnRead = useStore((s) => s.learnRead);
  const readCount = index.pages.filter((p) => isOn(learnRead, p.slug)).length;
  const query = q.trim().toLowerCase();
  const pages = index.pages.filter(
    (p) => !query || p.title.toLowerCase().includes(query) || p.summary.toLowerCase().includes(query) || p.terms.some((t) => t.term.toLowerCase().includes(query)),
  );
  const [view, setView] = useLearnView();

  // Full-text search: the section index loads on the first search (or when the box gets focus).
  const [search, setSearch] = useState<LearnSearchIndex | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const wantSearch = useCallback(() => {
    loadLearnSearch().then(setSearch, () => setSearchFailed(true));
  }, []);
  useEffect(() => {
    if (query) wantSearch();
  }, [query, wantSearch]);
  const hits = useMemo(() => (search && query ? searchLearn(search, index, q) : null), [search, index, q, query]);
  useEffect(() => onSlash(() => box.current?.focus()), []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Learn</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Crash courses on the concepts behind the questions, with pictures and code in your language.
            <span className="hidden sm:inline">
              {' '}
              Highlighted terms in a question&apos;s <em>Explore topic</em> panel link straight to the right section.
            </span>
          </p>
          <div className="mt-3 flex items-center gap-3" title="A page counts as read once you reach its end">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-good transition-[width]" style={{ width: `${(readCount / Math.max(1, index.pages.length)) * 100}%` }} />
            </div>
            <span className="text-sm text-muted">
              <strong className="text-ink tabular-nums">{readCount}</strong> of {index.pages.length} read
            </span>
          </div>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent sm:w-80">
          <Search className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <input
            ref={box}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={wantSearch}
            onKeyDown={(e) => e.key === 'Escape' && setQ('')}
            placeholder="Search every page"
            aria-label="Search Learn pages"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bare-input bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded border border-line px-1.5 font-mono text-[10px] text-faint sm:inline" aria-hidden="true">
            /
          </kbd>
        </label>
      </div>
      {query && hits && <SearchResults hits={hits} q={q} learnRead={learnRead} onPick={() => q !== urlQ && setParams({ q }, { replace: true })} />}
      {query && !hits && searchFailed && <p className="text-sm text-warn">Couldn’t load the full-text index, so only titles and terms are searched.</p>}
      {!(query && hits) && (
        <>
          {!query && <RecentRow index={index} learnRead={learnRead} />}
          {!query && <JumpBar pages={pages} view={view} onView={setView} />}
          <LearnDirectory pages={pages} view={view} learnRead={learnRead} stats={stats.byTopic} anchors />
        </>
      )}
      {query && !hits && !pages.length && <p className="text-center text-muted">No topics match “{q}”.</p>}
    </div>
  );
}

/** "/" focuses search (unless already typing somewhere). Returns the cleanup. */
function onSlash(run: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || t?.closest('input, textarea, select, [contenteditable="true"], .cm-editor')) return;
    e.preventDefault();
    run();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

/** Search results: pages best first, each with its best sections and a snippet around the match. */
function SearchResults({ hits, q, learnRead, onPick }: { hits: PageHit[]; q: string; learnRead: Stamps | undefined; onPick(): void }) {
  const words = queryWords(q);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const sections = hits.reduce((n, h) => n + h.sections.length, 0);
  const findQ = encodeURIComponent(q.trim());
  if (!hits.length) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold">Nothing matches “{q.trim()}”.</p>
        <p className="mt-1 text-sm text-muted">Every word has to appear in the same section. Try fewer or shorter words.</p>
      </Card>
    );
  }
  return (
    <section aria-label="Search results" className="space-y-3">
      <p className="text-sm text-muted">
        {sections} section{sections === 1 ? '' : 's'} in {hits.length} page{hits.length === 1 ? '' : 's'}
      </p>
      {hits.slice(0, 30).map((h) => {
        const shown = open[h.slug] ? h.sections : h.sections.slice(0, 3);
        return (
          <Card key={h.slug} className="p-2">
            <Link to={`/learn/${h.slug}?find=${findQ}`} onClick={onPick} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-soft">
                <TopicIcon id={h.slug} className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg leading-snug font-semibold">
                  <Marked text={h.title} words={words} />
                </span>
                {!h.sections.length && <span className="line-clamp-1 text-sm text-muted">{h.summary}</span>}
              </span>
              {isOn(learnRead, h.slug) && <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good">✓ Read</span>}
            </Link>
            {shown.length > 0 && (
              <ul className="mt-1 ml-[3.25rem] space-y-0.5 border-l border-line pb-1">
                {shown.map((s) => (
                  <li key={s.id || '_'}>
                    <Link
                      to={`/learn/${h.slug}?find=${findQ}${s.id ? `#${s.id}` : ''}`}
                      onClick={onPick}
                      className="-ml-px block rounded-r-xl border-l-2 border-transparent py-1.5 pr-2 pl-3 hover:border-accent hover:bg-surface-2"
                    >
                      <span className="block text-sm font-semibold text-ink">
                        <Marked text={s.heading} words={words} />
                      </span>
                      {s.snippet && (
                        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-muted">
                          <Marked text={s.snippet} words={words} />
                        </span>
                      )}
                      {s.inCode && <span className="mt-0.5 block text-xs text-faint">{s.snippet ? 'Also in the code' : 'In the code'}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {h.sections.length > 3 && (
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [h.slug]: !o[h.slug] }))}
                className="mb-1 ml-[3.25rem] rounded-lg px-3 py-1 text-xs font-semibold text-accent-soft hover:bg-surface-2"
              >
                {open[h.slug] ? 'Show fewer' : `${h.sections.length - 3} more section${h.sections.length - 3 === 1 ? '' : 's'}`}
              </button>
            )}
          </Card>
        );
      })}
    </section>
  );
}

function Marked({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {markParts(text, words).map((p, i) =>
        p.hit ? (
          <mark key={i} className="find-mark">
            {p.s}
          </mark>
        ) : (
          p.s
        ),
      )}
    </>
  );
}

function Article({ slug, index }: { slug: string; index: LearnIndex }) {
  const [page, setPage] = useState<LearnPageData | null>(null);
  const [missing, setMissing] = useState(false);
  const terms = useLearnTerms();
  const { hash, state } = useLocation();
  const navigate = useNavigate();
  const cameFromGame = !!(state as { from?: string } | null)?.from;
  const topic = TOPIC_BY_ID.get(slug);
  const guide = GUIDE_BY_ID.get(slug);
  const read = useStore((s) => isOn(s.learnRead, slug));
  const setLearnRead = useStore((s) => s.setLearnRead);
  const end = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  // Find on page: opened by the button, the / key, or a search result link (?find=words#section).
  const [params, setParams] = useSearchParams();
  const [find, setFind] = useState<{ q: string; anchor?: string; focus: boolean } | null>(() => {
    const q = params.get('find');
    return q ? { q, anchor: decodeURIComponent(hash.slice(1)) || undefined, focus: false } : null;
  });
  const findOwnsScroll = useRef(!!find);
  const openFind = () => setFind((f) => f ?? { q: '', focus: true });
  const closeFind = () => {
    setFind(null);
    if (params.has('find')) {
      const next = new URLSearchParams(params);
      next.delete('find');
      setParams(next, { replace: true, state, preventScrollReset: true });
    }
  };
  useEffect(() => onSlash(() => setFind((f) => f ?? { q: '', focus: true })), []);

  // Reaching the end of the page after at least 15 s on it marks it read (a quick scroll past doesn't).
  useEffect(() => {
    if (!page || read || !end.current) return;
    const opened = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const wait = Math.max(0, 15_000 - (Date.now() - opened));
      clearTimeout(timer);
      timer = setTimeout(() => setLearnRead(slug, true), wait);
    });
    io.observe(end.current);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [page, read, slug, setLearnRead]);

  useEffect(() => {
    let alive = true;
    loadLearnPage(slug).then(
      (p) => alive && setPage(p),
      () => alive && setMissing(true),
    );
    return () => {
      alive = false;
    };
  }, [slug]);

  // Jump to the linked section once the page is on screen (or to the top for a new page).
  useEffect(() => {
    if (!page) return;
    // Arriving from a search result, the find bar scrolls to the first match in that section instead.
    if (findOwnsScroll.current) {
      findOwnsScroll.current = false;
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    else window.scrollTo({ top: 0 });
  }, [page, hash]);

  const heads = useMemo(() => (page ? headingsOf(page.md) : []), [page]);
  // The heading on screen: lights the contents list, names the section in the bar, and is where a
  // later visit from the index resumes.
  const headIds = useMemo(() => heads.map((h) => h.id), [heads]);
  const active = useScrollSpy(headIds, !!page);
  useEffect(() => {
    if (page) noteRecent({ slug, id: active || undefined, text: heads.find((h) => h.id === active)?.text });
  }, [page, slug, active, heads]);
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const learnRead = useStore((s) => s.learnRead);
  /** Scroll to a heading ('' is the top) and put it in the address, so the link can be shared. */
  const jump = (id: string) => {
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
    navigate({ search: params.toString(), hash: id }, { replace: true, state, preventScrollReset: true });
  };
  // The article is parsed once: scrolling (which moves the current section) never re-renders it.
  const article = useMemo(
    () =>
      page && (
        <Markdown rich terms={terms} selfHref={`/learn/${slug}`} className="learn-article mt-6">
          {page.md}
        </Markdown>
      ),
    [page, terms, slug],
  );
  const order = index.pages.map((p) => p.slug);
  const at = order.indexOf(slug);
  const prev = at > 0 ? index.pages[at - 1] : null;
  const next = at >= 0 && at < order.length - 1 ? index.pages[at + 1] : null;

  if (missing) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-3xl">📚</p>
        <p className="mt-3 font-semibold">{topic ? `The ${topic.label} page isn’t written yet.` : 'There’s no page here.'}</p>
        <Link to="/learn" className="mt-3 inline-block text-sm text-accent-soft underline">
          All Learn pages
        </Link>
      </Card>
    );
  }
  if (!page) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SectionBar title={page.title} heads={heads} active={active} onOpen={() => setSheet(true)} onFind={openFind} />
      <NavSheet open={sheet} onClose={closeSheet} title={page.title} heads={heads} active={active} onJump={jump} index={index} slug={slug} learnRead={learnRead} />
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Toc heads={heads} active={active} onJump={jump} />
        </aside>

        <article className="min-w-0 max-w-[54rem]">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {cameFromGame ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-semibold text-accent-soft hover:bg-accent/15"
              >
                ← Back to the question
              </button>
            ) : (
              <Link to="/learn" className="font-semibold text-muted hover:text-ink lg:hidden">
                ← All topics
              </Link>
            )}
            {topic && (
              <span className="text-faint">
                {AREA_LABEL[topic.area]} · {topic.group}
              </span>
            )}
            {guide && <span className="text-faint">{GUIDES_LABEL}</span>}
          </div>
          <div ref={body}>
            <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-semibold sm:text-4xl">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent-soft">
                <TopicIcon id={slug} className="size-6" />
              </span>
              {page.title}
            </h1>
            <p className="mt-2 max-w-[68ch] text-lg text-muted">{page.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-faint" data-find-skip>
              <span>
                {index.pages[at]?.minutes ?? 1} min read
                {guide ? '' : ' · code follows the language picker'}
                {read && <span className="ml-2 font-semibold text-good">✓ Read</span>}
              </span>
              <button
                type="button"
                onClick={openFind}
                className="hidden items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 font-semibold text-muted hover:border-faint hover:text-ink lg:inline-flex"
                title="Find on this page (/)"
              >
                <Search className="size-3.5" aria-hidden="true" />
                Find on page
                <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] text-faint sm:inline">/</kbd>
              </button>
            </div>

            {article}
          </div>
          {find && <FindBar root={body} initial={find.q} anchor={find.anchor} focus={find.focus} source={`${page.title}\n${page.summary}\n${page.md}`} onClose={closeFind} />}

          <div ref={end} className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line/70 px-4 py-3 text-sm">
            <span className={read ? 'font-semibold text-good' : 'text-muted'}>{read ? '✓ You’ve read this page' : 'Reached the end? It counts as read.'}</span>
            <button
              type="button"
              onClick={() => setLearnRead(slug, !read)}
              className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:border-faint hover:text-ink"
            >
              {read ? 'Mark as unread' : 'Mark as read'}
            </button>
          </div>

          {page.related.length > 0 && (
            <div className="mt-8 border-t border-line pt-5">
              <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Related</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {page.related.map((r) => {
                  const exists = order.includes(r);
                  return exists ? (
                    <Link key={r} to={`/learn/${r}`} className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink hover:border-faint">
                      {learnLabel(r)}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link to={`/learn/${prev.slug}`} className="rounded-2xl border border-line p-4 hover:border-faint">
                <span className="text-xs text-faint">← Previous</span>
                <span className="block font-semibold">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/learn/${next.slug}`} className="rounded-2xl border border-line p-4 text-right hover:border-faint">
                <span className="text-xs text-faint">Next →</span>
                <span className="block font-semibold">{next.title}</span>
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
