import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@farm/components/ui/Card';
import { DemoBadge } from '@farm/components/ui/Badge';
import { useFormat } from '@farm/lib/format';

const SAMPLE_CURVE = [
  { year: 1, kcalPerM2: 120, stage: 'herbs' },
  { year: 3, kcalPerM2: 480, stage: 'pioneers' },
  { year: 5, kcalPerM2: 1250, stage: 'appleHazel' },
  { year: 10, kcalPerM2: 2900, stage: 'fullFruit' },
  { year: 20, kcalPerM2: 4600, stage: 'walnutOak' },
] as const;

const MAX_KCAL = Math.max(...SAMPLE_CURVE.map((p) => p.kcalPerM2));

export function YieldChartPanel() {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <Card title={t('yield.title')} icon={TrendingUp} actions={<DemoBadge />}>
      <p className="text-xs text-ink-muted mb-5">{t('yield.intro')}</p>

      <ul className="space-y-3.5">
        {SAMPLE_CURVE.map((point) => (
          <li key={point.year} className="text-xs">
            <div className="flex justify-between text-ink-soft font-medium mb-1">
              <span>
                {t('yield.year', { year: point.year })}
                <span className="text-ink-muted font-normal"> · {t(`yield.stages.${point.stage}`)}</span>
              </span>
              <span className="font-bold text-brand-fg">
                {format.number(point.kcalPerM2, 0)} {t('yield.unit')}
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden" aria-hidden>
              <div
                className="bg-brand-700 h-full rounded-full"
                style={{ width: `${(point.kcalPerM2 / MAX_KCAL) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
