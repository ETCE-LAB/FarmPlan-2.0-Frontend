import type { LineString, MultiPolygon, Polygon, Position } from 'geojson';
import { multiPolygonParts } from '@farm/lib/geo';

export interface TreelineOptions {
  orientationDeg: number;
  rowSpacingM: number;
  edgeBufferM: number;
  inRowSpacingM: number;
  minRowLengthM?: number;
}

export interface TreelineSegment {
  geometry: LineString;
  lengthM: number;
  rowIndex: number;
}

export interface TreelinePreview {
  segments: TreelineSegment[];
  rowCount: number;
  totalLengthM: number;
  estimatedPlants: number;
}

const METRES_PER_DEGREE = (6_378_137 * Math.PI) / 180;
const MAX_ROWS = 2_000;

type Interval = [number, number];
type Point = [number, number];

export function generateTreelines(
  field: Polygon,
  excludedZones: MultiPolygon | null,
  options: TreelineOptions,
): TreelinePreview {
  const { orientationDeg, rowSpacingM, edgeBufferM, inRowSpacingM, minRowLengthM = 1 } = options;
  const empty: TreelinePreview = { segments: [], rowCount: 0, totalLengthM: 0, estimatedPlants: 0 };
  if (!(rowSpacingM > 0) || !(inRowSpacingM > 0) || field.coordinates[0].length < 4) return empty;

  const frame = createFrame(field.coordinates[0], orientationDeg);
  const fieldRings = field.coordinates.map((ring) => ring.map(frame.toLocal));
  const zoneRings = multiPolygonParts(excludedZones).map((zone) =>
    zone.coordinates.map((ring) => ring.map(frame.toLocal)),
  );

  const vs = fieldRings[0].map(([, v]) => v);
  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const firstRow = vMin + Math.max(rowSpacingM / 2, edgeBufferM);

  const segments: TreelineSegment[] = [];
  let rowIndex = 0;
  for (let v = firstRow; v <= vMax - edgeBufferM + 1e-9 && rowIndex < MAX_ROWS; v += rowSpacingM, rowIndex++) {
    let intervals = insideIntervals(fieldRings, v).map(([a, b]): Interval => [a + edgeBufferM, b - edgeBufferM]);
    for (const zone of zoneRings) {
      const blocked = insideIntervals(zone, v).map(([a, b]): Interval => [a - edgeBufferM, b + edgeBufferM]);
      intervals = subtractIntervals(intervals, blocked);
    }
    for (const [a, b] of intervals) {
      if (b - a < minRowLengthM) continue;
      segments.push({
        geometry: { type: 'LineString', coordinates: [frame.toLngLat([a, v]), frame.toLngLat([b, v])] },
        lengthM: b - a,
        rowIndex,
      });
    }
  }

  const totalLengthM = segments.reduce((sum, s) => sum + s.lengthM, 0);
  return {
    segments,
    rowCount: new Set(segments.map((s) => s.rowIndex)).size,
    totalLengthM,
    estimatedPlants: segments.reduce((sum, s) => sum + Math.floor(s.lengthM / inRowSpacingM) + 1, 0),
  };
}

function createFrame(ring: Position[], orientationDeg: number) {
  const lng0 = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const lat0 = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  const kx = METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  const ky = METRES_PER_DEGREE;
  const theta = (orientationDeg * Math.PI) / 180;
  const s = Math.sin(theta);
  const c = Math.cos(theta);

  return {
    toLocal: ([lng, lat]: Position): Point => {
      const x = (lng - lng0) * kx;
      const y = (lat - lat0) * ky;
      return [x * s + y * c, -x * c + y * s];
    },
    toLngLat: ([u, v]: Point): Position => {
      const x = u * s - v * c;
      const y = u * c + v * s;
      return [lng0 + x / kx, lat0 + y / ky];
    },
  };
}

export function insideIntervals(rings: Point[][], v: number): Interval[] {
  const crossings: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [u1, v1] = ring[i];
      const [u2, v2] = ring[i + 1];
      if ((v1 <= v && v < v2) || (v2 <= v && v < v1)) {
        crossings.push(u1 + ((v - v1) * (u2 - u1)) / (v2 - v1));
      }
    }
  }
  crossings.sort((a, b) => a - b);
  const intervals: Interval[] = [];
  for (let i = 0; i + 1 < crossings.length; i += 2) intervals.push([crossings[i], crossings[i + 1]]);
  return intervals;
}

export function subtractIntervals(intervals: Interval[], blocked: Interval[]): Interval[] {
  return blocked.reduce<Interval[]>(
    (current, [ba, bb]) =>
      current.flatMap(([a, b]): Interval[] => {
        if (bb <= a || ba >= b) return [[a, b]];
        const parts: Interval[] = [];
        if (ba > a) parts.push([a, ba]);
        if (bb < b) parts.push([bb, b]);
        return parts;
      }),
    intervals,
  );
}
