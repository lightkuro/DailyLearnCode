import { useEffect, useState } from 'react';

/** Getting around Learn, the browser side: the index view, the pages opened last, and the heading on screen. */

// ---------- index view ----------

/** `compact`: small tiles, many to a screen. `cards`: a card per page with its summary and stats. */
export type LearnView = 'compact' | 'cards';
const VIEW_KEY = 'learn:index-view';

/** The index layout, remembered on this device. Phones start compact, wider screens with cards. */
export function useLearnView(): [LearnView, (v: LearnView) => void] {
  const [view, setView] = useState<LearnView>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'compact' || v === 'cards') return v;
    } catch {
      // Storage is blocked: fall through to the screen-size default.
    }
    return typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches ? 'compact' : 'cards';
  });
  return [
    view,
    (v) => {
      setView(v);
      try {
        localStorage.setItem(VIEW_KEY, v);
      } catch {
        // Not remembered, still switched.
      }
    },
  ];
}

// ---------- recently opened ----------

export interface Recent {
  slug: string;
  /** The heading the reader was at (absent at the top of the page). */
  id?: string;
  text?: string;
}
const RECENT_KEY = 'learn:recent';
const RECENT_MAX = 4;

export function loadRecents(): Recent[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    if (!Array.isArray(v)) return [];
    return v.filter((r): r is Recent => !!r && typeof r === 'object' && typeof (r as Recent).slug === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Put a page at the front of the recent list, with the section the reader is at. */
export function noteRecent(r: Recent): void {
  try {
    const next = [r, ...loadRecents().filter((x) => x.slug !== r.slug)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage is blocked: nothing to remember.
  }
}

// ---------- scroll-spy ----------

/**
 * The id of the element the reader is at: the last one (in `ids` order) whose top has passed `offset`
 * pixels from the top of the window. '' above the first. At the very bottom of the page it's the last
 * one on screen, since a short final section never reaches the top.
 */
export function useScrollSpy(ids: string[], ready: boolean, offset = 124): string {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!ready || !ids.length) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const line = atBottom ? window.innerHeight - 40 : offset;
      let cur = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) cur = id;
        else break;
      }
      // At the top of the page nothing is "current" yet, even if the first heading is on screen.
      setActive(window.scrollY < 8 ? '' : cur);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, [ids, ready, offset]);
  return active;
}
