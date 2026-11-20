import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup } from './backup';
import { INITIAL_FARMS, INITIAL_FIELDS, INITIAL_PLANS } from '@farm/data/mockData';
import { STORE_VERSION } from '@farm/store/migrations';

const data = { farms: INITIAL_FARMS, fields: INITIAL_FIELDS, plans: INITIAL_PLANS, activeFarmId: INITIAL_FARMS[0].id };
const text = (value: unknown) => JSON.stringify(value);

describe('backup', () => {
  it('round-trips the farm data', () => {
    const backup = createBackup(data, new Date('2026-10-16T12:00:00Z'));
    expect(backup).toMatchObject({ app: 'farmplan', version: STORE_VERSION, exportedAt: '2026-10-16T12:00:00.000Z' });

    const result = parseBackup(text(backup));
    expect(result).toMatchObject({ ok: true, exportedAt: '2026-10-16T12:00:00.000Z' });
    if (!result.ok) return;
    expect(result.data.farms).toEqual(data.farms);
    expect(result.data.fields).toEqual(data.fields);
    expect(result.data.plans).toEqual(data.plans);
  });

  it('does not include device preferences', () => {
    const backup = createBackup(data);
    expect(Object.keys(backup.data).sort()).toEqual(['activeFarmId', 'farms', 'fields', 'plans']);
  });

  it('accepts version 1 backups without owner and contact data', () => {
    const v1Farms = data.farms.map(({ ownerName: _owner, contactEmail: _email, ...farm }) => farm);
    const result = parseBackup(
      text({ ...createBackup(data), version: 1, data: { ...createBackup(data).data, farms: v1Farms } }),
    );
    expect(result.ok && result.data.farms[0]).toMatchObject({
      name: data.farms[0].name,
      ownerName: '',
      contactEmail: '',
    });
  });

  it('fills field attributes missing in older backups with the server defaults', () => {
    const oldFields = data.fields.map(({ cropType: _c, irrigation: _i, autoSpacing: _a, ...f }) => f);
    const result = parseBackup(
      text({ ...createBackup(data), data: { ...createBackup(data).data, fields: oldFields } }),
    );
    expect(result.ok && result.data.fields[0]).toMatchObject({
      cropType: null,
      irrigation: 'none',
      autoSpacing: false,
    });
  });

  it('names the file after the date', () => {
    expect(backupFileName(new Date('2026-10-16T23:00:00Z'))).toBe('farmplan-backup-2026-10-16.json');
  });

  it('falls back to the first farm when the active farm is missing', () => {
    const result = parseBackup(
      text({ ...createBackup(data), data: { ...createBackup(data).data, activeFarmId: 'gone' } }),
    );
    expect(result.ok && result.data.activeFarmId).toBe(data.farms[0].id);
  });

  it.each([
    ['broken JSON', '{', 'invalidJson'],
    ['another app', text({ ...createBackup(data), app: 'other' }), 'invalidFormat'],
    ['a newer version', text({ ...createBackup(data), version: STORE_VERSION + 1 }), 'newerVersion'],
    [
      'an invalid pH value',
      text({
        ...createBackup(data),
        data: { ...createBackup(data).data, fields: [{ ...data.fields[0], soilPh: 20 }] },
      }),
      'invalidFormat',
    ],
    [
      'fields without their farm',
      text({ ...createBackup(data), data: { ...createBackup(data).data, farms: [] } }),
      'brokenReferences',
    ],
    [
      'plans without their field',
      text({ ...createBackup(data), data: { ...createBackup(data).data, fields: [], farms: data.farms } }),
      'brokenReferences',
    ],
  ])('rejects %s', (_, input, error) => {
    expect(parseBackup(input)).toEqual({ ok: false, error });
  });
});
