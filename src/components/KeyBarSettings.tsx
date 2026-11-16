import { GripVertical, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../game/store';
import { LANGS, LANG_LABEL, type Lang } from '../runner/harness/types';
import { defaultKeys, formatKeys, keyLabel, keysFor, type Key } from './KeyBar';
import { Toggle } from './ui';

const SPECIALS: { name: string; label: string; what: string }[] = [
  { name: 'tab', label: '⇥', what: 'indent' },
  { name: 'left', label: '←', what: 'cursor left' },
  { name: 'right', label: '→', what: 'cursor right' },
];

/** A key as a tile: the tap symbol, with its hold options small underneath. */
function KeyFace({ k }: { k: Key }) {
  return (
    <>
      <span className="text-base leading-none">{k.tap ? keyLabel(k.tap) : '?'}</span>
      {k.hold.length > 0 && <span className="mt-1 max-w-full truncate text-[10px] leading-none font-medium text-faint">{k.hold.map(keyLabel).join(' ')}</span>}
    </>
  );
}

/**
 * One language's keys as tiles: drag to reorder, tap to edit (tap symbol, hold options) or remove, + to add.
 * Saves as the player's own list for that language (Reset brings the defaults back).
 */
function KeyEditor({ lang }: { lang: Lang }) {
  const custom = useStore((s) => s.settings.keybarKeys);
  const more = useStore((s) => !!s.settings.keybarMore);
  const set = useStore((s) => s.setKeybar);
  // Edited as a list (holds kept together, whatever the hold setting); keys with no tap symbol aren't saved.
  const [keys, setKeys] = useState<Key[]>(() => keysFor(lang, { custom, more, hold: true }));
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState(false);
  const isCustom = custom?.[lang] !== undefined;
  // Follow outside changes (Reset, the More keys switch, another device) when they differ from what's shown.
  const stored = formatKeys(keysFor(lang, { custom, more, hold: true }));
  useEffect(() => {
    if (formatKeys(keys.filter((k) => k.tap)) !== stored) setKeys(keysFor(lang, { custom, more, hold: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const save = (next: Key[]) => {
    setKeys(next);
    set({ keybarKeys: { ...custom, [lang]: formatKeys(next.filter((k) => k.tap)) } });
  };
  const reset = () => {
    const next = { ...custom };
    delete next[lang];
    set({ keybarKeys: next });
    setEditing(null);
  };

  // Drag to reorder: a press that moves more than a few pixels drags; one that doesn't opens the editor.
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ from: number; x: number; y: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const onDown = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { from: i, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    d.moved = true;
    setDragging(d.from);
    // The tile whose centre is nearest the finger takes the dragged key's place.
    let to = d.from;
    let best = Infinity;
    tiles.current.forEach((el, j) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (dist < best) [to, best] = [j, dist];
    });
    if (to !== d.from) {
      const next = [...keys];
      const [k] = next.splice(d.from, 1);
      next.splice(to, 0, k);
      setKeys(next);
      if (editing === d.from) setEditing(to);
      d.from = to;
      setDragging(to);
    }
  };
  const onUp = (i: number) => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (d?.moved) save(keys);
    else setEditing(editing === i ? null : i);
  };

  const edited = editing !== null ? keys[editing] : undefined;
  const update = (patch: Partial<Key>) => {
    if (editing === null) return;
    const next = [...keys];
    next[editing] = { ...next[editing], ...patch };
    save(next);
  };
  const add = (k: Key) => {
    save([...keys, k]);
    setEditing(keys.length);
  };
  const missing = SPECIALS.filter((s) => !keys.some((k) => k.tap === s.name));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5" onPointerMove={onMove}>
        {keys.map((k, i) => (
          <button
            key={i}
            ref={(el) => {
              tiles.current[i] = el;
            }}
            type="button"
            onPointerDown={(e) => onDown(i, e)}
            onPointerUp={() => onUp(i)}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(null);
            }}
            aria-label={`Key ${k.tap || 'new'}${k.hold.length ? `, hold for ${k.hold.join(' ')}` : ''}: drag to move, tap to edit`}
            className={`relative flex h-12 min-w-11 touch-none flex-col items-center justify-center rounded-lg border px-2 font-mono font-semibold text-ink select-none ${
              editing === i ? 'border-accent bg-accent/10' : 'border-line bg-surface-2'
            } ${dragging === i ? 'scale-110 shadow-lg' : ''} transition-transform`}
          >
            <GripVertical className="absolute top-1 left-0.5 size-2.5 text-faint/70" aria-hidden="true" />
            <KeyFace k={k} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => add({ tap: '', hold: [] })}
          className="grid h-12 min-w-11 place-items-center rounded-lg border border-dashed border-line px-2 text-muted hover:border-faint hover:text-ink"
          aria-label="Add a key"
          title="Add a key"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>

      {edited && (
        <div className="grid gap-2 rounded-xl border border-line bg-surface-2/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Tap types
              <input
                autoFocus={!edited.tap}
                value={edited.tap}
                onChange={(e) => update({ tap: e.target.value.replace(/\s+/g, '') })}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="("
                className="h-9 rounded-lg border border-line bg-surface px-2.5 font-mono text-sm text-ink focus:border-accent-soft/60 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Hold options (separate with spaces; the first is picked by default)
              <input
                value={edited.hold.join(' ')}
                onChange={(e) => update({ hold: e.target.value.split(/\s+/).filter(Boolean) })}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder=") ]"
                className="h-9 rounded-lg border border-line bg-surface px-2.5 font-mono text-sm text-ink focus:border-accent-soft/60 focus:outline-none"
              />
            </label>
          </div>
          <p className="text-[11px] text-faint">
            Symbols can be several characters (<code>-&gt;</code>, <code>!=</code>). Special names: <code>tab</code> indents, <code>left</code> and{' '}
            <code>right</code> move the cursor.
          </p>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                save(keys.filter((_, j) => j !== editing));
                setEditing(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-bad hover:bg-bad/10"
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Remove key
            </button>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-ink">
              <X className="size-3.5" aria-hidden="true" /> Done
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {missing.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => add({ tap: s.name, hold: [] })}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 font-semibold text-muted hover:text-ink"
          >
            <Plus className="size-3" aria-hidden="true" />
            <span className="font-mono">{s.label}</span> {s.what}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={() => setText((t) => !t)} className="font-semibold text-accent-soft hover:underline">
          {text ? 'Hide text' : 'Edit as text'}
        </button>
        {isCustom && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 font-semibold text-accent-soft hover:underline">
            <RotateCcw className="size-3" aria-hidden="true" /> Reset to defaults
          </button>
        )}
      </div>
      {text && (
        <label className="grid gap-1 text-xs text-muted">
          <span>
            Space-separated; <code>a/b/c</code> is one key (tap a, hold for b or c); <code>\/</code> is a slash inside a key.
          </span>
          <input
            type="text"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={custom?.[lang] ?? defaultKeys(lang, more)}
            onChange={(e) => set({ keybarKeys: { ...custom, [lang]: e.target.value } })}
            className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 font-mono text-sm text-ink focus:border-accent-soft/60 focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}

/** Account page: the shortcut-key bar, holding, the longer set, and each language's keys. */
export function KeyBarSettings() {
  const on = useStore((s) => s.settings.keybar ?? true);
  const hold = useStore((s) => s.settings.keybarHold ?? true);
  const more = useStore((s) => !!s.settings.keybarMore);
  const current = useStore((s) => s.settings.lang);
  const set = useStore((s) => s.setKeybar);
  const [lang, setLang] = useState<Lang>(current);
  return (
    <div className="grid gap-3">
      <Toggle
        on={on}
        onChange={(v) => set({ keybar: v })}
        label="Shortcut keys above the keyboard"
        sub="Phones and tablets: symbols code needs, shown while you type in the code editor. Also in the gear menu."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          on={hold}
          onChange={(v) => set({ keybarHold: v })}
          disabled={!on}
          label="Hold for more symbols"
          sub="Hold ( for ), or + for - * %. Slide to pick, like accented letters. Off: each symbol gets its own key."
        />
        <Toggle
          on={more}
          onChange={(v) => set({ keybarMore: v })}
          disabled={!on}
          label="More keys"
          sub="Default set with a second row: . , / and cursor keys. Off: one row."
        />
      </div>
      <div className="flex justify-self-start rounded-full border border-line bg-surface-2/80 p-0.5" role="tablist" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lang === l}
            onClick={() => setLang(l)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${lang === l ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
      <KeyEditor key={lang} lang={lang} />
    </div>
  );
}
