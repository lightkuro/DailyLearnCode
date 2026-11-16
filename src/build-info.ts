import { SITE } from './site';

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BRANCH__: string;
declare const __APP_CHANNEL__: 'production' | 'preview' | 'dev';
declare const __APP_BUILT_AT__: string;

/**
 * Production vs preview is decided by where the page is served, not by which branch built it.
 * With VITE_SITE_URL set, only that host is production and any other host is a preview; without it,
 * every deployed host counts as production.
 */
function channel(): 'production' | 'preview' | 'dev' {
  if (__APP_CHANNEL__ === 'dev') return 'dev';
  const host = typeof location === 'undefined' ? '' : location.hostname;
  if (!SITE.host || host === SITE.host) return host ? 'production' : __APP_CHANNEL__;
  return 'preview';
}

/** Injected at build time by vite.config.ts (version from package.json, commit/branch from Cloudflare or git). */
export const BUILD = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  branch: __APP_BRANCH__,
  channel: channel(),
  builtAt: __APP_BUILT_AT__,
};
