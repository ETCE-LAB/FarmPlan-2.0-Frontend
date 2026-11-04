import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { Ban, Check, Info, PenTool, SquarePen, X } from 'lucide-react';
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

type Mode = 'idle' | 'drawField' | 'drawExclusion' | 'edit';

interface FieldsMapEditorProps {
  fields: EditorField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onCreateField: (geometry: Polygon) => void;
  onChangeFieldGeometry: (id: string, geometry: Polygon) => void;
  onChangeExclusions?: (fieldId: string, zones: MultiPolygon | null) => void;
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
    }
  });
  const handleDrawEnd = useEffectEvent(() => {
    if (mode === 'drawField' || mode === 'drawExclusion') setMode('idle');
  });
  const handleFieldEdit = useEffectEvent((id: string, layer: L.Polygon) =>
    onChangeFieldGeometry(id, layerToPolygon(layer)),
  );
  const handleZoneEdit = useEffectEvent((field: EditorField, index: number, layer: L.Polygon) => {
    const parts = multiPolygonParts(field.excludedZones);
    parts[index] = layerToPolygon(layer);
    onChangeExclusions?.(field.id, partsToMultiPolygon(parts));
  });
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
    if (mode === 'drawField' || mode === 'drawExclusion') {
      const color = mode === 'drawField' ? COLORS.field : COLORS.exclusion;
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
  }, [map, fields, background, treelines, selectedFieldId, mode, t, onChangeExclusions]);

  useEffect(() => {
    if (!map || fittedKeyRef.current === fitKey) return;
    const shapes = fields.length > 0 ? fields.map((f) => f.geometry) : background.map((b) => b.geometry);
    if (shapes.length === 0) return;
    const bounds = L.latLngBounds(shapes.flatMap((g) => polygonToLatLngRings(g)[0]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    fittedKeyRef.current = fitKey;
  }, [map, fitKey, fields, background]);

  const focusSelectedField = useEffectEvent(() => {
    const field = fields.find((f) => f.id === selectedFieldId);
    if (!map || !field) return;
    map.fitBounds(L.latLngBounds(polygonToLatLngRings(field.geometry)[0]), { padding: [40, 40], maxZoom: 18 });
  });
  useEffect(() => {
    if (map && selectedFieldId) focusSelectedField();
  }, [map, selectedFieldId]);

  const hint =
    mode === 'drawField' || mode === 'drawExclusion'
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
            <Button variant="secondary" icon={SquarePen} disabled={fields.length === 0} onClick={() => setMode('edit')}>
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
