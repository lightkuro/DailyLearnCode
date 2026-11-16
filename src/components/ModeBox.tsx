import { ArrowUpRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { topicsOf } from '../content/topics';
import { isOn } from '../game/review';
import { useStore } from '../game/store';
import { PAGE_ICON, TopicIcon } from './icons';

export const MODES = [
  { to: '/', label: 'Daily', blurb: 'Today’s five stages' },
  { to: '/unlimited', label: 'Unlimited', blurb: 'Endless rounds' },
  { to: '/detective', label: 'Detective', blurb: 'Find the bug' },
  { to: '/learn', label: 'Learn', blurb: 'Crash courses' },
] as const;

/** Small panel beside the quiz (when there's room): every mode, plus Learn pages for this question. */
export function ModeBox({ tags, className = '', style }: { tags?: readonly string[]; className?: string; style?: React.CSSProperties }) {
  const { pathname } = useLocation();
  const topics = topicsOf(tags ?? []).slice(0, 3);
  const learnRead = useStore((s) => s.learnRead);
  return (
    <aside className={`w-52 rounded-2xl border border-line/70 bg-surface/80 p-2 text-sm shadow-lg backdrop-blur-md ${className}`} style={style} aria-label="Modes">
      <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">Modes</p>
      <ul>
        {MODES.map((m) => {
          const active = m.to === '/' ? pathname === '/' || pathname.startsWith('/day/') : pathname.startsWith(m.to);
          return (
            <li key={m.to}>
              <NavLink
                to={m.to}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors ${active ? 'bg-accent/12 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}
              >
                {(() => {
                  const Icon = PAGE_ICON[m.to];
                  return <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />;
                })()}
                <span className="min-w-0">
                  <span className="block leading-tight font-semibold">{m.label}</span>
                  {/* The one-line description slides open on hover (or keyboard focus) only. */}
                  <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                    <span className="block truncate overflow-hidden text-[11px] text-faint">{m.blurb}</span>
                  </span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      {topics.length > 0 && (
        <>
          <p className="mt-2 border-t border-line/70 px-2 pt-2.5 pb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">On this topic</p>
          <ul>
            {topics.map((t) => (
              <li key={t.id}>
                {/* A new tab, so the question stays where it is. */}
                <a
                  href={`/learn/${t.id}`}
                  target="_blank"
                  rel="noopener"
                  title={`${t.label} (opens in a new tab)`}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-accent-soft hover:bg-surface-2"
                >
                  <TopicIcon id={t.id} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 leading-snug font-semibold">{t.label}</span>
                  {isOn(learnRead, t.id) && (
                    <span className="text-xs text-good" title="You've read this page">
                      ✓
                    </span>
                  )}
                  <ArrowUpRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
