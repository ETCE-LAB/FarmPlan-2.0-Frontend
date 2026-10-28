import type { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@farm/lib/utils';

const TONES = {
  brand: 'bg-brand-50 text-brand-fg border-line',
  success: 'bg-success-bg text-success-fg border-success-line',
  warning: 'bg-warning-bg text-warning-fg border-warning-line',
  info: 'bg-info-bg text-info-fg border-info-line',
  neutral: 'bg-surface-sunken text-ink-soft border-line',
};

export function Badge({
  tone = 'brand',
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DemoBadge() {
  const { t } = useTranslation();
  return (
    <span title={t('common.demoHint')}>
      <Badge tone="warning">
        <FlaskConical size={12} aria-hidden />
        {t('common.demoData')}
      </Badge>
    </span>
  );
}
