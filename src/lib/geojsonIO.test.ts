import { describe, expect, it } from 'vitest';
import proj4 from 'proj4';
import type { Polygon } from 'geojson';
import { exportFarmGeoJson, parseFieldsGeoJson } from './geojsonIO';
import { partsToMultiPolygon, polygonAreaM2, rectanglePolygon } from './geo';
import { INITIAL_FARMS, INITIAL_FIELDS } from '@farm/data/mockData';
import type { Field } from '@farm/types';

const square = rectanglePolygon(52.27, 10.52, 100, 100);
const json = (value: unknown) => JSON.stringify(value);

describe('parseFieldsGeoJson', () => {
  it('reads a FeatureCollection with names from common property keys', () => {
    const result = parseFieldsGeoJson(
      json({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: square, properties: { NAME: 'Nordschlag' } },
          { type: 'Feature', geometry: square, properties: { FLIK: 'DENILI0123456789' } },
          { type: 'Feature', geometry: square, properties: {} },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields.map((f) => f.name)).toEqual(['Nordschlag', 'DENILI0123456789', null]);
    expect(result.crs).toBe('EPSG:4326');
  });

  it('accepts bare geometries and splits MultiPolygons into fields', () => {
    const multi = { type: 'MultiPolygon', coordinates: [square.coordinates, square.coordinates] };
    const result = parseFieldsGeoJson(json(multi));
    expect(result.ok && result.fields.length).toBe(2);
  });

  it('skips features without areas and counts them', () => {
    const result = parseFieldsGeoJson(
      json({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: square, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [10.5, 52.2] }, properties: {} },
          { type: 'Feature', geometry: null, properties: {} },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: true, skipped: 2 });
  });

  it('closes unclosed rings', () => {
    const open: Polygon = { type: 'Polygon', coordinates: [square.coordinates[0].slice(0, -1)] };
    const result = parseFieldsGeoJson(json(open));
    if (!result.ok) throw new Error(result.error);
    const ring = result.fields[0].geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(5);
  });

  it('transforms ETRS89 / UTM 32N (EPSG:25832) coordinates to WGS84', () => {
    const utm = proj4('EPSG:4326', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
    const projected = {
      type: 'Polygon',
      coordinates: [square.coordinates[0].map(([lng, lat]) => utm.forward([lng, lat]))],
    };
    const result = parseFieldsGeoJson(
      json({ type: 'Feature', geometry: projected, properties: {}, crs: undefined, ...{} }).replace(
        '"type":"Feature"',
        '"type":"Feature","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::25832"}}',
      ),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.crs).toBe('EPSG:25832');
    const [lng, lat] = result.fields[0].geometry.coordinates[0][0];
    expect(lng).toBeCloseTo(10.52, 5);
    expect(lat).toBeCloseTo(52.27, 5);
    expect(polygonAreaM2(result.fields[0].geometry)).toBeCloseTo(10_000, -2);
  });

  it.each([
    ['invalid JSON', '{nope', 'invalidJson'],
    ['a non-object', '42', 'invalidJson'],
    ['no polygons', json({ type: 'Point', coordinates: [10, 52] }), 'noPolygons'],
    [
      'an unknown CRS',
      json({ type: 'FeatureCollection', crs: { type: 'name', properties: { name: 'EPSG:2154' } }, features: [] }),
      'unsupportedCrs',
    ],
    [
      'projected coordinates without CRS',
      json({
        type: 'Polygon',
        coordinates: [
          [
            [600000, 5790000],
            [600100, 5790000],
            [600100, 5790100],
            [600000, 5790000],
          ],
        ],
      }),
      'projectedWithoutCrs',
    ],
    [
      'a degenerate ring',
      json({
        type: 'Polygon',
        coordinates: [
          [
            [10, 52],
            [10.1, 52],
            [10, 52],
          ],
        ],
      }),
      'invalidGeometry',
    ],
  ])('rejects %s', (_, input, error) => {
    expect(parseFieldsGeoJson(input)).toMatchObject({ ok: false, error });
  });
});

describe('exportFarmGeoJson', () => {
  const farm = INITIAL_FARMS[0];

  it('exports every field with its properties', () => {
    const fields = INITIAL_FIELDS.filter((f) => f.farmId === farm.id);
    const collection = exportFarmGeoJson(farm, fields);
    expect(collection.features).toHaveLength(fields.length);
    expect(collection.features[0].properties).toMatchObject({ kind: 'field', farm: farm.name, name: fields[0].name });
  });

  it('round-trips fields and their exclusion zones through the importer', () => {
    const zone = rectanglePolygon(52.2685, 10.521, 20, 20);
    const field: Field = { ...INITIAL_FIELDS[0], excludedZones: partsToMultiPolygon([zone]) };
    const collection = exportFarmGeoJson(farm, [field]);
    expect(collection.features.map((f) => f.properties?.kind)).toEqual(['field', 'excludedZone']);

    const result = parseFieldsGeoJson(JSON.stringify(collection));
    if (!result.ok) throw new Error(result.error);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toBe(field.name);
    expect(result.fields[0].excludedZones).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it('leaves out fields without geometry', () => {
    const field: Field = { ...INITIAL_FIELDS[0], geometry: null };
    expect(exportFarmGeoJson(farm, [field]).features).toEqual([]);
  });
});
