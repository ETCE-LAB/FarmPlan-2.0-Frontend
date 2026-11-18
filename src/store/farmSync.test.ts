import { describe, expect, it } from 'vitest';
import { act } from '@testing-library/react';
import { rectanglePolygon, polygonAreaM2 } from '@farm/lib/geo';
import { gateway } from '@farm/test/fakeGateway';
import type { Field } from '@farm/types';
import * as farmSync from './farmSync';
import { useFarmStore } from './useFarmStore';
import { useSessionStore } from './useSessionStore';
import { useUiStore } from './useUiStore';

const store = () => useFarmStore.getState();
const serverFieldNames = (farmId: string) => gateway.fieldsOf(farmId).map((f) => f.name);

const meta = {
  name: 'Neuer Hof',
  ownerName: 'Anna',
  contactEmail: 'anna@example.org',
  location: 'Celle',
  climateZone: '8a',
  notes: '',
};

const newField = (id: string): Field => {
  const geometry = rectanglePolygon(52.9, 11.1, 50, 50);
  return {
    id,
    farmId: '',
    name: id,
    geometry,
    areaM2: polygonAreaM2(geometry),
    soilType: null,
    soilPh: null,
    excludedZones: null,
    cropType: null,
    irrigation: 'none',
    autoSpacing: false,
  };
};

describe('farmSync', () => {
  it('loads farms and their fields from the gateway', async () => {
    act(() => store().clearServerData());
    await act(() => farmSync.loadFarms());
    expect(store().farmsStatus).toBe('ready');
    expect(store().farms.map((f) => f.name)).toEqual(['Gutshof Neorx', 'Biohof Wendland']);
    expect(store().fields.filter((f) => f.farmId === 'farm-1')).toHaveLength(3);
    expect(store().farms[0]).toMatchObject({ ownerId: 'user-test', ownerName: 'Demo-Betrieb' });
  });

  it('records load errors', async () => {
    gateway.failNext(503);
    await act(() => farmSync.loadFarms());
    expect(store()).toMatchObject({ farmsStatus: 'error', farmsError: 'unavailable' });
  });

  it('does not load without a session', async () => {
    act(() => useSessionStore.getState().logout());
    await expect(farmSync.loadFarms()).resolves.toEqual({ ok: false, error: 'unauthenticated' });
    expect(store().farms).toEqual([]);
  });

  it('creates a farm, then imports its fields atomically', async () => {
    const result = await act(() => farmSync.createFarm(meta, [newField('a'), newField('b')]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(gateway.farms.get(result.data.id)).toMatchObject({
      name: 'Neuer Hof',
      climateZone: '8a',
      contact: { ownerName: 'Anna', email: 'anna@example.org' },
    });
    expect(gateway.writes().map((r) => r.path)).toEqual([
      '/api/v1/farms',
      `/api/v1/farms/${result.data.id}/fields:bulk`,
    ]);
    const local = store().fields.filter((f) => f.farmId === result.data.id);
    expect(local.map((f) => f.name)).toEqual(['a', 'b']);
    expect(local.map((f) => f.id)).toEqual(gateway.fieldsOf(result.data.id).map((f) => f.id));
    expect(store().activeFarmId).toBe(result.data.id);
  });

  it('removes the new farm again when its fields are rejected', async () => {
    gateway.failNext(422, ['self_intersecting'], 'fields:bulk');
    const result = await act(() => farmSync.createFarm(meta, [newField('a'), newField('b')]));
    expect(result).toMatchObject({ ok: false, error: 'validation', details: ['self_intersecting'] });
    expect(gateway.writes().map((r) => r.method)).toEqual(['POST', 'POST', 'DELETE']);
    expect(gateway.farms.size).toBe(2);
    expect(store().farms).toHaveLength(2);
  });

  it('does not add the farm locally when the server rejects it', async () => {
    gateway.failNext(422);
    await expect(farmSync.createFarm(meta, [])).resolves.toMatchObject({ ok: false, error: 'validation' });
    expect(store().farms).toHaveLength(2);
  });

  it('saves master data with PATCH', async () => {
    const result = await act(() => farmSync.saveFarmMeta('farm-2', { ...meta, name: 'Umbenannt' }));
    expect(result.ok).toBe(true);
    expect(gateway.writes().map((r) => r.method)).toEqual(['PATCH']);
    expect(gateway.farms.get('farm-2')).toMatchObject({ name: 'Umbenannt', location: 'Celle' });
    expect(store().farms.find((f) => f.id === 'farm-2')!.name).toBe('Umbenannt');
  });

  it('patches only the changed field properties, in order', async () => {
    act(() => {
      void farmSync.updateField('f-201', { name: 'Erst' });
      void farmSync.updateField('f-201', { name: 'Dann' });
    });
    expect(store().fields.find((f) => f.id === 'f-201')!.name).toBe('Dann'); // optimistic
    await act(farmSync.flushFarmSync);
    expect(gateway.fields.get('f-201')!.name).toBe('Dann');
    expect(gateway.writes()).toEqual([
      { method: 'PATCH', path: '/api/v1/fields/f-201', body: { name: 'Erst' } },
      { method: 'PATCH', path: '/api/v1/fields/f-201', body: { name: 'Dann' } },
    ]);
  });

  it('replaces the temporary ID of a new field with the server UUID', async () => {
    act(() => {
      void farmSync.addFields('farm-2', [newField('field-tmp')]);
      // Edited before the server answered: the PATCH must target the server ID.
      void farmSync.updateField('field-tmp', { soilPh: 6.5 });
    });
    await act(farmSync.flushFarmSync);
    const serverId = farmSync.resolveFieldId('field-tmp');
    expect(serverId).not.toBe('field-tmp');
    expect(store().fields.some((f) => f.id === 'field-tmp')).toBe(false);
    expect(store().fields.find((f) => f.id === serverId)).toMatchObject({ farmId: 'farm-2', soilPh: 6.5 });
    expect(gateway.fields.get(serverId)).toMatchObject({ soilPh: 6.5 });
    expect(gateway.writes().map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /api/v1/farms/farm-2/fields',
      `PATCH /api/v1/fields/${serverId}`,
    ]);
  });

  it('deletes fields', async () => {
    await act(() => farmSync.deleteField('f-201'));
    expect(gateway.fields.has('f-201')).toBe(false);
    expect(store().fields.some((f) => f.id === 'f-201')).toBe(false);
  });

  it('reports a failed field write with its reason and reloads the server state', async () => {
    gateway.failNext(500);
    await act(async () => {
      await farmSync.updateField('f-201', { name: 'Kaputt' });
      await farmSync.flushFarmSync();
    });
    await act(async () => {}); // let the reload settle
    expect(useUiStore.getState().toasts.at(-1)).toMatchObject({ tone: 'error' });
    expect(useUiStore.getState().toasts.at(-1)!.message).toContain('Fehler auf dem Server.');
    expect(store().fields.find((f) => f.id === 'f-201')!.name).toBe('Kiefernkämpe');
  });

  it('explains geometry rejections', async () => {
    gateway.failNext(422, ['self_intersecting']);
    await act(() => farmSync.updateField('f-201', { geometry: rectanglePolygon(52.9, 11.1, 10, 10) }));
    expect(useUiStore.getState().toasts.at(-1)!.message).toContain('Die Umrandung schneidet sich selbst.');
  });

  it('undoes a field deletion by recreating the field', async () => {
    act(() => farmSync.mutateFieldsWithUndo('farm-1', () => store().deleteField('f-101'), 'gelöscht', 'Rückgängig'));
    await act(farmSync.flushFarmSync);
    expect(gateway.fields.has('f-101')).toBe(false);
    expect(store().plans.some((p) => p.fieldId === 'f-101')).toBe(false);

    const toast = useUiStore.getState().toasts.at(-1)!;
    act(() => toast.action!.onClick());
    await act(farmSync.flushFarmSync);
    const recreated = farmSync.resolveFieldId('f-101');
    expect(recreated).not.toBe('f-101');
    expect(gateway.fields.get(recreated)).toMatchObject({ name: 'Schlag 1 (Agroforst Nord)', farmId: 'farm-1' });
    expect(store().plans.some((p) => p.fieldId === recreated)).toBe(true);
    expect(serverFieldNames('farm-1')).toHaveLength(3);
  });

  it('undoes an attribute change with a PATCH', async () => {
    act(() => farmSync.mutateFieldsWithUndo('farm-1', () => store().updateField('f-101', { soilPh: 4.2 }), 'x', 'y'));
    await act(farmSync.flushFarmSync);
    expect(gateway.fields.get('f-101')!.soilPh).toBe(4.2);
    act(() => useUiStore.getState().toasts.at(-1)!.action!.onClick());
    await act(farmSync.flushFarmSync);
    expect(gateway.fields.get('f-101')!.soilPh).toBe(6.8);
    expect(gateway.writes().every((r) => r.method === 'PATCH')).toBe(true);
  });

  it('saves a farm boundary and takes area and perimeter from the server', async () => {
    const boundary = rectanglePolygon(52.97, 11.149, 1200, 900);
    const pending = farmSync.saveFarmBoundary('farm-2', boundary);
    expect(store().farms.find((f) => f.id === 'farm-2')).toMatchObject({ boundary, boundaryPerimeterM: null });
    await act(() => pending);
    expect(gateway.writes()).toEqual([{ method: 'PATCH', path: '/api/v1/farms/farm-2', body: { boundary } }]);
    const farm = store().farms.find((f) => f.id === 'farm-2')!;
    expect(farm.boundaryAreaM2).toBeGreaterThan(1_000_000);
    expect(farm.boundaryPerimeterM).toBeGreaterThan(4_000);
  });

  it('restores the previous boundary when the server rejects it', async () => {
    gateway.failNext(422, ['outside_farm_boundary']);
    await act(() => farmSync.saveFarmBoundary('farm-2', rectanglePolygon(52.97, 11.15, 10, 10)));
    expect(store().farms.find((f) => f.id === 'farm-2')).toMatchObject({ boundary: null, boundaryAreaM2: null });
    expect(useUiStore.getState().toasts.at(-1)!.message).toBe(
      'Hofgrenze nicht gespeichert: Die Hofgrenze muss alle Schläge umschließen.',
    );
  });

  it('clears a farm boundary', async () => {
    await act(() => farmSync.saveFarmBoundary('farm-2', rectanglePolygon(52.97, 11.149, 1200, 900)));
    await act(() => farmSync.saveFarmBoundary('farm-2', null));
    expect(gateway.farms.get('farm-2')).toMatchObject({ boundary: null, boundaryAreaM2: null });
    expect(store().farms.find((f) => f.id === 'farm-2')!.boundary).toBeNull();
  });

  it('deletes a farm on the server and locally', async () => {
    await act(() => farmSync.deleteFarm('farm-1'));
    expect(gateway.farms.has('farm-1')).toBe(false);
    expect(gateway.fieldsOf('farm-1')).toEqual([]);
    expect(store().farms.map((f) => f.id)).toEqual(['farm-2']);
    expect(store().fields.every((f) => f.farmId === 'farm-2')).toBe(true);
  });

  it('keeps the farm when the server delete fails', async () => {
    gateway.failNext(503);
    await expect(farmSync.deleteFarm('farm-1')).resolves.toMatchObject({ ok: false, error: 'unavailable' });
    expect(store().farms).toHaveLength(2);
  });

  it('imports a backup as new farms with server IDs', async () => {
    const { farms, fields, plans, activeFarmId } = store();
    const result = await act(() =>
      farmSync.importBackup({ farms: [{ ...farms[1], ownerName: '', location: '' }], fields, plans, activeFarmId }),
    );
    expect(result).toEqual({ created: 1, failed: 0 });
    const created = [...gateway.farms.values()].at(-1)!;
    expect(created).toMatchObject({ name: 'Biohof Wendland', location: '', contact: { ownerName: 'Anna Test' } });
    const createdFields = gateway.fieldsOf(String(created.id));
    expect(createdFields).toHaveLength(2);
    expect(createdFields.map((f) => f.id)).not.toContain('f-201');
  });
});
