import { useTranslation } from 'react-i18next';
import { SelectField, TextAreaField, TextField } from '@farm/components/ui/FormField';
import { HARDINESS_ZONES } from '@farm/lib/agronomy';
import type { FarmMeta } from './farmMeta';

export function FarmMetaFields({ value, onChange }: { value: FarmMeta; onChange: (next: FarmMeta) => void }) {
  const { t } = useTranslation();
  const set = (key: keyof FarmMeta) => (e: { target: { value: string } }) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <TextField
        label={t('farms.name')}
        required
        value={value.name}
        onChange={set('name')}
        placeholder={t('farms.namePlaceholder')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          label={t('farms.location')}
          value={value.location}
          onChange={set('location')}
          placeholder={t('farms.locationPlaceholder')}
        />
        <SelectField label={t('farms.climateZone')} value={value.climateZone} onChange={set('climateZone')}>
          <option value="">{t('farms.climateZoneUnknown')}</option>
          {HARDINESS_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField
        label={t('farms.notes')}
        value={value.notes}
        onChange={set('notes')}
        placeholder={t('farms.notesPlaceholder')}
      />
    </div>
  );
}
