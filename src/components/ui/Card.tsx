import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@farm/lib/utils';

interface CardProps {
  title?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ title, icon: Icon, actions, flush = false, className, children }: CardProps) {
  return (
    <section className={cn('bg-surface border border-line rounded-md shadow-xs', !flush && 'p-6', className)}>
      {(title || actions) && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-line-subtle',
            flush && 'px-6 pt-6',
          )}
        >
          {title && (
            <h2 className="font-bold text-base text-ink flex items-center gap-2">
              {Icon && <Icon size={18} className="text-brand-fg shrink-0" aria-hidden />}
              <span>{title}</span>
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
