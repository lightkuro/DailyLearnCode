import type { EditorView } from '@codemirror/view';
import { create } from 'zustand';

/** Lets the syntax tray insert snippets into whichever solution editor is on screen. */
export const useActiveEditor = create<{ view: EditorView | null }>(() => ({ view: null }));

export function setActiveEditor(view: EditorView | null): void {
  useActiveEditor.setState({ view });
}

/** Insert text at the cursor, re-indenting continuation lines to the cursor's indentation. */
export function insertIntoEditor(text: string): boolean {
  const view = useActiveEditor.getState().view;
  if (!view) return false;
  const { state } = view;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const indent = /^\s*/.exec(line.text)?.[0] ?? '';
  const body = text.replace(/\n/g, `\n${indent}`);
  view.dispatch(state.replaceSelection(body));
  view.focus();
  return true;
}
