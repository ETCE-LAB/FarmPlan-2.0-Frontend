import { CalendarCheck, Layers, Map as MapIcon, Tractor, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useFormat } from '@farm/lib/format';
import { cn } from '@farm/lib/utils';

interface StatTileProps {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
}

function StatTile({ icon: Icon, iconClass, label, value }: StatTileProps) {
  return (
    <div className="bg-surface border border-line rounded-md p-4 sm:p-5 flex items-center gap-4 shadow-xs">
      <div className={cn('hidden sm:flex w-12 h-12 rounded-lg items-center justify-center shrink-0', iconClass)}>
        <Icon size={24} aria-hidden />
      </div>
      <div>
        <div className="text-xs text-ink-muted font-medium mb-1">{label}</div>
        <div className="text-2xl font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

export function StatsRow() {
  const { t } = useTranslation();
  const format = useFormat();
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);
  const plans = useFarmStore((s) => s.plans);

  const totalAreaM2 = fields.reduce((sum, f) => sum + f.areaM2, 0);
  const activePlans = plans.filter((p) => p.status === 'active').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      <StatTile
        icon={MapIcon}
        iconClass="bg-brand-50 text-brand-fg"
        label={t('stats.totalArea')}
        value={format.hectares(totalAreaM2, 1)}
      />
      <StatTile
        icon={Tractor}
        iconClass="bg-info-bg text-info-fg"
        label={t('stats.farms')}
        value={format.number(farms.length)}
      />
      <StatTile
        icon={Layers}
        iconClass="bg-success-bg text-success-fg"
        label={t('stats.fields')}
        value={format.number(fields.length)}
      />
      <StatTile
        icon={CalendarCheck}
        iconClass="bg-warning-bg text-warning-fg"
        label={t('stats.activePlans')}
        value={format.number(activePlans)}
      />
    </div>
  );
}
