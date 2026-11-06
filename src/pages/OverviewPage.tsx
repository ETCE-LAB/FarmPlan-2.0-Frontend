import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { StatsRow } from '@farm/components/overview/StatsRow';
import { FieldInventoryPanel } from '@farm/components/overview/FieldInventoryPanel';
import { SoilLookupPanel } from '@farm/components/overview/SoilLookupPanel';
import { YieldChartPanel } from '@farm/components/overview/YieldChartPanel';

export default function OverviewPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.overview.title')} subtitle={t('nav.overview.subtitle')} />
      <div className="space-y-6">
        <StatsRow />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 min-w-0">
            <FieldInventoryPanel />
          </div>
          <div className="xl:col-span-5 space-y-6">
            <SoilLookupPanel />
            <YieldChartPanel />
          </div>
        </div>
      </div>
    </>
  );
}
