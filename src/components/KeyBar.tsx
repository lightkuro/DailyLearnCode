import { cursorCharLeft, cursorCharRight, indentMore } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import type { EditorView } from '@codemirror/view';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { touchOnly } from '../sync/drive';
import { useStore } from '../game/store';
import { useActiveEditor } from './editorBridge';
import { keysFor, rowsFor, type Key } from './keybarKeys';

const SPECIAL: Record<string, { label: string; title: string; run: (v: EditorView) => void }> = {
  tab: {
    label: '⇥',
    title: 'Indent',
    // Spaces, never a tab character: Python rejects mixed tabs and spaces.
    run: (v) => {
      if (v.state.selection.ranges.some((r) => !r.empty)) indentMore(v);
      else v.dispatch(v.state.replaceSelection(v.state.facet(indentUnit)), { scrollIntoView: true });
    },
  },
  left: { label: '←', title: 'Cursor left', run: (v) => cursorCharLeft(v) },
  right: { label: '→', title: 'Cursor right', run: (v) => cursorCharRight(v) },
};

export const keyLabel = (k: string) => SPECIAL[k]?.label ?? k;
export { COMPACT_KEYS, MORE_KEYS, defaultKeys, formatKey, formatKeys, keysFor, parseKey, type Key } from './keybarKeys';

/**
 * Whether the bar is on screen and how tall it is, so floating buttons (the syntax opener) and the editor's
 * scrolling can keep clear of it.
 */
export const useKeyBarShown = create<{ shown: boolean; height: number }>(() => ({ shown: false, height: 0 }));

/** Where the bar sits: just above the on-screen keyboard (the bottom of the visual viewport). */
function useViewportBottom(): number | null {
  const [bottom, setBottom] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBottom(vv.offsetTop + vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return bottom;
}

/** True while the solution editor has focus (the on-screen keyboard is up). */
function useEditorFocused(view: EditorView | null): boolean {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!view) return setFocused(false);
    const sync = () => setFocused(view.hasFocus);
    sync();
    view.dom.addEventListener('focusin', sync);
    view.dom.addEventListener('focusout', sync);
    return () => {
      view.dom.removeEventListener('focusin', sync);
      view.dom.removeEventListener('focusout', sync);
    };
  }, [view]);
  return focused;
}

/** How long a press must last to open the hold options. */
const HOLD_MS = 350;

function type(view: EditorView, k: string): void {
  const special = SPECIAL[k];
  if (special) special.run(view);
  else view.dispatch(view.state.replaceSelection(k), { scrollIntoView: true });
}

/**
 * One key, iOS style: pressing shows the key magnified above your finger (it covers the key itself); holding opens
 * a row of options above it (the hold symbols, then the tap symbol), the first one picked. Slide sideways to pick
 * another and let go to type it. The first hold symbol shows small in the key's corner.
 */
function KeyButton({ k, view, align }: { k: Key; view: EditorView; align: 'left' | 'right' }) {
  const [phase, setPhase] = useState<'up' | 'down' | 'held'>('up');
  const [sel, setSel] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const optionsRef = useRef<HTMLDivElement>(null);
  const options = [...k.hold, k.tap];
  const reset = () => {
    clearTimeout(timer.current);
    setPhase('up');
    setSel(0);
  };
  // The option under the finger: nearest cell by x, so sliding past either end keeps the end one.
  const pick = (x: number) => {
    const cells = optionsRef.current ? [...optionsRef.current.children] : [];
    let best = 0;
    let dist = Infinity;
    cells.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(x - (r.left + r.width / 2));
      if (d < dist) [best, dist] = [i, d];
    });
    setSel(best);
  };
  const title = (s: string) => SPECIAL[s]?.title ?? s;
  return (
    <button
      type="button"
      title={k.hold.length ? `${title(k.tap)} (hold: ${k.hold.map(title).join(', ')})` : title(k.tap)}
      aria-label={k.hold.length ? `${keyLabel(k.tap)}, hold for ${k.hold.map(keyLabel).join(' ')}` : keyLabel(k.tap)}
      onPointerDown={(e) => {
        // Keep focus in the editor so the keyboard doesn't close; follow the finger even off the key.
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setPhase('down');
        if (k.hold.length)
          timer.current = setTimeout(() => {
            setPhase('held');
            setSel(0);
            navigator.vibrate?.(8);
          }, HOLD_MS);
      }}
      onPointerMove={(e) => phase === 'held' && pick(e.clientX)}
      onPointerUp={() => {
        if (phase === 'up') return;
        type(view, phase === 'held' ? options[sel] : k.tap);
        reset();
      }}
      onPointerCancel={reset}
      onContextMenu={(e) => e.preventDefault()}
      // Keyboard users (Enter / Space) get the tap symbol.
      onClick={(e) => e.detail === 0 && type(view, k.tap)}
      className={`relative h-[38px] min-w-0 flex-1 touch-none rounded-lg border font-mono font-semibold select-none [-webkit-touch-callout:none] ${
        phase === 'up' ? 'border-line bg-surface-2' : 'border-accent-soft/50 bg-surface-3'
      } text-ink`}
    >
      <span className="text-[15px] leading-none">{keyLabel(k.tap)}</span>
      {k.hold.length > 0 && (
        <span className="pointer-events-none absolute top-0.5 right-1 text-[9px] leading-none font-medium text-faint">{keyLabel(k.hold[0])}</span>
      )}
      {/* Magnified key while pressed (the finger hides the key itself). */}
      {phase === 'down' && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 grid h-12 min-w-11 -translate-x-1/2 place-items-center rounded-xl border border-line bg-surface px-2 text-2xl text-ink shadow-xl">
          {keyLabel(k.tap)}
        </span>
      )}
      {/* Hold options: grows toward the middle of the screen so it stays on it. */}
      {phase === 'held' && (
        <div
          ref={optionsRef}
          className={`pointer-events-none absolute bottom-full mb-1.5 flex gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-xl ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          {options.map((o, i) => (
            <span
              key={o + i}
              className={`grid h-11 min-w-10 place-items-center rounded-lg px-1.5 text-xl ${i === sel ? 'bg-accent text-white' : i === options.length - 1 ? 'text-muted' : 'text-ink'}`}
            >
              {keyLabel(o)}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/**
 * Rows of shortcut keys above the phone keyboard while editing code: the symbols code needs that phone keyboards
 * hide on other pages. Touch screens only; switch it off in the gear menu, change the keys on the Account page.
 * Up to ROW_MAX keys share a row's width; longer sets wrap onto more rows (no sideways scrolling, so sliding a
 * finger across hold options never fights a scroll).
 */
export function KeyBar() {
  const lang = useStore((s) => s.settings.lang);
  const on = useStore((s) => s.settings.keybar ?? true);
  const custom = useStore((s) => s.settings.keybarKeys);
  const hold = useStore((s) => s.settings.keybarHold ?? true);
  const more = useStore((s) => !!s.settings.keybarMore);
  const view = useActiveEditor((s) => s.view);
  const focused = useEditorFocused(view);
  const bottom = useViewportBottom();
  const keys = keysFor(lang, { custom, hold, more });
  const rowCount = rowsFor(keys.length);
  const height = rowCount * KEYBAR_ROW + 6;
  const shown = on && touchOnly() && !!view && focused && bottom !== null;
  useEffect(() => useKeyBarShown.setState({ shown, height: shown ? height : 0 }), [shown, height]);
  if (!shown) return null;
  const perRow = Math.ceil(keys.length / rowCount);
  const rows = Array.from({ length: rowCount }, (_, r) => keys.slice(r * perRow, (r + 1) * perRow));
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 border-t border-line bg-surface/95 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] backdrop-blur"
      // Pinned to the visual viewport's bottom edge, i.e. right above the keyboard.
      style={{ transform: `translateY(${bottom - height}px)`, height }}
      role="toolbar"
      aria-label="Shortcut keys"
    >
      <div className="flex h-full flex-col justify-center gap-1 px-1.5 py-[3px]">
        {rows.map((row, r) => (
          <div key={r} className="flex items-center gap-1">
            {row.map((k, i) => (
              <KeyButton key={formatKeyId(k)} k={k} view={view} align={i < row.length / 2 ? 'left' : 'right'} />
            ))}
            {/* Keep the last row's keys the same width as the rows above. */}
            {Array.from({ length: perRow - row.length }, (_, i) => (
              <span key={`pad${i}`} className="min-w-0 flex-1" aria-hidden="true" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const formatKeyId = (k: Key) => [k.tap, ...k.hold].join('\u0000');

/** Height of one row of keys. */
export const KEYBAR_ROW = 44;
/** One row's height plus padding: the bar's height when it has a single row. */
export const KEYBAR_H = KEYBAR_ROW + 6;
