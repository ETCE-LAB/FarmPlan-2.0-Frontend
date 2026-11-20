import type { FarmMetaInput } from '@farm/lib/api/farms';
import type { Farm } from '@farm/types';

export interface FarmMeta {
  name: string;
  ownerName: string;
  contactEmail: string;
  location: string;
  climateZone: string;
  notes: string;
}

export const EMPTY_FARM_META: FarmMeta = {
  name: '',
  ownerName: '',
  contactEmail: '',
  location: '',
  climateZone: '',
  notes: '',
};

export const farmToMeta = (farm: Farm): FarmMeta => ({
  name: farm.name,
  ownerName: farm.ownerName,
  contactEmail: farm.contactEmail,
  location: farm.location,
  climateZone: farm.climateZone ?? '',
  notes: farm.notes,
});

export const metaToInput = (meta: FarmMeta): FarmMetaInput => ({
  name: meta.name.trim(),
  ownerName: meta.ownerName.trim(),
  contactEmail: meta.contactEmail.trim(),
  location: meta.location.trim(),
  climateZone: meta.climateZone || null,
  notes: meta.notes.trim(),
});
