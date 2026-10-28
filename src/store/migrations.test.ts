import { describe, expect, it } from 'vitest';
import { INITIAL_FARMS } from '@farm/data/mockData';
import { migratePersistedState } from './migrations';

const v0State = {
  farms: [
    {
      id: 'farm-x',
      farmName: 'Alter Hof',
      ownerName: 'Jemand',
      location: 'Celle',
      contactEmail: 'a@b.de',
      areaHectares: 3,
      hardinessZone: '7a',
      soilType: 'Sand',
      soilPh: 5.8,
      notes: 'alt',
      fields: [
        {
          id: 'field-x',
          name: 'Hauptschlag',
          areaHectares: 3,
          cropType: 'Apfel',
          stratumComposition: 'High',
          soilType: 'Sand',
          status: 'Planned',
          coordinates: [
            [52.0, 10.0],
            [52.01, 10.0],
            [52.0, 10.01],
          ],
        },
        {
          id: 'field-y',
          name: 'Ohne Geometrie',
          areaHectares: 1.5,
          cropType: '',
          stratumComposition: '',
          soilType: 'Lehm',
          status: 'Active',
        },
      ],
    },
  ],
  activeFarmId: 'farm-x',
  language: 'en',
  themeMode: 'light',
  draftPolygon: [],
};

describe('migratePersistedState', () => {
  it('migrates v0 nested farms into normalized farms and fields', () => {
    const state = migratePersistedState(v0State, 0);

    expect(state.language).toBe('en');
    expect(state.theme).toBe('light');
    expect(state.activeFarmId).toBe('farm-x');
    expect(state.farms).toHaveLength(1);
    expect(state.farms[0]).toMatchObject({ id: 'farm-x', name: 'Alter Hof', climateZone: '7a', notes: 'alt' });

    const [withGeometry, withoutGeometry] = state.fields;
    expect(withGeometry.farmId).toBe('farm-x');
    expect(withGeometry.geometry?.coordinates[0][0]).toEqual([10.0, 52.0]); // [lng, lat]
    expect(withGeometry.areaM2).toBeGreaterThan(0);
    expect(withGeometry.soilPh).toBe(5.8);
    expect(withoutGeometry.geometry).toBeNull();
    expect(withoutGeometry.areaM2).toBe(15_000);
  });

  it('falls back to demo data for unrecognised state', () => {
    expect(migratePersistedState({ nonsense: true }, 0).farms).toEqual(INITIAL_FARMS);
    expect(migratePersistedState(null, 0).farms).toEqual(INITIAL_FARMS);
  });
});
