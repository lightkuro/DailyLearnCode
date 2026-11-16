import { useId } from 'react';
import { Link } from 'react-router';
import { SITE } from '../site';

/** The site mark (also the favicon): code brackets around a dot. */
export function CodeMark({ className = 'size-7' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0a0c11" />
      <path d="M18 20l-8 12 8 12M46 20l8 12-8 12" fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="40" r="5" fill="#b4a0ff" />
    </svg>
  );
}

/** Wordmark: the logo and the site name, linking to today's set. */
export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-1.5" aria-label={`${SITE.name}: today's set`}>
      <CodeMark className="size-8 sm:size-7" />
      <span className="hidden font-display text-xl font-semibold tracking-tight sm:inline">{SITE.name}</span>
    </Link>
  );
}
