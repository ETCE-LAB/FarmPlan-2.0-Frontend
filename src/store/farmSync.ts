import i18n from '@farm/i18n';
import type { ApiErrorCode, ApiFailure, ApiResult } from '@farm/lib/api/client';
import * as farmsApi from '@farm/lib/api/farms';
import type { FarmMetaInput, FieldInput } from '@farm/lib/api/farms';
import type { BackupData } from '@farm/lib/backup';
import { polygonAreaM2 } from '@farm/lib/geo';
import type { Farm, Field } from '@farm/types';
import { useFarmStore, type FieldPatch } from './useFarmStore';
import { useSessionStore } from './useSessionStore';
import { showToast } from './useUiStore';

/*
 * Synchronizes farms and fields with the gateway. Farm creation, master data, and deletion wait for
 * the server. Field edits (map drawing, attributes) are applied locally first and then sent as single
 * requests; writes per farm run one after another, in the order they were made. New fields carry a
 * temporary ID until the server assigns its UUID. On a failed write the UI shows the error and reloads
 * the authoritative server state.
 */

const queues = new Map<string, Promise<unknown>>();
/** Temporary (client) field ID → server UUID, so queued writes and stale URLs still find the field. */
const fieldAliases = new Map<string, string>();

function enqueue<T>(farmId: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(farmId) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(farmId, next);
  void next.finally(() => {
    if (queues.get(farmId) === next) queues.delete(farmId);
  });
  return next;
}

export function resolveFieldId(id: string): string {
  let current = id;
  for (let guard = 0; fieldAliases.has(current) && guard < 10; guard += 1) current = fieldAliases.get(current)!;
  return current;
}

const ownerId = () => useSessionStore.getState().session?.user.id ?? null;
const store = () => useFarmStore.getState();
const ok = { ok: true, data: undefined } as const;
const unauthenticated = { ok: false, error: 'unauthenticated' } as const;

const GEOMETRY_DETAILS: Record<string, string> = {
  self_intersecting: 'selfIntersecting',
  invalid_topology: 'invalidTopology',
  outside_farm_boundary: 'outsideFarmBoundary',
  outside_field: 'outsideField',
};

/** User-facing reason for a failed request; geometry validation details win over the generic status. */
export function apiErrorMessage(error: ApiErrorCode | ApiFailure) {
  if (typeof error === 'object') {
    const detail = error.details?.map((code) => GEOMETRY_DETAILS[code]).find(Boolean);
    if (detail) return i18n.t(`api.geometry.${detail as 'selfIntersecting'}`);
    return i18n.t(`api.errors.${error.error}`);
  }
  return i18n.t(`api.errors.${error}`);
}

function reportSyncError(failure: ApiFailure) {
  if (failure.error === 'aborted') return;
  showToast({ tone: 'error', message: i18n.t('api.saveFailed', { reason: apiErrorMessage(failure) }) });
}

/** Reports a failed field write and replaces the optimistic local state with the server's. */
function fieldWriteFailed(failure: ApiFailure) {
  reportSyncError(failure);
  if (failure.error !== 'unauthenticated') void loadFarms();
  return failure;
}

const asInput = (field: Field): FieldInput | null => (field.geometry ? { ...field, geometry: field.geometry } : null);

async function createFieldsOnServer(farmId: string, inputs: FieldInput[]): Promise<ApiResult<Field[]>> {
  if (inputs.length === 1) {
    const result = await farmsApi.createField(farmId, inputs[0]);
    return result.ok ? { ok: true, data: [result.data] } : result;
  }
  const created: Field[] = [];
  for (let i = 0; i < inputs.length; i += farmsApi.MAX_BULK_FIELDS) {
    const result = await farmsApi.createFields(farmId, inputs.slice(i, i + farmsApi.MAX_BULK_FIELDS));
    if (!result.ok) return result;
    created.push(...result.data);
  }
  return { ok: true, data: created };
}

export async function loadFarms(signal?: AbortSignal): Promise<ApiResult<void>> {
  const owner = ownerId();
  if (!owner) {
    store().clearServerData();
    return unauthenticated;
  }
  store().setFarmsLoading();
  const farms = await farmsApi.listFarms(owner, signal);
  const fieldLists = farms.ok ? await Promise.all(farms.data.map((farm) => farmsApi.listFields(farm.id, signal))) : [];
  const failure = !farms.ok ? farms : fieldLists.find((r) => !r.ok);
  if (failure && !failure.ok) {
    if (failure.error !== 'aborted') store().setFarmsError(failure.error);
    return failure;
  }
  if (!farms.ok) return farms;
  store().setServerData(
    farms.data,
    fieldLists.flatMap((r) => (r.ok ? r.data : [])),
  );
  const { activeFarmId, setActiveFarmId } = store();
  if (!farms.data.some((f) => f.id === activeFarmId)) setActiveFarmId(farms.data[0]?.id ?? null);
  return ok;
}

/**
 * Creates the farm, then its fields in one atomic import. If the fields are rejected, the new farm is
 * removed again so a failed creation leaves nothing behind.
 */
export async function createFarm(meta: FarmMetaInput, fields: Field[]): Promise<ApiResult<Farm>> {
  const owner = ownerId();
  if (!owner) return unauthenticated;
  const farm = await farmsApi.createFarm(owner, meta);
  if (!farm.ok) return farm;
  const inputs = fields.map(asInput).filter((f): f is FieldInput => f !== null);
  const created = inputs.length ? await createFieldsOnServer(farm.data.id, inputs) : { ok: true as const, data: [] };
  if (!created.ok) {
    await farmsApi.deleteFarm(farm.data.id);
    return created;
  }
  store().addFarm(farm.data, created.data);
  return { ok: true, data: farm.data };
}

export function saveFarmMeta(farmId: string, meta: FarmMetaInput): Promise<ApiResult<void>> {
  return enqueue(farmId, async () => {
    const owner = ownerId();
    if (!owner) return unauthenticated;
    const result = await farmsApi.updateFarm(owner, farmId, meta);
    if (!result.ok) return result;
    const { name, ownerName, contactEmail, location, climateZone, notes } = result.data;
    store().updateFarm(farmId, { name, ownerName, contactEmail, location, climateZone, notes });
    return ok;
  });
}

/**
 * Sets or clears the farm boundary. Applied locally first, so the map follows the edit; the server
 * computes area and perimeter and rejects boundaries that leave fields outside. On failure the
 * previous boundary is restored and the reason is shown.
 */
export function saveFarmBoundary(farmId: string, boundary: Farm['boundary']): Promise<ApiResult<void>> {
  const farm = store().farms.find((f) => f.id === farmId);
  if (!farm) return Promise.resolve<ApiResult<void>>({ ok: false, error: 'notFound' });
  const previous = {
    boundary: farm.boundary,
    boundaryAreaM2: farm.boundaryAreaM2,
    boundaryPerimeterM: farm.boundaryPerimeterM,
  };
  store().updateFarm(farmId, {
    boundary,
    boundaryAreaM2: boundary ? polygonAreaM2(boundary) : null,
    boundaryPerimeterM: null,
  });
  return enqueue(farmId, async (): Promise<ApiResult<void>> => {
    const owner = ownerId();
    if (!owner) return unauthenticated;
    const result = await farmsApi.updateFarmBoundary(owner, farmId, boundary);
    if (!result.ok) {
      if (store().farms.some((f) => f.id === farmId)) store().updateFarm(farmId, previous);
      if (result.error !== 'aborted') {
        const reason = result.details?.includes('outside_farm_boundary')
          ? i18n.t('farms.boundaryMustCoverFields')
          : apiErrorMessage(result);
        showToast({ tone: 'error', message: i18n.t('farms.boundarySaveFailed', { reason }) });
      }
      return result;
    }
    const { boundary: saved, boundaryAreaM2, boundaryPerimeterM } = result.data;
    store().updateFarm(farmId, { boundary: saved, boundaryAreaM2, boundaryPerimeterM });
    return ok;
  });
}

export function deleteFarm(farmId: string): Promise<ApiResult<void>> {
  return enqueue(farmId, async () => {
    const result = await farmsApi.deleteFarm(farmId);
    // Already gone on the server: remove it locally as well.
    if (!result.ok && result.error !== 'notFound') return result;
    store().deleteFarm(farmId);
    return ok;
  });
}

/** Creates fields that exist only locally and swaps their temporary IDs for the server UUIDs. */
function createQueued(farmId: string, localIds: string[], originals: Map<string, Field>) {
  return enqueue(farmId, async (): Promise<ApiResult<void>> => {
    // Use the latest local version; the field may have been edited while waiting in the queue.
    const current = localIds.map((id) => store().fields.find((f) => f.id === id) ?? originals.get(id)!);
    const pairs = current
      .map((field) => ({ field, input: asInput(field) }))
      .filter((p): p is { field: Field; input: FieldInput } => p.input !== null);
    if (pairs.length === 0) return ok;
    const result = await createFieldsOnServer(
      farmId,
      pairs.map((p) => p.input),
    );
    if (!result.ok) return fieldWriteFailed(result);
    result.data.forEach((created, i) => {
      const localId = pairs[i].field.id;
      fieldAliases.set(localId, created.id);
      store().renameField(localId, created.id, { areaM2: created.areaM2 });
    });
    return ok;
  });
}

function patchQueued(farmId: string, id: string, patch: FieldPatch) {
  const body = farmsApi.toApiFieldPatch(patch);
  if (Object.keys(body).length === 0) return Promise.resolve<ApiResult<void>>(ok);
  return enqueue(farmId, async (): Promise<ApiResult<void>> => {
    const result = await farmsApi.updateField(resolveFieldId(id), body);
    return result.ok ? ok : fieldWriteFailed(result);
  });
}

function deleteQueued(farmId: string, id: string) {
  return enqueue(farmId, async (): Promise<ApiResult<void>> => {
    const result = await farmsApi.deleteField(resolveFieldId(id));
    return result.ok || result.error === 'notFound' ? ok : fieldWriteFailed(result);
  });
}

export function addFields(farmId: string, fields: Field[]) {
  const local = fields.map((f) => ({ ...f, farmId }));
  store().addFields(local);
  return createQueued(
    farmId,
    local.map((f) => f.id),
    new Map(local.map((f) => [f.id, f])),
  );
}

export function updateField(id: string, patch: FieldPatch) {
  const field = store().fields.find((f) => f.id === resolveFieldId(id));
  if (!field) return Promise.resolve<ApiResult<void>>({ ok: false, error: 'notFound' });
  store().updateField(field.id, patch);
  return patchQueued(field.farmId, field.id, patch);
}

export function deleteField(id: string) {
  const field = store().fields.find((f) => f.id === resolveFieldId(id));
  if (!field) return Promise.resolve<ApiResult<void>>({ ok: false, error: 'notFound' });
  store().deleteField(field.id);
  return deleteQueued(field.farmId, field.id);
}

const writableProps = (f: Field): FieldPatch => {
  const { name, geometry, excludedZones, soilType, soilPh, cropType, irrigation, autoSpacing } = f;
  return { name, geometry, excludedZones, soilType, soilPh, cropType, irrigation, autoSpacing };
};
const writable = (f: Field) => JSON.stringify(farmsApi.toApiFieldPatch(writableProps(f)));

/** Sends the difference between two local versions of a farm's fields. */
function syncFieldChanges(farmId: string, before: Field[], after: Field[]) {
  const beforeById = new Map(before.map((f) => [f.id, f]));
  const afterIds = new Set(after.map((f) => f.id));
  const added = after.filter((f) => !beforeById.has(f.id));
  for (const field of before) if (!afterIds.has(field.id)) void deleteQueued(farmId, field.id);
  for (const field of after) {
    const previous = beforeById.get(field.id);
    if (previous && writable(previous) !== writable(field)) {
      void patchQueued(farmId, field.id, writableProps(field));
    }
  }
  if (added.length) {
    void createQueued(
      farmId,
      added.map((f) => f.id),
      new Map(added.map((f) => [f.id, f])),
    );
  }
}

/** Applies a field change to one farm, offers undo in a toast, and syncs both directions with the server. */
export function mutateFieldsWithUndo(farmId: string, mutate: () => void, message: string, undoLabel: string) {
  const { fields, plans } = store();
  const before = fields.filter((f) => f.farmId === farmId);
  mutate();
  syncFieldChanges(
    farmId,
    before,
    store().fields.filter((f) => f.farmId === farmId),
  );
  showToast({
    message,
    tone: 'info',
    action: {
      label: undoLabel,
      onClick: () => {
        if (!store().farms.some((f) => f.id === farmId)) return;
        const current = store().fields.filter((f) => f.farmId === farmId);
        // Fields renamed to their server ID since the change keep that ID when restored.
        const restored = before.map((f) => ({ ...f, id: resolveFieldId(f.id) }));
        store().replaceFarmFields(farmId, restored);
        useFarmStore.setState({
          plans: plans.map((p) => ({ ...p, fieldId: resolveFieldId(p.fieldId) })),
        });
        syncFieldChanges(farmId, current, restored);
      },
    },
  });
}

/**
 * Imports a backup into the signed-in account as new farms. Existing farms are kept, and the server
 * assigns new IDs. Missing contact data falls back to the account.
 */
export async function importBackup(data: BackupData): Promise<{ created: number; failed: number }> {
  const user = useSessionStore.getState().session?.user;
  let created = 0;
  let failed = 0;
  for (const farm of data.farms) {
    const result = await createFarm(
      {
        name: farm.name,
        ownerName: farm.ownerName || user?.displayName || '',
        contactEmail: farm.contactEmail || user?.email || '',
        location: farm.location,
        climateZone: farm.climateZone,
        notes: farm.notes,
      },
      data.fields.filter((f) => f.farmId === farm.id),
    );
    if (result.ok) created += 1;
    else failed += 1;
  }
  return { created, failed };
}

/** Forget pending writes and ID aliases, e.g. on logout. */
export function resetFarmSync() {
  queues.clear();
  fieldAliases.clear();
}

/** Resolves once all pending writes have finished. */
export async function flushFarmSync() {
  while (queues.size > 0) await Promise.allSettled([...queues.values()]);
}
