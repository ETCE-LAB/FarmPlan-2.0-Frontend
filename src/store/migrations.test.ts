import { describe, expect, it } from 'vitest';
import { INITIAL_FARMS } from '@farm/data/mockData';
import { initialPersistedState, migratePersistedState } from './migrations';

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
  it('keeps v0 preferences and drops the locally stored farms', () => {
    const state = migratePersistedState(v0State, 0);
    expect(state).toMatchObject({ language: 'en', theme: 'light', baseLayer: 'osm', activeFarmId: null });
    expect(state).not.toHaveProperty('farms');
    expect(state).not.toHaveProperty('fields');
  });

  it('keeps v1 preferences and drops farms and fields, which now come from the backend', () => {
    const v1State = {
      farms: INITIAL_FARMS,
      fields: [],
      plans: [],
      activeFarmId: 'farm-2',
      language: 'en',
      theme: 'dark',
      baseLayer: 'topo',
    };
    const state = migratePersistedState(v1State, 1);
    expect(state).toEqual({ ...initialPersistedState(), language: 'en', theme: 'dark', baseLayer: 'topo' });
  });

  it('ignores invalid preference values', () => {
    expect(migratePersistedState({ language: 'fr', theme: 'neon', baseLayer: 'google' }, 1)).toEqual(
      initialPersistedState(),
    );
  });

  it('falls back to the initial state for unrecognised input', () => {
    expect(migratePersistedState(null, 0)).toEqual(initialPersistedState());
    expect(migratePersistedState('nonsense', 1)).toEqual(initialPersistedState());
  });
});
