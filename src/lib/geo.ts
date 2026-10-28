import turfArea from '@turf/area';
import turfIntersect from '@turf/intersect';
import { featureCollection, polygon as turfPolygon } from '@turf/helpers';
import type { MultiPolygon, Polygon, Position } from 'geojson';

/* [lat, lng] */
export type LatLngTuple = [number, number];

export function latLngsToPolygon(points: LatLngTuple[]): Polygon {
  if (points.length < 3) {
    throw new Error('A polygon needs at least 3 vertices');
  }
  const ring: Position[] = points.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function polygonToLatLngs(polygon: Polygon): LatLngTuple[] {
  const ring = polygon.coordinates[0] ?? [];
  const open = ring.length > 1 && samePosition(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => [lat, lng]);
}

export function polygonToLatLngRings(polygon: Polygon): LatLngTuple[][] {
  return polygon.coordinates.map((ring) => polygonToLatLngs({ type: 'Polygon', coordinates: [ring] }));
}

export function polygonAreaM2(polygon: Polygon): number {
  return turfArea(polygon);
}

export function latLngsAreaM2(points: LatLngTuple[]): number {
  return points.length < 3 ? 0 : polygonAreaM2(latLngsToPolygon(points));
}

export const m2ToHa = (m2: number) => m2 / 10_000;

export function multiPolygonParts(multi: MultiPolygon | null): Polygon[] {
  return (multi?.coordinates ?? []).map((coordinates) => ({ type: 'Polygon', coordinates }));
}

export function partsToMultiPolygon(parts: Polygon[]): MultiPolygon | null {
  return parts.length === 0 ? null : { type: 'MultiPolygon', coordinates: parts.map((p) => p.coordinates) };
}

export function netAreaM2(geometry: Polygon, excludedZones: MultiPolygon | null): number {
  const gross = polygonAreaM2(geometry);
  const field = turfPolygon(geometry.coordinates);
  const excluded = multiPolygonParts(excludedZones).reduce((sum, zone) => {
    const overlap = turfIntersect(featureCollection([field, turfPolygon(zone.coordinates)]));
    return sum + (overlap ? turfArea(overlap) : 0);
  }, 0);
  return Math.max(0, gross - excluded);
}

export function rectanglePolygon(swLat: number, swLng: number, widthM: number, heightM: number): Polygon {
  const metresPerDegLat = 111_320;
  const dLat = heightM / metresPerDegLat;
  const dLng = widthM / (metresPerDegLat * Math.cos((swLat * Math.PI) / 180));
  return latLngsToPolygon([
    [swLat, swLng],
    [swLat + dLat, swLng],
    [swLat + dLat, swLng + dLng],
    [swLat, swLng + dLng],
  ]);
}

function samePosition(a: Position, b: Position) {
  return a[0] === b[0] && a[1] === b[1];
}
