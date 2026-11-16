import { z } from 'zod';
import { apiRequest, type ApiResult } from './client';

/*
 * `GET /v1/modules` (backend commit 990a964): which product modules exist, are enabled on this
 * deployment, and are accessible to the signed-in account type. The backend enforces access itself;
 * the frontend only uses this to hide navigation that would end in a 403.
 */

export const MODULE_IDS = ['farms', 'catalog', 'planning', 'analysis', 'media'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

const moduleSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  availableToGuest: z.boolean(),
  accessible: z.boolean(),
});

export type ModuleAccess = z.infer<typeof moduleSchema>;

export const listModules = (signal?: AbortSignal): Promise<ApiResult<ModuleAccess[]>> =>
  apiRequest('/v1/modules', { schema: z.object({ modules: z.array(moduleSchema) }), signal }).then((result) =>
    result.ok ? { ok: true, data: result.data.modules } : result,
  );
