/**
 * Minimal static server for dist/ that mimics Cloudflare static assets:
 *  - applies public/_headers rules (incl. "! Header" detach), so CSP is exercised in tests
 *  - single-page-application fallback to index.html
 * Usage: tsx tests/e2e/serve.ts [port]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const DIST = join(import.meta.dirname, '../../dist');
const PORT = Number(process.argv[2] ?? 4173);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

interface Rule {
  re: RegExp;
  detach: string[];
  set: [string, string][];
}

function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const pattern = line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      rules.push({ re: new RegExp(`^${pattern}$`), detach: [], set: [] });
      continue;
    }
    const rule = rules[rules.length - 1];
    const t = line.trim();
    if (t.startsWith('!')) rule.detach.push(t.slice(1).trim().toLowerCase());
    else {
      const i = t.indexOf(':');
      rule.set.push([t.slice(0, i).trim().toLowerCase(), t.slice(i + 1).trim()]);
    }
  }
  return rules;
}

const rules = existsSync(join(DIST, '_headers')) ? parseHeaders(readFileSync(join(DIST, '_headers'), 'utf8')) : [];

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = decodeURIComponent(url.pathname);
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  // Mimic Cloudflare's default html_handling ("auto-trailing-slash"): /page.html → 307 /page,
  // and /page serves page.html. Header rules then match the extensionless path.
  if (path.endsWith('.html') && path !== '/index.html' && existsSync(file)) {
    res.writeHead(307, { location: path.slice(0, -5) }).end();
    return;
  }
  if (!extname(path) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    if (extname(path)) {
      res.writeHead(404).end('not found');
      return;
    }
    file = join(DIST, 'index.html');
  }
  const headers = new Map<string, string>();
  for (const r of rules) {
    if (!r.re.test(url.pathname)) continue;
    for (const d of r.detach) headers.delete(d);
    for (const [k, v] of r.set) headers.set(k, headers.has(k) ? `${headers.get(k)}, ${v}` : v);
  }
  headers.set('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.writeHead(200, Object.fromEntries(headers));
  res.end(readFileSync(file));
}).listen(PORT, '127.0.0.1', () => console.log(`serving dist on http://127.0.0.1:${PORT}`));
