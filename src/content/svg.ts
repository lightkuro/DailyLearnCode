/**
 * Safety/sanity check for generated SVG illustrations. They are rendered via <img src="data:...">,
 * which never executes script or loads external resources, so this is defence in depth plus a
 * quality gate (well-formed, small, self-contained, static).
 */
const ALLOWED_TAGS = new Set([
  'svg', 'g', 'defs', 'title', 'desc', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
  'text', 'tspan', 'lineargradient', 'radialgradient', 'stop', 'marker', 'clippath', 'mask', 'pattern', 'use', 'symbol',
]);

export function checkSvg(svg: string): string[] {
  const errors: string[] = [];
  const s = svg.trim();
  if (s.length > 40_000) errors.push(`too large (${s.length} chars)`);
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) errors.push('must be a single <svg> element');
  if (!/\bviewBox\s*=/.test(s)) errors.push('missing viewBox');
  if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/.test(s)) errors.push('missing xmlns');
  for (const m of s.matchAll(/<\s*\/?\s*([a-zA-Z][\w:-]*)/g)) {
    const tag = m[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) errors.push(`element <${tag}> not allowed`);
  }
  for (const m of s.matchAll(/\s([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? '').trim();
    if (name.startsWith('on')) errors.push(`event handler attribute ${name}`);
    if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) errors.push('external href');
    if (/url\(\s*['"]?(?!#)/i.test(value)) errors.push('external url() reference');
    if (/javascript:/i.test(value)) errors.push('javascript: URL');
  }
  if (/<!ENTITY|<!DOCTYPE|<\?xml-stylesheet/i.test(s)) errors.push('DOCTYPE/ENTITY not allowed');
  return [...new Set(errors)];
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}
