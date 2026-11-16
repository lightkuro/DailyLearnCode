import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Height that lets a sticky side column (syntax tray, altitude ruler) end where the page content
 * ends: from where it starts down to the bottom of the window, minus the footer, so a short page
 * (like a quiz) never gets a pointless scrollbar.
 */
export function useFitHeight(ref: RefObject<HTMLElement | null>, min = 320): number {
  const [h, setH] = useState(600);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const main = el.closest('main');
      const below =
        (main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0) +
        ([...document.querySelectorAll('body > #root footer, body > #root > nav')] as HTMLElement[]).reduce((s, x) => s + x.offsetHeight, 0) +
        20;
      setH(Math.max(min, Math.min(window.innerHeight - 96, window.innerHeight - top - below)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref, min]);
  return h;
}
