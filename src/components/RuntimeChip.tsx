import { useRuntimeStatus } from '../runner/manager';
import { LANG_LABEL, type Lang } from '../runner/harness/types';
import { Spinner } from './ui';

export function RuntimeChip({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const s = useRuntimeStatus((st) => st[lang]);
  const label = LANG_LABEL[lang];
  let body: React.ReactNode;
  let tone = 'text-muted';
  if (s.state === 'ready') {
    body = <>● {label} ready</>;
    tone = 'text-good';
  } else if (s.state === 'loading') {
    const pct = s.progress !== undefined && s.progress < 1 ? ` ${Math.round(s.progress * 100)}%` : '';
    body = (
      <>
        <Spinner className="size-3" /> {compact ? label : (s.message ?? `Loading ${label}`)}
        {pct}
      </>
    );
    tone = 'text-warn';
  } else if (s.state === 'error') {
    body = <>⚠ {label} unavailable</>;
    tone = 'text-bad';
  } else {
    body = <>○ {label} loads on first run</>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${tone}`} title={s.message} role="status">
      {body}
    </span>
  );
}
