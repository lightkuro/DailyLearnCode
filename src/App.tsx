import { MotionConfig } from 'motion/react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { BUILD } from './build-info';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { CodeMark, Wordmark } from './components/Brand';
import { SITE } from './site';
import { ConfirmDialog } from './components/ui';
import { useStore } from './game/store';
import { useApplyTheme, useResolvedTheme } from './game/theme';
import { PracticePage } from './pages/PracticePage';
import { UnlimitedPage } from './pages/UnlimitedPage';
import { TodayPage } from './pages/TodayPage';
import { LANGS, LANG_LABEL, type Lang } from './runner/harness/types';
import { AccountButton, RenewNotice } from './components/SyncButton';
import { useApplyCodeFont } from './components/FontSettings';
import { KeyBar } from './components/KeyBar';
import { SettingsMenu, useApplyCodeWrap } from './components/SettingsMenu';
import { PAGE_ICON } from './components/icons';
import { startAutoSync } from './sync/sync';

const ArchivePage = lazy(() => import('./pages/ArchivePage').then((m) => ({ default: m.ArchivePage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const PatchNotesPage = lazy(() => import('./pages/PatchNotesPage').then((m) => ({ default: m.PatchNotesPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const DetectivePage = lazy(() => import('./pages/DetectivePage').then((m) => ({ default: m.DetectivePage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then((m) => ({ default: m.LearnPage })));

const LANG_SHORT: Record<Lang, string> = { python3: 'Python', java: 'Java', cpp: 'C++' };

/** Global language picker: drives the editor, the syntax tray and language-specific quiz questions. */
function LangPicker() {
  const lang = useStore((s) => s.settings.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <div className="flex rounded-full border border-line bg-surface-2/80 p-0.5" role="radiogroup" aria-label="Programming language">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          title={LANG_LABEL[l]}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors sm:py-1 sm:text-xs ${
            lang === l ? 'bg-accent text-white shadow' : 'text-muted hover:text-ink'
          }`}
        >
          <span className="sm:hidden">{l === 'python3' ? 'Py' : LANG_SHORT[l]}</span>
          <span className="hidden sm:inline">{LANG_SHORT[l]}</span>
        </button>
      ))}
    </div>
  );
}

/** Light ↔ dark. ("Match system" is on the Account page; then this shows and flips the current look.) */
function ThemeToggle() {
  const setTheme = useStore((s) => s.setTheme);
  const resolved = useResolvedTheme();
  const next = resolved === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="hidden size-9 place-items-center rounded-lg text-base text-muted hover:bg-surface-2 hover:text-ink sm:grid"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {resolved === 'light' ? (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

interface PageLink {
  to: string;
  label: string;
  /** Only in the header from lg up (between md and lg there's no room beside the language picker). */
  wide?: boolean;
}
const PAGES: PageLink[] = [
  { to: '/', label: 'Today' },
  { to: '/unlimited', label: 'Unlimited' },
  { to: '/detective', label: 'Detective' },
  { to: '/learn', label: 'Learn' },
  { to: '/stats', label: 'Stats' },
  { to: '/about', label: 'About', wide: true },
];

/**
 * A page as an icon in the header, with its name in a small label on hover / keyboard focus.
 * `named` pages (Today) also show their name beside the icon once there's room.
 */
function NavIcon({ page, active, named = false }: { page: PageLink; active?: boolean; named?: boolean }) {
  const Icon = PAGE_ICON[page.to];
  return (
    <NavLink
      to={page.to}
      end={page.to === '/'}
      aria-label={page.label}
      className={({ isActive }) =>
        `group relative h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg transition-colors ${page.wide ? 'hidden lg:flex' : 'flex'} ${named ? 'lg:px-2.5' : ''} ${(active ?? isActive) ? 'bg-surface-3 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'}`
      }
    >
      {Icon && <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />}
      {named && (
        <span className="hidden text-sm font-semibold lg:inline" aria-hidden="true">
          {page.label}
        </span>
      )}
      <span
        className={`pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-bg opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${named ? 'lg:hidden' : ''}`}
      >
        {page.label}
      </span>
    </NavLink>
  );
}

/** The page a path belongs to (day pages count as Today; the archive as Stats). */
function pageFor(pathname: string): PageLink | undefined {
  if (pathname === '/' || pathname.startsWith('/day')) return PAGES[0];
  if (pathname.startsWith('/archive')) return PAGES.find((p) => p.to === '/stats');
  return PAGES.find((p) => p.to !== '/' && pathname.startsWith(p.to));
}

/**
 * Below md, where the page icons don't fit: a pill like the account button, the logo (home) on the left and the
 * current page's icon on the right, which opens a list of every page. Taps toggle it; it closes on navigation,
 * a tap outside or Escape.
 */
function PagePill() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
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
  const current = pageFor(pathname);
  const Icon = (current && PAGE_ICON[current.to]) || LayoutGrid;
  return (
    <div ref={box} className="relative md:hidden">
      {/* A rounded rectangle (not a pill): the logo is a rounded square, so the corners follow its shape. */}
      <div className={`flex h-9 items-center gap-0.5 rounded-[11px] border bg-surface-2/80 p-[3px] transition-colors ${open ? 'border-faint' : 'border-line'}`}>
        <Link to="/" aria-label={`${SITE.name}: today's set`} className="rounded-lg outline-offset-2">
          <CodeMark className="size-7" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={`Pages${current ? ` (now: ${current.label})` : ''}`}
          className="flex h-full items-center gap-0.5 rounded-lg pr-1.5 pl-1 text-muted transition-colors hover:text-ink"
        >
          <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-2 min-w-44 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl" aria-label="Pages">
          {PAGES.map((p) => {
            const PIcon = PAGE_ICON[p.to];
            const active = current?.to === p.to;
            return (
              <li key={p.to}>
                <Link
                  to={p.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold ${active ? 'bg-surface-3 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}
                >
                  {PIcon && <PIcon className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Header() {
  const { pathname } = useLocation();
  // The archive is reached from Stats, so Stats stays highlighted there.
  const statsActive = pathname.startsWith('/stats') || pathname.startsWith('/archive');
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur-lg">
      {/* Three columns on every screen: logo + pages | language picker (centred) | settings + account. */}
      <div className="mx-auto grid h-14 max-w-[2400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <PagePill />
          <span className="hidden md:contents">
            <Wordmark />
          </span>
          {BUILD.channel !== 'production' && (
            <span
              className="hidden rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-warn uppercase 2xl:inline"
              title={`${BUILD.channel} build of ${BUILD.branch} @ ${BUILD.commit}`}
            >
              {BUILD.channel}
            </span>
          )}
          {/* From md up: every page as an icon (names on hover). Below md: the page pill (logo + current page). */}
          <nav className="hidden items-center gap-0.5 md:flex xl:ml-2" aria-label="Pages">
            {PAGES.map((p) => (
              <NavIcon key={p.to} page={p} named={p.to === '/'} active={p.to === '/stats' ? statsActive : undefined} />
            ))}
          </nav>
        </div>
        <LangPicker />
        <div className="flex items-center justify-self-end gap-1 sm:gap-1.5">
          {BUILD.channel !== 'production' && <PreviewReset />}
          <ThemeToggle />
          <SettingsMenu />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

/** Preview builds only: wipe progress (settings stay) to replay flows from scratch. */
function PreviewReset() {
  const resetProgress = useStore((s) => s.resetProgress);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 shrink-0 items-center whitespace-nowrap rounded-lg border border-warn/40 px-2 text-xs font-semibold text-warn hover:bg-warn/10 xl:inline-flex"
        title="Preview builds only: reset all progress"
      >
        ↺ Reset
      </button>
      <ConfirmDialog
        open={open}
        title="Reset progress on this preview?"
        body="Clears every day's answers, code, scores and streak in this browser (this preview's storage only; settings stay)."
        confirmLabel="Reset progress"
        variant="danger"
        onConfirm={() => {
          resetProgress();
          setOpen(false);
          location.assign('/');
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-5xl font-semibold">404</p>
      <p className="mt-2 text-muted">Looks like this page got rained out.</p>
      <Link to="/" className="mt-4 inline-block text-accent-soft underline">
        Back to today&apos;s set
      </Link>
    </div>
  );
}

export function App() {
  useApplyTheme();
  useApplyCodeWrap();
  useApplyCodeFont();
  useEffect(() => startAutoSync(), []);
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Header />
        <RenewNotice />
        <KeyBar />
        <main className="mx-auto max-w-[2400px] px-4 py-5 sm:py-6 lg:px-8">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/day/:date" element={<PracticePage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/unlimited" element={<UnlimitedPage />} />
              <Route path="/detective" element={<DetectivePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/learn/:slug" element={<LearnPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/patch-notes" element={<PatchNotesPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <nav className="mx-auto flex max-w-md flex-wrap justify-center gap-1 px-4 pt-6 sm:hidden" aria-label="More pages">
          {[
            ['/', 'Today'],
            ['/unlimited', 'Unlimited'],
            ['/detective', 'Detective'],
            ['/learn', 'Learn'],
            ['/stats', 'Stats'],
            ['/about', 'About'],
          ].map(([to, label]) => {
            const Icon = PAGE_ICON[to];
            return (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-surface-3 text-ink' : 'text-muted'}`}
              >
                {Icon && <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                {label}
              </NavLink>
            );
          })}
        </nav>
        <footer className="mx-auto flex max-w-[2400px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 pt-6 pb-20 text-xs text-faint sm:pt-4 sm:pb-3">
          <a href={SITE.credit.href} target="_blank" rel="noopener" className="text-muted hover:text-ink">
            {SITE.credit.label}
          </a>
          <span>·</span>
          <span>Code runs in your browser: Python via Pyodide, C++ via LLVM/Clang, Java</span>
          <a href="https://cheerpj.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted">
            Built with CheerpJ
          </a>
          <span>·</span>
          <Link to="/about" className="underline underline-offset-2 hover:text-muted">
            About
          </Link>
          <span>·</span>
          <Link to="/account" className="underline underline-offset-2 hover:text-muted">
            Account
          </Link>
          {SITE.privacyUrl && (
            <>
              <span>·</span>
              <a href={SITE.privacyUrl} className="underline underline-offset-2 hover:text-muted">
                Privacy
              </a>
            </>
          )}
          {SITE.termsUrl && (
            <>
              <span>·</span>
              <a href={SITE.termsUrl} className="underline underline-offset-2 hover:text-muted">
                Terms
              </a>
            </>
          )}
          <span>·</span>
          <Link to="/patch-notes" className="font-mono text-faint hover:text-muted" title={`Patch notes · built ${new Date(BUILD.builtAt).toLocaleString()}`}>
            v{BUILD.version}
            {BUILD.channel !== 'production' && <span className="ml-1.5 text-warn">({BUILD.channel === 'preview' ? `preview: ${BUILD.branch}` : 'dev'})</span>}
          </Link>
        </footer>
      </BrowserRouter>
    </MotionConfig>
  );
}
