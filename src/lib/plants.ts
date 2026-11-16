import { zoneIndex } from '@farm/lib/agronomy';
import type { Language, PlantTaxon, PlantUse, StrataLayer } from '@farm/types';

export const STRATA: StrataLayer[] = ['EMERGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const PLANT_SORT_KEYS = ['name', 'stratum', 'zone', 'height', 'calories'] as const;
export type PlantSortKey = (typeof PLANT_SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export interface PlantFilters {
  query: string;
  use: PlantUse | 'all';
  stratum: StrataLayer | 'all';
  /** Minimum hardiness zone: matches plants listed for this zone or any warmer one. */
  zone: string | 'all';
}

export const commonName = (plant: PlantTaxon, language: Language) =>
  language === 'de' ? plant.commonNameDe : plant.commonNameEn;

const zoneBounds = (plant: PlantTaxon) => {
  const indices = plant.hardinessZones.map(zoneIndex).filter((i) => i >= 0);
  return indices.length ? { min: Math.min(...indices), max: Math.max(...indices) } : null;
};

/** True if the plant is listed for `zone` or any zone above it. Unknown zones do not filter. */
export function reachesZone(plant: PlantTaxon, zone: string) {
  const selected = zoneIndex(zone);
  if (selected < 0) return true;
  const bounds = zoneBounds(plant);
  return bounds !== null && bounds.max >= selected;
}

/** First and last listed zone, e.g. `{ from: '5a', to: '8b' }`; null without zone data. */
export function zoneRange(plant: PlantTaxon) {
  const bounds = zoneBounds(plant);
  if (!bounds) return null;
  return {
    from: plant.hardinessZones.find((z) => zoneIndex(z) === bounds.min)!,
    to: plant.hardinessZones.find((z) => zoneIndex(z) === bounds.max)!,
  };
}

export function filterPlants(plants: PlantTaxon[], { query, use, stratum, zone }: PlantFilters): PlantTaxon[] {
  const q = query.trim().toLowerCase();
  return plants.filter(
    (p) =>
      (!q || [p.commonNameDe, p.commonNameEn, p.scientificName].some((n) => n.toLowerCase().includes(q))) &&
      (use === 'all' || p.uses.includes(use)) &&
      (stratum === 'all' || p.stratum === stratum) &&
      (zone === 'all' || reachesZone(p, zone)),
  );
}

export function sortPlants(
  plants: PlantTaxon[],
  key: PlantSortKey,
  direction: SortDirection,
  language: Language,
): PlantTaxon[] {
  const byName = (a: PlantTaxon, b: PlantTaxon) =>
    commonName(a, language).localeCompare(commonName(b, language), language);
  const compare: Record<PlantSortKey, (a: PlantTaxon, b: PlantTaxon) => number> = {
    name: byName,
    stratum: (a, b) => STRATA.indexOf(a.stratum) - STRATA.indexOf(b.stratum),
    // Coldest zone first, then the warmest; plants without zone data go last.
    zone: (a, b) => {
      const za = zoneBounds(a);
      const zb = zoneBounds(b);
      if (!za || !zb) return (za ? 0 : 1) - (zb ? 0 : 1);
      return za.min - zb.min || za.max - zb.max;
    },
    height: (a, b) => a.endHeightM.max - b.endHeightM.max,
    calories: (a, b) => a.caloriesPerKg - b.caloriesPerKg,
  };
  const sign = direction === 'asc' ? 1 : -1;
  return [...plants].sort((a, b) => sign * compare[key](a, b) || byName(a, b));
}

export const isPlantSortKey = (value: string): value is PlantSortKey =>
  (PLANT_SORT_KEYS as readonly string[]).includes(value);
