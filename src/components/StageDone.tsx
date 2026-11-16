import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui';

/** Seconds before moving on automatically after finishing a question or a stage. */
export const AUTO_NEXT_MS = 5000;

/**
 * A thin bar that fills from left to right over `ms`, then calls onDone. `paused` holds it (e.g. while reading).
 * Unmounting cancels it.
 */
export function TimerBar({ ms = AUTO_NEXT_MS, paused = false, onDone, className = '' }: { ms?: number; paused?: boolean; onDone: () => void; className?: string }) {
  const [left, setLeft] = useState(1);
  const leftRef = useRef(1);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      leftRef.current = Math.max(0, leftRef.current - (now - last) / ms);
      last = now;
      setLeft(leftRef.current);
      if (leftRef.current <= 0) {
        done.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, ms]);
  return (
    <div className={`h-1 overflow-hidden rounded-full bg-ink/10 ${className}`} role="timer" aria-label="Moving on automatically">
      <div className="h-full origin-left rounded-full bg-accent/80" style={{ transform: `scaleX(${1 - left})` }} />
    </div>
  );
}

/**
 * Shown when a stage is finished: one large Next button in the middle, Review to its left.
 * `auto` adds the countdown bar (only right after finishing, never when revisiting).
 */
export function StageDonePanel({
  emoji,
  title,
  subtitle,
  nextLabel,
  onNext,
  onReview,
  reviewLabel = 'Review',
  auto = false,
  children,
}: {
  emoji?: string;
  title: string;
  subtitle?: ReactNode;
  nextLabel: string;
  onNext: () => void;
  onReview: () => void;
  reviewLabel?: string;
  auto?: boolean;
  children?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }} className="flex flex-col items-center text-center">
      {children}
      {emoji && (
        <motion.p
          className="text-6xl leading-none"
          initial={{ scale: 0.3, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.1 }}
          aria-hidden="true"
        >
          {emoji}
        </motion.p>
      )}
      <p className="mt-4 font-display text-2xl font-semibold text-ink">{title}</p>
      {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      {/* Phones: Next on top, Review under it, both full width. Wider screens: Review | Next, centred on Next. */}
      <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        <div className="flex sm:justify-end">
          <Button size="lg" variant="secondary" onClick={onReview} className="w-full whitespace-nowrap sm:w-auto">
            {reviewLabel}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="lg" variant="primary" onClick={onNext} autoFocus className="!h-14 !text-lg sm:min-w-60">
            {nextLabel} <span aria-hidden="true">→</span>
          </Button>
          {auto && <TimerBar onDone={onNext} />}
        </div>
        <span />
      </div>
    </motion.div>
  );
}
