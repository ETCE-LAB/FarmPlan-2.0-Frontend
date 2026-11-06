import { Rows3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@farm/components/ui/Card';
import { TextField } from '@farm/components/ui/FormField';
import { useFormat } from '@farm/lib/format';
import type { TreelineOptions, TreelinePreview } from '@farm/lib/treelines';

interface TreelinePanelProps {
  fieldName: string | null;
  options: TreelineOptions;
  onChange: (options: TreelineOptions) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  preview: TreelinePreview | null;
}

const NUMBER_FIELDS = [
  { key: 'orientationDeg', min: 0, max: 179, step: 1 },
  { key: 'rowSpacingM', min: 1, max: 100, step: 0.5 },
  { key: 'edgeBufferM', min: 0, max: 50, step: 0.5 },
  { key: 'inRowSpacingM', min: 0.2, max: 50, step: 0.1 },
] as const;

export function TreelinePanel({ fieldName, options, onChange, enabled, onToggle, preview }: TreelinePanelProps) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <Card title={t('treelines.title')} icon={Rows3}>
      {!fieldName ? (
        <p className="text-xs text-ink-muted">{t('treelines.selectField')}</p>
      ) : (
        <div className="space-y-4 text-xs">
          <label className="flex items-center gap-2 font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="accent-brand-700"
            />
            {t('treelines.showOnMap', { field: fieldName })}
          </label>

          <div className="grid grid-cols-2 gap-3">
            {NUMBER_FIELDS.map(({ key, min, max, step }) => (
              <TextField
                key={key}
                type="number"
                label={t(`treelines.options.${key}`)}
                min={min}
                max={max}
                step={step}
                value={options[key]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value)) onChange({ ...options, [key]: value });
                }}
              />
            ))}
          </div>
          <p className="text-[11px] text-ink-muted">{t('treelines.orientationHint')}</p>

          {preview && (
            <dl className="grid grid-cols-3 gap-2">
              {[
                { label: t('treelines.rows'), value: format.number(preview.rowCount, 0) },
                { label: t('treelines.totalLength'), value: `${format.number(preview.totalLengthM, 0)} m` },
                { label: t('treelines.plants'), value: `≈ ${format.number(preview.estimatedPlants, 0)}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded bg-surface-muted border border-line p-2">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-semibold text-ink text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-[11px] text-ink-muted">{t('treelines.disclaimer')}</p>
        </div>
      )}
    </Card>
  );
}
