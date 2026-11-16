import { describe, expect, it, vi } from 'vitest';
import { INITIAL_FARMS, INITIAL_FIELDS } from '@farm/data/mockData';
import {
  apiFarmSchema,
  fromApiFarm,
  listFarms,
  listFields,
  toApiFarm,
  toApiFieldInput,
  toApiFieldPatch,
} from './farms';

const farm = INITIAL_FARMS[0];
const field = INITIAL_FIELDS[0];

describe('farm mapping', () => {
  it('writes the gateway farm body with a nested contact', () => {
    expect(toApiFarm(farm)).toEqual({
      name: farm.name,
      location: farm.location,
      climateZone: '7b',
      notes: farm.notes,
      contact: { ownerName: farm.ownerName, email: farm.contactEmail },
    });
  });

  it('clears the contact when owner or email is missing', () => {
    expect(toApiFarm({ ...farm, contactEmail: '', climateZone: null })).toMatchObject({
      contact: null,
      climateZone: '',
    });
  });

  it('reads farms without contact or climate zone', () => {
    const api = apiFarmSchema.parse({ id: 'x', name: 'Nur Name', createdAt: 'c', updatedAt: 'u' });
    expect(fromApiFarm(api, 'owner-1')).toEqual({
      id: 'x',
      ownerId: 'owner-1',
      name: 'Nur Name',
      ownerName: '',
      contactEmail: '',
      location: '',
      climateZone: null,
      boundary: null,
      boundaryAreaM2: null,
      boundaryPerimeterM: null,
      notes: '',
      createdAt: 'c',
      updatedAt: 'u',
    });
  });
});

describe('field mapping', () => {
  it('sends only writable properties', () => {
    expect(Object.keys(toApiFieldInput({ ...field, geometry: field.geometry! })).sort()).toEqual([
      'autoSpacing',
      'cropType',
      'excludedZones',
      'geometry',
      'irrigation',
      'name',
      'soilPh',
      'soilType',
    ]);
  });

  it('sends blank soil types as null, which the server requires', () => {
    expect(toApiFieldInput({ ...field, geometry: field.geometry!, soilType: '  ' }).soilType).toBeNull();
    expect(toApiFieldPatch({ soilType: '' })).toEqual({ soilType: null });
  });

  it('maps crop, irrigation, and automatic spacing in both directions', () => {
    const input = toApiFieldInput({
      ...field,
      geometry: field.geometry!,
      cropType: ' ',
      irrigation: 'drip',
      autoSpacing: true,
    });
    expect(input).toMatchObject({ cropType: null, irrigation: 'drip', autoSpacing: true });
    expect(toApiFieldPatch({ cropType: 'Walnuss', irrigation: 'flood', autoSpacing: false })).toEqual({
      cropType: 'Walnuss',
      irrigation: 'flood',
      autoSpacing: false,
    });
  });

  it('never patches a cleared geometry', () => {
    expect(toApiFieldPatch({ geometry: null, name: 'A' })).toEqual({ name: 'A' });
  });
});

describe('gateway contract', () => {
  // Validated against the gateway's FarmList/FieldList pydantic models (backend 990a964).
  it('parses a recorded GET /api/v1/farms response', async () => {
    const { default: recorded } = await import('./fixtures/gateway-list-farms.json');
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(recorded), { status: 200 }));
    const result = await listFarms('owner-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]).toMatchObject({
      name: 'Gutshof Neorx',
      ownerName: 'Demo-Betrieb',
      contactEmail: 'demo@farmplan.local',
      climateZone: '7b',
      updatedAt: '2026-11-10T09:30:00+00:00',
    });
    expect(result.data[1]).toMatchObject({ name: 'Ohne Kontakt', ownerName: '', climateZone: null });
    expect(result.data[0].boundary?.type).toBe('Polygon');
    expect(result.data[0]).toMatchObject({ boundaryAreaM2: 125400.5, boundaryPerimeterM: 1450.2 });
    expect(result.data[1]).toMatchObject({ boundary: null, boundaryAreaM2: null, boundaryPerimeterM: null });
  });

  it('parses a recorded GET /api/v1/farms/{id}/fields response', async () => {
    const { default: recorded } = await import('./fixtures/gateway-list-fields.json');
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(recorded), { status: 200 }));
    const result = await listFields('5f0f6c55-8a39-4d55-9a3c-3d2b0e7f1a11');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      expect.objectContaining({
        name: 'Kiefernkämpe',
        farmId: '5f0f6c55-8a39-4d55-9a3c-3d2b0e7f1a11',
        areaM2: 7655.4,
        soilPh: 5.5,
      }),
    ]);
    expect(result.data[0].excludedZones?.type).toBe('MultiPolygon');
  });
});
