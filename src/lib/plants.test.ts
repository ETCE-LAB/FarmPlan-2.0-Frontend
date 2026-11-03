import { describe, expect, it } from 'vitest';
import { INITIAL_PLANTS } from '@farm/data/mockData';
import { filterPlants, isPlantSortKey, sortPlants, type PlantFilters } from './plants';

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
    expect(ids(filterPlants(INITIAL_PLANTS, { ...all, use: 'berry', stratum: 'LOW', zone: '3a' }))).toEqual(['p-8']);
  });

  it('filters by hardiness zone', () => {
    expect(ids(filterPlants(INITIAL_PLANTS, { ...all, zone: '3a' })).sort()).toEqual(['p-5', 'p-8']);
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
