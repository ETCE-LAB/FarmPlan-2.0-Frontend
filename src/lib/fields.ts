import type { Field, Irrigation } from '@farm/types';

export const IRRIGATION_TYPES: readonly Irrigation[] = ['none', 'drip', 'sprinkler', 'flood', 'other'];

/** Server defaults for optional field attributes (farm-service `field_data`). */
export const FIELD_ATTRIBUTE_DEFAULTS = {
  soilType: null,
  soilPh: null,
  excludedZones: null,
  cropType: null,
  irrigation: 'none',
  autoSpacing: false,
} as const satisfies Pick<Field, 'soilType' | 'soilPh' | 'excludedZones' | 'cropType' | 'irrigation' | 'autoSpacing'>;
