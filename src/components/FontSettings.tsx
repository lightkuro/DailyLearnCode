import { useEffect } from 'react';
import { useStore, type Ligatures, type MonoFont } from '../game/store';
import { highlight } from '../syntax/highlight';
import { Toggle } from './ui';

/** The font settings with their defaults filled in. */
export function useFontPrefs() {
  const monoFont = useStore((s) => s.settings.monoFont ?? 'default');
  const ligatures = useStore((s) => s.settings.ligatures ?? 'comments');
  const slashedZero = useStore((s) => s.settings.slashedZero ?? true);
  const duospace = useStore((s) => !!s.settings.duospace);
  const set = useStore((s) => s.setFontPrefs);
  return { monoFont, ligatures, slashedZero, duospace, set };
}

/**
 * Puts the code font settings on <html>: data-mono picks the family (index.css), and --mono-ff / --mono-ff-comment
 * hold the OpenType features for code and for comment text. Paper Mono's features: ss01 coding ligatures,
 * ss02 duospace (wider M, W), ss03 narrow space, zero crossed zero. Standard ligatures stay off everywhere.
 */
export function useApplyCodeFont() {
  const { monoFont, ligatures, slashedZero, duospace } = useFontPrefs();
  useEffect(() => {
    const root = document.documentElement;
    const paper = monoFont === 'paper';
    const base = ["'liga' 0", "'calt' 0"];
    if (slashedZero) base.push("'zero' 1");
    if (paper && duospace) base.push("'ss02' 1", "'ss03' 1");
    const liga = (on: boolean) => (paper && on ? [...base, "'ss01' 1"] : base).join(', ');
    root.dataset.mono = monoFont;
    root.style.setProperty('--mono-ff', liga(ligatures === 'all'));
    root.style.setProperty('--mono-ff-comment', liga(ligatures !== 'off'));
  }, [monoFont, ligatures, slashedZero, duospace]);
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  small = false,
}: {
  value: T;
  options: { id: T; label: string; style?: React.CSSProperties }[];
  onChange: (v: T) => void;
  label: string;
  small?: boolean;
}) {
  return (
    <span className="flex shrink-0 rounded-full border border-line bg-surface-2/80 p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          style={o.style}
          className={`rounded-full font-semibold transition-colors ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${value === o.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

const FONTS: { id: MonoFont; label: string; style?: React.CSSProperties }[] = [
  { id: 'default', label: 'Default' },
  { id: 'paper', label: 'Paper Mono', style: { fontFamily: "'Paper Mono', ui-monospace, monospace" } },
];
const LIGATURES: { id: Ligatures; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'comments', label: 'Comments' },
  { id: 'all', label: 'Everything' },
];

const SAMPLE_PY = `# keep i <= j != -1 -> answer 0
if i >= 10 and j != 0:
    return Mom.width(i)  # 0 vs O`;

/** Gear menu: the code font (the other font settings are on the Account page). */
export function FontMenuItems() {
  const { monoFont, set } = useFontPrefs();
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
        <span className="font-semibold text-ink">Code font</span>
        <Segmented small label="Code font" value={monoFont} options={FONTS} onChange={(f) => set({ monoFont: f })} />
      </div>
    </>
  );
}

/** Account page: every code font setting, with a live sample. */
export function FontSettings() {
  const { monoFont, ligatures, slashedZero, duospace, set } = useFontPrefs();
  const paper = monoFont === 'paper';
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">Font</p>
          <p className="text-xs text-muted">Default uses your device's monospace font.</p>
        </div>
        <Segmented label="Code font" value={monoFont} options={FONTS} onChange={(f) => set({ monoFont: f })} />
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${paper ? '' : 'opacity-60'}`}>
        <div>
          <p className="font-semibold text-ink">Coding ligatures</p>
          <p className="text-xs text-muted">{paper ? 'Joins symbols such as -> and != into one sign.' : 'Paper Mono only.'}</p>
        </div>
        <Segmented label="Coding ligatures" value={ligatures} options={LIGATURES} onChange={(l) => set({ ligatures: l })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle on={slashedZero} onChange={(v) => set({ slashedZero: v })} label="Crossed zero" sub="0 with a stroke, so it never reads as O." />
        <Toggle
          on={duospace}
          onChange={(v) => set({ duospace: v })}
          disabled={!paper}
          label="Narrow spaces + duospace"
          sub={paper ? 'Tighter spaces, wider M and W.' : 'Paper Mono only.'}
        />
      </div>
      <pre className="overflow-x-auto rounded-xl border border-line bg-code px-4 py-3 text-[13px] leading-relaxed" aria-label="Sample code in the chosen font">
        {highlight(SAMPLE_PY, 'python3')}
      </pre>
    </div>
  );
}
