import { Link, useLocation } from 'react-router';
import { topicOf } from '../content/topics';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-[0_6px_22px_-10px_var(--color-accent)] hover:brightness-110 active:translate-y-px disabled:bg-surface-3 disabled:text-faint disabled:shadow-none',
  success:
    'bg-good text-bg shadow-[0_6px_22px_-10px_var(--color-good)] hover:brightness-110 active:translate-y-px disabled:bg-surface-3 disabled:text-faint disabled:shadow-none',
  secondary: 'bg-surface-3 text-ink border border-line hover:border-faint active:translate-y-px disabled:text-faint',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2 disabled:text-faint',
  danger: 'text-bad border border-bad/30 hover:bg-bad/10 disabled:text-faint',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed ${sz} ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface/90 backdrop-blur ${className}`}>{children}</div>;
}

const DIFF_STYLE = {
  easy: 'text-good bg-good/10 border-good/25',
  medium: 'text-warn bg-warn/10 border-warn/25',
  hard: 'text-bad bg-bad/10 border-bad/25',
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: keyof typeof DIFF_STYLE }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${DIFF_STYLE[difficulty]}`}>{difficulty}</span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-muted">{children}</span>;
}

/** A topic tag that opens the matching Learn page (plain text when no topic matches). */
export function TopicTag({ tag, className = 'bg-surface-3' }: { tag: string; className?: string }) {
  const t = topicOf(tag);
  const { pathname } = useLocation();
  if (!t) return <span className={`rounded-full px-2.5 py-0.5 text-xs text-muted ${className}`}>{tag}</span>;
  return (
    <Link to={`/learn/${t.id}`} state={{ from: pathname }} title={`Learn: ${t.label}`} className={`rounded-full px-2.5 py-0.5 text-xs text-muted hover:text-accent-soft hover:underline ${className}`}>
      {tag}
    </Link>
  );
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl"
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  variant = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  variant?: Variant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} label={title}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 text-sm text-muted">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** A labelled on/off switch row. */
export function Toggle({ on, onChange, label, sub, disabled, compact = false }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string; disabled?: boolean; compact?: boolean }) {
  return (
    <label
      className={`flex items-start gap-3 ${compact ? 'rounded-xl px-2 py-2 hover:bg-surface-2' : 'rounded-xl border border-line bg-surface-2/60 px-4 py-3 hover:border-faint'} ${disabled ? 'opacity-70' : 'cursor-pointer'}`}
    >
      <input type="checkbox" className="peer sr-only" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${on ? 'bg-accent' : 'bg-surface-3'}`}
      >
        <span className={`size-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </label>
  );
}
