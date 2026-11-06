import { useMemo } from 'react';
import { Link } from 'react-router';
import { Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '@farm/store/useFarmStore';
import { Card } from '@farm/components/ui/Card';
import { Badge, DemoBadge } from '@farm/components/ui/Badge';
import { useFormat } from '@farm/lib/format';
import { useSearchParam } from '@farm/lib/useSearchParam';
import type { PlantingPlan } from '@farm/types';

function currentPlanByField(plans: PlantingPlan[]) {
  const byField = new Map<string, PlantingPlan>();
  for (const plan of plans) {
    const current = byField.get(plan.fieldId);
    const better =
      !current ||
      (plan.status === 'active' && current.status !== 'active') ||
      (plan.status === current.status && plan.revisionNumber > current.revisionNumber);
    if (better) byField.set(plan.fieldId, plan);
  }
  return byField;
}

export function FieldInventoryPanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);
  const plans = useFarmStore((s) => s.plans);
  const [searchTerm] = useSearchParam('q');

  const rows = useMemo(() => {
    const farmNames = new Map(farms.map((f) => [f.id, f.name]));
    const planByField = currentPlanByField(plans);
    const query = searchTerm.trim().toLowerCase();

    return fields
      .map((field) => ({ field, farmName: farmNames.get(field.farmId) ?? '–', plan: planByField.get(field.id) }))
      .filter(
        ({ field, farmName }) =>
          !query || [field.name, farmName, field.soilType ?? ''].some((v) => v.toLowerCase().includes(query)),
      );
  }, [farms, fields, plans, searchTerm]);

  return (
    <Card
      title={t('inventory.title')}
      icon={Layers}
      actions={<Badge>{t('inventory.count', { count: rows.length })}</Badge>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line-subtle text-xs font-semibold text-ink-muted uppercase tracking-wider">
              <th scope="col" className="pb-3">
                {t('inventory.columns.field')}
              </th>
              <th scope="col" className="pb-3">
                {t('inventory.columns.farm')}
              </th>
              <th scope="col" className="pb-3">
                {t('inventory.columns.area')}
              </th>
              <th scope="col" className="pb-3">
                {t('inventory.columns.soil')}
              </th>
              <th scope="col" className="pb-3 text-right">
                {t('inventory.columns.plan')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows.map(({ field, farmName, plan }) => (
              <tr key={field.id} className="hover:bg-surface-muted transition-colors">
                <td className="py-3.5 font-semibold">
                  <Link
                    to={`/farms/${field.farmId}?field=${field.id}`}
                    className="text-ink hover:text-brand-fg hover:underline"
                  >
                    {field.name}
                  </Link>
                </td>
                <td className="py-3.5 text-ink-soft">{farmName}</td>
                <td className="py-3.5 font-mono text-ink-soft whitespace-nowrap">{format.hectares(field.areaM2, 1)}</td>
                <td className="py-3.5 text-xs text-ink-soft">
                  {field.soilType ?? <span className="text-ink-muted">{t('common.notDetermined')}</span>}
                  {field.soilPh !== null && <span className="text-ink-muted"> · pH {format.number(field.soilPh)}</span>}
                </td>
                <td className="py-3.5 text-right">
                  {plan ? (
                    <Badge tone={plan.status === 'active' ? 'success' : 'warning'}>
                      {t(`inventory.planStatus.${plan.status}`, { revision: plan.revisionNumber })}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{t('inventory.planStatus.none')}</Badge>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-ink-muted">
                  {t('inventory.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {plans.some((p) => p.algorithmVersion === 'demo') && (
        <div className="mt-4 pt-4 border-t border-line-subtle flex justify-end">
          <DemoBadge />
        </div>
      )}
    </Card>
  );
}
