import type { Language, PlantTaxon, PlantUse, StrataLayer } from '@farm/types';

export const STRATA: StrataLayer[] = ['EMERGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const PLANT_SORT_KEYS = ['name', 'stratum', 'height', 'calories'] as const;
export type PlantSortKey = (typeof PLANT_SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export interface PlantFilters {
  query: string;
  use: PlantUse | 'all';
  stratum: StrataLayer | 'all';
  zone: string | 'all';
}

export const commonName = (plant: PlantTaxon, language: Language) =>
  language === 'de' ? plant.commonNameDe : plant.commonNameEn;

export function filterPlants(plants: PlantTaxon[], { query, use, stratum, zone }: PlantFilters): PlantTaxon[] {
  const q = query.trim().toLowerCase();
  return plants.filter(
    (p) =>
      (!q || [p.commonNameDe, p.commonNameEn, p.scientificName].some((n) => n.toLowerCase().includes(q))) &&
      (use === 'all' || p.uses.includes(use)) &&
      (stratum === 'all' || p.stratum === stratum) &&
      (zone === 'all' || p.hardinessZones.includes(zone)),
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
    height: (a, b) => a.endHeightM.max - b.endHeightM.max,
    calories: (a, b) => a.caloriesPerKg - b.caloriesPerKg,
  };
  const sign = direction === 'asc' ? 1 : -1;
  return [...plants].sort((a, b) => sign * compare[key](a, b) || byName(a, b));
}

export const isPlantSortKey = (value: string): value is PlantSortKey =>
  (PLANT_SORT_KEYS as readonly string[]).includes(value);
