import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { indentUnit, syntaxTree } from '@codemirror/language';
import { history, historyField } from '@codemirror/commands';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, keymap, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '../game/media';
import { useStore } from '../game/store';
import { useResolvedTheme } from '../game/theme';
import { loadUndo, saveUndo } from '../game/undoHistory';
import { useSync } from '../sync/sync';
import { useKeyBarShown } from './KeyBar';
import type { Lang } from '../runner/harness/types';
import { COMMENT_MARK } from '../syntax/highlight';
import { commentMarker, hangCols } from './CodeLines';
import { setActiveEditor, useActiveEditor } from './editorBridge';

const darkSurface = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-code)' },
    '.cm-gutters': { backgroundColor: 'var(--color-code)', borderRight: '1px solid var(--color-line)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--color-surface-3) 55%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in oklab, var(--color-surface-3) 55%, transparent)' },
  },
  { dark: true },
);
const lightSurface = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-code)', color: 'var(--color-ink)' },
    '.cm-gutters': { backgroundColor: 'var(--color-code)', color: 'var(--color-faint)', borderRight: '1px solid var(--color-line)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--color-accent) 6%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in oklab, var(--color-accent) 6%, transparent)' },
  },
  { dark: false },
);

/*
 * Wrapped lines hang 2ch past their own indentation, with a thin rail beside the wrapped part (as in
 * read-only code blocks, see index.css), so a continuation never looks like a new line. Wrapped comments
 * line up under their own text instead and need no rail: their highlight shows where they end. The gutter
 * numbers only the first row of each line.
 */
const hangDecos = new Map<string, Decoration>();
const hangDeco = (n: number, note: boolean) => {
  const key = `${n}${note ? 'c' : ''}`;
  let d = hangDecos.get(key);
  if (!d) hangDecos.set(key, (d = Decoration.line({ attributes: { class: note ? 'cm-hang cm-hang-note' : 'cm-hang', style: `--ind: ${n}ch` } })));
  return d;
};
/**
 * The line's leading whitespace in a span that never wraps. Without it the browser may break right after the
 * indent when the next word is long, leaving a row that holds nothing but spaces.
 */
const indentMark = Decoration.mark({ class: 'cm-ind' });
const hangingIndent = (lang: Lang) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
      }
      build(view: EditorView) {
        const b = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            b.add(line.from, line.from, hangDeco(hangCols(line.text, lang), commentMarker(line.text, lang) > 0));
            const ws = /^[ \t]*/.exec(line.text)![0].length;
            if (ws > 0 && ws < line.length) b.add(line.from, line.from + ws, indentMark);
            pos = line.to + 1;
          }
        }
        return b.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
const hangTheme = EditorView.baseTheme({
  '.cm-line.cm-hang': {
    position: 'relative',
    paddingLeft: 'calc(6px + var(--ind) + 2ch)',
    textIndent: 'calc(-1 * (var(--ind) + 2ch))',
  },
  '.cm-line.cm-hang .cm-ind': { whiteSpace: 'pre' },
  '.cm-line.cm-hang::before': {
    content: '""',
    position: 'absolute',
    left: 'calc(6px + var(--ind) + 0.6ch)',
    top: '1.15lh',
    bottom: '0.2lh',
    borderLeft: '2px solid color-mix(in oklab, var(--color-accent) 55%, transparent)',
    borderRadius: '2px',
    pointerEvents: 'none',
  },
  '.cm-line.cm-hang-note::before': { display: 'none' },
});
/**
 * A comment's words (not its "// " or "# " marker) get a light highlight, as in read-only code blocks
 * (.code-comment in index.css). Coding ligatures set to "comments" also apply through this class.
 */
const commentText = Decoration.mark({ class: 'cm-comment-text' });
const commentWords = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.decorations = this.build(u.view);
    }
    build(view: EditorView) {
      const b = new RangeSetBuilder<Decoration>();
      const tree = syntaxTree(view.state);
      for (const { from, to } of view.visibleRanges) {
        tree.iterate({
          from,
          to,
          enter: (node) => {
            if (!/Comment/.test(node.name)) return;
            const text = view.state.doc.sliceString(node.from, node.to);
            const start = node.from + (COMMENT_MARK.exec(text)?.[0].length ?? 0);
            if (start < node.to) b.add(start, node.to, commentText);
            return false;
          },
        });
      }
      return b.finish();
    }
  },
  { decorations: (v) => v.decorations },
);
const commentTheme = EditorView.baseTheme({
  '.cm-comment-text': {
    backgroundColor: 'color-mix(in oklab, currentColor 11%, transparent)',
    boxShadow: '0 0 0 1px color-mix(in oklab, currentColor 11%, transparent)',
    borderRadius: '3px',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
  },
});
const commentHighlight = [commentWords, commentTheme];
const wrapping = (lang: Lang) => [EditorView.lineWrapping, hangingIndent(lang), hangTheme];
/** Read-only code on phones (solutions): a little smaller and without line numbers, so more fits per row. */
const compactTheme = EditorView.theme({ '&': { fontSize: '12.5px' }, '.cm-content': { paddingLeft: '2px' } });

export function CodeEditor({
  lang,
  value,
  onChange,
  onRun,
  onSubmit,
  readOnly = false,
  height = '100%',
  undoKey,
}: {
  lang: Lang;
  value: string;
  onChange?: (v: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  /** This code file's id (day, stage, language): its undo history is kept with Drive sync (game/undoHistory). */
  undoKey?: string;
}) {
  const theme = useResolvedTheme();
  // Read-only snippets (editorial) always wrap. The solution editor wraps on phones unless the player chose
  // sideways scrolling in Settings; on wider screens it scrolls like an IDE.
  const phone = useMediaQuery('(max-width: 767.98px)');
  const scrollCode = useStore((s) => !!s.settings.scrollCode);
  const wrap = readOnly || (phone && !scrollCode);
  const compact = readOnly && phone;
  const barH = useKeyBarShown((k) => k.height);
  const keyBarH = readOnly ? 0 : barH;
  const extensions = useMemo(() => {
    const language = lang === 'python3' ? python() : lang === 'java' ? java() : cpp();
    const keys = keymap.of([
      { key: 'Mod-Enter', run: () => (onRun?.(), true) },
      { key: 'Mod-Shift-Enter', run: () => (onSubmit?.(), true) },
    ]);
    const surface = theme === 'light' ? lightSurface : darkSurface;
    // While the shortcut keys cover the bottom of the screen, keep the cursor's line above them.
    const keyBarRoom = keyBarH ? [EditorView.scrollMargins.of(() => ({ bottom: keyBarH + 8 }))] : [];
    return [language, indentUnit.of('    '), surface, ...commentHighlight, keys, ...keyBarRoom, ...(wrap ? wrapping(lang) : []), ...(compact ? [compactTheme] : [])];
  }, [lang, onRun, onSubmit, wrap, theme, compact, keyBarH]);

  const viewRef = useRef<EditorView | null>(null);
  useEffect(
    () => () => {
      if (viewRef.current && useActiveEditor.getState().view === viewRef.current) setActiveEditor(null);
    },
    [],
  );

  // Undo history that survives reloads and travels between devices, only while Drive sync (with code) is on.
  const keepUndo = useSync((s) => s.linked && s.prefs.code) && !!undoKey && !readOnly;
  // Restore it when the editor opens on exactly the code it was saved for (checked so a bad entry can't break it).
  const [initialState] = useState(() => {
    if (!keepUndo) return undefined;
    const saved = loadUndo(undoKey!, value) as { selection?: unknown; history?: unknown } | undefined;
    if (!saved?.history) return undefined;
    const json = { doc: value, selection: saved.selection ?? { ranges: [{ anchor: 0, head: 0 }], main: 0 }, history: saved.history };
    try {
      EditorState.fromJSON(json, { extensions: [history()] }, { history: historyField });
      return { json, fields: { history: historyField } };
    } catch {
      return undefined;
    }
  });
  // Save a second after the last edit, and when the editor closes.
  const saveT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveNow = () => {
    const v = viewRef.current;
    if (!keepUndo || !v) return;
    const j = v.state.toJSON({ history: historyField }) as { selection: unknown; history: unknown };
    saveUndo(undoKey!, v.state.doc.toString(), { selection: j.selection, history: j.history });
  };
  const saveRef = useRef(saveNow);
  saveRef.current = saveNow;
  useEffect(() => {
    if (!keepUndo) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => saveRef.current(), 1000);
  }, [value, keepUndo]);
  useEffect(
    () => () => {
      clearTimeout(saveT.current);
      saveRef.current();
    },
    [],
  );

  return (
    <CodeMirror
      onCreateEditor={(view) => {
        viewRef.current = view;
        if (!readOnly) setActiveEditor(view);
      }}
      value={value}
      initialState={initialState}
      onChange={onChange}
      theme={theme === 'light' ? 'light' : oneDark}
      extensions={extensions}
      readOnly={readOnly}
      height={height}
      basicSetup={{ tabSize: 4, foldGutter: false, lineNumbers: !compact, highlightActiveLine: !readOnly, autocompletion: true }}
      aria-label={`${lang} code editor`}
    />
  );
}
