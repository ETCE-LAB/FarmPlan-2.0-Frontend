import { INITIAL_PLANS } from '@farm/data/mockData';
import type { BaseLayerId, Language, PlantingPlan, ThemePreference } from '@farm/types';

/**
 * Version 2: farms and fields come from the backend and are no longer persisted locally.
 * Planting plans are still demo data until the planning service exists.
 */
export const STORE_VERSION = 2;

export interface PersistedFarmState {
  plans: PlantingPlan[];
  activeFarmId: string | null;
  language: Language;
  theme: ThemePreference;
  baseLayer: BaseLayerId;
}

export function initialPersistedState(): PersistedFarmState {
  return {
    plans: INITIAL_PLANS,
    activeFarmId: null,
    language: 'de',
    theme: 'system',
    baseLayer: 'osm',
  };
}

const LANGUAGES: readonly Language[] = ['de', 'en'];
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const BASE_LAYERS: readonly BaseLayerId[] = ['osm', 'satellite', 'topo'];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/**
 * Keeps device settings from older versions. Locally stored farms and fields (v0, v1) are dropped:
 * the backend is now the source of truth, and v1 users can import a downloaded backup into their account.
 */
export function migratePersistedState(persisted: unknown, version: number): PersistedFarmState {
  const initial = initialPersistedState();
  if (typeof persisted !== 'object' || persisted === null) return initial;
  const old = persisted as Record<string, unknown>;

  if (version === 0) {
    return {
      ...initial,
      language: pick(old.language, LANGUAGES, initial.language),
      theme: pick(old.themeMode, THEMES, initial.theme),
    };
  }

  return {
    ...initial,
    language: pick(old.language, LANGUAGES, initial.language),
    theme: pick(old.theme, THEMES, initial.theme),
    baseLayer: pick(old.baseLayer, BASE_LAYERS, initial.baseLayer),
  };
}
