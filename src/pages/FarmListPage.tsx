import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Plus, Tractor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Badge } from '@farm/components/ui/Badge';
import { buttonClass } from '@farm/components/ui/buttonClass';
import { useFormat } from '@farm/lib/format';
import { useSearchParam } from '@farm/lib/useSearchParam';
import { useFarmStore } from '@farm/store/useFarmStore';

export default function FarmListPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);
  const [query] = useSearchParam('q');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farms
      .filter((farm) => !q || [farm.name, farm.location].some((v) => v.toLowerCase().includes(q)))
      .map((farm) => {
        const farmFields = fields.filter((f) => f.farmId === farm.id);
        return { farm, fieldCount: farmFields.length, areaM2: farmFields.reduce((sum, f) => sum + f.areaM2, 0) };
      });
  }, [farms, fields, query]);

  return (
    <>
      <PageHeader
        title={t('nav.farms.title')}
        subtitle={t('nav.farms.subtitle')}
        actions={
          <Link to="/farms/new" className={buttonClass('primary', 'md')}>
            <Plus size={14} aria-hidden />
            {t('farms.new')}
          </Link>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-ink-muted">
            {query ? t('farms.noSearchResults') : t('farms.empty')}
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {rows.map(({ farm, fieldCount, areaM2 }) => (
            <li key={farm.id}>
              <Link
                to={`/farms/${farm.id}`}
                className="group flex h-full items-start gap-4 rounded-md border border-line bg-surface p-5 shadow-xs transition hover:border-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700"
              >
                <span className="w-11 h-11 rounded-lg bg-brand-50 text-brand-fg flex items-center justify-center shrink-0">
                  <Tractor size={22} aria-hidden />
                </span>
                <span className="flex-1 min-w-0 space-y-1">
                  <span className="block font-semibold text-ink truncate">{farm.name}</span>
                  <span className="block text-xs text-ink-muted truncate">{farm.location || '–'}</span>
                  <span className="flex flex-wrap gap-1.5 pt-1">
                    <Badge tone="neutral">{t('farms.fieldCount', { count: fieldCount })}</Badge>
                    <Badge tone="neutral">{format.hectares(areaM2, 1)}</Badge>
                    {farm.climateZone && <Badge tone="info">Zone {farm.climateZone}</Badge>}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden className="text-ink-faint group-hover:text-brand-fg self-center" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
