import { describe, expect, it } from 'vitest';
import { generateTreelines, insideIntervals, subtractIntervals, type TreelineOptions } from './treelines';
import { partsToMultiPolygon, rectanglePolygon } from './geo';

const field = rectanglePolygon(52.27, 10.52, 100, 60);
const base: TreelineOptions = { orientationDeg: 90, rowSpacingM: 10, edgeBufferM: 0, inRowSpacingM: 2 };

describe('generateTreelines', () => {
  it('lays east–west rows across a rectangle', () => {
    const preview = generateTreelines(field, null, base);
    expect(preview.rowCount).toBe(6);
    for (const segment of preview.segments) expect(segment.lengthM).toBeCloseTo(100, 0);
    expect(preview.totalLengthM).toBeCloseTo(600, -1);
  });

  it('lays north–south rows when rotated by 90°', () => {
    const preview = generateTreelines(field, null, { ...base, orientationDeg: 0 });
    expect(preview.rowCount).toBe(10);
    for (const segment of preview.segments) expect(segment.lengthM).toBeCloseTo(60, 0);
  });

  it('keeps the edge buffer at both row ends', () => {
    const preview = generateTreelines(field, null, { ...base, edgeBufferM: 5 });
    for (const segment of preview.segments) expect(segment.lengthM).toBeCloseTo(90, 0);
  });

  it('splits rows around an exclusion zone', () => {
    const zone = rectanglePolygon(
      52.27 + 20 / 111_320,
      10.52 + 40 / (111_320 * Math.cos((52.27 * Math.PI) / 180)),
      20,
      20,
    );
    const preview = generateTreelines(field, partsToMultiPolygon([zone]), base);

    expect(preview.rowCount).toBe(6);
    expect(preview.segments.length).toBe(8);
    expect(preview.totalLengthM).toBeCloseTo(600 - 2 * 20, -1);
  });

  it('estimates plants per segment from the in-row spacing', () => {
    const preview = generateTreelines(field, null, { ...base, inRowSpacingM: 5 });
    const expected = preview.segments.reduce((sum, s) => sum + Math.floor(s.lengthM / 5) + 1, 0);
    expect(preview.estimatedPlants).toBe(expected);
    expect(preview.estimatedPlants).toBeGreaterThanOrEqual(6 * 20);
  });

  it('returns segments as GeoJSON LineStrings inside the field', () => {
    const [segment] = generateTreelines(field, null, base).segments;
    expect(segment.geometry.type).toBe('LineString');
    const [[lng, lat]] = segment.geometry.coordinates;
    expect(lng).toBeGreaterThanOrEqual(10.52 - 1e-9);
    expect(lat).toBeGreaterThan(52.27);
  });

  it.each([{ rowSpacingM: 0 }, { rowSpacingM: -5 }, { inRowSpacingM: 0 }, { rowSpacingM: Number.NaN }])(
    'returns an empty preview for invalid options %o',
    (override) => {
      expect(generateTreelines(field, null, { ...base, ...override }).segments).toEqual([]);
    },
  );

  it('drops row pieces shorter than the minimum length', () => {
    expect(generateTreelines(field, null, { ...base, minRowLengthM: 150 }).segments).toEqual([]);
  });
});

describe('insideIntervals', () => {
  const square: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('finds the inside span of a scanline', () => {
    expect(insideIntervals([square], 5)).toEqual([[0, 10]]);
  });

  it('treats inner rings as holes', () => {
    const hole: [number, number][] = [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ];
    expect(insideIntervals([square, hole], 5)).toEqual([
      [0, 4],
      [6, 10],
    ]);
  });

  it('returns nothing outside the shape', () => {
    expect(insideIntervals([square], 20)).toEqual([]);
  });
});

describe('subtractIntervals', () => {
  it('cuts a gap out of an interval', () => {
    expect(subtractIntervals([[0, 10]], [[3, 5]])).toEqual([
      [0, 3],
      [5, 10],
    ]);
  });

  it('removes fully covered intervals and trims overlapping ones', () => {
    expect(
      subtractIntervals(
        [
          [0, 2],
          [4, 10],
        ],
        [[-1, 6]],
      ),
    ).toEqual([[6, 10]]);
  });

  it('ignores blocked ranges outside the intervals', () => {
    expect(subtractIntervals([[0, 10]], [[20, 30]])).toEqual([[0, 10]]);
  });
});
