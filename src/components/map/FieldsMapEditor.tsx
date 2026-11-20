import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { Ban, Check, Fence, Info, PenTool, SquarePen, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@farm/components/ui/Button';
import { multiPolygonParts, partsToMultiPolygon, polygonToLatLngRings } from '@farm/lib/geo';
import { useLeafletMap } from './useLeafletMap';
import { popupElement } from './mapPopup';

export interface EditorField {
  id: string;
  name: string;
  geometry: Polygon;
  excludedZones: MultiPolygon | null;
}

export interface BackgroundShape {
  id: string;
  geometry: Polygon;
  popupLines: string[];
}

type Mode = 'idle' | 'drawField' | 'drawExclusion' | 'drawBoundary' | 'edit';

interface FieldsMapEditorProps {
  fields: EditorField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onCreateField: (geometry: Polygon) => void;
  onChangeFieldGeometry: (id: string, geometry: Polygon) => void;
  onChangeExclusions?: (fieldId: string, zones: MultiPolygon | null) => void;
  /** Farm boundary; drawing and editing are offered when `onChangeBoundary` is set. */
  boundary?: Polygon | null;
  /** Called with the new boundary, or `null` when the user removes it. */
  onChangeBoundary?: (boundary: Polygon | null) => void;
  treelines?: LineString[];
  background?: BackgroundShape[];
  fitKey?: string;
  toolbarExtra?: ReactNode;
}

const COLORS = {
  field: '#2e7d32',
  fieldFill: '#81c784',
  selected: '#f59e0b',
  exclusion: '#be123c',
  treeline: '#7c3aed',
  background: '#64748b',
  boundary: '#1d4ed8',
};

function layerToPolygon(layer: L.Polygon): Polygon {
  return (layer.toGeoJSON() as Feature<Polygon>).geometry;
}

export function FieldsMapEditor({
  fields,
  selectedFieldId,
  onSelectField,
  onCreateField,
  onChangeFieldGeometry,
  onChangeExclusions,
  boundary = null,
  onChangeBoundary,
  treelines = [],
  background = [],
  fitKey = '',
  toolbarExtra,
}: FieldsMapEditorProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(containerRef);
  const [mode, setMode] = useState<Mode>('idle');
  const fittedKeyRef = useRef<string | null>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const handleCreate = useEffectEvent((layer: L.Polygon) => {
    const geometry = layerToPolygon(layer);
    layer.remove();
    if (mode === 'drawExclusion' && selectedField && onChangeExclusions) {
      onChangeExclusions(
        selectedField.id,
        partsToMultiPolygon([...multiPolygonParts(selectedField.excludedZones), geometry]),
      );
    } else if (mode === 'drawField') {
      onCreateField(geometry);
    } else if (mode === 'drawBoundary') {
      onChangeBoundary?.(geometry);
    }
  });
  const handleDrawEnd = useEffectEvent(() => {
    if (mode === 'drawField' || mode === 'drawExclusion' || mode === 'drawBoundary') setMode('idle');
  });
  const handleFieldEdit = useEffectEvent((id: string, layer: L.Polygon) =>
    onChangeFieldGeometry(id, layerToPolygon(layer)),
  );
  const handleZoneEdit = useEffectEvent((field: EditorField, index: number, layer: L.Polygon) => {
    const parts = multiPolygonParts(field.excludedZones);
    parts[index] = layerToPolygon(layer);
    onChangeExclusions?.(field.id, partsToMultiPolygon(parts));
  });
  const handleBoundaryEdit = useEffectEvent((layer: L.Polygon) => onChangeBoundary?.(layerToPolygon(layer)));
  const handleSelect = useEffectEvent((id: string) => onSelectField(id));

  useEffect(() => {
    if (!map) return;
    const onCreate = (e: { layer: L.Layer }) => handleCreate(e.layer as L.Polygon);
    const onDrawEnd = () => handleDrawEnd();
    map.on('pm:create', onCreate);
    map.on('pm:drawend', onDrawEnd);
    return () => {
      map.off('pm:create', onCreate);
      map.off('pm:drawend', onDrawEnd);
    };
  }, [map]);

  useEffect(() => {
    map?.pm.setLang(i18n.language === 'de' ? 'de' : 'en');
  }, [map, i18n.language]);

  useEffect(() => {
    if (!map) return;
    if (mode === 'drawField' || mode === 'drawExclusion' || mode === 'drawBoundary') {
      const color = mode === 'drawField' ? COLORS.field : mode === 'drawBoundary' ? COLORS.boundary : COLORS.exclusion;
      map.pm.enableDraw('Polygon', {
        allowSelfIntersection: false,
        snappable: true,
        templineStyle: { color },
        hintlineStyle: { color, dashArray: '5,5' },
        pathOptions: { color },
      });
    } else {
      map.pm.disableDraw();
    }
  }, [map, mode]);

  useEffect(() => {
    if (!map) return;
    const group = L.featureGroup().addTo(map);
    const editing = mode === 'edit';

    for (const shape of background) {
      L.polygon(polygonToLatLngRings(shape.geometry), {
        color: COLORS.background,
        weight: 1,
        fillOpacity: 0.1,
        dashArray: '4,4',
        pmIgnore: true,
      })
        .bindPopup(popupElement(shape.popupLines))
        .addTo(group);
    }

    // The boundary goes first, so fields drawn on top of it stay clickable.
    if (boundary) {
      const boundaryLayer = L.polygon(polygonToLatLngRings(boundary), {
        color: COLORS.boundary,
        fillColor: COLORS.boundary,
        fillOpacity: 0.04,
        weight: 3,
        dashArray: '10,6',
      })
        .bindTooltip(t('map.boundary'), { sticky: true })
        .addTo(group);
      if (editing && onChangeBoundary) {
        boundaryLayer.pm.enable({ allowSelfIntersection: false });
        boundaryLayer.on('pm:edit', () => handleBoundaryEdit(boundaryLayer));
      }
    }

    for (const field of fields) {
      const isSelected = field.id === selectedFieldId;
      const polygon = L.polygon(polygonToLatLngRings(field.geometry), {
        color: isSelected ? COLORS.selected : COLORS.field,
        fillColor: COLORS.fieldFill,
        fillOpacity: isSelected ? 0.35 : 0.25,
        weight: isSelected ? 3 : 2,
      })
        .bindTooltip(field.name, { sticky: true })
        .addTo(group);
      polygon.on('click', () => handleSelect(field.id));
      if (editing) {
        polygon.pm.enable({ allowSelfIntersection: false });
        polygon.on('pm:edit', () => handleFieldEdit(field.id, polygon));
      }

      multiPolygonParts(field.excludedZones).forEach((zone, index) => {
        const zoneLayer = L.polygon(polygonToLatLngRings(zone), {
          color: COLORS.exclusion,
          fillColor: COLORS.exclusion,
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '6,4',
        }).addTo(group);
        zoneLayer.bindTooltip(`${t('farms.exclusionZone')} · ${field.name}`, { sticky: true });
        if (editing && onChangeExclusions) {
          zoneLayer.pm.enable({ allowSelfIntersection: false });
          zoneLayer.on('pm:edit', () => handleZoneEdit(field, index, zoneLayer));
        }
      });
    }

    for (const line of treelines) {
      L.polyline(
        line.coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
        { color: COLORS.treeline, weight: 2, opacity: 0.9, interactive: false, pmIgnore: true },
      ).addTo(group);
    }

    return () => {
      group.remove();
    };
  }, [map, fields, background, boundary, treelines, selectedFieldId, mode, t, onChangeExclusions, onChangeBoundary]);

  useEffect(() => {
    if (!map || fittedKeyRef.current === fitKey) return;
    const own = [...(boundary ? [boundary] : []), ...fields.map((f) => f.geometry)];
    const shapes = own.length > 0 ? own : background.map((b) => b.geometry);
    if (shapes.length === 0) return;
    const bounds = L.latLngBounds(shapes.flatMap((g) => polygonToLatLngRings(g)[0]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    fittedKeyRef.current = fitKey;
  }, [map, fitKey, fields, background, boundary]);

  const focusSelectedField = useEffectEvent(() => {
    const field = fields.find((f) => f.id === selectedFieldId);
    if (!map || !field) return;
    map.fitBounds(L.latLngBounds(polygonToLatLngRings(field.geometry)[0]), { padding: [40, 40], maxZoom: 18 });
  });
  useEffect(() => {
    if (map && selectedFieldId) focusSelectedField();
  }, [map, selectedFieldId]);

  const hint =
    mode === 'drawField' || mode === 'drawExclusion' || mode === 'drawBoundary'
      ? t('map.hints.draw')
      : mode === 'edit'
        ? t('map.hints.edit')
        : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'idle' ? (
          <>
            <Button icon={PenTool} onClick={() => setMode('drawField')}>
              {t('map.drawField')}
            </Button>
            {onChangeExclusions && (
              <Button
                variant="secondary"
                icon={Ban}
                disabled={!selectedField}
                title={selectedField ? undefined : t('map.selectFieldFirst')}
                onClick={() => setMode('drawExclusion')}
              >
                {t('map.drawExclusion')}
              </Button>
            )}
            {onChangeBoundary &&
              (boundary ? (
                <Button variant="secondary" icon={Trash2} onClick={() => onChangeBoundary(null)}>
                  {t('map.removeBoundary')}
                </Button>
              ) : (
                <Button variant="secondary" icon={Fence} onClick={() => setMode('drawBoundary')}>
                  {t('map.drawBoundary')}
                </Button>
              ))}
            <Button
              variant="secondary"
              icon={SquarePen}
              disabled={fields.length === 0 && !(boundary && onChangeBoundary)}
              onClick={() => setMode('edit')}
            >
              {t('map.editShapes')}
            </Button>
          </>
        ) : mode === 'edit' ? (
          <Button icon={Check} onClick={() => setMode('idle')}>
            {t('map.finishEditing')}
          </Button>
        ) : (
          <Button variant="secondary" icon={X} onClick={() => setMode('idle')}>
            {t('common.cancel')}
          </Button>
        )}
        {toolbarExtra && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbarExtra}</div>}
      </div>

      <div aria-live="polite">
        {hint && (
          <div className="p-2.5 bg-info-bg border border-info-line rounded text-info-fg text-xs flex items-center gap-2">
            <Info size={16} aria-hidden className="shrink-0" />
            <span>
              {mode === 'drawExclusion' && selectedField ? `${selectedField.name}: ` : ''}
              {hint}
            </span>
          </div>
        )}
      </div>

      <section
        ref={containerRef}
        aria-label={t('map.label')}
        className="w-full h-[60vh] min-h-[360px] rounded border border-line z-0"
      />
    </div>
  );
}
