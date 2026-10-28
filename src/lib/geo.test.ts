import { describe, expect, it } from 'vitest';
import {
  latLngsAreaM2,
  latLngsToPolygon,
  multiPolygonParts,
  netAreaM2,
  partsToMultiPolygon,
  polygonAreaM2,
  polygonToLatLngRings,
  polygonToLatLngs,
  rectanglePolygon,
  type LatLngTuple,
} from './geo';

describe('geo', () => {
  const triangle: LatLngTuple[] = [
    [52.0, 10.0],
    [52.01, 10.0],
    [52.0, 10.01],
  ];

  it('converts Leaflet [lat, lng] to a closed GeoJSON [lng, lat] ring', () => {
    const polygon = latLngsToPolygon(triangle);
    expect(polygon.coordinates[0]).toEqual([
      [10.0, 52.0],
      [10.0, 52.01],
      [10.01, 52.0],
      [10.0, 52.0],
    ]);
  });

  it('round-trips back to Leaflet vertices without the closing point', () => {
    expect(polygonToLatLngs(latLngsToPolygon(triangle))).toEqual(triangle);
  });

  it('rejects polygons with fewer than three vertices', () => {
    expect(() => latLngsToPolygon(triangle.slice(0, 2))).toThrow();
    expect(latLngsAreaM2(triangle.slice(0, 2))).toBe(0);
  });

  it('computes a geodesic area that matches the rectangle size', () => {
    const area = polygonAreaM2(rectanglePolygon(52.27, 10.52, 300, 200));
    expect(area).toBeGreaterThan(60_000 * 0.995);
    expect(area).toBeLessThan(60_000 * 1.005);
  });
});

describe('multi polygons and net area', () => {
  const field = rectanglePolygon(52.27, 10.52, 100, 100);
  const inner = rectanglePolygon(52.2701, 10.5202, 20, 20);

  it('converts between parts and MultiPolygon', () => {
    expect(partsToMultiPolygon([])).toBeNull();
    expect(multiPolygonParts(null)).toEqual([]);
    expect(multiPolygonParts(partsToMultiPolygon([field, inner]))).toEqual([field, inner]);
  });

  it('subtracts exclusion zones inside the field', () => {
    expect(netAreaM2(field, null)).toBeCloseTo(polygonAreaM2(field), 3);
    expect(netAreaM2(field, partsToMultiPolygon([inner]))).toBeCloseTo(polygonAreaM2(field) - polygonAreaM2(inner), 0);
  });

  it('only subtracts the part of a zone that overlaps the field', () => {
    const half = rectanglePolygon(
      52.27 + 50 / 111_320,
      10.52 + 90 / (111_320 * Math.cos((52.27 * Math.PI) / 180)),
      20,
      20,
    );
    expect(netAreaM2(field, partsToMultiPolygon([half]))).toBeCloseTo(
      polygonAreaM2(field) - polygonAreaM2(half) / 2,
      -1,
    );
  });

  it('ignores zones outside the field', () => {
    const outside = rectanglePolygon(53, 11, 20, 20);
    expect(netAreaM2(field, partsToMultiPolygon([outside]))).toBeCloseTo(polygonAreaM2(field), 3);
  });

  it('returns all rings including holes for Leaflet', () => {
    const withHole = { type: 'Polygon' as const, coordinates: [field.coordinates[0], inner.coordinates[0]] };
    const rings = polygonToLatLngRings(withHole);
    expect(rings).toHaveLength(2);
    expect(rings[1]).toHaveLength(4);
  });
});
