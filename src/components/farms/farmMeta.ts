export interface FarmMeta {
  name: string;
  location: string;
  climateZone: string;
  notes: string;
}

export const EMPTY_FARM_META: FarmMeta = { name: '', location: '', climateZone: '', notes: '' };
