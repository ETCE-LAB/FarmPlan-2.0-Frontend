import { DEMO_USER, INITIAL_FARMS, INITIAL_FIELDS, INITIAL_PLANS } from '@farm/data/mockData';
import { latLngsToPolygon, polygonAreaM2, type LatLngTuple } from '@farm/lib/geo';
import type { BaseLayerId, Farm, Field, Language, PlantingPlan, ThemePreference } from '@farm/types';

export const STORE_VERSION = 1;

export interface PersistedFarmState {
  farms: Farm[];
  fields: Field[];
  plans: PlantingPlan[];
  activeFarmId: string | null;
  language: Language;
  theme: ThemePreference;
  baseLayer: BaseLayerId;
}

export function initialPersistedState(): PersistedFarmState {
  return {
    farms: INITIAL_FARMS,
    fields: INITIAL_FIELDS,
    plans: INITIAL_PLANS,
    activeFarmId: INITIAL_FARMS[0]?.id ?? null,
    language: 'de',
    theme: 'system',
    baseLayer: 'osm',
  };
}

export function migratePersistedState(persisted: unknown, version: number): PersistedFarmState {
  if (version === 0 && isV0State(persisted)) {
    return migrateV0(persisted);
  }
  return initialPersistedState();
}


interface V0Field {
  id: string;
  name: string;
  areaHectares: number;
  soilType?: string;
  coordinates?: LatLngTuple[];
}

interface V0Farm {
  id: string;
  farmName: string;
  location?: string;
  areaHectares?: number;
  notes?: string;
  hardinessZone?: string;
  soilPh?: number;
  fields: V0Field[];
}

interface V0State {
  farms: V0Farm[];
  activeFarmId?: string | null;
  language?: Language;
  themeMode?: 'light' | 'dark';
}

function isV0State(value: unknown): value is V0State {
  if (typeof value !== 'object' || value === null) return false;
  const farms = (value as { farms?: unknown }).farms;
  return (
    Array.isArray(farms) &&
    farms.every(
      (f) =>
        typeof f === 'object' &&
        f !== null &&
        typeof f.id === 'string' &&
        typeof f.farmName === 'string' &&
        Array.isArray(f.fields),
    )
  );
}

function migrateV0(state: V0State): PersistedFarmState {
  const now = new Date().toISOString();
  const farms: Farm[] = [];
  const fields: Field[] = [];

  for (const old of state.farms) {
    farms.push({
      id: old.id,
      ownerId: DEMO_USER.id,
      name: old.farmName,
      location: old.location ?? '',
      climateZone: old.hardinessZone ?? null,
      boundary: null,
      notes: old.notes ?? '',
      createdAt: now,
      updatedAt: now,
    });

    for (const oldField of old.fields) {
      const geometry =
        oldField.coordinates && oldField.coordinates.length >= 3 ? latLngsToPolygon(oldField.coordinates) : null;
      fields.push({
        id: oldField.id,
        farmId: old.id,
        name: oldField.name,
        geometry,
        areaM2: geometry ? polygonAreaM2(geometry) : (oldField.areaHectares ?? 0) * 10_000,
        soilType: oldField.soilType ?? null,
        soilPh: old.soilPh ?? null,
        excludedZones: null,
      });
    }
  }

  const farmIds = new Set(farms.map((f) => f.id));
  return {
    farms,
    fields,
    plans: [],
    activeFarmId: state.activeFarmId && farmIds.has(state.activeFarmId) ? state.activeFarmId : (farms[0]?.id ?? null),
    language: state.language === 'en' ? 'en' : 'de',
    theme: state.themeMode ?? 'system',
    baseLayer: 'osm',
  };
}
