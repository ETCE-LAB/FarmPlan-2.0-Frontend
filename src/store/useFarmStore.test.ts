import { describe, expect, it } from 'vitest';
import { useFarmStore } from './useFarmStore';
import { mutateWithUndo } from './undo';
import { useUiStore } from './useUiStore';
import { polygonAreaM2, rectanglePolygon } from '@farm/lib/geo';
import type { Field } from '@farm/types';

const store = () => useFarmStore.getState();

const newField = (id: string, farmId = 'farm-2'): Field => {
  const geometry = rectanglePolygon(52.9, 11.1, 50, 50);
  return {
    id,
    farmId,
    name: id,
    geometry,
    areaM2: polygonAreaM2(geometry),
    soilType: null,
    soilPh: null,
    excludedZones: null,
  };
};

describe('useFarmStore', () => {
  it('deletes a farm together with its fields and plans', () => {
    store().deleteFarm('farm-1');
    const { farms, fields, plans, activeFarmId } = store();

    expect(farms.map((f) => f.id)).toEqual(['farm-2']);
    expect(fields.every((f) => f.farmId === 'farm-2')).toBe(true);
    expect(plans.map((p) => p.fieldId)).toEqual(['f-201']);
    expect(activeFarmId).toBe('farm-2');
  });

  it('updates only the patched farm fields and bumps updatedAt', () => {
    const before = store().farms.find((f) => f.id === 'farm-2')!;
    store().updateFarm('farm-2', { name: 'Neu' });
    const after = store().farms.find((f) => f.id === 'farm-2')!;

    expect(after).toMatchObject({ name: 'Neu', location: before.location });
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it('adds fields and touches their farm', () => {
    const before = store().farms.find((f) => f.id === 'farm-2')!.updatedAt;
    store().addFields([newField('f-new')]);
    expect(store().fields.some((f) => f.id === 'f-new')).toBe(true);
    expect(store().farms.find((f) => f.id === 'farm-2')!.updatedAt).not.toBe(before);
  });

  it('recomputes the area when the geometry of a field changes', () => {
    const geometry = rectanglePolygon(52.27, 10.52, 10, 10);
    store().updateField('f-101', { geometry });
    expect(store().fields.find((f) => f.id === 'f-101')!.areaM2).toBeCloseTo(polygonAreaM2(geometry), 3);
  });

  it('keeps the area when only attributes change', () => {
    const before = store().fields.find((f) => f.id === 'f-101')!.areaM2;
    store().updateField('f-101', { soilPh: 5.5, name: 'Umbenannt' });
    expect(store().fields.find((f) => f.id === 'f-101')).toMatchObject({
      areaM2: before,
      soilPh: 5.5,
      name: 'Umbenannt',
    });
  });

  it('deletes a field together with its plans', () => {
    store().deleteField('f-101');
    expect(store().fields.some((f) => f.id === 'f-101')).toBe(false);
    expect(store().plans.some((p) => p.fieldId === 'f-101')).toBe(false);
  });

  it('ignores updates and deletes of unknown fields', () => {
    const before = store().snapshot();
    store().updateField('nope', { name: 'x' });
    store().deleteField('nope');
    expect(store().snapshot()).toEqual(before);
  });

  it('restores a snapshot', () => {
    const snapshot = store().snapshot();
    store().deleteFarm('farm-1');
    store().restore(snapshot);
    expect(store().snapshot()).toEqual(snapshot);
  });

  it('keeps preferences when resetting the data', () => {
    store().setLanguage('en');
    store().setTheme('dark');
    store().setBaseLayer('satellite');
    store().deleteFarm('farm-1');
    store().resetData();
    expect(store()).toMatchObject({ language: 'en', theme: 'dark', baseLayer: 'satellite' });
    expect(store().farms).toHaveLength(2);
  });

  it('persists data and preferences, but not transient state', () => {
    store().setBaseLayer('topo');
    const persisted = JSON.parse(localStorage.getItem('farmplan-storage')!);
    expect(Object.keys(persisted.state).sort()).toEqual([
      'activeFarmId',
      'baseLayer',
      'farms',
      'fields',
      'language',
      'plans',
      'theme',
    ]);
    expect(persisted.state.baseLayer).toBe('topo');
    expect(persisted.version).toBe(1);
  });
});

describe('mutateWithUndo', () => {
  it('shows a toast whose action restores the previous data', () => {
    mutateWithUndo(() => store().deleteFarm('farm-1'), 'gelöscht', 'Rückgängig');
    expect(store().farms).toHaveLength(1);

    const [toast] = useUiStore.getState().toasts;
    expect(toast).toMatchObject({ message: 'gelöscht', action: { label: 'Rückgängig' } });
    toast.action!.onClick();
    expect(store().farms).toHaveLength(2);
  });
});
