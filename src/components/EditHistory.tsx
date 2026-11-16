import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands';
import { Redo2, Undo2 } from 'lucide-react';
import { useActiveEditor } from './editorBridge';

/**
 * Undo and redo for the solution editor, for touch screens (no Ctrl+Z there; hidden where a mouse is present).
 * The history is CodeMirror's own, in memory only: nothing is stored, and it starts fresh per problem and language.
 * `code` is passed only so these re-render after every edit and the disabled states stay current.
 */
export function EditHistoryButtons({ code }: { code: string }) {
  const view = useActiveEditor((s) => s.view);
  void code;
  const canUndo = !!view && undoDepth(view.state) > 0;
  const canRedo = !!view && redoDepth(view.state) > 0;
  const btn =
    'grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35';
  return (
    <span className="flex items-center [@media(hover:hover)]:hidden">
      <button
        type="button"
        className={btn}
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
        // Keep focus where it is, so the on-screen keyboard doesn't pop up or close.
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => view && undo(view)}
      >
        <Undo2 className="size-[18px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => view && redo(view)}
      >
        <Redo2 className="size-[18px]" aria-hidden="true" />
      </button>
    </span>
  );
}
