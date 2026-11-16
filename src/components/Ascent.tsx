import { motion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useResolvedTheme } from '../game/theme';
import { useFitHeight } from '../game/useFitHeight';

export const MAX_KM = 20;
/** Screen pixels per km of altitude for the nearest layer. */
const PX = 120;

const PALETTE = {
  light: {
    low: 'linear-gradient(to bottom, #c9d8f1, #eaf0fa 70%, #f2f5fb)',
    high: 'linear-gradient(to bottom, #1d2a4f, #3f5487 55%, #8ea4d1)',
    cloud: 'rgb(255 255 255 / 0.88)',
    cloudFar: 'rgb(255 255 255 / 0.55)',
    hillFar: '#c3d4cb',
    hill: '#adc8a9',
    hillNear: '#97b994',
    tree: '#7fa37f',
    ink: '#55607a',
    stars: 0,
  },
  dark: {
    low: 'linear-gradient(to bottom, #151b2a, #1e2535 70%, #232a3a)',
    high: 'linear-gradient(to bottom, #030409, #0a0d17 55%, #141a2b)',
    cloud: 'rgb(214 222 240 / 0.075)',
    cloudFar: 'rgb(214 222 240 / 0.045)',
    hillFar: '#1b2328',
    hill: '#18221f',
    hillNear: '#141c19',
    tree: '#1f2b26',
    ink: '#8a93a8',
    stars: 0.35,
  },
};

type Pal = (typeof PALETTE)['light'];

function CloudShape({ w, color, wispy = false }: { w: number; color: string; wispy?: boolean }) {
  return wispy ? (
    <svg viewBox="0 0 160 20" width={w} aria-hidden="true">
      <path d="M4 14 C30 6 60 16 92 9 C114 4 136 10 156 7" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M30 18 C52 13 74 18 100 14" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 100 34" width={w} aria-hidden="true">
      <path d="M12 30 C2 30 2 18 12 18 C12 8 26 5 32 13 C37 3 56 3 60 14 C66 8 80 10 80 20 C92 19 94 30 86 30 Z" fill={color} />
    </svg>
  );
}

/** A layer of the world that scrolls down as the camera rises (depth < 1 = farther, slower). */
function Layer({ alt, depth, children }: { alt: MotionValue<number>; depth: number; children: ReactNode }) {
  const y = useTransform(alt, (a) => a * PX * depth);
  return (
    <motion.div className="absolute inset-x-0 bottom-0 h-0" style={{ y }}>
      {children}
    </motion.div>
  );
}

/** Something placed at an altitude (km) and horizontal position (% of width) inside a Layer. */
function At({ km, x, depth, children, className = '' }: { km: number; x: string; depth: number; children: ReactNode; className?: string }) {
  return (
    <div className={`absolute ${className}`} style={{ left: x, bottom: km * PX * depth }}>
      {children}
    </div>
  );
}

function Birds({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 24" width="60" aria-hidden="true" className="sky-flap">
      {[
        [6, 14],
        [22, 8],
        [40, 16],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q4 -4 8 0 q4 -4 8 0`} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function Balloon({ pal }: { pal: Pal }) {
  return (
    <svg viewBox="0 0 40 60" width="34" aria-hidden="true" className="sky-bob">
      <path d="M20 2 C8 2 2 11 2 20 C2 30 12 36 16 42 H24 C28 36 38 30 38 20 C38 11 32 2 20 2Z" fill="#d9a3a0" opacity="0.9" />
      <path d="M20 2 C14 6 12 14 12 22 C12 30 15 37 16 42 M20 2 C26 6 28 14 28 22 C28 30 25 37 24 42" stroke="#c58884" strokeWidth="1.2" fill="none" />
      <path d="M16 42 L17 48 M24 42 L23 48" stroke={pal.ink} strokeWidth="0.9" />
      <rect x="16" y="48" width="8" height="6" rx="1.5" fill="#a88a6a" />
    </svg>
  );
}

function Plane({ pal }: { pal: Pal }) {
  return (
    <svg viewBox="0 0 220 24" width="220" aria-hidden="true">
      <path d="M0 13 H150" stroke={pal.cloud} strokeWidth="2.5" strokeLinecap="round" />
      <g fill={pal.ink} opacity="0.8">
        <path d="M150 12 C160 9 182 9 194 11 C198 12 198 14 194 15 C182 17 160 16 150 14Z" />
        <path d="M168 12 L176 3 H181 L177 12Z M168 14 L176 21 H181 L177 14Z M151 12 L154 7 H157 L156 12Z" />
      </g>
    </svg>
  );
}

/**
 * Full-page backdrop for quizzes and results: you climb from the ground into the sky as the
 * day's points (1 point = 1 km) go up. Calm by design: a few slow drifting clouds, birds near the
 * ground, a balloon, an airliner at cruising height and stars near the top.
 */
export function SkyScene({ km }: { km: number }) {
  const theme = useResolvedTheme();
  const pal = PALETTE[theme];
  const alt = useSpring(km, { stiffness: 38, damping: 14 });
  useEffect(() => {
    alt.set(km);
  }, [alt, km]);
  const high = useTransform(alt, [0, MAX_KM], [0, 1]);
  const stars = useTransform(alt, [0, 10, MAX_KM], [pal.stars, pal.stars + 0.1, 1]);
  const curve = useTransform(alt, [14, MAX_KM], [0, 1]);

  // m-0!: parents use space-y-*, whose margins would otherwise shorten this fixed layer.
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 m-0! overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: pal.low }} />
      <motion.div className="absolute inset-0" style={{ background: pal.high, opacity: high }} />
      <motion.div className="sky-stars absolute inset-0" style={{ opacity: stars }} />
      {/* the curve of the Earth near the top */}
      <motion.div
        className="absolute -inset-x-1/4 -bottom-[85vw] h-[100vw] rounded-[50%]"
        style={{ opacity: curve, boxShadow: '0 -24px 80px 10px rgb(120 160 255 / 0.35)', background: 'linear-gradient(to bottom, #2b4a7a, #0d1526 30%)' }}
      />

      {/* far layer */}
      <Layer alt={alt} depth={0.45}>
        <At km={0} x="0" depth={0.45} className="w-full">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="block h-40 w-full">
            <path d="M0 64 C120 30 240 36 360 58 C480 80 600 28 740 40 C860 50 940 64 1000 52 V120 H0Z" fill={pal.hillFar} />
          </svg>
        </At>
        {[
          { km: 2.6, x: '12%', w: 90 },
          { km: 5.2, x: '74%', w: 110 },
          { km: 8.8, x: '30%', w: 80 },
          { km: 13, x: '82%', w: 100, wispy: true },
          { km: 16, x: '8%', w: 120, wispy: true },
        ].map((c, i) => (
          <At key={i} km={c.km} x={c.x} depth={0.45}>
            <div className="sky-drift" style={{ animationDuration: `${70 + i * 13}s`, animationDelay: `-${i * 9}s` }}>
              <CloudShape w={c.w} color={pal.cloudFar} wispy={c.wispy} />
            </div>
          </At>
        ))}
      </Layer>

      {/* near layer */}
      <Layer alt={alt} depth={1}>
        <At km={0} x="0" depth={1} className="w-full">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="block h-32 w-full">
            <path d="M0 70 C150 36 260 44 380 62 C520 86 640 34 780 48 C880 58 950 70 1000 62 V120 H0Z" fill={pal.hill} />
            <path d="M0 80 C180 62 320 72 480 78 C640 84 780 64 1000 74 V120 H0Z" fill={pal.hillNear} />
          </svg>
        </At>
        {[
          ['16%', 0.33],
          ['19%', 0.36],
          ['63%', 0.4],
          ['88%', 0.3],
        ].map(([x, k], i) => (
          <At key={`t${i}`} km={k as number} x={x as string} depth={1}>
            <svg viewBox="0 0 20 30" width="20" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill={pal.tree} />
              <rect x="9" y="16" width="2" height="12" fill={pal.tree} />
            </svg>
          </At>
        ))}
        <At km={1.1} x="22%" depth={1}>
          <div className="sky-drift" style={{ animationDuration: '46s' }}>
            <Birds color={pal.ink} />
          </div>
        </At>
        <At km={2.2} x="68%" depth={1}>
          <div className="sky-drift" style={{ animationDuration: '58s', animationDelay: '-20s' }}>
            <Birds color={pal.ink} />
          </div>
        </At>
        <At km={4.4} x="84%" depth={1}>
          <Balloon pal={pal} />
        </At>
        {[
          { km: 1.6, x: '4%', w: 170 },
          { km: 3.4, x: '58%', w: 210 },
          { km: 5.8, x: '14%', w: 150 },
          { km: 7.6, x: '70%', w: 180 },
          { km: 12, x: '38%', w: 200, wispy: true },
          { km: 15, x: '76%', w: 160, wispy: true },
        ].map((c, i) => (
          <At key={i} km={c.km} x={c.x} depth={1}>
            <div className="sky-drift" style={{ animationDuration: `${55 + i * 11}s`, animationDelay: `-${i * 7}s` }}>
              <CloudShape w={c.w} color={pal.cloud} wispy={c.wispy} />
            </div>
          </At>
        ))}
        <At km={10.4} x="0" depth={1} className="w-full">
          <div className="sky-fly">
            <Plane pal={pal} />
          </div>
        </At>
      </Layer>
    </div>
  );
}

/**
 * Thin altitude ruler for the right edge: 0–20 km with a marker at the current height.
 */
export function AltitudeRail({ km }: { km: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const h = useFitHeight(ref, 300);
  const pct = Math.min(1, Math.max(0, km / MAX_KM));
  const ticks = Array.from({ length: MAX_KM + 1 }, (_, k) => k);
  return (
    <div ref={ref} className="sticky top-20 flex flex-col items-end" style={{ height: h }}>
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-end pr-1" role="meter" aria-label="Altitude" aria-valuemin={0} aria-valuemax={MAX_KM} aria-valuenow={km} aria-valuetext={`${km} km`}>
        <span className="mb-2 font-display text-[10px] font-semibold tracking-widest text-ink/60 uppercase">km</span>
        <div className="relative w-full flex-1">
          <div className="absolute top-0 right-0 bottom-0 w-px bg-ink/25" />
          <motion.div
            className="absolute right-0 bottom-0 w-[3px] translate-x-px rounded-full bg-accent"
            initial={false}
            animate={{ height: `${pct * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
          {ticks.map((k) => (
            <div key={k} className="absolute right-0 flex items-center gap-1" style={{ bottom: `${(k / MAX_KM) * 100}%`, transform: 'translateY(50%)' }}>
              {k % 5 === 0 && <span className="font-mono text-[9px] text-ink/55 tabular-nums">{k}</span>}
              <span className={`block h-px bg-ink/35 ${k % 5 === 0 ? 'w-2.5' : 'w-1.5'}`} />
            </div>
          ))}
          <motion.div
            className="absolute right-0 flex items-center"
            initial={false}
            animate={{ bottom: `${pct * 100}%` }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            style={{ transform: 'translateY(50%)' }}
          >
            <span className="mr-1 rounded bg-accent px-1 py-px font-display text-[10px] font-semibold whitespace-nowrap text-white shadow">{km} km</span>
            <span className="block size-0 border-y-[5px] border-l-[6px] border-y-transparent border-l-accent" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
