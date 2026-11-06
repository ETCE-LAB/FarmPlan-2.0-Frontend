import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INITIAL_PLANTS } from '@farm/data/mockData';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { StratumBadge } from '@farm/components/plants/StratumBadge';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { SelectField } from '@farm/components/ui/FormField';
import { HARDINESS_ZONES } from '@farm/lib/agronomy';
import { useFormat } from '@farm/lib/format';
import {
  STRATA,
  commonName,
  filterPlants,
  isPlantSortKey,
  sortPlants,
  type PlantFilters,
  type PlantSortKey,
  type SortDirection,
} from '@farm/lib/plants';
import { useSearchParam, useUpdateSearchParams } from '@farm/lib/useSearchParam';
import type { Language, PlantTaxon } from '@farm/types';

type ColumnLabel = 'species' | 'uses' | 'stratum' | 'heightSpacing' | 'calories';

const COLUMNS: { key: PlantSortKey | null; labelKey: ColumnLabel; className?: string }[] = [
  { key: 'name', labelKey: 'species', className: 'px-6' },
  { key: null, labelKey: 'uses' },
  { key: 'stratum', labelKey: 'stratum' },
  { key: 'height', labelKey: 'heightSpacing' },
  { key: 'calories', labelKey: 'calories', className: 'text-right' },
];

export default function PlantsPage({ plants = INITIAL_PLANTS }: { plants?: PlantTaxon[] }) {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const location = useLocation();
  const language = i18n.language as Language;

  const [query] = useSearchParam('q');
  const [use, setUse] = useSearchParam('use', 'all');
  const [stratum, setStratum] = useSearchParam('stratum', 'all');
  const [zone, setZone] = useSearchParam('zone', 'all');
  const [sortParam] = useSearchParam('sort', 'name');
  const [dirParam] = useSearchParam('dir', 'asc');
  const updateParams = useUpdateSearchParams();
  const sortKey: PlantSortKey = isPlantSortKey(sortParam) ? sortParam : 'name';
  const direction: SortDirection = dirParam === 'desc' ? 'desc' : 'asc';

  const uses = useMemo(() => Array.from(new Set(plants.flatMap((p) => p.uses))), [plants]);
  const zones = useMemo(() => {
    const present = new Set(plants.flatMap((p) => p.hardinessZones));
    return HARDINESS_ZONES.filter((z) => present.has(z));
  }, [plants]);

  const visible = useMemo(
    () => sortPlants(filterPlants(plants, { query, use, stratum, zone } as PlantFilters), sortKey, direction, language),
    [plants, query, use, stratum, zone, sortKey, direction, language],
  );

  const toggleSort = (key: PlantSortKey) => {
    const nextDir = key === sortKey && direction === 'asc' ? 'desc' : 'asc';
    updateParams({ sort: key === 'name' ? null : key, dir: nextDir === 'asc' ? null : nextDir });
  };

  const resetFilters = () => updateParams({ q: null, use: null, stratum: null, zone: null });

  return (
    <>
      <PageHeader title={t('nav.plants.title')} subtitle={t('nav.plants.subtitle')} />
      <Card
        flush
        title={t('plants.title')}
        icon={Sprout}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={resetFilters}>
            {t('plants.resetFilters')}
          </Button>
        }
      >
        <div className="px-6 pb-4 border-b border-line-subtle grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField label={t('plants.filters.use')} value={use} onChange={(e) => setUse(e.target.value)}>
            <option value="all">{t('plants.filters.all')}</option>
            {uses.map((u) => (
              <option key={u} value={u}>
                {t(`plants.uses.${u}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('plants.filters.stratum')} value={stratum} onChange={(e) => setStratum(e.target.value)}>
            <option value="all">{t('plants.filters.all')}</option>
            {STRATA.map((s) => (
              <option key={s} value={s}>
                {t(`plants.strata.${s}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('plants.filters.zone')} value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="all">{t('plants.filters.all')}</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-muted border-b border-line-subtle text-ink-muted uppercase font-semibold tracking-wider">
                {COLUMNS.map(({ key, labelKey, className }) => {
                  const active = key !== null && key === sortKey;
                  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={labelKey}
                      scope="col"
                      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`py-3 px-4 ${className ?? ''}`}
                    >
                      {key ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className="inline-flex items-center gap-1 uppercase font-semibold tracking-wider hover:text-ink cursor-pointer"
                        >
                          {t(`plants.columns.${labelKey}`)}
                          <Icon size={12} aria-hidden className={active ? 'text-brand-fg' : 'text-ink-faint'} />
                        </button>
                      ) : (
                        t(`plants.columns.${labelKey}`)
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {visible.map((plant) => (
                <tr key={plant.id} className="hover:bg-surface-muted transition">
                  <td className="py-3.5 px-6">
                    <Link
                      to={`/plants/${plant.id}`}
                      state={{ from: location.search }}
                      className="text-sm font-semibold text-ink hover:text-brand-fg hover:underline"
                    >
                      {commonName(plant, language)}
                    </Link>
                    <div className="text-[11px] italic text-ink-muted">{plant.scientificName}</div>
                  </td>
                  <td className="py-3.5 px-4 text-ink-soft">
                    {plant.uses.map((u) => t(`plants.uses.${u}`)).join(', ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <StratumBadge stratum={plant.stratum} />
                  </td>
                  <td className="py-3.5 px-4 text-ink-soft">
                    <div>{t('plants.height', { value: format.range(plant.endHeightM, 'm') })}</div>
                    <div className="text-[11px] text-ink-muted">
                      {t('plants.spacing', { value: format.range(plant.minSpacingM, 'm') })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {plant.caloriesPerKg > 0 ? (
                      <div className="font-bold text-brand-fg">{format.number(plant.caloriesPerKg, 0)} kcal/kg</div>
                    ) : (
                      <div className="text-ink-muted">{t('plants.biomass')}</div>
                    )}
                    {plant.typicalYieldKgYear && (
                      <div className="text-[11px] text-ink-muted">
                        {t('plants.perPlantYear', { value: format.range(plant.typicalYieldKgYear, 'kg') })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-8 text-center text-ink-muted">
                    {t('plants.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-surface-muted border-t border-line-subtle text-xs text-ink-muted rounded-b-md">
          {t('plants.found', { count: visible.length })}
        </div>
      </Card>
    </>
  );
}
