import { z } from 'zod';

/** Shared zod schemas for GeoJSON geometries, `[lng, lat]` in WGS84. */
export const positionSchema = z.array(z.number()).min(2);
export const ringSchema = z.array(positionSchema).min(4);
export const polygonSchema = z.object({ type: z.literal('Polygon'), coordinates: z.array(ringSchema).min(1) });
export const multiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(ringSchema).min(1)),
});
