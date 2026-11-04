import { useState, type FormEvent } from 'react';
import { Save, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@farm/components/ui/Button';
import { TextField } from '@farm/components/ui/FormField';
import { useFormat } from '@farm/lib/format';
import { multiPolygonParts, netAreaM2, partsToMultiPolygon, polygonAreaM2 } from '@farm/lib/geo';
import { useFarmStore } from '@farm/store/useFarmStore';
import { showToast } from '@farm/store/useUiStore';
import { mutateWithUndo } from '@farm/store/undo';
import type { Field } from '@farm/types';

export function FieldDetailsForm({ field, onDeleted }: { field: Field; onDeleted: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const updateField = useFarmStore((s) => s.updateField);
  const deleteField = useFarmStore((s) => s.deleteField);

  const [draft, setDraft] = useState({
    name: field.name,
    soilType: field.soilType ?? '',
    soilPh: field.soilPh === null ? '' : format.number(field.soilPh, 2),
  });

  const zones = multiPolygonParts(field.excludedZones);
  const phValue = draft.soilPh.trim() === '' ? null : Number(draft.soilPh.replace(',', '.'));
  const phInvalid = phValue !== null && (!Number.isFinite(phValue) || phValue < 0 || phValue > 14);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (phInvalid || !draft.name.trim()) return;
    updateField(field.id, { name: draft.name.trim(), soilType: draft.soilType.trim() || null, soilPh: phValue });
    showToast({ message: t('farms.fieldSaved', { name: draft.name.trim() }) });
  };

  const removeZone = (index: number) =>
    mutateWithUndo(
      () => updateField(field.id, { excludedZones: partsToMultiPolygon(zones.filter((_, i) => i !== index)) }),
      t('farms.exclusionDeleted'),
      t('common.undo'),
    );

  const handleDelete = () => {
    mutateWithUndo(() => deleteField(field.id), t('farms.fieldDeleted', { name: field.name }), t('common.undo'));
    onDeleted();
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 pt-3">
      <TextField
        label={t('farms.fieldName')}
        required
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('farms.soilType')}
          value={draft.soilType}
          onChange={(e) => setDraft({ ...draft, soilType: e.target.value })}
          placeholder={t('common.notDetermined')}
        />
        <TextField
          label={t('farms.soilPh')}
          inputMode="decimal"
          value={draft.soilPh}
          onChange={(e) => setDraft({ ...draft, soilPh: e.target.value })}
          aria-invalid={phInvalid}
          hint={phInvalid ? t('farms.soilPhInvalid') : undefined}
        />
      </div>

      {field.geometry && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-surface-muted border border-line p-2">
            <dt className="text-ink-muted">{t('farms.grossArea')}</dt>
            <dd className="font-semibold text-ink">{format.hectares(field.areaM2)}</dd>
          </div>
          <div className="rounded bg-surface-muted border border-line p-2">
            <dt className="text-ink-muted">{t('farms.netArea')}</dt>
            <dd className="font-semibold text-ink">
              {format.hectares(netAreaM2(field.geometry, field.excludedZones))}
            </dd>
          </div>
        </dl>
      )}

      <div>
        <h3 className="text-xs font-semibold text-ink-soft mb-1">{t('farms.exclusionZones')}</h3>
        {zones.length === 0 ? (
          <p className="text-[11px] text-ink-muted">{t('farms.noExclusionZones')}</p>
        ) : (
          <ul className="divide-y divide-line-subtle border border-line rounded text-xs">
            {zones.map((zone, index) => (
              <li key={index} className="flex items-center justify-between px-3 py-1.5">
                <span>
                  {t('farms.exclusionZone')} {index + 1} · {format.hectares(polygonAreaM2(zone))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  icon={X}
                  aria-label={t('farms.deleteExclusion', { index: index + 1 })}
                  onClick={() => removeZone(index)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-2">
        <Button variant="danger" icon={Trash2} onClick={handleDelete}>
          {t('farms.deleteField')}
        </Button>
        <Button type="submit" icon={Save} disabled={phInvalid}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
