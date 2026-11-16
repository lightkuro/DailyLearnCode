/**
 * Everything specific to one deployment of the site, in one place. Set the VITE_* values as build
 * variables (or in .env.local); see .env.example and the README.
 */

// import.meta.env exists in Vite builds and tests; Node scripts (tsx) that import shared code have none.
const ENV: Record<string, string | undefined> = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/** "https://example.com" → "https://example.com" (no trailing slash), or undefined when not set or invalid. */
function siteUrl(v: string | undefined): string | undefined {
  const raw = env(v);
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return undefined;
  }
}

const url = siteUrl(ENV.VITE_SITE_URL);

export const SITE = {
  /** The product name: header, page title, share text, backup and Drive file names. */
  name: 'dailylearncode',
  /** The credit in the footer. */
  credit: { label: 'made by kurolight', href: 'https://kurolight.dev' },
  /** Where this copy is deployed (VITE_SITE_URL). Used in share text and to tell production from previews. */
  url,
  /** The production hostname, if VITE_SITE_URL is set. */
  host: url ? new URL(url).hostname : undefined,
  /** Your privacy policy and terms (VITE_PRIVACY_URL / VITE_TERMS_URL): footer and About links appear only when set. */
  privacyUrl: env(ENV.VITE_PRIVACY_URL),
  termsUrl: env(ENV.VITE_TERMS_URL),
} as const;
