import { motion } from 'motion/react';
import { Fruit, type FruitKind } from './Fruit';

export interface PathNode {
  label: string;
  fruit: FruitKind;
  status: 'locked' | 'active' | 'done';
  skipped?: boolean;
  /** Quiz stages: how many questions (of `steps`) are answered while the stage is in progress. */
  answered?: number;
  /** Quiz stages: number of questions (the segment after the node shows steps − 1 dots). */
  steps?: number;
}

/**
 * Stage bar: fruit "beads" on a capsule as thick as they are. The fill reaches the active stage and
 * moves a quarter of the way on after each quiz answer.
 */
export function StagePath({
  nodes,
  viewing,
  onSelect,
}: {
  nodes: PathNode[];
  viewing: number;
  onSelect: (i: number) => void;
}) {
  const cols = nodes.length;
  const center = (i: number) => ((2 * i + 1) / (2 * cols)) * 100; // % of the bar's width
  const doneRun = nodes.findIndex((n) => n.status !== 'done');
  const k = doneRun === -1 ? nodes.length : doneRun;
  const active = nodes[k];
  const partial = active?.steps ? Math.min(1, (active.answered ?? 0) / active.steps) : 0;
  const reach = Math.min(nodes.length - 1, k + partial); // in node units: 0 … last node
  return (
    <nav aria-label="Stages" className="relative [--node:42px] sm:[--node:52px]">
      {/* The bar runs from the first circle's centre to the last one's, with square ends: they meet the
          circles' edges flush (rounded ends would leave a notch where two curves cross). */}
      <div className="absolute top-0 overflow-hidden bg-surface-3/80" style={{ left: `${center(0)}%`, right: `${100 - center(nodes.length - 1)}%`, height: 'var(--node)' }} aria-hidden="true">
        {/* Square-ended fill: it stops under the next circle's centre, so the circle hides the end cleanly
            (a rounded end would leave a notch above and below where the two curves meet). */}
        <motion.div
          className={`h-full bg-accent/30 ${partial > 0 && k < nodes.length - 1 ? 'rounded-r-full' : ''}`}
          initial={false}
          animate={{ width: `${(reach / (nodes.length - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        />
      </div>
      {/* quarter marks between a quiz stage and the next one */}
      {nodes.map((n, i) =>
        n.steps && n.steps > 1 && i < nodes.length - 1
          ? Array.from({ length: n.steps - 1 }, (_, j) => {
              const at = center(i) + ((center(i + 1) - center(i)) * (j + 1)) / n.steps!;
              const lit = i + (j + 1) / n.steps! <= reach + 1e-9;
              return (
                <span
                  key={`${i}-${j}`}
                  className={`absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${lit ? 'bg-accent/70' : 'bg-ink/15'}`}
                  style={{ left: `${at}%`, top: 'calc(var(--node) / 2)' }}
                  aria-hidden="true"
                />
              );
            })
          : null,
      )}
      <ol className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {nodes.map((n, i) => {
          const selected = i === viewing;
          const clickable = n.status !== 'locked';
          const greyed = n.status === 'locked' || !!n.skipped;
          const mood = greyed ? 'none' : n.status === 'done' ? 'happy' : 'idle';
          return (
            <li key={i} className="flex flex-col items-center text-center">
              <motion.button
                type="button"
                disabled={!clickable}
                onClick={() => onSelect(i)}
                aria-current={selected ? 'step' : undefined}
                aria-label={`Stage ${i + 1}: ${n.label} (${n.skipped ? 'skipped' : n.status})`}
                whileHover={clickable ? { scale: 1.08 } : undefined}
                whileTap={clickable ? { scale: 0.95 } : undefined}
                style={{ width: 'var(--node)', height: 'var(--node)' }}
                className={`relative grid place-items-center rounded-full border-2 bg-surface transition-colors ${
                  n.status === 'locked'
                    ? 'cursor-not-allowed border-line'
                    : selected
                      ? 'border-accent ring-4 ring-accent/20'
                      : n.status === 'done'
                        ? 'border-accent/50 hover:border-accent'
                        : 'border-accent'
                }`}
              >
                <motion.span
                  className={greyed ? 'opacity-45 grayscale' : ''}
                  animate={n.status === 'active' ? { y: [0, -3, 0], rotate: [0, -4, 4, 0] } : { y: 0, rotate: 0 }}
                  transition={n.status === 'active' ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                >
                  <Fruit kind={n.fruit} mood={mood} className="size-7 sm:size-9" />
                </motion.span>
                {n.status === 'done' && !n.skipped && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.15 }}
                    className="absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full bg-accent text-[10px] font-black text-white"
                    aria-hidden="true"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
              <span className={`mt-1.5 font-display text-xs font-medium sm:text-sm ${selected || n.status === 'active' ? 'text-ink' : 'text-faint'}`}>{n.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** One stage bead on its own (the phone stage bar); `null` shows a finish flag for the results view. */
export function StageBead({ node, big = false }: { node: PathNode | null; big?: boolean }) {
  const greyed = !node || node.status === 'locked' || !!node.skipped;
  return (
    <span className={`relative grid ${big ? 'size-14' : 'size-12'} shrink-0 place-items-center rounded-full border-2 border-accent bg-surface ring-4 ring-accent/20`} aria-hidden="true">
      {node ? (
        <motion.span
          key={node.label}
          className={greyed ? 'opacity-45 grayscale' : ''}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Fruit kind={node.fruit} mood={greyed ? 'none' : node.status === 'done' ? 'happy' : 'idle'} className={big ? 'size-10' : 'size-8'} />
        </motion.span>
      ) : (
        <svg viewBox="0 0 24 24" className="size-6 text-accent-soft" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </svg>
      )}
      {node?.status === 'done' && !node.skipped && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full bg-accent text-[10px] font-black text-white">✓</span>
      )}
    </span>
  );
}
