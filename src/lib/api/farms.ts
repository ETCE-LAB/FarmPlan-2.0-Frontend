import { z } from 'zod';
import { multiPolygonSchema, polygonSchema } from '@farm/lib/schemas';
import type { Farm, Field } from '@farm/types';
import { apiRequest, fetchAllPages, noContent, type ApiResult } from './client';

/*
 * Contract of the gateway (`/api/v1`, backend commit 990a964):
 * - Farms are direct camelCase resources with server UUIDs and timestamps; lists are `{ items, total, page, pageSize }`.
 * - Fields are an independent resource under `/farms/{farmId}/fields` and `/fields/{id}`; the server computes areas.
 * - PATCH is partial; DELETE answers 204 without a body. Unknown or read-only keys are rejected with 422.
 */

const contactSchema = z.object({ ownerName: z.string(), email: z.string() });

export const apiFarmSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  location: z.string().default(''),
  climateZone: z.string().default(''),
  boundary: polygonSchema.nullable().default(null),
  boundaryAreaM2: z.number().nonnegative().nullable().default(null),
  boundaryPerimeterM: z.number().nonnegative().nullable().default(null),
  notes: z.string().default(''),
  contact: contactSchema.nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const apiFieldSchema = z.object({
  id: z.string().min(1),
  farmId: z.string().min(1),
  name: z.string(),
  geometry: polygonSchema,
  excludedZones: multiPolygonSchema.nullable().default(null),
  soilType: z.string().nullable().default(null),
  soilPh: z.number().min(0).max(14).nullable().default(null),
  cropType: z.string().nullable().default(null),
  irrigation: z.enum(['none', 'drip', 'sprinkler', 'flood', 'other']).default('none'),
  autoSpacing: z.boolean().default(false),
  areaM2: z.number().nonnegative(),
});

type ApiFarm = z.infer<typeof apiFarmSchema>;
type ApiField = z.infer<typeof apiFieldSchema>;

export function fromApiFarm(api: ApiFarm, ownerId: string): Farm {
  return {
    id: api.id,
    ownerId,
    name: api.name,
    ownerName: api.contact?.ownerName ?? '',
    contactEmail: api.contact?.email ?? '',
    location: api.location,
    climateZone: api.climateZone || null,
    boundary: api.boundary,
    boundaryAreaM2: api.boundaryAreaM2,
    boundaryPerimeterM: api.boundaryPerimeterM,
    notes: api.notes,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function fromApiField(api: ApiField): Field {
  return {
    id: api.id,
    farmId: api.farmId,
    name: api.name,
    geometry: api.geometry,
    areaM2: api.areaM2,
    soilType: api.soilType,
    soilPh: api.soilPh,
    excludedZones: api.excludedZones,
    cropType: api.cropType,
    irrigation: api.irrigation,
    autoSpacing: api.autoSpacing,
  };
}

export type FarmMetaInput = Pick<Farm, 'name' | 'ownerName' | 'contactEmail' | 'location' | 'climateZone' | 'notes'>;

/** Farm body for POST and PATCH. Contact is all-or-nothing on the server. */
export function toApiFarm(meta: FarmMetaInput) {
  return {
    name: meta.name,
    location: meta.location,
    climateZone: meta.climateZone ?? '',
    notes: meta.notes,
    contact: meta.ownerName && meta.contactEmail ? { ownerName: meta.ownerName, email: meta.contactEmail } : null,
  };
}

/** Writable field properties; the server rejects blank texts, so they are sent as `null`. */
export type FieldInput = Pick<
  Field,
  'name' | 'excludedZones' | 'soilType' | 'soilPh' | 'cropType' | 'irrigation' | 'autoSpacing'
> & {
  geometry: NonNullable<Field['geometry']>;
};

const blankToNull = (value: string | null) => value?.trim() || null;

export const toApiFieldInput = (field: FieldInput) => ({
  name: field.name,
  geometry: field.geometry,
  excludedZones: field.excludedZones,
  soilType: blankToNull(field.soilType),
  soilPh: field.soilPh,
  cropType: blankToNull(field.cropType),
  irrigation: field.irrigation,
  autoSpacing: field.autoSpacing,
});

export type FieldPatchInput = Partial<FieldInput>;

export function toApiFieldPatch(patch: Partial<Pick<Field, keyof FieldInput>>): FieldPatchInput {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  // The server requires a geometry; a cleared geometry is not a valid write.
  if (patch.geometry) body.geometry = patch.geometry;
  if (patch.excludedZones !== undefined) body.excludedZones = patch.excludedZones;
  if (patch.soilType !== undefined) body.soilType = blankToNull(patch.soilType);
  if (patch.soilPh !== undefined) body.soilPh = patch.soilPh;
  if (patch.cropType !== undefined) body.cropType = blankToNull(patch.cropType);
  if (patch.irrigation !== undefined) body.irrigation = patch.irrigation;
  if (patch.autoSpacing !== undefined) body.autoSpacing = patch.autoSpacing;
  return body as FieldPatchInput;
}

const farmPath = (farmId: string) => `/v1/farms/${encodeURIComponent(farmId)}`;
const fieldPath = (fieldId: string) => `/v1/fields/${encodeURIComponent(fieldId)}`;

function mapResult<T, U>(result: ApiResult<T>, map: (data: T) => U): ApiResult<U> {
  return result.ok ? { ok: true, data: map(result.data) } : result;
}

export async function listFarms(ownerId: string, signal?: AbortSignal): Promise<ApiResult<Farm[]>> {
  const result = await fetchAllPages('/v1/farms', apiFarmSchema, signal);
  return mapResult(result, (farms) => farms.map((farm) => fromApiFarm(farm, ownerId)));
}

export async function createFarm(ownerId: string, meta: FarmMetaInput): Promise<ApiResult<Farm>> {
  const result = await apiRequest('/v1/farms', { method: 'POST', body: toApiFarm(meta), schema: apiFarmSchema });
  return mapResult(result, (farm) => fromApiFarm(farm, ownerId));
}

export async function updateFarm(ownerId: string, farmId: string, meta: FarmMetaInput): Promise<ApiResult<Farm>> {
  const result = await apiRequest(farmPath(farmId), { method: 'PATCH', body: toApiFarm(meta), schema: apiFarmSchema });
  return mapResult(result, (farm) => fromApiFarm(farm, ownerId));
}

/** Sets or clears the farm boundary; the server rejects boundaries that do not cover every field. */
export async function updateFarmBoundary(
  ownerId: string,
  farmId: string,
  boundary: Farm['boundary'],
): Promise<ApiResult<Farm>> {
  const result = await apiRequest(farmPath(farmId), { method: 'PATCH', body: { boundary }, schema: apiFarmSchema });
  return mapResult(result, (farm) => fromApiFarm(farm, ownerId));
}

export const deleteFarm = (farmId: string) => apiRequest(farmPath(farmId), { method: 'DELETE', schema: noContent });

export async function listFields(farmId: string, signal?: AbortSignal): Promise<ApiResult<Field[]>> {
  const result = await fetchAllPages(`${farmPath(farmId)}/fields`, apiFieldSchema, signal);
  return mapResult(result, (fields) => fields.map(fromApiField));
}

export async function createField(farmId: string, field: FieldInput): Promise<ApiResult<Field>> {
  const result = await apiRequest(`${farmPath(farmId)}/fields`, {
    method: 'POST',
    body: toApiFieldInput(field),
    schema: apiFieldSchema,
  });
  return mapResult(result, fromApiField);
}

/** Atomic import of up to 100 fields: either all are created or none. Returned in input order. */
export async function createFields(farmId: string, fields: FieldInput[]): Promise<ApiResult<Field[]>> {
  const result = await apiRequest(`${farmPath(farmId)}/fields:bulk`, {
    method: 'POST',
    body: { items: fields.map(toApiFieldInput) },
    schema: z.object({ items: z.array(apiFieldSchema) }),
  });
  return mapResult(result, (data) => data.items.map(fromApiField));
}

export async function updateField(fieldId: string, patch: FieldPatchInput): Promise<ApiResult<Field>> {
  const result = await apiRequest(fieldPath(fieldId), { method: 'PATCH', body: patch, schema: apiFieldSchema });
  return mapResult(result, fromApiField);
}

export const deleteField = (fieldId: string) => apiRequest(fieldPath(fieldId), { method: 'DELETE', schema: noContent });

export const MAX_BULK_FIELDS = 100;
