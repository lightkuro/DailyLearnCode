import raw from '../../content/patch-notes.md?raw';

/** One release in content/patch-notes.md ("## <version> — <YYYY-MM-DD>", an optional "### highlight", then Markdown). */
export interface Release {
  version: string;
  date: string;
  title?: string;
  md: string;
  /** Anchor on the patch notes page, e.g. "v0-10-0". */
  id: string;
}

export function parsePatchNotes(src: string): Release[] {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [head, ...rest] = part.split('\n');
      const m = /^(\S+)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/.exec(head.trim());
      const version = m?.[1] ?? head.trim();
      let md = rest.join('\n').trim();
      const t = /^### (.+)\n/.exec(md);
      if (t) md = md.slice(t[0].length).trim();
      return { version, date: m?.[2] ?? '', title: t?.[1].trim(), md, id: `v${version.replace(/\./g, '-')}` };
    });
}

/** Every release, newest first. */
export const RELEASES = parsePatchNotes(raw);
