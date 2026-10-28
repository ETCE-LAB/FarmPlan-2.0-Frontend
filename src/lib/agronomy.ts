export const HARDINESS_ZONES = Array.from({ length: 13 }, (_, i) => [`${i + 1}a`, `${i + 1}b`]).flat();

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
