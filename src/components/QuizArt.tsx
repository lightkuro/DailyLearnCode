/**
 * A small bank of cute, low-saturation pictures for quiz questions (graph, tree, database, lock, …),
 * picked from a question's tags and wording, with a friendly computer as the catch-all.
 * Colours are fixed soft tints that read on both themes; outlines use the theme's muted ink.
 */
import type { ReactNode } from 'react';
import type { ArtKind } from './quizArtPick';

export { pickArt, type ArtKind } from './quizArtPick';

const C = {
  lav: '#a99ccb',
  mint: '#9cc8b0',
  sky: '#9db8dc',
  peach: '#dc9c84',
  butter: '#dccb8f',
  rose: '#e2adbd',
  dark: '#2b2f3a',
};
const LINE = 'var(--color-faint)';

/** Two dot eyes (they blink) and an optional smile. */
function Face({ x, y, gap = 7, smile = true }: { x: number; y: number; gap?: number; smile?: boolean }) {
  return (
    <g>
      <g className="art-blink">
        <circle cx={x - gap / 2} cy={y} r={1.9} fill={C.dark} />
        <circle cx={x + gap / 2} cy={y} r={1.9} fill={C.dark} />
      </g>
      {smile && <path d={`M${x - 2.5} ${y + 4} Q${x} ${y + 6.5} ${x + 2.5} ${y + 4}`} stroke={C.dark} strokeWidth={1.3} fill="none" strokeLinecap="round" />}
    </g>
  );
}

const ART: Record<ArtKind, ReactNode> = {
  graph: (
    <g>
      <path d="M30 24 L62 18 L92 34 L70 58 L36 56 Z M30 24 L70 58 M62 18 L36 56" stroke={LINE} strokeWidth={2} fill="none" />
      <circle cx={30} cy={24} r={8} fill={C.mint} />
      <circle cx={92} cy={34} r={8} fill={C.sky} />
      <circle cx={70} cy={58} r={8} fill={C.butter} />
      <circle cx={36} cy={56} r={8} fill={C.rose} />
      <circle cx={62} cy={18} r={12} fill={C.lav} />
      <Face x={62} y={17} gap={6} />
    </g>
  ),
  tree: (
    <g>
      <path d="M60 22 L38 44 M60 22 L82 44 M38 44 L26 64 M38 44 L50 64 M82 44 L94 64" stroke={LINE} strokeWidth={2} />
      <circle cx={38} cy={44} r={8} fill={C.sky} />
      <circle cx={82} cy={44} r={8} fill={C.butter} />
      <circle cx={26} cy={64} r={6.5} fill={C.rose} />
      <circle cx={50} cy={64} r={6.5} fill={C.lav} />
      <circle cx={94} cy={64} r={6.5} fill={C.peach} />
      <circle cx={60} cy={22} r={12} fill={C.mint} />
      <Face x={60} y={21} gap={6} />
    </g>
  ),
  array: (
    <g>
      {[C.sky, C.lav, C.mint, C.butter, C.rose].map((f, i) => (
        <rect key={i} x={14 + i * 19} y={30} width={16} height={16} rx={4} fill={f} />
      ))}
      <Face x={60} y={37} gap={6} smile={false} />
      <path d="M41 62 V52 M37 56 L41 51 L45 56 M79 62 V52 M75 56 L79 51 L83 56" stroke={LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  ),
  hash: (
    <g>
      <rect x={34} y={12} width={52} height={58} rx={8} fill={C.butter} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={40} y={30 + i * 13} width={40} height={10} rx={3} fill="#fff" opacity={0.55} />
      ))}
      <Face x={60} y={22} gap={8} />
      <path d="M92 40 h12 M100 36 v8" stroke={LINE} strokeWidth={2} strokeLinecap="round" />
      <circle cx={88} cy={40} r={4} fill="none" stroke={LINE} strokeWidth={2} />
    </g>
  ),
  stack: (
    <g>
      <rect x={34} y={56} width={52} height={11} rx={5} fill={C.sky} />
      <rect x={36} y={44} width={48} height={11} rx={5} fill={C.lav} />
      <rect x={38} y={32} width={44} height={11} rx={5} fill={C.mint} />
      <rect x={40} y={15} width={40} height={16} rx={6} fill={C.peach} />
      <Face x={60} y={21} gap={7} />
      <path d="M94 26 V14 M90 18 L94 13 L98 18" stroke={LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  ),
  search: (
    <g>
      <path d="M68 50 L88 68" stroke={LINE} strokeWidth={6} strokeLinecap="round" />
      <circle cx={54} cy={36} r={20} fill={C.sky} />
      <circle cx={54} cy={36} r={14} fill="#fff" opacity={0.5} />
      <Face x={54} y={35} gap={8} />
    </g>
  ),
  clock: (
    <g>
      <rect x={55} y={8} width={10} height={6} rx={2} fill={C.peach} />
      <circle cx={60} cy={42} r={26} fill={C.peach} />
      <circle cx={60} cy={42} r={19} fill="#fff" opacity={0.55} />
      <path d="M60 42 V30 M60 42 L69 47" stroke={C.dark} strokeWidth={2} strokeLinecap="round" />
      <g className="art-blink">
        <circle cx={53} cy={50} r={1.8} fill={C.dark} />
        <circle cx={67} cy={50} r={1.8} fill={C.dark} />
      </g>
      <path d="M92 64 Q100 60 104 40" stroke={LINE} strokeWidth={2} fill="none" strokeDasharray="3 3" />
    </g>
  ),
  grid: (
    <g>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={36 + c * 17} y={10 + r * 20} width={15} height={18} rx={3} fill={(r + c) % 2 ? C.mint : C.lav} opacity={r * 3 + c < 5 ? 1 : 0.45} />),
      )}
      <Face x={60} y={39} gap={6} smile={false} />
      <path d="M90 24 l4 4 l8 -9" stroke={LINE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </g>
  ),
  bits: (
    <g>
      <rect x={24} y={24} width={32} height={34} rx={8} fill={C.lav} />
      <rect x={64} y={24} width={32} height={34} rx={8} fill={C.mint} />
      <text x={40} y={47} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={18} fontWeight={700} fill={C.dark}>
        0
      </text>
      <text x={80} y={47} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={18} fontWeight={700} fill={C.dark}>
        1
      </text>
      <path d="M58 16 q2 -6 4 0" stroke={LINE} strokeWidth={2} fill="none" />
    </g>
  ),
  database: (
    <g>
      <path d="M36 18 V58 C36 66 84 66 84 58 V18" fill={C.sky} />
      <ellipse cx={60} cy={18} rx={24} ry={8} fill={C.lav} />
      <path d="M36 32 C36 40 84 40 84 32 M36 45 C36 53 84 53 84 45" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} fill="none" />
      <Face x={60} y={50} gap={8} />
    </g>
  ),
  network: (
    <g>
      <circle cx={60} cy={40} r={24} fill={C.mint} />
      <path d="M36 40 H84 M60 16 C48 28 48 52 60 64 M60 16 C72 28 72 52 60 64" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} fill="none" />
      <Face x={60} y={39} gap={9} />
      <path d="M92 22 q6 6 0 12 M98 18 q10 10 0 20" stroke={LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  ),
  lock: (
    <g>
      <path d="M46 34 V26 C46 12 74 12 74 26 V34" stroke={LINE} strokeWidth={5} fill="none" />
      <rect x={38} y={32} width={44} height={36} rx={9} fill={C.butter} />
      <Face x={60} y={46} gap={9} />
      <path d="M90 56 h14 M100 56 v5 M95 56 v4" stroke={LINE} strokeWidth={2} strokeLinecap="round" />
      <circle cx={88} cy={56} r={4} fill="none" stroke={LINE} strokeWidth={2} />
    </g>
  ),
  threads: (
    <g>
      <rect x={48} y={10} width={24} height={58} rx={9} fill={C.lav} />
      <circle cx={60} cy={22} r={6} fill={C.rose} />
      <circle cx={60} cy={39} r={6} fill={C.butter} opacity={0.6} />
      <circle cx={60} cy={56} r={6} fill={C.mint} opacity={0.6} />
      <g className="art-blink">
        <circle cx={57.5} cy={22} r={1.4} fill={C.dark} />
        <circle cx={62.5} cy={22} r={1.4} fill={C.dark} />
      </g>
      <path d="M22 30 H40 M22 48 H40 M80 30 H98 M80 48 H98" stroke={LINE} strokeWidth={2} strokeLinecap="round" strokeDasharray="4 4" />
    </g>
  ),
  server: (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={36} y={12 + i * 19} width={48} height={16} rx={5} fill={[C.sky, C.lav, C.mint][i]} />
          <circle cx={76} cy={20 + i * 19} r={2} fill={i === 2 ? '#7fd1a5' : '#fff'} opacity={0.9} />
        </g>
      ))}
      <Face x={52} y={20} gap={7} smile={false} />
      <path d="M86 70 C80 70 80 62 86 62 C86 56 96 55 98 60 C104 58 106 66 102 70 Z" fill="#fff" opacity={0.8} stroke={LINE} strokeWidth={1.2} />
    </g>
  ),
  git: (
    <g>
      <path d="M24 56 H96 M44 56 C52 56 52 26 62 26 H80 C88 26 88 56 96 56" stroke={LINE} strokeWidth={2.5} fill="none" />
      <circle cx={24} cy={56} r={6} fill={C.sky} />
      <circle cx={44} cy={56} r={6} fill={C.sky} />
      <circle cx={96} cy={56} r={7} fill={C.mint} />
      <circle cx={80} cy={26} r={6} fill={C.rose} />
      <circle cx={62} cy={26} r={11} fill={C.peach} />
      <Face x={62} y={25} gap={6} />
    </g>
  ),
  test: (
    <g>
      <path d="M50 10 H70 M53 10 V36 L38 62 C35 68 39 72 45 72 H75 C81 72 85 68 82 62 L67 36 V10" stroke={LINE} strokeWidth={2} fill="none" />
      <path d="M45 50 H75 L82 62 C85 68 81 72 75 72 H45 C39 72 35 68 38 62 Z" fill={C.mint} />
      <Face x={60} y={60} gap={8} />
      <path d="M86 20 l4 4 l8 -9" stroke={LINE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </g>
  ),
  memory: (
    <g>
      <rect x={24} y={24} width={72} height={30} rx={5} fill={C.mint} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={30 + i * 16} y={29} width={11} height={12} rx={2} fill="#fff" opacity={0.5} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={28 + i * 8} y={56} width={4} height={6} fill={LINE} />
      ))}
      <Face x={60} y={46} gap={8} smile={false} />
    </g>
  ),
  code: (
    <g>
      <rect x={34} y={10} width={52} height={62} rx={8} fill={C.lav} />
      <path d="M48 30 l-7 7 l7 7 M72 30 l7 7 l-7 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Face x={60} y={56} gap={8} />
    </g>
  ),
  computer: (
    <g>
      <rect x={30} y={10} width={60} height={42} rx={7} fill={C.sky} />
      <rect x={36} y={16} width={48} height={30} rx={4} fill="#fff" opacity={0.55} />
      <Face x={60} y={30} gap={10} />
      <path d="M52 52 L50 60 H70 L68 52" fill={C.sky} />
      <rect x={34} y={62} width={52} height={6} rx={3} fill={C.lav} />
    </g>
  ),
};

export function QuizArt({ kind, className = 'h-20' }: { kind: ArtKind; className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={`art-float ${className}`} role="img" aria-label={`${kind} illustration`}>
      {ART[kind]}
    </svg>
  );
}

export const ART_KINDS = Object.keys(ART) as ArtKind[];
