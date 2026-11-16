import { MessageSquareOff, MessageSquareText } from 'lucide-react';
import { useMemo } from 'react';
import { stripComments } from '../content/comments';
import { useStore } from '../game/store';
import type { Lang } from '../runner/harness/types';

/** Whether code comments are shown (solutions and Learn code; on by default, synced with the other settings). */
export function useCodeComments(): [boolean, (on: boolean) => void] {
  const on = useStore((s) => s.settings.codeComments ?? true);
  const set = useStore((s) => s.setCodeComments);
  return [on, set];
}

/** `code` as it should be shown: with or without its comments. */
export function useShownCode(code: string, lang: Lang): string {
  const [on] = useCodeComments();
  return useMemo(() => (on ? code : stripComments(code, lang)), [on, code, lang]);
}

/** Small switch that shows or hides comments in code (one setting for every code block). */
export function CommentsToggle({ className = '' }: { className?: string }) {
  const [on, set] = useCodeComments();
  const Icon = on ? MessageSquareText : MessageSquareOff;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      title={on ? 'Hide code comments' : 'Show code comments'}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${on ? 'text-accent-soft hover:bg-surface-2' : 'text-faint hover:bg-surface-2 hover:text-muted'} ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      Comments
    </button>
  );
}
