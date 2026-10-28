import { describe, expect, it } from 'vitest';
import { classifyPh, hardinessZoneRangeC, zoneSpan } from './agronomy';

describe('hardinessZoneRangeC', () => {
  it.each([
    ['1a', -51.1, -48.3],
    ['7a', -17.8, -15.0],
    ['7b', -15.0, -12.2],
    ['8a', -12.2, -9.4],
  ])('zone %s spans %d to %d °C', (zone, min, max) => {
    expect(hardinessZoneRangeC(zone)).toEqual({ min, max });
  });

  it('returns null for unknown zones', () => {
    expect(hardinessZoneRangeC('14a')).toBeNull();
    expect(hardinessZoneRangeC('7')).toBeNull();
  });
});

describe('zoneSpan', () => {
  it('includes every half-zone between both ends', () => {
    expect(zoneSpan('6b', '8a')).toEqual(['6b', '7a', '7b', '8a']);
  });

  it('throws on reversed spans', () => {
    expect(() => zoneSpan('8a', '6a')).toThrow();
  });
});

describe('classifyPh', () => {
  it.each([
    [4.5, 'stronglyAcidic'],
    [5.9, 'moderatelyAcidic'],
    [6.4, 'slightlyAcidic'],
    [7.0, 'neutral'],
    [7.8, 'alkaline'],
  ])('pH %d is %s', (ph, expected) => {
    expect(classifyPh(ph)).toBe(expected);
  });
});
