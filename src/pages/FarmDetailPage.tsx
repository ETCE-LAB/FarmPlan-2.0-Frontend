import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { MultiPolygon, Polygon } from 'geojson';
import { Download, Layers, MapPin, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@farm/components/shared/PageHeader';
import { Card } from '@farm/components/ui/Card';
import { Button } from '@farm/components/ui/Button';
import { FarmMetaFields } from '@farm/components/farms/FarmMetaFields';
import { farmToMeta, metaToInput, type FarmMeta } from '@farm/components/farms/farmMeta';
import { FieldDetailsForm } from '@farm/components/farms/FieldDetailsForm';
import { GeoJsonImportButton } from '@farm/components/farms/GeoJsonImportButton';
import { TreelinePanel } from '@farm/components/farms/TreelinePanel';
import { FieldsMapEditor, type EditorField } from '@farm/components/map/FieldsMapEditor';
import { useFormat } from '@farm/lib/format';
import { downloadJson, slugify } from '@farm/lib/download';
import { netAreaM2, partsToMultiPolygon, polygonAreaM2 } from '@farm/lib/geo';
import { exportFarmGeoJson, type ImportedField } from '@farm/lib/geojsonIO';
import { generateTreelines, type TreelineOptions } from '@farm/lib/treelines';
import { FIELD_ATTRIBUTE_DEFAULTS } from '@farm/lib/fields';
import { cn, createId } from '@farm/lib/utils';
import * as farmSync from '@farm/store/farmSync';
import { useFarmStore } from '@farm/store/useFarmStore';
import { confirmAction, showToast } from '@farm/store/useUiStore';
import type { Farm, Field } from '@farm/types';
import NotFoundPage from './NotFoundPage';

const DEFAULT_TREELINE_OPTIONS: TreelineOptions = {
  orientationDeg: 90,
  rowSpacingM: 12,
  edgeBufferM: 2,
  inRowSpacingM: 2,
};

function MasterDataCard({ farm }: { farm: Farm }) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<FarmMeta>(() => farmToMeta(farm));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await farmSync.saveFarmMeta(farm.id, metaToInput(meta));
    setSaving(false);
    if (result.ok) showToast({ message: t('farms.saved') });
    else showToast({ tone: 'error', message: t('farms.saveFailed', { reason: farmSync.apiErrorMessage(result) }) });
  };

  return (
    <Card title={t('farms.masterData')} icon={MapPin}>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <FarmMetaFields value={meta} onChange={setMeta} />
        <div className="flex justify-end">
          <Button type="submit" icon={Save} disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
      </form>
      <BoundarySummary farm={farm} />
    </Card>
  );
}

/** Area and perimeter of the farm boundary as computed by the server. */
function BoundarySummary({ farm }: { farm: Farm }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <div className="mt-5 pt-4 border-t border-line-subtle">
      <h3 className="text-xs font-semibold text-ink-soft mb-2">{t('farms.boundary')}</h3>
      {farm.boundary ? (
        <>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-surface-muted border border-line p-2">
              <dt className="text-ink-muted">{t('farms.boundaryArea')}</dt>
              <dd className="font-semibold text-ink">
                {farm.boundaryAreaM2 === null ? '–' : format.hectares(farm.boundaryAreaM2)}
              </dd>
            </div>
            <div className="rounded bg-surface-muted border border-line p-2">
              <dt className="text-ink-muted">{t('farms.boundaryPerimeter')}</dt>
              <dd className="font-semibold text-ink">
                {farm.boundaryPerimeterM === null ? '–' : format.metres(farm.boundaryPerimeterM)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-ink-muted">{t('farms.boundaryHint')}</p>
        </>
      ) : (
        <p className="text-[11px] text-ink-muted">{t('farms.noBoundary')}</p>
      )}
    </div>
  );
}

export default function FarmDetailPage() {
  const { farmId } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const farm = useFarmStore((s) => s.farms.find((f) => f.id === farmId) ?? null);
  const farmsStatus = useFarmStore((s) => s.farmsStatus);
  const allFields = useFarmStore((s) => s.fields);

  const [treelineOptions, setTreelineOptions] = useState(DEFAULT_TREELINE_OPTIONS);
  const [showTreelines, setShowTreelines] = useState(true);
  const [importCount, setImportCount] = useState(0);

  const fields = useMemo(() => allFields.filter((f) => f.farmId === farmId), [allFields, farmId]);
  const editorFields = useMemo<EditorField[]>(
    () =>
      fields.flatMap((f) =>
        f.geometry ? [{ id: f.id, name: f.name, geometry: f.geometry, excludedZones: f.excludedZones }] : [],
      ),
    [fields],
  );

  const selectedFieldId = searchParams.get('field');
  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;
  const selectField = useCallback(
    (id: string | null) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('field', id);
          else next.delete('field');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  // A newly drawn field gets its server ID shortly after creation; keep it selected.
  useEffect(() => {
    if (!selectedFieldId) return;
    const resolved = farmSync.resolveFieldId(selectedFieldId);
    if (resolved !== selectedFieldId && fields.some((f) => f.id === resolved)) selectField(resolved);
  }, [fields, selectedFieldId, selectField]);

  const preview = useMemo(
    () =>
      selectedField?.geometry && showTreelines
        ? generateTreelines(selectedField.geometry, selectedField.excludedZones, treelineOptions)
        : null,
    [selectedField, showTreelines, treelineOptions],
  );
  const treelineGeometries = useMemo(() => preview?.segments.map((s) => s.geometry) ?? [], [preview]);

  /** Creates fields locally and on the server; several fields go in one atomic import. */
  const createFields = useCallback(
    (drafts: { geometry: Polygon; name?: string | null; excluded?: Polygon[] }[]) => {
      if (!farmId) return [];
      const existing = useFarmStore.getState().fields.filter((f) => f.farmId === farmId).length;
      const fields = drafts.map(({ geometry, name, excluded = [] }, i): Field => ({
        ...FIELD_ATTRIBUTE_DEFAULTS,
        id: createId('field'),
        farmId,
        name: name || t('farms.defaultFieldName', { index: existing + i + 1 }),
        geometry,
        areaM2: polygonAreaM2(geometry),
        excludedZones: partsToMultiPolygon(excluded),
      }));
      if (fields.length) void farmSync.addFields(farmId, fields);
      return fields;
    },
    [farmId, t],
  );

  const handleDrawnField = useCallback(
    (geometry: Polygon) => {
      const [field] = createFields([{ geometry }]);
      if (field) selectField(field.id);
    },
    [createFields, selectField],
  );
  const changeGeometry = useCallback(
    (id: string, geometry: Polygon) => void farmSync.updateField(id, { geometry }),
    [],
  );
  const changeExclusions = useCallback(
    (id: string, excludedZones: MultiPolygon | null) => void farmSync.updateField(id, { excludedZones }),
    [],
  );
  const farmName = farm?.name ?? '';
  const changeBoundary = useCallback(
    async (boundary: Polygon | null) => {
      if (!farmId) return;
      if (boundary === null) {
        const confirmed = await confirmAction({
          title: t('farms.confirmRemoveBoundaryTitle'),
          message: t('farms.confirmRemoveBoundary', { name: farmName }),
          confirmLabel: t('map.removeBoundary'),
          cancelLabel: t('common.cancel'),
          tone: 'danger',
        });
        if (!confirmed) return;
      }
      const isNew = !useFarmStore.getState().farms.find((f) => f.id === farmId)?.boundary;
      const result = await farmSync.saveFarmBoundary(farmId, boundary);
      // Vertex edits save silently; drawing and removing confirm with a toast. Failures are reported by farmSync.
      if (result.ok && (boundary === null || isNew)) {
        showToast({ message: t(boundary ? 'farms.boundarySaved' : 'farms.boundaryRemoved') });
      }
    },
    [farmId, farmName, t],
  );
  const handleBoundaryChange = useCallback(
    (boundary: Polygon | null) => void changeBoundary(boundary),
    [changeBoundary],
  );

  if (!farm) {
    if (farmsStatus === 'loading' || farmsStatus === 'idle') {
      return <output className="block py-10 text-center text-sm text-ink-muted">{t('api.loading')}</output>;
    }
    return <NotFoundPage />;
  }

  const handleImport = (imported: ImportedField[]) => {
    createFields(imported.map((f) => ({ geometry: f.geometry, name: f.name, excluded: f.excludedZones })));
    setImportCount((n) => n + 1);
  };

  const handleExport = () => {
    downloadJson(`${slugify(farm.name)}.geojson`, exportFarmGeoJson(farm, fields), 'application/geo+json');
  };

  const handleDeleteFarm = async () => {
    const confirmed = await confirmAction({
      title: t('farms.deleteFarmTitle'),
      message: t('farms.confirmDeleteFarm', { name: farm.name, count: fields.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    const result = await farmSync.deleteFarm(farm.id);
    if (!result.ok) {
      showToast({
        tone: 'error',
        message: t('farms.deleteFailed', { reason: farmSync.apiErrorMessage(result) }),
      });
      return;
    }
    showToast({ message: t('farms.farmDeleted', { name: farm.name }) });
    navigate('/farms');
  };

  const totalArea = fields.reduce((sum, f) => sum + f.areaM2, 0);

  return (
    <>
      <PageHeader
        title={farm.name}
        subtitle={[farm.location, t('farms.summary', { count: fields.length, area: format.hectares(totalArea) })]
          .filter(Boolean)
          .join(' · ')}
        back={{ to: '/farms', label: t('nav.farms.label') }}
        actions={
          <Button variant="danger" icon={Trash2} onClick={() => void handleDeleteFarm()}>
            {t('farms.deleteFarm')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <MasterDataCard key={farm.id} farm={farm} />

          <Card title={t('farms.fieldsTitle')} icon={Layers}>
            {fields.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('farms.noFields')}</p>
            ) : (
              <ul className="space-y-2">
                {fields.map((field) => {
                  const isSelected = field.id === selectedFieldId;
                  return (
                    <li
                      key={field.id}
                      className={cn(
                        'rounded border',
                        isSelected ? 'border-brand-700 bg-brand-50/40 px-3 pb-3' : 'border-line-subtle',
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={isSelected}
                        onClick={() => selectField(isSelected ? null : field.id)}
                        className={cn(
                          'w-full text-left py-2.5 flex justify-between gap-2 text-sm cursor-pointer',
                          !isSelected && 'px-3 hover:bg-surface-muted',
                        )}
                      >
                        <span className="font-semibold text-ink">{field.name}</span>
                        <span className="font-mono text-xs text-ink-soft whitespace-nowrap">
                          {format.hectares(
                            field.geometry ? netAreaM2(field.geometry, field.excludedZones) : field.areaM2,
                          )}
                        </span>
                      </button>
                      {isSelected && (
                        <FieldDetailsForm key={field.id} field={field} onDeleted={() => selectField(null)} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-ink-muted">{t('farms.netAreaHint')}</p>
          </Card>

          <TreelinePanel
            fieldName={selectedField?.name ?? null}
            options={treelineOptions}
            onChange={setTreelineOptions}
            enabled={showTreelines}
            onToggle={setShowTreelines}
            preview={preview}
          />
        </div>

        <Card className="xl:col-span-8 p-4 self-start">
          <FieldsMapEditor
            fields={editorFields}
            selectedFieldId={selectedFieldId}
            onSelectField={selectField}
            onCreateField={handleDrawnField}
            onChangeFieldGeometry={changeGeometry}
            onChangeExclusions={changeExclusions}
            boundary={farm.boundary}
            onChangeBoundary={handleBoundaryChange}
            treelines={treelineGeometries}
            fitKey={`${farm.id}-${importCount}`}
            toolbarExtra={
              <>
                <GeoJsonImportButton onImport={handleImport} />
                <Button variant="secondary" icon={Download} disabled={editorFields.length === 0} onClick={handleExport}>
                  {t('geojson.export')}
                </Button>
              </>
            }
          />
          <p className="mt-3 text-[11px] text-ink-muted">
            {t('farms.geojsonHint')}{' '}
            <Link to="/settings" className="text-brand-fg hover:underline">
              {t('farms.backupLink')}
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
