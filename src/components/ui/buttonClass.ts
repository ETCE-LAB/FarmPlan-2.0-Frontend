import { cn } from '@farm/lib/utils';

const VARIANTS = {
  primary: 'bg-brand-700 hover:bg-brand-900 text-white shadow-xs',
  secondary: 'bg-surface-muted hover:bg-brand-50 text-brand-fg border border-line',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
  danger: 'text-danger-fg bg-danger-bg hover:bg-danger-bg-strong border border-danger-line',
  dangerSolid: 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs',
  ghost: 'text-ink-soft hover:text-ink hover:bg-surface-sunken',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-xs px-5 py-2.5 gap-2',
  icon: 'p-1.5',
};

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'sm', className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded font-semibold transition cursor-pointer',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
    'disabled:bg-surface-sunken disabled:text-ink-faint disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
