export const HARDINESS_ZONES = Array.from({ length: 13 }, (_, i) => [`${i + 1}a`, `${i + 1}b`]).flat();

/** Position of a hardiness zone from cold (1a = 0) to warm (13b = 25); -1 for unknown values. */
export const zoneIndex = (zone: string) => HARDINESS_ZONES.indexOf(zone);

export function zoneSpan(from: string, to: string): string[] {
  const start = HARDINESS_ZONES.indexOf(from);
  const end = HARDINESS_ZONES.indexOf(to);
  if (start === -1 || end === -1 || start > end) {
    throw new Error(`Invalid hardiness zone span: ${from}–${to}`);
  }
  return HARDINESS_ZONES.slice(start, end + 1);
}

const ZONE_PATTERN = /^(1[0-3]|[1-9])([ab])$/;
const ZONE_1A_MIN_C = -51.1;
const HALF_ZONE_C = 25 / 9; // 5 °F

export function hardinessZoneRangeC(zone: string): { min: number; max: number } | null {
  const match = ZONE_PATTERN.exec(zone);
  if (!match) return null;
  const index = (Number(match[1]) - 1) * 2 + (match[2] === 'b' ? 1 : 0);
  const min = ZONE_1A_MIN_C + index * HALF_ZONE_C;
  return { min: round1(min), max: round1(min + HALF_ZONE_C) };
}

/**
 * Display colour of a hardiness zone on a cold-to-warm scale: violet-blue (1a) through green and
 * yellow to red (13b). Used for swatches next to the zone name, never as the only information.
 */
export function hardinessZoneColor(zone: string): string | null {
  const index = zoneIndex(zone);
  if (index < 0) return null;
  const hue = Math.round(260 - (index / (HARDINESS_ZONES.length - 1)) * 260);
  return `hsl(${hue} 70% 48%)`;
}

export type PhClass = 'stronglyAcidic' | 'moderatelyAcidic' | 'slightlyAcidic' | 'neutral' | 'alkaline';

export function classifyPh(ph: number): PhClass {
  if (ph < 5) return 'stronglyAcidic';
  if (ph < 6) return 'moderatelyAcidic';
  if (ph < 6.8) return 'slightlyAcidic';
  if (ph <= 7.2) return 'neutral';
  return 'alkaline';
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
