# ADR 0002: Map engine and GIS performance

- **Status:** Accepted
- **Date:** November 5, 2026

## Context

FarmPlan's core interaction is drawing and editing fields and treelines on a map. The legacy UI used Leaflet through react-leaflet with Geoman for drawing and proj4 for coordinate transforms. Geometry calculations were scattered across components, and coordinate order was handled ad hoc.

## Decision

- Use **Leaflet** directly through the `useLeafletMap` hook, without react-leaflet, and **Geoman** (`@geoman-io/leaflet-geoman-free`) for drawing and editing. Layers are rebuilt from store state; Geoman only produces geometry, which is written to the store immediately.
- Store all geometry as **GeoJSON in EPSG:4326 with `[lng, lat]`**. Leaflet's `[lat, lng]` is converted only in `src/lib/geo.ts`.
- Use **Turf** (`@turf/area`, `@turf/intersect`, `@turf/helpers`) for geodesic area and intersections, and **proj4** for importing projected GeoJSON (ETRS89/UTM 32N and 33N, Gauss-Krüger zone 3).
- Keep geometry logic pure and unit-tested in `src/lib` (`geo.ts`, `treelines.ts`, `geojsonIO.ts`).
- Load Leaflet, Geoman, and their CSS only in lazily loaded map pages. The map chunk is about 570 kB and does not affect other pages.
- Base layers: OpenStreetMap, Esri World Imagery, a topographic layer, and place labels. Street and topographic tiles are darkened in dark mode with a CSS filter; imagery is not.

## Consequences

- jsdom cannot render maps, so map interaction needs Playwright tests.
- Treeline layout is a geometric preview in a local metric plane; species selection and optimization come from the backend.
- Overlapping exclusion zones are currently subtracted twice from net area; this is a known limitation.

## Open questions

- Whether a vector-tile engine such as MapLibre is needed for large farms or many placements.
- Which licensed imagery source replaces the legacy Google satellite layer, if any (parity L9).
- Performance limits for crop placement with many markers (parity L13).
