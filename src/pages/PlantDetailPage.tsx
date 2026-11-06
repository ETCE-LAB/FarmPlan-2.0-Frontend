import type { ReactNode } from 'react';
import { useLocation, useParams } from 'react-router';
import { Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INITIAL_PLANTS } from '@farm/data/mockData';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { StratumBadge } from '@farm/components/plants/StratumBadge';
import { Card } from '@farm/components/ui/Card';
import { Badge } from '@farm/components/ui/Badge';
import { useFormat } from '@farm/lib/format';
import { commonName } from '@farm/lib/plants';
import type { Language } from '@farm/types';
import NotFoundPage from './NotFoundPage';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded bg-surface-muted border border-line p-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

export default function PlantDetailPage() {
  const { plantId } = useParams();
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const location = useLocation();
  const language = i18n.language as Language;

  const plant = INITIAL_PLANTS.find((p) => p.id === plantId);
  if (!plant) return <NotFoundPage />;

  const from = (location.state as { from?: string } | null)?.from ?? '';
  const missing = <span className="text-ink-muted font-normal">{t('common.notDetermined')}</span>;
  const zones = plant.hardinessZones;

  return (
    <>
      <PageHeader
        title={commonName(plant, language)}
        subtitle={<span className="italic">{plant.scientificName}</span>}
        back={{ to: `/plants${from}`, label: t('nav.plants.label') }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <div className="aspect-[4/3] rounded bg-surface-sunken flex flex-col items-center justify-center gap-2 text-ink-muted">
            <Sprout size={40} aria-hidden />
            <span className="text-xs">{t('plants.imagePending')}</span>
          </div>
          <p className="mt-4 text-sm text-ink-soft leading-relaxed">
            {language === 'de' ? plant.descriptionDe : plant.descriptionEn}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StratumBadge stratum={plant.stratum} />
            {plant.isPioneer && <Badge tone="success">{t('plants.pioneer')}</Badge>}
            {plant.isNitrogenFixer && <Badge tone="info">{t('plants.nitrogenFixer')}</Badge>}
            <Badge tone="neutral">{plant.nativeStatus === 'NATIVE' ? t('plants.native') : t('plants.exotic')}</Badge>
          </div>
        </Card>

        <Card className="lg:col-span-8" title={t('plants.facts')}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Fact label={t('plants.columns.uses')}>{plant.uses.map((u) => t(`plants.uses.${u}`)).join(', ')}</Fact>
            <Fact label={t('plants.endHeight')}>{format.range(plant.endHeightM, 'm')}</Fact>
            <Fact label={t('plants.minSpacing')}>{format.range(plant.minSpacingM, 'm')}</Fact>
            <Fact label={t('plants.crownDiameter')}>
              {plant.crownDiameterM !== null ? `${format.number(plant.crownDiameterM)} m` : missing}
            </Fact>
            <Fact label={t('plants.growthRate')}>
              {plant.growthRateCmYear !== null ? `${format.number(plant.growthRateCmYear, 0)} cm/a` : missing}
            </Fact>
            <Fact label={t('plants.caloriesPerKg')}>
              {plant.caloriesPerKg > 0 ? `${format.number(plant.caloriesPerKg, 0)} kcal/kg` : t('plants.biomass')}
            </Fact>
            <Fact label={t('plants.yield')}>
              {plant.typicalYieldKgYear
                ? t('plants.perPlantYear', { value: format.range(plant.typicalYieldKgYear, 'kg') })
                : missing}
            </Fact>
            <Fact label={t('plants.filters.zone')}>
              {zones.length > 0 ? t('plants.zones', { from: zones[0], to: zones[zones.length - 1] }) : missing}
            </Fact>
          </dl>
        </Card>
      </div>
    </>
  );
}
