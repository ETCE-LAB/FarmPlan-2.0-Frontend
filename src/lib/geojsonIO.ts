import proj4 from 'proj4';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Polygon, Position } from 'geojson';
import { multiPolygonParts, netAreaM2 } from '@farm/lib/geo';
import type { Farm, Field } from '@farm/types';

const PROJECTIONS: Record<string, string> = {
  'EPSG:25832': '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  'EPSG:25833': '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  'EPSG:31467':
    '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs',
  'EPSG:3857':
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs',
};

const WGS84 = 'EPSG:4326';
const NAME_KEYS = ['name', 'bezeichnung', 'schlagname', 'schlag', 'flik', 'label', 'title'];

export interface ImportedField {
  name: string | null;
  geometry: Polygon;
  excludedZones: Polygon[];
}

export type GeoJsonImportResult =
  | { ok: true; fields: ImportedField[]; skipped: number; crs: string }
  | {
      ok: false;
      error: 'invalidJson' | 'noPolygons' | 'unsupportedCrs' | 'projectedWithoutCrs' | 'invalidGeometry';
      detail?: string;
    };

export function exportFarmGeoJson(farm: Farm, fields: Field[]): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];
  for (const field of fields) {
    if (!field.geometry) continue;
    features.push({
      type: 'Feature',
      geometry: field.geometry,
      properties: {
        kind: 'field',
        id: field.id,
        name: field.name,
        farm: farm.name,
        areaM2: Math.round(field.areaM2),
        netAreaM2: Math.round(netAreaM2(field.geometry, field.excludedZones)),
        soilType: field.soilType,
        soilPh: field.soilPh,
      },
    });
    multiPolygonParts(field.excludedZones).forEach((zone, index) =>
      features.push({
        type: 'Feature',
        geometry: zone,
        properties: { kind: 'excludedZone', fieldId: field.id, fieldName: field.name, index },
      }),
    );
  }
  return { type: 'FeatureCollection', features };
}

export function parseFieldsGeoJson(text: string): GeoJsonImportResult {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (!isObject(input) || typeof input.type !== 'string') return { ok: false, error: 'invalidJson' };

  const crs = readCrs(input);
  if (crs && crs !== WGS84 && !PROJECTIONS[crs]) return { ok: false, error: 'unsupportedCrs', detail: crs };

  const features = toFeatures(input);
  const fields: (ImportedField & { sourceId: unknown })[] = [];
  const zones: { fieldId: unknown; polygon: Polygon }[] = [];
  let skipped = 0;

  for (const feature of features) {
    const polygons = polygonsOf(feature.geometry);
    if (polygons.length === 0) {
      skipped++;
      continue;
    }
    const props = feature.properties ?? {};
    for (const raw of polygons) {
      if (props.kind === 'excludedZone') {
        zones.push({ fieldId: props.fieldId, polygon: raw });
      } else {
        fields.push({ sourceId: props.id, name: readName(props), geometry: raw, excludedZones: [] });
      }
    }
  }

  if (fields.length === 0) return { ok: false, error: 'noPolygons' };

  const sample = fields[0].geometry.coordinates[0][0];
  if (!crs && !looksLikeLngLat(sample)) return { ok: false, error: 'projectedWithoutCrs' };

  const transform = crs && crs !== WGS84 ? proj4(PROJECTIONS[crs], WGS84) : null;
  const normalize = (polygon: Polygon) =>
    normalizePolygon(polygon, transform ? (p) => transform.forward([p[0], p[1]]) : (p) => p);

  try {
    const result: ImportedField[] = fields.map(({ sourceId, name, geometry }) => ({
      name,
      geometry: normalize(geometry),
      excludedZones: zones
        .filter((z) => sourceId !== undefined && z.fieldId === sourceId)
        .map((z) => normalize(z.polygon)),
    }));
    const matchedZones = result.reduce((sum, f) => sum + f.excludedZones.length, 0);
    return { ok: true, fields: result, skipped: skipped + zones.length - matchedZones, crs: crs ?? WGS84 };
  } catch (error) {
    return { ok: false, error: 'invalidGeometry', detail: error instanceof Error ? error.message : undefined };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCrs(input: Record<string, unknown>): string | null {
  const name = isObject(input.crs) && isObject(input.crs.properties) ? input.crs.properties.name : undefined;
  if (typeof name !== 'string') return null;
  if (/CRS84$/i.test(name)) return WGS84;
  const code = /EPSG:{1,2}(\d+)/i.exec(name)?.[1];
  return code ? `EPSG:${code}` : name;
}

function toFeatures(input: Record<string, unknown>): Feature[] {
  if (input.type === 'FeatureCollection' && Array.isArray(input.features)) {
    return input.features.filter((f): f is Feature => isObject(f) && f.type === 'Feature');
  }
  if (input.type === 'Feature') return [input as unknown as Feature];
  return [{ type: 'Feature', geometry: input as unknown as Geometry, properties: {} }];
}

function polygonsOf(geometry: Geometry | null | undefined): Polygon[] {
  if (!geometry) return [];
  switch (geometry.type) {
    case 'Polygon':
      return [geometry];
    case 'MultiPolygon':
      return multiPolygonParts(geometry);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(polygonsOf);
    default:
      return [];
  }
}

function readName(props: NonNullable<GeoJsonProperties>): string | null {
  for (const [key, value] of Object.entries(props)) {
    if (NAME_KEYS.includes(key.toLowerCase()) && (typeof value === 'string' || typeof value === 'number')) {
      const name = String(value).trim();
      if (name) return name;
    }
  }
  return null;
}

function looksLikeLngLat(position: Position | undefined) {
  return !!position && Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90;
}

function normalizePolygon(polygon: Polygon, toLngLat: (p: Position) => Position): Polygon {
  const rings = polygon.coordinates.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 3) throw new Error('Ring with fewer than 3 positions');
    const converted = ring.map((position) => {
      if (!Array.isArray(position) || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
        throw new Error('Invalid coordinate');
      }
      const [lng, lat] = toLngLat(position);
      if (!looksLikeLngLat([lng, lat])) throw new Error('Coordinate out of range');
      return [lng, lat];
    });
    const first = converted[0];
    const last = converted[converted.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) converted.push([...first]);
    if (converted.length < 4) throw new Error('Ring with fewer than 3 distinct positions');
    return converted;
  });
  return { type: 'Polygon', coordinates: rings };
}
