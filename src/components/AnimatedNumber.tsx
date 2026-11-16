import { animate, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';
import { prefersReducedMotion } from '../game/fx';

/** Counts smoothly to `value` whenever it changes. */
export function AnimatedNumber({ value, duration = 0.8, className = '' }: { value: number; duration?: number; className?: string }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    if (prefersReducedMotion()) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: 'easeOut' });
    return () => c.stop();
  }, [mv, value, duration]);
  return <motion.span className={`tabular-nums ${className}`}>{rounded}</motion.span>;
}
