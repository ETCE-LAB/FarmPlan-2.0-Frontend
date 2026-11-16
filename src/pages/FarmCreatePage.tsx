import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { Polygon } from 'geojson';
import { Layers, MapPin, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { TextField } from '@farm/components/ui/FormField';
import { FarmMetaFields } from '@farm/components/farms/FarmMetaFields';
import { EMPTY_FARM_META, metaToInput, type FarmMeta } from '@farm/components/farms/farmMeta';
import { GeoJsonImportButton } from '@farm/components/farms/GeoJsonImportButton';
import { FieldsMapEditor, type BackgroundShape, type EditorField } from '@farm/components/map/FieldsMapEditor';
import { useFormat } from '@farm/lib/format';
import { partsToMultiPolygon, polygonAreaM2 } from '@farm/lib/geo';
import { createId } from '@farm/lib/utils';
import { FIELD_ATTRIBUTE_DEFAULTS } from '@farm/lib/fields';
import { apiErrorMessage, createFarm } from '@farm/store/farmSync';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useSessionUser } from '@farm/store/useSessionStore';
import { showToast } from '@farm/store/useUiStore';
import type { Field } from '@farm/types';

export default function FarmCreatePage() {
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const farms = useFarmStore((s) => s.farms);
  const existingFields = useFarmStore((s) => s.fields);
  const user = useSessionUser();

  const [meta, setMeta] = useState<FarmMeta>(() => ({
    ...EMPTY_FARM_META,
    ownerName: user?.displayName ?? '',
    contactEmail: user?.email ?? '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<EditorField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFieldError, setShowFieldError] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const background = useMemo<BackgroundShape[]>(() => {
    const farmNames = new Map(farms.map((f) => [f.id, f.name]));
    return existingFields.flatMap((field) =>
      field.geometry
        ? [
            {
              id: field.id,
              geometry: field.geometry,
              popupLines: [`${farmNames.get(field.farmId) ?? ''} – ${field.name}`],
            },
          ]
        : [],
    );
  }, [farms, existingFields]);

  const addDraft = useCallback(
    (geometry: Polygon, name?: string | null, excluded: Polygon[] = []) => {
      const id = createId('field');
      setDrafts((prev) => [
        ...prev,
        {
          id,
          name: name || t('farms.defaultFieldName', { index: prev.length + 1 }),
          geometry,
          excludedZones: partsToMultiPolygon(excluded),
        },
      ]);
      setSelectedId(id);
      setShowFieldError(false);
    },
    [t],
  );

  const changeGeometry = useCallback((id: string, geometry: Polygon) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, geometry } : d)));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (drafts.length === 0) {
      setShowFieldError(true);
      return;
    }
    const fields: Field[] = drafts.map((draft) => ({
      id: draft.id,
      // Replaced by the server-assigned farm ID.
      farmId: '',
      name: draft.name.trim() || t('farms.defaultFieldName', { index: 1 }),
      geometry: draft.geometry,
      ...FIELD_ATTRIBUTE_DEFAULTS,
      areaM2: polygonAreaM2(draft.geometry),
      excludedZones: draft.excludedZones,
    }));
    setSubmitting(true);
    const result = await createFarm(metaToInput(meta), fields);
    setSubmitting(false);
    if (!result.ok) {
      showToast({ tone: 'error', message: t('farms.createFailed', { reason: apiErrorMessage(result) }) });
      return;
    }
    showToast({ message: t('farms.created', { name: result.data.name }) });
    navigate(`/farms/${result.data.id}`);
  };

  return (
    <>
      <PageHeader
        title={t('pages.farmCreate.title')}
        subtitle={t('pages.farmCreate.subtitle')}
        back={{ to: '/farms', label: t('nav.farms.label') }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="xl:col-span-4 space-y-6">
          <Card title={t('farms.masterData')} icon={MapPin}>
            <FarmMetaFields value={meta} onChange={setMeta} />
          </Card>

          <Card title={t('farms.fieldsTitle')} icon={Layers}>
            {drafts.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('farms.noDraftFields')}</p>
            ) : (
              <ul className="space-y-2">
                {drafts.map((draft) => (
                  <li key={draft.id} className="flex items-end gap-2">
                    <TextField
                      className="flex-1"
                      label={`${t('farms.fieldName')} · ${format.hectares(polygonAreaM2(draft.geometry))}`}
                      value={draft.name}
                      onFocus={() => setSelectedId(draft.id)}
                      onChange={(e) =>
                        setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, name: e.target.value } : d)))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      icon={X}
                      className="mb-1.5"
                      aria-label={t('farms.removeDraft', { name: draft.name })}
                      onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
                    />
                  </li>
                ))}
              </ul>
            )}
            {showFieldError && (
              <p role="alert" className="mt-3 text-xs text-danger-fg">
                {t('farms.fieldRequired')}
              </p>
            )}
          </Card>

          <Button type="submit" size="md" icon={Plus} className="w-full" disabled={submitting}>
            {submitting ? t('farms.creating') : t('farms.create')}
          </Button>
        </form>

        <Card className="xl:col-span-8 p-4">
          <FieldsMapEditor
            fields={drafts}
            selectedFieldId={selectedId}
            onSelectField={setSelectedId}
            onCreateField={addDraft}
            onChangeFieldGeometry={changeGeometry}
            background={background}
            fitKey={`import-${importCount}`}
            toolbarExtra={
              <GeoJsonImportButton
                onImport={(imported) => {
                  imported.forEach((f) => addDraft(f.geometry, f.name, f.excludedZones));
                  setImportCount((n) => n + 1);
                }}
              />
            }
          />
        </Card>
      </div>
    </>
  );
}
