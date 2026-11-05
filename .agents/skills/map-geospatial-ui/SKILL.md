---
name: map-geospatial-ui
description: Work on FarmPlan maps with Leaflet and Geoman, base layers, field drawing, coordinate conversion, proj4 imports, and Turf geometry.
---

# Map and geospatial UI

## Preparation

Read `AGENTS.md`, `docs/architecture.md`, and [ADR 0002](../../../docs/decisions/0002-map-engine-and-gis-performance.md). Inspect `src/components/map`, `src/lib/geo.ts`, `src/lib/treelines.ts`, `src/lib/geojsonIO.ts`, and their tests.

## Rules

- **Coordinate order:** the store, types, exports, and API use GeoJSON in EPSG:4326 with `[lng, lat]`. Leaflet uses `[lat, lng]`. Convert only through `src/lib/geo.ts` (`latLngsToPolygon`, `polygonToLatLngRings`) or `layer.toGeoJSON()`. Never swap coordinates by hand.
- **Units:** areas in m² (display in ha through `useFormat`), distances in m, angles in degrees. Name units in JSDoc and variable names.
- **Area:** use geodesic area from `@turf/area`. Treeline layout works in a local metric plane; keep that conversion inside `treelines.ts`.
- **Imports:** `geojsonIO.ts` detects the CRS and reprojects with proj4 (WGS84, ETRS89/UTM 32N and 33N, Gauss-Krüger zone 3). Add a CRS only with a test fixture. Exports follow RFC 7946.
- **Map lifecycle:** create maps with `useLeafletMap(containerRef)`. Rebuild layers from state; Geoman only produces geometry, which goes into the store immediately. Keep callbacks passed to map components stable with `useCallback` or `useEffectEvent`.
- **Bundle:** import Leaflet, Geoman, and their CSS only in modules used by lazily loaded pages.
- **Popups:** use `popupElement()` or `textContent`. Never build HTML strings from user input.
- **Dark mode:** street and topographic tiles are darkened with a CSS filter; aerial imagery is not. Keep the class names in `src/index.css`.
- **Tile providers:** respect attribution and usage policies. Block external tile servers in end-to-end tests so they run offline.
- **Third-party geodata** such as soil, weather, or geocoding belongs behind the backend gateway (see [ADR 0004](../../../docs/decisions/0004-api-contracts-and-error-handling.md)), not direct browser calls.

## Workflow

1. Write or extend pure geometry functions in `src/lib` with unit tests first, including degenerate polygons, holes, and multipolygons.
2. Wire the UI and keep map state derivable from the store and URL (for example `?field=` for the selected field).
3. jsdom cannot render maps. Cover drawing, editing, and layer switching with Playwright.
4. Validate with `../frontend-validation/SKILL.md`.

## Done when

Geometry is tested, coordinate order and units are explicit, the map works on desktop and mobile in both themes, and the map bundle stays out of the main chunk.
