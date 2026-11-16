/**
 * Stage mascots: simple, low-saturation fruit with eyes (apple, banana, grape, pink pineapple, crab).
 * mood: 'idle' (open eyes), 'happy' (^ ^ eyes, stage cleared), 'none' (no face: greyed-out locked/skipped stages).
 */
export type FruitKind = 'apple' | 'banana' | 'grape' | 'pineapple' | 'crab';
export type FruitMood = 'idle' | 'happy' | 'none';

const LEAF = '#8fae94';
const DARK = '#2b2f3a';

function Eyes({ x1, x2, y, mood, r = 2.6 }: { x1: number; x2: number; y: number; mood: FruitMood; r?: number }) {
  if (mood === 'happy') {
    const arc = (x: number) => `M${x - r} ${y + 0.8} Q${x} ${y - r * 1.4} ${x + r} ${y + 0.8}`;
    return <path d={`${arc(x1)} ${arc(x2)}`} stroke={DARK} strokeWidth={1.6} strokeLinecap="round" fill="none" />;
  }
  if (mood === 'none') return null;
  return (
    <g>
      <circle cx={x1} cy={y} r={r} fill="#fff" />
      <circle cx={x2} cy={y} r={r} fill="#fff" />
      <circle className="fruit-pupil" cx={x1 + 0.5} cy={y + 0.4} r={r * 0.52} fill={DARK} />
      <circle className="fruit-pupil" cx={x2 + 0.5} cy={y + 0.4} r={r * 0.52} fill={DARK} />
    </g>
  );
}

export function Fruit({ kind, mood = 'idle', className = 'size-9' }: { kind: FruitKind; mood?: FruitMood; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {kind === 'apple' && (
        <g>
          <path d="M20 12 C14 7 6 10 7 20 C8 30 15 35 20 32 C25 35 32 30 33 20 C34 10 26 7 20 12Z" fill="#cf8d86" />
          <path d="M20 12 C20 9 21 7 23 5.5" stroke="#7d6a5c" strokeWidth={1.8} strokeLinecap="round" fill="none" />
          <path d="M22 9 C25 5 30 6 31 8 C28 10 25 10 22 9Z" fill={LEAF} />
          <Eyes x1={16} x2={24} y={20} mood={mood} />
        </g>
      )}
      {kind === 'banana' && (
        <g>
          <path d="M8 13 C9 26 18 34 31 30 C33 29.5 33 27.5 31 27.5 C21 28 14 22 12.5 12 C12 10 8.5 10.5 8 13Z" fill="#dccb8f" />
          <path d="M9 12.5 L8.4 9.5" stroke="#8f7f58" strokeWidth={2.2} strokeLinecap="round" />
          <Eyes x1={15} x2={21.5} y={22} mood={mood} r={2.3} />
        </g>
      )}
      {kind === 'grape' && (
        <g fill="#a99ccb">
          <path d="M20 7 C22 4 26 4 28 5 C26 8 23 8 20 7Z" fill={LEAF} />
          <circle cx={13} cy={14} r={5} />
          <circle cx={20} cy={13} r={5} />
          <circle cx={27} cy={14} r={5} />
          <circle cx={16.5} cy={21} r={5} />
          <circle cx={23.5} cy={21} r={5} />
          <circle cx={20} cy={28} r={5} />
          <Eyes x1={16.5} x2={23.5} y={20} mood={mood} r={2.3} />
        </g>
      )}
      {kind === 'pineapple' && (
        <g>
          <path d="M20 12 L15 3 L19 7 L20 1.5 L21 7 L25 3 Z" fill={LEAF} />
          <ellipse cx={20} cy={23} rx={10} ry={12} fill="#e2adbd" />
          <path d="M12 17 L28 31 M12 25 L22 34 M17 12 L29 23 M28 17 L12 31 M28 25 L18 34 M23 12 L11 23" stroke="#c98ea0" strokeWidth={1} />
          <Eyes x1={16.5} x2={23.5} y={22} mood={mood} />
        </g>
      )}
      {kind === 'crab' && (
        <g>
          <path d="M9 22 L4 26 M10 25 L5 30 M31 22 L36 26 M30 25 L35 30" stroke="#c98a73" strokeWidth={2} strokeLinecap="round" />
          <path d="M9 15 C5 14 4 9 7 7 C7.5 10 9.5 11 11 10.5 C11.5 12.5 11 14 9 15Z M31 15 C35 14 36 9 33 7 C32.5 10 30.5 11 29 10.5 C28.5 12.5 29 14 31 15Z" fill="#dc9c84" />
          <ellipse cx={20} cy={23} rx={12} ry={8.5} fill="#dc9c84" />
          {mood !== 'none' && (
            <>
              <path d="M16 15.5 V12 M24 15.5 V12" stroke="#c98a73" strokeWidth={1.6} strokeLinecap="round" />
              <Eyes x1={16} x2={24} y={11} mood={mood} r={2.4} />
              <path d="M17 26 Q20 28 23 26" stroke={DARK} strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.6} />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
