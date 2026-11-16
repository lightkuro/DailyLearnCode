import { useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';
import { breakSentences } from '../content/format';
import { groupCodeFences, slugify, type LearnTerm } from '../content/learn';
import { remarkTermLinks } from '../content/termLinks';
import { useStore } from '../game/store';
import { LANG_LABEL, type Lang } from '../runner/harness/types';
import { CodeLines } from './CodeLines';
import type { HiLang } from '../syntax/highlight';
import { CommentsToggle, useShownCode } from './CommentsToggle';
import { hasComments } from '../content/comments';
import { DiagramFence } from './Diagram';

/* Text content of a hast node (for heading ids and code fences). */
interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: string[] | string };
  children?: HastNode[];
}
const textOf = (n?: HastNode): string => (!n ? '' : n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(textOf).join(''));

const FENCE_LANG: Record<string, HiLang> = {
  python: 'python3',
  python3: 'python3',
  py: 'python3',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
  js: 'js',
  javascript: 'js',
  ts: 'js',
  typescript: 'js',
  jsx: 'js',
  tsx: 'js',
  sql: 'sql',
  bash: 'shell',
  sh: 'shell',
  shell: 'shell',
};

function CodeBlock({ code, lang }: { code: string; lang?: HiLang }) {
  return (
    <pre>
      <code>
        <CodeLines code={code} lang={lang} />
      </code>
    </pre>
  );
}

/** Python / Java / C++ versions of one snippet: shows the player's language, tabs for the rest. */
function CodeGroup({ json }: { json: string }) {
  const picked = useStore((s) => s.settings.lang);
  const group = useMemo(() => {
    try {
      return JSON.parse(json) as Partial<Record<Lang, string>>;
    } catch {
      return {};
    }
  }, [json]);
  const langs = (['python3', 'java', 'cpp'] as const).filter((l) => group[l] !== undefined);
  const [tab, setTab] = useState<Lang | null>(null);
  const shown = tab && group[tab] !== undefined ? tab : group[picked] !== undefined ? picked : langs[0];
  // The Comments switch only appears when the snippet has comments to hide.
  const commented = useMemo(() => (['python3', 'java', 'cpp'] as const).some((l) => group[l] !== undefined && hasComments(group[l]!, l)), [group]);
  const code = useShownCode(shown ? group[shown]! : '', shown ?? 'python3');
  if (!shown) return null;
  return (
    <div className="code-group">
      <div className="flex items-center gap-0.5 px-1.5 pt-1.5">
        <div className="flex gap-0.5" role="tablist" aria-label="Language">
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={l === shown}
              onClick={() => setTab(l)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${l === shown ? 'bg-surface-3 text-ink' : 'text-faint hover:text-muted'}`}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        {commented && <CommentsToggle className="ml-auto" />}
      </div>
      <CodeBlock code={code} lang={shown} />
    </div>
  );
}

/**
 * Renders untrusted (LLM-generated) Markdown safely: raw HTML is not enabled (no rehype-raw),
 * and react-markdown's default URL transform strips javascript:/data: links.
 * `breaks` puts each sentence on its own line.
 * `terms` links the first mention of each Learn term to its page (highlighted, clickable).
 * `rich` (Learn pages) adds heading anchors, ```diagram pictures and Python/Java/C++ code tabs.
 */
export function Markdown({
  children,
  className = '',
  breaks = false,
  terms,
  selfHref,
  rich = false,
  linkState,
}: {
  children: string;
  className?: string;
  breaks?: boolean;
  terms?: LearnTerm[];
  /** Don't link terms that point at this page. */
  selfHref?: string;
  rich?: boolean;
  /** Router state for internal links (e.g. where to come back to). */
  linkState?: unknown;
}) {
  const plugins = useMemo(() => [remarkGfm, ...(terms?.length ? [remarkTermLinks({ terms, skipPrefix: selfHref })] : [])], [terms, selfHref]);
  const components = useMemo<Components>(() => {
    const c: Components = {
      a: ({ href, children: kids, className: cls }) =>
        href?.startsWith('/') || href?.startsWith('#') ? (
          <Link to={href} className={cls} state={linkState}>
            {kids}
          </Link>
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {kids}
          </a>
        ),
      img: () => null,
    };
    // Code fences render line by line (so phones can wrap them); Learn pages add pictures and language tabs.
    c.pre = ({ node, children: kids }) => {
      const code = (node as HastNode | undefined)?.children?.find((x) => x.tagName === 'code');
      if (!code) return <pre>{kids}</pre>;
      const cls = code.properties?.className;
      const lang = (Array.isArray(cls) ? cls : [cls ?? '']).map(String).find((x) => x.startsWith('language-'))?.slice('language-'.length);
      const src = textOf(code).replace(/\n$/, '');
      if (rich && lang === 'diagram') return <DiagramFence source={src} />;
      if (rich && lang === 'codegroup') return <CodeGroup json={src} />;
      return <CodeBlock code={src} lang={lang ? FENCE_LANG[lang] : undefined} />;
    };
    if (rich) {
      const heading = (Tag: 'h2' | 'h3') =>
        function H({ node, children: kids }: { node?: unknown; children?: ReactNode }) {
          return <Tag id={slugify(textOf(node as HastNode))}>{kids}</Tag>;
        };
      c.h2 = heading('h2');
      c.h3 = heading('h3');
    }
    return c;
  }, [rich, linkState]);
  const text = rich ? groupCodeFences(children) : breaks ? breakSentences(children) : children;
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
