import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@farm/components/ui/Button';
import { parseFieldsGeoJson, type ImportedField } from '@farm/lib/geojsonIO';
import { showToast } from '@farm/store/useUiStore';

export function GeoJsonImportButton({ onImport }: { onImport: (fields: ImportedField[]) => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const result = parseFieldsGeoJson(await file.text());
    if (!result.ok) {
      showToast({ tone: 'error', message: t(`geojson.errors.${result.error}`, { detail: result.detail ?? '' }) });
      return;
    }
    onImport(result.fields);
    showToast({
      message:
        t('geojson.imported', { count: result.fields.length }) +
        (result.skipped > 0 ? ` ${t('geojson.skipped', { count: result.skipped })}` : ''),
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
        {t('geojson.import')}
      </Button>
    </>
  );
}
