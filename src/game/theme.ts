import { useEffect, useSyncExternalStore } from 'react';
import { useStore, type ThemePref } from './store';

const query = () => window.matchMedia('(prefers-color-scheme: light)');

function subscribe(cb: () => void) {
  const mq = query();
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function resolveTheme(pref: ThemePref, systemLight: boolean): 'light' | 'dark' {
  return pref === 'system' ? (systemLight ? 'light' : 'dark') : pref;
}

/** The theme actually in use ('light' | 'dark'), following the OS when set to "system". */
export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useStore((s) => s.settings.theme ?? 'light');
  const systemLight = useSyncExternalStore(subscribe, () => query().matches, () => false);
  return resolveTheme(pref, systemLight);
}

/** Keeps <html data-theme> in sync (public/theme-init.js sets it before first paint). */
export function useApplyTheme(): void {
  const theme = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f5f8' : '#0c0e13');
  }, [theme]);
}
