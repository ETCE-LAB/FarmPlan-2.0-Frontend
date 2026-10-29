import { useMemo } from 'react';
import { Database, Mountain, Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useActiveFarm, useFarmStore } from '@farm/store/useFarmStore';
import { Card } from '@farm/components/ui/Card';
import { DemoBadge } from '@farm/components/ui/Badge';
import { SelectField } from '@farm/components/ui/FormField';
import { classifyPh, hardinessZoneRangeC } from '@farm/lib/agronomy';
import { useFormat } from '@farm/lib/format';

export function SoilLookupPanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const farms = useFarmStore((s) => s.farms);
  const allFields = useFarmStore((s) => s.fields);
  const setActiveFarmId = useFarmStore((s) => s.setActiveFarmId);
  const farm = useActiveFarm();

  const fields = useMemo(() => allFields.filter((f) => f.farmId === farm?.id), [allFields, farm?.id]);
  const zoneRange = farm?.climateZone ? hardinessZoneRangeC(farm.climateZone) : null;

  return (
    <Card title={t('soil.title')} icon={Database} actions={<DemoBadge />}>
      {!farm ? (
        <p className="text-xs text-ink-muted">{t('soil.noFarm')}</p>
      ) : (
        <div className="space-y-4">
          <SelectField label={t('soil.farm')} value={farm.id} onChange={(e) => setActiveFarmId(e.target.value)}>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>

          <div className="p-3 bg-surface-muted border border-line rounded">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
              <Thermometer size={14} aria-hidden className="text-danger-fg" />
              <span>{t('soil.hardiness')}</span>
            </div>
            <div className="text-lg font-bold text-ink">
              {farm.climateZone ? `Zone ${farm.climateZone}` : t('common.notDetermined')}
            </div>
            {zoneRange && (
              <div className="text-[11px] text-ink-muted">
                {t('soil.zoneMinTemp', { min: format.celsius(zoneRange.min), max: format.celsius(zoneRange.max) })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-2">
              <Mountain size={14} aria-hidden className="text-warning-fg" />
              <span>{t('soil.soilPerField')}</span>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('soil.noFields')}</p>
            ) : (
              <ul className="divide-y divide-line-subtle text-xs">
                {fields.map((field) => (
                  <li key={field.id} className="py-2 flex justify-between gap-3">
                    <span className="font-medium text-ink">{field.name}</span>
                    <span className="text-right text-ink-soft">
                      {field.soilType ?? t('common.notDetermined')}
                      {field.soilPh !== null && (
                        <span className="block text-[11px] text-ink-muted">
                          {t('soil.phLabel', { ph: format.number(field.soilPh) })} ·{' '}
                          {t(`soil.ph.${classifyPh(field.soilPh)}`)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-ink-muted">{t('soil.lookupPending')}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
