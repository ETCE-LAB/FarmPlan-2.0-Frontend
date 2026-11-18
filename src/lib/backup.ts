import { z } from 'zod';
import { multiPolygonSchema as multiPolygon, polygonSchema as polygon } from '@farm/lib/schemas';
import { STORE_VERSION } from '@farm/store/migrations';
import type { Farm, Field, PlantingPlan } from '@farm/types';

const farmSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  // Added in version 2; older backups have no owner or contact data.
  ownerName: z.string().default(''),
  contactEmail: z.string().default(''),
  location: z.string(),
  climateZone: z.string().nullable(),
  boundary: polygon.nullable(),
  boundaryAreaM2: z.number().nonnegative().nullable().default(null),
  boundaryPerimeterM: z.number().nonnegative().nullable().default(null),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const fieldSchema = z.object({
  id: z.string(),
  farmId: z.string(),
  name: z.string(),
  geometry: polygon.nullable(),
  areaM2: z.number().nonnegative(),
  soilType: z.string().nullable(),
  soilPh: z.number().min(0).max(14).nullable(),
  excludedZones: multiPolygon.nullable(),
  // Added after backup version 1; older backups get the server defaults.
  cropType: z.string().nullable().default(null),
  irrigation: z.enum(['none', 'drip', 'sprinkler', 'flood', 'other']).default('none'),
  autoSpacing: z.boolean().default(false),
});

const planSchema = z.object({
  id: z.string(),
  fieldId: z.string(),
  revisionNumber: z.number().int(),
  status: z.enum(['draft', 'active']),
  totalExpectedCalories: z.number(),
  generatedAt: z.string(),
  algorithmVersion: z.string(),
});

const backupSchema = z.object({
  app: z.literal('farmplan'),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    farms: z.array(farmSchema),
    fields: z.array(fieldSchema),
    plans: z.array(planSchema),
    activeFarmId: z.string().nullable(),
  }),
});

export interface BackupData {
  farms: Farm[];
  fields: Field[];
  plans: PlantingPlan[];
  activeFarmId: string | null;
}
export type BackupFile = z.infer<typeof backupSchema>;

export type BackupParseResult =
  | { ok: true; data: BackupData; exportedAt: string }
  | { ok: false; error: 'invalidJson' | 'invalidFormat' | 'newerVersion' | 'brokenReferences' };

export function createBackup(data: BackupData, now = new Date()): BackupFile {
  return {
    app: 'farmplan',
    version: STORE_VERSION,
    exportedAt: now.toISOString(),
    data: { farms: data.farms, fields: data.fields, plans: data.plans, activeFarmId: data.activeFarmId },
  };
}

export function backupFileName(now = new Date()) {
  return `farmplan-backup-${now.toISOString().slice(0, 10)}.json`;
}

export function parseBackup(text: string): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }

  const version = (json as { version?: unknown } | null)?.version;
  if (typeof version === 'number' && version > STORE_VERSION) return { ok: false, error: 'newerVersion' };

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: 'invalidFormat' };

  const { farms, fields, plans, activeFarmId } = parsed.data.data;
  const farmIds = new Set(farms.map((f) => f.id));
  const fieldIds = new Set(fields.map((f) => f.id));
  if (!fields.every((f) => farmIds.has(f.farmId)) || !plans.every((p) => fieldIds.has(p.fieldId))) {
    return { ok: false, error: 'brokenReferences' };
  }

  return {
    ok: true,
    exportedAt: parsed.data.exportedAt,
    data: {
      farms,
      fields,
      plans,
      activeFarmId: activeFarmId && farmIds.has(activeFarmId) ? activeFarmId : (farms[0]?.id ?? null),
    },
  };
}
