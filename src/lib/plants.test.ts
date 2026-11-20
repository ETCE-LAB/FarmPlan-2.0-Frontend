import { describe, expect, it } from 'vitest';
import { INITIAL_PLANTS } from '@farm/data/mockData';
import { zoneSpan } from './agronomy';
import { filterPlants, isPlantSortKey, sortPlants, zoneRange, type PlantFilters } from './plants';

const all: PlantFilters = { query: '', use: 'all', stratum: 'all', zone: 'all' };
const ids = (plants: { id: string }[]) => plants.map((p) => p.id);

describe('filterPlants', () => {
  it('returns everything without filters', () => {
    expect(filterPlants(INITIAL_PLANTS, all)).toHaveLength(INITIAL_PLANTS.length);
  });

  it.each([
    ['German name', 'walnuss', ['p-1']],
    ['English name', 'buckthorn', ['p-8']],
    ['scientific name', 'QUERCUS', ['p-2']],
  ])('searches the %s', (_, query, expected) => {
    expect(ids(filterPlants(INITIAL_PLANTS, { ...all, query }))).toEqual(expected);
  });

  it('combines use, stratum and zone filters', () => {
    expect(ids(filterPlants(INITIAL_PLANTS, { ...all, use: 'nut', stratum: 'EMERGENT', zone: '8b' }))).toEqual(['p-1']);
  });
});

describe('zone filter', () => {
  const plant = (id: string, from: string, to: string) => ({
    ...INITIAL_PLANTS[0],
    id,
    hardinessZones: zoneSpan(from, to),
  });
  const plants = [
    plant('cold', '3a', '6b'),
    plant('mild', '5a', '7a'),
    plant('warm', '7b', '10a'),
    plant('hot', '9a', '11b'),
  ];

  it('includes plants listed for the selected zone or any warmer one', () => {
    expect(ids(filterPlants(plants, { ...all, zone: '7a' }))).toEqual(['mild', 'warm', 'hot']);
    expect(ids(filterPlants(plants, { ...all, zone: '7b' }))).toEqual(['warm', 'hot']);
    expect(ids(filterPlants(plants, { ...all, zone: '3a' }))).toEqual(['cold', 'mild', 'warm', 'hot']);
    expect(ids(filterPlants(plants, { ...all, zone: '12a' }))).toEqual([]);
  });

  it('ignores unknown zone values from the URL', () => {
    expect(filterPlants(plants, { ...all, zone: '99z' })).toHaveLength(4);
  });

  it('describes the zone range and sorts by the coldest zone', () => {
    expect(zoneRange(plants[2])).toEqual({ from: '7b', to: '10a' });
    expect(zoneRange({ ...plants[0], hardinessZones: [] })).toBeNull();
    expect(ids(sortPlants([...plants].reverse(), 'zone', 'asc', 'de'))).toEqual(['cold', 'mild', 'warm', 'hot']);
  });
});

describe('sortPlants', () => {
  it('sorts by localized common name', () => {
    expect(sortPlants(INITIAL_PLANTS, 'name', 'asc', 'de').map((p) => p.commonNameDe)[0]).toBe('Echte Walnuss');
    expect(sortPlants(INITIAL_PLANTS, 'name', 'asc', 'en').map((p) => p.commonNameEn)[0]).toBe('Apple');
  });

  it('sorts by calories descending', () => {
    const sorted = sortPlants(INITIAL_PLANTS, 'calories', 'desc', 'de');
    expect(sorted[0].id).toBe('p-1');
    expect(sorted[sorted.length - 1].caloriesPerKg).toBe(0);
  });

  it('sorts strata from emergent to low and breaks ties by name', () => {
    const sorted = sortPlants(INITIAL_PLANTS, 'stratum', 'asc', 'de');
    expect(sorted.map((p) => p.stratum)).toEqual([
      'EMERGENT',
      'EMERGENT',
      'HIGH',
      'HIGH',
      'HIGH',
      'MEDIUM',
      'LOW',
      'LOW',
    ]);
    expect(sorted[0].commonNameDe).toBe('Echte Walnuss');
  });

  it('sorts by final height', () => {
    expect(sortPlants(INITIAL_PLANTS, 'height', 'asc', 'de')[0].id).toBe('p-7');
  });

  it('does not mutate the input', () => {
    const copy = [...INITIAL_PLANTS];
    sortPlants(INITIAL_PLANTS, 'calories', 'desc', 'de');
    expect(INITIAL_PLANTS).toEqual(copy);
  });
});

describe('isPlantSortKey', () => {
  it('accepts only known keys', () => {
    expect(isPlantSortKey('height')).toBe(true);
    expect(isPlantSortKey('price')).toBe(false);
  });
});
