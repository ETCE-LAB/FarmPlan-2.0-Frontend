import { useTranslation } from 'react-i18next';
import { cn } from '@farm/lib/utils';
import type { StrataLayer } from '@farm/types';

const STRATA_BADGE: Record<StrataLayer, string> = {
  EMERGENT: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40 dark:text-emerald-300',
  HIGH: 'bg-teal-500/15 text-teal-800 border-teal-500/40 dark:text-teal-300',
  MEDIUM: 'bg-lime-500/15 text-lime-800 border-lime-500/40 dark:text-lime-300',
  LOW: 'bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-300',
};

export function StratumBadge({ stratum }: { stratum: StrataLayer }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn('inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] border', STRATA_BADGE[stratum])}
    >
      {t(`plants.strata.${stratum}`)}
    </span>
  );
}
